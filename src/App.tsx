import { ChatPanel } from "./desktop/modules/chat/ChatPanel";
import { ContactsPanel } from "./desktop/modules/contacts/ContactsPanel";
import { SettingsPanel } from "./desktop/modules/settings/SettingsPanel";
import { TransfersPanel } from "./desktop/modules/transfers/TransfersPanel";
import "./styles/app.css";

function App() {
  return (
    <main className="app-shell">
      <ContactsPanel devices={[]} />
      <ChatPanel />
      <div className="right-column">
        <TransfersPanel transfers={[]} />
        <SettingsPanel />
      </div>
    </main>
  );
}

export default App;
