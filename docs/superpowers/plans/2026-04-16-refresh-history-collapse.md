# Refresh History Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让“网络与发现”的最近刷新历史在记录较多时保持紧凑，默认只展示最近 3 条，并支持“展开更多 / 收起”。

**Architecture:** 不改变历史持久化数据结构，只在设置页维护本地展开状态。默认折叠展示最近 3 条，点击“展开更多”后展示当前筛选条件下的全部历史，点击“收起”恢复精简视图；切换筛选条件时自动回到折叠态。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用前端测试锁定折叠与展开行为

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 增加默认仅显示最近 3 条历史的测试**
- [x] **Step 2: 增加“展开更多 / 收起”切换行为测试**
- [x] **Step 3: 运行前端测试确认 RED 后进入实现**

### Task 2: 实现设置页折叠交互

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 为历史区块增加本地展开状态**
- [x] **Step 2: 当历史条目超过 3 条时显示“展开更多 / 收起”按钮**
- [x] **Step 3: 切换筛选条件时回到折叠态**

### Task 3: 文档与验证同步

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-16-refresh-history-collapse.md`

- [x] **Step 1: README 补充默认折叠与展开能力**
- [x] **Step 2: 记录本轮计划与完成状态**

## 验证结果

- [x] `npm.cmd run test -- app-shell`
