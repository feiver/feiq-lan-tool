type ChatPanelProps = {
  activeDeviceName: string | null;
};

export function ChatPanel({ activeDeviceName }: ChatPanelProps) {
  return (
    <section className="panel panel-chat">
      <div className="panel-header">
        <p className="panel-kicker">Session</p>
        <h2>消息会话</h2>
      </div>
      <div className="chat-placeholder">
        {activeDeviceName ? (
          <>
            <p>{`当前会话：${activeDeviceName}`}</p>
            <p>会话消息流将在下一步接入，当前已支持联系人切换联动。</p>
          </>
        ) : (
          <>
            <p>请选择一个在线联系人开始会话。</p>
            <p>消息流、单聊输入和广播动作会在下一步接入。</p>
          </>
        )}
      </div>
    </section>
  );
}
