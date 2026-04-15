import type { KnownDevice } from "../../types";

type ContactsPanelProps = {
  devices: KnownDevice[];
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string) => void;
};

export function ContactsPanel({
  devices,
  selectedDeviceId,
  onSelectDevice,
}: ContactsPanelProps) {
  return (
    <section className="panel panel-contacts">
      <div className="panel-header">
        <p className="panel-kicker">LAN roster</p>
        <h2>在线联系人</h2>
      </div>
      {devices.length > 0 ? (
        devices.map((device) => (
          <button
            key={device.device_id}
            type="button"
            className={`contact-card${selectedDeviceId === device.device_id ? " is-active" : ""}`}
            onClick={() => onSelectDevice(device.device_id)}
          >
            <strong>{device.nickname}</strong>
            <span>{device.host_name}</span>
            <span>{device.ip_addr}</span>
          </button>
        ))
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
