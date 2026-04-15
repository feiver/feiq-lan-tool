use std::fs::File;
use std::io::{self, Read, Write};
use std::net::TcpStream;
use std::path::Path;
use std::path::PathBuf;

use crate::models::{FileOffer, TransferStatus, TransferTask};

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

pub async fn send_file_with_offer(addr: &str, file_path: &Path, offer: &FileOffer) -> io::Result<u64> {
    send_file_with_offer_and_progress(addr, file_path, offer, &mut empty_transfer_task(), |_| {}).await
}

pub async fn send_file_with_offer_and_progress(
    addr: &str,
    file_path: &Path,
    offer: &FileOffer,
    task: &mut TransferTask,
    mut on_progress: impl FnMut(&TransferTask),
) -> io::Result<u64> {
    let mut file = File::open(file_path)?;
    let mut stream = TcpStream::connect(addr)?;
    write_file_offer(&mut stream, offer)?;
    task.status = TransferStatus::InProgress;
    on_progress(task);
    let sent = copy_bytes(&mut file, &mut stream, Some(&mut |transferred| {
        task.transferred_bytes = transferred;
        on_progress(task);
    }))?;
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

pub fn build_delivery_output_path(save_root: &Path, relative_path: &str) -> PathBuf {
    relative_path
        .split('/')
        .filter(|segment| !segment.is_empty())
        .fold(save_root.to_path_buf(), |path, segment| path.join(segment))
}

pub fn read_file_offer(reader: &mut impl Read) -> io::Result<FileOffer> {
    let mut len_bytes = [0_u8; 8];
    reader.read_exact(&mut len_bytes)?;
    let len = u64::from_be_bytes(len_bytes) as usize;
    let mut payload = vec![0_u8; len];
    reader.read_exact(&mut payload)?;

    serde_json::from_slice(&payload)
        .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))
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

fn write_file_offer(writer: &mut impl Write, offer: &FileOffer) -> io::Result<()> {
    let payload = serde_json::to_vec(offer)
        .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;
    writer.write_all(&(payload.len() as u64).to_be_bytes())?;
    writer.write_all(&payload)?;
    Ok(())
}

fn copy_bytes(
    reader: &mut impl Read,
    writer: &mut impl Write,
    mut on_chunk: Option<&mut dyn FnMut(u64)>,
) -> io::Result<u64> {
    let mut buffer = [0_u8; 8192];
    let mut transferred = 0_u64;

    loop {
        let bytes_read = reader.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }

        writer.write_all(&buffer[..bytes_read])?;
        transferred += bytes_read as u64;
        if let Some(callback) = on_chunk.as_deref_mut() {
            callback(transferred);
        }
    }

    Ok(transferred)
}
