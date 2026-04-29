import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { useAppStore } from "./app/store";
import {
  classifyDeliveryPaths,
  getDiscoveryRefreshHistory,
  openDirectory,
  openSettingsWindow,
  pickDeliveryDirectory,
  pickDeliveryFiles,
  pickSaveDirectory,
  persistDiscoveryRefreshHistory,
  refreshDiscovery,
  sendBroadcastMessage,
  sendDeliveryRequest,
  sendDeliveryResponse,
  sendDirectMessage,
  syncRuntimeSettings,
} from "./desktop/api";
import { ChatPanel } from "./desktop/modules/chat/ChatPanel";
import { InAppNotificationBanner } from "./desktop/modules/chat/InAppNotificationBanner";
import {
  createPendingFileEntries,
  createPendingDirectoryEntry,
  mergePendingDeliveryEntries,
  type PendingDeliveryEntry,
} from "./desktop/modules/chat/delivery";
import { ContactsPanel } from "./desktop/modules/contacts/ContactsPanel";
import { SettingsPanel } from "./desktop/modules/settings/SettingsPanel";
import {
  buildRefreshResultSummary,
  type DiscoveryRefreshFeedback,
} from "./desktop/modules/settings/networkDiagnostics";
import { TransfersPanel } from "./desktop/modules/transfers/TransfersPanel";
import type {
  ChatMessage,
  DiscoveryRefreshHistoryEntry,
  KnownDevice,
  MessagePayload,
  TransferTask,
} from "./desktop/types";
import { defaultChatPreferences } from "./desktop/types";
import "./styles/app.css";

type AppProps = {
  view?: "main" | "settings";
};

type InAppBannerState = {
  deviceId: string;
  title: string;
};

