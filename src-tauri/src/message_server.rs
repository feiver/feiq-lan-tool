use std::io::{self, Write};
use std::net::TcpStream;

use serde::{Deserialize, Serialize};

use crate::models::{LanEvent, MessagePayload};
use crate::protocol::encode_event;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MessageEnvelope {
    pub message_id: String,
    pub from_device_id: String,
    pub to_device_id: String,
    pub content: String,
    pub sent_at_ms: i64,
}

pub async fn send_message(addr: &str, payload: MessagePayload) -> io::Result<()> {
    let mut stream = TcpStream::connect(addr)?;
    let bytes = encode_event(&LanEvent::DirectMessage(payload))
        .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;
    stream.write_all(&bytes)?;
    Ok(())
}
