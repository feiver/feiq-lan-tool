# Chat Settings V1 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-23）：**
> - 已完成：开放“聊天与通知”设置分组，不再停留在占位态
> - 已完成：新增 `Enter 发送消息` 设置，并接入主聊天输入框
> - 已完成：新增 `广播前确认` 设置，并接入广播发送前确认
> - 已完成：前后端设置模型补充 `chat` 偏好并保持旧配置兼容
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "sends direct message on Enter when enter-to-send is enabled|cancels broadcast when confirm-before-broadcast is enabled and user rejects|shows chat settings and updates shared settings state"`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`
> - 已验证：`cargo check`

**Goal:** 让“聊天与通知”从设置骨架变成首版可用能力，优先接入两个能立即影响主界面发送行为的控制项：`Enter 发送消息` 与 `广播前确认`。

**Architecture:** 在前后端 `AppPreferences` 中补充 `chat` 偏好，保持默认值与旧配置回退兼容；设置页开放“聊天与通知”分组；主聊天面板根据 `enterToSend` 控制 Enter / Shift+Enter 行为，广播发送根据 `confirmBeforeBroadcast` 决定是否弹出确认框。

**Tech Stack:** React 19, TypeScript, Tauri 2, Rust, Vitest, Testing Library

---

### Task 1: 用测试锁定聊天设置首版行为

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 新增聊天设置分组状态更新测试**
- [x] **Step 2: 新增 Enter 发送消息行为测试**
- [x] **Step 3: 新增广播前确认拒绝路径测试**
- [x] **Step 4: 修正默认 `window.confirm` 测试基线，避免旧广播测试误失败**

### Task 2: 接入聊天设置模型与运行时行为

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\types.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\api.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\app\store.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\App.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\chat\ChatPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\models.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\settings_store.rs`

- [x] **Step 1: 增加 `chat` 偏好与默认值**
- [x] **Step 2: 保持旧配置文件读取兼容**
- [x] **Step 3: 开放聊天与通知设置分组**
- [x] **Step 4: 接入 Enter 发送消息**
- [x] **Step 5: 接入广播前确认**

### Task 3: 验证并同步文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-23-chat-settings-v1.md`

- [x] **Step 1: 运行新增聊天设置定向测试**
- [x] **Step 2: 运行完整 app-shell 验证**
- [x] **Step 3: 运行完整 Vitest 验证**
- [x] **Step 4: 运行 Rust `cargo check`**
- [x] **Step 5: 同步 README 与计划文档**
