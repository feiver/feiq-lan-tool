use std::fs;
use std::path::{Path, PathBuf};

use crate::runtime::refresh_discovery_once;
use crate::display_runtime::apply_display_preferences;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};

use feiq_lan_tool_lib::app_state::{AppState, OutgoingDeliveryFile, OutgoingDeliverySession};
use feiq_lan_tool_lib::file_transfer::send_file_with_offer_and_progress;
use feiq_lan_tool_lib::message_server::{send_broadcast, send_lan_event, send_message};
use feiq_lan_tool_lib::models::{
    AppPreferences,
    ChatDelivery,
    ChatMessage,
    DiscoveryRefreshHistoryEntry,
    DeliveryDecision,
    DeliveryEntry,
    DeliveryEntryKind,
    DeliveryRequest,
    DeliveryResponse,
    DeliveryStatus,
    FileOffer,
    KnownDevice,
    LanEvent,
    MessagePayload,
    SettingsSnapshot,
    TransferStatus,
    TransferTask,
};
use feiq_lan_tool_lib::settings_store::{
    load_discovery_refresh_history,
    save_discovery_refresh_history,
    save_preferences,
};

const TRANSFER_UPDATED_EVENT: &str = "transfer-updated";

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DeliverySourcePayload {
    source_path: String,
    display_name: String,
    relative_path: String,
    group_name: Option<String>,
    kind: String,
    file_size: u64,
}

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
pub async fn get_settings(state: State<'_, AppState>) -> Result<SettingsSnapshot, String> {
    Ok(state.settings_snapshot())
}

#[tauri::command]
pub async fn sync_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: AppPreferences,
) -> Result<(), String> {
    save_preferences(&settings).map_err(|err| err.to_string())?;
    state.update_preferences(settings.clone());
    apply_display_preferences(&app, &settings);
    Ok(())
}

