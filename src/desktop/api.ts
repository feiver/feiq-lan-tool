import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";

import type { ChatMessage, KnownDevice, MessagePayload, TransferTask } from "./types";
import type { PendingDeliveryEntry } from "./modules/chat/delivery";

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

export function getRuntimeSettings(): Promise<RuntimeSettingsPayload> {
  return invoke<{
    device_id: string;
    nickname: string;
    download_dir: string;
  }>("get_settings").then((settings) => ({
    deviceId: settings.device_id,
    nickname: settings.nickname,
    downloadDir: settings.download_dir,
  }));
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

export async function pickDeliveryFiles(): Promise<string[]> {
  const selected = await open({
    title: "选择待发送文件",
    directory: false,
    multiple: true,
  });

  return normalizeSelection(selected);
}

export async function pickDeliveryDirectory(): Promise<string | null> {
  const selected = await open({
    title: "选择待发送文件夹",
    directory: true,
    multiple: false,
    recursive: true,
  });

  return typeof selected === "string" ? selected : Array.isArray(selected) ? selected[0] ?? null : null;
}

export async function pickSaveDirectory(): Promise<string | null> {
  const selected = await open({
    title: "选择接收目录",
    directory: true,
    multiple: false,
    recursive: true,
  });

  return typeof selected === "string" ? selected : null;
}

export function classifyDeliveryPaths(paths: string[]): Promise<PendingDeliveryEntry[]> {
  return invoke("classify_delivery_paths", { paths });
}

export function openDirectory(path: string): Promise<void> {
  return openPath(path);
}

export function sendDeliveryRequest(payload: {
  addr: string;
  fileAddr: string;
  requestId: string;
  toDeviceId: string;
  sentAtMs: number;
  entries: PendingDeliveryEntry[];
}): Promise<ChatMessage> {
  return invoke("send_delivery_request", payload);
}

export function sendDeliveryResponse(payload: {
  addr: string;
  requestId: string;
  toDeviceId: string;
  decision: "Accepted" | "Rejected";
  saveRoot: string | null;
}): Promise<ChatMessage> {
  return invoke("send_delivery_response", payload);
}

export function sendFileToDevice(
  addr: string,
  filePath: string,
  toDeviceId: string,
): Promise<void> {
  return invoke("send_file_to_device", { addr, filePath, toDeviceId });
}

function normalizeSelection(selection: string | string[] | null): string[] {
  if (Array.isArray(selection)) {
    return selection.filter((item): item is string => typeof item === "string");
  }

  return typeof selection === "string" ? [selection] : [];
}
