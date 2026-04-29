# Refresh History Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让“网络与发现”中的最近刷新历史在应用重启后仍可恢复，避免每次打开设置页都从空状态开始。

**Architecture:** 保持 `SettingsSnapshot` 只承载用户偏好和运行时只读信息，不把诊断历史混入 `preferences`。Rust 侧在 `~/.feiq-lan-tool/` 下新增独立的刷新历史持久化文件，并通过独立 Tauri command 提供读写；前端 `App` 在启动时拉取历史，在刷新成功/失败后覆盖保存，继续只保留最近 5 条。

**Tech Stack:** Rust, Tauri 2, React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用测试锁定刷新历史持久化行为

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\tests\settings_store_tests.rs`

- [x] **Step 1: 增加设置页启动时加载刷新历史的前端测试**
- [x] **Step 2: 增加 Rust 侧刷新历史文件 roundtrip / 缺失返回空数组测试**
- [x] **Step 3: 先运行测试确认 RED，再进入实现**

### Task 2: 实现独立刷新历史存储与前端接入

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\types.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\api.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\App.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\networkDiagnostics.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\models.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\settings_store.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\commands.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\main.rs`

- [x] **Step 1: 定义刷新历史共享模型与前端类型**
- [x] **Step 2: 在 Rust 设置存储中增加独立刷新历史文件读写**
- [x] **Step 3: 暴露 Tauri command 并在前端初始化/刷新完成后接入读写**
- [x] **Step 4: 存储层与前端层都保持最多 5 条历史**

### Task 3: 文档与验证同步

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-16-refresh-history-persistence.md`

- [x] **Step 1: README 补充刷新历史本地持久化能力**
- [x] **Step 2: 记录本轮计划与完成状态**

## 验证结果

- [x] `npm.cmd run test -- app-shell`
- [x] `$env:CARGO_TARGET_DIR='target-test'; cargo test --tests`
