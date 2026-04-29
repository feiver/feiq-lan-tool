# Consecutive Failure Direct Actions Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：连续刷新失败提示改为直接动作入口
> - 已完成：提供“立即重试”和“查看最近失败”两个动作
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "(shows direct actions when refresh history has consecutive failures|shows refresh history summary legend for status colors)"`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`

**Goal:** 当最近刷新已经连续失败时，不再只给出一段建议文字，而是直接给用户最常用的两个动作：重新尝试，以及快速查看最新失败详情。

**Architecture:** 保持现有摘要卡和历史列表结构不变，只将“连续失败次数 >= 2”时的红色提示文案替换为与网段不可用提示一致的动作块。动作入口复用现有能力：`立即重试` 直接触发 `handleRefreshDiscovery()`，`查看最近失败` 复用 `focusRefreshHistoryFailures()` 打开最新失败详情。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用回归测试锁定直接动作

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 将连续失败提示测试更新为动作型文案**
- [x] **Step 2: 断言出现“立即重试”和“查看最近失败”按钮**
- [x] **Step 3: 断言“查看最近失败”会展开失败详情**
- [x] **Step 4: 断言“立即重试”会触发刷新**

### Task 2: 实现最简动作提示

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 将连续失败文案替换为直接动作提示**
- [x] **Step 2: 复用现有 inline prompt 样式**
- [x] **Step 3: 接入立即重试与查看最近失败两个动作**

### Task 3: 验证与文档同步

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-consecutive-failure-direct-actions.md`

- [x] **Step 1: 运行定向 app-shell 验证**
- [x] **Step 2: 运行完整 app-shell 验证**
- [x] **Step 3: 运行完整 Vitest 验证**
- [x] **Step 4: 同步 README 与计划文档**
