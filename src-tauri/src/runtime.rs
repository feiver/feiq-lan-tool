use std::env;
use std::net::{Ipv4Addr, TcpListener, UdpSocket};
use std::path::{Path, PathBuf};
use std::pin::pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
use std::collections::BTreeSet;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use feiq_lan_tool_lib::app_state::AppState;
use feiq_lan_tool_lib::file_transfer::{
    build_delivery_output_path,
    read_file_offer,
    receive_file,
    send_file_with_offer_and_progress,
};
use feiq_lan_tool_lib::models::{
    DeviceNameMode,
    DeliveryDecision,
    DeliveryResponse,
    DeliveryStatus,
    DiscoveryProbe,
    DeviceAnnouncement,
    DiscoveryMode,
    FileOffer,
    LanEvent,
    NetworkPreferences,
    TransferStatus,
    TransferTask,
};
use feiq_lan_tool_lib::message_runtime::{record_incoming_message, CHAT_MESSAGE_RECEIVED_EVENT};
use feiq_lan_tool_lib::message_server::read_event;
use feiq_lan_tool_lib::protocol::{decode_event, encode_event};
use tauri::{AppHandle, Emitter};

pub const DEFAULT_MESSAGE_PORT: u16 = 37001;
pub const DEFAULT_FILE_PORT: u16 = 37002;
pub const DEFAULT_DISCOVERY_PORT: u16 = 37000;
pub const DEVICES_UPDATED_EVENT: &str = "devices-updated";
pub const TRANSFER_UPDATED_EVENT: &str = "transfer-updated";
const DISCOVERY_INTERVAL: Duration = Duration::from_secs(3);
const DISCOVERY_READ_TIMEOUT: Duration = Duration::from_secs(1);
const DEVICE_TTL_MS: i64 = 15_000;

struct NoopWake;

impl Wake for NoopWake {
    fn wake(self: Arc<Self>) {}
}

pub fn spawn_message_listener(app_handle: AppHandle, state: AppState, port: u16) {
    thread::spawn(move || {
        let listener = match TcpListener::bind(("0.0.0.0", port)) {
            Ok(listener) => listener,
            Err(err) => {
                eprintln!("failed to bind message listener on port {port}: {err}");
                return;
            }
        };

        for stream in listener.incoming() {
            let mut stream = match stream {
                Ok(stream) => stream,
                Err(err) => {
                    eprintln!("failed to accept incoming message: {err}");
                    continue;
                }
            };

            match read_event(&mut stream) {
                Ok(event) => {
                    let event_for_runtime = event.clone();
                    if let Some(message) = record_incoming_message(&state, event) {
                        let _ = app_handle.emit(CHAT_MESSAGE_RECEIVED_EVENT, &message);
                    }

                    if let LanEvent::DeliveryResponse(response) = event_for_runtime {
                        handle_delivery_response(&app_handle, &state, response);
                    }
                }
                Err(err) => {
                    eprintln!("failed to decode incoming message: {err}");
                }
            }
        }
    });
}

pub fn spawn_discovery_runtime(app_handle: AppHandle, state: AppState) {
    let local_device_id = state.settings_snapshot().runtime.device_id.clone();
    spawn_discovery_listener(app_handle.clone(), state.clone(), local_device_id);
    spawn_discovery_announcer(state);
}

pub fn refresh_discovery_once(state: &AppState) -> Result<(), String> {
    let socket = UdpSocket::bind(("0.0.0.0", 0)).map_err(|err| err.to_string())?;
    socket.set_broadcast(true).map_err(|err| err.to_string())?;
    send_discovery_refresh(&socket, state);
    Ok(())
}

