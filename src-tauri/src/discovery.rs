use std::collections::HashMap;
use std::net::SocketAddr;

use tokio::net::UdpSocket;

use crate::models::{DeviceAnnouncement, KnownDevice};

#[derive(Default)]
pub struct DeviceRegistry {
    devices: HashMap<String, KnownDevice>,
}

impl DeviceRegistry {
    pub fn upsert(&mut self, device: DeviceAnnouncement, now_ms: i64) {
        self.devices.insert(
            device.device_id.clone(),
            KnownDevice {
                device_id: device.device_id,
                nickname: device.nickname,
                host_name: device.host_name,
                ip_addr: device.ip_addr,
                message_port: device.message_port,
                file_port: device.file_port,
                last_seen_ms: now_ms,
            },
        );
    }

    pub fn prune_stale(&mut self, now_ms: i64, timeout_ms: i64) {
        self.devices
            .retain(|_, device| now_ms - device.last_seen_ms <= timeout_ms);
    }

    pub fn online_devices(&self) -> Vec<KnownDevice> {
        self.devices.values().cloned().collect()
    }
}

pub async fn bind_discovery_socket(port: u16) -> std::io::Result<UdpSocket> {
    let socket = UdpSocket::bind(SocketAddr::from(([0, 0, 0, 0], port))).await?;
    socket.set_broadcast(true)?;
    Ok(socket)
}
