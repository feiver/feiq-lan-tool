# Chat Session Behavior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-23）：**
> - 已完成：聊天与通知分组新增“收到单聊自动切换到来源会话”
> - 已完成：聊天与通知分组新增“收到文件投递自动切换到来源会话”
> - 已完成：主界面在接收单聊 / 投递消息时可按设置自动切换到来源会话
> - 已完成：前后端 `ChatPreferences` 扩展并保持旧配置兼容
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "switches to the sender session when incoming direct auto switch is enabled|keeps the current session when incoming direct auto switch is disabled|switches to the sender session when incoming delivery auto switch is enabled|shows chat settings and updates shared settings state"`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`
> - 已验证：`cargo check`

**Goal:** 为聊天与通知分组补充两项接收侧行为设置：收到单聊自动切换到来源会话、收到文件投递自动切换到来源会话。

**Architecture:** 扩展前后端 `ChatPreferences`，在设置页暴露两个开关，并在主界面 `chat-message-received` 事件处理里按消息类型和用户设置决定是否调用 `selectDevice`。保持旧配置兼容，不引入新的持久化结构或系统通知依赖。

**Tech Stack:** React 19, TypeScript, Zustand, Tauri 2, Rust, Vitest, Testing Library

---

### Task 1: 锁定聊天会话自动切换行为

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 新增“单聊自动切换开启”测试**
- [x] **Step 2: 运行定向测试并确认先失败**
- [x] **Step 3: 新增“单聊自动切换关闭保持原会话”测试**
- [x] **Step 4: 运行定向测试并确认先失败**
- [x] **Step 5: 新增“文件投递自动切换开启”测试**
- [x] **Step 6: 运行定向测试并确认先失败**
- [x] **Step 7: 新增“设置页展示并更新两个会话自动切换开关”测试**
- [x] **Step 8: 运行定向测试并确认先失败**

### Task 2: 扩展聊天设置模型并保持兼容

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\types.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\app\store.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\api.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\models.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\settings_store.rs`

- [x] **Step 1: 给前端 `ChatPreferences` 增加两个自动切换字段与默认值**
- [x] **Step 2: 给前端 store 默认设置补齐字段**
- [x] **Step 3: 给 Tauri API 映射增加两个字段并保持缺失时回退默认值**
- [x] **Step 4: 给 Rust `ChatPreferences` 增加两个字段与默认值**
- [x] **Step 5: 确保旧配置迁移路径继续使用 `ChatPreferences::default()`**

### Task 3: 接入设置页与主界面行为

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\App.tsx`

- [x] **Step 1: 在聊天与通知分组增加两个新复选项**
- [x] **Step 2: 在主界面消息监听中识别“来自其他设备的 direct 消息”并按设置决定是否切换会话**
- [x] **Step 3: 在主界面消息监听中识别“来自其他设备的 delivery 消息”并按设置决定是否切换会话**
- [x] **Step 4: 保持设置窗口与本机消息场景不触发自动切换**

### Task 4: 回归验证与文档同步

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\specs\2026-04-23-chat-session-behavior-design.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-23-chat-session-behavior.md`

- [x] **Step 1: 运行聊天会话行为相关定向测试**
- [x] **Step 2: 运行 `npm.cmd run test -- app-shell`**
- [x] **Step 3: 运行 `npm.cmd run test`**
- [x] **Step 4: 运行 `cargo check`**
- [x] **Step 5: 在 README 中同步新增设置项与当前进度**
