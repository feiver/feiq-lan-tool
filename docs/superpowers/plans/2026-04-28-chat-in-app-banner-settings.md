# Chat In-App Banner Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为应用内横幅提醒新增“聊天与通知”设置开关，默认开启，关闭后只抑制横幅提醒。

**Architecture:** 在 `ChatPreferences` 中新增 `showInAppBannerNotifications` 字段，设置页负责读写该字段，`App.tsx` 在现有 `chat-message-received` 流程中把它作为横幅显示条件之一。旧配置缺少该字段时通过现有 `current.chat ?? defaultChatPreferences` 合并模式补齐，避免历史配置导致默认关闭。

**Tech Stack:** React 19、TypeScript、Vitest、Testing Library、Zustand、Tauri 2。

---

## File Structure

- Modify: `src/desktop/types.ts`
  - 扩展 `ChatPreferences`，默认开启应用内横幅提醒。
- Modify: `src/desktop/modules/settings/SettingsPanel.tsx`
  - 在“聊天与通知”分组新增 `应用内横幅提醒` 开关。
  - 更新聊天设置读取方式，兼容旧配置缺字段。
- Modify: `src/App.tsx`
  - 横幅触发条件追加 `currentChatPreferences.showInAppBannerNotifications`。
- Modify: `src/test/app-shell.test.tsx`
  - 增加设置开关、旧配置兼容、关闭后抑制单聊/文件投递横幅测试。
  - 更新现有聊天设置测试的期望字段。
- Modify: `README.md`
  - 同步记录应用内横幅提醒可在聊天与通知中开关。

## Task 1: Lock settings behavior with failing tests

**Files:**
- Modify: `src/test/app-shell.test.tsx`

- [ ] **Step 1: Update the existing chat settings test expectation**

In `shows chat settings and updates shared settings state`, add an assertion for the new switch and include the field in the final expectation:

```tsx
expect(screen.getByLabelText("应用内横幅提醒")).toBeInTheDocument();

await user.click(screen.getByLabelText("应用内横幅提醒"));

expect(useAppStore.getState().settings.preferences.chat).toEqual({
  enterToSend: true,
  confirmBeforeBroadcast: false,
  autoSwitchToIncomingDirect: true,
  autoSwitchToIncomingDelivery: false,
  showInAppBannerNotifications: false,
});
```

Expected current RED result before implementation:

```text
Unable to find a label with the text of: 应用内横幅提醒
```

- [ ] **Step 2: Add a direct-message suppression test**

Add this test near the existing in-app banner tests:

```tsx
test("does not show in-app banner for direct messages when banner notifications are disabled", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "未命名设备",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      chat: {
        enterToSend: false,
        confirmBeforeBroadcast: true,
        autoSwitchToIncomingDirect: false,
        autoSwitchToIncomingDelivery: false,
        showInAppBannerNotifications: false,
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "Auto",
        manualSegments: [],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });

  render(<App />);

  await screen.findByText("当前会话：Alice");

  act(() => {
    eventListeners.get("chat-message-received")?.({
      payload: {
        message_id: "banner-disabled-direct-1",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "Bob 新消息",
        sent_at_ms: 1110,
        kind: "direct",
      },
    });
  });

  const bobButton = screen.getByRole("button", { name: /Bob/ });
  expect(screen.queryByText("Bob 发来新消息")).not.toBeInTheDocument();
  expect(within(bobButton).getByLabelText("未读 1 条")).toBeInTheDocument();
});
```

- [ ] **Step 3: Add a delivery suppression test**

Add this test near the existing delivery banner test:

```tsx
test("does not show in-app banner for delivery when banner notifications are disabled", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "未命名设备",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      chat: {
        enterToSend: false,
        confirmBeforeBroadcast: true,
        autoSwitchToIncomingDirect: false,
        autoSwitchToIncomingDelivery: false,
        showInAppBannerNotifications: false,
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "Auto",
        manualSegments: [],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });

  render(<App />);

  await screen.findByText("当前会话：Alice");

  act(() => {
    eventListeners.get("chat-message-received")?.({
      payload: {
        message_id: "banner-disabled-delivery-1",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "delivery",
        sent_at_ms: 1111,
        kind: "delivery",
        delivery: {
          request_id: "banner-disabled-delivery-1",
          status: "PendingDecision",
          save_root: null,
          entries: [
            {
              entry_id: "banner-disabled-delivery-entry-1",
              display_name: "demo.txt",
              relative_path: "demo.txt",
              file_size: 12,
              kind: "File",
            },
          ],
        },
      },
    });
  });

  const bobButton = screen.getByRole("button", { name: /Bob/ });
  expect(screen.queryByText("Bob 发来文件投递")).not.toBeInTheDocument();
  expect(within(bobButton).getByText("待接收")).toBeInTheDocument();
});
```

