# All Manual Segments Matched Direct Actions Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-20）：**
> - 已完成：手动网段全部已命中时改为直接动作提示
> - 已完成：提供“立即刷新”和“查看在线设备归因”两个动作
> - 已完成：在线设备归因区块支持被动作按钮聚焦
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "shows direct actions when all manual segments are matched"`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`

**Goal:** 当“手动网段概览”确认所有有效手动网段都已命中在线设备时，不再只显示一条状态说明，而是直接提供继续确认明细或重新刷新的动作入口。

**Architecture:** 保持现有手动网段覆盖率计算和归因列表不变，只把全部已命中的成功提示替换为 inline prompt 动作块。`立即刷新` 继续复用已有刷新逻辑；`查看在线设备归因` 通过 ref 聚焦下方归因区块，不新增页面、弹窗或持久化状态。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用回归测试锁定全部命中动作提示

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 新增所有手动网段都命中时的动作型测试**
- [x] **Step 2: 将断言范围收紧到“手动网段概览”区块**
- [x] **Step 3: 断言查看在线设备归因会聚焦归因区块**
- [x] **Step 4: 断言立即刷新会继续触发现有刷新命令**

### Task 2: 实现最简直接动作

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 将全部命中说明替换为动作块**
- [x] **Step 2: 接入立即刷新动作**
- [x] **Step 3: 为在线设备归因区块增加可聚焦 ref**
- [x] **Step 4: 接入查看在线设备归因动作**

### Task 3: 验证并同步文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-20-all-manual-segments-matched-direct-actions.md`

- [x] **Step 1: 运行定向 app-shell 验证**
- [x] **Step 2: 运行完整 app-shell 验证**
- [x] **Step 3: 运行完整 Vitest 验证**
- [x] **Step 4: 同步 README 与计划文档**
