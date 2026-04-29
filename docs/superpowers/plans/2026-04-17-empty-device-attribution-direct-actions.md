# Empty Device Attribution Direct Actions Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：在线设备归因为空时改为直接动作提示
> - 已完成：提供“立即刷新”和“切换发现方式”两个动作
> - 已完成：复用已有发现方式聚焦逻辑，避免新增分支行为
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "shows direct actions when device attribution is empty"`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`

**Goal:** 当“在线设备归因”区域当前没有任何在线设备可展示时，不再只给一条说明文字，而是直接提供下一步动作，减少用户停在说明文案上的等待成本。

**Architecture:** 保持现有归因列表和手动网段诊断结构不变，只把空状态提示替换成 inline prompt 动作块。`立即刷新` 继续复用已有的 `handleRefreshDiscovery()`；`切换发现方式` 复用发现方式下拉框的聚焦能力，不新增弹窗、路由或额外状态。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用回归测试锁定空归因动作提示

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 新增在线设备归因为空时的动作型测试**
- [x] **Step 2: 将断言范围收紧到“在线设备归因”区块，避免与页面其他刷新按钮冲突**
- [x] **Step 3: 断言切换发现方式会聚焦到发现方式下拉框**
- [x] **Step 4: 断言立即刷新会继续触发现有刷新命令**

### Task 2: 实现最简直接动作

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 将空归因说明替换为动作块**
- [x] **Step 2: 接入立即刷新动作**
- [x] **Step 3: 接入切换发现方式动作**
- [x] **Step 4: 复用已有发现方式聚焦逻辑，不新增复杂流程**

### Task 3: 验证并同步文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-empty-device-attribution-direct-actions.md`

- [x] **Step 1: 运行定向 app-shell 验证**
- [x] **Step 2: 运行完整 app-shell 验证**
- [x] **Step 3: 运行完整 Vitest 验证**
- [x] **Step 4: 同步 README 与计划文档**
