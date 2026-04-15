use tauri::State;

use feiq_lan_tool_lib::app_state::AppState;
use feiq_lan_tool_lib::message_server::{send_broadcast, send_message};
use feiq_lan_tool_lib::models::{ChatMessage, KnownDevice, MessagePayload, RuntimeSettings, TransferTask};

#[tauri::command]
pub async fn list_devices(state: State<'_, AppState>) -> Result<Vec<KnownDevice>, String> {
    Ok(state.list_devices())
}

#[tauri::command]
pub async fn list_transfers(state: State<'_, AppState>) -> Result<Vec<TransferTask>, String> {
    Ok(state.list_transfers())
}

#[tauri::command]
pub async fn list_messages(state: State<'_, AppState>) -> Result<Vec<ChatMessage>, String> {
    Ok(state.list_messages())
}

#[tauri::command]
pub async fn sync_settings(
    state: State<'_, AppState>,
    settings: RuntimeSettings,
) -> Result<(), String> {
    state.update_runtime_settings(settings);
    Ok(())
}

#[tauri::command]
pub async fn send_direct_message(
    state: State<'_, AppState>,
    addr: String,
    payload: MessagePayload,
) -> Result<(), String> {
    let history_message = ChatMessage {
        message_id: payload.message_id.clone(),
        from_device_id: payload.from_device_id.clone(),
        to_device_id: payload.to_device_id.clone(),
        content: payload.content.clone(),
        sent_at_ms: payload.sent_at_ms,
        kind: "direct".into(),
    };
    send_message(&addr, payload)
        .await
        .map_err(|err| err.to_string())?;
    state.push_message(history_message);
    Ok(())
}

#[tauri::command]
pub async fn send_broadcast_message(
    state: State<'_, AppState>,
    addr: String,
    payload: MessagePayload,
) -> Result<(), String> {
    let history_message = ChatMessage {
        message_id: payload.message_id.clone(),
        from_device_id: payload.from_device_id.clone(),
        to_device_id: payload.to_device_id.clone(),
        content: payload.content.clone(),
        sent_at_ms: payload.sent_at_ms,
        kind: "broadcast".into(),
    };
    send_broadcast(&addr, payload)
        .await
        .map_err(|err| err.to_string())?;
    state.push_message(history_message);
    Ok(())
}
