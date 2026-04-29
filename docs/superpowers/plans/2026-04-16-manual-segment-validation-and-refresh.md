# Manual Segment Validation And Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让“手动网段”设置在用户修改后可立即验证、可立即触发一次发现刷新，不再静默失效。

**Architecture:** 保留现有设置页结构，在网络分组增加本地 CIDR 校验、错误提示和“立即刷新”按钮；前端通过新的 `refresh_discovery` Tauri command 触发一次复用当前发现逻辑的即时探测。Rust 侧抽出一次性 discovery refresh 辅助函数，供后台定时广播和前端手动刷新共用。

**Tech Stack:** React 19, TypeScript, Rust, Tauri 2, Vitest, Testing Library

---

### Task 1: 用前端测试锁定网络设置交互

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 补手动网段非法提示测试**
- [x] **Step 2: 补“立即刷新”调用测试**
- [x] **Step 3: 跑前端测试确认 RED**

### Task 2: 实现设置页校验与刷新命令

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\App.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\api.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\styles\app.css`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\commands.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\runtime.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\main.rs`

- [x] **Step 1: 前端 API 增加 `refreshDiscovery`**
- [x] **Step 2: 设置页增加 CIDR 校验、错误提示和刷新按钮**
- [x] **Step 3: Rust 增加 `refresh_discovery` 命令并复用 discovery refresh 逻辑**
- [x] **Step 4: 跑前端与 Rust 验证确认 GREEN**

### Task 3: README 与计划同步

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Modify: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-16-manual-segment-validation-and-refresh.md`

- [x] **Step 1: README 补充“手动网段校验与立即刷新”**
- [x] **Step 2: 回填计划状态**
