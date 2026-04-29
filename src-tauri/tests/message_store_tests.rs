use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use feiq_lan_tool_lib::message_store::ChatMessageStore;
use feiq_lan_tool_lib::models::{
    ChatDelivery,
    ChatMessage,
    DeliveryEntry,
    DeliveryEntryKind,
    DeliveryStatus,
};

#[test]
fn message_store_roundtrip_preserves_direct_message() {
    let path = temp_db_path();
    let store = ChatMessageStore::open(&path).expect("open store");
    let message = ChatMessage {
        message_id: "msg-1".into(),
        from_device_id: "device-a".into(),
        to_device_id: "local-device".into(),
        content: "hello sqlite".into(),
        sent_at_ms: 1_712_000_001,
        kind: "direct".into(),
        delivery: None,
    };

    store.upsert_message(&message).expect("save message");

    let loaded = store.list_messages().expect("load messages");
    assert_eq!(loaded, vec![message]);

    fs::remove_file(path).expect("cleanup db");
}

#[test]
fn message_store_upsert_replaces_existing_delivery_message() {
    let path = temp_db_path();
    let store = ChatMessageStore::open(&path).expect("open store");
    let pending = ChatMessage {
        message_id: "req-1".into(),
        from_device_id: "device-a".into(),
        to_device_id: "local-device".into(),
        content: "delivery request".into(),
        sent_at_ms: 1_712_000_002,
        kind: "delivery".into(),
        delivery: Some(ChatDelivery {
            request_id: "req-1".into(),
            status: DeliveryStatus::PendingDecision,
            entries: vec![DeliveryEntry {
                entry_id: "entry-1".into(),
                display_name: "报价单.xlsx".into(),
                relative_path: "报价单.xlsx".into(),
                file_size: 1024,
                kind: DeliveryEntryKind::File,
            }],
            save_root: None,
        }),
    };
    let accepted = ChatMessage {
        delivery: Some(ChatDelivery {
            status: DeliveryStatus::Accepted,
            save_root: Some("D:/接收区".into()),
            ..pending.delivery.clone().expect("delivery")
        }),
        ..pending.clone()
    };

    store.upsert_message(&pending).expect("save pending");
    store.upsert_message(&accepted).expect("save accepted");

    let loaded = store.list_messages().expect("load messages");
    assert_eq!(loaded, vec![accepted]);

    fs::remove_file(path).expect("cleanup db");
}

fn temp_db_path() -> PathBuf {
    let mut path = std::env::temp_dir();
    let suffix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time")
        .as_nanos();
    path.push(format!("feiq-message-store-{suffix}.db"));
    path
}
