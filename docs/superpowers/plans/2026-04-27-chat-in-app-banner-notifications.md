# Chat In-App Banner Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为单聊消息和文件投递新增首版应用内横幅提醒，仅在非当前会话事件到来时弹出，并提供 `查看` / `关闭` 两个动作。

**Architecture:** 在 `App.tsx` 中基于现有 `chat-message-received` 事件流维护单条横幅状态和 6 秒自动消失定时器；新增独立横幅组件负责渲染；测试通过 `app-shell` 锁定“非当前会话提醒、当前会话不提醒、覆盖旧横幅、查看切会话、关闭不清未读、自动消失、广播不提醒”这些行为。

**Tech Stack:** React 19、TypeScript、Vitest、Testing Library、Zustand、Tauri 2。

---

## File Structure

- Modify: `src/App.tsx`
  - 新增横幅状态、定时器和消息事件到横幅的触发逻辑。
  - 将 `查看` / `关闭` 行为接回现有会话切换。
- Create: `src/desktop/modules/chat/InAppNotificationBanner.tsx`
  - 单独渲染横幅标题和两个动作按钮。
- Modify: `src/styles/app.css`
  - 新增横幅固定定位和按钮样式。
- Modify: `src/test/app-shell.test.tsx`
  - 增加提醒行为测试。
- Modify: `README.md`
  - 同步首版应用内横幅提醒能力。

## Task 1: Lock behavior with failing tests

**Files:**
- Modify: `src/test/app-shell.test.tsx`

- [ ] **Step 1: Add a non-current direct message banner test**

在联系人摘要测试后追加：

```tsx
test("shows in-app banner for direct messages from a non-active contact", async () => {
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

  render(<App />);

  await screen.findByText("当前会话：Alice");

  act(() => {
    eventListeners.get("chat-message-received")?.({
      payload: {
        message_id: "banner-direct-1",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "Bob 新消息",
        sent_at_ms: 1100,
        kind: "direct",
      },
    });
  });

  expect(screen.getByText("Bob 发来新消息")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "查看" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "关闭" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Add current-session suppression and broadcast suppression tests**

继续追加：

```tsx
test("does not show in-app banner for the active session", async () => {
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
  ]);

  render(<App />);

  await screen.findByText("当前会话：Alice");

  act(() => {
    eventListeners.get("chat-message-received")?.({
      payload: {
        message_id: "banner-direct-active-1",
        from_device_id: "device-a",
        to_device_id: "local-device",
        content: "Alice 当前会话消息",
        sent_at_ms: 1101,
        kind: "direct",
      },
    });
  });

  expect(screen.queryByText("Alice 发来新消息")).not.toBeInTheDocument();
});

test("does not show in-app banner for broadcast messages", async () => {
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
  ]);

  render(<App />);

  await screen.findByText("当前会话：Alice");

  act(() => {
    eventListeners.get("chat-message-received")?.({
      payload: {
        message_id: "banner-broadcast-1",
        from_device_id: "device-a",
        to_device_id: "*",
        content: "广播消息",
        sent_at_ms: 1102,
        kind: "broadcast",
      },
    });
  });

  expect(screen.queryByText("Alice 发来新消息")).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Add delivery banner, replace, close, open, and auto-dismiss tests**

继续追加：

