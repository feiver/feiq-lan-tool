# Refresh Diagnosis Keyword Classification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：补充更常见权限 / 网段 / 在线状态错误文案的分类识别
> - 已验证：`npm.cmd run test -- network-diagnostics`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`

**Goal:** 让刷新失败诊断在面对更接近真实环境的英文或系统级错误提示时，仍能落到正确的分类，而不是过早退回 generic 兜底。

**Architecture:** 不改设置页、不改摘要拼接，仅在 `networkDiagnostics.ts` 的失败分类规则中扩充关键词，并新增独立单测文件 `network-diagnostics.test.ts` 锁定分类输出。这样既能保持 UI 行为不变，也能以更低成本迭代规则。

**Tech Stack:** React 19, TypeScript, Vitest

---

### Task 1: 为分类规则补充单元回归

**Files:**
- Add: `D:\我的工作空间\feiq-lan-tool\src\test\network-diagnostics.test.ts`

- [x] **Step 1: 为 permission 类补充 access denied 文案回归**
- [x] **Step 2: 为 segment 类补充 subnet / mask 文案回归**
- [x] **Step 3: 为 presence 类补充 offline / no response 文案回归**
- [x] **Step 4: 保留 generic 与 unmatchedSegmentCount 的兜底覆盖**
- [x] **Step 5: 运行新单测，确认实现前按预期失败**

### Task 2: 扩充失败分类关键词

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\networkDiagnostics.ts`

- [x] **Step 1: permission 类增加 access denied / denied / forbidden / 拒绝**
- [x] **Step 2: segment 类增加 subnet / mask / 子网 / 掩码**
- [x] **Step 3: presence 类增加 offline / no response / unreachable / 无响应 / 不可达**

### Task 3: 完成验证与文档同步

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-refresh-diagnosis-keyword-classification.md`

- [x] **Step 1: 回跑 network-diagnostics 定向测试**
- [x] **Step 2: 回跑 app-shell 回归测试**
- [x] **Step 3: 回跑完整 `npm.cmd run test`**
- [x] **Step 4: 同步 README 与计划文档**
