import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

import type {
  AppPreferences,
  DiscoveryRefreshHistoryEntry,
  KnownDevice,
  SettingsSnapshot,
} from "../../types";
import { defaultChatPreferences } from "../../types";
import {
  buildManualSegmentCoverage,
  buildRefreshFailureActionSummary,
  buildRefreshFailureContactSummary,
  buildRefreshFailureRetryTimingSummary,
  buildRefreshFailureSuggestions,
  buildManualSegmentSummaries,
  buildRefreshHistorySummary,
  formatRefreshHistoryEntry,
  formatRefreshTime,
  getLatestFailureTone,
  getDiscoveryModeDescription,
  getSegmentRefreshStatusLabel,
  isValidIpv4Cidr,
  matchDevicesToManualSegments,
  totalManualProbeHosts,
  type DiscoveryRefreshFeedback,
} from "./networkDiagnostics";

type SettingsGroupKey = "identity" | "chat" | "transfer" | "network" | "display";
type RefreshHistoryFilter = "All" | "Failed";

type SettingsPanelProps = {
  preferences: AppPreferences;
  runtime: SettingsSnapshot["runtime"];
  onlineDevices: KnownDevice[];
  onlineDeviceCount: number;
  discoveryRefreshFeedback: DiscoveryRefreshFeedback;
  onChange: (updater: (current: AppPreferences) => AppPreferences) => void;
  onPickDownloadDir: () => void;
  onRefreshDiscovery: () => Promise<void> | void;
  onClearRefreshHistory: () => void;
};

const groups: Array<{
  key: SettingsGroupKey;
  label: string;
  description: string;
  disabled?: boolean;
}> = [
  { key: "identity", label: "个人与身份", description: "设置你在局域网中的展示信息" },
  { key: "chat", label: "聊天与通知", description: "消息提醒与提示策略" },
  { key: "transfer", label: "文件传输", description: "文件接收、保存与目录行为" },
  { key: "network", label: "网络与发现", description: "设备发现方式与当前网络状态" },
  { key: "display", label: "显示与通用", description: "托盘与界面行为" },
];

