use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use feiq_lan_tool_lib::models::{
    AppPreferences,
    CloseAction,
    DiscoveryRefreshHistoryEntry,
    DiscoveryRefreshSegmentStatus,
    DiscoveryRefreshSegmentStatusSummary,
    DiscoveryRefreshHistoryStatus,
    DisplayPreferences,
    DeviceNameMode,
    DiscoveryMode,
    IdentityPreferences,
    NetworkPreferences,
    TransferPreferences,
};
use feiq_lan_tool_lib::settings_store::{
    load_discovery_refresh_history_from_path,
    load_settings_from_path,
    save_discovery_refresh_history_to_path,
    save_settings_to_path,
};

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
fn save_and_load_structured_preferences_roundtrip() {
    let path = temp_settings_path();
    let settings = AppPreferences {
        identity: IdentityPreferences {
            nickname: "飞秋助手".into(),
            device_name_mode: DeviceNameMode::NicknameWithDeviceName,
            status_message: "在线".into(),
        },
        transfer: TransferPreferences {
            download_dir: "D:/LAN/Downloads".into(),
            receive_before_accept: true,
            open_folder_after_receive: true,
            preserve_directory_structure: true,
        },
        network: NetworkPreferences {
            discovery_mode: DiscoveryMode::Auto,
            manual_segments: vec!["192.168.10.0/24".into()],
        },
        display: DisplayPreferences {
            tray_enabled: true,
            close_action: CloseAction::MinimizeToTray,
        },
    };

    save_settings_to_path(&path, &settings).expect("save settings");
    let loaded = load_settings_from_path(&path)
        .expect("load settings")
        .expect("settings should exist");

    assert_eq!(loaded, settings);

    fs::remove_file(path).expect("cleanup settings file");
}

#[test]
fn legacy_runtime_settings_file_is_migrated_to_structured_preferences() {
    let path = temp_settings_path();
    fs::write(
        &path,
        r#"{
          "device_id": "persisted-device",
          "nickname": "旧版昵称",
          "download_dir": "D:/Legacy/Downloads"
        }"#,
    )
    .expect("write legacy file");

    let loaded = load_settings_from_path(&path)
        .expect("load migrated settings")
        .expect("settings should exist");

    assert_eq!(loaded.identity.nickname, "旧版昵称");
    assert_eq!(loaded.transfer.download_dir, "D:/Legacy/Downloads");
    assert_eq!(loaded.network.discovery_mode, DiscoveryMode::Auto);
    assert!(loaded.display.tray_enabled);
    assert_eq!(loaded.display.close_action, CloseAction::MinimizeToTray);

    fs::remove_file(path).expect("cleanup settings file");
}

#[test]
fn load_settings_returns_none_when_file_missing() {
    let path = temp_settings_path();

    let loaded = load_settings_from_path(&path).expect("load missing settings");

    assert!(loaded.is_none());
}

#[test]
fn app_preferences_default_includes_display_settings() {
    let settings = AppPreferences::default();

    assert!(settings.display.tray_enabled);
    assert_eq!(settings.display.close_action, CloseAction::MinimizeToTray);
}

#[test]
fn save_and_load_discovery_refresh_history_roundtrip() {
    let path = temp_settings_path();
    let history = vec![
        DiscoveryRefreshHistoryEntry {
            id: "history-1".into(),
            timestamp: 1_713_264_000_000,
            status: DiscoveryRefreshHistoryStatus::Succeeded,
            discovered_count: 2,
            existing_count: 1,
            unmatched_segment_count: 0,
            message: String::new(),
            new_device_labels: vec!["Bob · 192.168.10.20".into()],
            existing_device_labels: vec!["Alice · 192.168.1.10".into()],
            unmatched_segments: vec!["10.0.0.0/24".into()],
            segment_statuses: vec![DiscoveryRefreshSegmentStatusSummary {
                segment: "192.168.10.0/24".into(),
                status: DiscoveryRefreshSegmentStatus::NewlyMatched,
                new_device_count: 1,
                existing_device_count: 0,
            }],
        },
        DiscoveryRefreshHistoryEntry {
            id: "history-2".into(),
            timestamp: 1_713_264_100_000,
            status: DiscoveryRefreshHistoryStatus::Failed,
            discovered_count: 0,
            existing_count: 0,
            unmatched_segment_count: 1,
            message: "请检查本机网络权限或稍后重试。".into(),
            new_device_labels: Vec::new(),
            existing_device_labels: Vec::new(),
            unmatched_segments: vec!["10.0.0.0/24".into()],
            segment_statuses: vec![DiscoveryRefreshSegmentStatusSummary {
                segment: "10.0.0.0/24".into(),
                status: DiscoveryRefreshSegmentStatus::Unmatched,
                new_device_count: 0,
                existing_device_count: 0,
            }],
        },
    ];

    save_discovery_refresh_history_to_path(&path, &history).expect("save refresh history");
    let loaded =
        load_discovery_refresh_history_from_path(&path).expect("load refresh history");

    assert_eq!(loaded, history);

    fs::remove_file(path).expect("cleanup refresh history file");
}

#[test]
fn load_discovery_refresh_history_returns_empty_when_file_missing() {
    let path = temp_settings_path();

    let loaded =
        load_discovery_refresh_history_from_path(&path).expect("load missing refresh history");

    assert!(loaded.is_empty());
}

#[test]
fn load_legacy_discovery_refresh_history_without_detail_fields() {
    let path = temp_settings_path();
    fs::write(
        &path,
        r#"[
          {
            "id": "legacy-1",
            "timestamp": 1713264000000,
            "status": "Succeeded",
            "discovered_count": 2,
            "existing_count": 1,
            "unmatched_segment_count": 0,
            "message": ""
          }
        ]"#,
    )
    .expect("write legacy refresh history");

    let loaded =
        load_discovery_refresh_history_from_path(&path).expect("load legacy refresh history");

    assert_eq!(loaded[0].new_device_labels, Vec::<String>::new());
    assert_eq!(loaded[0].existing_device_labels, Vec::<String>::new());
    assert_eq!(loaded[0].unmatched_segments, Vec::<String>::new());
    assert!(loaded[0].segment_statuses.is_empty());

    fs::remove_file(path).expect("cleanup legacy refresh history");
}
