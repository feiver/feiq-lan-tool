# Network Segment Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在“网络与发现”设置页进一步提示哪些手动配置的网段当前没有命中任何在线设备，帮助用户更快判断是网段配置问题还是对端不在线。

**Architecture:** 继续保持前端聚合实现，不新增后端协议。基于已存在的手动网段摘要和在线设备归因结果，计算每个有效手动网段的命中设备数量，并在设置页输出“已命中 / 未命中”状态与未命中网段汇总提示。

**Tech Stack:** React 19, TypeScript, Zustand, Vitest, Testing Library

---

### Task 1: 用前端测试锁定网段命中摘要

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 补手动网段命中/未命中摘要测试**
- [x] **Step 2: 补未命中网段汇总提示测试**
- [x] **Step 3: 运行前端测试确认 GREEN**

### Task 2: 实现未命中网段提示

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\networkDiagnostics.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 计算每个手动网段的命中设备数**
- [x] **Step 2: 在设置页展示网段级命中状态与未命中汇总**
- [x] **Step 3: 保持现有刷新反馈和设备归因不回退**

### Task 3: 文档与验证同步

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-16-network-segment-coverage.md`

- [x] **Step 1: README 补充未命中网段提示能力**
- [x] **Step 2: 记录本轮计划与完成状态**

## 验证结果

- [x] `npm.cmd run test -- app-shell`
- [x] `cargo test --tests`
