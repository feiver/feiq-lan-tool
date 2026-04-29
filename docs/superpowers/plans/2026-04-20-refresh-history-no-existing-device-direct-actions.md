# Refresh History No Existing Device Direct Actions Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-20）：**
> - 已完成：最近刷新历史详情中“刷新前没有已在线设备”改为直接动作提示
> - 已完成：提供“立即刷新”和“查看新增发现设备”两个动作
> - 已完成：支持在同一条历史详情内聚焦到“新增发现设备”卡
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "shows direct actions when refresh history detail has no existing devices"`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`

**Goal:** 当用户展开一条成功的刷新历史记录，且该记录刷新前没有已在线设备但本次有新增发现时，不再只显示空说明，而是直接提供继续刷新和查看新增发现设备的动作。

**Architecture:** 保持刷新历史的数据模型与展开逻辑不变，只在成功历史详情中的“刷新前已在线设备”卡为空且“新增发现设备”卡有内容时，补一个 inline prompt 动作块。`立即刷新` 继续复用现有刷新逻辑；`查看新增发现设备` 在当前详情网格内做局部聚焦，不引入新状态或新页面。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用测试锁定历史详情中的无已在线状态动作

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 新增历史详情中刷新前无已在线设备的动作型测试**
- [x] **Step 2: 将断言范围限制在已展开的历史详情网格内部**
- [x] **Step 3: 断言查看新增发现设备会聚焦到同详情内的对应卡片**
- [x] **Step 4: 断言立即刷新会继续触发现有刷新命令**

### Task 2: 实现最简直接动作

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 将历史详情里“刷新前没有已在线设备”的静态说明扩展为动作块**
- [x] **Step 2: 接入立即刷新动作**
- [x] **Step 3: 接入查看新增发现设备动作**
- [x] **Step 4: 为同详情内的新增发现设备卡补充可聚焦标记**

### Task 3: 验证并同步文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-20-refresh-history-no-existing-device-direct-actions.md`

- [x] **Step 1: 运行定向 app-shell 验证**
- [x] **Step 2: 运行完整 app-shell 验证**
- [x] **Step 3: 运行完整 Vitest 验证**
- [x] **Step 4: 同步 README 与计划文档**
