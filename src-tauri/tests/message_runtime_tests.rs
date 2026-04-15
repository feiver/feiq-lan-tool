use feiq_lan_tool_lib::app_state::AppState;
use feiq_lan_tool_lib::message_runtime::record_incoming_message;
use feiq_lan_tool_lib::models::{LanEvent, MessagePayload};

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
