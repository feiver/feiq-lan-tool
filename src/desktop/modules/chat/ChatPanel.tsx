import type { ChatMessage } from "../../types";

type ChatPanelProps = {
  activeDeviceName: string | null;
  messages: ChatMessage[];
  draftMessage: string;
  onDraftChange: (value: string) => void;
  onSendDirect: () => void;
  onSendBroadcast: () => void;
  canSendDirect: boolean;
  canSendBroadcast: boolean;
};

export function ChatPanel({
  activeDeviceName,
  messages,
  draftMessage,
  onDraftChange,
  onSendDirect,
  onSendBroadcast,
  canSendDirect,
  canSendBroadcast,
}: ChatPanelProps) {
  return (
    <section className="panel panel-chat">
      <div className="panel-header">
        <p className="panel-kicker">Session</p>
        <h2>消息会话</h2>
      </div>
      <div className="chat-placeholder">
        {activeDeviceName ? (
          <>
            <p>{`当前会话：${activeDeviceName}`}</p>
            <p>会话消息流将在下一步接入，当前已支持联系人切换联动。</p>
          </>
        ) : (
          <>
            <p>请选择一个在线联系人开始会话。</p>
            <p>消息流、单聊输入和广播动作会在下一步接入。</p>
          </>
        )}
      </div>
      {messages.length > 0 ? (
        <div className="chat-log">
          {messages.map((message) => (
            <div key={message.message_id} className="chat-bubble">
              {message.content}
            </div>
          ))}
        </div>
      ) : null}
      <textarea
        className="chat-input"
        placeholder="输入消息内容"
        rows={5}
        value={draftMessage}
        onChange={(event) => onDraftChange(event.currentTarget.value)}
      />
      <div className="chat-actions">
        <button type="button" onClick={onSendDirect} disabled={!canSendDirect}>
          发送单聊
        </button>
        <button type="button" onClick={onSendBroadcast} disabled={!canSendBroadcast}>
          发送广播
        </button>
      </div>
    </section>
  );
}