pub fn spawn_file_listener(app_handle: AppHandle, state: AppState, port: u16) {
    thread::spawn(move || {
        let listener = match TcpListener::bind(("0.0.0.0", port)) {
            Ok(listener) => listener,
            Err(err) => {
                eprintln!("failed to bind file listener on port {port}: {err}");
                return;
            }
        };

        for stream in listener.incoming() {
            let mut stream = match stream {
                Ok(stream) => stream,
                Err(err) => {
                    eprintln!("failed to accept incoming file: {err}");
                    continue;
                }
            };
            let settings = state.settings_snapshot();
            let offer = match read_file_offer(&mut stream) {
                Ok(offer) => offer,
                Err(err) => {
                    eprintln!("failed to read file offer: {err}");
                    continue;
                }
            };
            let incoming_delivery = offer
                .request_id
                .as_deref()
                .and_then(|request_id| state.incoming_delivery(request_id));
            let output_path = if let Some(session) = incoming_delivery.as_ref() {
                if let Some(message) = state.update_delivery_status(
                    offer.request_id.as_deref().unwrap_or_default(),
                    DeliveryStatus::InProgress,
                    Some(session.save_root.clone()),
                ) {
                    let _ = app_handle.emit(CHAT_MESSAGE_RECEIVED_EVENT, &message);
                }

                if settings.preferences.transfer.preserve_directory_structure {
                    build_delivery_output_path(Path::new(&session.save_root), &offer.file_name)
                } else {
                    let leaf_name = Path::new(&offer.file_name)
                        .file_name()
                        .and_then(|name| name.to_str())
                        .unwrap_or(&offer.file_name);
                    Path::new(&session.save_root).join(leaf_name)
                }
            } else {
                build_download_path(&settings.preferences.transfer.download_dir, &offer.file_name)
            };
            let mut task = TransferTask {
                transfer_id: offer.transfer_id,
                file_name: offer.file_name,
                file_size: offer.file_size,
                transferred_bytes: 0,
                from_device_id: offer.from_device_id,
                to_device_id: offer.to_device_id,
                status: TransferStatus::Pending,
            };

            state.upsert_transfer(task.clone());
            let _ = app_handle.emit(TRANSFER_UPDATED_EVENT, &task);

            let receive_result = receive_file(&mut stream, &output_path, &mut task, |snapshot| {
                state.upsert_transfer(snapshot.clone());
                let _ = app_handle.emit(TRANSFER_UPDATED_EVENT, snapshot);
            });

            if receive_result.is_err() {
                task.status = TransferStatus::Failed;
                state.upsert_transfer(task.clone());
                let _ = app_handle.emit(TRANSFER_UPDATED_EVENT, &task);
                if let Some(request_id) = offer.request_id.as_deref() {
                    if let Some(message) = state.update_delivery_status(
                        request_id,
                        DeliveryStatus::Failed,
                        incoming_delivery.as_ref().map(|session| session.save_root.clone()),
                    ) {
                        let _ = app_handle.emit(CHAT_MESSAGE_RECEIVED_EVENT, &message);
                    }
                    state.remove_incoming_delivery(request_id);
                }
                continue;
            }

            if let Some(request_id) = offer.request_id.as_deref() {
                if let Some(session) = state.mark_incoming_delivery_received(request_id) {
                    let status = if session.received_files >= session.expected_files {
                        state.remove_incoming_delivery(request_id);
                        DeliveryStatus::Completed
                    } else {
                        DeliveryStatus::InProgress
                    };
                    if let Some(message) = state.update_delivery_status(
                        request_id,
                        status,
                        Some(session.save_root),
                    ) {
                        let _ = app_handle.emit(CHAT_MESSAGE_RECEIVED_EVENT, &message);
                    }
                }
            }
        }
    });
}

fn spawn_discovery_listener(app_handle: AppHandle, state: AppState, local_device_id: String) {
    thread::spawn(move || {
        let socket = match UdpSocket::bind(("0.0.0.0", DEFAULT_DISCOVERY_PORT)) {
            Ok(socket) => socket,
            Err(err) => {
                eprintln!("failed to bind discovery listener on port {DEFAULT_DISCOVERY_PORT}: {err}");
                return;
            }
        };

        if let Err(err) = socket.set_broadcast(true) {
            eprintln!("failed to enable discovery broadcast: {err}");
            return;
        }

        if let Err(err) = socket.set_read_timeout(Some(DISCOVERY_READ_TIMEOUT)) {
            eprintln!("failed to set discovery timeout: {err}");
            return;
        }

        let mut last_known_count = state.list_devices().len();

        loop {
            let mut buffer = [0_u8; 4096];

            match socket.recv_from(&mut buffer) {
                Ok((size, addr)) => {
                    match decode_event(&buffer[..size]) {
                        Ok(LanEvent::DeviceAnnouncement(device)) => {
                            if device.device_id == local_device_id {
                                continue;
                            }

                            let devices = state.upsert_device(device, current_time_ms());
                            last_known_count = devices.len();
                            let _ = app_handle.emit(DEVICES_UPDATED_EVENT, &devices);
                        }
                        Ok(LanEvent::DiscoveryProbe(probe)) => {
                            if probe.from_device_id == local_device_id {
                                continue;
                            }

                            let response = LanEvent::DeviceAnnouncement(build_local_announcement(&state));
                            match encode_event(&response) {
                                Ok(payload) => {
                                    if let Err(err) = socket.send_to(
                                        &payload,
                                        (addr.ip(), DEFAULT_DISCOVERY_PORT),
                                    ) {
                                        eprintln!("failed to reply discovery probe: {err}");
                                    }
                                }
                                Err(err) => {
                                    eprintln!("failed to encode discovery probe response: {err}");
                                }
                            }
                        }
                        Ok(_) => {}
                        Err(err) => {
                            eprintln!("failed to decode discovery packet: {err}");
                        }
                    }
                }
                Err(err)
                    if err.kind() == std::io::ErrorKind::WouldBlock
                        || err.kind() == std::io::ErrorKind::TimedOut =>
                {
                    let devices = state.prune_devices(current_time_ms(), DEVICE_TTL_MS);
                    if devices.len() != last_known_count {
                        last_known_count = devices.len();
                        let _ = app_handle.emit(DEVICES_UPDATED_EVENT, &devices);
                    }
                }
                Err(err) => {
                    eprintln!("failed to receive discovery packet: {err}");
                }
            }
        }
    });
}

