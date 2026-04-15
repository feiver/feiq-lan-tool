use tauri::State;

use feiq_lan_tool_lib::app_state::AppState;
use feiq_lan_tool_lib::message_server::{send_broadcast, send_message};
use feiq_lan_tool_lib::models::{KnownDevice, MessagePayload, TransferTask};

#[tauri::command]
pub async fn list_devices(state: State<'_, AppState>) -> Result<Vec<KnownDevice>, String> {
    Ok(state.list_devices())
}

#[tauri::command]
pub async fn list_transfers(state: State<'_, AppState>) -> Result<Vec<TransferTask>, String> {
    Ok(state.list_transfers())
}

#[tauri::command]
pub async fn send_direct_message(addr: String, payload: MessagePayload) -> Result<(), String> {
    send_message(&addr, payload)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn send_broadcast_message(addr: String, payload: MessagePayload) -> Result<(), String> {
    send_broadcast(&addr, payload)
        .await
        .map_err(|err| err.to_string())
}
