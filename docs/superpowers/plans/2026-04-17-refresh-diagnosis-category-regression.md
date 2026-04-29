# Refresh Diagnosis Category Regression Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：补充 presence 与 generic 两类复制诊断摘要回归覆盖
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "(shows targeted troubleshooting suggestions for timeout refresh failures|copies presence related refresh diagnosis summary|copies generic refresh diagnosis summary|copies failed refresh reason and diagnosis summary from the latest failure detail|copies unmatched segments into refresh diagnosis summary)"`
> - 已验证：`npm.cmd run test -- app-shell`

**Goal:** 为刷新失败诊断摘要的共享分类逻辑补齐 `presence` 与 `generic` 两类自动回归，确保后续继续迭代建议动作、联系对象、重试时机和排查列表时，不会漏掉超时类与兜底类失败。

**Architecture:** 保持现有 `networkDiagnostics.ts` 与 `SettingsPanel.tsx` 的共享摘要链路不变，仅在 `app-shell.test.tsx` 中补充通过 UI 复制诊断摘要的黑盒回归测试。这样可以直接锁定用户实际复制出去的最终文本，而不是只验证内部函数返回值。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 为 presence 类失败补充复制摘要回归

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 构造 timeout / 在线状态相关失败历史**
- [x] **Step 2: 通过设置页失败详情触发复制诊断摘要**
- [x] **Step 3: 断言建议动作、建议联系对象、建议重试时机与排查列表完整输出**

### Task 2: 为 generic 类失败补充复制摘要回归

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 构造未命中已知分类的兜底失败历史**
- [x] **Step 2: 通过设置页失败详情触发复制诊断摘要**
- [x] **Step 3: 断言兜底类建议动作、联系对象、重试时机与排查列表完整输出**

### Task 3: 执行回归验证

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-refresh-diagnosis-category-regression.md`

- [x] **Step 1: 运行 presence/generic 相关定向测试**
- [x] **Step 2: 运行全量 app-shell 测试确认无回归**
- [x] **Step 3: 记录本轮质量补强结果**
