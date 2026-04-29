// 桌面发行包直接双击运行，不弹出额外控制台窗口。
#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]

mod commands;
mod display_runtime;
mod runtime;

use feiq_lan_tool_lib::app_state::AppState;
use feiq_lan_tool_lib::message_store::ChatMessageStore;
use feiq_lan_tool_lib::settings_store::load_preferences;
use tauri::Manager;
use runtime::{
    spawn_discovery_runtime,
    spawn_file_listener,
    spawn_message_listener,
    DEFAULT_FILE_PORT,
    DEFAULT_MESSAGE_PORT,
};

fn main() {
    let state = AppState::with_message_store(ChatMessageStore::open_default().ok());

    tauri::Builder::default()
        .on_menu_event(|app, event| {
            display_runtime::handle_menu_event(app, &event);
        })
        .on_tray_icon_event(|app, event| {
            display_runtime::handle_tray_icon_event(app, &event);
        })
        .on_window_event(|window, event| {
            display_runtime::handle_window_event(window, event);
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .setup(|app| {
            let app_handle = app.handle().clone();
            let state = app.state::<AppState>().inner().clone();
            display_runtime::setup_tray(app)?;
            if let Ok(Some(settings)) = load_preferences() {
                state.update_preferences(settings);
            }
            display_runtime::apply_display_preferences(&app_handle, &state.settings_snapshot().preferences);
            if let Ok(messages) = state.load_persisted_messages() {
                state.replace_messages(messages);
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
            commands::get_discovery_refresh_history,
            commands::persist_discovery_refresh_history,
            commands::refresh_discovery,
            commands::send_file_to_device,
            commands::classify_delivery_paths,
            commands::send_delivery_request,
            commands::send_delivery_response,
            commands::send_direct_message,
            commands::send_broadcast_message
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
