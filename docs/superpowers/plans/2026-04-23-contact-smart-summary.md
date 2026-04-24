# Contact Smart Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为联系人列表新增单行智能摘要，按“待接收文件 > 传输中 > 有未读消息 > 最近消息预览”的优先级展示联系人当前最重要状态。

**Architecture:** 在 `App.tsx` 中从现有 `messages`、`transfers`、`contactUnreadCounts` 和本机 `deviceId` 推导 `contactSummaries`，再传给 `ContactsPanel` 展示。`ContactsPanel` 只负责渲染，不理解消息、投递或传输规则。

**Tech Stack:** React 19、TypeScript、Zustand、Vitest、Testing Library、Tauri 2。

---

## File Structure

- Modify: `src/App.tsx`
  - 新增 `buildContactSummaries`、`formatLatestMessagePreview`、`isDirectoryDelivery` 等纯函数。
  - 将 `contactSummaries` 传入 `ContactsPanel`。
- Modify: `src/desktop/modules/contacts/ContactsPanel.tsx`
  - 新增 `contactSummaries` prop。
  - 在联系人卡片中渲染单行摘要。
  - 辅助信息只显示 `status_message` 或 `host_name`。
- Modify: `src/styles/app.css`
  - 新增摘要文本和辅助信息样式。
  - 保证摘要单行省略，active 状态下颜色可读。
- Modify: `src/test/app-shell.test.tsx`
  - 以用户可见行为为断言新增 app-shell 测试。
  - 覆盖四级摘要优先级、最近消息方向、文件/目录短文案、点击联系人后的未读回落。
- Modify: `README.md`
  - 在 MVP 功能点和当前进度中补充联系人单行智能摘要。

## Task 1: Add failing app-shell coverage

**Files:**
- Modify: `src/test/app-shell.test.tsx`

- [ ] **Step 1: Add tests for summary priority and message previews**

在现有联系人未读 / 待接收测试附近新增以下测试。测试使用现有 mock、`eventListeners`、`useAppStore` 和 `within`。

