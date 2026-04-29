use feiq_lan_tool_lib::app_state::AppState;
use feiq_lan_tool_lib::discovery::DeviceRegistry;
use feiq_lan_tool_lib::models::DeviceAnnouncement;

#[test]
fn marks_device_online_after_announcement() {
    let mut registry = DeviceRegistry::default();
    let device = DeviceAnnouncement {
        device_id: "device-a".into(),
        nickname: "Alice".into(),
        host_name: "alice-pc".into(),
        ip_addr: "192.168.1.10".into(),
        message_port: 37001,
        file_port: 37002,
        status_message: None,
    };

    registry.upsert(device.clone(), 1000);

    let devices = registry.online_devices();
    assert_eq!(devices.len(), 1);
    assert_eq!(devices[0].device_id, device.device_id);
}

#[test]
fn marks_device_offline_after_timeout() {
    let mut registry = DeviceRegistry::default();
    registry.upsert(
        DeviceAnnouncement {
            device_id: "device-a".into(),
            nickname: "Alice".into(),
            host_name: "alice-pc".into(),
            ip_addr: "192.168.1.10".into(),
            message_port: 37001,
            file_port: 37002,
            status_message: None,
        },
        1000,
    );

    registry.prune_stale(7000, 5000);

    assert!(registry.online_devices().is_empty());
}

#[test]
fn app_state_tracks_devices_from_runtime_announcements() {
    let state = AppState::default();

    let devices = state.upsert_device(
        DeviceAnnouncement {
            device_id: "device-runtime".into(),
            nickname: "Runtime".into(),
            host_name: "runtime-pc".into(),
            ip_addr: "192.168.1.20".into(),
            message_port: 37001,
            file_port: 37002,
            status_message: None,
        },
        2000,
    );

    assert_eq!(devices.len(), 1);
    assert_eq!(devices[0].nickname, "Runtime");

    let devices = state.prune_devices(9000, 5000);
    assert!(devices.is_empty());
}
