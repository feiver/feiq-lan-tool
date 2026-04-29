# Settings System V1 Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current flat local settings with a structured settings system and ship the first executable V1 slice: five-group settings shell plus real behavior for identity, file transfer, and network/discovery settings.

**Architecture:** Move persistence and IPC from the flat `RuntimeSettings` shape to `AppPreferences + SettingsSnapshot`, keeping runtime-only values such as `deviceId` and readonly ports outside the persisted payload. Implement the spec in the same order it recommends: land the shared model first, then wire Tauri runtime behavior, then rebuild the React settings UI around grouped sections that can absorb later chat/display iterations without another data-model rewrite.

**Tech Stack:** Rust, Tauri 2, React 19, TypeScript, Zustand, Vitest, Testing Library, `@tauri-apps/plugin-dialog`

---

## Scope Note

This plan intentionally covers the first implementation slice from the approved spec:

- 个人与身份
- 文件传输
- 网络与发现
- 五组设置页壳子与数据模型

The remaining V1 areas that depend on new UI feedback infrastructure or platform hooks should be executed as follow-up plans after this phase is green:

- 聊天与通知
- 显示与通用中的托盘真实运行时行为
- 文件传输高级项：断点续传、分片、限速、重试策略

That decomposition keeps this plan shippable and avoids fake “implemented” settings that would have no runtime effect.

### Task 1: Structured Preferences Model And Persistence Migration

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\models.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\settings_store.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\tests\settings_store_tests.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\types.ts`

- [ ] **Step 1: Write the failing persistence tests**

Add two Rust tests in `D:\我的工作空间\feiq-lan-tool\src-tauri\tests\settings_store_tests.rs`:

```rust
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
    };

    save_settings_to_path(&path, &settings).expect("save settings");
    let loaded = load_settings_from_path(&path)
        .expect("load settings")
        .expect("settings should exist");

    assert_eq!(loaded, settings);
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
}
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```powershell
cargo test --test settings_store_tests
```

Expected: FAIL because `AppPreferences` and migration logic do not exist.

- [ ] **Step 3: Add the structured Rust settings model**

In `D:\我的工作空间\feiq-lan-tool\src-tauri\src\models.rs`, replace the flat settings struct with a grouped model:

```rust
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AppPreferences {
    pub identity: IdentityPreferences,
    pub transfer: TransferPreferences,
    pub network: NetworkPreferences,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct IdentityPreferences {
    pub nickname: String,
    pub device_name_mode: DeviceNameMode,
    pub status_message: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DeviceNameMode {
    NicknameOnly,
    NicknameWithDeviceName,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TransferPreferences {
    pub download_dir: String,
    pub receive_before_accept: bool,
    pub open_folder_after_receive: bool,
    pub preserve_directory_structure: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NetworkPreferences {
    pub discovery_mode: DiscoveryMode,
    pub manual_segments: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DiscoveryMode {
    Auto,
    ManualSegments,
    CurrentSegmentOnly,
}
```

Keep `Default` implementations conservative:

```rust
impl Default for AppPreferences {
    fn default() -> Self {
        let default_device_name = default_device_name();
        Self {
            identity: IdentityPreferences {
                nickname: default_device_name,
                device_name_mode: DeviceNameMode::NicknameOnly,
                status_message: String::new(),
            },
            transfer: TransferPreferences {
                download_dir: "~/Downloads".into(),
                receive_before_accept: true,
                open_folder_after_receive: true,
                preserve_directory_structure: true,
            },
            network: NetworkPreferences {
                discovery_mode: DiscoveryMode::Auto,
                manual_segments: Vec::new(),
            },
        }
    }
}
```

- [ ] **Step 4: Add migration-aware load/save and TS mirrors**

In `D:\我的工作空间\feiq-lan-tool\src-tauri\src\settings_store.rs`, accept both the old and new file shape:

