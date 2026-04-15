use std::net::TcpListener;
use std::thread;

use feiq_lan_tool_lib::app_state::AppState;
use feiq_lan_tool_lib::message_runtime::{record_incoming_message, CHAT_MESSAGE_RECEIVED_EVENT};
use feiq_lan_tool_lib::message_server::read_event;
use tauri::{AppHandle, Emitter};

pub const DEFAULT_MESSAGE_PORT: u16 = 37001;

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