```tsx
test("shows pending delivery as the highest priority contact summary", async () => {
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
  mockedListTransfers.mockResolvedValue([
    {
      transfer_id: "tx-bob-1",
      file_name: "archive.zip",
      file_size: 100,
      transferred_bytes: 40,
      from_device_id: "device-b",
      to_device_id: "local-device",
      status: "InProgress",
    },
  ]);
  mockedListMessages.mockResolvedValue([
    {
      message_id: "delivery-bob-1",
      from_device_id: "device-b",
      to_device_id: "local-device",
      content: "Bob 文件投递",
      sent_at_ms: 1010,
      kind: "delivery",
      delivery: {
        request_id: "delivery-bob-1",
        status: "PendingDecision",
        save_root: null,
        entries: [
          {
            entry_id: "entry-bob-1",
            display_name: "demo.txt",
            relative_path: "demo.txt",
            file_size: 12,
            kind: "File",
          },
        ],
      },
    },
  ]);

  render(<App />);

  const bobButton = await screen.findByRole("button", { name: /Bob/ });

  expect(within(bobButton).getByText("待接收")).toBeInTheDocument();
  expect(within(bobButton).getByText("待接收文件")).toBeInTheDocument();
  expect(within(bobButton).queryByText("传输中")).not.toBeInTheDocument();
});

test("shows transfer summary before unread summary", async () => {
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
  mockedListTransfers.mockResolvedValue([
    {
      transfer_id: "tx-bob-2",
      file_name: "archive.zip",
      file_size: 100,
      transferred_bytes: 40,
      from_device_id: "device-b",
      to_device_id: "local-device",
      status: "InProgress",
    },
  ]);

  render(<App />);

  await screen.findByText("当前会话：Alice");
  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "unread-bob-1",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "Bob 未读消息",
        sent_at_ms: 1020,
        kind: "direct",
        delivery: null,
      },
    });
  });

  const bobButton = screen.getByRole("button", { name: /Bob/ });

  await waitFor(() => {
    expect(within(bobButton).getByLabelText("未读 1 条")).toBeInTheDocument();
    expect(within(bobButton).getByText("传输中")).toBeInTheDocument();
    expect(within(bobButton).queryByText("有未读消息")).not.toBeInTheDocument();
  });
});

test("shows unread summary before latest message preview", async () => {
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
  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "unread-bob-2",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "这是最近消息",
        sent_at_ms: 1030,
        kind: "direct",
        delivery: null,
      },
    });
  });

  const bobButton = screen.getByRole("button", { name: /Bob/ });

  await waitFor(() => {
    expect(within(bobButton).getByText("有未读消息")).toBeInTheDocument();
    expect(within(bobButton).queryByText("对方：这是最近消息")).not.toBeInTheDocument();
  });
});

test("falls back to latest message preview after opening unread contact", async () => {
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
  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "unread-bob-3",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "打开后显示预览",
        sent_at_ms: 1040,
        kind: "direct",
        delivery: null,
      },
    });
  });

  const bobButton = screen.getByRole("button", { name: /Bob/ });

  await waitFor(() => {
    expect(within(bobButton).getByText("有未读消息")).toBeInTheDocument();
  });

  await userEvent.click(bobButton);

  await waitFor(() => {
    expect(within(bobButton).queryByLabelText("未读 1 条")).not.toBeInTheDocument();
    expect(within(bobButton).getByText("对方：打开后显示预览")).toBeInTheDocument();
  });
});

test("shows outgoing latest message preview with self direction", async () => {
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
  mockedListMessages.mockResolvedValue([
    {
      message_id: "outgoing-alice-1",
      from_device_id: "local-device",
      to_device_id: "device-a",
      content: "我发出的消息",
      sent_at_ms: 1050,
      kind: "direct",
      delivery: null,
    },
  ]);

  render(<App />);

  const aliceButton = await screen.findByRole("button", { name: /Alice/ });

  expect(within(aliceButton).getByText("你：我发出的消息")).toBeInTheDocument();
});

test("uses short previews for delivery file and directory messages", async () => {
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
  mockedListMessages.mockResolvedValue([
    {
      message_id: "delivery-file-alice-1",
      from_device_id: "device-a",
      to_device_id: "local-device",
      content: "Alice 文件",
      sent_at_ms: 1051,
      kind: "delivery",
      delivery: {
        request_id: "delivery-file-alice-1",
        status: "Completed",
        save_root: null,
        entries: [
          {
            entry_id: "file-entry-1",
            display_name: "very-long-file-name.txt",
            relative_path: "very-long-file-name.txt",
            file_size: 12,
            kind: "File",
          },
        ],
      },
    },
    {
      message_id: "delivery-dir-bob-1",
      from_device_id: "device-b",
      to_device_id: "local-device",
      content: "Bob 目录",
      sent_at_ms: 1052,
      kind: "delivery",
      delivery: {
        request_id: "delivery-dir-bob-1",
        status: "Completed",
        save_root: null,
        entries: [
          {
            entry_id: "dir-entry-1",
            display_name: "project-folder",
            relative_path: "project-folder",
            file_size: 0,
            kind: "Directory",
          },
        ],
      },
    },
  ]);

  render(<App />);

  const aliceButton = await screen.findByRole("button", { name: /Alice/ });
  const bobButton = await screen.findByRole("button", { name: /Bob/ });

  expect(within(aliceButton).getByText("对方：发送了文件")).toBeInTheDocument();
  expect(within(bobButton).getByText("对方：发送了目录")).toBeInTheDocument();
  expect(within(aliceButton).queryByText(/very-long-file-name/)).not.toBeInTheDocument();
  expect(within(bobButton).queryByText(/project-folder/)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run focused failing test command**

Run:

```powershell
npm.cmd run test -- app-shell
```

Expected:

```text
FAIL src/test/app-shell.test.tsx
```

At least the newly added summary tests should fail because `ContactsPanel` does not yet render smart summaries.

## Task 2: Implement contact summary derivation

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add transfer type import usage if needed**

`TransferTask` is already imported in `src/App.tsx`. Keep using the existing import:

```ts
import type {
  ChatMessage,
  DiscoveryRefreshHistoryEntry,
  KnownDevice,
  MessagePayload,
  TransferTask,
} from "./desktop/types";
```

- [ ] **Step 2: Derive summaries before rendering `ContactsPanel`**

Add this near the existing `pendingDeliveryIndicators` derivation:

```ts
  const contactSummaries = buildContactSummaries({
    messages,
    transfers,
    unreadCounts: contactUnreadCounts,
    localDeviceId: settings.runtime.deviceId,
  });
