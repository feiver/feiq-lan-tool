use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use crate::models::RuntimeSettings;

pub fn load_settings() -> io::Result<Option<RuntimeSettings>> {
    load_settings_from_path(&default_settings_path())
}

pub fn save_settings(settings: &RuntimeSettings) -> io::Result<()> {
    save_settings_to_path(&default_settings_path(), settings)
}

pub fn load_settings_from_path(path: &Path) -> io::Result<Option<RuntimeSettings>> {
    if !path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(path)?;
    let settings = serde_json::from_str(&content)
        .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;
    Ok(Some(settings))
}

pub fn save_settings_to_path(path: &Path, settings: &RuntimeSettings) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let content = serde_json::to_string_pretty(settings)
        .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;
    fs::write(path, content)
}

fn default_settings_path() -> PathBuf {
    home_dir().join(".feiq-lan-tool").join("settings.json")
}

fn home_dir() -> PathBuf {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
}
