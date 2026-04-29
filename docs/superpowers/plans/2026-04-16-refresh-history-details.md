# Refresh History Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **实施状态（2026-04-16）：**
> - 已完成：Rust 历史详情模型与旧格式兼容、前端历史详情展开、README 同步
> - 已验证：`npm.cmd run test -- app-shell`、`cargo test --lib --test settings_store_tests --target-dir target-codex`
> - 说明：默认 `target` 目录中的 `feiq-lan-tool.exe` 被正在运行的程序占用，因此 Rust 测试改用独立 `target-codex` 目录完成验证

**Goal:** 让“网络与发现”的最近刷新历史支持按条展开详情，并在重启后恢复每次刷新的完整诊断快照。

**Architecture:** 扩展刷新历史的数据模型，在每条历史中持久化“新增设备 / 已在线设备 / 未命中网段 / 网段状态”详情。前端在设置页为历史项增加“查看详情 / 收起详情”，一次仅展开一条；Rust 持久化与 Tauri 桥接同时升级，并对旧版历史 JSON 保持向后兼容。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Tauri 2, Rust, serde

---

### Task 1: 扩展 Rust 侧历史模型并锁定兼容性

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\models.rs`
- Modify: `D:\我的工作空间\feiq-lan-tool\src-tauri\src\settings_store.rs`
- Test: `D:\我的工作空间\feiq-lan-tool\src-tauri\tests\settings_store_tests.rs`

- [ ] **Step 1: 先补 Rust 持久化测试，覆盖详情 roundtrip 与旧格式兼容**

```rust
#[test]
fn save_and_load_discovery_refresh_history_roundtrip() {
    let path = temp_settings_path();
    let history = vec![
        DiscoveryRefreshHistoryEntry {
            id: "history-1".into(),
            timestamp: 1_713_264_000_000,
            status: DiscoveryRefreshHistoryStatus::Succeeded,
            discovered_count: 2,
            existing_count: 1,
            unmatched_segment_count: 0,
            message: String::new(),
            new_device_labels: vec!["Bob · 192.168.10.20".into()],
            existing_device_labels: vec!["Alice · 192.168.1.10".into()],
            unmatched_segments: vec!["10.0.0.0/24".into()],
            segment_statuses: vec![DiscoveryRefreshSegmentStatusSummary {
                segment: "192.168.10.0/24".into(),
                status: DiscoveryRefreshSegmentStatus::NewlyMatched,
                new_device_count: 1,
                existing_device_count: 0,
            }],
        },
    ];

    save_discovery_refresh_history_to_path(&path, &history).expect("save refresh history");
    let loaded =
        load_discovery_refresh_history_from_path(&path).expect("load refresh history");

    assert_eq!(loaded, history);
    fs::remove_file(path).expect("cleanup refresh history file");
}