- [ ] **Step 4: Add an old-config compatibility test**

Use a cast so the test can represent persisted old settings without the new TypeScript field:

```tsx
test("keeps in-app banner notifications enabled for old chat settings without the new field", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "未命名设备",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      chat: {
        enterToSend: false,
        confirmBeforeBroadcast: true,
        autoSwitchToIncomingDirect: false,
        autoSwitchToIncomingDelivery: false,
      } as never,
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "Auto",
        manualSegments: [],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });

  render(<App />);

  await screen.findByText("当前会话：Alice");

  act(() => {
    eventListeners.get("chat-message-received")?.({
      payload: {
        message_id: "banner-old-config-1",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "Bob 新消息",
        sent_at_ms: 1112,
        kind: "direct",
      },
    });
  });

  expect(screen.getByText("Bob 发来新消息")).toBeInTheDocument();
});
```

- [ ] **Step 5: Run focused tests and confirm RED**

Run:

```powershell
npm.cmd run test -- app-shell
```

Expected:

```text
FAIL src/test/app-shell.test.tsx
```

At least the settings test and disabled-banner tests should fail because the new field and UI are not implemented.

## Task 2: Extend chat preferences safely

**Files:**
- Modify: `src/desktop/types.ts`
- Modify: `src/desktop/modules/settings/SettingsPanel.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the field to `ChatPreferences`**

In `src/desktop/types.ts`, update:

```ts
export type ChatPreferences = {
  enterToSend: boolean;
  confirmBeforeBroadcast: boolean;
  autoSwitchToIncomingDirect: boolean;
  autoSwitchToIncomingDelivery: boolean;
  showInAppBannerNotifications: boolean;
};

export const defaultChatPreferences: ChatPreferences = {
  enterToSend: false,
  confirmBeforeBroadcast: true,
  autoSwitchToIncomingDirect: false,
  autoSwitchToIncomingDelivery: true,
  showInAppBannerNotifications: true,
};
```

- [ ] **Step 2: Merge defaults when reading chat preferences in `SettingsPanel.tsx`**

Replace:

```ts
const chatPreferences = preferences.chat ?? defaultChatPreferences;
```

with:

```ts
const chatPreferences = {
  ...defaultChatPreferences,
  ...(preferences.chat ?? {}),
};
```

This preserves old settings that lack the new field.

- [ ] **Step 3: Merge defaults when reading chat preferences in `App.tsx` render state**

Replace:

```ts
const chatPreferences = settings.preferences.chat ?? defaultChatPreferences;
```

with:

```ts
const chatPreferences = {
  ...defaultChatPreferences,
  ...(settings.preferences.chat ?? {}),
};
```

- [ ] **Step 4: Merge defaults inside the incoming message listener**

Replace:

```ts
const currentChatPreferences =
  currentState.settings.preferences.chat ?? defaultChatPreferences;
```

with:

```ts
const currentChatPreferences = {
  ...defaultChatPreferences,
  ...(currentState.settings.preferences.chat ?? {}),
};
```

This is required because the listener reads directly from the store, not from the render-scoped `chatPreferences`.

## Task 3: Add the settings UI switch

**Files:**
- Modify: `src/desktop/modules/settings/SettingsPanel.tsx`

- [ ] **Step 1: Insert the switch after broadcast confirmation**

Add this block after the `广播前确认` hint and before auto-switch settings:

```tsx
<label className="settings-checkbox">
  <input
    aria-label="应用内横幅提醒"
    type="checkbox"
    checked={chatPreferences.showInAppBannerNotifications}
    onChange={(event) =>
      onChange((current) => ({
        ...current,
        chat: {
          ...defaultChatPreferences,
          ...(current.chat ?? {}),
          showInAppBannerNotifications: event.currentTarget.checked,
        },
      }))
    }
  />
  <span>应用内横幅提醒</span>
