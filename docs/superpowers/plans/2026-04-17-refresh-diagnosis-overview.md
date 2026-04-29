# Refresh Diagnosis Overview Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：复制诊断摘要追加失败概览一行
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "(copies failed refresh reason and diagnosis summary from the latest failure detail|copies unmatched segments into refresh diagnosis summary|shows failure guidance and copy actions in latest refresh result)"`
> - 已验证：`npm.cmd run test -- app-shell`

**Goal:** 让用户复制刷新失败诊断摘要时，能第一眼看到“是不是最近连续失败”“当前网段未命中规模有多大”，避免对方先逐行读完整摘要才能理解严重程度。

**Architecture:** 继续复用 `SettingsPanel` 内唯一的诊断摘要拼接函数，不新增后端字段。摘要在发现方式与手动网段上下文之后插入一行失败概览：默认至少说明最近连续失败次数；当处于手动网段模式且存在有效网段时，再补充当前手动网段数量与本次未命中数量，历史详情与最近结果区统一共用。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用回归测试锁定失败概览

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 更新历史详情复制摘要用例，要求带上失败概览**
- [x] **Step 2: 更新最近结果区复制摘要用例，要求带上失败概览**
- [x] **Step 3: 运行定向测试，确认实现前按预期失败**

### Task 2: 最小增强摘要拼接

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 在摘要中插入失败概览一行**
- [x] **Step 2: 手动网段模式下补充网段总数与未命中数量**
- [x] **Step 3: 保持历史详情与最近结果区共用同一套摘要逻辑**

### Task 3: 同步项目说明

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-refresh-diagnosis-overview.md`

- [x] **Step 1: README 补充失败概览能力**
- [x] **Step 2: 记录本轮计划与完成状态**