```

- [ ] **Step 3: Pass summaries to `ContactsPanel`**

Update the `ContactsPanel` invocation:

```tsx
        <ContactsPanel
          devices={devices}
          pendingDeliveryIndicators={pendingDeliveryIndicators}
          contactSummaries={contactSummaries}
          unreadCounts={contactUnreadCounts}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={selectDevice}
          onOpenSettings={() => void handleOpenSettings()}
        />
```

- [ ] **Step 4: Add summary helper types and functions**

Add these helper functions below `buildPendingDeliveryIndicators` in `src/App.tsx`:

```ts
type ContactSummaryInput = {
  messages: ChatMessage[];
  transfers: TransferTask[];
  unreadCounts: Record<string, number>;
  localDeviceId: string;
};

function buildContactSummaries({
  messages,
  transfers,
  unreadCounts,
  localDeviceId,
}: ContactSummaryInput): Record<string, string> {
  const summaries: Record<string, string> = {};
  const pendingDeliveryIndicators = buildPendingDeliveryIndicators(
    messages,
    localDeviceId,
  );

  for (const deviceId of Object.keys(pendingDeliveryIndicators)) {
    summaries[deviceId] = "待接收文件";
  }

  for (const transfer of transfers) {
    if (transfer.status !== "InProgress") {
      continue;
    }

    const contactDeviceId =
      transfer.from_device_id === localDeviceId
        ? transfer.to_device_id
        : transfer.from_device_id;

    if (!summaries[contactDeviceId]) {
      summaries[contactDeviceId] = "传输中";
    }
  }

  for (const [deviceId, unreadCount] of Object.entries(unreadCounts)) {
    if (unreadCount > 0 && !summaries[deviceId]) {
      summaries[deviceId] = "有未读消息";
    }
  }

  for (const message of [...messages].sort(
    (left, right) => right.sent_at_ms - left.sent_at_ms,
  )) {
    const contactDeviceId = getMessageContactDeviceId(message, localDeviceId);
    if (!contactDeviceId || summaries[contactDeviceId]) {
      continue;
    }

    const preview = formatLatestMessagePreview(message, localDeviceId);
    if (preview) {
      summaries[contactDeviceId] = preview;
    }
  }

  return summaries;
}

function getMessageContactDeviceId(
  message: ChatMessage,
  localDeviceId: string,
): string | null {
  if (message.kind === "broadcast") {
    return null;
  }

  if (message.from_device_id === localDeviceId) {
    return message.to_device_id;
  }

  if (message.to_device_id === localDeviceId) {
    return message.from_device_id;
  }

  return null;
}

function formatLatestMessagePreview(
  message: ChatMessage,
  localDeviceId: string,
): string | null {
  if (message.kind === "broadcast") {
    return null;
  }

  const direction = message.from_device_id === localDeviceId ? "你" : "对方";

  if (message.kind === "delivery") {
    const deliveryLabel = hasDirectoryDeliveryEntry(message)
      ? "发送了目录"
      : "发送了文件";
    return `${direction}：${deliveryLabel}`;
  }

  const content = message.content.trim();
  if (content) {
    return `${direction}：${content}`;
  }

  return direction === "你" ? "你：发出一条消息" : "对方：发来一条消息";
}

