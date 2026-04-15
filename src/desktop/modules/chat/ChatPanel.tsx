import type { ChatMessage } from "../../types";

type ChatPanelProps = {
  activeDeviceName: string | null;
  messages: ChatMessage[];
  localDeviceId: string;
  draftMessage: string;
  filePath: string;
  onDraftChange: (value: string) => void;
  onFilePathChange: (value: string) => void;
  onSendDirect: () => void;
  onSendBroadcast: () => void;
  onSendFile: () => void;
  canSendDirect: boolean;
  canSendBroadcast: boolean;
  canSendFile: boolean;
};

export function ChatPanel({
  activeDeviceName,
  messages,
  localDeviceId,
  draftMessage,
  filePath,
  onDraftChange,
  onFilePathChange,
  onSendDirect,
  onSendBroadcast,
  onSendFile,
  canSendDirect,
  canSendBroadcast,
  canSendFile,
}: ChatPanelProps) {
  function formatEmptyState(): string {
    if (activeDeviceName) {
      return `已连接 ${activeDeviceName}，可发送单聊消息或文件。`;
    }

    return "请选择在线联系人开始单聊，也可以直接发送广播消息。";
  }

  function formatMessageMeta(message: ChatMessage): string {
    const senderName =
      message.from_device_id === localDeviceId
        ? "我"
        : activeDeviceName ?? message.from_device_id;
    const kindLabel = message.kind === "broadcast" ? "广播" : "单聊";
    return `${senderName} · ${kindLabel}`;
  }

  return (
    <section className="panel panel-chat">
      <div className="panel-header">
        <p className="panel-kicker">Session</p>
        <h2>消息会话</h2>
      </div>
      {messages.length > 0 ? (
        <div className="chat-log">
          {messages.map((message) => (
            <div
              key={message.message_id}
              className={`chat-bubble${message.from_device_id === localDeviceId ? " is-outgoing" : ""}`}
            >
              <span className="chat-bubble-meta">{formatMessageMeta(message)}</span>
              <span>{message.content}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="chat-placeholder">
          {activeDeviceName ? (
            <>
              <p>{`当前会话：${activeDeviceName}`}</p>
              <p>{formatEmptyState()}</p>
            </>
          ) : (
            <>
              <p>暂无活动会话</p>
              <p>{formatEmptyState()}</p>
            </>
          )}
        </div>
      )}
      <textarea
        className="chat-input"
        placeholder="输入消息内容"
        rows={5}
        value={draftMessage}
        onChange={(event) => onDraftChange(event.currentTarget.value)}
      />
      <input
        className="chat-file-input"
        placeholder="输入待发送文件路径"
        value={filePath}
        onChange={(event) => onFilePathChange(event.currentTarget.value)}
      />
      <div className="chat-actions">
        <button type="button" onClick={onSendDirect} disabled={!canSendDirect}>
          发送单聊
        </button>
        <button type="button" onClick={onSendBroadcast} disabled={!canSendBroadcast}>
          发送广播
        </button>
        <button type="button" onClick={onSendFile} disabled={!canSendFile}>
          发送文件
        </button>
      </div>
    </section>
  );
}
