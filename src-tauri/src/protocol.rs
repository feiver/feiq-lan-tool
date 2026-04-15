use crate::models::LanEvent;

pub fn encode_event(event: &LanEvent) -> Result<Vec<u8>, serde_json::Error> {
    serde_json::to_vec(event)
}

pub fn decode_event(bytes: &[u8]) -> Result<LanEvent, serde_json::Error> {
    serde_json::from_slice(bytes)
}
