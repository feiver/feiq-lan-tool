# Contact Unread Indicators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-23）：**
> - 已完成：联系人列表未读提示设计已收敛，采用“未读数字”方案
> - 已完成：未读状态接入 store、联系人卡片展示、点击联系人清零
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "shows unread badge for the sender when incoming direct message stays in another session|clears unread badge after opening the sender session|does not add unread badge when message arrives in the active session|does not add unread badge for incoming broadcast messages|shows unread badge for incoming delivery when delivery auto switch is disabled"`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`
> - 已验证：`cargo check`

**Goal:** 为联系人列表增加最小可用的未读数字提示，补足关闭自动切换时的消息提醒缺口。

**Architecture:** 在 Zustand store 中新增按 `device_id` 维护的未读计数映射；主界面在接收来自其他设备的单聊或文件投递消息时，根据当前选中会话决定是否累加；联系人列表展示未读数字，用户点击对应联系人后立即清零。保持广播消息、消息持久化结构和 Rust 模型不变。

**Tech Stack:** React 19, TypeScript, Zustand, Tauri 2, Rust, Vitest, Testing Library

---

### Task 1: 先锁定未读提示行为

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 写“收到非当前会话单聊后显示联系人未读数字”的失败测试**
- [x] **Step 2: 运行定向测试并确认先失败**
- [x] **Step 3: 写“点击联系人后清除未读数字”的失败测试**
- [x] **Step 4: 运行定向测试并确认先失败**
- [x] **Step 5: 写“当前会话收到消息不增加未读”的失败测试**
- [x] **Step 6: 运行定向测试并确认先失败**
- [x] **Step 7: 写“广播消息不产生联系人未读”的失败测试**
- [x] **Step 8: 运行定向测试并确认先失败**
- [x] **Step 9: 写“文件投递未自动切换时显示联系人未读数字”的失败测试**
- [x] **Step 10: 运行定向测试并确认先失败**

### Task 2: 在 store 中接入联系人未读状态

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\app\store.ts`

- [x] **Step 1: 新增 `contactUnreadCounts` 状态，按 `device_id` 保存未读数字**
- [x] **Step 2: 新增“增加联系人未读”和“清除联系人未读”的 store 方法**
- [x] **Step 3: 让 `selectDevice` 在切换联系人时清除对应未读**
- [x] **Step 4: 让 `setDevices` 在联系人离线后清理多余未读状态**

### Task 3: 把未读逻辑接到主界面与联系人列表

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\App.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\contacts\ContactsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\styles\app.css`

- [x] **Step 1: 在 `App.tsx` 读取并传递联系人未读状态**
- [x] **Step 2: 在 `chat-message-received` 里给未当前选中的单聊来源联系人增加未读**
- [x] **Step 3: 在 `chat-message-received` 里给未当前选中的文件投递来源联系人增加未读**
- [x] **Step 4: 保持广播消息、本机消息和已自动切换场景不增加未读**
- [x] **Step 5: 在 `ContactsPanel.tsx` 联系人卡片中渲染未读数字徽标**
- [x] **Step 6: 在 `app.css` 中补充未读徽标样式，保持当前视觉层级不被破坏**

### Task 4: 回归验证与文档同步

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\specs\2026-04-23-contact-unread-indicators-design.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-23-contact-unread-indicators.md`

- [x] **Step 1: 运行联系人未读提示相关定向测试**
- [x] **Step 2: 运行 `npm.cmd run test -- app-shell`**
- [x] **Step 3: 运行 `npm.cmd run test`**
- [x] **Step 4: 运行 `cargo check`**
- [x] **Step 5: 在 README 中同步“联系人未读提示”功能点与当前进度**
