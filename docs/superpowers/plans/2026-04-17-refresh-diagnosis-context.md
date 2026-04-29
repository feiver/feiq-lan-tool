# Refresh Diagnosis Context Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：复制诊断摘要追加当前发现方式与手动网段上下文
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "(copies failed refresh reason and diagnosis summary from the latest failure detail|copies unmatched segments into refresh diagnosis summary|shows failure guidance and copy actions in latest refresh result)"`
> - 已验证：`npm.cmd run test -- app-shell`

**Goal:** 让用户复制刷新失败诊断摘要时，不只带失败原因和建议，还能直接附带当前采用的发现方式与手动网段配置，降低远程协作排查时的来回确认成本。

**Architecture:** 保持现有 `SettingsPanel` 内的摘要拼接函数作为唯一入口，不新增状态字段，也不改 Rust。诊断摘要统一在拼接时读取当前偏好设置，追加发现方式描述；当处于手动网段模式且存在有效 CIDR 时，再追加一行手动网段列表，继续与未命中网段信息、分类建议共存。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用回归测试锁定新增上下文

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 更新历史详情复制摘要用例，要求带上发现方式与手动网段**
- [x] **Step 2: 更新最近结果区复制摘要用例，要求带上发现方式与手动网段**
- [x] **Step 3: 运行定向测试，确认实现前按预期失败**

### Task 2: 最小增强诊断摘要拼接

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 在诊断摘要中追加当前发现方式**
- [x] **Step 2: 在手动网段模式下追加当前手动网段列表**
- [x] **Step 3: 保持历史详情与最近结果区共用同一套摘要逻辑**

### Task 3: 同步项目说明

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-refresh-diagnosis-context.md`

- [x] **Step 1: README 补充诊断摘要上下文信息能力**
- [x] **Step 2: 记录本轮计划与完成状态**
