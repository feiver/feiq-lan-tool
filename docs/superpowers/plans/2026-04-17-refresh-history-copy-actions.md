# Refresh History Copy Actions Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：失败详情复制失败原因与诊断摘要
> - 已验证：`npm.cmd run test -- app-shell`

**Goal:** 让用户在定位到失败详情后，可以一键复制失败原因和诊断摘要，用于排查网络问题或直接反馈给他人。

**Architecture:** 在失败详情卡内追加两个局部动作按钮：“复制失败原因”和“复制诊断摘要”。诊断摘要由最近失败时间、失败原因、连续失败次数与固定排查建议组成，直接复用已有摘要数据与时间格式化逻辑，不新增后端接口。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用测试锁定复制交互

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 增加失败详情复制失败原因与诊断摘要测试**
- [x] **Step 2: 运行定向测试，确认实现前按预期失败**

### Task 2: 实现复制动作与反馈

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\styles\app.css`

- [x] **Step 1: 在失败详情卡中增加复制按钮**
- [x] **Step 2: 接入浏览器剪贴板复制与轻量反馈文案**
- [x] **Step 3: 生成包含时间、失败原因与建议排查项的诊断摘要**

### Task 3: 同步说明文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-refresh-history-copy-actions.md`

- [x] **Step 1: README 补充复制动作能力**
- [x] **Step 2: 记录本轮计划与完成状态**

## 验证结果

- [x] `npm.cmd run test -- app-shell --testNamePattern "copies failed refresh reason and diagnosis summary from the latest failure detail"`
- [x] `npm.cmd run test -- app-shell`
