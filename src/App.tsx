import { useEffect, useState } from "react";

import { useAppStore } from "./app/store";
import {
  sendBroadcastMessage,
  sendDirectMessage,
} from "./desktop/api";
import { ChatPanel } from "./desktop/modules/chat/ChatPanel";
import { ContactsPanel } from "./desktop/modules/contacts/ContactsPanel";
import { SettingsPanel } from "./desktop/modules/settings/SettingsPanel";
import { TransfersPanel } from "./desktop/modules/transfers/TransfersPanel";
import type { MessagePayload } from "./desktop/types";
import "./styles/app.css";

function App() {
  const devices = useAppStore((state) => state.devices);
  const messages = useAppStore((state) => state.messages);
  const selectedDeviceId = useAppStore((state) => state.selectedDeviceId);
  const settings = useAppStore((state) => state.settings);
  const transfers = useAppStore((state) => state.transfers);
  const load = useAppStore((state) => state.load);
  const selectDevice = useAppStore((state) => state.selectDevice);
  const addMessage = useAppStore((state) => state.addMessage);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const activeDevice =
    devices.find((device) => device.device_id === selectedDeviceId) ?? null;
  const [draftMessage, setDraftMessage] = useState("");

  useEffect(() => {
    void load();
  }, [load]);

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
        onDraftChange={setDraftMessage}
        onSendDirect={() => void handleSendDirect()}
        onSendBroadcast={() => void handleSendBroadcast()}
        canSendDirect={Boolean(activeDevice && draftMessage.trim())}
        canSendBroadcast={Boolean(devices.length > 0 && draftMessage.trim())}
      />
      <div className="right-column">
        <TransfersPanel transfers={transfers} />
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
