import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

import { useAppStore } from "./app/store";
import {
  sendBroadcastMessage,
  sendDirectMessage,
  sendFileToDevice,
  syncRuntimeSettings,
} from "./desktop/api";
import { ChatPanel } from "./desktop/modules/chat/ChatPanel";
import { ContactsPanel } from "./desktop/modules/contacts/ContactsPanel";
import { SettingsPanel } from "./desktop/modules/settings/SettingsPanel";
import { TransfersPanel } from "./desktop/modules/transfers/TransfersPanel";
import type { ChatMessage, KnownDevice, MessagePayload, TransferTask } from "./desktop/types";
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
  const [draftFilePath, setDraftFilePath] = useState("");

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

  async function handleSendFile() {
    if (!activeDevice) {
      return;
    }

    const filePath = draftFilePath.trim();
    if (!filePath) {
      return;
    }

    await sendFileToDevice(
      `${activeDevice.ip_addr}:${activeDevice.file_port}`,
      filePath,
      activeDevice.device_id,
    );
    setDraftFilePath("");
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
        draftMessage={draftMessage}
        filePath={draftFilePath}
        onDraftChange={setDraftMessage}
        onFilePathChange={setDraftFilePath}
        onSendDirect={() => void handleSendDirect()}
        onSendBroadcast={() => void handleSendBroadcast()}
        onSendFile={() => void handleSendFile()}
        canSendDirect={Boolean(activeDevice && draftMessage.trim())}
        canSendBroadcast={Boolean(devices.length > 0 && draftMessage.trim())}
        canSendFile={Boolean(activeDevice && draftFilePath.trim())}
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

export default App;