```rust
#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum PersistedSettings {
    Structured(AppPreferences),
    Legacy(LegacyRuntimeSettings),
}

#[derive(Debug, Deserialize)]
struct LegacyRuntimeSettings {
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
            transfer: TransferPreferences {
                download_dir: value.download_dir,
                ..TransferPreferences::default()
            },
            ..AppPreferences::default()
        }
    }
}
```

Serialize only the structured payload:

```rust
let content = serde_json::to_string_pretty(settings)?;
```

Mirror the new payload in `D:\我的工作空间\feiq-lan-tool\src\desktop\types.ts`:

```ts
export type DeviceNameMode = "NicknameOnly" | "NicknameWithDeviceName";
export type DiscoveryMode = "Auto" | "ManualSegments" | "CurrentSegmentOnly";

export type AppPreferences = {
  identity: {
    nickname: string;
    deviceNameMode: DeviceNameMode;
    statusMessage: string;
  };
  transfer: {
    downloadDir: string;
    receiveBeforeAccept: boolean;
    openFolderAfterReceive: boolean;
    preserveDirectoryStructure: boolean;
  };
  network: {
    discoveryMode: DiscoveryMode;
    manualSegments: string[];
  };
};
```

- [ ] **Step 5: Run the test to verify GREEN**

Run:

```powershell
cargo test --test settings_store_tests
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src-tauri/src/models.rs src-tauri/src/settings_store.rs src-tauri/tests/settings_store_tests.rs src/desktop/types.ts
git commit -m "feat(settings): 引入结构化设置模型"
```

### Task 2: Settings Snapshot Commands And AppState Refactor

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\app_state.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\commands.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\main.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\tests\commands_tests.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\api.ts`

- [ ] **Step 1: Write the failing command/state tests**

Add coverage in `D:\我的工作空间\feiq-lan-tool\src-tauri\tests\commands_tests.rs`:

```rust
#[test]
fn state_exposes_snapshot_with_runtime_values() {
    let state = AppState::default();
    let snapshot = state.settings_snapshot();

    assert_eq!(snapshot.runtime.message_port, 37001);
    assert_eq!(snapshot.runtime.file_port, 37002);
    assert_eq!(snapshot.preferences.identity.nickname, snapshot.runtime.device_id);
}

#[test]
fn sync_settings_updates_structured_preferences() {
    let state = AppState::default();
    let next = AppPreferences {
        identity: IdentityPreferences {
            nickname: "局域网助手".into(),
            device_name_mode: DeviceNameMode::NicknameWithDeviceName,
            status_message: "忙碌".into(),
        },
        ..AppPreferences::default()
    };

    state.update_preferences(next.clone());

    assert_eq!(state.settings_snapshot().preferences, next);
}
```

- [ ] **Step 2: Run the tests to verify RED**

Run:

```powershell
cargo test --test commands_tests
```

Expected: FAIL because `settings_snapshot()` and `update_preferences()` do not exist.

- [ ] **Step 3: Refactor AppState to expose `SettingsSnapshot`**

In `D:\我的工作空间\feiq-lan-tool\src-tauri\src\app_state.rs`, replace the flat `settings` field with preferences plus runtime metadata:

```rust
pub struct SettingsRuntime {
    pub device_id: String,
    pub message_port: u16,
    pub file_port: u16,
}

pub struct SettingsSnapshot {
    pub preferences: AppPreferences,
    pub runtime: SettingsRuntime,
}

pub struct AppState {
    pub preferences: Arc<RwLock<AppPreferences>>,
    pub runtime: SettingsRuntime,
    // existing fields...
}

pub fn settings_snapshot(&self) -> SettingsSnapshot {
    SettingsSnapshot {
        preferences: self.preferences.read().expect("preferences read lock").clone(),
        runtime: self.runtime.clone(),
    }
}

