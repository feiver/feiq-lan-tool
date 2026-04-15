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
            <strong>研发组广播</strong>
            <span>等待接入真实在线列表</span>
          </div>
          <div className="contact-card">
            <strong>默认设备占位</strong>
            <span>Task 8 接入联系人模块</span>
          </div>
        </>
      )}
    </section>
  );
}
