// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod runtime;

use feiq_lan_tool_lib::app_state::AppState;
use tauri::Manager;
use runtime::{spawn_message_listener, DEFAULT_MESSAGE_PORT};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let state = app.state::<AppState>().inner().clone();
            spawn_message_listener(app_handle, state, DEFAULT_MESSAGE_PORT);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_devices,
            commands::list_transfers,
            commands::list_messages,
            commands::send_direct_message,
            commands::send_broadcast_message
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
