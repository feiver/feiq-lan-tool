# Refresh History Diagnosis Segments Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：复制诊断摘要追加当前未命中网段列表
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "(copies unmatched segments into refresh diagnosis summary|copies failed refresh reason and diagnosis summary from the latest failure detail|shows targeted troubleshooting suggestions for unmatched segment refresh failures)"`
> - 已验证：`npm.cmd run test -- app-shell`

**Goal:** 让用户复制最近一次刷新失败的诊断摘要时，能同时带走“当前哪些手动网段仍未命中”的具体信息，便于转发给对端或自己回看排查。

**Architecture:** 继续复用现有失败详情卡和分类建议逻辑，不改 Rust 接口。前端在拼接复制诊断摘要时，若历史条目携带未命中网段列表，则插入单独一行进行汇总展示，保持页面详情与复制内容中的网段信息一致。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用回归测试锁定复制摘要内容

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 增加未命中网段会进入复制诊断摘要的测试**
- [x] **Step 2: 运行定向测试，确认实现前按预期失败**

### Task 2: 最小增强复制诊断摘要

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 在诊断摘要中按条件插入未命中网段汇总行**
- [x] **Step 2: 保持原有建议排查与连续失败次数文案不变**

### Task 3: 同步项目说明

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-refresh-history-diagnosis-segments.md`

- [x] **Step 1: README 补充复制诊断摘要包含未命中网段信息**
- [x] **Step 2: 记录本轮计划与完成状态**
