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
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum LanEvent {
    DeviceAnnouncement(DeviceAnnouncement),
    DirectMessage(MessagePayload),
}
