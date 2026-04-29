use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use serde::Deserialize;

use crate::models::{
    AppPreferences,
    ChatPreferences,
    DiscoveryRefreshHistoryEntry,
    DisplayPreferences,
    IdentityPreferences,
    NetworkPreferences,
    RuntimeSettings,
    TransferPreferences,
};

pub fn load_preferences() -> io::Result<Option<AppPreferences>> {
    load_settings_from_path(&default_settings_path())
}

pub fn save_preferences(settings: &AppPreferences) -> io::Result<()> {
    save_settings_to_path(&default_settings_path(), settings)
}

pub fn load_settings() -> io::Result<Option<RuntimeSettings>> {
    load_preferences().map(|settings| settings.map(RuntimeSettings::from))
}

pub fn save_settings(settings: &RuntimeSettings) -> io::Result<()> {
    save_preferences(&AppPreferences::from(settings))
}

pub fn load_discovery_refresh_history() -> io::Result<Vec<DiscoveryRefreshHistoryEntry>> {
    load_discovery_refresh_history_from_path(&default_discovery_refresh_history_path())
}

pub fn save_discovery_refresh_history(entries: &[DiscoveryRefreshHistoryEntry]) -> io::Result<()> {
    save_discovery_refresh_history_to_path(&default_discovery_refresh_history_path(), entries)
}

pub fn load_settings_from_path(path: &Path) -> io::Result<Option<AppPreferences>> {
    if !path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(path)?;
    let settings: PersistedSettings = serde_json::from_str(&content)
        .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;
    Ok(Some(match settings {
        PersistedSettings::Structured(preferences) => preferences,
        PersistedSettings::Legacy(settings) => settings.into(),
    }))
}

pub fn save_settings_to_path(path: &Path, settings: &AppPreferences) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let content = serde_json::to_string_pretty(settings)
        .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;
    fs::write(path, content)
}

pub fn load_discovery_refresh_history_from_path(
    path: &Path,
) -> io::Result<Vec<DiscoveryRefreshHistoryEntry>> {
    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(path)?;
    let entries: Vec<DiscoveryRefreshHistoryEntry> =
        serde_json::from_str(&content).map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;
    Ok(entries.into_iter().take(5).collect())
}

pub fn save_discovery_refresh_history_to_path(
    path: &Path,
    entries: &[DiscoveryRefreshHistoryEntry],
) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let content = serde_json::to_string_pretty(
        &entries.iter().take(5).cloned().collect::<Vec<_>>(),
    )
        .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;
    fs::write(path, content)
}

fn default_settings_path() -> PathBuf {
    home_dir().join(".feiq-lan-tool").join("settings.json")
}

fn default_discovery_refresh_history_path() -> PathBuf {
    home_dir()
        .join(".feiq-lan-tool")
        .join("discovery-refresh-history.json")
}

fn home_dir() -> PathBuf {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum PersistedSettings {
    Structured(AppPreferences),
    Legacy(LegacyRuntimeSettings),
}

#[derive(Debug, Deserialize)]
struct LegacyRuntimeSettings {
    #[allow(dead_code)]
    device_id: Option<String>,
    nickname: String,
    download_dir: String,
}

impl From<LegacyRuntimeSettings> for AppPreferences {
    fn from(value: LegacyRuntimeSettings) -> Self {
        AppPreferences {
            identity: IdentityPreferences {
                nickname: value.nickname,
                ..IdentityPreferences::default()
            },
            chat: ChatPreferences::default(),
            transfer: TransferPreferences {
                download_dir: value.download_dir,
                ..TransferPreferences::default()
            },
            network: NetworkPreferences::default(),
            display: DisplayPreferences::default(),
        }
    }
}
