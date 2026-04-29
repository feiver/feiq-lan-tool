# Latest Refresh No New Device Direct Actions Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-20）：**
> - 已完成：最近一次刷新结果中“无新增但仍有已在线设备”改为直接动作提示
> - 已完成：提供“立即刷新”和“查看刷新前已在线设备”两个动作
> - 已完成：为“刷新前已在线设备”结果卡补充聚焦入口
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "shows direct actions when latest refresh result has no new devices"`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`

**Goal:** 当最近一次刷新结果里的“新增发现设备”结果卡没有新增设备、但“刷新前已在线设备”结果卡仍然有内容时，不再只显示说明文字，而是直接给出下一步动作，帮助用户继续刷新或快速回看本次仍在线的设备。

**Architecture:** 保持最近一次刷新结果区块和刷新反馈计算逻辑不变，只将“无新增但仍在线”的说明替换为 inline prompt 动作块。`立即刷新` 继续复用现有刷新逻辑；`查看刷新前已在线设备` 通过新增 ref 聚焦到相邻结果卡，不增加新状态、不引入新页面。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用回归测试锁定无新增状态的直接动作

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 新增最近一次刷新结果中无新增但仍在线的动作型测试**
- [x] **Step 2: 通过预置在线设备基线，稳定命中“已有在线设备、无新增”的结果分支**
- [x] **Step 3: 断言查看刷新前已在线设备会聚焦到对应结果卡**
- [x] **Step 4: 断言立即刷新会继续触发现有刷新命令**

### Task 2: 实现最简直接动作

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 将“无新增但仍在线”的说明替换为动作块**
- [x] **Step 2: 接入立即刷新动作**
- [x] **Step 3: 接入查看刷新前已在线设备动作**
- [x] **Step 4: 为“刷新前已在线设备”结果卡补充 ref 与 focus 能力**

### Task 3: 验证并同步文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-20-latest-refresh-no-new-device-direct-actions.md`

- [x] **Step 1: 运行定向 app-shell 验证**
- [x] **Step 2: 运行完整 app-shell 验证**
- [x] **Step 3: 运行完整 Vitest 验证**
- [x] **Step 4: 同步 README 与计划文档**
