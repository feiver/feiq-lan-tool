# Empty Refresh History Direct Actions Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-23）：**
> - 已完成：最近刷新历史在完全为空时改为直接动作提示
> - 已完成：提供“立即刷新”和“查看发现方式”两个动作
> - 已完成：让空历史场景下仍保留最近刷新历史区块
> - 已完成：修复 6 条受空历史常驻影响的回归测试，统一改为限域查询并更新清空历史后的断言
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "shows direct actions when all refresh history is empty"`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`

**Goal:** 当用户首次进入网络页、尚未产生任何刷新历史时，不再让“最近刷新历史”区块直接消失，而是保留该区域并直接提供下一步动作。

**Architecture:** 保持刷新历史的数据模型与摘要结构不变，将历史区块从“仅在有数据时显示”调整为“始终显示”，并在 `refreshHistoryFilter === "All"` 且历史为空时，展示 inline prompt。`立即刷新` 继续复用现有刷新逻辑；`查看发现方式` 复用已有 `handleFocusDiscoveryMode()`，不引入新状态。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用测试锁定全部视图空历史动作

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 新增完全空历史的动作型测试**
- [x] **Step 2: 断言历史区块在空状态下仍然可见**
- [x] **Step 3: 断言查看发现方式会聚焦到发现方式选择框**
- [x] **Step 4: 断言立即刷新会继续触发现有刷新命令**

### Task 2: 实现最简直接动作

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 让最近刷新历史区块在空历史场景下仍然显示**
- [x] **Step 2: 将全部视图空历史说明替换为动作块**
- [x] **Step 3: 接入立即刷新动作**
- [x] **Step 4: 接入查看发现方式动作**

### Task 3: 验证并同步文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-23-empty-refresh-history-direct-actions.md`

- [x] **Step 1: 运行定向 app-shell 验证**
- [x] **Step 2: 运行完整 app-shell 验证**
- [x] **Step 3: 运行完整 Vitest 验证**
- [x] **Step 4: 同步 README 与计划文档**
