import { useEffect } from "react";

import { useAppStore } from "./app/store";
import { ChatPanel } from "./desktop/modules/chat/ChatPanel";
import { ContactsPanel } from "./desktop/modules/contacts/ContactsPanel";
import { SettingsPanel } from "./desktop/modules/settings/SettingsPanel";
import { TransfersPanel } from "./desktop/modules/transfers/TransfersPanel";
import "./styles/app.css";

function App() {
  const devices = useAppStore((state) => state.devices);
  const transfers = useAppStore((state) => state.transfers);
  const load = useAppStore((state) => state.load);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="app-shell">
      <ContactsPanel devices={devices} />
      <ChatPanel />
      <div className="right-column">
        <TransfersPanel transfers={transfers} />
        <SettingsPanel />
      </div>
    </main>
  );
}

export default App;