#[test]
fn load_legacy_discovery_refresh_history_without_detail_fields() {
    let path = temp_settings_path();
    fs::write(
        &path,
        r#"[
          {
            "id": "legacy-1",
            "timestamp": 1713264000000,
            "status": "Succeeded",
            "discovered_count": 2,
            "existing_count": 1,
            "unmatched_segment_count": 0,
            "message": ""
          }
        ]"#,
    )
    .expect("write legacy refresh history");

    let loaded =
        load_discovery_refresh_history_from_path(&path).expect("load legacy refresh history");

    assert_eq!(loaded[0].new_device_labels, Vec::<String>::new());
    assert_eq!(loaded[0].existing_device_labels, Vec::<String>::new());
    assert_eq!(loaded[0].unmatched_segments, Vec::<String>::new());
    assert!(loaded[0].segment_statuses.is_empty());
    fs::remove_file(path).expect("cleanup legacy refresh history");
}
```

- [ ] **Step 2: 运行 Rust 定向测试，确认新增场景先 RED**

Run: `cargo test --test settings_store_tests`  
Expected: FAIL，提示 `DiscoveryRefreshHistoryEntry` 或新增详情字段尚不存在。

- [ ] **Step 3: 在 Rust 模型中补详情结构和默认值兼容**

```rust
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DiscoveryRefreshSegmentStatus {
    NewlyMatched,
    AlreadyOnline,
    Unmatched,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct DiscoveryRefreshSegmentStatusSummary {
    pub segment: String,
    pub status: DiscoveryRefreshSegmentStatus,
    pub new_device_count: usize,
    pub existing_device_count: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DiscoveryRefreshHistoryEntry {
    pub id: String,
    pub timestamp: i64,
    pub status: DiscoveryRefreshHistoryStatus,
    pub discovered_count: usize,
    pub existing_count: usize,
    pub unmatched_segment_count: usize,
    pub message: String,
    #[serde(default)]
    pub new_device_labels: Vec<String>,
    #[serde(default)]
    pub existing_device_labels: Vec<String>,
    #[serde(default)]
    pub unmatched_segments: Vec<String>,
    #[serde(default)]
    pub segment_statuses: Vec<DiscoveryRefreshSegmentStatusSummary>,
}
```

- [ ] **Step 4: 给新增状态枚举补默认实现，保证 `serde(default)` 可用**

```rust
impl Default for DiscoveryRefreshSegmentStatus {
    fn default() -> Self {
        Self::Unmatched
    }
}
```

- [ ] **Step 5: 重新运行 Rust 定向测试，确认兼容逻辑通过**

Run: `cargo test --test settings_store_tests`  
Expected: PASS，包含历史详情 roundtrip 与旧格式兼容测试。

### Task 2: 先用前端测试锁定“查看详情 / 收起详情”行为

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\test\app-shell.test.tsx`

- [ ] **Step 1: 为成功历史项补“查看详情”测试**

```tsx
test("expands refresh history details for succeeded entries", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24", "10.0.0.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    {
      id: "history-1",
      timestamp: 1713264000000,
      status: "Succeeded",
      discoveredCount: 2,
      existingCount: 1,
      unmatchedSegmentCount: 1,
      message: "",
      newDeviceLabels: ["Bob · 192.168.10.20"],
      existingDeviceLabels: ["Alice · 192.168.1.10"],
      unmatchedSegments: ["10.0.0.0/24"],
      segmentStatuses: [
        {
          segment: "192.168.10.0/24",
          status: "NewlyMatched",
          newDeviceCount: 1,
          existingDeviceCount: 0,
        },
      ],
    },
  ]);

  render(<App view="settings" />);
  await user.click(screen.getByRole("button", { name: /网络与发现/ }));
  await user.click(screen.getByRole("button", { name: "查看详情" }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "收起详情" })).toBeInTheDocument();
    expect(screen.getByText("Bob · 192.168.10.20")).toBeInTheDocument();
    expect(screen.getByText("Alice · 192.168.1.10")).toBeInTheDocument();
    expect(screen.getAllByText("10.0.0.0/24").length).toBeGreaterThan(0);
    expect(screen.getByText("本次新增命中")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 为失败历史项和单条展开规则补测试**

```tsx
test("shows failure reason in refresh history details and keeps one item expanded", async () => {
  const user = userEvent.setup();

  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    {
      id: "history-1",
      timestamp: 1713264200000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请检查本机网络权限或稍后重试。",
      newDeviceLabels: [],
      existingDeviceLabels: [],
      unmatchedSegments: [],
      segmentStatuses: [],
    },
    {
      id: "history-2",
      timestamp: 1713264100000,
      status: "Succeeded",
      discoveredCount: 1,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
      newDeviceLabels: ["Bob · 192.168.10.20"],
      existingDeviceLabels: ["Alice · 192.168.1.10"],
      unmatchedSegments: [],
      segmentStatuses: [],
    },
  ]);

  render(<App view="settings" />);
  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  await user.click(screen.getAllByRole("button", { name: "查看详情" })[0]);
  expect(screen.getByText("失败原因")).toBeInTheDocument();
  expect(screen.getByText("请检查本机网络权限或稍后重试。")).toBeInTheDocument();

  await user.click(screen.getAllByRole("button", { name: "查看详情" })[0]);
  expect(screen.queryByText("失败原因")).not.toBeInTheDocument();
});
```

- [ ] **Step 3: 跑前端定向测试，确认这些断言先失败**

Run: `npm.cmd run test -- app-shell`  
Expected: FAIL，提示 `查看详情` 按钮或详情内容尚未渲染。

### Task 3: 实现前端类型、桥接、运行时历史详情和设置页展开交互

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\types.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\api.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\networkDiagnostics.ts`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\desktop\modules\settings\SettingsPanel.tsx`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\styles\app.css`
- Modify: `D:\我的工作空间\feiq-lan-tool\src\App.tsx`