pub fn update_preferences(&self, preferences: AppPreferences) {
    *self.preferences.write().expect("preferences write lock") = preferences;
}
```

- [ ] **Step 4: Keep command names stable but switch payloads**

In `D:\我的工作空间\feiq-lan-tool\src-tauri\src\commands.rs`:

```rust
#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<SettingsSnapshot, String> {
    Ok(state.settings_snapshot())
}

#[tauri::command]
pub async fn sync_settings(
    state: State<'_, AppState>,
    settings: AppPreferences,
) -> Result<(), String> {
    save_settings(&settings).map_err(|err| err.to_string())?;
    state.update_preferences(settings);
    Ok(())
}
```

In `D:\我的工作空间\feiq-lan-tool\src\desktop\api.ts`, map the nested payload instead of the flat one:

```ts
export type SettingsSnapshot = {
  preferences: AppPreferences;
  runtime: {
    deviceId: string;
    messagePort: number;
    filePort: number;
  };
};

export function getRuntimeSettings(): Promise<SettingsSnapshot> {
  return invoke("get_settings").then((snapshot) => ({
    preferences: {
      identity: {
        nickname: snapshot.preferences.identity.nickname,
        deviceNameMode: snapshot.preferences.identity.device_name_mode,
        statusMessage: snapshot.preferences.identity.status_message,
      },
      transfer: {
        downloadDir: snapshot.preferences.transfer.download_dir,
        receiveBeforeAccept: snapshot.preferences.transfer.receive_before_accept,
        openFolderAfterReceive: snapshot.preferences.transfer.open_folder_after_receive,
        preserveDirectoryStructure: snapshot.preferences.transfer.preserve_directory_structure,
      },
      network: {
        discoveryMode: snapshot.preferences.network.discovery_mode,
        manualSegments: snapshot.preferences.network.manual_segments,
      },
    },
    runtime: {
      deviceId: snapshot.runtime.device_id,
      messagePort: snapshot.runtime.message_port,
      filePort: snapshot.runtime.file_port,
    },
  }));
}
```

- [ ] **Step 5: Load structured preferences during bootstrap**

In `D:\我的工作空间\feiq-lan-tool\src-tauri\src\main.rs`, keep the existing startup flow but update the write target:

```rust
if let Ok(Some(settings)) = load_settings() {
    state.update_preferences(settings);
}
```

The `AppState::default()` runtime metadata should continue to use the fixed ports:

```rust
runtime: SettingsRuntime {
    device_id: default_device_name(),
    message_port: DEFAULT_MESSAGE_PORT,
    file_port: DEFAULT_FILE_PORT,
}
```

- [ ] **Step 6: Run the tests to verify GREEN**

Run:

```powershell
cargo test --test commands_tests
cargo test --test settings_store_tests
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src-tauri/src/app_state.rs src-tauri/src/commands.rs src-tauri/src/main.rs src-tauri/tests/commands_tests.rs src/desktop/api.ts
git commit -m "feat(settings): 打通设置快照命令链路"
```

### Task 3: Frontend Store Migration And Five-Group Settings Shell

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\app\store.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\App.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\styles\app.css`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [ ] **Step 1: Write the failing React tests**

Extend `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx` with grouped settings assertions:

```tsx
test("renders five settings groups after loading snapshot", async () => {
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: { nickname: "飞秋助手", deviceNameMode: "NicknameOnly", statusMessage: "" },
      transfer: {
        downloadDir: "D:/LAN/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: { discoveryMode: "Auto", manualSegments: [] },
    },
    runtime: { deviceId: "local-device", messagePort: 37001, filePort: 37002 },
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "个人与身份" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "聊天与通知" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "文件传输" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "网络与发现" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "显示与通用" })).toBeInTheDocument();
  });
});

test("updates nested nickname field without losing other preferences", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.clear(screen.getByLabelText("昵称"));
  await user.type(screen.getByLabelText("昵称"), "局域网助手");

  expect(useAppStore.getState().settings.preferences.identity.nickname).toBe("局域网助手");
  expect(useAppStore.getState().settings.preferences.transfer.downloadDir).toBe("~/Downloads");
});
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```powershell
npm.cmd run test -- app-shell
```

Expected: FAIL because the store and settings panel still use the flat shape.

- [ ] **Step 3: Convert the Zustand store to a nested settings snapshot**

In `D:\我的工作空间\feiq-lan-tool\src\app\store.ts`, replace the flat `LocalSettings` type:

```ts
type SettingsState = {
  preferences: AppPreferences;
  runtime: {
    deviceId: string;
    messagePort: number;
    filePort: number;
  };
};

