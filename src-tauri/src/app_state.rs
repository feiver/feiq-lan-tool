use std::sync::{Arc, RwLock};

use crate::discovery::DeviceRegistry;
use crate::models::{ChatMessage, DeviceAnnouncement, KnownDevice, RuntimeSettings, TransferTask};

#[derive(Default, Clone)]
pub struct AppState {
    pub registry: Arc<RwLock<DeviceRegistry>>,
    pub messages: Arc<RwLock<Vec<ChatMessage>>>,
    pub settings: Arc<RwLock<RuntimeSettings>>,
    pub transfers: Arc<RwLock<Vec<TransferTask>>>,
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
}
