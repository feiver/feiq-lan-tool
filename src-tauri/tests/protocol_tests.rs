#[path = "../src/models.rs"]
mod models;
#[path = "../src/protocol.rs"]
mod protocol;

use models::{DeviceAnnouncement, LanEvent, MessagePayload};
use protocol::{decode_event, encode_event};

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
