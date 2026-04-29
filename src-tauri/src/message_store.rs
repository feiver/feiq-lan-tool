use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use rusqlite::{params, Connection};

use crate::models::ChatMessage;

const CREATE_MESSAGES_TABLE_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS chat_messages (
  message_id TEXT PRIMARY KEY,
  sent_at_ms INTEGER NOT NULL,
  payload_json TEXT NOT NULL
)
"#;

#[derive(Debug, Clone)]
pub struct ChatMessageStore {
    path: PathBuf,
}

impl ChatMessageStore {
    pub fn open(path: &Path) -> io::Result<Self> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        let store = Self {
            path: path.to_path_buf(),
        };
        store.init_schema()?;
        Ok(store)
    }

    pub fn open_default() -> io::Result<Self> {
        Self::open(&default_message_store_path())
    }

    pub fn list_messages(&self) -> io::Result<Vec<ChatMessage>> {
        let connection = self.connect()?;
        let mut statement = connection
            .prepare(
                "SELECT payload_json FROM chat_messages ORDER BY sent_at_ms ASC, rowid ASC",
            )
            .map_err(to_io_error)?;
        let rows = statement
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(to_io_error)?;

        let mut messages = Vec::new();
        for row in rows {
            let payload = row.map_err(to_io_error)?;
            let message = serde_json::from_str(&payload)
                .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;
            messages.push(message);
        }

        Ok(messages)
    }

    pub fn upsert_message(&self, message: &ChatMessage) -> io::Result<()> {
        let connection = self.connect()?;
        let payload_json = serde_json::to_string(message)
            .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;

        connection
            .execute(
                r#"
                INSERT INTO chat_messages (message_id, sent_at_ms, payload_json)
                VALUES (?1, ?2, ?3)
                ON CONFLICT(message_id) DO UPDATE SET
                  sent_at_ms = excluded.sent_at_ms,
                  payload_json = excluded.payload_json
                "#,
                params![message.message_id, message.sent_at_ms, payload_json],
            )
            .map_err(to_io_error)?;

        Ok(())
    }

    fn init_schema(&self) -> io::Result<()> {
        let connection = self.connect()?;
        connection
            .execute_batch(CREATE_MESSAGES_TABLE_SQL)
            .map_err(to_io_error)
    }

    fn connect(&self) -> io::Result<Connection> {
        Connection::open(&self.path).map_err(to_io_error)
    }
}

fn default_message_store_path() -> PathBuf {
    home_dir().join(".feiq-lan-tool").join("messages.db")
}

fn home_dir() -> PathBuf {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
}

fn to_io_error(err: rusqlite::Error) -> io::Error {
    io::Error::other(err)
}
