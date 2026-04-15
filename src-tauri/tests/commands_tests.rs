use feiq_lan_tool_lib::app_state::AppState;
use feiq_lan_tool_lib::models::{DeviceAnnouncement, TransferStatus, TransferTask};

#[test]
fn state_helpers_return_empty_lists_by_default() {
    let state = AppState::default();

    assert!(state.list_devices().is_empty());
    assert!(state.list_transfers().is_empty());
}

#[test]
fn state_helpers_return_devices_and_transfers() {
    let state = AppState::default();
    state
        .registry
        .write()
        .expect("registry write lock")
        .upsert(
            DeviceAnnouncement {
                device_id: "device-a".into(),
                nickname: "Alice".into(),
                host_name: "alice-pc".into(),
                ip_addr: "192.168.1.10".into(),
                message_port: 37001,
                file_port: 37002,
            },
            1000,
        );
    state
        .transfers
        .write()
        .expect("transfers write lock")
        .push(TransferTask {
            transfer_id: "tx-1".into(),
            file_name: "demo.txt".into(),
            file_size: 12,
            from_device_id: "device-a".into(),
            to_device_id: "device-b".into(),
            status: TransferStatus::InProgress,
        });

    let devices = state.list_devices();
    let transfers = state.list_transfers();

    assert_eq!(devices.len(), 1);
    assert_eq!(devices[0].device_id, "device-a");
    assert_eq!(transfers.len(), 1);
    assert_eq!(transfers[0].transfer_id, "tx-1");
}
