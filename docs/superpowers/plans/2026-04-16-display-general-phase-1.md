# Display And General Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为设置中心补齐“显示与通用”首批真实运行时能力，让托盘显示和关闭窗口行为能保存并立即生效。

**Architecture:** 在现有 `AppPreferences + SettingsSnapshot` 结构上新增 `display` 分组，首批只承载 `trayEnabled` 与 `closeAction`。Rust 侧统一在 Tauri `main.rs` 管理托盘创建、菜单事件和窗口关闭拦截；前端设置页启用 `display` 分组表单并继续复用当前同步设置链路。

**Tech Stack:** Rust, Tauri 2, React 19, TypeScript, Zustand, Vitest, Testing Library

---

## Scope Note

本计划只覆盖：

- `trayEnabled`
- `closeAction`
- 托盘菜单：显示主窗口、退出
- 关闭主窗口时按设置执行“隐藏到托盘”或“直接退出”

本计划明确不覆盖：

- 开机启动
- 主题 / 字号 / 列表密度
- 聊天通知行为

### Task 1: 扩展设置模型到 Display 分组

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\models.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\settings_store.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\tests\settings_store_tests.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\types.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\api.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\app\store.ts`

- [ ] **Step 1: 先补持久化测试用例**

在 `D:\我的工作空间\feiq-lan-tool\src-tauri\tests\settings_store_tests.rs` 的结构化设置 roundtrip 用例里加入 display 断言，目标值至少包含：

```rust
display: DisplayPreferences {
    tray_enabled: true,
    close_action: CloseAction::MinimizeToTray,
},
```

并新增一条默认值测试，确认 `AppPreferences::default().display` 为：

```rust
assert!(settings.display.tray_enabled);
assert_eq!(settings.display.close_action, CloseAction::MinimizeToTray);
```

- [ ] **Step 2: 运行测试，确认当前为 RED**

Run:

```powershell
cargo test --test settings_store_tests
```

Expected: 因为 `display` 分组尚不存在而失败。

- [ ] **Step 3: 在 Rust 模型中加入 display 设置**

在 `D:\我的工作空间\feiq-lan-tool\src-tauri\src\models.rs` 中新增：

```rust
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DisplayPreferences {
    pub tray_enabled: bool,
    pub close_action: CloseAction,
}

