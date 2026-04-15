use crate::app_state::AppState;
use crate::models::{ChatMessage, LanEvent, MessagePayload};

pub const CHAT_MESSAGE_RECEIVED_EVENT: &str = "chat-message-received";

pub fn record_incoming_message(state: &AppState, event: LanEvent) -> Option<ChatMessage> {
    match event {
        LanEvent::DirectMessage(payload) => {
            let message = chat_message_from_payload(payload, "direct");
            state.push_message(message.clone());
            Some(message)
        }
        LanEvent::BroadcastMessage(payload) => {
            let message = chat_message_from_payload(payload, "broadcast");
            state.push_message(message.clone());
            Some(message)
        }
        LanEvent::DeviceAnnouncement(_) => None,
    }
}

fn chat_message_from_payload(payload: MessagePayload, kind: &str) -> ChatMessage {
    ChatMessage {
        message_id: payload.message_id,
        from_device_id: payload.from_device_id,
        to_device_id: payload.to_device_id,
        content: payload.content,
        sent_at_ms: payload.sent_at_ms,
        kind: kind.into(),
    }
}
