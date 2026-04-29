# Refresh Diagnosis Retry Timing Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：复制诊断摘要追加建议重试时机
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "(copies failed refresh reason and diagnosis summary from the latest failure detail|copies unmatched segments into refresh diagnosis summary|shows failure guidance and copy actions in latest refresh result|shows targeted troubleshooting suggestions for permission related refresh failures|shows targeted troubleshooting suggestions for unmatched segment refresh failures|shows targeted troubleshooting suggestions for timeout refresh failures)"`
> - 已验证：`npm.cmd run test -- app-shell`

**Goal:** 让用户复制刷新失败诊断摘要时，不只知道该做什么，还能直接知道“什么时候适合再点一次刷新”，减少无效重试。

**Architecture:** 延续 `networkDiagnostics.ts` 内已收敛的失败分类逻辑，新增建议重试时机摘要函数，并由 `SettingsPanel` 在“建议联系对象”后面统一插入“建议重试时机”。这样历史失败详情与最近一次刷新失败结果继续共享同一套诊断摘要拼接，不新增新的状态来源。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用回归测试锁定建议重试时机

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 更新权限类复制摘要用例，要求带上建议重试时机**
- [x] **Step 2: 更新网段类复制摘要用例，要求带上建议重试时机**
- [x] **Step 3: 更新最近结果区复制摘要用例，要求带上建议重试时机**
- [x] **Step 4: 运行定向测试，确认实现前按预期失败**

### Task 2: 复用失败分类生成建议重试时机

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\networkDiagnostics.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 为每类失败生成一句建议重试时机**
- [x] **Step 2: 在诊断摘要中插入建议重试时机一行**
- [x] **Step 3: 保持历史详情与最近结果区共用同一套摘要逻辑**

### Task 3: 同步项目说明

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-refresh-diagnosis-retry-timing.md`

- [x] **Step 1: README 补充建议重试时机能力**
- [x] **Step 2: 记录本轮计划与完成状态**
