// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use feiq_lan_tool_lib::app_state::AppState;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::list_devices,
            commands::list_transfers,
            commands::send_direct_message,
            commands::send_broadcast_message
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
