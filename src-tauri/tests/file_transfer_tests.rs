use std::fs;
use std::io::Cursor;
use std::io::Read;
use std::net::TcpListener;
use std::path::PathBuf;
use std::pin::pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

use feiq_lan_tool_lib::file_transfer::{
    read_file_offer,
    mark_transfer_status,
    receive_file,
    send_file,
    send_file_with_progress,
    send_file_with_offer,
};
use feiq_lan_tool_lib::models::{FileOffer, TransferStatus, TransferTask};

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

fn temp_file_path() -> PathBuf {
    let mut path = std::env::temp_dir();
    let suffix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time")
        .as_nanos();
    path.push(format!("feiq-transfer-{suffix}.bin"));
    path
}

#[test]
fn mark_transfer_status_updates_task_state() {
    let mut task = TransferTask {
        transfer_id: "tx-1".into(),
        file_name: "demo.txt".into(),
        file_size: 12,
        transferred_bytes: 0,
        from_device_id: "device-a".into(),
        to_device_id: "device-b".into(),
        status: TransferStatus::Pending,
    };

    mark_transfer_status(&mut task, TransferStatus::Completed);

    assert_eq!(task.status, TransferStatus::Completed);
}

#[test]
fn send_file_streams_bytes_to_tcp_peer() {
    let path = temp_file_path();
    let content = b"hello file transfer".to_vec();
    fs::write(&path, &content).expect("write temp file");

    let listener = TcpListener::bind("127.0.0.1:0").expect("bind listener");
    let addr = listener.local_addr().expect("listener addr");

    let server = thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("accept connection");
        let mut bytes = Vec::new();
        stream.read_to_end(&mut bytes).expect("read bytes");
        bytes
    });

    let sent = block_on_ready(send_file(&addr.to_string(), &path)).expect("send file");
    let received = server.join().expect("join server thread");

    assert_eq!(sent, content.len() as u64);
    assert_eq!(received, content);

    fs::remove_file(path).expect("cleanup temp file");
}

#[test]
fn receive_file_writes_bytes_and_updates_transfer_snapshots() {
    let path = temp_file_path();
    let content = b"incoming file transfer".to_vec();
    let mut reader = Cursor::new(content.clone());
    let mut task = TransferTask {
        transfer_id: "tx-recv-1".into(),
        file_name: "incoming.bin".into(),
        file_size: content.len() as u64,
        transferred_bytes: 0,
        from_device_id: "device-a".into(),
        to_device_id: "local-device".into(),
        status: TransferStatus::Pending,
    };
    let mut snapshots = Vec::new();

    let received = receive_file(&mut reader, &path, &mut task, |snapshot| {
        snapshots.push(snapshot.clone());
    })
    .expect("receive file");

    let written = fs::read(&path).expect("read received file");

    assert_eq!(received, content.len() as u64);
    assert_eq!(written, content);
    assert_eq!(task.transferred_bytes, content.len() as u64);
    assert_eq!(task.status, TransferStatus::Completed);
    assert!(!snapshots.is_empty());
    assert_eq!(snapshots.last().expect("last snapshot").status, TransferStatus::Completed);

    fs::remove_file(path).expect("cleanup temp file");
}

#[test]
fn send_file_with_progress_updates_transfer_snapshots() {
    let path = temp_file_path();
    let content = b"send with progress".to_vec();
    fs::write(&path, &content).expect("write temp file");

    let listener = TcpListener::bind("127.0.0.1:0").expect("bind listener");
    let addr = listener.local_addr().expect("listener addr");
    let mut task = TransferTask {
        transfer_id: "tx-send-1".into(),
        file_name: "demo.txt".into(),
        file_size: content.len() as u64,
        transferred_bytes: 0,
        from_device_id: "local-device".into(),
        to_device_id: "device-a".into(),
        status: TransferStatus::Pending,
    };
    let mut snapshots = Vec::new();

    let server = thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("accept connection");
        let mut bytes = Vec::new();
        stream.read_to_end(&mut bytes).expect("read bytes");
        bytes
    });

    let sent = block_on_ready(send_file_with_progress(
        &addr.to_string(),
        &path,
        &mut task,
        |snapshot| snapshots.push(snapshot.clone()),
    ))
    .expect("send file with progress");
    let received = server.join().expect("join server thread");

    assert_eq!(sent, content.len() as u64);
    assert_eq!(received, content);
    assert_eq!(task.transferred_bytes, content.len() as u64);
    assert_eq!(task.status, TransferStatus::Completed);
    assert!(!snapshots.is_empty());
    assert_eq!(snapshots.last().expect("last snapshot").status, TransferStatus::Completed);

    fs::remove_file(path).expect("cleanup temp file");
}

#[test]
fn send_file_with_offer_writes_metadata_before_file_bytes() {
    let path = temp_file_path();
    let content = b"send file with offer".to_vec();
    fs::write(&path, &content).expect("write temp file");

    let listener = TcpListener::bind("127.0.0.1:0").expect("bind listener");
    let addr = listener.local_addr().expect("listener addr");
    let offer = FileOffer {
        transfer_id: "tx-offer-1".into(),
        file_name: "offer-demo.txt".into(),
        file_size: content.len() as u64,
        from_device_id: "local-device".into(),
        to_device_id: "device-a".into(),
    };

    let server = thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("accept connection");
        let received_offer = read_file_offer(&mut stream).expect("read file offer");
        let mut bytes = Vec::new();
        stream.read_to_end(&mut bytes).expect("read bytes");
        (received_offer, bytes)
    });

    let sent = block_on_ready(send_file_with_offer(&addr.to_string(), &path, &offer))
        .expect("send file with offer");
    let (received_offer, received_bytes) = server.join().expect("join server thread");

    assert_eq!(sent, content.len() as u64);
    assert_eq!(received_offer, offer);
    assert_eq!(received_bytes, content);

    fs::remove_file(path).expect("cleanup temp file");
}
