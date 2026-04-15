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

export type ChatMessage = {
  message_id: string;
  to_device_id: string;
  content: string;
  sent_at_ms: number;
  kind: "direct" | "broadcast";
};
