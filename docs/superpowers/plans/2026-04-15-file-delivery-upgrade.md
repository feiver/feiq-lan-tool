# File Delivery Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the current single-file send flow into a two-stage file-delivery system that supports files, folders, and drag-and-drop while letting the receiver accept or cancel and choose a save directory.

**Architecture:** Introduce explicit delivery request / response models in the shared Rust protocol, thread them through the existing message runtime so delivery cards appear before any bytes are transferred, and keep real transfer I/O file-based with relative paths rebuilt under a receiver-chosen save root.

**Tech Stack:** Rust, Tauri 2, React 19, TypeScript, Zustand, Vitest, Testing Library, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-opener`

---

### Task 1: Shared Delivery Models And Protocol

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\models.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\app_state.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\tests\protocol_tests.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\tests\commands_tests.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\types.ts`

- [x] **Step 1: Write the failing Rust tests**

Add a request / response protocol roundtrip plus a state-update test:

```rust
#[test]
fn protocol_roundtrip_for_delivery_request() {
    let event = LanEvent::DeliveryRequest(DeliveryRequest {
        request_id: "req-1".into(),
        from_device_id: "device-a".into(),
        to_device_id: "device-b".into(),
        sent_at_ms: 1_712_000_200,
        entries: vec![DeliveryEntry {
            entry_id: "entry-file".into(),
            display_name: "报价单.xlsx".into(),
            relative_path: "报价单.xlsx".into(),
            file_size: 1024,
            kind: DeliveryEntryKind::File,
        }],
    });
    assert_eq!(decode_event(&encode_event(&event).expect("encode")).expect("decode"), event);
}

#[test]
fn app_state_can_update_delivery_message_status() {
    let state = AppState::default();
    state.push_message(ChatMessage {
        message_id: "msg-delivery-1".into(),
        from_device_id: "device-a".into(),
        to_device_id: "device-b".into(),
        content: "delivery request".into(),
        sent_at_ms: 1002,
        kind: "delivery".into(),
        delivery: Some(ChatDelivery {
            request_id: "req-1".into(),
            status: DeliveryStatus::PendingDecision,
            entries: vec![],
            save_root: None,
        }),
    });
    state.update_delivery_status("req-1", DeliveryStatus::Accepted, Some("D:/接收区".into()));
    assert_eq!(
        state.list_messages()[0].delivery.as_ref().expect("delivery").status,
        DeliveryStatus::Accepted
    );
}
```

- [x] **Step 2: Run the tests to verify RED**

Run:

```powershell
cargo test --test protocol_tests
cargo test --test commands_tests
```

Expected: FAIL because delivery models and state helpers do not exist.

- [x] **Step 3: Add the minimal shared models**

Update `src-tauri/src/models.rs` with:

```rust
pub enum DeliveryEntryKind { File, Directory }
pub struct DeliveryEntry { pub entry_id: String, pub display_name: String, pub relative_path: String, pub file_size: u64, pub kind: DeliveryEntryKind }
pub enum DeliveryStatus { PendingDecision, Accepted, Rejected, InProgress, Completed, Failed, PartialFailed }
pub struct ChatDelivery { pub request_id: String, pub status: DeliveryStatus, pub entries: Vec<DeliveryEntry>, pub save_root: Option<String> }
pub struct DeliveryRequest { pub request_id: String, pub from_device_id: String, pub to_device_id: String, pub sent_at_ms: i64, pub entries: Vec<DeliveryEntry> }
pub enum DeliveryDecision { Accepted, Rejected }
pub struct DeliveryResponse { pub request_id: String, pub from_device_id: String, pub to_device_id: String, pub decision: DeliveryDecision, pub save_root: Option<String> }
```

Extend `ChatMessage` and `LanEvent`:

```rust
pub struct ChatMessage { /* existing fields */, pub delivery: Option<ChatDelivery> }
pub enum LanEvent { DeviceAnnouncement(DeviceAnnouncement), DirectMessage(MessagePayload), BroadcastMessage(MessagePayload), DeliveryRequest(DeliveryRequest), DeliveryResponse(DeliveryResponse) }
```

- [x] **Step 4: Add the minimal AppState helper and TS mirrors**