type AppStore = {
  settings: SettingsState;
  updatePreferences: (updater: (current: AppPreferences) => AppPreferences) => void;
};
```

Implement updates without flattening nested sections:

```ts
updatePreferences(updater) {
  set((state) => ({
    settings: {
      ...state.settings,
      preferences: updater(state.settings.preferences),
    },
  }));
}
```

- [ ] **Step 4: Rebuild `SettingsPanel` as a five-group shell**

In `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`, move from a two-field form to a sidebar + section layout:

```tsx
const groups = [
  { key: "identity", label: "个人与身份" },
  { key: "chat", label: "聊天与通知", disabled: true },
  { key: "transfer", label: "文件传输" },
  { key: "network", label: "网络与发现" },
  { key: "display", label: "显示与通用", disabled: true },
] as const;
```

Render only the current phase as editable fields:

```tsx
<nav className="settings-nav">
  {groups.map((group) => (
    <button
      key={group.key}
      type="button"
      className={group.key === activeGroup ? "is-active" : ""}
      onClick={() => !group.disabled && setActiveGroup(group.key)}
      disabled={group.disabled}
    >
      {group.label}
    </button>
  ))}
</nav>
```

Keep the disabled groups visible with helper copy:

```tsx
<p className="settings-coming-soon">该分组将在下一实施阶段接入运行时行为。</p>
```

- [ ] **Step 5: Update `App.tsx` to read and sync the nested payload**

In `D:\我的工作空间\feiq-lan-tool\src\App.tsx`, sync only `preferences`:

```tsx
const settings = useAppStore((state) => state.settings);
const updatePreferences = useAppStore((state) => state.updatePreferences);

useEffect(() => {
  if (!settingsReady) {
    return;
  }

  void syncRuntimeSettings(settings.preferences);
}, [settings.preferences, settingsReady]);
```

Read runtime values from `settings.runtime`:

```tsx
from_device_id: settings.runtime.deviceId,
```

- [ ] **Step 6: Add the new settings layout styles**

In `D:\我的工作空间\feiq-lan-tool\src\styles\app.css`, replace the old stack with a split layout:

```css
.panel-settings {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 18px;
}

.settings-nav {
  display: grid;
  gap: 8px;
}

.settings-nav button.is-active {
  background: #dbeafe;
  color: #1d4ed8;
}

.settings-section {
  display: grid;
  gap: 16px;
}
```

- [ ] **Step 7: Run the tests to verify GREEN**

Run:

```powershell
npm.cmd run test -- app-shell
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add src/app/store.ts src/App.tsx src/desktop/modules/settings/SettingsPanel.tsx src/styles/app.css src/test/app-shell.test.tsx
git commit -m "feat(settings): 重构前端设置页骨架"
```

### Task 4: Identity, File Transfer, And Network Runtime Wiring

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\models.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\runtime.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\discovery.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\tests\discovery_tests.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\App.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\contacts\ContactsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\types.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [ ] **Step 1: Write the failing runtime tests**

Add coverage in `D:\我的工作空间\feiq-lan-tool\src-tauri\tests\discovery_tests.rs`:

```rust
#[test]
fn local_announcement_uses_identity_preferences() {
    let state = AppState::default();
    state.update_preferences(AppPreferences {
        identity: IdentityPreferences {
            nickname: "飞秋助手".into(),
            device_name_mode: DeviceNameMode::NicknameWithDeviceName,
            status_message: "在线".into(),
        },
        ..AppPreferences::default()
    });

    let announcement = build_local_announcement(&state);
    assert_eq!(announcement.nickname, "飞秋助手 (".to_string() + &announcement.host_name + ")");
    assert_eq!(announcement.status_message.as_deref(), Some("在线"));
}

