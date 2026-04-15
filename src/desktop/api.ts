import { invoke } from "@tauri-apps/api/core";

import type { KnownDevice, MessagePayload, TransferTask } from "./types";

export function listDevices(): Promise<KnownDevice[]> {
  return invoke("list_devices");
}

export function listTransfers(): Promise<TransferTask[]> {
  return invoke("list_transfers");
}

export function sendDirectMessage(
  addr: string,
  payload: MessagePayload,
): Promise<void> {
  return invoke("send_direct_message", { addr, payload });
}

export function sendBroadcastMessage(
  addr: string,
  payload: MessagePayload,
): Promise<void> {
  return invoke("send_broadcast_message", { addr, payload });
}
