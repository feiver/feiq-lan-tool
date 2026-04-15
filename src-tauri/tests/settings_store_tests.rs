use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use feiq_lan_tool_lib::models::RuntimeSettings;
use feiq_lan_tool_lib::settings_store::{load_settings_from_path, save_settings_to_path};

fn temp_settings_path() -> PathBuf {
    let mut path = std::env::temp_dir();
    let suffix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time")
        .as_nanos();
    path.push(format!("feiq-settings-{suffix}.json"));
    path
}

#[test]
fn save_and_load_settings_roundtrip() {
    let path = temp_settings_path();
    let settings = RuntimeSettings {
        device_id: "persisted-device".into(),
        nickname: "飞秋助手".into(),
        download_dir: "D:/LAN/Downloads".into(),
    };

    save_settings_to_path(&path, &settings).expect("save settings");
    let loaded = load_settings_from_path(&path)
        .expect("load settings")
        .expect("settings should exist");

    assert_eq!(loaded, settings);

    fs::remove_file(path).expect("cleanup settings file");
}

#[test]
fn load_settings_returns_none_when_file_missing() {
    let path = temp_settings_path();

    let loaded = load_settings_from_path(&path).expect("load missing settings");

    assert!(loaded.is_none());
}
