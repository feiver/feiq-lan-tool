export type KnownDevice = {
  device_id: string;
  nickname: string;
  host_name: string;
  ip_addr: string;
  message_port: number;
  file_port: number;
  last_seen_ms: number;
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
