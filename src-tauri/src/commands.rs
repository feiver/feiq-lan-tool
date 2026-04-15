use std::path::Path;

use tauri::{AppHandle, Emitter, State};

use feiq_lan_tool_lib::app_state::AppState;
use feiq_lan_tool_lib::file_transfer::send_file_with_offer_and_progress;
use feiq_lan_tool_lib::message_server::{send_broadcast, send_message};
use feiq_lan_tool_lib::models::{
    ChatMessage,
    FileOffer,
    KnownDevice,
    MessagePayload,
    RuntimeSettings,
    TransferStatus,
    TransferTask,
};
use feiq_lan_tool_lib::settings_store::save_settings;

const TRANSFER_UPDATED_EVENT: &str = "transfer-updated";

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
pub async fn get_settings(state: State<'_, AppState>) -> Result<RuntimeSettings, String> {
    Ok(state.runtime_settings())
}

#[tauri::command]
pub async fn sync_settings(
    state: State<'_, AppState>,
    settings: RuntimeSettings,
) -> Result<(), String> {
    save_settings(&settings).map_err(|err| err.to_string())?;
    state.update_runtime_settings(settings);
    Ok(())
}

#[tauri::command]
pub async fn send_file_to_device(
    app: AppHandle,
    state: State<'_, AppState>,
    addr: String,
    file_path: String,
    to_device_id: String,
) -> Result<(), String> {
    let settings = state.runtime_settings();
    let path = Path::new(&file_path);
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .map(ToOwned::to_owned)
        .ok_or_else(|| "invalid file path".to_string())?;
    let file_size = std::fs::metadata(path)
        .map_err(|err| err.to_string())?
        .len();
    let transfer_id = format!("tx-send-{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|err| err.to_string())?
        .as_millis());
    let mut task = TransferTask {
        transfer_id: transfer_id.clone(),
        file_name,
        file_size,
        transferred_bytes: 0,
        from_device_id: settings.device_id,
        to_device_id,
        status: TransferStatus::Pending,
    };
    let offer = FileOffer {
        transfer_id,
        file_name: task.file_name.clone(),
        file_size,
        from_device_id: task.from_device_id.clone(),
        to_device_id: task.to_device_id.clone(),
    };

    state.upsert_transfer(task.clone());
    let _ = app.emit(TRANSFER_UPDATED_EVENT, &task);

    let result = send_file_with_offer_and_progress(&addr, path, &offer, &mut task, |snapshot| {
        state.upsert_transfer(snapshot.clone());
        let _ = app.emit(TRANSFER_UPDATED_EVENT, snapshot);
    })
    .await;

    if let Err(err) = result {
        task.status = TransferStatus::Failed;
        state.upsert_transfer(task.clone());
        let _ = app.emit(TRANSFER_UPDATED_EVENT, &task);
        return Err(err.to_string());
    }

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
