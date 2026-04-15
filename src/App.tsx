import { useEffect } from "react";

import { useAppStore } from "./app/store";
import { ChatPanel } from "./desktop/modules/chat/ChatPanel";
import { ContactsPanel } from "./desktop/modules/contacts/ContactsPanel";
import { SettingsPanel } from "./desktop/modules/settings/SettingsPanel";
import { TransfersPanel } from "./desktop/modules/transfers/TransfersPanel";
import "./styles/app.css";

function App() {
  const devices = useAppStore((state) => state.devices);
  const selectedDeviceId = useAppStore((state) => state.selectedDeviceId);
  const transfers = useAppStore((state) => state.transfers);
  const load = useAppStore((state) => state.load);
  const selectDevice = useAppStore((state) => state.selectDevice);
  const activeDevice =
    devices.find((device) => device.device_id === selectedDeviceId) ?? null;

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="app-shell">
      <ContactsPanel
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={selectDevice}
      />
      <ChatPanel activeDeviceName={activeDevice?.nickname ?? null} />
      <div className="right-column">
        <TransfersPanel transfers={transfers} />
        <SettingsPanel />
      </div>
    </main>
  );
}

export default App;