In `src-tauri/src/app_state.rs`:

```rust
pub fn update_delivery_status(&self, request_id: &str, status: DeliveryStatus, save_root: Option<String>) {
    let mut messages = self.messages.write().expect("messages write lock");
    for message in messages.iter_mut() {
        if let Some(delivery) = message.delivery.as_mut() {
            if delivery.request_id == request_id {
                delivery.status = status.clone();
                if save_root.is_some() { delivery.save_root = save_root.clone(); }
            }
        }
    }
}
```

In `src/desktop/types.ts`:

```ts
export type DeliveryEntry = { entry_id: string; display_name: string; relative_path: string; file_size: number; kind: "File" | "Directory" };
export type ChatDelivery = { request_id: string; status: "PendingDecision" | "Accepted" | "Rejected" | "InProgress" | "Completed" | "Failed" | "PartialFailed"; entries: DeliveryEntry[]; save_root: string | null };
export type ChatMessage = { message_id: string; from_device_id: string; to_device_id: string; content: string; sent_at_ms: number; kind: "direct" | "broadcast" | "delivery"; delivery?: ChatDelivery | null };
```

- [x] **Step 5: Run the tests to verify GREEN**

Run:

```powershell
cargo test --test protocol_tests
cargo test --test commands_tests
```

Expected: PASS.

- [x] **Step 6: Commit**

```powershell
git add src-tauri/src/models.rs src-tauri/src/app_state.rs src-tauri/tests/protocol_tests.rs src-tauri/tests/commands_tests.rs src/desktop/types.ts
git commit -m "feat: 补齐文件投递共享模型"
```

### Task 2: Sender Selection, Grouping, And Pending Delivery UI

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\package.json`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\api.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\App.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\chat\ChatPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\styles\app.css`
- Create: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\chat\delivery.ts`
- Create: `D:\我的工作空间\feiq-lan-tool\src\test\delivery-selection.test.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: Install the dialog dependency**

Run:

```powershell
npm.cmd install @tauri-apps/plugin-dialog
```

Expected: `package.json` includes `@tauri-apps/plugin-dialog`.

- [x] **Step 2: Write the failing selection tests**

Create `src/test/delivery-selection.test.ts`:

```tsx
test("keeps folders grouped and files standalone", () => {
  const summary = summarizeDeliverySelection([
    { source_path: "C:/work/项目资料/图片/logo.png", display_name: "logo.png", relative_path: "项目资料/图片/logo.png", group_name: "项目资料", kind: "file", file_size: 2048 },
    { source_path: "C:/work/报价单.xlsx", display_name: "报价单.xlsx", relative_path: "报价单.xlsx", group_name: null, kind: "file", file_size: 1024 },
  ]);
  expect(summary.groups).toEqual([{ groupName: "项目资料", fileCount: 1 }]);
  expect(summary.files).toEqual([{ displayName: "报价单.xlsx", fileCount: 1 }]);
});
```

In `src/test/app-shell.test.tsx`, add:

```tsx
test("shows grouped folder and standalone files before sending", async () => {
  const user = userEvent.setup();
  mockedOpen.mockResolvedValue(["C:/work/报价单.xlsx", "C:/work/封面.png"]);
  render(<App />);
  await user.click(screen.getByRole("button", { name: "选择文件" }));
  await waitFor(() => {
    expect(screen.getByText("报价单.xlsx")).toBeInTheDocument();
    expect(screen.getByText("封面.png")).toBeInTheDocument();
  });
});
```

- [x] **Step 3: Run the tests to verify RED**

Run:

```powershell
npm.cmd run test -- delivery-selection app-shell
```

Expected: FAIL because there is no selection helper or pending delivery UI.

- [x] **Step 4: Add the minimal selection helper and picker wrappers**

Create `src/desktop/modules/chat/delivery.ts`:

