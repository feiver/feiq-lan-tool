# Contact Pending Delivery Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-23）：**
> - 已完成：联系人“待接收”投递提示设计已收敛，采用与未读数字并存的方案
> - 已完成：联系人待接收状态推导、卡片标记展示与回归验证
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "shows pending delivery indicator for the sender when incoming delivery needs a decision|keeps pending delivery indicator after opening the sender session|removes pending delivery indicator after accepting the delivery|removes pending delivery indicator after rejecting the delivery|shows pending delivery indicator together with the unread badge"`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`
> - 已验证：`cargo check`

**Goal:** 为联系人列表增加“待接收”投递提示，让用户能在会话外识别谁有待处理的文件请求。

**Architecture:** 基于现有 `messages` 在 `App.tsx` 中推导联系人级待接收状态，只识别来自其他设备且当前最新状态为 `PendingDecision` 的文件投递；联系人卡片继续显示未读数字，并额外渲染“待接收”标记。点击联系人不清除此提示，只有投递状态变化后才移除。

**Tech Stack:** React 19, TypeScript, Zustand, Tauri 2, Rust, Vitest, Testing Library

---

### Task 1: 锁定联系人待接收提示行为

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 写“收到入站 PendingDecision 投递时显示联系人待接收标记”的失败测试**
- [x] **Step 2: 运行定向测试并确认先失败**
- [x] **Step 3: 写“点击联系人进入会话后待接收标记仍保留”的失败测试**
- [x] **Step 4: 运行定向测试并确认先失败**
- [x] **Step 5: 写“接收投递后待接收标记消失”的失败测试**
- [x] **Step 6: 运行定向测试并确认先失败**
- [x] **Step 7: 写“取消投递后待接收标记消失”的失败测试**
- [x] **Step 8: 运行定向测试并确认先失败**
- [x] **Step 9: 写“未读数字和待接收标记可以并存”的失败测试**
- [x] **Step 10: 运行定向测试并确认先失败**

### Task 2: 在主界面推导联系人待接收状态

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\App.tsx`

- [x] **Step 1: 新增辅助逻辑，按 `request_id` 汇总入站文件投递的最新状态**
- [x] **Step 2: 基于最新状态计算联系人级“待接收”集合**
- [x] **Step 3: 只保留来自其他设备且当前为 `PendingDecision` 的投递**
- [x] **Step 4: 将联系人待接收状态传给 `ContactsPanel`**

### Task 3: 在联系人卡片渲染“待接收”标记

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\contacts\ContactsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\styles\app.css`

- [x] **Step 1: 让 `ContactsPanel` 接收联系人待接收状态**
- [x] **Step 2: 在联系人卡片中渲染固定文案“待接收”标记**
- [x] **Step 3: 保持未读数字与待接收标记可以并存**
- [x] **Step 4: 调整样式，保证联系人主信息、未读数字和待接收标记层级清晰**

### Task 4: 回归验证与文档同步

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\specs\2026-04-23-contact-pending-delivery-indicator-design.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-23-contact-pending-delivery-indicator.md`

- [x] **Step 1: 运行联系人待接收提示相关定向测试**
- [x] **Step 2: 运行 `npm.cmd run test -- app-shell`**
- [x] **Step 3: 运行 `npm.cmd run test`**
- [x] **Step 4: 运行 `cargo check`**
- [x] **Step 5: 在 README 中同步“联系人待接收投递提示”功能点与当前进度**