</label>
<p className="settings-field-hint">
  开启后，收到非当前会话的单聊消息或文件投递时，会在主窗口显示横幅。
</p>
```

- [ ] **Step 2: Preserve existing update patterns while merging defaults**

For each existing chat setting update in this section, change:

```ts
chat: {
  ...(current.chat ?? defaultChatPreferences),
  enterToSend: event.currentTarget.checked,
},
```

to:

```ts
chat: {
  ...defaultChatPreferences,
  ...(current.chat ?? {}),
  enterToSend: event.currentTarget.checked,
},
```

Apply the same pattern to:

- `confirmBeforeBroadcast`
- `autoSwitchToIncomingDirect`
- `autoSwitchToIncomingDelivery`

This prevents a partial old `current.chat` object from being written back without the new field.

## Task 4: Gate banner display by the new setting

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update the banner condition**

Replace:

```ts
const shouldShowBanner =
  isIncomingFromKnownDevice &&
  currentState.selectedDeviceId !== message.from_device_id &&
  (message.kind === "direct" || message.kind === "delivery");
```

with:

```ts
const shouldShowBanner =
  currentChatPreferences.showInAppBannerNotifications &&
  isIncomingFromKnownDevice &&
  currentState.selectedDeviceId !== message.from_device_id &&
  (message.kind === "direct" || message.kind === "delivery");
```

Keep the existing auto-switch branch before this logic. Auto-switch remains higher priority than banner display.

- [ ] **Step 2: Run focused tests and confirm GREEN**

Run:

```powershell
npm.cmd run test -- app-shell
```

Expected:

```text
Test Files  1 passed
Tests       111 passed
```

The exact test count may be higher if other tests were added, but all `app-shell` tests must pass.

## Task 5: Update README and run full verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update MVP feature wording**

Change:

```md
- 应用内横幅提醒（单聊消息 / 文件投递，非当前会话时弹出）
```

to:

```md
- 应用内横幅提醒（单聊消息 / 文件投递，非当前会话时弹出，可在聊天与通知中开关）
```

- [ ] **Step 2: Update current progress wording**

Change:

```md
- ✅ 应用内横幅提醒（单聊消息 / 文件投递仅在非当前会话时弹出，支持查看 / 关闭与 6 秒自动消失）
```

to:

```md
- ✅ 应用内横幅提醒（单聊消息 / 文件投递仅在非当前会话时弹出，支持查看 / 关闭、6 秒自动消失与设置开关）
```

- [ ] **Step 3: Update settings capability summary**

In the “当前已接入的设置能力” section, change the chat line to include `应用内横幅提醒开关`:

```md
- 聊天与通知：Enter 发送消息、广播前确认、应用内横幅提醒开关、收到单聊自动切换到来源会话、收到文件投递自动切换到来源会话
```

- [ ] **Step 4: Verify README sync**

Run:

```powershell
rg -n "应用内横幅提醒|应用内横幅提醒开关" README.md
```

Expected: output includes the MVP feature, current progress, and settings capability summary.

- [ ] **Step 5: Run full verification**

Run:

```powershell
npm.cmd run test
```

Expected:

```text
Test Files  3 passed
Tests       passed
```

Then run:

```powershell
cargo check
```

Expected:

```text
Finished `dev` profile
```

## Self-Review

- Spec coverage:
  - 设置页入口由 Task 1 和 Task 3 覆盖。
  - 默认开启和旧配置兼容由 Task 1 和 Task 2 覆盖。
  - 关闭后抑制单聊/文件投递横幅由 Task 1 和 Task 4 覆盖。
  - 不影响未读和待接收由 Task 1 覆盖。
  - README 同步由 Task 5 覆盖。
- Placeholder scan:
  - 本计划未保留空泛步骤。
- Type consistency:
  - `ChatPreferences` 新字段统一命名为 `showInAppBannerNotifications`。
  - 所有读取旧 chat 设置的位置都使用 `...defaultChatPreferences, ...(chat ?? {})` 合并。