- [ ] **Step 1: 把网段状态摘要类型提升到共享类型，供历史项复用**

```ts
export type DiscoveryRefreshSegmentStatus =
  | "NewlyMatched"
  | "AlreadyOnline"
  | "Unmatched";

export type DiscoveryRefreshSegmentStatusSummary = {
  segment: string;
  status: DiscoveryRefreshSegmentStatus;
  newDeviceCount: number;
  existingDeviceCount: number;
};

export type DiscoveryRefreshHistoryEntry = {
  id: string;
  timestamp: number;
  status: DiscoveryRefreshHistoryStatus;
  discoveredCount: number;
  existingCount: number;
  unmatchedSegmentCount: number;
  message: string;
  newDeviceLabels: string[];
  existingDeviceLabels: string[];
  unmatchedSegments: string[];
  segmentStatuses: DiscoveryRefreshSegmentStatusSummary[];
};
```

- [ ] **Step 2: 更新 Tauri 桥接映射，给旧数据做前端兜底**

```ts
export function getDiscoveryRefreshHistory(): Promise<DiscoveryRefreshHistoryEntry[]> {
  return invoke<Array<{
    id: string;
    timestamp: number;
    status: DiscoveryRefreshHistoryEntry["status"];
    discovered_count: number;
    existing_count: number;
    unmatched_segment_count: number;
    message: string;
    new_device_labels?: string[];
    existing_device_labels?: string[];
    unmatched_segments?: string[];
    segment_statuses?: Array<{
      segment: string;
      status: DiscoveryRefreshSegmentStatusSummary["status"];
      new_device_count: number;
      existing_device_count: number;
    }>;
  }>>("get_discovery_refresh_history").then((entries) =>
    entries.map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      status: entry.status,
      discoveredCount: entry.discovered_count,
      existingCount: entry.existing_count,
      unmatchedSegmentCount: entry.unmatched_segment_count,
      message: entry.message,
      newDeviceLabels: entry.new_device_labels ?? [],
      existingDeviceLabels: entry.existing_device_labels ?? [],
      unmatchedSegments: entry.unmatched_segments ?? [],
      segmentStatuses: (entry.segment_statuses ?? []).map((segment) => ({
        segment: segment.segment,
        status: segment.status,
        newDeviceCount: segment.new_device_count,
        existingDeviceCount: segment.existing_device_count,
      })),
    })),
  );
}
```

- [ ] **Step 3: 在运行时把刷新结果详情写入历史项**

```ts
const historyEntry: DiscoveryRefreshHistoryEntry = {
  id: `refresh-${refreshTimestamp}`,
  timestamp: refreshTimestamp,
  status: "Succeeded",
  discoveredCount: refreshSummary.discoveredCount,
  existingCount: refreshSummary.existingDeviceLabels.length,
  unmatchedSegmentCount: refreshSummary.unmatchedSegments.length,
  message: "",
  newDeviceLabels: refreshSummary.newDeviceLabels,
  existingDeviceLabels: refreshSummary.existingDeviceLabels,
  unmatchedSegments: refreshSummary.unmatchedSegments,
  segmentStatuses: refreshSummary.segmentStatuses,
};
```

