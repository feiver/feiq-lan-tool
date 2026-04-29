# Refresh History Clear Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让“网络与发现”中的最近刷新历史不仅可查看、可持久化，还能在设置页由用户主动一键清空。

**Architecture:** 不新增新的后端存储模型，继续复用现有的刷新历史持久化接口。设置页在“最近刷新历史”区块增加清空按钮，`App` 负责把当前 `history` 置空并立即写回本地持久化文件；最近一次刷新结果与状态卡保持不变，只清空历史时间线。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用前端测试锁定清空行为

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 增加设置页显示“清空历史”按钮的测试**
- [x] **Step 2: 增加点击后历史区块消失并写回空数组的测试**
- [x] **Step 3: 运行前端测试确认 RED 后进入实现**

### Task 2: 实现设置页清空历史交互

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\App.tsx`

- [x] **Step 1: 为设置页增加清空历史回调入口**
- [x] **Step 2: 在“最近刷新历史”区块增加清空按钮**
- [x] **Step 3: 在 `App` 中清空历史并同步持久化**

### Task 3: 文档与验证同步

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-16-refresh-history-clear.md`

- [x] **Step 1: README 补充清空历史能力**
- [x] **Step 2: 记录本轮计划与完成状态**

## 验证结果

- [x] `npm.cmd run test -- app-shell`
