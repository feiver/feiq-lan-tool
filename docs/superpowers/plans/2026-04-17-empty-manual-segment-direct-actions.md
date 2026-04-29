# Empty Manual Segment Direct Actions Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：手动网段为空时改为直接动作提示
> - 已完成：提供“填入示例网段”和“切回自动发现”两个动作
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "(shows direct actions when manual segments are empty|shows validation error for invalid manual network segments)"`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`

**Goal:** 当用户把发现方式切到手动网段辅助发现，但还没有填写任何网段时，不再只给一句提醒，而是直接提供最快可执行的两个动作。

**Architecture:** 保持现有刷新按钮和校验逻辑不变，只将“手动网段为空”的提示替换为 inline prompt 动作块。`填入示例网段` 直接写入 `192.168.10.0/24` 并聚焦文本框；`切回自动发现` 直接将发现方式更新为 `Auto`，不新增额外弹窗或流程。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用回归测试锁定空网段动作提示

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 新增手动网段为空时的动作型测试**
- [x] **Step 2: 断言出现填入示例网段 / 切回自动发现按钮**
- [x] **Step 3: 断言填入示例网段会写入默认示例 CIDR**
- [x] **Step 4: 断言切回自动发现会恢复到 Auto 模式**

### Task 2: 实现最简直接动作

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 将空网段提示替换为动作块**
- [x] **Step 2: 接入填入示例网段动作**
- [x] **Step 3: 接入切回自动发现动作**
- [x] **Step 4: 复用现有 inline prompt 样式，不引入新设计**

### Task 3: 验证并同步文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-empty-manual-segment-direct-actions.md`

- [x] **Step 1: 运行定向 app-shell 验证**
- [x] **Step 2: 运行完整 app-shell 验证**
- [x] **Step 3: 运行完整 Vitest 验证**
- [x] **Step 4: 同步 README 与计划文档**