function App({ view = "main" }: AppProps) {
  const devices = useAppStore((state) => state.devices);
  const messages = useAppStore((state) => state.messages);
  const contactUnreadCounts = useAppStore((state) => state.contactUnreadCounts);
  const selectedDeviceId = useAppStore((state) => state.selectedDeviceId);
  const settings = useAppStore((state) => state.settings);
  const settingsReady = useAppStore((state) => state.settingsReady);
  const transfers = useAppStore((state) => state.transfers);
  const load = useAppStore((state) => state.load);
  const setDevices = useAppStore((state) => state.setDevices);
  const upsertTransfer = useAppStore((state) => state.upsertTransfer);
  const selectDevice = useAppStore((state) => state.selectDevice);
  const incrementContactUnread = useAppStore(
    (state) => state.incrementContactUnread,
  );
  const addMessage = useAppStore((state) => state.addMessage);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const activeDevice =
    devices.find((device) => device.device_id === selectedDeviceId) ?? null;
  const chatPreferences = {
    ...defaultChatPreferences,
    ...(settings.preferences.chat ?? {}),
  };
  const pendingDeliveryIndicators = buildPendingDeliveryIndicators(
    messages,
    settings.runtime.deviceId,
  );
  const contactSummaries = buildContactSummaries({
    messages,
    transfers,
    unreadCounts: contactUnreadCounts,
    localDeviceId: settings.runtime.deviceId,
  });
  const [draftMessage, setDraftMessage] = useState("");
  const [pendingDeliveries, setPendingDeliveries] = useState<PendingDeliveryEntry[]>([]);
  const [inAppBanner, setInAppBanner] = useState<InAppBannerState | null>(null);
  const [isDeliveryDragActive, setIsDeliveryDragActive] = useState(false);
  const [discoveryRefreshFeedback, setDiscoveryRefreshFeedback] =
    useState<DiscoveryRefreshFeedback>({
      isRefreshing: false,
      lastRefreshAtMs: null,
      lastDiscoveredCount: null,
      lastNewDeviceLabels: [],
      lastExistingDeviceLabels: [],
      lastUnmatchedSegments: [],
      lastSegmentStatuses: [],
      lastErrorMessage: null,
      history: [],
    });
  const autoAcceptedRequestsRef = useRef<Set<string>>(new Set());
  const openedDeliveryRootsRef = useRef<Set<string>>(new Set());
  const discoveryRefreshBaselineRef = useRef<Set<string> | null>(null);
  const discoveryRefreshTimerRef = useRef<number | null>(null);
  const bannerTimerRef = useRef<number | null>(null);

  const clearInAppBanner = useCallback(() => {
    if (bannerTimerRef.current !== null) {
      window.clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }

    setInAppBanner(null);
  }, []);

  const showInAppBanner = useCallback((nextBanner: InAppBannerState) => {
    if (bannerTimerRef.current !== null) {
      window.clearTimeout(bannerTimerRef.current);
    }

    setInAppBanner(nextBanner);
    bannerTimerRef.current = window.setTimeout(() => {
      bannerTimerRef.current = null;
      setInAppBanner(null);
    }, 6000);
  }, []);

  const handleOpenBanner = useCallback(() => {
    if (!inAppBanner) {
      return;
    }

    selectDevice(inAppBanner.deviceId);
    clearInAppBanner();
  }, [clearInAppBanner, inAppBanner, selectDevice]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;

    void getDiscoveryRefreshHistory()
      .then((history) => {
        if (cancelled) {
          return;
        }

        setDiscoveryRefreshFeedback((current) => ({
          ...current,
          history,
        }));
      })
      .catch(() => {
        // 历史记录读取失败时继续使用内存默认值，避免阻塞主流程。
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settingsReady) {
      return;
    }

    void syncRuntimeSettings(settings.preferences);
  }, [settings.preferences, settingsReady]);

  useEffect(() => {
    if (view !== "main") {
      return;
    }

    let unlisten: (() => void) | null = null;
    let disposed = false;

    void listen<ChatMessage>("chat-message-received", (event) => {
      const message = event.payload;
      addMessage(message);

      const currentState = useAppStore.getState();
      const currentChatPreferences = {
        ...defaultChatPreferences,
        ...(currentState.settings.preferences.chat ?? {}),
      };
      const isIncomingFromKnownDevice =
        message.from_device_id !== currentState.settings.runtime.deviceId &&
        currentState.devices.some(
          (device) => device.device_id === message.from_device_id,
        );
      const shouldSwitchToSender =
        isIncomingFromKnownDevice &&
        ((message.kind === "direct" &&
          currentChatPreferences.autoSwitchToIncomingDirect) ||
          (message.kind === "delivery" &&
            currentChatPreferences.autoSwitchToIncomingDelivery));

      if (shouldSwitchToSender) {
        selectDevice(message.from_device_id);
        return;
      }

      const shouldIncrementUnread =
        isIncomingFromKnownDevice &&
        currentState.selectedDeviceId !== message.from_device_id &&
        (message.kind === "direct" || message.kind === "delivery");

      if (shouldIncrementUnread) {
        incrementContactUnread(message.from_device_id);
      }

      const shouldShowBanner =
        currentChatPreferences.showInAppBannerNotifications &&
        isIncomingFromKnownDevice &&
        currentState.selectedDeviceId !== message.from_device_id &&
        (message.kind === "direct" || message.kind === "delivery");

      if (shouldShowBanner) {
        const sourceDevice = currentState.devices.find(
          (device) => device.device_id === message.from_device_id,
        );

        if (sourceDevice) {
          showInAppBanner({
            deviceId: sourceDevice.device_id,
            title:
              message.kind === "delivery"
                ? `${sourceDevice.nickname} 发来文件投递`
                : `${sourceDevice.nickname} 发来新消息`,
          });
        }
      }
    }).then((cleanup) => {
      if (disposed) {
        cleanup();
        return;
      }

      unlisten = cleanup;
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [addMessage, incrementContactUnread, selectDevice, showInAppBanner, view]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let disposed = false;

    void listen<KnownDevice[]>("devices-updated", (event) => {
      setDevices(event.payload);
      const baseline = discoveryRefreshBaselineRef.current;
      if (!baseline) {
        return;
      }

      const discoveredCount = event.payload.filter(
        (device) => !baseline.has(device.device_id),
      ).length;
      setDiscoveryRefreshFeedback((current) => ({
        ...current,
        lastDiscoveredCount: discoveredCount,
      }));
    }).then((cleanup) => {
      if (disposed) {
        cleanup();
        return;
      }

      unlisten = cleanup;
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [setDevices]);

  useEffect(
    () => () => {
      if (discoveryRefreshTimerRef.current !== null) {
        window.clearTimeout(discoveryRefreshTimerRef.current);
      }
      if (bannerTimerRef.current !== null) {
        window.clearTimeout(bannerTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (view !== "main") {
      return;
    }

    let unlisten: (() => void) | null = null;
    let disposed = false;

    void listen<TransferTask>("transfer-updated", (event) => {
      upsertTransfer(event.payload);
    }).then((cleanup) => {
      if (disposed) {
        cleanup();
        return;
      }

      unlisten = cleanup;
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [upsertTransfer, view]);

  useEffect(() => {
    if (view !== "main") {
      return;
    }

    let disposed = false;
    let unlisten: (() => void) | null = null;

    void getCurrentWindow()
      .onDragDropEvent((event) => {
        const payload = event.payload;

        if (payload.type === "enter" || payload.type === "over") {
          setIsDeliveryDragActive(true);
          return;
        }

        if (payload.type === "leave") {
          setIsDeliveryDragActive(false);
          return;
        }

        setIsDeliveryDragActive(false);
        if (payload.type === "drop") {
          void classifyDeliveryPaths(payload.paths).then((entries) => {
            setPendingDeliveries((current) =>
              mergePendingDeliveryEntries(current, entries),
            );
          });
        }
      })
      .then((cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }

        unlisten = cleanup;
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [view]);

  useEffect(() => {
    if (view !== "main") {
      return;
    }

    const pendingIncoming = [...messages]
      .reverse()
      .find(
        (message) =>
          message.kind === "delivery" &&
          message.from_device_id !== settings.runtime.deviceId &&
          message.delivery?.status === "PendingDecision",
      );

    if (
      !pendingIncoming ||
      settings.preferences.transfer.receiveBeforeAccept ||
      autoAcceptedRequestsRef.current.has(pendingIncoming.delivery!.request_id)
    ) {
      return;
    }

    const sourceDevice = devices.find(
      (device) => device.device_id === pendingIncoming.from_device_id,
    );
    if (!sourceDevice) {
      return;
    }

    autoAcceptedRequestsRef.current.add(pendingIncoming.delivery!.request_id);
    void sendDeliveryResponse({
      addr: `${sourceDevice.ip_addr}:${sourceDevice.message_port}`,
      requestId: pendingIncoming.delivery!.request_id,
      toDeviceId: pendingIncoming.from_device_id,
      decision: "Accepted",
      saveRoot: settings.preferences.transfer.downloadDir,
    })
      .then((updatedMessage) => {
        addMessage(updatedMessage);
      })
      .catch(() => {
        autoAcceptedRequestsRef.current.delete(pendingIncoming.delivery!.request_id);
      });
  }, [
    addMessage,
    devices,
    messages,
    settings.preferences.transfer.downloadDir,
    settings.preferences.transfer.receiveBeforeAccept,
    settings.runtime.deviceId,
    view,
  ]);

  useEffect(() => {
    if (view !== "main") {
      return;
    }

    if (!settings.preferences.transfer.openFolderAfterReceive) {
      return;
    }

    const completedDelivery = [...messages]
      .reverse()
      .find(
        (message) =>
          message.kind === "delivery" &&
          message.delivery?.status === "Completed" &&
          message.delivery.save_root,
      );

    const saveRoot = completedDelivery?.delivery?.save_root;
    if (!saveRoot || openedDeliveryRootsRef.current.has(saveRoot)) {
      return;
    }

    openedDeliveryRootsRef.current.add(saveRoot);
    void openDirectory(saveRoot);
  }, [messages, settings.preferences.transfer.openFolderAfterReceive, view]);

  function createPayload(toDeviceId: string, content: string): MessagePayload {
    return {
      message_id: `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      from_device_id: settings.runtime.deviceId,
      to_device_id: toDeviceId,
      content,
      sent_at_ms: Date.now(),
    };
  }

  async function handleSendDirect() {
    if (!activeDevice) {
      return;
    }

    const content = draftMessage.trim();
    if (!content) {
      return;
    }

    await sendDirectMessage(
      `${activeDevice.ip_addr}:${activeDevice.message_port}`,
      createPayload(activeDevice.device_id, content),
    );
    addMessage({
      message_id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      from_device_id: settings.runtime.deviceId,
      to_device_id: activeDevice.device_id,
      content,
      sent_at_ms: Date.now(),
      kind: "direct",
    });
    setDraftMessage("");
  }

  async function handleSendBroadcast() {
    const content = draftMessage.trim();
    if (!content || devices.length === 0) {
      return;
    }

    if (
      chatPreferences.confirmBeforeBroadcast &&
      !window.confirm("确定要向全部在线设备发送广播消息吗？")
    ) {
      return;
    }

    await Promise.all(
      devices.map((device) =>
        sendBroadcastMessage(
          `${device.ip_addr}:${device.message_port}`,
          createPayload("*", content),
        ),
      ),
    );
    addMessage({
      message_id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      from_device_id: settings.runtime.deviceId,
      to_device_id: "*",
      content,
      sent_at_ms: Date.now(),
      kind: "broadcast",
    });
    setDraftMessage("");
  }

  async function handlePickFiles() {
    const selectedPaths = await pickDeliveryFiles();
    if (selectedPaths.length === 0) {
      return;
    }

    setPendingDeliveries((current) =>
      mergePendingDeliveryEntries(current, createPendingFileEntries(selectedPaths)),
    );
  }

  async function handlePickDirectory() {
    const selectedPath = await pickDeliveryDirectory();
    if (!selectedPath) {
      return;
    }

    setPendingDeliveries((current) =>
      mergePendingDeliveryEntries(current, [createPendingDirectoryEntry(selectedPath)]),
    );
  }

  async function handlePickDownloadDirectory() {
    const selectedPath = await pickSaveDirectory();
    if (!selectedPath) {
      return;
    }

    updatePreferences((current) => ({
      ...current,
      transfer: {
        ...current.transfer,
        downloadDir: selectedPath,
      },
    }));
  }

  async function handleSendDelivery() {
    if (!activeDevice || pendingDeliveries.length === 0) {
      return;
    }

    const sentAtMs = Date.now();
    const historyMessage = await sendDeliveryRequest({
      addr: `${activeDevice.ip_addr}:${activeDevice.message_port}`,
      fileAddr: `${activeDevice.ip_addr}:${activeDevice.file_port}`,
      requestId: `request-${sentAtMs}-${Math.random().toString(16).slice(2)}`,
      toDeviceId: activeDevice.device_id,
      sentAtMs,
      entries: pendingDeliveries,
    });

    addMessage(historyMessage);
    setPendingDeliveries([]);
  }

  async function handleOpenDeliveryDirectory(path: string) {
    await openDirectory(path);
  }

  async function handleAcceptDelivery(requestId: string) {
    const sourceDevice = resolveDeliverySourceDevice(requestId);
    if (!sourceDevice) {
      return;
    }

    const saveRoot = await pickSaveDirectory();
    if (!saveRoot) {
      return;
    }

    const updatedMessage = await sendDeliveryResponse({
      addr: `${sourceDevice.ip_addr}:${sourceDevice.message_port}`,
      requestId,
      toDeviceId: sourceDevice.device_id,
      decision: "Accepted",
      saveRoot,
    });

    addMessage(updatedMessage);
  }

  async function handleRejectDelivery(requestId: string) {
    const sourceDevice = resolveDeliverySourceDevice(requestId);
    if (!sourceDevice) {
      return;
    }

    const updatedMessage = await sendDeliveryResponse({
      addr: `${sourceDevice.ip_addr}:${sourceDevice.message_port}`,
      requestId,
      toDeviceId: sourceDevice.device_id,
      decision: "Rejected",
      saveRoot: null,
    });

    addMessage(updatedMessage);
  }

  async function handleOpenSettings() {
    await openSettingsWindow();
  }

  async function handleRefreshDiscovery() {
    const baseline = new Set(
      useAppStore.getState().devices.map((device) => device.device_id),
    );
    discoveryRefreshBaselineRef.current = baseline;
    if (discoveryRefreshTimerRef.current !== null) {
      window.clearTimeout(discoveryRefreshTimerRef.current);
    }

    setDiscoveryRefreshFeedback((current) => ({
      ...current,
      isRefreshing: true,
      lastDiscoveredCount: 0,
      lastNewDeviceLabels: [],
      lastExistingDeviceLabels: [],
      lastUnmatchedSegments: [],
      lastSegmentStatuses: [],
      lastErrorMessage: null,
    }));

    try {
      await refreshDiscovery();
    } catch (error) {
      discoveryRefreshBaselineRef.current = null;
      discoveryRefreshTimerRef.current = null;
      setDiscoveryRefreshFeedback((current) => buildFailedRefreshFeedback(current));
      return;
    }

    discoveryRefreshTimerRef.current = window.setTimeout(() => {
      const currentDevices = useAppStore.getState().devices;
      const refreshSummary = buildRefreshResultSummary({
        devices: currentDevices,
        baselineDeviceIds: baseline,
        manualSegments: useAppStore.getState().settings.preferences.network.manualSegments,
        discoveryMode: useAppStore.getState().settings.preferences.network.discoveryMode,
      });
      discoveryRefreshBaselineRef.current = null;
      discoveryRefreshTimerRef.current = null;
      const refreshTimestamp = Date.now();
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
      setDiscoveryRefreshFeedback((current) =>
        buildSucceededRefreshFeedback(current, refreshSummary, historyEntry),
      );
    }, 1500);
  }

  function handleClearRefreshHistory() {
    setDiscoveryRefreshFeedback((current) => ({
      ...current,
      history: [],
    }));
    void persistDiscoveryRefreshHistory([]);
  }

  const visibleMessages = messages.filter((message) => {
    if (message.kind === "broadcast") {
      return true;
    }

    if (!activeDevice) {
      return false;
    }

    const isOutgoingToActive =
      message.from_device_id === settings.runtime.deviceId &&
      message.to_device_id === activeDevice.device_id;
    const isIncomingFromActive =
      message.from_device_id === activeDevice.device_id &&
      message.to_device_id === settings.runtime.deviceId;

    return isOutgoingToActive || isIncomingFromActive;
  });

  function resolveDeliverySourceDevice(requestId: string): KnownDevice | null {
    const message = messages.find(
      (item) => item.kind === "delivery" && item.delivery?.request_id === requestId,
    );
    if (!message) {
      return null;
    }

    return (
      devices.find((device) => device.device_id === message.from_device_id) ?? null
    );
  }

  if (view === "settings") {
    return (
      <main className="settings-window-shell">
        <SettingsPanel
          preferences={settings.preferences}
          runtime={settings.runtime}
          onlineDevices={devices}
          onlineDeviceCount={devices.length}
          discoveryRefreshFeedback={discoveryRefreshFeedback}
          onChange={updatePreferences}
          onPickDownloadDir={() => void handlePickDownloadDirectory()}
          onRefreshDiscovery={() => void handleRefreshDiscovery()}
          onClearRefreshHistory={handleClearRefreshHistory}
        />
      </main>
    );
  }

  return (
    <main className="app-shell">
      {inAppBanner ? (
        <InAppNotificationBanner
          title={inAppBanner.title}
          onOpen={handleOpenBanner}
          onDismiss={clearInAppBanner}
        />
      ) : null}
      <div className="left-column">
        <ContactsPanel
          devices={devices}
          pendingDeliveryIndicators={pendingDeliveryIndicators}
          contactSummaries={contactSummaries}
          unreadCounts={contactUnreadCounts}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={selectDevice}
          onOpenSettings={() => void handleOpenSettings()}
        />
        <TransfersPanel
          devices={devices}
          localDeviceId={settings.runtime.deviceId}
          transfers={transfers}
        />
      </div>
      <ChatPanel
        activeDeviceName={activeDevice?.nickname ?? null}
        messages={visibleMessages}
        localDeviceId={settings.runtime.deviceId}
        draftMessage={draftMessage}
        pendingDeliveries={pendingDeliveries}
        isDeliveryDragActive={isDeliveryDragActive}
        enableEnterToSend={chatPreferences.enterToSend}
        onDraftChange={setDraftMessage}
        onPickFiles={() => void handlePickFiles()}
        onPickDirectory={() => void handlePickDirectory()}
        onSendDirect={() => void handleSendDirect()}
        onSendBroadcast={() => void handleSendBroadcast()}
        onSendDelivery={() => void handleSendDelivery()}
        onAcceptDelivery={(requestId) => void handleAcceptDelivery(requestId)}
        onRejectDelivery={(requestId) => void handleRejectDelivery(requestId)}
        onOpenDeliveryDirectory={(path) => void handleOpenDeliveryDirectory(path)}
        canSendDirect={Boolean(activeDevice && draftMessage.trim())}
        canSendBroadcast={Boolean(devices.length > 0 && draftMessage.trim())}
        canSendDelivery={Boolean(activeDevice && pendingDeliveries.length > 0)}
      />
    </main>
  );
}

export default App;

function buildFailedRefreshFeedback(
  current: DiscoveryRefreshFeedback,
): DiscoveryRefreshFeedback {
  const refreshTimestamp = Date.now();
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
  void persistDiscoveryRefreshHistory(nextHistory);

  return {
    ...current,
    isRefreshing: false,
    lastRefreshAtMs: refreshTimestamp,
    lastDiscoveredCount: null,
    lastNewDeviceLabels: [],
    lastExistingDeviceLabels: [],
    lastUnmatchedSegments: [],
    lastSegmentStatuses: [],
    lastErrorMessage: "刷新失败，请检查本机网络权限或稍后重试。",
    history: nextHistory,
  };
}

function buildSucceededRefreshFeedback(
  current: DiscoveryRefreshFeedback,
  refreshSummary: ReturnType<typeof buildRefreshResultSummary>,
  historyEntry: DiscoveryRefreshHistoryEntry,
): DiscoveryRefreshFeedback {
  const nextHistory = prependRefreshHistoryEntry(current.history, historyEntry);
  void persistDiscoveryRefreshHistory(nextHistory);

  return {
    isRefreshing: false,
    lastRefreshAtMs: historyEntry.timestamp,
    lastDiscoveredCount: refreshSummary.discoveredCount,
    lastNewDeviceLabels: refreshSummary.newDeviceLabels,
    lastExistingDeviceLabels: refreshSummary.existingDeviceLabels,
    lastUnmatchedSegments: refreshSummary.unmatchedSegments,
    lastSegmentStatuses: refreshSummary.segmentStatuses,
    lastErrorMessage: null,
    history: nextHistory,
  };
}

function prependRefreshHistoryEntry(
  history: DiscoveryRefreshHistoryEntry[],
  entry: DiscoveryRefreshHistoryEntry,
): DiscoveryRefreshHistoryEntry[] {
  return [entry, ...history].slice(0, 5);
}

function buildPendingDeliveryIndicators(
  messages: ChatMessage[],
  localDeviceId: string,
): Record<string, boolean> {
  const latestInboundDeliveriesByRequestId = new Map<string, ChatMessage>();

  for (const message of messages) {
    if (
      message.kind !== "delivery" ||
      !message.delivery ||
      message.from_device_id === localDeviceId ||
      message.to_device_id !== localDeviceId
    ) {
      continue;
    }

    const previous = latestInboundDeliveriesByRequestId.get(
      message.delivery.request_id,
    );

    if (!previous || message.sent_at_ms >= previous.sent_at_ms) {
      latestInboundDeliveriesByRequestId.set(message.delivery.request_id, message);
    }
  }

  const nextIndicators: Record<string, boolean> = {};

  for (const deliveryMessage of latestInboundDeliveriesByRequestId.values()) {
    if (deliveryMessage.delivery?.status === "PendingDecision") {
      nextIndicators[deliveryMessage.from_device_id] = true;
    }
  }

  return nextIndicators;
}

type ContactSummaryInput = {
  messages: ChatMessage[];
  transfers: TransferTask[];
  unreadCounts: Record<string, number>;
  localDeviceId: string;
};

function buildContactSummaries({
  messages,
  transfers,
  unreadCounts,
  localDeviceId,
}: ContactSummaryInput): Record<string, string> {
  const summaries: Record<string, string> = {};
  const pendingDeliveryIndicators = buildPendingDeliveryIndicators(
    messages,
    localDeviceId,
  );

  for (const deviceId of Object.keys(pendingDeliveryIndicators)) {
    summaries[deviceId] = "待接收文件";
  }

  for (const transfer of transfers) {
    if (transfer.status !== "InProgress") {
      continue;
    }

    const contactDeviceId =
      transfer.from_device_id === localDeviceId
        ? transfer.to_device_id
        : transfer.from_device_id;

    if (!summaries[contactDeviceId]) {
      summaries[contactDeviceId] = "传输中";
    }
  }

  for (const [deviceId, unreadCount] of Object.entries(unreadCounts)) {
    if (unreadCount > 0 && !summaries[deviceId]) {
      summaries[deviceId] = "有未读消息";
    }
  }

  const sortedMessages = [...messages].sort(
    (left, right) => right.sent_at_ms - left.sent_at_ms,
  );

  for (const message of sortedMessages) {
    const contactDeviceId = getMessageContactDeviceId(message, localDeviceId);
    if (!contactDeviceId || summaries[contactDeviceId]) {
      continue;
    }

    summaries[contactDeviceId] = formatLatestMessagePreview(
      message,
      localDeviceId,
    );
  }

  return summaries;
}

function getMessageContactDeviceId(
  message: ChatMessage,
  localDeviceId: string,
): string | null {
  if (message.kind === "broadcast") {
    return null;
  }

  if (message.from_device_id === localDeviceId) {
    return message.to_device_id;
  }

  if (message.to_device_id === localDeviceId) {
    return message.from_device_id;
  }

  return null;
}

function formatLatestMessagePreview(
  message: ChatMessage,
  localDeviceId: string,
): string {
  const direction = message.from_device_id === localDeviceId ? "你" : "对方";

  if (message.kind === "delivery") {
    return `${direction}：${
      hasDirectoryDeliveryEntry(message) ? "发送了目录" : "发送了文件"
    }`;
  }

  const content = message.content.trim();
  if (content.length > 0) {
    return `${direction}：${content}`;
  }

  return direction === "你" ? "你：发出一条消息" : "对方：发来一条消息";
}

function hasDirectoryDeliveryEntry(message: ChatMessage): boolean {
  if (!message.delivery) {
    return false;
  }

  return message.delivery.entries.some((entry) => entry.kind === "Directory");
}