```tsx
test("shows in-app banner for delivery from a non-active contact", async () => {
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

  render(<App />);

  await screen.findByText("当前会话：Alice");

  act(() => {
    eventListeners.get("chat-message-received")?.({
      payload: {
        message_id: "banner-delivery-1",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "delivery",
        sent_at_ms: 1103,
        kind: "delivery",
        delivery: {
          request_id: "banner-delivery-1",
          status: "PendingDecision",
          save_root: null,
          entries: [
            {
              entry_id: "banner-delivery-entry-1",
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

  expect(screen.getByText("Bob 发来文件投递")).toBeInTheDocument();
});

test("replaces the current banner with the latest one", async () => {
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

  render(<App />);

  await screen.findByText("当前会话：Alice");

  act(() => {
    eventListeners.get("chat-message-received")?.({
      payload: {
        message_id: "banner-replace-1",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "msg",
        sent_at_ms: 1104,
        kind: "direct",
      },
    });
  });

  expect(screen.getByText("Bob 发来新消息")).toBeInTheDocument();

  act(() => {
    eventListeners.get("chat-message-received")?.({
      payload: {
        message_id: "banner-replace-2",
        from_device_id: "device-a",
        to_device_id: "local-device",
        content: "msg",
        sent_at_ms: 1105,
        kind: "delivery",
        delivery: {
          request_id: "banner-replace-2",
          status: "PendingDecision",
          save_root: null,
          entries: [
            {
              entry_id: "banner-replace-entry-2",
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

  expect(screen.queryByText("Bob 发来新消息")).not.toBeInTheDocument();
  expect(screen.getByText("Alice 发来文件投递")).toBeInTheDocument();
});

test("opens the related session when clicking view on the banner", async () => {
  const user = userEvent.setup();

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

  render(<App />);

  await screen.findByText("当前会话：Alice");

  act(() => {
    eventListeners.get("chat-message-received")?.({
      payload: {
        message_id: "banner-open-1",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "Bob 新消息",
        sent_at_ms: 1106,
        kind: "direct",
      },
    });
  });

  await user.click(screen.getByRole("button", { name: "查看" }));

  await waitFor(() => {
    expect(screen.getByText("当前会话：Bob")).toBeInTheDocument();
    expect(screen.queryByText("Bob 发来新消息")).not.toBeInTheDocument();
  });
});

test("closes the banner without clearing unread state", async () => {
  const user = userEvent.setup();

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

  render(<App />);

  await screen.findByText("当前会话：Alice");

  act(() => {
    eventListeners.get("chat-message-received")?.({
      payload: {
        message_id: "banner-close-1",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "Bob 新消息",
        sent_at_ms: 1107,
        kind: "direct",
      },
    });
  });

  await user.click(screen.getByRole("button", { name: "关闭" }));

  const bobButton = screen.getByRole("button", { name: /Bob/ });
  expect(screen.queryByText("Bob 发来新消息")).not.toBeInTheDocument();
  expect(within(bobButton).getByLabelText("未读 1 条")).toBeInTheDocument();
});

test("auto dismisses the banner after six seconds", async () => {
  vi.useFakeTimers();
  try {
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

    render(<App />);

    await screen.findByText("当前会话：Alice");

    act(() => {
      eventListeners.get("chat-message-received")?.({
        payload: {
          message_id: "banner-timeout-1",
          from_device_id: "device-b",
          to_device_id: "local-device",
          content: "Bob 新消息",
          sent_at_ms: 1108,
          kind: "direct",
        },
      });
    });

    expect(screen.getByText("Bob 发来新消息")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(screen.queryByText("Bob 发来新消息")).not.toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});
```

- [ ] **Step 4: Run the focused suite and confirm RED**

Run:

```powershell
npm.cmd run test -- app-shell
```

Expected:

```text
FAIL src/test/app-shell.test.tsx
```

New failures should point to missing banner UI and event-to-banner logic, not to syntax errors in the tests.

## Task 2: Add a dedicated banner component

**Files:**
- Create: `src/desktop/modules/chat/InAppNotificationBanner.tsx`

- [ ] **Step 1: Create the banner component with a narrow prop contract**

Create:

```tsx
type InAppNotificationBannerProps = {
  title: string;
  onOpen: () => void;
  onDismiss: () => void;
};

export function InAppNotificationBanner({
  title,
  onOpen,
  onDismiss,
}: InAppNotificationBannerProps) {
  return (
    <section className="in-app-banner" aria-live="polite">
      <div className="in-app-banner__content">
        <strong>{title}</strong>
      </div>
      <div className="in-app-banner__actions">
        <button type="button" onClick={onOpen}>
          查看
        </button>
        <button type="button" onClick={onDismiss}>
          关闭
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Keep the component presentational only**

Do not put timers, filtering, or device lookup in the component. If you need more than `title`, `onOpen`, and `onDismiss`, stop and re-check the boundary before editing other files.

## Task 3: Wire banner state and trigger logic in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import the new banner component**

Add:

```tsx
import { InAppNotificationBanner } from "./desktop/modules/chat/InAppNotificationBanner";
```

- [ ] **Step 2: Add banner state and timer refs**

Near the existing local state:

```tsx
type InAppBannerState = {
  deviceId: string;
  title: string;
};

const [inAppBanner, setInAppBanner] = useState<InAppBannerState | null>(null);
const bannerTimerRef = useRef<number | null>(null);
```

And in the cleanup effect:

```tsx
  useEffect(
    () => () => {
      if (discoveryRefreshTimerRef.current !== null) {
        window.clearTimeout(discoveryRefreshTimerRef.current);
      }
      if (bannerTimerRef.current !== null) {
        window.clearTimeout(bannerTimerRef.current);
      }
    },
    [],
  );
```

- [ ] **Step 3: Add banner helper functions**

Below the existing local handlers:

```tsx
  function clearInAppBanner() {
    if (bannerTimerRef.current !== null) {
      window.clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }

    setInAppBanner(null);
  }

  function showInAppBanner(nextBanner: InAppBannerState) {
    if (bannerTimerRef.current !== null) {
      window.clearTimeout(bannerTimerRef.current);
    }

    setInAppBanner(nextBanner);
    bannerTimerRef.current = window.setTimeout(() => {
      bannerTimerRef.current = null;
      setInAppBanner(null);
    }, 6000);
  }

  function handleOpenBanner() {
    if (!inAppBanner) {
      return;
    }

    selectDevice(inAppBanner.deviceId);
    clearInAppBanner();
  }
