# Refresh History Consecutive Failure Tone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：最近刷新历史“连续失败次数”风险高亮
> - 已验证：`npm.cmd run test -- app-shell`

**Goal:** 让用户在查看最近刷新历史摘要时，不仅能从文案看到连续失败提醒，也能直接通过统计卡颜色快速识别连续失败已达到风险阈值。

**Architecture:** 延续现有前端摘要卡实现，不新增状态字段。设置页根据 `consecutiveFailureCount` 判断是否达到风险阈值（当前为 `>= 2`），命中后为“连续失败次数”卡追加 `is-danger` 样式类，与现有异常提示文案保持一致。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用测试锁定连续失败风险高亮

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 增加连续失败次数达到 2 次时命中 danger 样式的测试**
- [x] **Step 2: 先运行定向测试，确认在实现前按预期失败**

### Task 2: 在设置页挂接连续失败风险 class

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 根据连续失败次数计算摘要卡风险 class**
- [x] **Step 2: 将风险 class 挂到“连续失败次数”统计卡**

### Task 3: 同步说明文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-refresh-history-failure-tone.md`

- [x] **Step 1: README 补充连续失败风险高亮能力**
- [x] **Step 2: 记录本轮计划与完成状态**

## 验证结果

- [x] `npm.cmd run test -- app-shell`
