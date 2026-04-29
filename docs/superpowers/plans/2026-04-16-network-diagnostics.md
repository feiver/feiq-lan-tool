# Network Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让“网络与发现”设置页不止显示刷新总数，还能解释当前手动网段配置会扫描哪些范围，以及在线设备是否命中了这些手动网段。

**Architecture:** 继续保持轻量实现，不新增后端协议。前端基于现有 `preferences.network.manualSegments`、在线设备列表和本地 CIDR 解析，计算有效手动网段数、预计主动探测主机数，并对在线设备做“命中手动网段 / 未命中手动网段”归因展示。

**Tech Stack:** React 19, TypeScript, Zustand, Vitest, Testing Library

---

### Task 1: 用前端测试锁定网络诊断展示

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 补“当前发现策略”展示测试**
- [x] **Step 2: 补手动网段诊断与设备归因测试**
- [x] **Step 3: 运行前端测试确认 GREEN**

### Task 2: 实现设置页网络诊断面板

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\App.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`
- Add: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\networkDiagnostics.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\styles\app.css`

- [x] **Step 1: 抽取 CIDR / 手动网段诊断辅助函数**
- [x] **Step 2: 在设置页展示发现策略、手动网段诊断和设备归因**
- [x] **Step 3: 保持现有刷新反馈与 CIDR 校验不回退**

### Task 3: 文档与验证同步

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-16-network-diagnostics.md`

- [x] **Step 1: README 补充网络诊断能力**
- [x] **Step 2: 记录本轮计划与完成状态**

## 验证结果

- [x] `npm.cmd run test -- app-shell`
- [x] `cargo test --tests`
