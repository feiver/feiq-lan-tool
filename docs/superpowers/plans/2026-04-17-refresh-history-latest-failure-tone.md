# Refresh History Latest Failure Tone Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：最近刷新历史“最近失败时间”新鲜度颜色分级
> - 已验证：`npm.cmd run test -- app-shell`

**Goal:** 让“最近失败时间”摘要卡能表达失败的新鲜度，帮助用户快速判断失败是刚刚发生、近期发生，还是已经过去较久。

**Architecture:** 在前端 diagnostics helper 中新增最近失败时间分级函数，不新增后端字段。当前阈值为：无失败 `is-success`、30 分钟内 `is-danger`、30 分钟到 24 小时内 `is-warning`、24 小时以上 `is-success`。设置页仅消费这个分级结果。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用测试锁定最近失败时间三档状态

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 增加“刚刚失败”命中 danger 的测试**
- [x] **Step 2: 增加“近期失败”命中 warning 的测试**
- [x] **Step 3: 增加“暂无失败”命中 success 的测试**
- [x] **Step 4: 先运行定向测试，确认实现前按预期失败**

### Task 2: 实现最近失败时间 helper 与设置页渲染

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\networkDiagnostics.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 增加最近失败时间颜色分级 helper**
- [x] **Step 2: 在“最近失败时间”摘要卡挂接对应 class**
- [x] **Step 3: 复用现有 success / warning / danger 样式体系**

### Task 3: 同步说明文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-refresh-history-latest-failure-tone.md`

- [x] **Step 1: README 补充最近失败时间新鲜度分级能力**
- [x] **Step 2: 记录本轮计划与完成状态**

## 验证结果

- [x] `npm.cmd run test -- app-shell`
