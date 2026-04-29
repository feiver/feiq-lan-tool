# Refresh History Consecutive Failure Tone Levels Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：最近刷新历史“连续失败次数”三档颜色分级
> - 已验证：`npm.cmd run test -- app-shell`

**Goal:** 让“连续失败次数”摘要卡不再只有危险态，而是能区分健康、轻微异常、持续异常三种状态，帮助用户更快判断问题是否刚出现还是已经持续发生。

**Architecture:** 继续复用前端现有 `consecutiveFailureCount` 统计值，不新增字段。设置页内根据连续失败次数映射 `is-success`、`is-warning`、`is-danger` 三档 class，复用现有样式体系。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用测试锁定 warning / success 行为

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 增加 1 次连续失败命中 warning 的测试**
- [x] **Step 2: 增加 0 次连续失败命中 success 的测试**
- [x] **Step 3: 先运行定向测试，确认实现前按预期失败**

### Task 2: 完善连续失败次数分级逻辑

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 将连续失败次数映射为 success / warning / danger 三档**
- [x] **Step 2: 保持现有 danger 行为与异常提示文案不变**

### Task 3: 同步说明文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-refresh-history-failure-tone-levels.md`

- [x] **Step 1: README 更新为三档颜色分级描述**
- [x] **Step 2: 记录本轮计划与完成状态**

## 验证结果

- [x] `npm.cmd run test -- app-shell`
