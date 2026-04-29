# Refresh Diagnosis Action Summary Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：复制诊断摘要追加建议动作摘要
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "(copies failed refresh reason and diagnosis summary from the latest failure detail|copies unmatched segments into refresh diagnosis summary|shows failure guidance and copy actions in latest refresh result)"`
> - 已验证：`npm.cmd run test -- app-shell`

**Goal:** 让用户复制刷新失败诊断摘要时，不只携带“是什么问题”，还直接带上一句“下一步先做什么”，减少来回解释。

**Architecture:** 继续复用现有失败分类规则，在 `networkDiagnostics.ts` 中新增建议动作摘要函数，并让排查建议列表与建议动作摘要共用同一套失败分类。`SettingsPanel` 只负责在诊断摘要中插入一行建议动作，不新增新的状态来源，历史详情与最近结果区继续统一走同一套摘要拼接。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用回归测试锁定建议动作摘要

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 更新权限类复制摘要用例，要求带上建议动作**
- [x] **Step 2: 更新网段类复制摘要用例，要求带上建议动作**
- [x] **Step 3: 更新最近结果区复制摘要用例，要求带上建议动作**
- [x] **Step 4: 运行定向测试，确认实现前按预期失败**

### Task 2: 复用失败分类生成建议动作

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\networkDiagnostics.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 抽出失败分类函数，供建议排查与建议动作共用**
- [x] **Step 2: 为每类失败生成一句建议动作摘要**
- [x] **Step 3: 在诊断摘要中插入建议动作一行**

### Task 3: 同步项目说明

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-refresh-diagnosis-action-summary.md`

- [x] **Step 1: README 补充建议动作摘要能力**
- [x] **Step 2: 记录本轮计划与完成状态**
