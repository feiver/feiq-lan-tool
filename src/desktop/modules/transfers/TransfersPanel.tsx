import type { KnownDevice, TransferTask } from "../../types";

type TransfersPanelProps = {
  devices: KnownDevice[];
  localDeviceId: string;
  transfers: TransferTask[];
};

export function TransfersPanel({
  devices,
  localDeviceId,
  transfers,
}: TransfersPanelProps) {
  const deviceNames = new Map(devices.map((device) => [device.device_id, device.nickname]));

  function formatBytes(value: number): string {
    return `${value} B`;
  }

  function formatProgress(task: TransferTask): string {
    if (task.file_size <= 0) {
      return formatBytes(task.transferred_bytes);
    }

    const percent = Math.round((task.transferred_bytes / task.file_size) * 100);
    return `${percent}% · ${formatBytes(task.transferred_bytes)} / ${formatBytes(task.file_size)}`;
  }

  function formatStatus(status: TransferTask["status"]): string {
    switch (status) {
      case "Pending":
        return "等待中";
      case "InProgress":
        return "传输中";
      case "Completed":
        return "已完成";
      case "Failed":
        return "失败";
      case "Cancelled":
        return "已取消";
      default:
        return status;
    }
  }

  function formatDirection(task: TransferTask): string {
    if (task.from_device_id === localDeviceId) {
      const targetName = deviceNames.get(task.to_device_id) ?? task.to_device_id;
      return `发送至 ${targetName}`;
    }

    const sourceName = deviceNames.get(task.from_device_id) ?? task.from_device_id;
    return `来自 ${sourceName}`;
  }

  return (
    <section className="panel panel-transfers">
      <div className="panel-header">
        <p className="panel-kicker">Transfers</p>
        <h2>传输任务</h2>
      </div>
      <ul className="transfer-list">
        {transfers.length > 0 ? (
          transfers.map((task) => (
            <li key={task.transfer_id}>
              <strong>{task.file_name}</strong>
              <span>{formatDirection(task)}</span>
              <span>{formatProgress(task)}</span>
              <span>{formatStatus(task.status)}</span>
            </li>
          ))
        ) : (
          <li>
            <strong>暂无传输任务</strong>
            <span>新的收发进度会显示在这里</span>
          </li>
        )}
      </ul>
    </section>
  );
}
