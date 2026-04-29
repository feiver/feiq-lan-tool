type InAppNotificationBannerProps = {
  title: string;
  onOpen: () => void;
  onDismiss: () => void;
};

export function InAppNotificationBanner({
  title,
  onOpen,
  onDismiss,
}: InAppNotificationBannerProps) {
  return (
    <section className="in-app-banner" aria-live="polite">
      <div className="in-app-banner__content">
        <strong>{title}</strong>
      </div>
      <div className="in-app-banner__actions">
        <button type="button" onClick={onOpen}>
          查看
        </button>
        <button type="button" onClick={onDismiss}>
          关闭
        </button>
      </div>
    </section>
  );
}
