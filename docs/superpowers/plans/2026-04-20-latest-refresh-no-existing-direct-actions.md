# Latest Refresh No Existing Direct Actions Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-20）：**
> - 已完成：最近一次刷新结果中“刷新前没有已在线设备”改为直接动作提示
> - 已完成：提供“立即刷新”和“查看新增发现设备”两个动作
> - 已完成：新增发现设备结果卡支持被动作按钮聚焦
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "shows direct actions when latest refresh result has no existing devices"`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`

**Goal:** 当最近一次刷新结果里的“刷新前已在线设备”结果卡为空时，不再只显示空状态说明，而是直接提供下一步动作，方便用户继续刷新或查看本次新增发现。

**Architecture:** 保持最近一次刷新结果区块和刷新统计逻辑不变，只将“刷新前没有已在线设备”的说明替换为 inline prompt 动作块。`立即刷新` 继续复用已有刷新逻辑；`查看新增发现设备` 通过 ref 聚焦到结果区第一张“新增发现设备”卡，不新增新状态或新页面。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用回归测试锁定结果卡动作提示

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 新增最近一次刷新结果中无已在线设备的动作型测试**
- [x] **Step 2: 将断言范围收紧到“刷新前已在线设备”结果卡**
- [x] **Step 3: 断言查看新增发现设备会聚焦新增发现结果卡**
- [x] **Step 4: 断言立即刷新会继续触发现有刷新命令**

### Task 2: 实现最简直接动作

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 将“刷新前没有已在线设备”说明替换为动作块**
- [x] **Step 2: 为新增发现设备结果卡增加可聚焦 ref**
- [x] **Step 3: 接入立即刷新动作**
- [x] **Step 4: 接入查看新增发现设备动作**

### Task 3: 验证并同步文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-20-latest-refresh-no-existing-direct-actions.md`

- [x] **Step 1: 运行定向 app-shell 验证**
- [x] **Step 2: 运行完整 app-shell 验证**
- [x] **Step 3: 运行完整 Vitest 验证**
- [x] **Step 4: 同步 README 与计划文档**
