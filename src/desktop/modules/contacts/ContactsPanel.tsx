import type { KnownDevice } from "../../types";

type ContactsPanelProps = {
  devices: KnownDevice[];
};

export function ContactsPanel({ devices }: ContactsPanelProps) {
  return (
    <section className="panel panel-contacts">
      <div className="panel-header">
        <p className="panel-kicker">LAN roster</p>
        <h2>在线联系人</h2>
      </div>
      {devices.length > 0 ? (
        devices.map((device, index) => (
          <div
            key={device.device_id}
            className={`contact-card${index === 0 ? " is-active" : ""}`}
          >
            <strong>{device.nickname}</strong>
            <span>{device.host_name}</span>
            <span>{device.ip_addr}</span>
          </div>
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
