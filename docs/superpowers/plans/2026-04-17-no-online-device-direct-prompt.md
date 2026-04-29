# No Online Device Direct Prompt Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：未发现任何在线设备时改为直接提示
> - 已完成：提供“重新扫描”和“切换发现方式”两个动作
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "(shows direct prompt when refresh finds no online devices|shows unchanged refresh hint when no new device is found|shows direct prompt when configured segments are unavailable)"`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`

**Goal:** 当最近一次刷新没有发现任何在线设备时，不再只显示空结果说明，而是直接给出用户最常用的两个后续动作。

**Architecture:** 保持最近一次刷新结果卡片结构不变，只将“新增发现设备”卡片里“本次未发现任何在线设备”的提示替换为直接动作提示块。动作入口复用现有能力：`重新扫描` 继续走 `handleRefreshDiscovery()`，`切换发现方式` 直接聚焦到当前的“发现方式”下拉框，不新增弹窗或额外状态。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用回归测试锁定空结果动作提示

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 新增“未发现任何在线设备”场景测试**
- [x] **Step 2: 断言出现重新扫描 / 切换发现方式按钮**
- [x] **Step 3: 断言切换发现方式会聚焦下拉框**
- [x] **Step 4: 断言重新扫描会再次触发刷新**
- [x] **Step 5: 确认该场景不会和网段不可用提示冲突**

### Task 2: 实现最简直接动作

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 为发现方式下拉框补 ref**
- [x] **Step 2: 将“本次未发现任何在线设备”替换为动作提示块**
- [x] **Step 3: 接入重新扫描 / 切换发现方式两个动作**
- [x] **Step 4: 在无在线设备场景下压住网段不可用提示，避免重复动作入口**

### Task 3: 验证并同步文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-no-online-device-direct-prompt.md`

- [x] **Step 1: 运行定向 app-shell 验证**
- [x] **Step 2: 运行完整 app-shell 验证**
- [x] **Step 3: 运行完整 Vitest 验证**
- [x] **Step 4: 同步 README 与计划文档**
