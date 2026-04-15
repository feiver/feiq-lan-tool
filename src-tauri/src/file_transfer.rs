use std::fs::File;
use std::io::{self, Read, Write};
use std::net::TcpStream;
use std::path::Path;

use crate::models::{TransferStatus, TransferTask};

pub async fn send_file(addr: &str, file_path: &Path) -> io::Result<u64> {
    send_file_with_progress(addr, file_path, &mut empty_transfer_task(), |_| {}).await
}

pub async fn send_file_with_progress(
    addr: &str,
    file_path: &Path,
    task: &mut TransferTask,
    mut on_progress: impl FnMut(&TransferTask),
) -> io::Result<u64> {
    let mut file = File::open(file_path)?;
    let mut stream = TcpStream::connect(addr)?;
    let mut buffer = [0_u8; 8192];
    let mut sent = 0_u64;

    task.status = TransferStatus::InProgress;
    on_progress(task);

    loop {
        let bytes_read = file.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }

        stream.write_all(&buffer[..bytes_read])?;
        sent += bytes_read as u64;
        task.transferred_bytes = sent;
        on_progress(task);
    }

    task.status = TransferStatus::Completed;
    on_progress(task);

    Ok(sent)
}

pub fn receive_file(
    reader: &mut impl Read,
    file_path: &Path,
    task: &mut TransferTask,
    mut on_progress: impl FnMut(&TransferTask),
) -> io::Result<u64> {
    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let mut file = File::create(file_path)?;
    let mut buffer = [0_u8; 8192];
    let mut received = 0_u64;

    task.status = TransferStatus::InProgress;
    on_progress(task);

    loop {
        let bytes_read = reader.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }

        file.write_all(&buffer[..bytes_read])?;
        received += bytes_read as u64;
        task.transferred_bytes = received;
        on_progress(task);
    }

    task.status = TransferStatus::Completed;
    on_progress(task);

    Ok(received)
}

pub fn mark_transfer_status(task: &mut TransferTask, status: TransferStatus) {
    task.status = status;
}

fn empty_transfer_task() -> TransferTask {
    TransferTask {
        transfer_id: String::new(),
        file_name: String::new(),
        file_size: 0,
        transferred_bytes: 0,
        from_device_id: String::new(),
        to_device_id: String::new(),
        status: TransferStatus::Pending,
    }
}