#[test]
fn manual_segments_are_expanded_to_broadcast_targets() {
    let targets = discovery_targets(&NetworkPreferences {
        discovery_mode: DiscoveryMode::ManualSegments,
        manual_segments: vec!["192.168.10.0/24".into(), "10.0.20.0/24".into()],
    });

    assert_eq!(targets, vec!["192.168.10.255", "10.0.20.255"]);
}
```

Add a front-end assertion in `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`:

```tsx
test("shows readonly runtime ports in network group", async () => {
  render(<App />);
  await userEvent.click(screen.getByRole("button", { name: "网络与发现" }));
  expect(screen.getByText("37001")).toBeInTheDocument();
  expect(screen.getByText("37002")).toBeInTheDocument();
});

test("auto accepts incoming delivery when receive-before-accept is disabled", async () => {
  useAppStore.setState((state) => ({
    ...state,
    settings: {
      ...state.settings,
      preferences: {
        ...state.settings.preferences,
        transfer: {
          ...state.settings.preferences.transfer,
          receiveBeforeAccept: false,
          downloadDir: "D:/LAN/Downloads",
        },
      },
    },
  }));

  render(<App />);

  act(() => {
    eventListeners.get("chat-message-received")?.({
      payload: {
        message_id: "req-auto-1",
        from_device_id: "device-a",
        to_device_id: "local-device",
        content: "delivery request",
        sent_at_ms: 1002,
        kind: "delivery",
        delivery: {
          request_id: "req-auto-1",
          status: "PendingDecision",
          save_root: null,
          entries: [{ entry_id: "entry-1", display_name: "demo.txt", relative_path: "demo.txt", file_size: 12, kind: "File" }],
        },
      },
    });
  });

  await waitFor(() => {
    expect(mockedSendDeliveryResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "req-auto-1",
        decision: "Accepted",
        saveRoot: "D:/LAN/Downloads",
      }),
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run:

```powershell
cargo test --test discovery_tests
npm.cmd run test -- app-shell
```

Expected: FAIL because announcements and settings UI do not expose these fields.

- [ ] **Step 3: Thread identity fields through the LAN models**

In `D:\我的工作空间\feiq-lan-tool\src-tauri\src\models.rs`, extend the announcement and contact models:

```rust
pub struct DeviceAnnouncement {
    pub device_id: String,
    pub nickname: String,
    pub host_name: String,
    pub ip_addr: String,
    pub message_port: u16,
    pub file_port: u16,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status_message: Option<String>,
}

pub struct KnownDevice {
    // existing fields...
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status_message: Option<String>,
}
```

Update `D:\我的工作空间\feiq-lan-tool\src-tauri\src\discovery.rs` to preserve that field during announcement-to-registry updates.

- [ ] **Step 4: Build discovery announcements from preferences, not hard-coded host name**

In `D:\我的工作空间\feiq-lan-tool\src-tauri\src\runtime.rs`, change the helper signature:

```rust
fn build_local_announcement(state: &AppState) -> DeviceAnnouncement {
    let preferences = state.settings_snapshot().preferences;
    let host_name = env::var("COMPUTERNAME")
        .or_else(|_| env::var("HOSTNAME"))
        .unwrap_or_else(|_| "feiq-device".into());
    let nickname = match preferences.identity.device_name_mode {
        DeviceNameMode::NicknameOnly => preferences.identity.nickname,
        DeviceNameMode::NicknameWithDeviceName => format!("{} ({host_name})", preferences.identity.nickname),
    };

    DeviceAnnouncement {
        device_id: state.settings_snapshot().runtime.device_id,
        nickname,
        host_name,
        ip_addr: detect_local_ip().unwrap_or_else(|| "127.0.0.1".into()),
        message_port: state.settings_snapshot().runtime.message_port,
        file_port: state.settings_snapshot().runtime.file_port,
        status_message: (!preferences.identity.status_message.trim().is_empty())
            .then_some(preferences.identity.status_message),
    }
}
```

Replace the announcer bootstrap with state-aware targets:

```rust
pub fn spawn_discovery_runtime(app_handle: AppHandle, state: AppState) {
    spawn_discovery_listener(app_handle.clone(), state.clone(), state.settings_snapshot().runtime.device_id.clone());
    spawn_discovery_announcer(state);
}
```

- [ ] **Step 5: Respect network mode and file-transfer basics**

In `D:\我的工作空间\feiq-lan-tool\src-tauri\src\runtime.rs`, add a helper that maps the current network settings to broadcast targets:

```rust
fn discovery_targets(network: &NetworkPreferences) -> Vec<String> {
    match network.discovery_mode {
        DiscoveryMode::Auto => vec!["255.255.255.255".into()],
        DiscoveryMode::CurrentSegmentOnly => vec![current_segment_broadcast().unwrap_or_else(|| "255.255.255.255".into())],
        DiscoveryMode::ManualSegments => network
            .manual_segments
            .iter()
            .filter_map(|segment| cidr_to_broadcast_ip(segment))
            .collect(),
    }
}
```

Keep the file listener aligned with the transfer settings:

```rust
let download_dir = &settings.preferences.transfer.download_dir;
let output_path = if let Some(session) = incoming_delivery.as_ref() {
    if settings.preferences.transfer.preserve_directory_structure {
        build_delivery_output_path(Path::new(&session.save_root), &offer.file_name)
    } else {
        let leaf_name = Path::new(&offer.file_name)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or(&offer.file_name);
        Path::new(&session.save_root).join(leaf_name)
    }
} else {
    build_download_path(download_dir, &offer.file_name)
};
```

In `D:\我的工作空间\feiq-lan-tool\src\App.tsx`, make the two transfer toggles actually affect runtime behavior:

```tsx
useEffect(() => {
  const target = messages.findLast(
    (message) =>
      message.kind === "delivery" &&
      message.from_device_id !== settings.runtime.deviceId &&
      message.delivery?.status === "PendingDecision",
  );
  const sourceDevice = devices.find((device) => device.device_id === target?.from_device_id);

  if (!target || !sourceDevice || settings.preferences.transfer.receiveBeforeAccept) {
    return;
  }

  void sendDeliveryResponse({
    addr: `${sourceDevice.ip_addr}:${sourceDevice.message_port}`,
    requestId: target.delivery!.request_id,
    toDeviceId: target.from_device_id,
    decision: "Accepted",
    saveRoot: settings.preferences.transfer.downloadDir,
  });
}, [devices, messages, settings]);

useEffect(() => {
  const completed = messages.findLast(
    (message) =>
      message.kind === "delivery" &&
      message.delivery?.status === "Completed" &&
      message.delivery.save_root,
  );

  if (!completed || !settings.preferences.transfer.openFolderAfterReceive) {
    return;
  }

  void openDirectory(completed.delivery!.save_root!);
}, [messages, settings.preferences.transfer.openFolderAfterReceive]);
```

Guard duplicate folder opens with a local `useRef<Set<string>>`.

- [ ] **Step 6: Show the new identity/network fields in the settings UI and contact list**

In `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`, add the actual phase-1 forms:

```tsx
<label className="settings-field">
  <span>昵称</span>
  <input
    aria-label="昵称"
    value={preferences.identity.nickname}
    onChange={(event) =>
      onChange((current) => ({
        ...current,
        identity: { ...current.identity, nickname: event.currentTarget.value },
      }))
    }
  />
</label>
<label className="settings-checkbox">
  <input
    type="checkbox"
    checked={preferences.transfer.receiveBeforeAccept}
    onChange={(event) =>
      onChange((current) => ({
        ...current,
        transfer: {
          ...current.transfer,
          receiveBeforeAccept: event.currentTarget.checked,
        },
      }))
    }
  />
  <span>接收前确认</span>
</label>
<label className="settings-checkbox">
  <input
    type="checkbox"
    checked={preferences.transfer.openFolderAfterReceive}
    onChange={(event) =>
      onChange((current) => ({
        ...current,
        transfer: {
          ...current.transfer,
          openFolderAfterReceive: event.currentTarget.checked,
        },
      }))
    }
  />
  <span>接收完成后打开目录</span>
</label>
```

Render readonly runtime values in the network group:

```tsx
<div className="settings-readonly">
  <span>当前消息端口</span>
  <strong>{runtime.messagePort}</strong>
</div>
```

In `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\contacts\ContactsPanel.tsx`, show the optional status line:

```tsx
{device.status_message ? <span>{device.status_message}</span> : null}
```

Mirror the optional field in `D:\我的工作空间\feiq-lan-tool\src\desktop\types.ts`:

```ts
export type KnownDevice = {
  device_id: string;
  nickname: string;
  host_name: string;
  ip_addr: string;
  message_port: number;
  file_port: number;
  last_seen_ms: number;
  status_message?: string | null;
};
```

- [ ] **Step 7: Run the tests to verify GREEN**

Run:

```powershell
cargo test --test discovery_tests
cargo test --test commands_tests
npm.cmd run test -- app-shell
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add src-tauri/src/models.rs src-tauri/src/runtime.rs src-tauri/src/discovery.rs src-tauri/tests/discovery_tests.rs src/App.tsx src/desktop/modules/contacts/ContactsPanel.tsx src/desktop/types.ts src/test/app-shell.test.tsx
git commit -m "feat(settings): 接入身份与网络运行时设置"
```

### Task 5: README Sync And Phase Handoff

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Modify: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\specs\2026-04-15-settings-system-design.md`

- [ ] **Step 1: Update README progress wording**

In `D:\我的工作空间\feiq-lan-tool\README.md`, update the settings section after implementation so it reflects shipped phase-1 behavior instead of only planning language:

```md
- ✅ 结构化设置模型与持久化迁移完成
- ✅ 五组设置页骨架完成
- ✅ 已落地：个人与身份 / 文件传输 / 网络与发现
- ⏳ 下一阶段：聊天与通知、显示与通用、传输高级控制
```

- [ ] **Step 2: Mark the spec with implementation status**

Add a short status note near the top of `D:\我的工作空间\feiq-lan-tool\docs\superpowers\specs\2026-04-15-settings-system-design.md`:

```md
> 实施状态（2026-04-16）：
> - Phase 1 已覆盖：个人与身份、文件传输、网络与发现、五组设置骨架
> - 待后续计划覆盖：聊天与通知、显示与通用、传输高级参数
```

- [ ] **Step 3: Run lightweight verification**

Run:

```powershell
npm.cmd run test -- app-shell
cargo test --test settings_store_tests
cargo test --test commands_tests
cargo test --test discovery_tests
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add README.md docs/superpowers/specs/2026-04-15-settings-system-design.md
git commit -m "docs(settings): 同步阶段一实施状态"
```

## Self-Review

### Spec coverage

- 已覆盖本阶段要求：结构化设置模型、五组设置信息架构壳子、个人与身份、文件传输、网络与发现。
- 明确留待后续计划：聊天与通知、显示与通用运行时、传输高级参数。

### Placeholder scan

- No `TODO` / `TBD` placeholders remain.
- Each task points to exact files, commands, and expected runtime effect.

### Type consistency

- Persisted payload name stays `AppPreferences`.
- IPC read model stays `SettingsSnapshot`.
- Frontend runtime-only values stay under `settings.runtime`.