```ts
export type PendingDeliveryEntry = { source_path: string; display_name: string; relative_path: string; group_name: string | null; kind: "file"; file_size: number };
export function summarizeDeliverySelection(entries: PendingDeliveryEntry[]) {
  const groupMap = new Map<string, number>();
  const files: { displayName: string; fileCount: number }[] = [];
  for (const entry of entries) {
    if (entry.group_name) groupMap.set(entry.group_name, (groupMap.get(entry.group_name) ?? 0) + 1);
    else files.push({ displayName: entry.display_name, fileCount: 1 });
  }
  return { groups: [...groupMap.entries()].map(([groupName, fileCount]) => ({ groupName, fileCount })), files };
}
```

In `src/desktop/api.ts`:

```ts
export async function pickFiles(): Promise<string[]> {
  const selected = await open({ directory: false, multiple: true });
  return Array.isArray(selected) ? selected.filter((item): item is string => typeof item === "string") : [];
}
export async function pickDirectory(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false });
  return typeof selected === "string" ? selected : null;
}
```

- [x] **Step 5: Implement the minimal pending delivery UI**

In `src/App.tsx`:

```tsx
const [pendingDeliveries, setPendingDeliveries] = useState<PendingDeliveryEntry[]>([]);
async function handlePickFiles() {
  const paths = await pickFiles();
  setPendingDeliveries(paths.map((path) => ({ source_path: path, display_name: path.split(/[\\/]/).at(-1) ?? path, relative_path: path.split(/[\\/]/).at(-1) ?? path, group_name: null, kind: "file", file_size: 0 })));
}
```

In `ChatPanel.tsx` render:

```tsx
<div className="delivery-actions">
  <button type="button" onClick={onPickFiles} disabled={!canPrepareDelivery}>选择文件</button>
  <button type="button" onClick={onPickDirectory} disabled={!canPrepareDelivery}>选择文件夹</button>
  <button type="button" onClick={onSendDelivery} disabled={!canSendDelivery}>发送投递</button>
</div>
```

Show the summary from `summarizeDeliverySelection(pendingDeliveries)`.

- [x] **Step 6: Run the tests to verify GREEN**

Run:

```powershell
npm.cmd run test -- delivery-selection app-shell
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add package.json src/desktop/api.ts src/App.tsx src/desktop/modules/chat/ChatPanel.tsx src/desktop/modules/chat/delivery.ts src/styles/app.css src/test/delivery-selection.test.ts src/test/app-shell.test.tsx
git commit -m "feat: 接入文件投递发送端选择流"
```

### Task 3: Delivery Cards, Receiver Decisions, Save Root, And Open Directory

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\commands.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\message_runtime.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\runtime.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\file_transfer.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\tests\message_runtime_tests.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\tests\file_transfer_tests.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\api.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\App.tsx`
- Create: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\chat\FileDeliveryCard.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\chat\ChatPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`

- [ ] **Step 1: Write the failing runtime and UI tests**

Add to `src-tauri/tests/message_runtime_tests.rs`:

```rust
#[test]
fn record_incoming_delivery_request_persists_pending_message() {
    let state = AppState::default();
    let message = record_incoming_message(&state, LanEvent::DeliveryRequest(DeliveryRequest {
        request_id: "req-1".into(),
        from_device_id: "device-a".into(),
        to_device_id: "local-device".into(),
        sent_at_ms: 1002,
        entries: vec![DeliveryEntry { entry_id: "entry-file".into(), display_name: "报价单.xlsx".into(), relative_path: "报价单.xlsx".into(), file_size: 1024, kind: DeliveryEntryKind::File }],
    })).expect("message");
    assert_eq!(message.delivery.expect("delivery").status, DeliveryStatus::PendingDecision);
}
```

Add to `src-tauri/tests/file_transfer_tests.rs`:

```rust
#[test]
fn build_delivery_output_path_keeps_relative_structure_under_save_root() {
    assert_eq!(
        build_delivery_output_path(std::path::Path::new("D:/接收区"), "项目资料/图片/logo.png"),
        std::path::PathBuf::from("D:/接收区/项目资料/图片/logo.png")
    );
}
```

In `src/test/app-shell.test.tsx`, add:

