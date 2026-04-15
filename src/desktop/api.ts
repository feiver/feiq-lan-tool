import { invoke } from "@tauri-apps/api/core";

import type { ChatMessage, KnownDevice, MessagePayload, TransferTask } from "./types";

type RuntimeSettingsPayload = {
  deviceId: string;
  nickname: string;
  downloadDir: string;
};

export function listDevices(): Promise<KnownDevice[]> {
  return invoke("list_devices");
}

export function listTransfers(): Promise<TransferTask[]> {
  return invoke("list_transfers");
}

export function listMessages(): Promise<ChatMessage[]> {
  return invoke("list_messages");
}

export function syncRuntimeSettings(settings: RuntimeSettingsPayload): Promise<void> {
  return invoke("sync_settings", {
    settings: {
      device_id: settings.deviceId,
      nickname: settings.nickname,
      download_dir: settings.downloadDir,
    },
  });
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
