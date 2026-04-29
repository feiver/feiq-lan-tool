use crate::app_state::AppState;
use crate::models::{ChatDelivery, ChatMessage, DeliveryStatus, LanEvent, MessagePayload};

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
            state.upsert_message(message.clone());
            Some(message)
        }
        LanEvent::DeviceAnnouncement(_) | LanEvent::DiscoveryProbe(_) => None,
        LanEvent::DeliveryRequest(request) => {
            let message = ChatMessage {
                message_id: request.request_id.clone(),
                from_device_id: request.from_device_id,
                to_device_id: request.to_device_id,
                content: "delivery request".into(),
                sent_at_ms: request.sent_at_ms,
                kind: "delivery".into(),
                delivery: Some(ChatDelivery {
                    request_id: request.request_id,
                    status: DeliveryStatus::PendingDecision,
                    entries: request.entries,
                    save_root: None,
                }),
            };
            state.upsert_message(message.clone());
            Some(message)
        }
        LanEvent::DeliveryResponse(response) => state.update_delivery_status(
            &response.request_id,
            match response.decision {
                crate::models::DeliveryDecision::Accepted => DeliveryStatus::Accepted,
                crate::models::DeliveryDecision::Rejected => DeliveryStatus::Rejected,
            },
            response.save_root,
        ),
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
        delivery: None,
    }
}