function hasDirectoryDeliveryEntry(message: ChatMessage): boolean {
  if (!message.delivery) {
    return false;
  }

  return message.delivery.entries.some((entry) => entry.kind === "Directory");
}
```

- [ ] **Step 5: Run TypeScript-related focused test again**

Run:

```powershell
npm.cmd run test -- app-shell
```

Expected:

```text
FAIL src/test/app-shell.test.tsx
```

Failures should now be limited to rendering-related expectations because `ContactsPanel` does not accept or display `contactSummaries` yet.

## Task 3: Render smart summary in ContactsPanel

**Files:**
- Modify: `src/desktop/modules/contacts/ContactsPanel.tsx`

- [ ] **Step 1: Extend component props**

Change the props type to include `contactSummaries`:

```ts
type ContactsPanelProps = {
  devices: KnownDevice[];
  pendingDeliveryIndicators: Record<string, boolean>;
  contactSummaries: Record<string, string>;
  unreadCounts: Record<string, number>;
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string) => void;
  onOpenSettings: () => void;
};
```

- [ ] **Step 2: Destructure the new prop**

Update the function signature:

```ts
export function ContactsPanel({
  devices,
  pendingDeliveryIndicators,
  contactSummaries,
  unreadCounts,
  selectedDeviceId,
  onSelectDevice,
  onOpenSettings,
}: ContactsPanelProps) {
```

- [ ] **Step 3: Render summary and compact auxiliary info**

Inside the `devices.map` callback, compute the summary and auxiliary label:

```tsx
          const summary = contactSummaries[device.device_id] || "暂无消息";
          const auxiliaryLabel = device.status_message || device.host_name;
```

Then replace the old host/status/IP spans with:

```tsx
              <span className="contact-summary">{summary}</span>
              <span className="contact-auxiliary">{auxiliaryLabel}</span>
```

The full contact card body should be:

```tsx
              <div className="contact-title-row">
                <strong>{device.nickname}</strong>
                {hasPendingDelivery ? (
                  <span className="contact-status-chip">待接收</span>
                ) : null}
              </div>
              <span className="contact-summary">{summary}</span>
              <span className="contact-auxiliary">{auxiliaryLabel}</span>
```

- [ ] **Step 4: Run focused test**

Run:

```powershell
npm.cmd run test -- app-shell
```

Expected:

```text
PASS src/test/app-shell.test.tsx
```

If existing tests fail because they expected `ip_addr` inside contact cards, update those assertions to use `host_name` or visible summary text. Do not reintroduce IP as a primary contact card field.

## Task 4: Style one-line summary

**Files:**
- Modify: `src/styles/app.css`

- [ ] **Step 1: Add summary and auxiliary styles**

Add these rules near existing `.contact-title-row` and `.contact-status-chip` rules:

```css
.contact-summary,
.contact-auxiliary {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact-summary {
  color: #243b5a;
  font-size: 14px;
  font-weight: 600;
}

.contact-auxiliary {
  color: #6b7c93;
  font-size: 12px;
}
```

- [ ] **Step 2: Add active-state colors**

Add these rules near the existing active contact styles:

```css
.contact-card.is-active .contact-summary {
  color: #ffffff;
}

.contact-card.is-active .contact-auxiliary {
  color: rgba(239, 246, 255, 0.78);
}
```

- [ ] **Step 3: Run focused test**

Run:

```powershell
npm.cmd run test -- app-shell
```

Expected:

```text
PASS src/test/app-shell.test.tsx
```

## Task 5: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update MVP feature list**

In `## MVP 功能点`, add this bullet after `联系人待接收投递提示`:

```md
- 联系人单行智能摘要（待接收文件 / 传输中 / 未读 / 最近消息预览）
```

- [ ] **Step 2: Update current progress**

In `#### 发现与消息能力`, add this bullet after `联系人待接收投递提示...`:

```md
- ✅ 联系人单行智能摘要（按待接收文件、传输中、未读、最近消息预览优先级展示）
```

- [ ] **Step 3: Run doc grep check**

Run:

```powershell
rg -n "联系人单行智能摘要" README.md
```

Expected:

```text
README.md:<line>:- 联系人单行智能摘要（待接收文件 / 传输中 / 未读 / 最近消息预览）
README.md:<line>:- ✅ 联系人单行智能摘要（按待接收文件、传输中、未读、最近消息预览优先级展示）
```

## Task 6: Final verification and PM closeout

**Files:**
- Modify: `.codex-orchestrator/tasks.json`
- Modify: `.codex-orchestrator/status.md`
- Modify: `.codex-orchestrator/progress.log`

- [ ] **Step 1: Run app-shell focused regression**

Run:

```powershell
npm.cmd run test -- app-shell
```

Expected:

```text
Test Files  1 passed
```

- [ ] **Step 2: Run full frontend regression**

Run:

```powershell
npm.cmd run test
```

Expected:

```text
Test Files  passed
```

- [ ] **Step 3: Run Rust compile verification**

Run:

```powershell
cargo check
```

Expected:

```text
Finished `dev` profile
```

- [ ] **Step 4: Update PM task table**

Set `T-002` to `completed`, set `T-003` to `completed` only after all verification commands pass, and record command evidence in `.codex-orchestrator/tasks.json`.

Use these values for `T-002`:

```json
{
  "status": "completed",
  "result": "DONE",
  "verification_result": "pass",
  "verification_summary": "实现计划已覆盖联系人单行智能摘要 spec 的验收标准。",
  "artifact": "docs/superpowers/plans/2026-04-23-contact-smart-summary.md"
}
```

Use these values for `T-003` after implementation verification passes:

```json
{
  "status": "completed",
  "result": "DONE",
  "verification_result": "pass",
  "verification_summary": "app-shell、前端回归和 cargo check 均通过。",
  "artifact": "src/App.tsx; src/desktop/modules/contacts/ContactsPanel.tsx; src/styles/app.css; src/test/app-shell.test.tsx; README.md"
}
```

- [ ] **Step 5: Update readable PM status**

Update `.codex-orchestrator/status.md` so the summary counts and `Recent Progress` reflect the completed implementation and verification evidence.

- [ ] **Step 6: Inspect git status**

Run:

```powershell
git -c safe.directory='D:/我的工作空间/feiq-lan-tool' status --short
```

Expected:

```text
M src/App.tsx
M src/desktop/modules/contacts/ContactsPanel.tsx
M src/styles/app.css
M src/test/app-shell.test.tsx
M README.md
```

The repository currently has many existing modified and untracked files. Do not stage or revert unrelated files.

## Self-Review

- Spec coverage:
  - 待接收文件摘要由 Task 1 和 Task 2 覆盖。
  - 传输中摘要由 Task 1 和 Task 2 覆盖。
  - 未读摘要和点击回落由 Task 1 覆盖。
  - 最近消息方向、文件/目录短文案由 Task 1 和 Task 2 覆盖。
  - 联系人面板展示和单行样式由 Task 3 和 Task 4 覆盖。
  - README 同步由 Task 5 覆盖。
- Placeholder scan:
  - 本计划不包含未定义步骤。
- Type consistency:
  - `contactSummaries` 类型统一为 `Record<string, string>`。
  - `buildContactSummaries` 输入使用现有 `ChatMessage`、`TransferTask` 和 `Record<string, number>`。
  - `ContactsPanel` 只接收并渲染摘要，不推导业务规则。
