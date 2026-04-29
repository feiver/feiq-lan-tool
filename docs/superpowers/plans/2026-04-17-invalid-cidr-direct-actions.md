# Invalid CIDR Direct Actions Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：手动网段存在无效 CIDR 时改为直接动作提示
> - 已完成：提供“清空无效项”和“填入示例网段”两个动作
> - 已完成：统一复用示例网段写入逻辑，避免不同入口行为漂移
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "(shows validation error for invalid manual network segments|shows direct actions when manual segments are empty)"`
> - 已验证：`npm.cmd run test -- app-shell`
> - 已验证：`npm.cmd run test`

**Goal:** 当用户在“手动网段辅助发现”里填写了无效 CIDR 时，不再只显示一条错误文案，而是直接给出最快可执行的修复动作，减少逐行排查和反复手填成本。

**Architecture:** 保持现有 CIDR 校验、刷新禁用逻辑和 textarea 输入方式不变，只把无效 CIDR 的错误提示替换为 inline prompt 动作块。`清空无效项` 保留当前所有有效网段并过滤掉无效项；`填入示例网段` 直接写入 `192.168.10.0/24`；两个动作都在执行后聚焦回手动网段输入框。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用回归测试锁定无效 CIDR 动作提示

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 稳定构造“有效 CIDR + 无效 CIDR”混合输入场景**
- [x] **Step 2: 断言出现“清空无效项”和“填入示例网段”按钮**
- [x] **Step 3: 断言清空无效项后仅保留有效网段**
- [x] **Step 4: 断言填入示例网段后恢复为默认示例 CIDR**

### Task 2: 实现最简直接动作

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 将无效 CIDR 提示替换为动作块**
- [x] **Step 2: 接入清空无效项动作，过滤掉所有无效条目**
- [x] **Step 3: 接入填入示例网段动作并复用统一写入逻辑**
- [x] **Step 4: 复用现有 inline prompt 样式，不新增额外流程**

### Task 3: 验证并同步文档

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-invalid-cidr-direct-actions.md`

- [x] **Step 1: 运行定向 app-shell 验证**
- [x] **Step 2: 运行完整 app-shell 验证**
- [x] **Step 3: 运行完整 Vitest 验证**
- [x] **Step 4: 同步 README 与计划文档**
