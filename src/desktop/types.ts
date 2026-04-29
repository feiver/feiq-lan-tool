export type KnownDevice = {
  device_id: string;
  nickname: string;
  host_name: string;
  ip_addr: string;
  message_port: number;
  file_port: number;
  last_seen_ms: number;
  status_message?: string | null;
};

export type DeviceNameMode = "NicknameOnly" | "NicknameWithDeviceName";

export type DiscoveryMode = "Auto" | "ManualSegments" | "CurrentSegmentOnly";

export type CloseAction = "MinimizeToTray" | "Exit";

export type ChatPreferences = {
  enterToSend: boolean;
  confirmBeforeBroadcast: boolean;
  autoSwitchToIncomingDirect: boolean;
  autoSwitchToIncomingDelivery: boolean;
  showInAppBannerNotifications: boolean;
};

export const defaultChatPreferences: ChatPreferences = {
  enterToSend: false,
  confirmBeforeBroadcast: true,
  autoSwitchToIncomingDirect: false,
  autoSwitchToIncomingDelivery: true,
  showInAppBannerNotifications: true,
};

export type AppPreferences = {
  identity: {
    nickname: string;
    deviceNameMode: DeviceNameMode;
    statusMessage: string;
  };
  chat?: ChatPreferences;
  transfer: {
    downloadDir: string;
    receiveBeforeAccept: boolean;
    openFolderAfterReceive: boolean;
    preserveDirectoryStructure: boolean;
  };
  network: {
    discoveryMode: DiscoveryMode;
    manualSegments: string[];
  };
  display: {
    trayEnabled: boolean;
    closeAction: CloseAction;
  };
};

export type SettingsSnapshot = {
  preferences: AppPreferences;
  runtime: {
    deviceId: string;
    messagePort: number;
    filePort: number;
  };
};

export type DiscoveryRefreshHistoryStatus = "Succeeded" | "Failed";

export type DiscoveryRefreshSegmentStatus =
  | "NewlyMatched"
  | "AlreadyOnline"
  | "Unmatched";

export type DiscoveryRefreshSegmentStatusSummary = {
  segment: string;
  status: DiscoveryRefreshSegmentStatus;
  newDeviceCount: number;
  existingDeviceCount: number;
};

export type DiscoveryRefreshHistoryEntry = {
  id: string;
  timestamp: number;
  status: DiscoveryRefreshHistoryStatus;
  discoveredCount: number;
  existingCount: number;
  unmatchedSegmentCount: number;
  message: string;
  newDeviceLabels: string[];
  existingDeviceLabels: string[];
  unmatchedSegments: string[];
  segmentStatuses: DiscoveryRefreshSegmentStatusSummary[];
};

export type TransferTask = {
  transfer_id: string;
  file_name: string;
  file_size: number;
  transferred_bytes: number;
  from_device_id: string;
  to_device_id: string;
  status: "Pending" | "InProgress" | "Completed" | "Failed" | "Cancelled";
};

export type MessagePayload = {
  message_id: string;
  from_device_id: string;
  to_device_id: string;
  content: string;
  sent_at_ms: number;
};

export type DeliveryEntryKind = "File" | "Directory";

export type DeliveryEntry = {
  entry_id: string;
  display_name: string;
  relative_path: string;
  file_size: number;
  kind: DeliveryEntryKind;
};

export type DeliveryStatus =
  | "PendingDecision"
  | "Accepted"
  | "Rejected"
  | "InProgress"
  | "Completed"
  | "Failed"
  | "PartialFailed";

export type ChatDelivery = {
  request_id: string;
  status: DeliveryStatus;
  entries: DeliveryEntry[];
  save_root: string | null;
};

export type DeliveryRequest = {
  request_id: string;
  from_device_id: string;
  to_device_id: string;
  sent_at_ms: number;
  entries: DeliveryEntry[];
};

export type DeliveryDecision = "Accepted" | "Rejected";

export type DeliveryResponse = {
  request_id: string;
  from_device_id: string;
  to_device_id: string;
  decision: DeliveryDecision;
  save_root: string | null;
};

export type ChatMessage = {
  message_id: string;
  from_device_id: string;
  to_device_id: string;
  content: string;
  sent_at_ms: number;
  kind: "direct" | "broadcast" | "delivery";
  delivery?: ChatDelivery | null;
};
