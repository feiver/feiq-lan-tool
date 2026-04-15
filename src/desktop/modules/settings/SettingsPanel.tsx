export function SettingsPanel() {
  return (
    <section className="panel panel-settings">
      <div className="panel-header">
        <p className="panel-kicker">Preferences</p>
        <h2>本地设置</h2>
      </div>
      <div className="settings-stack">
        <label className="settings-field">
          <span>昵称</span>
          <input defaultValue="未命名设备" />
        </label>
        <label className="settings-field">
          <span>下载目录</span>
          <input defaultValue="~/Downloads" />
        </label>
      </div>
    </section>
  );
}
