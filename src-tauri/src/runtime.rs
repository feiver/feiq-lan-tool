use std::env;
use std::net::{TcpListener, UdpSocket};
use std::path::{Path, PathBuf};
use std::pin::pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
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
    DeliveryDecision,
    DeliveryResponse,
    DeliveryStatus,
    DeviceAnnouncement,
    FileOffer,
    LanEvent,
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
    let announcement = build_local_announcement();

    spawn_discovery_listener(app_handle.clone(), state.clone(), announcement.device_id.clone());
    spawn_discovery_announcer(announcement);
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
            let settings = state.runtime_settings();
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

                build_delivery_output_path(Path::new(&session.save_root), &offer.file_name)
            } else {
                build_download_path(&settings.download_dir, &offer.file_name)
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
                Ok((size, _addr)) => {
                    if let Ok(LanEvent::DeviceAnnouncement(device)) = decode_event(&buffer[..size]) {
                        if device.device_id == local_device_id {
                            continue;
                        }

                        let devices = state.upsert_device(device, current_time_ms());
                        last_known_count = devices.len();
                        let _ = app_handle.emit(DEVICES_UPDATED_EVENT, &devices);
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

fn spawn_discovery_announcer(announcement: DeviceAnnouncement) {
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

        let event = LanEvent::DeviceAnnouncement(announcement);
        let payload = match encode_event(&event) {
            Ok(payload) => payload,
            Err(err) => {
                eprintln!("failed to encode discovery announcement: {err}");
                return;
            }
        };

        loop {
            if let Err(err) = socket.send_to(&payload, ("255.255.255.255", DEFAULT_DISCOVERY_PORT)) {
                eprintln!("failed to broadcast discovery announcement: {err}");
            }

            thread::sleep(DISCOVERY_INTERVAL);
        }
    });
}

fn build_local_announcement() -> DeviceAnnouncement {
    let host_name = env::var("COMPUTERNAME")
        .or_else(|_| env::var("HOSTNAME"))
        .unwrap_or_else(|_| "feiq-device".into());
    let ip_addr = detect_local_ip().unwrap_or_else(|| "127.0.0.1".into());

    DeviceAnnouncement {
        device_id: host_name.clone(),
        nickname: host_name.clone(),
        host_name,
        ip_addr,
        message_port: DEFAULT_MESSAGE_PORT,
        file_port: DEFAULT_FILE_PORT,
    }
}

fn detect_local_ip() -> Option<String> {
    let socket = UdpSocket::bind(("0.0.0.0", 0)).ok()?;
    socket.connect(("8.8.8.8", 80)).ok()?;
    Some(socket.local_addr().ok()?.ip().to_string())
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