impl Default for DisplayPreferences {
    fn default() -> Self {
        Self {
            tray_enabled: true,
            close_action: CloseAction::MinimizeToTray,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum CloseAction {
    MinimizeToTray,
    Exit,
}
```

同时把 `AppPreferences` 扩展为：

```rust
pub struct AppPreferences {
    pub identity: IdentityPreferences,
    pub transfer: TransferPreferences,
    pub network: NetworkPreferences,
    pub display: DisplayPreferences,
}
```

- [ ] **Step 4: 同步 TS 类型与默认 store**

在 `D:\我的工作空间\feiq-lan-tool\src\desktop\types.ts` 增加：

```ts
export type CloseAction = "MinimizeToTray" | "Exit";
```

并把 `AppPreferences` 扩展为：

```ts
display: {
  trayEnabled: boolean;
  closeAction: CloseAction;
};
```

随后在：

- `D:\我的工作空间\feiq-lan-tool\src\desktop\api.ts`
- `D:\我的工作空间\feiq-lan-tool\src\app\store.ts`

补齐 `display` 字段的序列化 / 反序列化与默认值映射。

- [ ] **Step 5: 运行测试，确认回到 GREEN**

Run:

```powershell
cargo test --test settings_store_tests
```

Expected: PASS。

### Task 2: 补齐显示与通用设置页和前端回归

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\styles\app.css`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [ ] **Step 1: 先写前端交互测试**

在 `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx` 新增两条测试：

1. 显示与通用分组从禁用改为可点击，并显示两个字段：

```tsx
await user.click(screen.getByRole("button", { name: /显示与通用/ }));
expect(screen.getByLabelText("托盘显示")).toBeInTheDocument();
expect(screen.getByLabelText("关闭窗口行为")).toBeInTheDocument();
```

2. 修改 display 设置时会更新 store：

```tsx
await user.click(screen.getByRole("button", { name: /显示与通用/ }));
await user.click(screen.getByLabelText("托盘显示"));
await user.selectOptions(screen.getByLabelText("关闭窗口行为"), "Exit");

expect(useAppStore.getState().settings.preferences.display.trayEnabled).toBe(false);
expect(useAppStore.getState().settings.preferences.display.closeAction).toBe("Exit");
```

- [ ] **Step 2: 运行测试，确认当前为 RED**

Run:

```powershell
npm.cmd run test -- app-shell
```

Expected: 因为 display 分组仍是 coming soon 且无字段而失败。

- [ ] **Step 3: 启用显示与通用分组**

在 `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx` 中：

- 移除 `display` 分组的 `disabled: true`
- 新增“托盘显示”复选框
- 新增“关闭窗口行为”下拉框

字段映射如下：

```tsx
<label className="settings-checkbox">
  <input
    aria-label="托盘显示"
    type="checkbox"
    checked={preferences.display.trayEnabled}
    onChange={(event) =>
      onChange((current) => ({
        ...current,
        display: {
          ...current.display,
          trayEnabled: event.currentTarget.checked,
        },
      }))
    }
  />
  <span>托盘显示</span>
</label>
```

```tsx
<label className="settings-field">
  <span>关闭窗口行为</span>
  <select
    aria-label="关闭窗口行为"
    value={preferences.display.closeAction}
    onChange={(event) =>
      onChange((current) => ({
        ...current,
        display: {
          ...current.display,
          closeAction: event.currentTarget.value as AppPreferences["display"]["closeAction"],
        },
      }))
    }
  >
    <option value="MinimizeToTray">最小化到托盘</option>
    <option value="Exit">直接退出</option>
  </select>
</label>
```

- [ ] **Step 4: 补样式细节并回归**

如有需要在 `D:\我的工作空间\feiq-lan-tool\src\styles\app.css` 中复用现有 `settings-field` / `settings-checkbox`，只补最小差异样式，不重做布局。

- [ ] **Step 5: 运行测试，确认 GREEN**

Run:

```powershell
npm.cmd run test -- app-shell
```

Expected: PASS。

### Task 3: 接入 Tauri 托盘、菜单事件和关闭行为

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\main.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\app_state.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\tests\commands_tests.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`

- [ ] **Step 1: 先补 Rust 侧纯逻辑测试**

在 `D:\我的工作空间\feiq-lan-tool\src-tauri\tests\commands_tests.rs` 新增一条设置快照断言，确保 display 分组能被 `settings_snapshot()` 暴露：

```rust
#[test]
fn state_snapshot_contains_display_preferences() {
    let state = AppState::default();
    let snapshot = state.settings_snapshot();

    assert!(snapshot.preferences.display.tray_enabled);
    assert_eq!(
        snapshot.preferences.display.close_action,
        CloseAction::MinimizeToTray
    );
}
```

- [ ] **Step 2: 运行测试，确认 display 快照已联通**

Run:

```powershell
cargo test --test commands_tests
```

Expected: PASS 或在少量模型改动后回到 PASS。

- [ ] **Step 3: 在 `main.rs` 创建托盘与菜单**

在 `D:\我的工作空间\feiq-lan-tool\src-tauri\src\main.rs` 中：

1. 创建菜单项：

```rust
let show_item = tauri::menu::MenuItem::with_id(app, "tray_show", "显示主窗口", true, None::<&str>)?;
let quit_item = tauri::menu::MenuItem::with_id(app, "tray_quit", "退出", true, None::<&str>)?;
let tray_menu = tauri::menu::Menu::with_items(app, &[&show_item, &quit_item])?;
```

2. 创建托盘：

```rust
tauri::tray::TrayIconBuilder::with_id("main-tray")
    .menu(&tray_menu)
    .show_menu_on_left_click(false)
    .build(app)?;
```

3. 启动后根据 `preferences.display.tray_enabled` 设置可见性。

- [ ] **Step 4: 处理托盘菜单和托盘点击行为**

在 `main.rs` 中注册：

```rust
.on_menu_event(|app, event| {
    match event.id().as_ref() {
        "tray_show" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "tray_quit" => {
            app.exit(0);
        }
        _ => {}
    }
})
.on_tray_icon_event(|app, event| {
    if matches!(event, tauri::tray::TrayIconEvent::Click { .. } | tauri::tray::TrayIconEvent::DoubleClick { .. }) {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
})
```

- [ ] **Step 5: 拦截主窗口关闭行为**

在 `main.rs` 中通过窗口事件处理：

```rust
.on_window_event(|window, event| {
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        let app = window.app_handle();
        let state = app.state::<AppState>().inner().clone();
        let snapshot = state.settings_snapshot();

        if snapshot.preferences.display.close_action == CloseAction::MinimizeToTray {
            api.prevent_close();
            let _ = window.hide();
        }
    }
})
```

同时保证：

- 如果 `tray_enabled == false`，关闭行为即使选了 `MinimizeToTray`，也退化为直接退出
- 每次 `sync_settings` 后，托盘可见性会按最新 `tray_enabled` 更新

实现方式可以放在一个单独辅助函数里，例如：

```rust
fn apply_display_preferences(app: &AppHandle, preferences: &AppPreferences) { ... }
```

- [ ] **Step 6: 让设置保存后立即同步托盘可见性**

在 `D:\我的工作空间\feiq-lan-tool\src-tauri\src\commands.rs` 的 `sync_settings` 中，在 `state.update_preferences(settings.clone())` 后调用托盘显示同步辅助函数。

如果为了避免循环依赖，需要把辅助函数放在 `main.rs` 之外的新文件，例如 `display_runtime.rs`，也可以接受，但优先最小改动。

- [ ] **Step 7: 跑完整回归**

Run:

```powershell
cargo test --tests
npm.cmd run test -- app-shell
```

Expected: PASS。

### Task 4: README 同步

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`

- [ ] **Step 1: 更新当前进度**

在 `README.md` 的“设置体系规划”或“当前进度”中补一条：

```md
- ✅ 显示与通用：托盘显示与关闭窗口行为已接入
```

- [ ] **Step 2: 轻量验证**

Run:

```powershell
npm.cmd run test -- app-shell
cargo test --test commands_tests
```

Expected: PASS。

## Self-Review

### Spec coverage

- 已覆盖 spec 中“显示与通用”V1 的两个字段：`trayEnabled`、`closeAction`
- 已覆盖“即时生效”的行为要求
- 未扩展到非本次范围的主题、字号、开机启动

### Placeholder scan

- 无 `TODO` / `TBD`
- 每个任务都指定了改动文件和验证命令

### Type consistency

- Rust: `DisplayPreferences` + `CloseAction`
- TS: `display.trayEnabled` + `display.closeAction`
- 前后端枚举值统一为 `MinimizeToTray | Exit`
