use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DeviceAnnouncement {
    pub device_id: String,
    pub nickname: String,
    pub host_name: String,
    pub ip_addr: String,
    pub message_port: u16,
    pub file_port: u16,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status_message: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct KnownDevice {
    pub device_id: String,
    pub nickname: String,
    pub host_name: String,
    pub ip_addr: String,
    pub message_port: u16,
    pub file_port: u16,
    pub last_seen_ms: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status_message: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DiscoveryProbe {
    pub from_device_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MessagePayload {
    pub message_id: String,
    pub from_device_id: String,
    pub to_device_id: String,
    pub content: String,
    pub sent_at_ms: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChatMessage {
    pub message_id: String,
    pub from_device_id: String,
    pub to_device_id: String,
    pub content: String,
    pub sent_at_ms: i64,
    pub kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub delivery: Option<ChatDelivery>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DeliveryEntryKind {
    File,
    Directory,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DeliveryEntry {
    pub entry_id: String,
    pub display_name: String,
    pub relative_path: String,
    pub file_size: u64,
    pub kind: DeliveryEntryKind,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DeliveryStatus {
    PendingDecision,
    Accepted,
    Rejected,
    InProgress,
    Completed,
    Failed,
    PartialFailed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChatDelivery {
    pub request_id: String,
    pub status: DeliveryStatus,
    pub entries: Vec<DeliveryEntry>,
    pub save_root: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DeliveryRequest {
    pub request_id: String,
    pub from_device_id: String,
    pub to_device_id: String,
    pub sent_at_ms: i64,
    pub entries: Vec<DeliveryEntry>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DeliveryDecision {
    Accepted,
    Rejected,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DeliveryResponse {
    pub request_id: String,
    pub from_device_id: String,
    pub to_device_id: String,
    pub decision: DeliveryDecision,
    pub save_root: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum TransferStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TransferTask {
    pub transfer_id: String,
    pub file_name: String,
    pub file_size: u64,
    pub transferred_bytes: u64,
    pub from_device_id: String,
    pub to_device_id: String,
    pub status: TransferStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FileOffer {
    pub transfer_id: String,
    pub file_name: String,
    pub file_size: u64,
    pub from_device_id: String,
    pub to_device_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AppPreferences {
    pub identity: IdentityPreferences,
    #[serde(default)]
    pub chat: ChatPreferences,
    pub transfer: TransferPreferences,
    pub network: NetworkPreferences,
    pub display: DisplayPreferences,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct IdentityPreferences {
    pub nickname: String,
    pub device_name_mode: DeviceNameMode,
    pub status_message: String,
}

impl Default for IdentityPreferences {
    fn default() -> Self {
        Self {
            nickname: default_device_name(),
            device_name_mode: DeviceNameMode::NicknameOnly,
            status_message: String::new(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DeviceNameMode {
    NicknameOnly,
    NicknameWithDeviceName,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChatPreferences {
    pub enter_to_send: bool,
    pub confirm_before_broadcast: bool,
    pub auto_switch_to_incoming_direct: bool,
    pub auto_switch_to_incoming_delivery: bool,
}

impl Default for ChatPreferences {
    fn default() -> Self {
        Self {
            enter_to_send: false,
            confirm_before_broadcast: true,
            auto_switch_to_incoming_direct: false,
            auto_switch_to_incoming_delivery: true,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TransferPreferences {
    pub download_dir: String,
    pub receive_before_accept: bool,
    pub open_folder_after_receive: bool,
    pub preserve_directory_structure: bool,
}

impl Default for TransferPreferences {
    fn default() -> Self {
        Self {
            download_dir: "~/Downloads".into(),
            receive_before_accept: true,
            open_folder_after_receive: true,
            preserve_directory_structure: true,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NetworkPreferences {
    pub discovery_mode: DiscoveryMode,
    pub manual_segments: Vec<String>,
}

impl Default for NetworkPreferences {
    fn default() -> Self {
        Self {
            discovery_mode: DiscoveryMode::Auto,
            manual_segments: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DiscoveryMode {
    Auto,
    ManualSegments,
    CurrentSegmentOnly,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DisplayPreferences {
    pub tray_enabled: bool,
    pub close_action: CloseAction,
}

impl Default for DisplayPreferences {
    fn default() -> Self {
        Self {
            tray_enabled: true,
            close_action: CloseAction::MinimizeToTray,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum CloseAction {
    MinimizeToTray,
    Exit,
}

impl Default for AppPreferences {
    fn default() -> Self {
        Self {
            identity: IdentityPreferences::default(),
            chat: ChatPreferences::default(),
            transfer: TransferPreferences::default(),
            network: NetworkPreferences::default(),
            display: DisplayPreferences::default(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RuntimeSettings {
    pub device_id: String,
    pub nickname: String,
    pub download_dir: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SettingsRuntime {
    pub device_id: String,
    pub message_port: u16,
    pub file_port: u16,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SettingsSnapshot {
    pub preferences: AppPreferences,
    pub runtime: SettingsRuntime,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DiscoveryRefreshHistoryStatus {
    Succeeded,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum DiscoveryRefreshSegmentStatus {
    NewlyMatched,
    AlreadyOnline,
    #[default]
    Unmatched,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct DiscoveryRefreshSegmentStatusSummary {
    pub segment: String,
    pub status: DiscoveryRefreshSegmentStatus,
    pub new_device_count: usize,
    pub existing_device_count: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DiscoveryRefreshHistoryEntry {
    pub id: String,
    pub timestamp: i64,
    pub status: DiscoveryRefreshHistoryStatus,
    pub discovered_count: usize,
    pub existing_count: usize,
    pub unmatched_segment_count: usize,
    pub message: String,
    #[serde(default)]
    pub new_device_labels: Vec<String>,
    #[serde(default)]
    pub existing_device_labels: Vec<String>,
    #[serde(default)]
    pub unmatched_segments: Vec<String>,
    #[serde(default)]
    pub segment_statuses: Vec<DiscoveryRefreshSegmentStatusSummary>,
}

impl Default for RuntimeSettings {
    fn default() -> Self {
        let default_device_name = default_device_name();
        Self {
            device_id: default_device_name.clone(),
            nickname: default_device_name,
            download_dir: "~/Downloads".into(),
        }
    }
}

impl From<RuntimeSettings> for AppPreferences {
    fn from(value: RuntimeSettings) -> Self {
        Self {
            identity: IdentityPreferences {
                nickname: value.nickname,
                ..IdentityPreferences::default()
            },
            chat: ChatPreferences::default(),
            transfer: TransferPreferences {
                download_dir: value.download_dir,
                ..TransferPreferences::default()
            },
            network: NetworkPreferences::default(),
            display: DisplayPreferences::default(),
        }
    }
}

impl From<&RuntimeSettings> for AppPreferences {
    fn from(value: &RuntimeSettings) -> Self {
        value.clone().into()
    }
}

impl From<AppPreferences> for RuntimeSettings {
    fn from(value: AppPreferences) -> Self {
        Self {
            device_id: default_device_name(),
            nickname: value.identity.nickname,
            download_dir: value.transfer.download_dir,
        }
    }
}

fn default_device_name() -> String {
    env::var("COMPUTERNAME")
        .or_else(|_| env::var("HOSTNAME"))
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "feiq-device".into())
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum LanEvent {
    DeviceAnnouncement(DeviceAnnouncement),
    DiscoveryProbe(DiscoveryProbe),
    DirectMessage(MessagePayload),
    BroadcastMessage(MessagePayload),
    DeliveryRequest(DeliveryRequest),
    DeliveryResponse(DeliveryResponse),
}

#[cfg(test)]
mod tests {
    #[test]
    fn runtime_settings_default_uses_non_empty_device_name() {
        let settings = super::RuntimeSettings::default();

        assert!(!settings.device_id.trim().is_empty());
        assert_eq!(settings.nickname, settings.device_id);
        assert_eq!(settings.download_dir, "~/Downloads");
    }

    #[test]
    fn app_preferences_default_uses_non_empty_device_name() {
        let settings = super::AppPreferences::default();

        assert!(!settings.identity.nickname.trim().is_empty());
        assert_eq!(settings.transfer.download_dir, "~/Downloads");
        assert!(settings.transfer.receive_before_accept);
        assert_eq!(settings.network.discovery_mode, super::DiscoveryMode::Auto);
        assert!(settings.display.tray_enabled);
        assert_eq!(
            settings.display.close_action,
            super::CloseAction::MinimizeToTray
        );
    }
}
