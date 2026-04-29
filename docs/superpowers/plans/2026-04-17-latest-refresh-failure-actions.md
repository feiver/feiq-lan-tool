# Latest Refresh Failure Actions Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：最近一次刷新结果在失败时接入复制失败原因、复制诊断摘要、建议排查
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "(shows failure guidance and copy actions in latest refresh result|shows refresh failure hint when discovery refresh command fails|copies failed refresh reason and diagnosis summary from the latest failure detail|copies unmatched segments into refresh diagnosis summary)"`
> - 已验证：`npm.cmd run test -- app-shell`

**Goal:** 当用户刚执行完一次发现刷新且结果失败时，不需要再展开历史详情，也能在“最近一次刷新结果”区域直接复制失败信息并看到排查建议。

**Architecture:** 继续复用现有失败分类建议与诊断摘要拼接逻辑，在 `SettingsPanel` 内为“最近一次刷新结果”构造一个轻量失败条目，并与历史详情共用同一套失败详情渲染片段。复制反馈拆分为“最近结果”和“历史详情”两套，避免两个区域互相污染提示文案。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用回归测试锁定最近结果区行为

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 增加最近一次刷新失败时展示复制动作与建议排查的测试**
- [x] **Step 2: 运行定向测试，确认实现前按预期失败**

### Task 2: 在最近结果区复用失败详情能力

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 为最近一次刷新失败构造可复用的失败条目**
- [x] **Step 2: 抽出失败详情渲染片段，供历史详情与最近结果区共用**
- [x] **Step 3: 拆分复制反馈状态，避免两个区域串用同一条反馈提示**

### Task 3: 同步项目说明

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-latest-refresh-failure-actions.md`

- [x] **Step 1: README 补充最近一次刷新失败时的快速动作能力**
- [x] **Step 2: 记录本轮计划与完成状态**
