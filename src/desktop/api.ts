import { invoke } from "@tauri-apps/api/core";

import type { KnownDevice, TransferTask } from "./types";

export function listDevices(): Promise<KnownDevice[]> {
  return invoke("list_devices");
}

export function listTransfers(): Promise<TransferTask[]> {
  return invoke("list_transfers");
}
