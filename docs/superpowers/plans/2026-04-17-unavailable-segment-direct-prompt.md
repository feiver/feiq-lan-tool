# Unavailable Segment Direct Prompt Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：当配置网段不可用时改为直接提示
> - 已完成：提供“重新扫描”和“更改网段”两个直接动作
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "(shows direct prompt when configured segments are unavailable|shows unchanged refresh hint when no new device is found)"`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`

**Goal:** 当用户配置的手动网段当前不可用时，不再继续叠加更多说明，而是直接告诉用户当前状态，并提供两个最直接的后续动作。

**Architecture:** 继续保留现有最近一次刷新结果结构，只替换“全部网段未命中”时的提示块：文案改为直接提示，并在同一区域加入“重新扫描”和“更改网段”按钮。“更改网段”不新增弹窗，只把焦点切到现有手动网段输入框。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用 UI 回归锁定最简交互

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 将原有全部网段未命中提示测试改为直接提示文案**
- [x] **Step 2: 断言出现“重新扫描”和“更改网段”两个按钮**
- [x] **Step 3: 断言“更改网段”会聚焦手动网段输入框**
- [x] **Step 4: 断言“重新扫描”会再次触发刷新**

### Task 2: 实现直接提示与动作入口

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\styles\app.css`

- [x] **Step 1: 为手动网段输入框补 ref 以支持直接聚焦**
- [x] **Step 2: 将全部网段未命中时的提示改为直接提示文案**
- [x] **Step 3: 增加重新扫描 / 更改网段按钮**
- [x] **Step 4: 为新提示块补最小样式**

### Task 3: 验证并同步文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-unavailable-segment-direct-prompt.md`

- [x] **Step 1: 运行定向 app-shell 验证**
- [x] **Step 2: 运行完整 app-shell 验证**
- [x] **Step 3: 运行完整 Vitest 验证**
- [x] **Step 4: 同步 README 与计划文档**
