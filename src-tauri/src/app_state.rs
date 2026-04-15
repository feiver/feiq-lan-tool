use std::collections::HashMap;
use std::sync::{Arc, RwLock};

use crate::discovery::DeviceRegistry;
use crate::models::{
    ChatMessage,
    DeliveryEntryKind,
    DeliveryStatus,
    DeviceAnnouncement,
    KnownDevice,
    RuntimeSettings,
    TransferTask,
};

#[derive(Default, Clone)]
pub struct AppState {
    pub registry: Arc<RwLock<DeviceRegistry>>,
    pub messages: Arc<RwLock<Vec<ChatMessage>>>,
    pub settings: Arc<RwLock<RuntimeSettings>>,
    pub transfers: Arc<RwLock<Vec<TransferTask>>>,
    pub outgoing_deliveries: Arc<RwLock<HashMap<String, OutgoingDeliverySession>>>,
    pub incoming_deliveries: Arc<RwLock<HashMap<String, IncomingDeliverySession>>>,
}

#[derive(Debug, Clone)]
pub struct OutgoingDeliveryFile {
    pub source_path: String,
    pub relative_path: String,
    pub display_name: String,
    pub file_size: u64,
}

#[derive(Debug, Clone)]
pub struct OutgoingDeliverySession {
    pub request_id: String,
    pub file_addr: String,
    pub from_device_id: String,
    pub to_device_id: String,
    pub files: Vec<OutgoingDeliveryFile>,
}

#[derive(Debug, Clone)]
pub struct IncomingDeliverySession {
    pub save_root: String,
    pub expected_files: usize,
    pub received_files: usize,
}

impl AppState {
    pub fn list_devices(&self) -> Vec<KnownDevice> {
        self.registry
            .read()
            .expect("registry read lock")
            .online_devices()
    }

    pub fn upsert_device(&self, device: DeviceAnnouncement, now_ms: i64) -> Vec<KnownDevice> {
        let mut registry = self.registry.write().expect("registry write lock");
        registry.upsert(device, now_ms);
        registry.online_devices()
    }

    pub fn prune_devices(&self, now_ms: i64, timeout_ms: i64) -> Vec<KnownDevice> {
        let mut registry = self.registry.write().expect("registry write lock");
        registry.prune_stale(now_ms, timeout_ms);
        registry.online_devices()
    }

    pub fn list_transfers(&self) -> Vec<TransferTask> {
        self.transfers.read().expect("transfers read lock").clone()
    }

    pub fn upsert_transfer(&self, task: TransferTask) -> Vec<TransferTask> {
        let mut transfers = self.transfers.write().expect("transfers write lock");
        if let Some(index) = transfers
            .iter()
            .position(|item| item.transfer_id == task.transfer_id)
        {
            transfers[index] = task;
        } else {
            transfers.push(task);
        }

        transfers.clone()
    }

    pub fn runtime_settings(&self) -> RuntimeSettings {
        self.settings.read().expect("settings read lock").clone()
    }

    pub fn update_runtime_settings(&self, settings: RuntimeSettings) {
        *self.settings.write().expect("settings write lock") = settings;
    }

    pub fn list_messages(&self) -> Vec<ChatMessage> {
        self.messages.read().expect("messages read lock").clone()
    }

    pub fn push_message(&self, message: ChatMessage) {
        self.messages
            .write()
            .expect("messages write lock")
            .push(message);
    }

    pub fn upsert_message(&self, message: ChatMessage) {
        let mut messages = self.messages.write().expect("messages write lock");
        if let Some(index) = messages
            .iter()
            .position(|item| item.message_id == message.message_id)
        {
            messages[index] = message;
        } else {
            messages.push(message);
        }
    }

    pub fn update_delivery_status(
        &self,
        request_id: &str,
        status: DeliveryStatus,
        save_root: Option<String>,
    ) -> Option<ChatMessage> {
        let mut messages = self.messages.write().expect("messages write lock");
        for message in messages.iter_mut() {
            if let Some(delivery) = message.delivery.as_mut() {
                if delivery.request_id == request_id {
                    delivery.status = status.clone();
                    if let Some(root) = save_root.as_ref() {
                        delivery.save_root = Some(root.clone());
                    }

                    return Some(message.clone());
                }
            }
        }

        None
    }

    pub fn register_outgoing_delivery(&self, session: OutgoingDeliverySession) {
        self.outgoing_deliveries
            .write()
            .expect("outgoing deliveries write lock")
            .insert(session.request_id.clone(), session);
    }

    pub fn outgoing_delivery(&self, request_id: &str) -> Option<OutgoingDeliverySession> {
        self.outgoing_deliveries
            .read()
            .expect("outgoing deliveries read lock")
            .get(request_id)
            .cloned()
    }

    pub fn remove_outgoing_delivery(&self, request_id: &str) {
        self.outgoing_deliveries
            .write()
            .expect("outgoing deliveries write lock")
            .remove(request_id);
    }

    pub fn prepare_incoming_delivery(
        &self,
        request_id: &str,
        save_root: String,
    ) -> Option<IncomingDeliverySession> {
        let expected_files = self
            .messages
            .read()
            .expect("messages read lock")
            .iter()
            .find(|message| {
                message
                    .delivery
                    .as_ref()
                    .is_some_and(|delivery| delivery.request_id == request_id)
            })
            .and_then(|message| message.delivery.as_ref())
            .map(|delivery| {
                delivery
                    .entries
                    .iter()
                    .filter(|entry| entry.kind == DeliveryEntryKind::File)
                    .count()
            })?;

        let session = IncomingDeliverySession {
            save_root,
            expected_files,
            received_files: 0,
        };

        self.incoming_deliveries
            .write()
            .expect("incoming deliveries write lock")
            .insert(request_id.to_string(), session.clone());

        Some(session)
    }

    pub fn incoming_delivery(&self, request_id: &str) -> Option<IncomingDeliverySession> {
        self.incoming_deliveries
            .read()
            .expect("incoming deliveries read lock")
            .get(request_id)
            .cloned()
    }

    pub fn mark_incoming_delivery_received(&self, request_id: &str) -> Option<IncomingDeliverySession> {
        let mut deliveries = self
            .incoming_deliveries
            .write()
            .expect("incoming deliveries write lock");
        let session = deliveries.get_mut(request_id)?;
        session.received_files += 1;
        Some(session.clone())
    }

    pub fn remove_incoming_delivery(&self, request_id: &str) {
        self.incoming_deliveries
            .write()
            .expect("incoming deliveries write lock")
            .remove(request_id);
    }
}
