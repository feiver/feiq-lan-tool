# Refresh History Summary Card Focus Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：摘要卡点击快速定位历史交互
> - 已验证：`npm.cmd run test -- app-shell`

**Goal:** 让用户在看到摘要区异常时，不必再手动切筛选、展开列表、逐条点开详情，直接点击摘要卡就能跳到对应历史记录。

**Architecture:** 保持现有摘要卡配色与布局不变，只在卡片内部增加可点击层。成功率卡点击后展开全部历史，便于查看完整样本；连续失败次数和最近失败时间卡点击后切换到失败筛选、展开列表，并自动打开最新失败详情。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用测试锁定摘要卡联动交互

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 增加点击连续失败摘要卡后的联动测试**
- [x] **Step 2: 运行定向测试，确认实现前按预期失败**

### Task 2: 实现摘要卡快速定位

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\styles\app.css`

- [x] **Step 1: 为三张摘要卡补可点击交互层**
- [x] **Step 2: 失败指标点击后切换到失败历史并自动展开最新失败详情**
- [x] **Step 3: 补充键盘可见焦点与轻量提示文案**

### Task 3: 同步说明文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-refresh-history-summary-card-focus.md`

- [x] **Step 1: README 补充摘要卡快速定位能力**
- [x] **Step 2: 记录本轮计划与完成状态**

## 验证结果

- [x] `npm.cmd run test -- app-shell --testNamePattern "clicking consecutive failure summary card focuses failed history and opens the latest detail"`
- [x] `npm.cmd run test -- app-shell`
