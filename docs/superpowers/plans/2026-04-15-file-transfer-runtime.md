# File Transfer Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the runtime incoming file-transfer path so the desktop app can receive a file, persist it to disk, and show live transfer progress in the transfers panel.

**Architecture:** Keep the byte-stream receive logic in the Rust library so it stays testable without Tauri. Use the Tauri runtime layer only for the TCP listener, runtime settings lookup, and event emission. On the frontend, subscribe to transfer snapshot events and upsert tasks in the Zustand store so progress updates replace existing rows instead of duplicating them.

**Tech Stack:** Rust, Tauri 2 events/commands, React 19, TypeScript, Zustand, Vitest, cargo test

---

### Task 1: Frontend Transfer Event Subscription

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\App.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\app\store.ts`

- [ ] **Step 1: Write the failing test**

Add a test that renders `App`, triggers a mocked `transfer-updated` Tauri event, and expects the transfers panel to show the new file name plus progress.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- app-shell`
Expected: FAIL because `App` is not yet listening to the transfer event and the store cannot upsert transfer snapshots.

- [ ] **Step 3: Write minimal implementation**

Add a `setTransfers` or `upsertTransfer` action to the Zustand store and subscribe in `App` to a `transfer-updated` event that forwards the payload into the store.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- app-shell`
Expected: PASS and existing chat/device event tests remain green.

- [ ] **Step 5: Commit**

```bash
git add src/test/app-shell.test.tsx src/App.tsx src/app/store.ts
git commit -m "feat: 接入传输进度事件订阅"
```

### Task 2: Rust File Receive Core

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\tests\file_transfer_tests.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\file_transfer.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\app_state.rs`

- [ ] **Step 1: Write the failing test**

Add a Rust test that feeds bytes into the receive helper, writes to a temp file, and asserts the produced `TransferTask` snapshots reach completed state with the full byte count.

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test --test file_transfer_tests`
Expected: FAIL because the receive helper and transfer upsert path do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add a receive helper in `file_transfer.rs` plus `AppState` methods for inserting/updating transfer tasks by `transfer_id`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test --test file_transfer_tests`
Expected: PASS with existing send-file tests still green.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/tests/file_transfer_tests.rs src-tauri/src/file_transfer.rs src-tauri/src/app_state.rs
git commit -m "feat: 补齐文件接收核心能力"
```

### Task 3: Runtime Listener And Settings Sync

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\commands.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\runtime.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\main.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\api.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\App.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`

- [ ] **Step 1: Write the failing test**

Use the already-added frontend event test plus a Rust test for transfer snapshots as the red bar. If needed, add a focused runtime-state test for settings sync.

- [ ] **Step 2: Run tests to verify they fail correctly**

Run:
- `npm.cmd run test -- app-shell`
- `cargo test --test file_transfer_tests`

Expected: failures point to missing runtime event emission and missing runtime settings sync.

- [ ] **Step 3: Write minimal implementation**

Add a Tauri command to sync runtime settings, start a file listener in `runtime.rs`, write incoming files into the configured download directory, and emit `transfer-updated` snapshots as bytes arrive.

- [ ] **Step 4: Run verification**

Run:
- `npm.cmd run test -- app-shell`
- `npm.cmd run build`
- `cargo test`

Expected: all commands PASS.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands.rs src-tauri/src/runtime.rs src-tauri/src/main.rs src/desktop/api.ts src/App.tsx README.md
git commit -m "feat: 接入文件传输接收链路"
```
