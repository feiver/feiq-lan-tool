type SettingsPanelProps = {
  nickname: string;
  downloadDir: string;
  onNicknameChange: (value: string) => void;
  onDownloadDirChange: (value: string) => void;
};

export function SettingsPanel({
  nickname,
  downloadDir,
  onNicknameChange,
  onDownloadDirChange,
}: SettingsPanelProps) {
  return (
    <section className="panel panel-settings">
      <div className="panel-header">
        <p className="panel-kicker">Preferences</p>
        <h2>本地设置</h2>
      </div>
      <div className="settings-stack">
        <label className="settings-field">
          <span>昵称</span>
          <input
            value={nickname}
            onChange={(event) => onNicknameChange(event.currentTarget.value)}
          />
        </label>
        <label className="settings-field">
          <span>下载目录</span>
          <input
            value={downloadDir}
            onChange={(event) => onDownloadDirChange(event.currentTarget.value)}
          />
        </label>
      </div>
    </section>
  );
}
