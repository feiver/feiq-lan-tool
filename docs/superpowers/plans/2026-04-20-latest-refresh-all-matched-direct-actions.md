# Latest Refresh All Matched Direct Actions Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-20）：**
> - 已完成：最近一次刷新结果中“全部网段已命中”改为直接动作提示
> - 已完成：提供“立即刷新”和“查看在线设备归因”两个动作
> - 已完成：复用已有在线设备归因聚焦能力
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "shows direct actions when latest refresh result has no unmatched segments"`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`

**Goal:** 当最近一次刷新结果里的“当前配置网段仍未命中”结果卡已经没有任何未命中网段时，不再只显示一条完成说明，而是直接提供刷新和查看归因明细的动作。

**Architecture:** 保持最近一次刷新结果区块、刷新历史和覆盖率计算不变，只将“0 个未命中”的说明替换为 inline prompt 动作块。`立即刷新` 继续复用现有刷新逻辑；`查看在线设备归因` 复用已有的归因区块聚焦 ref，不新增新的状态或页面。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用回归测试锁定结果卡动作提示

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 新增最近一次刷新结果中全部网段已命中的动作型测试**
- [x] **Step 2: 将断言范围收紧到结果卡自身，避免与页面其他同名按钮冲突**
- [x] **Step 3: 断言查看在线设备归因会聚焦到底部归因区块**
- [x] **Step 4: 断言立即刷新会继续触发现有刷新命令**

### Task 2: 实现最简直接动作

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 将结果卡中的全部命中说明替换为动作块**
- [x] **Step 2: 接入立即刷新动作**
- [x] **Step 3: 接入查看在线设备归因动作**
- [x] **Step 4: 复用已有归因区块聚焦逻辑，不新增复杂流程**

### Task 3: 验证并同步文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-20-latest-refresh-all-matched-direct-actions.md`

- [x] **Step 1: 运行定向 app-shell 验证**
- [x] **Step 2: 运行完整 app-shell 验证**
- [x] **Step 3: 运行完整 Vitest 验证**
- [x] **Step 4: 同步 README 与计划文档**
