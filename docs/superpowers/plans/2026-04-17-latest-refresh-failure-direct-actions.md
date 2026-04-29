# Latest Refresh Failure Direct Actions Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：最近一次刷新失败时的顶部提示改为直接动作块
> - 已完成：提供“立即重试”和“查看建议排查”两个动作
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "(shows refresh failure hint when discovery refresh command fails|shows failure guidance and copy actions in latest refresh result)"`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`

**Goal:** 当最近一次刷新失败时，不再只在结果区顶部放一条红色错误文案，而是直接提供最常用的后续动作。

**Architecture:** 保持最近一次刷新结果区和失败详情卡结构不变，只将顶部的 `lastErrorMessage` 单行提示替换为直接动作提示块。`立即重试` 继续复用 `handleRefreshDiscovery()`；`查看建议排查` 直接聚焦到下方已经存在的“建议排查”卡片，不新增额外视图。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用回归测试锁定顶部动作块

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 更新刷新失败提示测试，要求出现立即重试 / 查看建议排查**
- [x] **Step 2: 更新最近结果失败详情测试，要求出现同样两个动作**
- [x] **Step 3: 使用最近一次刷新结果区块范围断言，避免与详情卡重复文案冲突**

### Task 2: 实现最简直接动作

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 将顶部失败红字替换为 inline prompt 动作块**
- [x] **Step 2: 接入立即重试动作**
- [x] **Step 3: 接入查看建议排查动作并聚焦建议卡片**
- [x] **Step 4: 复用现有样式，不新增复杂交互**

### Task 3: 验证并同步文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-latest-refresh-failure-direct-actions.md`

- [x] **Step 1: 运行定向 app-shell 验证**
- [x] **Step 2: 运行完整 app-shell 验证**
- [x] **Step 3: 运行完整 Vitest 验证**
- [x] **Step 4: 同步 README 与计划文档**
