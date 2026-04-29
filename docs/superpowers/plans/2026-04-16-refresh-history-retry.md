# Refresh History Retry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让“网络与发现”的最近刷新历史在出现失败记录时，支持直接从历史项触发一次重试刷新，减少回到顶部重新操作的成本。

**Architecture:** 不改动刷新历史的数据结构，也不新增跨层状态；只在设置页的失败历史项中复用既有 `handleRefreshDiscovery()`，让失败项按钮与顶部“立即刷新”共享同一套禁用条件、错误记录与刷新流程。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用前端测试锁定失败项重试入口

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 增加失败历史项展示“立即重试”的测试**
- [x] **Step 2: 断言只有失败记录会出现该按钮**
- [x] **Step 3: 点击按钮后应直接触发发现刷新**

### Task 2: 在设置页接入快速重试交互

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\styles\app.css`

- [x] **Step 1: 仅在失败历史项渲染“立即重试”按钮**
- [x] **Step 2: 复用现有 `handleRefreshDiscovery()`，不新增重复逻辑**
- [x] **Step 3: 按钮禁用态与顶部“立即刷新”保持一致**

### Task 3: 文档与验证同步

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-16-refresh-history-retry.md`

- [x] **Step 1: README 补充失败项快速重试能力**
- [x] **Step 2: 记录本轮计划与完成状态**

## 验证结果

- [x] `npm.cmd run test -- app-shell`
