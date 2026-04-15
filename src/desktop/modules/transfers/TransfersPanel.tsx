import type { TransferTask } from "../../types";

type TransfersPanelProps = {
  transfers: TransferTask[];
};

export function TransfersPanel({ transfers }: TransfersPanelProps) {
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
              <span>{task.status}</span>
            </li>
          ))
        ) : (
          <li>
            <strong>等待接入任务数据</strong>
            <span>文件收发状态会显示在这里</span>
          </li>
        )}
      </ul>
    </section>
  );
}
