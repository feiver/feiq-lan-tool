# Main Window Layout And Settings Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保持主窗口默认宽度不变的前提下，让首屏稳定显示“联系人 + 会话”双栏，并把设置中心拆成独立弹窗，同时将全局传输面板收口为轻量接收进度。

**Architecture:** 复用现有 `App + Zustand + SettingsPanel` 结构，不重建新的设置数据链路。主窗口改为左侧联系人列加轻量接收进度、右侧会话列；设置页通过 `WebviewWindow` 打开单独窗口，并通过 `?view=settings` 复用同一前端入口，只在设置窗口渲染设置面板。

**Tech Stack:** React 19, TypeScript, Zustand, Tauri 2, Vitest, Testing Library

---

## Scope Note

本计划覆盖：

- 主界面从三栏改为双栏
- 800 宽下仍展示会话区
- 设置中心改为单独弹窗
- 主界面传输展示改为“轻量接收进度”

本计划不覆盖：

- 启动动画 / 独立 splash
- 会话内完整实时文件进度流重构
- 设置项内容扩充

### Task 1: 先用测试锁定新的主窗口结构

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [x] **Step 1: 调整主界面结构断言**

把现有“主界面三块主面板”断言改成新预期：

```tsx
render(<App />);

expect(screen.getByText("在线联系人")).toBeInTheDocument();
expect(screen.getByText("消息会话")).toBeInTheDocument();
expect(screen.getByText("接收进度")).toBeInTheDocument();
expect(screen.queryByText("设置中心")).not.toBeInTheDocument();
```

- [x] **Step 2: 补设置入口测试**

新增一条测试，点击主界面的“设置”按钮后会调用设置窗口打开逻辑：

```tsx
await user.click(screen.getByRole("button", { name: "设置" }));
expect(mockedOpenSettingsWindow).toHaveBeenCalledTimes(1);
```

- [x] **Step 3: 补设置窗口视图测试**

新增一条测试，`view="settings"` 时只渲染设置中心：

```tsx
render(<App view="settings" />);

expect(screen.getByText("设置中心")).toBeInTheDocument();
expect(screen.queryByText("在线联系人")).not.toBeInTheDocument();
expect(screen.queryByText("消息会话")).not.toBeInTheDocument();
```

- [x] **Step 4: 补轻量接收进度测试**

把原“传输任务”测试改成只验证 incoming transfer：

```tsx
expect(screen.getByText("接收进度")).toBeInTheDocument();
expect(screen.getByText("来自 Alice")).toBeInTheDocument();
expect(screen.getByText("50% · 6 B / 12 B")).toBeInTheDocument();
```

并新增一条断言，只有 outgoing transfer 时不应渲染该文件名：

```tsx
expect(screen.queryByText("design.pdf")).not.toBeInTheDocument();
expect(screen.getByText("等待新的接收任务")).toBeInTheDocument();
```

- [x] **Step 5: 运行测试确认 RED**

Run:

```powershell
npm.cmd run test -- app-shell
```

Expected: 因主界面仍为三栏、设置仍在主界面内、接收进度尚未收口而失败。

### Task 2: 实现双栏主界面与轻量接收进度

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\App.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\contacts\ContactsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\transfers\TransfersPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\styles\app.css`

- [x] **Step 1: 改主视图结构**

在 `App.tsx` 中把主窗口改成：

```tsx
<main className="app-shell">
  <div className="left-column">
    <ContactsPanel ... onOpenSettings={...} />
    <TransfersPanel ... />
  </div>
  <ChatPanel ... />
</main>
```

删除原有 `right-column` 和主界面里的 `SettingsPanel`。

- [x] **Step 2: 把设置按钮放进联系人区**

在 `ContactsPanel.tsx` 中给 header 增加一个次级按钮：

```tsx
<button type="button" className="panel-secondary-action" onClick={onOpenSettings}>
  设置
</button>
```

- [x] **Step 3: 把传输面板收口为接收进度**

在 `TransfersPanel.tsx` 中：

- 只显示 `task.to_device_id === localDeviceId` 的任务
- 标题改为“接收进度”
- 无任务时显示“等待新的接收任务”
- 不再展示 outgoing 方向文案

- [x] **Step 4: 调整 800 宽布局**

在 `app.css` 中：

- `app-shell` 改为两列
- 下调单列断点到 `720px` 左右
- 缩小 `padding / gap`
- 增加 `left-column`
- 让 `panel-chat` 与 `chat-log` 支持 `min-width: 0` 与可滚动内容区

- [x] **Step 5: 运行测试确认 GREEN**

Run:

```powershell
npm.cmd run test -- app-shell
```

Expected: PASS。

### Task 3: 接入独立设置窗口

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\App.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\main.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\api.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\capabilities\default.json`

- [x] **Step 1: 先补前端窗口调用**

在 `src\desktop\api.ts` 中新增：

```ts
export async function openSettingsWindow(): Promise<void> {
  const existingWindow = await WebviewWindow.getByLabel("settings");
  if (existingWindow) {
    await existingWindow.show();
    await existingWindow.setFocus();
    return;
  }

  const settingsUrl = new URL(window.location.href);
  settingsUrl.searchParams.set("view", "settings");

  new WebviewWindow("settings", {
    title: "设置中心",
    url: settingsUrl.toString(),
    width: 1040,
    height: 760,
    minWidth: 900,
    minHeight: 640,
    center: true,
  });
}
```

- [x] **Step 2: 让前端入口支持 settings 视图**

在 `main.tsx` 中根据 query param 渲染：

```tsx
const view = new URLSearchParams(window.location.search).get("view") === "settings"
  ? "settings"
  : "main";

<App view={view} />
```

并在 `App.tsx` 中只在 `view === "settings"` 时渲染设置面板。

- [x] **Step 3: 放开 settings 窗口 capability**

在 `src-tauri\capabilities\default.json` 中把：

```json
"windows": ["main", "settings"]
```

- [x] **Step 4: 运行前端回归**

Run:

```powershell
npm.cmd run test -- app-shell
```

Expected: PASS。

### Task 4: README 与计划状态同步

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Modify: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-16-main-window-layout-and-settings-popup.md`

- [x] **Step 1: 更新 README 当前进度**

补一条当前状态：

```md
- ✅ 主界面已调整为联系人 + 会话双栏，设置中心改为独立弹窗，主窗口仅保留轻量接收进度
```

- [x] **Step 2: 回填计划勾选状态**

把本计划中已完成步骤勾选，保留未完成项，方便继续迭代。

## Self-Review

### Spec coverage

- 覆盖“保留当前宽度但直接看到会话区”
- 覆盖“设置中心单独弹出”
- 覆盖“传输任务收口为轻量接收进度”

### Placeholder scan

- 无 `TODO` / `TBD`
- 每个任务都带具体文件和命令

### Type consistency

- 视图枚举统一使用 `main | settings`
- 设置弹窗统一使用窗口 label `settings`
