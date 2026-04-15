use std::io::{self, Read, Write};
use std::net::TcpStream;

use serde::{Deserialize, Serialize};

use crate::models::{LanEvent, MessagePayload};
use crate::protocol::{decode_event, encode_event};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MessageEnvelope {
    pub message_id: String,
    pub from_device_id: String,
    pub to_device_id: String,
    pub content: String,
    pub sent_at_ms: i64,
}

pub async fn send_message(addr: &str, payload: MessagePayload) -> io::Result<()> {
    send_event(addr, LanEvent::DirectMessage(payload)).await
}

pub async fn send_broadcast(addr: &str, payload: MessagePayload) -> io::Result<()> {
    send_event(addr, LanEvent::BroadcastMessage(payload)).await
}

async fn send_event(addr: &str, event: LanEvent) -> io::Result<()> {
    let mut stream = TcpStream::connect(addr)?;
    let bytes =
        encode_event(&event).map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;
    stream.write_all(&bytes)?;
    Ok(())
}

pub fn read_event(reader: &mut impl Read) -> io::Result<LanEvent> {
    let mut bytes = Vec::new();
    reader.read_to_end(&mut bytes)?;

    decode_event(&bytes).map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))
}
