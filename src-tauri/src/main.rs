// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod runtime;

use feiq_lan_tool_lib::app_state::AppState;
use feiq_lan_tool_lib::settings_store::load_settings;
use tauri::Manager;
use runtime::{
    spawn_discovery_runtime,
    spawn_file_listener,
    spawn_message_listener,
    DEFAULT_FILE_PORT,
    DEFAULT_MESSAGE_PORT,
};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let state = app.state::<AppState>().inner().clone();
            if let Ok(Some(settings)) = load_settings() {
                state.update_runtime_settings(settings);
            }
            spawn_message_listener(app_handle, state, DEFAULT_MESSAGE_PORT);
            spawn_file_listener(app.handle().clone(), app.state::<AppState>().inner().clone(), DEFAULT_FILE_PORT);
            spawn_discovery_runtime(app.handle().clone(), app.state::<AppState>().inner().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_devices,
            commands::list_transfers,
            commands::list_messages,
            commands::get_settings,
            commands::sync_settings,
            commands::send_file_to_device,
            commands::send_delivery_request,
            commands::send_delivery_response,
            commands::send_direct_message,
            commands::send_broadcast_message
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
