use feiq_lan_tool_lib::app_state::AppState;
use feiq_lan_tool_lib::models::{
    AppPreferences,
    ChatDelivery,
    ChatMessage,
    CloseAction,
    DeviceNameMode,
    DeliveryStatus,
    DeviceAnnouncement,
    IdentityPreferences,
    TransferStatus,
    TransferTask,
};

#[test]
fn state_helpers_return_empty_lists_by_default() {
    let state = AppState::default();

    assert!(state.list_devices().is_empty());
    assert!(state.list_messages().is_empty());
    assert!(state.list_transfers().is_empty());
}

#[test]
fn state_helpers_return_devices_and_transfers() {
    let state = AppState::default();
    state.registry.write().expect("registry write lock").upsert(
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
    state
        .transfers
        .write()
        .expect("transfers write lock")
        .push(TransferTask {
            transfer_id: "tx-1".into(),
            file_name: "demo.txt".into(),
            file_size: 12,
            transferred_bytes: 6,
            from_device_id: "device-a".into(),
            to_device_id: "device-b".into(),
            status: TransferStatus::InProgress,
        });
    state.push_message(ChatMessage {
        message_id: "msg-1".into(),
        from_device_id: "device-b".into(),
        to_device_id: "device-a".into(),
        content: "hello".into(),
        sent_at_ms: 1002,
        kind: "direct".into(),
        delivery: None,
    });

    let devices = state.list_devices();
    let messages = state.list_messages();
    let transfers = state.list_transfers();

    assert_eq!(devices.len(), 1);
    assert_eq!(devices[0].device_id, "device-a");
    assert_eq!(messages.len(), 1);
    assert_eq!(messages[0].content, "hello");
    assert_eq!(transfers.len(), 1);
    assert_eq!(transfers[0].transfer_id, "tx-1");
}

#[test]
fn app_state_can_update_delivery_message_status() {
    let state = AppState::default();
    state.push_message(ChatMessage {
        message_id: "msg-delivery-1".into(),
        from_device_id: "device-a".into(),
        to_device_id: "device-b".into(),
        content: "delivery request".into(),
        sent_at_ms: 1002,
        kind: "delivery".into(),
        delivery: Some(ChatDelivery {
            request_id: "req-1".into(),
            status: DeliveryStatus::PendingDecision,
            entries: vec![],
            save_root: None,
        }),
    });

    state.update_delivery_status("req-1", DeliveryStatus::Accepted, Some("D:/接收区".into()));

    let messages = state.list_messages();
    let delivery = messages[0].delivery.as_ref().expect("delivery");
    assert_eq!(delivery.status, DeliveryStatus::Accepted);
    assert_eq!(delivery.save_root.as_deref(), Some("D:/接收区"));
}

#[test]
fn state_exposes_snapshot_with_runtime_values() {
    let state = AppState::default();
    let snapshot = state.settings_snapshot();

    assert_eq!(snapshot.runtime.message_port, 37001);
    assert_eq!(snapshot.runtime.file_port, 37002);
    assert_eq!(snapshot.preferences.identity.nickname, snapshot.runtime.device_id);
}

#[test]
fn sync_settings_updates_structured_preferences() {
    let state = AppState::default();
    let next = AppPreferences {
        identity: IdentityPreferences {
            nickname: "局域网助手".into(),
            device_name_mode: DeviceNameMode::NicknameWithDeviceName,
            status_message: "忙碌".into(),
        },
        ..AppPreferences::default()
    };

    state.update_preferences(next.clone());

    assert_eq!(state.settings_snapshot().preferences, next);
}

#[test]
fn state_snapshot_contains_display_preferences() {
    let state = AppState::default();
    let snapshot = state.settings_snapshot();

    assert!(snapshot.preferences.display.tray_enabled);
    assert_eq!(
        snapshot.preferences.display.close_action,
        CloseAction::MinimizeToTray
    );
}
