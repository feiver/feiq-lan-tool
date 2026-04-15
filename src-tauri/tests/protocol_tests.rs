use feiq_lan_tool_lib::models::{
    DeliveryDecision,
    DeliveryEntry,
    DeliveryEntryKind,
    DeliveryRequest,
    DeliveryResponse,
    DeviceAnnouncement,
    LanEvent,
    MessagePayload,
};
use feiq_lan_tool_lib::protocol::{decode_event, encode_event};

#[test]
fn protocol_roundtrip_for_device_announcement() {
    let event = LanEvent::DeviceAnnouncement(DeviceAnnouncement {
        device_id: "device-a".into(),
        nickname: "Alice".into(),
        host_name: "alice-pc".into(),
        ip_addr: "192.168.1.10".into(),
        message_port: 37001,
        file_port: 37002,
    });

    let bytes = encode_event(&event).expect("encode");
    let decoded = decode_event(&bytes).expect("decode");

    assert_eq!(decoded, event);
}

#[test]
fn protocol_roundtrip_for_message_payload() {
    let event = LanEvent::DirectMessage(MessagePayload {
        message_id: "msg-1".into(),
        from_device_id: "device-a".into(),
        to_device_id: "device-b".into(),
        content: "hello".into(),
        sent_at_ms: 1_712_000_000,
    });

    let bytes = encode_event(&event).expect("encode");
    let decoded = decode_event(&bytes).expect("decode");

    assert_eq!(decoded, event);
}

#[test]
fn protocol_roundtrip_for_broadcast_message() {
    let event = LanEvent::BroadcastMessage(MessagePayload {
        message_id: "msg-broadcast".into(),
        from_device_id: "device-a".into(),
        to_device_id: "*".into(),
        content: "hello everyone".into(),
        sent_at_ms: 1_712_000_100,
    });

    let bytes = encode_event(&event).expect("encode");
    let decoded = decode_event(&bytes).expect("decode");

    assert_eq!(decoded, event);
}

#[test]
fn protocol_roundtrip_for_delivery_request() {
    let event = LanEvent::DeliveryRequest(DeliveryRequest {
        request_id: "req-1".into(),
        from_device_id: "device-a".into(),
        to_device_id: "device-b".into(),
        sent_at_ms: 1_712_000_200,
        entries: vec![DeliveryEntry {
            entry_id: "entry-file".into(),
            display_name: "报价单.xlsx".into(),
            relative_path: "报价单.xlsx".into(),
            file_size: 1024,
            kind: DeliveryEntryKind::File,
        }],
    });

    let bytes = encode_event(&event).expect("encode");
    let decoded = decode_event(&bytes).expect("decode");

    assert_eq!(decoded, event);
}

#[test]
fn protocol_roundtrip_for_delivery_response() {
    let event = LanEvent::DeliveryResponse(DeliveryResponse {
        request_id: "req-1".into(),
        from_device_id: "device-b".into(),
        to_device_id: "device-a".into(),
        decision: DeliveryDecision::Accepted,
        save_root: Some("D:/接收区".into()),
    });

    let bytes = encode_event(&event).expect("encode");
    let decoded = decode_event(&bytes).expect("decode");

    assert_eq!(decoded, event);
}
