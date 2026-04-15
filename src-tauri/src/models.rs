use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DeviceAnnouncement {
    pub device_id: String,
    pub nickname: String,
    pub host_name: String,
    pub ip_addr: String,
    pub message_port: u16,
    pub file_port: u16,
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
pub struct RuntimeSettings {
    pub device_id: String,
    pub nickname: String,
    pub download_dir: String,
}

impl Default for RuntimeSettings {
    fn default() -> Self {
        Self {
            device_id: "local-device".into(),
            nickname: "未命名设备".into(),
            download_dir: "~/Downloads".into(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum LanEvent {
    DeviceAnnouncement(DeviceAnnouncement),
    DirectMessage(MessagePayload),
    BroadcastMessage(MessagePayload),
    DeliveryRequest(DeliveryRequest),
    DeliveryResponse(DeliveryResponse),
}
