import type { KnownDevice } from "../../types";

type ContactsPanelProps = {
  devices: KnownDevice[];
  pendingDeliveryIndicators: Record<string, boolean>;
  contactSummaries: Record<string, string>;
  unreadCounts: Record<string, number>;
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string) => void;
  onOpenSettings: () => void;
};

export function ContactsPanel({
  devices,
  pendingDeliveryIndicators,
  contactSummaries,
  unreadCounts,
  selectedDeviceId,
  onSelectDevice,
  onOpenSettings,
}: ContactsPanelProps) {
  return (
    <section className="panel panel-contacts">
      <div className="panel-header panel-header-row">
        <div>
          <p className="panel-kicker">LAN roster</p>
          <h2>在线联系人</h2>
        </div>
        <button
          type="button"
          className="panel-secondary-action"
          onClick={onOpenSettings}
        >
          设置
        </button>
      </div>
      {devices.length > 0 ? (
        devices.map((device) => {
          const unreadCount = unreadCounts[device.device_id] ?? 0;
          const hasPendingDelivery =
            pendingDeliveryIndicators[device.device_id] ?? false;
          const summary = contactSummaries[device.device_id] || "暂无消息";
          const auxiliaryLabel = device.status_message || device.host_name;

          return (
            <button
              key={device.device_id}
              type="button"
              className={`contact-card${selectedDeviceId === device.device_id ? " is-active" : ""}`}
              onClick={() => onSelectDevice(device.device_id)}
            >
              {unreadCount > 0 ? (
                <span
                  className="contact-unread-badge"
                  aria-label={`未读 ${unreadCount} 条`}
                >
                  {unreadCount}
                </span>
              ) : null}
              <div className="contact-title-row">
                <strong>{device.nickname}</strong>
                {hasPendingDelivery ? (
                  <span className="contact-status-chip">待接收</span>
                ) : null}
              </div>
              <span className="contact-summary">{summary}</span>
              <span className="contact-auxiliary">{auxiliaryLabel}</span>
            </button>
          );
        })
      ) : (
        <>
          <div className="contact-card is-active">
            <strong>暂未发现在线设备</strong>
            <span>请确认对方与您处于同一局域网，并保持应用在线。</span>
          </div>
          <div className="contact-card">
            <strong>发现后自动出现</strong>
            <span>检测到设备广播后，联系人列表会实时更新。</span>
          </div>
        </>
      )}
    </section>
  );
}
