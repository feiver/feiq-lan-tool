use std::sync::{Arc, RwLock};

use crate::discovery::DeviceRegistry;
use crate::models::{KnownDevice, TransferTask};

#[derive(Default, Clone)]
pub struct AppState {
    pub registry: Arc<RwLock<DeviceRegistry>>,
    pub transfers: Arc<RwLock<Vec<TransferTask>>>,
}

impl AppState {
    pub fn list_devices(&self) -> Vec<KnownDevice> {
        self.registry
            .read()
            .expect("registry read lock")
            .online_devices()
    }

    pub fn list_transfers(&self) -> Vec<TransferTask> {
        self.transfers.read().expect("transfers read lock").clone()
    }
}
