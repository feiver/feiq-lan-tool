import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { useAppStore } from "./app/store";
import {
  pickDeliveryDirectory,
  pickDeliveryFiles,
  sendBroadcastMessage,
  sendDirectMessage,
  sendFileToDevice,
  syncRuntimeSettings,
} from "./desktop/api";
import { ChatPanel } from "./desktop/modules/chat/ChatPanel";
import {
  createPendingEntriesFromDroppedPaths,
  createPendingFileEntries,
  createPendingDirectoryEntry,
  mergePendingDeliveryEntries,
  type PendingDeliveryEntry,
  summarizeDeliverySelection,
} from "./desktop/modules/chat/delivery";
import { ContactsPanel } from "./desktop/modules/contacts/ContactsPanel";
import { SettingsPanel } from "./desktop/modules/settings/SettingsPanel";
import { TransfersPanel } from "./desktop/modules/transfers/TransfersPanel";
import type {
  ChatMessage,
  DeliveryEntry,
  KnownDevice,
  MessagePayload,
  TransferTask,
} from "./desktop/types";
import "./styles/app.css";

function App() {
  const devices = useAppStore((state) => state.devices);
  const messages = useAppStore((state) => state.messages);
  const selectedDeviceId = useAppStore((state) => state.selectedDeviceId);
  const settings = useAppStore((state) => state.settings);
  const settingsReady = useAppStore((state) => state.settingsReady);
  const transfers = useAppStore((state) => state.transfers);
  const load = useAppStore((state) => state.load);
  const setDevices = useAppStore((state) => state.setDevices);
  const upsertTransfer = useAppStore((state) => state.upsertTransfer);
  const selectDevice = useAppStore((state) => state.selectDevice);
  const addMessage = useAppStore((state) => state.addMessage);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const activeDevice =
    devices.find((device) => device.device_id === selectedDeviceId) ?? null;
  const [draftMessage, setDraftMessage] = useState("");
  const [pendingDeliveries, setPendingDeliveries] = useState<PendingDeliveryEntry[]>([]);
  const [isDeliveryDragActive, setIsDeliveryDragActive] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!settingsReady) {
      return;
    }

    void syncRuntimeSettings(settings);
  }, [settings, settingsReady]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let disposed = false;

    void listen<ChatMessage>("chat-message-received", (event) => {
      addMessage(event.payload);
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
  }, [addMessage]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let disposed = false;

    void listen<KnownDevice[]>("devices-updated", (event) => {
      setDevices(event.payload);
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

  useEffect(() => {
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
  }, [upsertTransfer]);

  useEffect(() => {
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
          setPendingDeliveries((current) =>
            mergePendingDeliveryEntries(
              current,
              createPendingEntriesFromDroppedPaths(payload.paths),
            ),
          );
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
  }, []);

  function createPayload(toDeviceId: string, content: string): MessagePayload {
    return {
      message_id: `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      from_device_id: settings.deviceId,
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
      from_device_id: settings.deviceId,
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
      from_device_id: settings.deviceId,
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

  async function handleSendDelivery() {
    if (!activeDevice || pendingDeliveries.length === 0) {
      return;
    }

    const summary = summarizeDeliverySelection(pendingDeliveries);
    const standaloneFiles = pendingDeliveries.filter(
      (entry) => entry.kind === "file" && entry.group_name === null,
    );

    if (!summary.hasDirectoryLikeEntries) {
      await Promise.all(
        standaloneFiles.map((entry) =>
          sendFileToDevice(
            `${activeDevice.ip_addr}:${activeDevice.file_port}`,
            entry.source_path,
            activeDevice.device_id,
          ),
        ),
      );
      setPendingDeliveries([]);
      return;
    }

    addMessage({
      message_id: `delivery-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      from_device_id: settings.deviceId,
      to_device_id: activeDevice.device_id,
      content: formatPendingDeliveryMessage(summary),
      sent_at_ms: Date.now(),
      kind: "delivery",
      delivery: {
        request_id: `request-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        status: "PendingDecision",
        entries: pendingDeliveries.map(mapPendingDeliveryEntry),
        save_root: null,
      },
    });
    setPendingDeliveries([]);
  }

  const visibleMessages = messages.filter((message) => {
    if (message.kind === "broadcast") {
      return true;
    }

    if (!activeDevice) {
      return false;
    }

    const isOutgoingToActive =
      message.from_device_id === settings.deviceId &&
      message.to_device_id === activeDevice.device_id;
    const isIncomingFromActive =
      message.from_device_id === activeDevice.device_id &&
      message.to_device_id === settings.deviceId;

    return isOutgoingToActive || isIncomingFromActive;
  });

  return (
    <main className="app-shell">
      <ContactsPanel
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={selectDevice}
      />
      <ChatPanel
        activeDeviceName={activeDevice?.nickname ?? null}
        messages={visibleMessages}
        localDeviceId={settings.deviceId}
        draftMessage={draftMessage}
        pendingDeliveries={pendingDeliveries}
        isDeliveryDragActive={isDeliveryDragActive}
        onDraftChange={setDraftMessage}
        onPickFiles={() => void handlePickFiles()}
        onPickDirectory={() => void handlePickDirectory()}
        onSendDirect={() => void handleSendDirect()}
        onSendBroadcast={() => void handleSendBroadcast()}
        onSendDelivery={() => void handleSendDelivery()}
        canSendDirect={Boolean(activeDevice && draftMessage.trim())}
        canSendBroadcast={Boolean(devices.length > 0 && draftMessage.trim())}
        canSendDelivery={Boolean(activeDevice && pendingDeliveries.length > 0)}
      />
      <div className="right-column">
        <TransfersPanel
          devices={devices}
          localDeviceId={settings.deviceId}
          transfers={transfers}
        />
        <SettingsPanel
          nickname={settings.nickname}
          downloadDir={settings.downloadDir}
          onNicknameChange={(value) => updateSettings({ nickname: value })}
          onDownloadDirChange={(value) => updateSettings({ downloadDir: value })}
        />
      </div>
    </main>
  );
}

function formatPendingDeliveryMessage(
  summary: ReturnType<typeof summarizeDeliverySelection>,
): string {
  const fragments: string[] = [];

  if (summary.groups.length > 0) {
    fragments.push(`${summary.groups.length} 个目录组`);
  }

  if (summary.files.length > 0) {
    fragments.push(`${summary.files.length} 个文件`);
  }

  return `待投递内容：${fragments.join("，")}`;
}

function mapPendingDeliveryEntry(entry: PendingDeliveryEntry): DeliveryEntry {
  return {
    entry_id: `entry-${entry.kind}-${entry.display_name}`,
    display_name: entry.display_name,
    relative_path: entry.relative_path,
    file_size: entry.file_size,
    kind: entry.kind === "directory" ? "Directory" : "File",
  };
}

export default App;
