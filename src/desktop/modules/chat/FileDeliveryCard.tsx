import type { ChatMessage, DeliveryEntry } from "../../types";

type FileDeliveryCardProps = {
  message: ChatMessage;
  isIncoming: boolean;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onOpenDirectory: (path: string) => void;
};

export function FileDeliveryCard({
  message,
  isIncoming,
  onAccept,
  onReject,
  onOpenDirectory,
}: FileDeliveryCardProps) {
  const delivery = message.delivery;
  if (!delivery) {
    return null;
  }

  const groupedEntries = summarizeDeliveryEntries(delivery.entries);

  return (
    <div className="delivery-card">
      <div className="delivery-card-header">
        <strong>文件投递</strong>
        <span>{formatDeliveryStatus(delivery.status)}</span>
      </div>
      <div className="delivery-card-body">
        {groupedEntries.groups.length > 0 ? (
          <ul className="delivery-card-list">
            {groupedEntries.groups.map((group) => (
              <li key={group.groupName}>
                <strong>{group.groupName}/</strong>
                <span>{group.fileCount} 项</span>
              </li>
            ))}
          </ul>
        ) : null}
        {groupedEntries.files.length > 0 ? (
          <ul className="delivery-card-list">
            {groupedEntries.files.map((entry) => (
              <li key={entry.entry_id}>
                <strong>{entry.display_name}</strong>
                <span>{entry.file_size > 0 ? `${entry.file_size} B` : "待处理"}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {isIncoming && delivery.status === "PendingDecision" ? (
        <div className="delivery-card-actions">
          <button type="button" onClick={() => onAccept(delivery.request_id)}>
            接收
          </button>
          <button type="button" onClick={() => onReject(delivery.request_id)}>
            取消
          </button>
        </div>
      ) : null}
      {isIncoming && delivery.status === "Completed" && delivery.save_root ? (
        <div className="delivery-card-actions">
          <button type="button" onClick={() => onOpenDirectory(delivery.save_root!)}>
            打开目录
          </button>
        </div>
      ) : null}
    </div>
  );
}

function summarizeDeliveryEntries(entries: DeliveryEntry[]) {
  const groups = new Map<string, number>();
  const files: DeliveryEntry[] = [];

  for (const entry of entries) {
    const segments = entry.relative_path.split("/").filter(Boolean);
    if (segments.length > 1) {
      const groupName = segments[0];
      groups.set(groupName, (groups.get(groupName) ?? 0) + 1);
      continue;
    }

    files.push(entry);
  }

  return {
    groups: [...groups.entries()].map(([groupName, fileCount]) => ({
      groupName,
      fileCount,
    })),
    files,
  };
}

function formatDeliveryStatus(status: string): string {
  switch (status) {
    case "PendingDecision":
      return "等待处理";
    case "Accepted":
      return "已接收";
    case "Rejected":
      return "已取消";
    case "InProgress":
      return "传输中";
    case "Completed":
      return "已完成";
    case "Failed":
      return "失败";
    case "PartialFailed":
      return "部分失败";
    default:
      return status;
  }
}
