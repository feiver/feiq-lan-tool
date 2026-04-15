use tauri::State;

use feiq_lan_tool_lib::app_state::AppState;
use feiq_lan_tool_lib::models::{KnownDevice, TransferTask};

#[tauri::command]
pub async fn list_devices(state: State<'_, AppState>) -> Result<Vec<KnownDevice>, String> {
    Ok(state.list_devices())
}

#[tauri::command]
pub async fn list_transfers(state: State<'_, AppState>) -> Result<Vec<TransferTask>, String> {
    Ok(state.list_transfers())
}
