# Manual Segment Probing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让“手动网段”设置从仅影响广播目标，升级为真正可用的 FeiQ2013 风格跨网段发现能力。

**Architecture:** 保留当前 `DiscoveryMode` 和设置 UI，不新增复杂页面；在协议中增加轻量 `DiscoveryProbe` 事件，`ManualSegments` 模式下按用户配置网段主动向主机地址发送探测包，收到探测的节点回发自己的 `DeviceAnnouncement`。这样网段设置既继续参与广播，又能通过主动探测发现其他网段在线节点。

**Tech Stack:** Rust, Tauri 2, Serde, React 19, TypeScript, Vitest

---

### Task 1: 先用测试锁定协议与探测目标行为

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\tests\protocol_tests.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\runtime.rs`

- [x] **Step 1: 给 `DiscoveryProbe` 补协议 roundtrip 测试**
- [x] **Step 2: 给手动网段主机展开补单元测试**
- [x] **Step 3: 运行相关测试确认 RED**

### Task 2: 实现探测协议与运行时主动发现

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\models.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\runtime.rs`

- [x] **Step 1: 在 `LanEvent` 中新增 `DiscoveryProbe`**
- [x] **Step 2: 在 discovery announcer 中增加 `ManualSegments` 主动探测**
- [x] **Step 3: 在 discovery listener 中处理 probe 并回发 `DeviceAnnouncement`**
- [x] **Step 4: 运行测试确认 GREEN**

### Task 3: 文档同步

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Modify: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-16-manual-segment-probing.md`

- [x] **Step 1: 更新 README，说明手动网段已支持主动探测**
- [x] **Step 2: 回填本计划勾选状态**

## Self-Review

### Spec coverage

- 覆盖“网段设置真正生效”
- 覆盖“参照 FeiQ2013 的其他网段好友探测思路”

### Placeholder scan

- 无 `TODO` / `TBD`

### Type consistency

- 新增事件统一命名为 `DiscoveryProbe`