export function SettingsPanel({
  preferences,
  runtime,
  onlineDevices,
  onlineDeviceCount,
  discoveryRefreshFeedback,
  onChange,
  onPickDownloadDir,
  onRefreshDiscovery,
  onClearRefreshHistory,
}: SettingsPanelProps) {
  const [activeGroup, setActiveGroup] = useState<SettingsGroupKey>("identity");
  const [refreshHistoryFilter, setRefreshHistoryFilter] =
    useState<RefreshHistoryFilter>("All");
  const [isRefreshHistoryExpanded, setIsRefreshHistoryExpanded] = useState(false);
  const [expandedRefreshHistoryId, setExpandedRefreshHistoryId] = useState<string | null>(
    null,
  );
  const [refreshHistoryCopyFeedback, setRefreshHistoryCopyFeedback] = useState<
    string | null
  >(null);
  const [latestRefreshCopyFeedback, setLatestRefreshCopyFeedback] = useState<
    string | null
  >(null);
  const chatPreferences = {
    ...defaultChatPreferences,
    ...(preferences.chat ?? {}),
  };
  const discoveryModeSelectRef = useRef<HTMLSelectElement | null>(null);
  const manualSegmentsInputRef = useRef<HTMLTextAreaElement | null>(null);
  const latestFailureSuggestionsRef = useRef<HTMLDivElement | null>(null);
  const deviceAttributionBlockRef = useRef<HTMLDivElement | null>(null);
  const newDiscoveryResultCardRef = useRef<HTMLDivElement | null>(null);
  const existingDevicesResultCardRef = useRef<HTMLDivElement | null>(null);
  const manualSegmentsText = useMemo(
    () => preferences.network.manualSegments.join("\n"),
    [preferences.network.manualSegments],
  );
  const invalidManualSegments = useMemo(
    () =>
      preferences.network.manualSegments.filter(
        (segment) => !isValidIpv4Cidr(segment),
      ),
    [preferences.network.manualSegments],
  );
  const isManualSegmentsMode =
    preferences.network.discoveryMode === "ManualSegments";
  const manualSegmentSummaries = useMemo(
    () => buildManualSegmentSummaries(preferences.network.manualSegments),
    [preferences.network.manualSegments],
  );
  const manualProbeHostCount = useMemo(
    () => totalManualProbeHosts(manualSegmentSummaries),
    [manualSegmentSummaries],
  );
  const manualSegmentMatches = useMemo(
    () => matchDevicesToManualSegments(onlineDevices, manualSegmentSummaries),
    [manualSegmentSummaries, onlineDevices],
  );
  const manualSegmentCoverage = useMemo(
    () => buildManualSegmentCoverage(manualSegmentSummaries, manualSegmentMatches),
    [manualSegmentMatches, manualSegmentSummaries],
  );
  const matchedManualSegmentCount = useMemo(
    () =>
      manualSegmentMatches.filter((device) => device.matchedSegment !== null).length,
    [manualSegmentMatches],
  );
  const unmatchedManualSegmentCount = useMemo(
    () =>
      manualSegmentMatches.filter((device) => device.matchedSegment === null).length,
    [manualSegmentMatches],
  );
  const unmatchedManualSegments = useMemo(
    () =>
      manualSegmentCoverage.filter((segment) => segment.matchedDeviceCount === 0),
    [manualSegmentCoverage],
  );
  const isRefreshDisabled =
    discoveryRefreshFeedback.isRefreshing ||
    (isManualSegmentsMode &&
      (invalidManualSegments.length > 0 ||
        preferences.network.manualSegments.length === 0));
  const refreshStatusLabel = discoveryRefreshFeedback.isRefreshing
    ? "刷新中"
    : discoveryRefreshFeedback.lastErrorMessage
      ? "刷新失败"
    : discoveryRefreshFeedback.lastRefreshAtMs
      ? "已完成"
      : "待刷新";
  const refreshTimeLabel = discoveryRefreshFeedback.lastRefreshAtMs
    ? `最近刷新：${formatRefreshTime(discoveryRefreshFeedback.lastRefreshAtMs)}`
    : "尚未手动刷新";
  const hasRefreshResult = discoveryRefreshFeedback.lastRefreshAtMs !== null;
  const showAllSegmentsUnmatchedWarning =
    isManualSegmentsMode &&
    manualSegmentSummaries.length > 0 &&
    discoveryRefreshFeedback.lastUnmatchedSegments.length ===
      manualSegmentSummaries.length;
  const showNoOnlineDevicePrompt =
    !discoveryRefreshFeedback.lastErrorMessage &&
    discoveryRefreshFeedback.lastNewDeviceLabels.length === 0 &&
    discoveryRefreshFeedback.lastExistingDeviceLabels.length === 0;
  const filteredRefreshHistory = useMemo(
    () =>
      discoveryRefreshFeedback.history.filter((entry) =>
        refreshHistoryFilter === "Failed" ? entry.status === "Failed" : true,
      ),
    [discoveryRefreshFeedback.history, refreshHistoryFilter],
  );
  const isRefreshHistoryExpandable = filteredRefreshHistory.length > 3;
  const visibleRefreshHistory = useMemo(
    () =>
      isRefreshHistoryExpanded
        ? filteredRefreshHistory
        : filteredRefreshHistory.slice(0, 3),
    [filteredRefreshHistory, isRefreshHistoryExpanded],
  );
  const refreshHistorySummary = useMemo(
    () => buildRefreshHistorySummary(discoveryRefreshFeedback.history),
    [discoveryRefreshFeedback.history],
  );
  const refreshHistorySuccessRateTone =
    refreshHistorySummary.successRate >= 80
      ? "is-success"
      : refreshHistorySummary.successRate >= 50
        ? "is-warning"
        : "is-danger";
  const refreshHistoryFailureTone =
    refreshHistorySummary.consecutiveFailureCount >= 2
      ? "is-danger"
      : refreshHistorySummary.consecutiveFailureCount === 1
        ? "is-warning"
        : "is-success";
  const refreshHistoryLatestFailureTone = getLatestFailureTone(
    refreshHistorySummary.latestFailureAt,
  );
  const latestRefreshFailureEntry = useMemo<DiscoveryRefreshHistoryEntry | null>(() => {
    if (
      discoveryRefreshFeedback.lastRefreshAtMs === null ||
      discoveryRefreshFeedback.lastErrorMessage === null
    ) {
      return null;
    }

    return {
      id: "latest-refresh-result",
      timestamp: discoveryRefreshFeedback.lastRefreshAtMs,
      status: "Failed",
      discoveredCount: discoveryRefreshFeedback.lastDiscoveredCount ?? 0,
      existingCount: discoveryRefreshFeedback.lastExistingDeviceLabels.length,
      unmatchedSegmentCount: discoveryRefreshFeedback.lastUnmatchedSegments.length,
      message: discoveryRefreshFeedback.lastErrorMessage,
      newDeviceLabels: discoveryRefreshFeedback.lastNewDeviceLabels,
      existingDeviceLabels: discoveryRefreshFeedback.lastExistingDeviceLabels,
      unmatchedSegments: discoveryRefreshFeedback.lastUnmatchedSegments,
      segmentStatuses: discoveryRefreshFeedback.lastSegmentStatuses,
    };
  }, [discoveryRefreshFeedback]);

  useEffect(() => {
    if (
      expandedRefreshHistoryId &&
      !filteredRefreshHistory.some((entry) => entry.id === expandedRefreshHistoryId)
    ) {
      setExpandedRefreshHistoryId(null);
    }
  }, [expandedRefreshHistoryId, filteredRefreshHistory]);

  useEffect(() => {
    setRefreshHistoryCopyFeedback(null);
  }, [expandedRefreshHistoryId, refreshHistoryFilter]);

  useEffect(() => {
    setLatestRefreshCopyFeedback(null);
  }, [
    discoveryRefreshFeedback.lastErrorMessage,
    discoveryRefreshFeedback.lastRefreshAtMs,
  ]);

  async function handleRefreshDiscovery() {
    if (isRefreshDisabled) {
      return;
    }

    try {
      await onRefreshDiscovery();
    } catch {
      // 失败结果由 App 状态统一记录，这里避免未处理 Promise 冒泡。
    }
  }

  function updateManualSegments(manualSegments: string[]) {
    onChange((current) => ({
      ...current,
      network: {
        ...current.network,
        manualSegments,
      },
    }));
  }

  function handleUseExampleManualSegment() {
    updateManualSegments(["192.168.10.0/24"]);
    manualSegmentsInputRef.current?.focus();
  }

  function handleSwitchToAutoDiscovery() {
    onChange((current) => ({
      ...current,
      network: {
        ...current.network,
        discoveryMode: "Auto",
      },
    }));
  }

  function handleFocusDiscoveryMode() {
    discoveryModeSelectRef.current?.focus();
  }

  function handleFocusDeviceAttribution() {
    deviceAttributionBlockRef.current?.focus();
  }

  function handleFocusNewDiscoveryResult() {
    newDiscoveryResultCardRef.current?.focus();
  }

  function handleFocusExistingDevicesResult() {
    existingDevicesResultCardRef.current?.focus();
  }

  function focusHistoryExistingDevicesCard(source: HTMLElement) {
    const detailGrid = source.closest(".settings-history-detail-grid");
    const existingDevicesCard = detailGrid?.querySelector<HTMLElement>(
      "[data-history-existing-devices-card='true']",
    );

    existingDevicesCard?.focus();
  }

  function focusHistoryNewDiscoveryCard(source: HTMLElement) {
    const detailGrid = source.closest(".settings-history-detail-grid");
    const newDiscoveryCard = detailGrid?.querySelector<HTMLElement>(
      "[data-history-new-discovery-card='true']",
    );

    newDiscoveryCard?.focus();
  }

  function focusHistorySegmentStatusCard(source: HTMLElement) {
    const detailGrid = source.closest(".settings-history-detail-grid");
    const segmentStatusCard = detailGrid?.querySelector<HTMLElement>(
      "[data-history-segment-status-card='true']",
    );

    segmentStatusCard?.focus();
  }

  function focusHistoryUnmatchedSegmentsCard(source: HTMLElement) {
    const detailGrid = source.closest(".settings-history-detail-grid");
    const unmatchedCard = detailGrid?.querySelector<HTMLElement>(
      "[data-history-unmatched-card='true']",
    );

    unmatchedCard?.focus();
  }

  function handleClearInvalidManualSegments() {
    updateManualSegments(
      preferences.network.manualSegments.filter((segment) => isValidIpv4Cidr(segment)),
    );
    manualSegmentsInputRef.current?.focus();
  }

  function focusRefreshHistoryAll() {
    setRefreshHistoryFilter("All");
    setIsRefreshHistoryExpanded(true);
    setExpandedRefreshHistoryId(null);
  }

  function focusRefreshHistoryFailures() {
    const latestFailedEntry =
      discoveryRefreshFeedback.history.find((entry) => entry.status === "Failed") ??
      null;

    if (latestFailedEntry === null) {
      focusRefreshHistoryAll();
      return;
    }

    setRefreshHistoryFilter("Failed");
    setIsRefreshHistoryExpanded(true);
    setExpandedRefreshHistoryId(latestFailedEntry.id);
  }

  async function copyRefreshText(
    text: string,
    successMessage: string,
    setFeedback: (message: string | null) => void,
  ) {
    if (!window.navigator.clipboard?.writeText) {
      setFeedback("当前环境暂不支持复制");
      return;
    }

    try {
      await window.navigator.clipboard.writeText(text);
      setFeedback(successMessage);
    } catch {
      setFeedback("复制失败，请稍后重试");
    }
  }

  function buildRefreshFailureDiagnosis(entry: DiscoveryRefreshFeedback["history"][number]) {
    const suggestions = buildRefreshFailureSuggestions(entry);
    const discoveryContext = [
      `当前发现方式：${getDiscoveryModeDescription(preferences.network.discoveryMode)}`,
    ];
    const overviewSummary =
      preferences.network.discoveryMode === "ManualSegments" &&
      manualSegmentSummaries.length > 0
        ? [
            `失败概览：最近连续失败 ${refreshHistorySummary.consecutiveFailureCount} 次；当前手动网段 ${manualSegmentSummaries.length} 个，未命中 ${entry.unmatchedSegments.length} 个`,
          ]
        : [`失败概览：最近连续失败 ${refreshHistorySummary.consecutiveFailureCount} 次`];
    const manualSegmentContext =
      preferences.network.discoveryMode === "ManualSegments" &&
      manualSegmentSummaries.length > 0
        ? [`当前手动网段：${manualSegmentSummaries.map((segment) => segment.segment).join("、")}`]
        : [];
    const unmatchedSegmentSummary =
      entry.unmatchedSegments.length > 0
        ? [`当前未命中网段：${entry.unmatchedSegments.join("、")}`]
        : [];

    return [
      `最近失败时间：${formatRefreshTime(entry.timestamp)}`,
      ...discoveryContext,
      ...manualSegmentContext,
      ...overviewSummary,
      `建议动作：${buildRefreshFailureActionSummary(entry)}`,
      `建议联系对象：${buildRefreshFailureContactSummary(entry)}`,
      `建议重试时机：${buildRefreshFailureRetryTimingSummary(entry)}`,
      `失败原因：${entry.message}`,
      ...unmatchedSegmentSummary,
      `连续失败次数：${refreshHistorySummary.consecutiveFailureCount} 次`,
      "建议排查：",
      ...suggestions.map((suggestion) => `- ${suggestion}`),
    ].join("\n");
  }

  function renderRefreshFailureDetail(
    entry: DiscoveryRefreshHistoryEntry,
    copyFeedback: string | null,
    setCopyFeedback: (message: string | null) => void,
    suggestionsRef?: RefObject<HTMLDivElement | null>,
  ) {
    return (
      <div className="settings-history-detail-grid">
        <div className="settings-history-detail-card">
          <span>失败原因</span>
          <p>{entry.message}</p>
          <div className="settings-history-detail-actions">
            <button
              type="button"
              onClick={() =>
                void copyRefreshText(entry.message, "失败原因已复制", setCopyFeedback)
              }
            >
              复制失败原因
            </button>
            <button
              type="button"
              onClick={() =>
                void copyRefreshText(
                  buildRefreshFailureDiagnosis(entry),
                  "诊断摘要已复制",
                  setCopyFeedback,
                )
              }
            >
              复制诊断摘要
            </button>
          </div>
          {copyFeedback ? <p className="settings-field-hint">{copyFeedback}</p> : null}
        </div>
        <div
          className="settings-history-detail-card"
          ref={suggestionsRef}
          tabIndex={suggestionsRef ? -1 : undefined}
        >
          <span>建议排查</span>
          <ul className="settings-refresh-result-list settings-history-suggestion-list">
            {buildRefreshFailureSuggestions(entry).map((suggestion) => (
              <li key={`${entry.id}-${suggestion}`}>{suggestion}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <section className="panel panel-settings">
      <div className="panel-header settings-panel-header">
        <div>
          <p className="panel-kicker">Preferences</p>
          <h2>设置中心</h2>
        </div>
      </div>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="设置分组">
          {groups.map((group) => (
            <button
              key={group.key}
              type="button"
              className={group.key === activeGroup ? "is-active" : ""}
              disabled={group.disabled}
              onClick={() => setActiveGroup(group.key)}
            >
              <strong>{group.label}</strong>
              <span>{group.description}</span>
            </button>
          ))}
        </nav>
        <div className="settings-section">
          {activeGroup === "identity" ? (
            <>
              <div className="settings-section-header">
                <h3>个人与身份</h3>
                <p>优先落地昵称、状态和展示方式。</p>
              </div>
              <label className="settings-field">
                <span>昵称</span>
                <input
                  aria-label="昵称"
                  value={preferences.identity.nickname}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      identity: {
                        ...current.identity,
                        nickname: event.currentTarget.value,
                      },
                    }))
                  }
                />
              </label>
              <label className="settings-field">
                <span>展示方式</span>
                <select
                  aria-label="展示方式"
                  value={preferences.identity.deviceNameMode}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      identity: {
                        ...current.identity,
                        deviceNameMode: event.currentTarget
                          .value as AppPreferences["identity"]["deviceNameMode"],
                      },
                    }))
                  }
                >
                  <option value="NicknameOnly">显示昵称</option>
                  <option value="NicknameWithDeviceName">显示昵称（附设备名）</option>
                </select>
              </label>
              <label className="settings-field">
                <span>个人状态</span>
                <input
                  aria-label="个人状态"
                  value={preferences.identity.statusMessage}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      identity: {
                        ...current.identity,
                        statusMessage: event.currentTarget.value,
                      },
                    }))
                  }
                />
              </label>
              <div className="settings-readonly-grid">
                <div className="settings-readonly">
                  <span>设备 ID</span>
                  <strong>{runtime.deviceId}</strong>
                </div>
              </div>
            </>
          ) : null}

          {activeGroup === "chat" ? (
            <>
              <div className="settings-section-header">
                <h3>聊天与通知</h3>
                <p>先接入聊天输入、广播确认和接收消息后的会话行为控制项，优先影响当前主界面行为。</p>
              </div>
              <label className="settings-checkbox">
                <input
                  aria-label="Enter 发送消息"
                  type="checkbox"
                  checked={chatPreferences.enterToSend}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      chat: {
                        ...defaultChatPreferences,
                        ...(current.chat ?? {}),
                        enterToSend: event.currentTarget.checked,
                      },
                    }))
                  }
                />
                <span>Enter 发送消息</span>
              </label>
              <p className="settings-field-hint">
                开启后，聊天输入框按 Enter 直接发送；按 Shift + Enter 仍然换行。
              </p>
              <label className="settings-checkbox">
                <input
                  aria-label="广播前确认"
                  type="checkbox"
                  checked={chatPreferences.confirmBeforeBroadcast}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      chat: {
                        ...defaultChatPreferences,
                        ...(current.chat ?? {}),
                        confirmBeforeBroadcast: event.currentTarget.checked,
                      },
                    }))
                  }
                />
                <span>广播前确认</span>
              </label>
              <p className="settings-field-hint">
                开启后，发送广播消息前会先弹出确认，避免误发给全部在线联系人。
              </p>
              <label className="settings-checkbox">
                <input
                  aria-label="应用内横幅提醒"
                  type="checkbox"
                  checked={chatPreferences.showInAppBannerNotifications}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      chat: {
                        ...defaultChatPreferences,
                        ...(current.chat ?? {}),
                        showInAppBannerNotifications: event.currentTarget.checked,
                      },
                    }))
                  }
                />
                <span>应用内横幅提醒</span>
              </label>
              <p className="settings-field-hint">
                开启后，收到非当前会话的单聊消息或文件投递时，会在主窗口显示横幅。
              </p>
              <label className="settings-checkbox">
                <input
                  aria-label="收到单聊自动切换到来源会话"
                  type="checkbox"
                  checked={chatPreferences.autoSwitchToIncomingDirect}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      chat: {
                        ...defaultChatPreferences,
                        ...(current.chat ?? {}),
                        autoSwitchToIncomingDirect: event.currentTarget.checked,
                      },
                    }))
                  }
                />
                <span>收到单聊自动切换到来源会话</span>
              </label>
              <p className="settings-field-hint">
                开启后，新的单聊消息到达时会自动切到发送者会话；关闭后保持当前会话不变。
              </p>
              <label className="settings-checkbox">
                <input
                  aria-label="收到文件投递自动切换到来源会话"
                  type="checkbox"
                  checked={chatPreferences.autoSwitchToIncomingDelivery}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      chat: {
                        ...defaultChatPreferences,
                        ...(current.chat ?? {}),
                        autoSwitchToIncomingDelivery: event.currentTarget.checked,
                      },
                    }))
                  }
                />
                <span>收到文件投递自动切换到来源会话</span>
              </label>
              <p className="settings-field-hint">
                开启后，新的投递请求到达时会自动切到发送者会话，方便直接接收或取消。
              </p>
            </>
          ) : null}

          {activeGroup === "transfer" ? (
            <>
              <div className="settings-section-header">
                <h3>文件传输</h3>
                <p>管理接收目录、确认流程与目录保留策略。</p>
              </div>
              <label className="settings-field">
                <span>下载目录</span>
                <div className="settings-field-row">
                  <input
                    aria-label="下载目录"
                    value={preferences.transfer.downloadDir}
                    onChange={(event) =>
                      onChange((current) => ({
                        ...current,
                        transfer: {
                          ...current.transfer,
                          downloadDir: event.currentTarget.value,
                        },
                      }))
                    }
                  />
                  <button type="button" onClick={onPickDownloadDir}>
                    选择目录
                  </button>
                </div>
              </label>
              <label className="settings-checkbox">
                <input
                  type="checkbox"
                  checked={preferences.transfer.receiveBeforeAccept}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      transfer: {
                        ...current.transfer,
                        receiveBeforeAccept: event.currentTarget.checked,
                      },
                    }))
                  }
                />
                <span>接收前确认</span>
              </label>
              <label className="settings-checkbox">
                <input
                  type="checkbox"
                  checked={preferences.transfer.openFolderAfterReceive}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      transfer: {
                        ...current.transfer,
                        openFolderAfterReceive: event.currentTarget.checked,
                      },
                    }))
                  }
                />
                <span>接收完成后打开目录</span>
              </label>
              <label className="settings-checkbox">
                <input
                  type="checkbox"
                  checked={preferences.transfer.preserveDirectoryStructure}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      transfer: {
                        ...current.transfer,
                        preserveDirectoryStructure: event.currentTarget.checked,
                      },
                    }))
                  }
                />
                <span>保留目录结构</span>
              </label>
            </>
          ) : null}

          {activeGroup === "network" ? (
            <>
              <div className="settings-section-header">
                <h3>网络与发现</h3>
                <p>支持手动网段配置，并可立即触发一次发现刷新。</p>
              </div>
              <label className="settings-field">
                <span>发现方式</span>
                <select
                  aria-label="发现方式"
                  ref={discoveryModeSelectRef}
                  value={preferences.network.discoveryMode}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      network: {
                        ...current.network,
                        discoveryMode: event.currentTarget
                          .value as AppPreferences["network"]["discoveryMode"],
                      },
                    }))
                  }
                >
                  <option value="Auto">自动发现</option>
                  <option value="ManualSegments">手动网段辅助发现</option>
                  <option value="CurrentSegmentOnly">仅当前网段</option>
                </select>
              </label>
              <label className="settings-field">
                <span>手动网段</span>
                <textarea
                  aria-label="手动网段"
                  ref={manualSegmentsInputRef}
                  rows={4}
                  value={manualSegmentsText}
                  placeholder="每行一个 CIDR，例如 192.168.10.0/24"
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      network: {
                        ...current.network,
                        manualSegments: event.currentTarget.value
                          .split(/\r?\n/)
                          .map((item) => item.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                />
              </label>
              {invalidManualSegments.length > 0 ? (
                <div className="settings-inline-prompt">
                  <p className="settings-inline-error">
                    {`以下网段格式无效：${invalidManualSegments.join("、")}`}
                  </p>
                  <div className="settings-inline-prompt-actions">
                    <button type="button" onClick={handleClearInvalidManualSegments}>
                      清空无效项
                    </button>
                    <button type="button" onClick={handleUseExampleManualSegment}>
                      填入示例网段
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="settings-actions">
                <button
                  type="button"
                  onClick={() => void handleRefreshDiscovery()}
                  disabled={isRefreshDisabled}
                >
                  {discoveryRefreshFeedback.isRefreshing ? "刷新中..." : "立即刷新"}
                </button>
                {isManualSegmentsMode &&
                preferences.network.manualSegments.length === 0 ? (
                  <div className="settings-inline-prompt">
                    <p className="settings-inline-error">
                      请先填写至少一个有效 CIDR，或直接使用下面的快捷操作。
                    </p>
                    <div className="settings-inline-prompt-actions">
                      <button
                        type="button"
                        onClick={handleUseExampleManualSegment}
                      >
                        填入示例网段
                      </button>
                      <button
                        type="button"
                        onClick={handleSwitchToAutoDiscovery}
                      >
                        切回自动发现
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="settings-status-grid">
                <div className="settings-status-card">
                  <span>当前在线设备数</span>
                  <strong>{`${onlineDeviceCount} 台`}</strong>
                </div>
                <div className="settings-status-card">
                  <span>当前发现策略</span>
                  <strong>
                    {getDiscoveryModeDescription(preferences.network.discoveryMode)}
                  </strong>
                </div>
                <div className="settings-status-card">
                  <span>刷新状态</span>
                  <strong>{refreshStatusLabel}</strong>
                </div>
                <div className="settings-status-card">
                  <span>本次新增发现数</span>
                  <strong>
                    {discoveryRefreshFeedback.lastDiscoveredCount === null
                      ? "--"
                      : `${discoveryRefreshFeedback.lastDiscoveredCount} 台`}
                  </strong>
                </div>
                <div className="settings-status-card">
                  <span>最近刷新</span>
                  <strong>{refreshTimeLabel}</strong>
                </div>
              </div>
              {hasRefreshResult ? (
                <div className="settings-diagnostics-block">
                  <div className="settings-diagnostics-header">
                    <h4>最近一次刷新结果</h4>
                    <p>帮助区分这次刷新新增了哪些设备、哪些设备原本已在线，以及哪些手动网段仍未命中。</p>
                  </div>
                  {discoveryRefreshFeedback.lastErrorMessage ? (
                    <div className="settings-inline-prompt">
                      <p className="settings-inline-error">
                        {discoveryRefreshFeedback.lastErrorMessage}
                      </p>
                      <div className="settings-inline-prompt-actions">
                        <button
                          type="button"
                          onClick={() => void handleRefreshDiscovery()}
                          disabled={isRefreshDisabled}
                        >
                          立即重试
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            latestFailureSuggestionsRef.current?.focus();
                          }}
                        >
                          查看建议排查
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div className="settings-refresh-result-grid">
                    <div
                      className="settings-refresh-result-card"
                      ref={newDiscoveryResultCardRef}
                      tabIndex={-1}
                    >
                      <span>新增发现设备</span>
                      {discoveryRefreshFeedback.lastNewDeviceLabels.length > 0 ? (
                        <ul className="settings-refresh-result-list">
                          {discoveryRefreshFeedback.lastNewDeviceLabels.map((device) => (
                            <li key={device}>{device}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="settings-field-hint">本次没有新增发现设备。</p>
                      )}
                      {!discoveryRefreshFeedback.lastErrorMessage &&
                      discoveryRefreshFeedback.lastNewDeviceLabels.length === 0 &&
                      discoveryRefreshFeedback.lastExistingDeviceLabels.length > 0 ? (
                        <div className="settings-inline-prompt">
                          <p className="settings-inline-error">
                            本次没有新增设备，但已有在线设备仍可通信，你可以立即刷新或查看刷新前已在线设备。
                          </p>
                          <div className="settings-inline-prompt-actions">
                            <button
                              type="button"
                              onClick={() => void handleRefreshDiscovery()}
                              disabled={isRefreshDisabled}
                            >
                              立即刷新
                            </button>
                            <button type="button" onClick={handleFocusExistingDevicesResult}>
                              查看刷新前已在线设备
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {!discoveryRefreshFeedback.lastErrorMessage &&
                      discoveryRefreshFeedback.lastNewDeviceLabels.length === 0 &&
                      discoveryRefreshFeedback.lastExistingDeviceLabels.length === 0 ? (
                        <div className="settings-inline-prompt">
                          <p className="settings-inline-error">
                            当前未发现任何在线设备，你可以重新扫描或切换发现方式。
                          </p>
                          <div className="settings-inline-prompt-actions">
                            <button
                              type="button"
                              onClick={() => void handleRefreshDiscovery()}
                              disabled={isRefreshDisabled}
                            >
                              重新扫描
                            </button>
                            <button
                              type="button"
                              onClick={handleFocusDiscoveryMode}
                            >
                              切换发现方式
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div
                      className="settings-refresh-result-card"
                      ref={existingDevicesResultCardRef}
                      tabIndex={-1}
                    >
                      <span>刷新前已在线设备</span>
                      {discoveryRefreshFeedback.lastExistingDeviceLabels.length > 0 ? (
                        <ul className="settings-refresh-result-list">
                          {discoveryRefreshFeedback.lastExistingDeviceLabels.map((device) => (
                            <li key={device}>{device}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="settings-inline-prompt">
                          <p className="settings-inline-error">
                            刷新前没有已在线设备，你可以立即刷新或查看新增发现设备。
                          </p>
                          <div className="settings-inline-prompt-actions">
                            <button
                              type="button"
                              onClick={() => void handleRefreshDiscovery()}
                              disabled={isRefreshDisabled}
                            >
                              立即刷新
                            </button>
                            <button type="button" onClick={handleFocusNewDiscoveryResult}>
                              查看新增发现设备
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {isManualSegmentsMode ? (
                      <div className="settings-refresh-result-card">
                        <span>当前配置网段仍未命中</span>
                        {discoveryRefreshFeedback.lastUnmatchedSegments.length > 0 ? (
                          <ul className="settings-refresh-result-list">
                            {discoveryRefreshFeedback.lastUnmatchedSegments.map((segment) => (
                              <li key={segment}>{segment}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="settings-inline-prompt">
                            <p className="settings-inline-error">
                              当前所有有效手动网段都已命中至少一台在线设备，你可以立即刷新或查看在线设备归因。
                            </p>
                            <div className="settings-inline-prompt-actions">
                              <button
                                type="button"
                                onClick={() => void handleRefreshDiscovery()}
                                disabled={isRefreshDisabled}
                              >
                                立即刷新
                              </button>
                              <button type="button" onClick={handleFocusDeviceAttribution}>
                                查看在线设备归因
                              </button>
                            </div>
                          </div>
                        )}
                        {showAllSegmentsUnmatchedWarning && !showNoOnlineDevicePrompt ? (
                          <div className="settings-inline-prompt">
                            <p className="settings-inline-error">
                              当前配置网段暂不可用，你可以重新扫描或直接更改手动网段。
                            </p>
                            <div className="settings-inline-prompt-actions">
                              <button
                                type="button"
                                onClick={() => void handleRefreshDiscovery()}
                                disabled={isRefreshDisabled}
                              >
                                重新扫描
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  manualSegmentsInputRef.current?.focus();
                                }}
                              >
                                更改网段
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {latestRefreshFailureEntry ? (
                    renderRefreshFailureDetail(
                      latestRefreshFailureEntry,
                      latestRefreshCopyFeedback,
                      setLatestRefreshCopyFeedback,
                      latestFailureSuggestionsRef,
                    )
                  ) : null}
                </div>
              ) : null}
              <div className="settings-diagnostics-block">
                  <div className="settings-diagnostics-header">
                    <div className="settings-field-row">
                      <h4>最近刷新历史</h4>
                      <div className="settings-field-row">
                        <button
                          type="button"
                          className={refreshHistoryFilter === "All" ? "is-active" : ""}
                          onClick={() => {
                            setRefreshHistoryFilter("All");
                            setIsRefreshHistoryExpanded(false);
                            setExpandedRefreshHistoryId(null);
                          }}
                        >
                          全部
                        </button>
                        <button
                          type="button"
                          className={refreshHistoryFilter === "Failed" ? "is-active" : ""}
                          onClick={() => {
                            setRefreshHistoryFilter("Failed");
                            setIsRefreshHistoryExpanded(false);
                            setExpandedRefreshHistoryId(null);
                          }}
                        >
                          仅失败
                        </button>
                        {isRefreshHistoryExpandable ? (
                          <button
                            type="button"
                            onClick={() =>
                              setIsRefreshHistoryExpanded((current) => !current)
                            }
                          >
                            {isRefreshHistoryExpanded ? "收起" : "展开更多"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedRefreshHistoryId(null);
                            onClearRefreshHistory();
                          }}
                        >
                          清空历史
                        </button>
                      </div>
                    </div>
                    <p>保留最近几次手动刷新结果，便于判断网络状态是持续问题还是刚刚发生变化。</p>
                  </div>
                  <div className="settings-status-grid settings-history-summary-grid">
                    <div
                      className={`settings-status-card ${refreshHistorySuccessRateTone}`}
                    >
                      <button
                        type="button"
                        className="settings-summary-card-button"
                        aria-label="最近 5 次成功率"
                        onClick={focusRefreshHistoryAll}
                      >
                        <span>最近 5 次成功率</span>
                        <strong>{`${refreshHistorySummary.successRate}%`}</strong>
                      </button>
                    </div>
                    <div
                      className={`settings-status-card ${refreshHistoryFailureTone}`.trim()}
                    >
                      <button
                        type="button"
                        className="settings-summary-card-button"
                        aria-label="连续失败次数"
                        onClick={focusRefreshHistoryFailures}
                      >
                        <span>连续失败次数</span>
                        <strong>{`${refreshHistorySummary.consecutiveFailureCount} 次`}</strong>
                      </button>
                    </div>
                    <div
                      className={`settings-status-card ${refreshHistoryLatestFailureTone}`}
                    >
                      <button
                        type="button"
                        className="settings-summary-card-button"
                        aria-label="最近失败时间"
                        onClick={focusRefreshHistoryFailures}
                      >
                        <span>最近失败时间</span>
                        <strong>
                          {refreshHistorySummary.latestFailureAt === null
                            ? "暂无失败"
                            : formatRefreshTime(refreshHistorySummary.latestFailureAt)}
                        </strong>
                      </button>
                    </div>
                  </div>
                  <p className="settings-field-hint">
                    点击摘要卡可快速定位对应刷新历史，失败指标会直接打开最新失败详情。
                  </p>
                  <div className="settings-history-legend" aria-label="摘要状态说明">
                    <span className="settings-history-legend-title">状态说明</span>
                    <span className="settings-history-legend-item is-success">
                      绿色表示稳定
                    </span>
                    <span className="settings-history-legend-item is-warning">
                      黄色表示关注
                    </span>
                    <span className="settings-history-legend-item is-danger">
                      红色表示异常
                    </span>
                  </div>
                  <div className="settings-history-rules" aria-label="摘要规则说明">
                    <span className="settings-history-rules-title">规则说明</span>
                    <ul className="settings-history-rules-list">
                      <li>
                        成功率：80% 及以上稳定，50% 到 79% 需要关注，低于 50%
                        视为异常。
                      </li>
                      <li>
                        连续失败：0 次稳定，1 次需要关注，2 次及以上视为异常。
                      </li>
                      <li>
                        最近失败时间：暂无失败或超过 24 小时视为稳定，30 分钟到 24
                        小时需要关注，30 分钟内视为异常。
                      </li>
                    </ul>
                  </div>
                  {refreshHistorySummary.consecutiveFailureCount >= 2 ? (
                    <div className="settings-inline-prompt">
                      <p className="settings-inline-error">
                        {`最近已连续 ${refreshHistorySummary.consecutiveFailureCount} 次刷新失败，你可以立即重试或查看最近失败详情。`}
                      </p>
                      <div className="settings-inline-prompt-actions">
                        <button
                          type="button"
                          onClick={() => void handleRefreshDiscovery()}
                          disabled={isRefreshDisabled}
                        >
                          立即重试
                        </button>
                        <button type="button" onClick={focusRefreshHistoryFailures}>
                          查看最近失败
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {filteredRefreshHistory.length > 0 ? (
                    <ul className="settings-diagnostics-list">
                      {visibleRefreshHistory.map((entry) => {
                        const isExpanded = expandedRefreshHistoryId === entry.id;

                        return (
                          <li key={entry.id}>
                            <div className="settings-diagnostics-item-main">
                              <strong>{formatRefreshTime(entry.timestamp)}</strong>
                              <span
                                className={`settings-status-badge ${
                                  entry.status === "Failed" ? "Unmatched" : "AlreadyOnline"
                                }`}
                              >
                                {entry.status === "Failed" ? "刷新失败" : "已完成"}
                              </span>
                            </div>
                            <span>{formatRefreshHistoryEntry(entry)}</span>
                            <div className="settings-field-row settings-history-actions">
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
                              entry.status === "Failed" ? (
                                renderRefreshFailureDetail(
                                  entry,
                                  refreshHistoryCopyFeedback,
                                  setRefreshHistoryCopyFeedback,
                                )
                              ) : (
                                <div className="settings-history-detail-grid">
                                  <div
                                    className="settings-history-detail-card"
                                    data-history-new-discovery-card="true"
                                    tabIndex={-1}
                                  >
                                    <span>新增发现设备</span>
                                    {entry.newDeviceLabels.length > 0 ? (
                                      <ul className="settings-refresh-result-list">
                                        {entry.newDeviceLabels.map((device) => (
                                          <li key={device}>{device}</li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <>
                                        <p className="settings-field-hint">
                                          本次没有新增发现设备。
                                        </p>
                                        {entry.existingDeviceLabels.length > 0 ? (
                                          <div className="settings-inline-prompt">
                                            <p className="settings-inline-error">
                                              这条历史记录没有新增设备，但已有在线设备仍可通信，你可以立即刷新或查看刷新前已在线设备。
                                            </p>
                                            <div className="settings-inline-prompt-actions">
                                              <button
                                                type="button"
                                                onClick={() => void handleRefreshDiscovery()}
                                                disabled={isRefreshDisabled}
                                              >
                                                立即刷新
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(event) =>
                                                  focusHistoryExistingDevicesCard(
                                                    event.currentTarget,
                                                  )
                                                }
                                              >
                                                查看刷新前已在线设备
                                              </button>
                                            </div>
                                          </div>
                                        ) : null}
                                      </>
                                    )}
                                  </div>
                                  <div
                                    className="settings-history-detail-card"
                                    data-history-existing-devices-card="true"
                                    tabIndex={-1}
                                  >
                                    <span>刷新前已在线设备</span>
                                    {entry.existingDeviceLabels.length > 0 ? (
                                      <ul className="settings-refresh-result-list">
                                        {entry.existingDeviceLabels.map((device) => (
                                          <li key={device}>{device}</li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <>
                                        <p className="settings-field-hint">
                                          刷新前没有已在线设备。
                                        </p>
                                        {entry.newDeviceLabels.length > 0 ? (
                                          <div className="settings-inline-prompt">
                                            <p className="settings-inline-error">
                                              这条历史记录刷新前没有已在线设备，你可以立即刷新或查看新增发现设备。
                                            </p>
                                            <div className="settings-inline-prompt-actions">
                                              <button
                                                type="button"
                                                onClick={() => void handleRefreshDiscovery()}
                                                disabled={isRefreshDisabled}
                                              >
                                                立即刷新
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(event) =>
                                                  focusHistoryNewDiscoveryCard(
                                                    event.currentTarget,
                                                  )
                                                }
                                              >
                                                查看新增发现设备
                                              </button>
                                            </div>
                                          </div>
                                        ) : null}
                                      </>
                                    )}
                                  </div>
                                  <div
                                    className="settings-history-detail-card"
                                    data-history-unmatched-card="true"
                                    tabIndex={-1}
                                  >
                                    <span>当前配置网段仍未命中</span>
                                    {entry.unmatchedSegments.length > 0 ? (
                                      <ul className="settings-refresh-result-list">
                                        {entry.unmatchedSegments.map((segment) => (
                                          <li key={segment}>{segment}</li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <>
                                        <p className="settings-field-hint">
                                          当前所有有效手动网段都已命中至少一台在线设备。
                                        </p>
                                        {entry.segmentStatuses.length > 0 ? (
                                          <div className="settings-inline-prompt">
                                            <p className="settings-inline-error">
                                              这条历史记录中的有效手动网段都已命中至少一台在线设备，你可以立即刷新或查看网段状态。
                                            </p>
                                            <div className="settings-inline-prompt-actions">
                                              <button
                                                type="button"
                                                onClick={() => void handleRefreshDiscovery()}
                                                disabled={isRefreshDisabled}
                                              >
                                                立即刷新
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(event) =>
                                                  focusHistorySegmentStatusCard(
                                                    event.currentTarget,
                                                  )
                                                }
                                              >
                                                查看网段状态
                                              </button>
                                            </div>
                                          </div>
                                        ) : null}
                                      </>
                                    )}
                                  </div>
                                  <div
                                    className="settings-history-detail-card"
                                    data-history-segment-status-card="true"
                                    tabIndex={-1}
                                  >
                                    <span>网段状态</span>
                                    {entry.segmentStatuses.length > 0 ? (
                                      <ul className="settings-refresh-result-list">
                                        {entry.segmentStatuses.map((segment) => (
                                          <li key={`${entry.id}-${segment.segment}`}>
                                            {`${segment.segment} · ${getSegmentRefreshStatusLabel(
                                              segment.status,
                                            )}`}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <>
                                        <p className="settings-field-hint">
                                          当前没有可回看的网段状态。
                                        </p>
                                        {entry.unmatchedSegments.length > 0 ? (
                                          <div className="settings-inline-prompt">
                                            <p className="settings-inline-error">
                                              这条历史记录还没有可回看的网段状态，你可以立即刷新或查看未命中网段。
                                            </p>
                                            <div className="settings-inline-prompt-actions">
                                              <button
                                                type="button"
                                                onClick={() => void handleRefreshDiscovery()}
                                                disabled={isRefreshDisabled}
                                              >
                                                立即刷新
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(event) =>
                                                  focusHistoryUnmatchedSegmentsCard(
                                                    event.currentTarget,
                                                  )
                                                }
                                              >
                                                查看未命中网段
                                              </button>
                                            </div>
                                          </div>
                                        ) : null}
                                      </>
                                    )}
                                  </div>
                                </div>
                              )
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : refreshHistoryFilter === "Failed" ? (
                    <div className="settings-inline-prompt">
                      <p className="settings-inline-error">
                        当前没有失败刷新记录，你可以立即刷新或切回全部查看最近结果。
                      </p>
                      <div className="settings-inline-prompt-actions">
                        <button
                          type="button"
                          onClick={() => void handleRefreshDiscovery()}
                          disabled={isRefreshDisabled}
                        >
                          立即刷新
                        </button>
                        <button type="button" onClick={focusRefreshHistoryAll}>
                          切回全部
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="settings-inline-prompt">
                      <p className="settings-inline-error">
                        当前还没有刷新历史，你可以立即刷新或查看发现方式。
                      </p>
                      <div className="settings-inline-prompt-actions">
                        <button
                          type="button"
                          onClick={() => void handleRefreshDiscovery()}
                          disabled={isRefreshDisabled}
                        >
                          立即刷新
                        </button>
                        <button type="button" onClick={handleFocusDiscoveryMode}>
                          查看发现方式
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              {isManualSegmentsMode ? (
                <>
                  <div className="settings-status-grid">
                    <div className="settings-status-card">
                      <span>有效手动网段数</span>
                      <strong>{`${manualSegmentSummaries.length} 个`}</strong>
                    </div>
                    <div className="settings-status-card">
                      <span>预计主动探测主机数</span>
                      <strong>{`${manualProbeHostCount} 台`}</strong>
                    </div>
                    <div className="settings-status-card">
                      <span>命中手动网段设备</span>
                      <strong>{`${matchedManualSegmentCount} 台`}</strong>
                    </div>
                    <div className="settings-status-card">
                      <span>未命中手动网段设备</span>
                      <strong>{`${unmatchedManualSegmentCount} 台`}</strong>
                    </div>
                  </div>
                  <div className="settings-diagnostics-block">
                    <div className="settings-diagnostics-header">
                      <h4>手动网段概览</h4>
                      <p>用于估算当前配置会广播到哪些网段、主动探测多少主机地址，以及哪些网段暂未命中在线设备。</p>
                    </div>
                    {manualSegmentCoverage.length > 0 ? (
                      <ul className="settings-diagnostics-list">
                        {manualSegmentCoverage.map((segment) => (
                          <li key={segment.segment}>
                            <div className="settings-diagnostics-item-main">
                              <strong>{segment.segment}</strong>
                              {hasRefreshResult ? (
                                <span
                                  className={`settings-status-badge ${
                                    discoveryRefreshFeedback.lastSegmentStatuses.find(
                                      (item) => item.segment === segment.segment,
                                    )?.status ?? "Unmatched"
                                  }`}
                                >
                                  {getSegmentRefreshStatusLabel(
                                    discoveryRefreshFeedback.lastSegmentStatuses.find(
                                      (item) => item.segment === segment.segment,
                                    )?.status ?? "Unmatched",
                                  )}
                                </span>
                              ) : null}
                            </div>
                            <span>
                              {segment.matchedDeviceCount > 0
                                ? `已命中 ${segment.matchedDeviceCount} 台在线设备 · 预计探测 ${segment.hostCount} 台主机`
                                : `当前未命中在线设备 · 预计探测 ${segment.hostCount} 台主机`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="settings-inline-prompt">
                        <p className="settings-inline-error">
                          当前没有可参与主动探测的有效手动网段，你可以填入示例网段或切回自动发现。
                        </p>
                        <div className="settings-inline-prompt-actions">
                          <button type="button" onClick={handleUseExampleManualSegment}>
                            填入示例网段
                          </button>
                          <button type="button" onClick={handleSwitchToAutoDiscovery}>
                            切回自动发现
                          </button>
                        </div>
                      </div>
                    )}
                    {unmatchedManualSegments.length > 0 ? (
                      <p className="settings-field-hint">
                        {`暂未命中在线设备的网段：${unmatchedManualSegments
                          .map((segment) => segment.segment)
                          .join("、")}`}
                      </p>
                    ) : manualSegmentCoverage.length > 0 ? (
                      <div className="settings-inline-prompt">
                        <p className="settings-inline-error">
                          当前所有有效手动网段都已命中至少一台在线设备，你可以立即刷新或查看在线设备归因。
                        </p>
                        <div className="settings-inline-prompt-actions">
                          <button
                            type="button"
                            onClick={() => void handleRefreshDiscovery()}
                            disabled={isRefreshDisabled}
                          >
                            立即刷新
                          </button>
                          <button type="button" onClick={handleFocusDeviceAttribution}>
                            查看在线设备归因
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div
                    className="settings-diagnostics-block"
                    ref={deviceAttributionBlockRef}
                    tabIndex={-1}
                  >
                    <div className="settings-diagnostics-header">
                      <h4>在线设备归因</h4>
                      <p>帮助判断当前在线节点是否落在你配置的手动网段内。</p>
                    </div>
                    {manualSegmentMatches.length > 0 ? (
                      <ul className="settings-diagnostics-list">
                        {manualSegmentMatches.map((device) => (
                          <li key={device.deviceId}>
                            <strong>{device.label}</strong>
                            <span>
                              {device.matchedSegment
                                ? `命中 ${device.matchedSegment}`
                                : "未命中手动网段"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="settings-inline-prompt">
                        <p className="settings-inline-error">
                          当前还没有在线设备，你可以立即刷新或切换发现方式。
                        </p>
                        <div className="settings-inline-prompt-actions">
                          <button
                            type="button"
                            onClick={() => void handleRefreshDiscovery()}
                            disabled={isRefreshDisabled}
                          >
                            立即刷新
                          </button>
                          <button type="button" onClick={handleFocusDiscoveryMode}>
                            切换发现方式
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
              <div className="settings-readonly-grid">
                <div className="settings-readonly">
                  <span>当前消息端口</span>
                  <strong>{runtime.messagePort}</strong>
                </div>
                <div className="settings-readonly">
                  <span>当前文件端口</span>
                  <strong>{runtime.filePort}</strong>
                </div>
              </div>
            </>
          ) : null}

          {activeGroup === "display" ? (
            <>
              <div className="settings-section-header">
                <h3>显示与通用</h3>
                <p>管理托盘显示和关闭窗口后的行为。</p>
              </div>
              <label className="settings-checkbox">
                <input
                  aria-label="托盘显示"
                  type="checkbox"
                  checked={preferences.display.trayEnabled}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      display: {
                        ...current.display,
                        trayEnabled: event.currentTarget.checked,
                      },
                    }))
                  }
                />
                <span>托盘显示</span>
              </label>
              <label className="settings-field">
                <span>关闭窗口行为</span>
                <select
                  aria-label="关闭窗口行为"
                  value={preferences.display.closeAction}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      display: {
                        ...current.display,
                        closeAction: event.currentTarget
                          .value as AppPreferences["display"]["closeAction"],
                      },
                    }))
                  }
                >
                  <option value="MinimizeToTray">最小化到托盘</option>
                  <option value="Exit">直接退出</option>
                </select>
              </label>
            </>
          ) : null}

        </div>
      </div>
    </section>
  );
}
