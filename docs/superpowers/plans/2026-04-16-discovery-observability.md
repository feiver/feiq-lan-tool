# Discovery Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让“网络与发现”设置页能直观看到刷新动作是否有效，包括在线设备数、刷新状态、最近刷新时间和新增发现数量。

**Architecture:** 不新增后端协议，在前端复用既有 `devices-updated` 事件和 `refresh_discovery` 命令。设置窗口触发刷新时记录当前设备基线，在一个短观察窗口内统计新增发现数量，并把结果连同最近刷新时间展示在网络页的状态卡片中。

**Tech Stack:** React 19, TypeScript, Zustand, Tauri 2, Vitest, Testing Library

---

### Task 1: 用前端测试锁定网络页反馈

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 补“当前在线设备数”展示测试**
- [x] **Step 2: 补“刷新中 / 最近刷新 / 新增发现”反馈测试**
- [x] **Step 3: 运行前端测试确认 RED**

### Task 2: 实现设置页反馈

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\App.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\styles\app.css`

- [x] **Step 1: 设置窗口也监听 `devices-updated`**
- [x] **Step 2: 在 `App` 中统计刷新观察窗口的新增发现数**
- [x] **Step 3: 在网络页增加状态卡片展示**
- [x] **Step 4: 运行前端测试确认 GREEN**

### Task 3: README 与计划同步

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Modify: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-16-discovery-observability.md`

- [x] **Step 1: README 补充网络页发现反馈能力**
- [x] **Step 2: 回填计划状态**

## 验证结果

- [x] `npm.cmd run test -- app-shell`
- [x] `cargo test --tests`
