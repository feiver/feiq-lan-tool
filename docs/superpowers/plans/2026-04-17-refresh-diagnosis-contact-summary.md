# Refresh Diagnosis Contact Summary Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-17）：**
> - 已完成：复制诊断摘要追加建议联系对象提示
> - 已验证：`npm.cmd run test -- app-shell --testNamePattern "(copies failed refresh reason and diagnosis summary from the latest failure detail|copies unmatched segments into refresh diagnosis summary|shows failure guidance and copy actions in latest refresh result)"`
> - 已验证：`npm.cmd run test -- app-shell`

**Goal:** 让用户复制刷新失败诊断摘要时，除了知道下一步动作，还能立刻判断更偏向本机先处理还是需要对端配合，减少补充说明。

**Architecture:** 继续复用 `networkDiagnostics.ts` 中已经收敛的失败分类规则，新增建议联系对象输出函数，并让 `SettingsPanel` 在诊断摘要中插入一行“建议联系对象”。这样建议动作、建议联系对象和建议排查列表都共享同一套分类判断，不会出现不同入口文案分叉。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: 用回归测试锁定建议联系对象

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 更新权限类复制摘要用例，要求带上建议联系对象**
- [x] **Step 2: 更新网段类复制摘要用例，要求带上建议联系对象**
- [x] **Step 3: 更新最近结果区复制摘要用例，要求带上建议联系对象**
- [x] **Step 4: 运行定向测试，确认实现前按预期失败**

### Task 2: 复用失败分类生成联系对象提示

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\networkDiagnostics.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`

- [x] **Step 1: 为每类失败生成一句建议联系对象提示**
- [x] **Step 2: 在诊断摘要中插入建议联系对象一行**
- [x] **Step 3: 保持历史详情与最近结果区共用同一套摘要逻辑**

### Task 3: 同步项目说明

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Add: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-17-refresh-diagnosis-contact-summary.md`

- [x] **Step 1: README 补充建议联系对象能力**
- [x] **Step 2: 记录本轮计划与完成状态**
