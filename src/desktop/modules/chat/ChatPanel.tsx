import type { ChatMessage } from "../../types";
import { FileDeliveryCard } from "./FileDeliveryCard";
import {
  summarizeDeliverySelection,
  type PendingDeliveryEntry,
} from "./delivery";

type ChatPanelProps = {
  activeDeviceName: string | null;
  messages: ChatMessage[];
  localDeviceId: string;
  draftMessage: string;
  pendingDeliveries: PendingDeliveryEntry[];
  isDeliveryDragActive: boolean;
  onDraftChange: (value: string) => void;
  onPickFiles: () => void;
  onPickDirectory: () => void;
  onSendDirect: () => void;
  onSendBroadcast: () => void;
  onSendDelivery: () => void;
  onAcceptDelivery: (requestId: string) => void;
  onRejectDelivery: (requestId: string) => void;
  onOpenDeliveryDirectory: (path: string) => void;
  canSendDirect: boolean;
  canSendBroadcast: boolean;
  canSendDelivery: boolean;
};

export function ChatPanel({
  activeDeviceName,
  messages,
  localDeviceId,
  draftMessage,
  pendingDeliveries,
  isDeliveryDragActive,
  onDraftChange,
  onPickFiles,
  onPickDirectory,
  onSendDirect,
  onSendBroadcast,
  onSendDelivery,
  onAcceptDelivery,
  onRejectDelivery,
  onOpenDeliveryDirectory,
  canSendDirect,
  canSendBroadcast,
  canSendDelivery,
}: ChatPanelProps) {
  const deliverySummary = summarizeDeliverySelection(pendingDeliveries);

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
    const kindLabel =
      message.kind === "broadcast"
        ? "广播"
        : message.kind === "delivery"
          ? "投递"
          : "单聊";
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
              {message.kind === "delivery" && message.delivery ? (
                <FileDeliveryCard
                  message={message}
                  isIncoming={message.from_device_id !== localDeviceId}
                  onAccept={onAcceptDelivery}
                  onReject={onRejectDelivery}
                  onOpenDirectory={onOpenDeliveryDirectory}
                />
              ) : (
                <span>{message.content}</span>
              )}
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
      <div className="chat-actions">
        <button type="button" onClick={onSendDirect} disabled={!canSendDirect}>
          发送单聊
        </button>
        <button type="button" onClick={onSendBroadcast} disabled={!canSendBroadcast}>
          发送广播
        </button>
      </div>
      <div className={`delivery-dropzone${isDeliveryDragActive ? " is-active" : ""}`}>
        <strong>拖拽上传</strong>
        <span>将文件或文件夹拖到这里，或使用下方按钮选择。</span>
      </div>
      <div className="delivery-actions">
        <button type="button" onClick={onPickFiles}>
          选择文件
        </button>
        <button type="button" onClick={onPickDirectory}>
          选择文件夹
        </button>
        <button type="button" onClick={onSendDelivery} disabled={!canSendDelivery}>
          发送投递
        </button>
      </div>
      {pendingDeliveries.length > 0 ? (
        <section className="delivery-preview">
          <div className="delivery-preview-header">
            <strong>待发送投递</strong>
            <span>{deliverySummary.totalEntryCount} 项</span>
          </div>
          {deliverySummary.groups.length > 0 ? (
            <ul className="delivery-preview-list">
              {deliverySummary.groups.map((group) => (
                <li key={group.groupName}>
                  <strong>{group.groupName}/</strong>
                  <span>{group.entryCount} 项</span>
                </li>
              ))}
            </ul>
          ) : null}
          {deliverySummary.files.length > 0 ? (
            <ul className="delivery-preview-list">
              {deliverySummary.files.map((file) => (
                <li key={file.displayName}>
                  <strong>{file.displayName}</strong>
                  <span>{file.fileSize > 0 ? `${file.fileSize} B` : "待发送"}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