#[tauri::command]
pub async fn get_discovery_refresh_history(
) -> Result<Vec<DiscoveryRefreshHistoryEntry>, String> {
    load_discovery_refresh_history().map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn persist_discovery_refresh_history(
    entries: Vec<DiscoveryRefreshHistoryEntry>,
) -> Result<(), String> {
    save_discovery_refresh_history(&entries).map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn refresh_discovery(state: State<'_, AppState>) -> Result<(), String> {
    refresh_discovery_once(state.inner())
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
        request_id: None,
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
        delivery: None,
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
        delivery: None,
    };
    send_broadcast(&addr, payload)
        .await
        .map_err(|err| err.to_string())?;
    state.push_message(history_message);
    Ok(())
}

#[tauri::command]
pub async fn send_delivery_request(
    state: State<'_, AppState>,
    addr: String,
    file_addr: String,
    request_id: String,
    to_device_id: String,
    sent_at_ms: i64,
    entries: Vec<DeliverySourcePayload>,
) -> Result<ChatMessage, String> {
    let settings = state.runtime_settings();
    let resolved_files = expand_delivery_sources(&entries)?;
    if resolved_files.is_empty() {
        return Err("delivery entries are empty".into());
    }

    let delivery_entries = resolved_files
        .iter()
        .enumerate()
        .map(|(index, file)| DeliveryEntry {
            entry_id: format!("{request_id}-entry-{index}"),
            display_name: file.display_name.clone(),
            relative_path: file.relative_path.clone(),
            file_size: file.file_size,
            kind: DeliveryEntryKind::File,
        })
        .collect::<Vec<_>>();

    let request = DeliveryRequest {
        request_id: request_id.clone(),
        from_device_id: settings.device_id.clone(),
        to_device_id: to_device_id.clone(),
        sent_at_ms,
        entries: delivery_entries.clone(),
    };

    send_lan_event(&addr, LanEvent::DeliveryRequest(request))
        .await
        .map_err(|err| err.to_string())?;

    state.register_outgoing_delivery(OutgoingDeliverySession {
        request_id: request_id.clone(),
        file_addr,
        from_device_id: settings.device_id.clone(),
        to_device_id: to_device_id.clone(),
        files: resolved_files,
    });

    let history_message = ChatMessage {
        message_id: request_id.clone(),
        from_device_id: settings.device_id,
        to_device_id,
        content: format_delivery_message_content(&delivery_entries),
        sent_at_ms,
        kind: "delivery".into(),
        delivery: Some(ChatDelivery {
            request_id,
            status: DeliveryStatus::PendingDecision,
            entries: delivery_entries,
            save_root: None,
        }),
    };

    state.upsert_message(history_message.clone());
    Ok(history_message)
}

#[tauri::command]
pub async fn send_delivery_response(
    state: State<'_, AppState>,
    addr: String,
    request_id: String,
    to_device_id: String,
    decision: String,
    save_root: Option<String>,
) -> Result<ChatMessage, String> {
    let settings = state.runtime_settings();
    let decision = parse_delivery_decision(&decision)?;

    if matches!(decision, DeliveryDecision::Accepted) {
        let root = save_root
            .clone()
            .ok_or_else(|| "save root is required when accepting delivery".to_string())?;
        state
            .prepare_incoming_delivery(&request_id, root)
            .ok_or_else(|| "delivery request not found".to_string())?;
    }

    let response = DeliveryResponse {
        request_id: request_id.clone(),
        from_device_id: settings.device_id,
        to_device_id,
        decision: decision.clone(),
        save_root: save_root.clone(),
    };

    send_lan_event(&addr, LanEvent::DeliveryResponse(response))
        .await
        .map_err(|err| err.to_string())?;

    state
        .update_delivery_status(
            &request_id,
            match decision {
                DeliveryDecision::Accepted => DeliveryStatus::Accepted,
                DeliveryDecision::Rejected => DeliveryStatus::Rejected,
            },
            save_root,
        )
        .ok_or_else(|| "delivery request not found".to_string())
}

#[tauri::command]
pub async fn classify_delivery_paths(
    paths: Vec<String>,
) -> Result<Vec<DeliverySourcePayload>, String> {
    paths.into_iter()
        .map(|path| {
            let metadata = fs::metadata(&path).map_err(|err| err.to_string())?;
            let display_name = Path::new(&path)
                .file_name()
                .and_then(|name| name.to_str())
                .map(ToOwned::to_owned)
                .ok_or_else(|| "invalid delivery path".to_string())?;

            Ok(DeliverySourcePayload {
                source_path: path,
                relative_path: display_name.clone(),
                group_name: metadata.is_dir().then_some(display_name.clone()),
                display_name,
                kind: if metadata.is_dir() {
                    "directory".into()
                } else {
                    "file".into()
                },
                file_size: if metadata.is_dir() { 0 } else { metadata.len() },
            })
        })
        .collect()
}

fn parse_delivery_decision(decision: &str) -> Result<DeliveryDecision, String> {
    match decision {
        "Accepted" => Ok(DeliveryDecision::Accepted),
        "Rejected" => Ok(DeliveryDecision::Rejected),
        _ => Err(format!("unsupported delivery decision: {decision}")),
    }
}

fn format_delivery_message_content(entries: &[DeliveryEntry]) -> String {
    let file_count = entries.len();
    format!("待投递内容：{file_count} 个文件")
}

fn expand_delivery_sources(entries: &[DeliverySourcePayload]) -> Result<Vec<OutgoingDeliveryFile>, String> {
    let mut resolved = Vec::new();

    for entry in entries {
        match entry.kind.as_str() {
            "directory" => collect_directory_files(
                Path::new(&entry.source_path),
                &entry.display_name,
                &mut resolved,
            )?,
            _ => resolved.push(resolve_file_source(entry)?),
        }
    }

    Ok(resolved)
}

fn resolve_file_source(entry: &DeliverySourcePayload) -> Result<OutgoingDeliveryFile, String> {
    let metadata = fs::metadata(&entry.source_path).map_err(|err| err.to_string())?;
    Ok(OutgoingDeliveryFile {
        source_path: entry.source_path.clone(),
        relative_path: normalize_relative_path(&entry.relative_path, entry.group_name.as_deref()),
        display_name: entry.display_name.clone(),
        file_size: if entry.file_size > 0 {
            entry.file_size
        } else {
            metadata.len()
        },
    })
}

fn collect_directory_files(
    root: &Path,
    group_name: &str,
    resolved: &mut Vec<OutgoingDeliveryFile>,
) -> Result<(), String> {
    for child in fs::read_dir(root).map_err(|err| err.to_string())? {
        let child = child.map_err(|err| err.to_string())?;
        let path = child.path();
        let metadata = child.metadata().map_err(|err| err.to_string())?;

        if metadata.is_dir() {
            collect_directory_files(&path, group_name, resolved)?;
            continue;
        }

        let relative = path
            .strip_prefix(root)
            .map_err(|err| err.to_string())?;
        let relative_path = PathBuf::from(group_name)
            .join(relative)
            .to_string_lossy()
            .replace('\\', "/");

        resolved.push(OutgoingDeliveryFile {
            source_path: path.to_string_lossy().into_owned(),
            relative_path,
            display_name: path
                .file_name()
                .and_then(|name| name.to_str())
                .map(ToOwned::to_owned)
                .ok_or_else(|| "invalid delivery file name".to_string())?,
            file_size: metadata.len(),
        });
    }

    Ok(())
}

fn normalize_relative_path(relative_path: &str, group_name: Option<&str>) -> String {
    let normalized = relative_path.replace('\\', "/");
    if let Some(group_name) = group_name {
        if normalized.starts_with(&format!("{group_name}/")) || normalized == group_name {
            return normalized;
        }
    }

    normalized
}

#[cfg(test)]
mod tests {
    use super::classify_delivery_paths;
    use std::fs;
    use std::path::PathBuf;
    use std::pin::pin;
    use std::sync::Arc;
    use std::task::{Context, Poll, Wake, Waker};
    use std::time::{SystemTime, UNIX_EPOCH};

    struct NoopWake;

    impl Wake for NoopWake {
        fn wake(self: Arc<Self>) {}
    }

    #[test]
    fn classify_delivery_paths_distinguishes_directory_and_extensionless_file() {
        let temp_root = temp_path("delivery-classify");
        let directory_path = temp_root.join("项目资料");
        let file_path = temp_root.join("LICENSE");

        fs::create_dir_all(&directory_path).expect("create directory");
        fs::write(&file_path, b"plain text").expect("write file");

        let items = block_on_ready(classify_delivery_paths(vec![
            directory_path.to_string_lossy().into_owned(),
            file_path.to_string_lossy().into_owned(),
        ]))
        .expect("classify paths");

        assert_eq!(items.len(), 2);
        assert_eq!(items[0].kind, "directory");
        assert_eq!(items[0].group_name.as_deref(), Some("项目资料"));
        assert_eq!(items[1].kind, "file");
        assert_eq!(items[1].display_name, "LICENSE");

        fs::remove_file(file_path).expect("remove file");
        fs::remove_dir_all(temp_root).expect("remove temp root");
    }

    fn temp_path(prefix: &str) -> PathBuf {
        let mut path = std::env::temp_dir();
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time")
            .as_nanos();
        path.push(format!("{prefix}-{suffix}"));
        path
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
}
