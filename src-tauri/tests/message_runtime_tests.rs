use feiq_lan_tool_lib::app_state::AppState;
use feiq_lan_tool_lib::message_runtime::record_incoming_message;
use feiq_lan_tool_lib::models::{
    ChatDelivery,
    ChatMessage,
    DeliveryDecision,
    DeliveryEntry,
    DeliveryEntryKind,
    DeliveryRequest,
    DeliveryResponse,
    DeliveryStatus,
    LanEvent,
    MessagePayload,
};

#[test]
fn record_incoming_message_persists_direct_message() {
    let state = AppState::default();
    let payload = MessagePayload {
        message_id: "msg-runtime-1".into(),
        from_device_id: "device-a".into(),
        to_device_id: "local-device".into(),
        content: "hello from runtime".into(),
        sent_at_ms: 1_712_000_100,
    };

    let message = record_incoming_message(&state, LanEvent::DirectMessage(payload.clone()))
        .expect("should create chat message");

    assert_eq!(message.message_id, payload.message_id);
    assert_eq!(message.from_device_id, payload.from_device_id);
    assert_eq!(message.to_device_id, payload.to_device_id);
    assert_eq!(message.content, payload.content);
    assert_eq!(message.kind, "direct");

    let history = state.list_messages();
    assert_eq!(history.len(), 1);
    assert_eq!(history[0], message);
}

#[test]
fn record_incoming_delivery_request_persists_pending_message() {
    let state = AppState::default();

    let message = record_incoming_message(
        &state,
        LanEvent::DeliveryRequest(DeliveryRequest {
            request_id: "req-1".into(),
            from_device_id: "device-a".into(),
            to_device_id: "local-device".into(),
            sent_at_ms: 1002,
            entries: vec![DeliveryEntry {
                entry_id: "entry-file".into(),
                display_name: "报价单.xlsx".into(),
                relative_path: "报价单.xlsx".into(),
                file_size: 1024,
                kind: DeliveryEntryKind::File,
            }],
        }),
    )
    .expect("message");

    assert_eq!(message.kind, "delivery");
    assert_eq!(
        message.delivery.expect("delivery").status,
        DeliveryStatus::PendingDecision
    );
}

#[test]
fn record_incoming_delivery_response_updates_existing_message() {
    let state = AppState::default();
    state.push_message(ChatMessage {
        message_id: "req-1".into(),
        from_device_id: "local-device".into(),
        to_device_id: "device-a".into(),
        content: "待投递内容：1 个文件".into(),
        sent_at_ms: 1001,
        kind: "delivery".into(),
        delivery: Some(ChatDelivery {
            request_id: "req-1".into(),
            status: DeliveryStatus::PendingDecision,
            entries: vec![DeliveryEntry {
                entry_id: "entry-file".into(),
                display_name: "报价单.xlsx".into(),
                relative_path: "报价单.xlsx".into(),
                file_size: 1024,
                kind: DeliveryEntryKind::File,
            }],
            save_root: None,
        }),
    });

    let updated = record_incoming_message(
        &state,
        LanEvent::DeliveryResponse(DeliveryResponse {
            request_id: "req-1".into(),
            from_device_id: "device-a".into(),
            to_device_id: "local-device".into(),
            decision: DeliveryDecision::Accepted,
            save_root: Some("D:/接收区".into()),
        }),
    )
    .expect("updated message");

    let delivery = updated.delivery.expect("delivery");
    assert_eq!(delivery.status, DeliveryStatus::Accepted);
    assert_eq!(delivery.save_root.as_deref(), Some("D:/接收区"));
    assert_eq!(state.list_messages().len(), 1);
}
