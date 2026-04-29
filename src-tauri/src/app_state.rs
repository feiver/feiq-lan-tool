use std::collections::HashMap;
use std::sync::{Arc, RwLock};

use crate::discovery::DeviceRegistry;
use crate::message_store::ChatMessageStore;
use crate::models::{
    AppPreferences,
    ChatMessage,
    DeliveryEntryKind,
    DeliveryStatus,
    DeviceAnnouncement,
    KnownDevice,
    RuntimeSettings,
    SettingsRuntime,
    SettingsSnapshot,
    TransferTask,
};

#[derive(Clone)]
pub struct AppState {
    pub registry: Arc<RwLock<DeviceRegistry>>,
    pub messages: Arc<RwLock<Vec<ChatMessage>>>,
    pub preferences: Arc<RwLock<AppPreferences>>,
    pub runtime: Arc<RwLock<SettingsRuntime>>,
    pub transfers: Arc<RwLock<Vec<TransferTask>>>,
    pub outgoing_deliveries: Arc<RwLock<HashMap<String, OutgoingDeliverySession>>>,
    pub incoming_deliveries: Arc<RwLock<HashMap<String, IncomingDeliverySession>>>,
    pub message_store: Option<ChatMessageStore>,
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
    pub fn with_message_store(message_store: Option<ChatMessageStore>) -> Self {
        Self {
            registry: Arc::new(RwLock::new(DeviceRegistry::default())),
            messages: Arc::new(RwLock::new(Vec::new())),
            preferences: Arc::new(RwLock::new(AppPreferences::default())),
            runtime: Arc::new(RwLock::new(SettingsRuntime {
                device_id: RuntimeSettings::default().device_id,
                message_port: 37001,
                file_port: 37002,
            })),
            transfers: Arc::new(RwLock::new(Vec::new())),
            outgoing_deliveries: Arc::new(RwLock::new(HashMap::new())),
            incoming_deliveries: Arc::new(RwLock::new(HashMap::new())),
            message_store,
        }
    }

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
        let preferences = self
            .preferences
            .read()
            .expect("preferences read lock")
            .clone();
        let runtime = self.runtime.read().expect("runtime read lock").clone();

        RuntimeSettings {
            device_id: runtime.device_id,
            nickname: preferences.identity.nickname,
            download_dir: preferences.transfer.download_dir,
        }
    }

    pub fn update_runtime_settings(&self, settings: RuntimeSettings) {
        *self.preferences.write().expect("preferences write lock") =
            AppPreferences::from(settings.clone());

        let mut runtime = self.runtime.write().expect("runtime write lock");
        runtime.device_id = settings.device_id;
    }

    pub fn settings_snapshot(&self) -> SettingsSnapshot {
        SettingsSnapshot {
            preferences: self
                .preferences
                .read()
                .expect("preferences read lock")
                .clone(),
            runtime: self.runtime.read().expect("runtime read lock").clone(),
        }
    }

    pub fn update_preferences(&self, preferences: AppPreferences) {
        *self.preferences.write().expect("preferences write lock") = preferences;
    }

    pub fn list_messages(&self) -> Vec<ChatMessage> {
        self.messages.read().expect("messages read lock").clone()
    }

    pub fn load_persisted_messages(&self) -> Result<Vec<ChatMessage>, String> {
        self.message_store
            .as_ref()
            .map(|store| store.list_messages().map_err(|err| err.to_string()))
            .transpose()
            .map(|messages| messages.unwrap_or_default())
    }

    pub fn replace_messages(&self, messages: Vec<ChatMessage>) {
        *self.messages.write().expect("messages write lock") = messages;
    }

    pub fn push_message(&self, message: ChatMessage) {
        self.messages
            .write()
            .expect("messages write lock")
            .push(message.clone());
        self.persist_message(&message);
    }

    pub fn upsert_message(&self, message: ChatMessage) {
        let mut messages = self.messages.write().expect("messages write lock");
        let persisted_message = if let Some(index) = messages
            .iter()
            .position(|item| item.message_id == message.message_id)
        {
            messages[index] = message;
            messages[index].clone()
        } else {
            messages.push(message);
            messages.last().cloned().expect("just pushed message")
        };
        drop(messages);

        self.persist_message(&persisted_message);
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

                    let updated = message.clone();
                    self.persist_message(&updated);
                    return Some(updated);
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

    fn persist_message(&self, message: &ChatMessage) {
        if let Some(store) = self.message_store.as_ref() {
            if let Err(err) = store.upsert_message(message) {
                eprintln!("failed to persist chat message: {err}");
            }
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::with_message_store(None)
    }
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    use crate::message_store::ChatMessageStore;
    use crate::models::{
        ChatDelivery,
        ChatMessage,
        DeliveryEntry,
        DeliveryEntryKind,
        DeliveryStatus,
    };

    use super::AppState;

    #[test]
    fn upsert_message_persists_the_updated_message_instead_of_last_item() {
        let path = temp_db_path();
        let store = ChatMessageStore::open(&path).expect("open store");
        let state = AppState::with_message_store(Some(store));
        let pending_delivery = delivery_message("req-1", DeliveryStatus::PendingDecision, None);
        let trailing_message = direct_message("msg-2", "still here", 1_712_000_002);

        state.push_message(pending_delivery.clone());
        state.push_message(trailing_message.clone());

        let accepted_delivery = ChatMessage {
            delivery: Some(ChatDelivery {
                status: DeliveryStatus::Accepted,
                save_root: Some("D:/接收目录".into()),
                ..pending_delivery.delivery.clone().expect("delivery")
            }),
            ..pending_delivery
        };

        state.upsert_message(accepted_delivery.clone());

        let persisted = state.load_persisted_messages().expect("load persisted messages");
        assert_eq!(persisted, vec![accepted_delivery, trailing_message]);

        fs::remove_file(path).expect("cleanup db");
    }

    fn delivery_message(
        message_id: &str,
        status: DeliveryStatus,
        save_root: Option<&str>,
    ) -> ChatMessage {
        ChatMessage {
            message_id: message_id.into(),
            from_device_id: "device-a".into(),
            to_device_id: "local-device".into(),
            content: "delivery request".into(),
            sent_at_ms: 1_712_000_001,
            kind: "delivery".into(),
            delivery: Some(ChatDelivery {
                request_id: message_id.into(),
                status,
                entries: vec![DeliveryEntry {
                    entry_id: "entry-1".into(),
                    display_name: "合同.zip".into(),
                    relative_path: "合同.zip".into(),
                    file_size: 2048,
                    kind: DeliveryEntryKind::File,
                }],
                save_root: save_root.map(str::to_string),
            }),
        }
    }

    fn direct_message(message_id: &str, content: &str, sent_at_ms: i64) -> ChatMessage {
        ChatMessage {
            message_id: message_id.into(),
            from_device_id: "device-b".into(),
            to_device_id: "local-device".into(),
            content: content.into(),
            sent_at_ms,
            kind: "direct".into(),
            delivery: None,
        }
    }

    fn temp_db_path() -> PathBuf {
        let mut path = std::env::temp_dir();
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time")
            .as_nanos();
        path.push(format!("feiq-app-state-{suffix}.db"));
        path
    }
}