fn spawn_discovery_announcer(state: AppState) {
    thread::spawn(move || {
        let socket = match UdpSocket::bind(("0.0.0.0", 0)) {
            Ok(socket) => socket,
            Err(err) => {
                eprintln!("failed to bind discovery announcer: {err}");
                return;
            }
        };

        if let Err(err) = socket.set_broadcast(true) {
            eprintln!("failed to enable discovery announcer broadcast: {err}");
            return;
        }

        loop {
            send_discovery_refresh(&socket, &state);

            thread::sleep(DISCOVERY_INTERVAL);
        }
    });
}

fn build_local_announcement(state: &AppState) -> DeviceAnnouncement {
    let snapshot = state.settings_snapshot();
    let preferences = snapshot.preferences;
    let host_name = env::var("COMPUTERNAME")
        .or_else(|_| env::var("HOSTNAME"))
        .unwrap_or_else(|_| "feiq-device".into());
    let ip_addr = detect_local_ip().unwrap_or_else(|| "127.0.0.1".into());
    let nickname = match preferences.identity.device_name_mode {
        DeviceNameMode::NicknameOnly => preferences.identity.nickname.clone(),
        DeviceNameMode::NicknameWithDeviceName => {
            format!("{} ({host_name})", preferences.identity.nickname)
        }
    };
    let status_message = (!preferences.identity.status_message.trim().is_empty())
        .then_some(preferences.identity.status_message);

    DeviceAnnouncement {
        device_id: snapshot.runtime.device_id,
        nickname,
        host_name,
        ip_addr,
        message_port: snapshot.runtime.message_port,
        file_port: snapshot.runtime.file_port,
        status_message,
    }
}

fn discovery_targets(network: &NetworkPreferences) -> Vec<String> {
    match network.discovery_mode {
        DiscoveryMode::Auto => vec!["255.255.255.255".into()],
        DiscoveryMode::CurrentSegmentOnly => {
            vec![current_segment_broadcast().unwrap_or_else(|| "255.255.255.255".into())]
        }
        DiscoveryMode::ManualSegments => {
            let targets = network
                .manual_segments
                .iter()
                .filter_map(|segment| cidr_to_broadcast_ip(segment))
                .collect::<Vec<_>>();
            if targets.is_empty() {
                vec!["255.255.255.255".into()]
            } else {
                targets
            }
        }
    }
}

fn detect_local_ip() -> Option<String> {
    let socket = UdpSocket::bind(("0.0.0.0", 0)).ok()?;
    socket.connect(("8.8.8.8", 80)).ok()?;
    Some(socket.local_addr().ok()?.ip().to_string())
}

fn current_segment_broadcast() -> Option<String> {
    let ip = detect_local_ip()?.parse::<Ipv4Addr>().ok()?;
    let [a, b, c, _] = ip.octets();
    Some(Ipv4Addr::new(a, b, c, 255).to_string())
}

fn cidr_to_broadcast_ip(segment: &str) -> Option<String> {
    let (ip, prefix) = segment.split_once('/')?;
    let ip = ip.parse::<Ipv4Addr>().ok()?;
    let prefix = prefix.parse::<u32>().ok()?;
    if prefix > 32 {
        return None;
    }

    let ip = u32::from(ip);
    let mask = if prefix == 0 {
        0
    } else {
        u32::MAX << (32 - prefix)
    };
    let broadcast = ip | !mask;
    Some(Ipv4Addr::from(broadcast).to_string())
}