```tsx
test("shows accept and cancel on incoming delivery cards", async () => {
  render(<App />);
  const messageListener = eventListeners.get("chat-message-received");
  await act(async () => {
    messageListener?.({ payload: { message_id: "msg-delivery-1", from_device_id: "device-a", to_device_id: "local-device", content: "delivery request", sent_at_ms: 1002, kind: "delivery", delivery: { request_id: "req-1", status: "PendingDecision", save_root: null, entries: [{ entry_id: "entry-file", display_name: "报价单.xlsx", relative_path: "报价单.xlsx", file_size: 1024, kind: "File" }] } } });
  });
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "接收" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run:

```powershell
cargo test --test message_runtime_tests
cargo test --test file_transfer_tests
npm.cmd run test -- app-shell
```

Expected: FAIL because delivery events are ignored, there is no save-root path builder, and no delivery card UI exists.

- [ ] **Step 3: Add minimal request / response handling in Rust**

In `src-tauri/src/commands.rs` add:

```rust
#[tauri::command]
pub async fn send_delivery_response(addr: String, response: DeliveryResponse) -> Result<(), String> {
    send_message_event(&addr, LanEvent::DeliveryResponse(response)).await.map_err(|err| err.to_string())
}
```

In `src-tauri/src/message_runtime.rs` add `DeliveryRequest` / `DeliveryResponse` branches that create or update `ChatMessage { kind: "delivery", delivery: Some(...) }`.

In `src-tauri/src/file_transfer.rs` add:

```rust
pub fn build_delivery_output_path(save_root: &Path, relative_path: &str) -> PathBuf {
    relative_path.split('/').fold(save_root.to_path_buf(), |path, segment| path.join(segment))
}
```

- [ ] **Step 4: Add minimal frontend decision and open-directory wrappers**

In `src/desktop/api.ts` add:

```ts
export async function pickSaveDirectory(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false });
  return typeof selected === "string" ? selected : null;
}
export function openDirectory(path: string): Promise<void> {
  return openPath(path);
}
```

Create `FileDeliveryCard.tsx`:

```tsx
export function FileDeliveryCard({ message, isIncoming, onAccept, onReject, onOpenDirectory }: Props) {
  const delivery = message.delivery!;
  return (
    <div className="delivery-card">
      {delivery.entries.map((entry) => <div key={entry.entry_id}>{entry.kind === "Directory" ? `${entry.display_name}/` : entry.display_name}</div>)}
      {isIncoming && delivery.status === "PendingDecision" ? (
        <div className="delivery-card-actions">
          <button type="button" onClick={() => onAccept(delivery.request_id)}>接收</button>
          <button type="button" onClick={() => onReject(delivery.request_id)}>取消</button>
        </div>
      ) : null}
      {delivery.status === "Completed" && delivery.save_root ? (
        <button type="button" onClick={() => onOpenDirectory(delivery.save_root!)}>打开目录</button>
      ) : null}
    </div>
  );
}
```

In `App.tsx` add:

```tsx
async function handleAcceptDelivery(requestId: string) {
  const saveRoot = await pickSaveDirectory();
  if (!saveRoot || !activeDevice) return;
  await sendDeliveryResponse(`${activeDevice.ip_addr}:${activeDevice.message_port}`, {
    request_id: requestId,
    from_device_id: settings.deviceId,
    to_device_id: activeDevice.device_id,
    decision: "Accepted",
    save_root: saveRoot,
  });
}
```

- [ ] **Step 5: Run full verification**

Run:

```powershell
npm.cmd run test -- delivery-selection app-shell
npm.cmd run build
cargo test
```

Expected: PASS.

- [ ] **Step 6: Update README and commit**

Update README bullets to mention:

```md
- 文件投递请求 / 接收 / 取消
- 多文件、目录、拖拽上传
- 接收完成后打开目录
```

Then commit:

```powershell
git add src-tauri/src/commands.rs src-tauri/src/message_runtime.rs src-tauri/src/runtime.rs src-tauri/src/file_transfer.rs src-tauri/tests/message_runtime_tests.rs src-tauri/tests/file_transfer_tests.rs src/desktop/api.ts src/App.tsx src/desktop/modules/chat/FileDeliveryCard.tsx src/desktop/modules/chat/ChatPanel.tsx src/test/app-shell.test.tsx README.md
git commit -m "feat: 接入文件投递接收链路"
```