- [ ] **Step 4: 失败历史项写入空详情数组，保持结构一致**

```ts
const nextHistory = prependRefreshHistoryEntry(current.history, {
  id: `refresh-${refreshTimestamp}`,
  timestamp: refreshTimestamp,
  status: "Failed",
  discoveredCount: 0,
  existingCount: 0,
  unmatchedSegmentCount: 0,
  message: "请检查本机网络权限或稍后重试。",
  newDeviceLabels: [],
  existingDeviceLabels: [],
  unmatchedSegments: [],
  segmentStatuses: [],
});
```

- [ ] **Step 5: 在设置页增加单条展开状态与详情面板**

```tsx
const [expandedRefreshHistoryId, setExpandedRefreshHistoryId] = useState<string | null>(null);

useEffect(() => {
  if (
    expandedRefreshHistoryId &&
    !filteredRefreshHistory.some((entry) => entry.id === expandedRefreshHistoryId)
  ) {
    setExpandedRefreshHistoryId(null);
  }
}, [expandedRefreshHistoryId, filteredRefreshHistory]);

{visibleRefreshHistory.map((entry) => {
  const isExpanded = expandedRefreshHistoryId === entry.id;

  return (
    <li key={entry.id}>
      <div className="settings-diagnostics-item-main">
        <strong>{formatRefreshTime(entry.timestamp)}</strong>
        <span className={`settings-status-badge ${entry.status === "Failed" ? "Unmatched" : "AlreadyOnline"}`}>
          {entry.status === "Failed" ? "刷新失败" : "已完成"}
        </span>
      </div>
      <span>{formatRefreshHistoryEntry(entry)}</span>
      <div className="settings-field-row">
        <button
          type="button"
          onClick={() =>
            setExpandedRefreshHistoryId((current) =>
              current === entry.id ? null : entry.id,
            )
          }
        >
          {isExpanded ? "收起详情" : "查看详情"}
        </button>
        {entry.status === "Failed" ? (
          <button
            type="button"
            onClick={() => void handleRefreshDiscovery()}
            disabled={isRefreshDisabled}
          >
            立即重试
          </button>
        ) : null}
      </div>
      {isExpanded ? (
        <div className="settings-diagnostics-block">
          {/* 根据成功 / 失败状态渲染详情 */}
        </div>
      ) : null}
    </li>
  );
})}
```

- [ ] **Step 6: 给详情面板补轻量样式，保持与现有诊断块一致**

```css
.settings-history-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.settings-history-detail-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(240, 245, 255, 0.9);
}
```

- [ ] **Step 7: 重新运行前端测试，确认“查看详情 / 收起详情”通过**

Run: `npm.cmd run test -- app-shell`  
Expected: PASS，包含新增的历史详情测试。

### Task 4: 同步 README、计划状态并完成最终验证

**Files:**
- Modify: `D:\我的工作空间\feiq-lan-tool\README.md`
- Modify: `D:\我的工作空间\feiq-lan-tool\docs\superpowers\plans\2026-04-16-refresh-history-details.md`

- [ ] **Step 1: 更新 README 功能点与进度说明**

```md
- 最近刷新历史支持按条查看详情
- ✅ 最近刷新历史支持回看新增设备、已在线设备、未命中网段与网段状态
```

- [ ] **Step 2: 在本计划文档中勾选已完成步骤并记录验证结果**

```md
## 验证结果

- [x] `npm.cmd run test -- app-shell`
- [x] `cargo test --test settings_store_tests`
```

- [ ] **Step 3: 执行最终验证**

Run: `npm.cmd run test -- app-shell`  
Expected: PASS，前端 42+ 条测试全绿。  

Run: `cargo test --test settings_store_tests`  
Expected: PASS，刷新历史持久化测试通过。

## 验证结果

- [x] `npm.cmd run test -- app-shell`
- [x] `cargo test --lib --test settings_store_tests --target-dir target-codex`