fn manual_segment_probe_targets(
    network: &NetworkPreferences,
    local_ip: Option<Ipv4Addr>,
) -> Vec<String> {
    if !matches!(network.discovery_mode, DiscoveryMode::ManualSegments) {
        return Vec::new();
    }

    let local_ip = local_ip.map(u32::from);
    let mut targets = BTreeSet::new();

    for segment in &network.manual_segments {
        let Some((start, end)) = cidr_to_host_range(segment) else {
            continue;
        };

        for value in start..=end {
            if Some(value) == local_ip {
                continue;
            }

            targets.insert(Ipv4Addr::from(value).to_string());
        }
    }

    targets.into_iter().collect()
}

fn send_discovery_refresh(socket: &UdpSocket, state: &AppState) {
    let snapshot = state.settings_snapshot();
    let event = LanEvent::DeviceAnnouncement(build_local_announcement(state));
    let payload = match encode_event(&event) {
        Ok(payload) => payload,
        Err(err) => {
            eprintln!("failed to encode discovery announcement: {err}");
            return;
        }
    };

    for target in discovery_targets(&snapshot.preferences.network) {
        if let Err(err) = socket.send_to(&payload, (target.as_str(), DEFAULT_DISCOVERY_PORT)) {
            eprintln!("failed to broadcast discovery announcement: {err}");
        }
    }

    if let DiscoveryMode::ManualSegments = snapshot.preferences.network.discovery_mode {
        let probe = LanEvent::DiscoveryProbe(DiscoveryProbe {
            from_device_id: snapshot.runtime.device_id,
        });
        match encode_event(&probe) {
            Ok(payload) => {
                let local_ip = detect_local_ip().and_then(|ip| ip.parse::<Ipv4Addr>().ok());
                for target in manual_segment_probe_targets(&snapshot.preferences.network, local_ip)
                {
                    if let Err(err) =
                        socket.send_to(&payload, (target.as_str(), DEFAULT_DISCOVERY_PORT))
                    {
                        eprintln!("failed to send discovery probe: {err}");
                    }
                }
            }
            Err(err) => {
                eprintln!("failed to encode discovery probe: {err}");
            }
        }
    }
}

fn cidr_to_host_range(segment: &str) -> Option<(u32, u32)> {
    let (ip, prefix) = segment.split_once('/')?;
    let ip = ip.parse::<Ipv4Addr>().ok()?;
    let prefix = prefix.parse::<u32>().ok()?;
    if prefix > 32 {
        return None;
    }

    let ip = u32::from(ip);
    let mask = if prefix == 0 {
        0
    } else {
        u32::MAX << (32 - prefix)
    };
    let network = ip & mask;
    let broadcast = network | !mask;

    match prefix {
        32 => Some((network, network)),
        31 => Some((network, broadcast)),
        _ if broadcast > network + 1 => Some((network + 1, broadcast - 1)),
        _ => None,
    }
}

fn build_download_path(download_dir: &str, file_name: &str) -> PathBuf {
    resolve_download_dir(download_dir).join(file_name)
}

fn resolve_download_dir(download_dir: &str) -> PathBuf {
    if let Some(stripped) = download_dir.strip_prefix("~/") {
        return home_dir().join(stripped);
    }

    if let Some(stripped) = download_dir.strip_prefix("~\\") {
        return home_dir().join(stripped);
    }

    let path = Path::new(download_dir);
    if path.as_os_str().is_empty() {
        return home_dir().join("Downloads");
    }

    path.to_path_buf()
}

