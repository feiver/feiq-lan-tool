# Refresh History Summary Rules Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：最近刷新历史摘要区规则说明文案
> - 待验证：定向测试与全量回归

**Goal:** 让用户在看到摘要卡指标时，不必反推阈值规则，直接能知道成功率、连续失败次数、最近失败时间分别如何判定为稳定、关注或异常。

**Architecture:** 在“最近刷新历史”摘要图例下方新增固定“规则说明”区域，直接展示三项指标的判定阈值；不新增配置项，不修改已有摘要计算与颜色分级逻辑，仅补充说明层。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用测试锁定规则说明文案

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 增加摘要区规则说明显示测试**
- [x] **Step 2: 运行定向测试，确认实现前按预期失败**

### Task 2: 实现规则说明文案与样式

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\styles\app.css`

- [x] **Step 1: 在摘要图例下方增加规则说明文案**
- [x] **Step 2: 补充轻量说明块样式，与摘要区视觉保持一致**

### Task 3: 同步说明文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-refresh-history-summary-rules.md`

- [x] **Step 1: README 补充规则说明文案能力**
- [x] **Step 2: 记录本轮计划与完成状态**

## 验证结果

- [ ] `npm.cmd run test -- app-shell --testNamePattern "shows refresh history summary rules for each metric"`
- [ ] `npm.cmd run test -- app-shell`
