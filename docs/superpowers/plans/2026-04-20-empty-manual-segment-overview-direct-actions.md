# Empty Manual Segment Overview Direct Actions Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-20）：**
> - 已完成：手动网段概览为空时改为直接动作提示
> - 已完成：提供“填入示例网段”和“切回自动发现”两个动作
> - 已完成：复用已有示例网段写入逻辑与自动发现切换逻辑
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "shows direct actions when manual segment overview is empty"`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`

**Goal:** 当“手动网段概览”区域当前没有任何有效网段可参与主动探测时，不再只展示说明文字，而是直接提供下一步动作，减少用户在概览区看到空状态后还要回到上方输入区找入口的成本。

**Architecture:** 保持现有手动网段概览结构、网段统计和输入逻辑不变，只把空状态说明替换为 inline prompt 动作块。`填入示例网段` 继续复用已有示例写入逻辑；`切回自动发现` 复用统一的自动发现切换逻辑，不新增弹窗、路由或持久化字段。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用回归测试锁定空概览动作提示

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 新增手动网段概览为空时的动作型测试**
- [x] **Step 2: 将断言范围收紧到“手动网段概览”区块，避免与其他同名按钮冲突**
- [x] **Step 3: 断言切回自动发现会恢复到 Auto 模式**
- [x] **Step 4: 断言填入示例网段会写入默认示例 CIDR**

### Task 2: 实现最简直接动作

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 将空概览说明替换为动作块**
- [x] **Step 2: 接入填入示例网段动作**
- [x] **Step 3: 接入切回自动发现动作**
- [x] **Step 4: 提取统一自动发现切换逻辑，避免多处按钮实现漂移**

### Task 3: 验证并同步文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-20-empty-manual-segment-overview-direct-actions.md`

- [x] **Step 1: 运行定向 app-shell 验证**
- [x] **Step 2: 运行完整 app-shell 验证**
- [x] **Step 3: 运行完整 Vitest 验证**
- [x] **Step 4: 同步 README 与计划文档**
