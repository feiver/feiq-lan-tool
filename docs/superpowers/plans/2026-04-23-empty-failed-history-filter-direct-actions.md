# Empty Failed History Filter Direct Actions Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-23）：**
> - 已完成：最近刷新历史在“仅失败”筛选为空时改为直接动作提示
> - 已完成：提供“立即刷新”和“切回全部”两个动作
> - 已完成：复用已有历史筛选切回全部逻辑
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "shows direct actions when failed history filter is empty"`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`

**Goal:** 当用户切到“仅失败”筛选但当前没有失败记录时，不再只显示空说明，而是直接提供继续刷新和切回全部查看最近结果的动作。

**Architecture:** 保持刷新历史的数据模型与列表结构不变，只在 `refreshHistoryFilter === "Failed"` 且过滤结果为空时，替换为 inline prompt 动作块。`立即刷新` 继续复用现有刷新逻辑；`切回全部` 复用已有 `focusRefreshHistoryAll()`，不引入新状态。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用测试锁定失败筛选空态动作

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 新增仅失败筛选为空的动作型测试**
- [x] **Step 2: 断言空态提示出现在历史区域，并限定按钮作用域**
- [x] **Step 3: 断言切回全部后恢复成功历史可见**
- [x] **Step 4: 断言立即刷新会继续触发现有刷新命令**

### Task 2: 实现最简直接动作

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 将失败筛选空态说明替换为动作块**
- [x] **Step 2: 接入立即刷新动作**
- [x] **Step 3: 接入切回全部动作**
- [x] **Step 4: 复用已有历史筛选切换逻辑，不新增复杂流程**

### Task 3: 验证并同步文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-23-empty-failed-history-filter-direct-actions.md`

- [x] **Step 1: 运行定向 app-shell 验证**
- [x] **Step 2: 运行完整 app-shell 验证**
- [x] **Step 3: 运行完整 Vitest 验证**
- [x] **Step 4: 同步 README 与计划文档**