```

- [ ] **Step 4: Trigger banners inside the existing chat listener**

Inside the `listen<ChatMessage>("chat-message-received"...` effect, after unread increment logic, add:

```tsx
      const shouldShowBanner =
        isIncomingFromKnownDevice &&
        currentState.selectedDeviceId !== message.from_device_id &&
        (message.kind === "direct" || message.kind === "delivery");

      if (shouldShowBanner) {
        const sourceDevice = currentState.devices.find(
          (device) => device.device_id === message.from_device_id,
        );

        if (sourceDevice) {
          showInAppBanner({
            deviceId: sourceDevice.device_id,
            title:
              message.kind === "delivery"
                ? `${sourceDevice.nickname} 发来文件投递`
                : `${sourceDevice.nickname} 发来新消息`,
          });
        }
      }
```

Keep the existing auto-switch branch first, so auto-switch still suppresses the banner by returning early.

- [ ] **Step 5: Render the banner in the main shell**

In the main `return`, add the banner above the shell columns:

```tsx
    <main className="app-shell">
      {inAppBanner ? (
        <InAppNotificationBanner
          title={inAppBanner.title}
          onOpen={handleOpenBanner}
          onDismiss={clearInAppBanner}
        />
      ) : null}
      <div className="left-column">
```

- [ ] **Step 6: Run the focused suite and confirm GREEN on logic**

Run:

```powershell
npm.cmd run test -- app-shell
```

Expected:

```text
PASS src/test/app-shell.test.tsx
```

If a pre-existing test now fails because banner text duplicates another label, narrow the assertion to the correct container rather than weakening the feature.

## Task 4: Style the banner for a stable fixed layout

**Files:**
- Modify: `src/styles/app.css`

- [ ] **Step 1: Add fixed-position banner styles**

Add near the top-level shell rules:

```css
.in-app-banner {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 20;
  width: min(360px, calc(100vw - 32px));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.94);
  color: #f8fafc;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.24);
}

.in-app-banner__content {
  min-width: 0;
  flex: 1;
}

.in-app-banner__content strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: inherit;
}

.in-app-banner__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.in-app-banner__actions button {
  border: 0;
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.in-app-banner__actions button:first-child {
  background: #2563eb;
  color: #ffffff;
}

.in-app-banner__actions button:last-child {
  background: rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
}
```

- [ ] **Step 2: Add a small-screen adjustment**

At the responsive section near the bottom:

```css
  .in-app-banner {
    left: 16px;
    right: 16px;
    width: auto;
    align-items: flex-start;
    flex-direction: column;
  }

  .in-app-banner__actions {
    width: 100%;
    justify-content: flex-end;
  }
```

- [ ] **Step 3: Re-run the focused app-shell suite**

Run:

```powershell
npm.cmd run test -- app-shell
```

Expected:

```text
Test Files  1 passed
```

## Task 5: Update README and verify the full app

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add the capability to the feature list**

In `## MVP 功能点`, add:

```md
- 应用内横幅提醒（单聊消息 / 文件投递，非当前会话时弹出）
```

Place it near the existing chat notification bullets.

- [ ] **Step 2: Add the capability to current progress**

In `#### 发现与消息能力`, add:

```md
- ✅ 应用内横幅提醒（单聊消息 / 文件投递仅在非当前会话时弹出，支持查看 / 关闭与 6 秒自动消失）
```

- [ ] **Step 3: Verify README sync**

Run:

```powershell
rg -n "应用内横幅提醒" README.md
```

Expected:

```text
README.md:<line>:- 应用内横幅提醒（单聊消息 / 文件投递，非当前会话时弹出）
README.md:<line>:- ✅ 应用内横幅提醒（单聊消息 / 文件投递仅在非当前会话时弹出，支持查看 / 关闭与 6 秒自动消失）
```

- [ ] **Step 4: Run full verification**

Run:

```powershell
npm.cmd run test
```

Expected:

```text
Test Files  passed
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
  - 单聊与文件投递范围由 Task 1 和 Task 3 覆盖。
  - 当前会话不提醒、广播不提醒由 Task 1 覆盖。
  - 单条横幅覆盖旧横幅、6 秒自动关闭由 Task 1 和 Task 3 覆盖。
  - `查看` / `关闭` 行为由 Task 1 和 Task 3 覆盖。
  - 固定定位和稳定尺寸由 Task 4 覆盖。
  - README 同步由 Task 5 覆盖。
- Placeholder scan:
  - 本计划未保留未定义步骤。
- Type consistency:
  - 横幅状态统一为 `InAppBannerState | null`。
  - 新组件只接收 `title`、`onOpen`、`onDismiss`，状态逻辑只在 `App.tsx`。
