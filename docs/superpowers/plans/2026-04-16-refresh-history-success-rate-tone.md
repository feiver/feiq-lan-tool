# Refresh History Success Rate Tone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-16）：**
> - 已完成：最近刷新历史成功率颜色分级提醒
> - 已验证：`npm.cmd run test -- app-shell`

**Goal:** 让“最近 5 次成功率”统计卡在成功率偏低时立即变色，帮助用户更快识别最近刷新是否进入不稳定状态。

**Architecture:** 继续复用前端已有的 `buildRefreshHistorySummary()` 结果，不新增运行时字段。由设置页根据成功率阈值映射出 `is-success`、`is-warning`、`is-danger` 三档样式类，并由 CSS 负责视觉提醒。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用前端测试锁定低成功率风险样式

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 增加低成功率命中 danger 样式的测试**
- [x] **Step 2: 验证测试先失败，确保确实覆盖到新行为**

### Task 2: 在设置页挂接成功率颜色分级

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\styles\app.css`

- [x] **Step 1: 根据成功率阈值映射 success / warning / danger 三档样式**
- [x] **Step 2: 为最近 5 次成功率统计卡追加对应 className**
- [x] **Step 3: 补齐三档颜色样式，保持与现有设置页视觉一致**

### Task 3: 同步项目说明

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-16-refresh-history-success-rate-tone.md`

- [x] **Step 1: README 补充成功率颜色分级能力**
- [x] **Step 2: 记录本轮计划与完成状态**

## 验证结果

- [x] `npm.cmd run test -- app-shell`
