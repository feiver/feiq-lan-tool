use std::env;
use std::net::{TcpListener, UdpSocket};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use feiq_lan_tool_lib::app_state::AppState;
use feiq_lan_tool_lib::models::{DeviceAnnouncement, LanEvent};
use feiq_lan_tool_lib::message_runtime::{record_incoming_message, CHAT_MESSAGE_RECEIVED_EVENT};
use feiq_lan_tool_lib::message_server::read_event;
use feiq_lan_tool_lib::protocol::{decode_event, encode_event};
use tauri::{AppHandle, Emitter};

pub const DEFAULT_MESSAGE_PORT: u16 = 37001;
pub const DEFAULT_FILE_PORT: u16 = 37002;
pub const DEFAULT_DISCOVERY_PORT: u16 = 37000;
pub const DEVICES_UPDATED_EVENT: &str = "devices-updated";
const DISCOVERY_INTERVAL: Duration = Duration::from_secs(3);
const DISCOVERY_READ_TIMEOUT: Duration = Duration::from_secs(1);
const DEVICE_TTL_MS: i64 = 15_000;

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
                    if let Some(message) = record_incoming_message(&state, event) {
                        let _ = app_handle.emit(CHAT_MESSAGE_RECEIVED_EVENT, &message);
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

fn current_time_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default()
}