fn home_dir() -> PathBuf {
    env::var("USERPROFILE")
        .or_else(|_| env::var("HOME"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
}

fn current_time_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default()
}

fn handle_delivery_response(app_handle: &AppHandle, state: &AppState, response: DeliveryResponse) {
    match response.decision {
        DeliveryDecision::Rejected => {
            state.remove_outgoing_delivery(&response.request_id);
        }
        DeliveryDecision::Accepted => {
            let Some(session) = state.outgoing_delivery(&response.request_id) else {
                return;
            };

            if let Some(message) = state.update_delivery_status(
                &response.request_id,
                DeliveryStatus::InProgress,
                response.save_root.clone(),
            ) {
                let _ = app_handle.emit(CHAT_MESSAGE_RECEIVED_EVENT, &message);
            }

            let send_result = session.files.iter().enumerate().try_for_each(|(index, file)| {
                let transfer_id = format!("tx-delivery-{}-{index}", response.request_id);
                let mut task = TransferTask {
                    transfer_id: transfer_id.clone(),
                    file_name: file.relative_path.clone(),
                    file_size: file.file_size,
                    transferred_bytes: 0,
                    from_device_id: session.from_device_id.clone(),
                    to_device_id: session.to_device_id.clone(),
                    status: TransferStatus::Pending,
                };
                let offer = FileOffer {
                    transfer_id,
                    file_name: file.relative_path.clone(),
                    file_size: file.file_size,
                    from_device_id: session.from_device_id.clone(),
                    to_device_id: session.to_device_id.clone(),
                    request_id: Some(response.request_id.clone()),
                };

                state.upsert_transfer(task.clone());
                let _ = app_handle.emit(TRANSFER_UPDATED_EVENT, &task);

                block_on_ready(send_file_with_offer_and_progress(
                    &session.file_addr,
                    Path::new(&file.source_path),
                    &offer,
                    &mut task,
                    |snapshot| {
                        state.upsert_transfer(snapshot.clone());
                        let _ = app_handle.emit(TRANSFER_UPDATED_EVENT, snapshot);
                    },
                ))
                .map(|_| ())
            });

            let status = if send_result.is_ok() {
                DeliveryStatus::Completed
            } else {
                DeliveryStatus::Failed
            };
            if let Some(message) = state.update_delivery_status(
                &response.request_id,
                status,
                response.save_root.clone(),
            ) {
                let _ = app_handle.emit(CHAT_MESSAGE_RECEIVED_EVENT, &message);
            }
            state.remove_outgoing_delivery(&response.request_id);
        }
    }
}

fn block_on_ready<F>(future: F) -> F::Output
where
    F: std::future::Future,
{
    let waker = Waker::from(Arc::new(NoopWake));
    let mut context = Context::from_waker(&waker);
    let mut future = pin!(future);

    match future.as_mut().poll(&mut context) {
        Poll::Ready(value) => value,
        Poll::Pending => panic!("future unexpectedly pending"),
    }
}

#[cfg(test)]
mod tests {
    use std::net::Ipv4Addr;

    use super::{
        build_local_announcement,
        cidr_to_broadcast_ip,
        discovery_targets,
        manual_segment_probe_targets,
    };
    use feiq_lan_tool_lib::app_state::AppState;
    use feiq_lan_tool_lib::models::{
        AppPreferences,
        DeviceNameMode,
        DiscoveryMode,
        IdentityPreferences,
        NetworkPreferences,
    };

    #[test]
    fn local_announcement_uses_identity_preferences() {
        let state = AppState::default();
        state.update_preferences(AppPreferences {
            identity: IdentityPreferences {
                nickname: "飞秋助手".into(),
                device_name_mode: DeviceNameMode::NicknameWithDeviceName,
                status_message: "在线".into(),
            },
            ..AppPreferences::default()
        });

        let announcement = build_local_announcement(&state);
        assert!(announcement.nickname.starts_with("飞秋助手"));
        assert_eq!(announcement.status_message.as_deref(), Some("在线"));
    }

    #[test]
    fn manual_segments_are_expanded_to_broadcast_targets() {
        let targets = discovery_targets(&NetworkPreferences {
            discovery_mode: DiscoveryMode::ManualSegments,
            manual_segments: vec!["192.168.10.0/24".into(), "10.0.20.0/24".into()],
        });

        assert_eq!(targets, vec!["192.168.10.255", "10.0.20.255"]);
    }

    #[test]
    fn cidr_to_broadcast_ip_returns_none_for_invalid_segment() {
        assert_eq!(cidr_to_broadcast_ip("invalid"), None);
        assert_eq!(cidr_to_broadcast_ip("10.0.0.1/99"), None);
    }

    #[test]
    fn manual_segment_probe_targets_expand_host_addresses_and_skip_local_ip() {
        let targets = manual_segment_probe_targets(
            &NetworkPreferences {
                discovery_mode: DiscoveryMode::ManualSegments,
                manual_segments: vec!["192.168.10.0/29".into()],
            },
            Some(Ipv4Addr::new(192, 168, 10, 3)),
        );

        assert_eq!(
            targets,
            vec![
                "192.168.10.1",
                "192.168.10.2",
                "192.168.10.4",
                "192.168.10.5",
                "192.168.10.6",
            ]
        );
    }
}
