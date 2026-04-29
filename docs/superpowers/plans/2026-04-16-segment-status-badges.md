# Segment Status Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让每个手动网段在刷新后显示更明确的状态标签，帮助用户直接判断该网段是“本次新增命中”“已有在线设备”还是“当前未命中”。

**Architecture:** 保持前端聚合实现，不新增后端协议。在刷新观察窗口结束后，按“新增设备命中数 / 刷新前已有设备命中数 / 无命中”计算每个手动网段的刷新状态，并在设置页的网段概览中显示对应标签。

**Tech Stack:** React 19, TypeScript, Zustand, Vitest, Testing Library

---

### Task 1: 用前端测试锁定网段状态标签

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 扩展刷新测试，覆盖“本次新增命中”标签**
- [x] **Step 2: 扩展刷新测试，覆盖“已有在线设备 / 当前未命中”标签**
- [x] **Step 3: 运行前端测试确认 GREEN**

### Task 2: 实现网段级刷新状态标签

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\App.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\networkDiagnostics.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\styles\app.css`

- [x] **Step 1: 在刷新结果摘要中增加网段状态计算**
- [x] **Step 2: 在设置页网段概览中展示状态标签**
- [x] **Step 3: 保持现有刷新结果分层展示不回退**

### Task 3: 文档与验证同步

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-16-segment-status-badges.md`

- [x] **Step 1: README 补充网段级刷新状态标签能力**
- [x] **Step 2: 记录本轮计划与完成状态**

## 验证结果

- [x] `npm.cmd run test -- app-shell`
- [x] `cargo test --tests`
