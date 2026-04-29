# Refresh History Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让“网络与发现”的最近刷新历史支持“全部 / 仅失败”筛选，帮助用户快速聚焦异常刷新记录。

**Architecture:** 保持刷新历史持久化结构不变，只在设置页增加本地筛选状态。默认展示全部历史，切换到“仅失败”时只渲染失败记录；若当前筛选条件下没有结果，则展示空提示文案。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用前端测试锁定筛选行为

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 增加“全部 / 仅失败”筛选按钮展示测试**
- [x] **Step 2: 增加切换到“仅失败”后隐藏成功记录的测试**
- [x] **Step 3: 运行前端测试确认 RED 后进入实现**

### Task 2: 实现设置页筛选交互

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 为历史区块增加本地筛选状态**
- [x] **Step 2: 增加“全部 / 仅失败”筛选按钮**
- [x] **Step 3: 在无结果时展示筛选后的空状态提示**

### Task 3: 文档与验证同步

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-16-refresh-history-filter.md`

- [x] **Step 1: README 补充最近刷新历史筛选能力**
- [x] **Step 2: 记录本轮计划与完成状态**

## 验证结果

- [x] `npm.cmd run test -- app-shell`
