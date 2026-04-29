# Refresh History Failure Guidance Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：失败详情按失败原因给出分类排查建议
> - 已验证：`npm.cmd run test -- app-shell`

**Goal:** 让用户在看到失败详情后，不只知道“失败了”，还可以马上知道下一步优先检查什么。

**Architecture:** 在设置模块内新增失败原因分类函数，根据失败消息关键字和历史条目上下文输出针对性的排查建议。首轮先覆盖权限类、网段类、在线状态类和通用兜底四类，前端失败详情卡直接渲染建议列表，不改后端接口。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用测试锁定分类建议

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 增加权限类失败显示针对性建议的测试**
- [x] **Step 2: 运行定向测试，确认实现前按预期失败**

### Task 2: 实现分类建议与详情卡展示

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\networkDiagnostics.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\styles\app.css`

- [x] **Step 1: 抽出失败原因分类建议函数**
- [x] **Step 2: 在失败详情中渲染“建议排查”列表**
- [x] **Step 3: 保持布局轻量，方便后续扩展更多失败分类**

### Task 3: 同步说明文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-refresh-history-failure-guidance.md`

- [x] **Step 1: README 补充失败详情分类建议能力**
- [x] **Step 2: 记录本轮计划与完成状态**

## 验证结果

- [x] `npm.cmd run test -- app-shell --testNamePattern "shows targeted troubleshooting suggestions for permission related refresh failures"`
- [x] `npm.cmd run test -- app-shell`
