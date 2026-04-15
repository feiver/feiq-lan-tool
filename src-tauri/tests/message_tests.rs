use std::io::Read;
use std::net::TcpListener;
use std::pin::pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
use std::thread;

use feiq_lan_tool_lib::message_server::{send_message, MessageEnvelope};
use feiq_lan_tool_lib::models::{LanEvent, MessagePayload};
use feiq_lan_tool_lib::protocol::decode_event;

struct NoopWake;

impl Wake for NoopWake {
    fn wake(self: Arc<Self>) {}
}

fn block_on_ready<F>(future: F) -> F::Output
where
    F: std::future::Future,
{
    let waker = Waker::from(Arc::new(NoopWake));
    let mut context = Context::from_waker(&waker);
    let mut future = pin!(future);

    match future.as_mut().poll(&mut context) {
        Poll::Ready(value) => value,
        Poll::Pending => panic!("future unexpectedly pending"),
    }
}

#[test]
fn message_envelope_keeps_delivery_metadata() {
    let envelope = MessageEnvelope {
        message_id: "msg-1".into(),
        from_device_id: "device-a".into(),
        to_device_id: "device-b".into(),
        content: "hello".into(),
        sent_at_ms: 1_712_000_000,
    };

    assert_eq!(envelope.message_id, "msg-1");
    assert_eq!(envelope.content, "hello");
}

#[test]
fn send_message_writes_direct_message_event_to_tcp_stream() {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind listener");
    let addr = listener.local_addr().expect("listener addr");
    let payload = MessagePayload {
        message_id: "msg-2".into(),
        from_device_id: "device-a".into(),
        to_device_id: "device-b".into(),
        content: "ping".into(),
        sent_at_ms: 1_712_000_001,
    };
    let expected_payload = payload.clone();

    let server = thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("accept connection");
        let mut bytes = Vec::new();
        stream.read_to_end(&mut bytes).expect("read bytes");
        bytes
    });

    block_on_ready(send_message(&addr.to_string(), payload)).expect("send message");

    let bytes = server.join().expect("join server thread");
    let event = decode_event(&bytes).expect("decode event");

    assert_eq!(event, LanEvent::DirectMessage(expected_payload));
}
