import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";

import type {
  AppPreferences,
  ChatMessage,
  DiscoveryRefreshHistoryEntry,
  KnownDevice,
  MessagePayload,
  SettingsSnapshot,
  TransferTask,
} from "./types";
import { defaultChatPreferences as fallbackChatPreferences } from "./types";
import type { PendingDeliveryEntry } from "./modules/chat/delivery";

export function listDevices(): Promise<KnownDevice[]> {
  return invoke("list_devices");
}

export function listTransfers(): Promise<TransferTask[]> {
  return invoke("list_transfers");
}

export function listMessages(): Promise<ChatMessage[]> {
  return invoke("list_messages");
}

export function getRuntimeSettings(): Promise<SettingsSnapshot> {
  return invoke<{
    preferences: {
      identity: {
        nickname: string;
        device_name_mode: AppPreferences["identity"]["deviceNameMode"];
        status_message: string;
      };
      chat?: {
        enter_to_send?: boolean;
        confirm_before_broadcast?: boolean;
        auto_switch_to_incoming_direct?: boolean;
        auto_switch_to_incoming_delivery?: boolean;
      };
      transfer: {
        download_dir: string;
        receive_before_accept: boolean;
        open_folder_after_receive: boolean;
        preserve_directory_structure: boolean;
      };
      network: {
        discovery_mode: AppPreferences["network"]["discoveryMode"];
        manual_segments: string[];
      };
      display: {
        tray_enabled: boolean;
        close_action: AppPreferences["display"]["closeAction"];
      };
    };
    runtime: {
      device_id: string;
      message_port: number;
      file_port: number;
    };
  }>("get_settings").then((snapshot) => ({
    preferences: {
      identity: {
        nickname: snapshot.preferences.identity.nickname,
        deviceNameMode: snapshot.preferences.identity.device_name_mode,
        statusMessage: snapshot.preferences.identity.status_message,
      },
      chat: {
        enterToSend:
          snapshot.preferences.chat?.enter_to_send ??
          fallbackChatPreferences.enterToSend,
        confirmBeforeBroadcast:
          snapshot.preferences.chat?.confirm_before_broadcast ??
          fallbackChatPreferences.confirmBeforeBroadcast,
        autoSwitchToIncomingDirect:
          snapshot.preferences.chat?.auto_switch_to_incoming_direct ??
          fallbackChatPreferences.autoSwitchToIncomingDirect,
        autoSwitchToIncomingDelivery:
          snapshot.preferences.chat?.auto_switch_to_incoming_delivery ??
          fallbackChatPreferences.autoSwitchToIncomingDelivery,
      },
      transfer: {
        downloadDir: snapshot.preferences.transfer.download_dir,
        receiveBeforeAccept: snapshot.preferences.transfer.receive_before_accept,
        openFolderAfterReceive: snapshot.preferences.transfer.open_folder_after_receive,
        preserveDirectoryStructure: snapshot.preferences.transfer.preserve_directory_structure,
      },
      network: {
        discoveryMode: snapshot.preferences.network.discovery_mode,
        manualSegments: snapshot.preferences.network.manual_segments,
      },
      display: {
        trayEnabled: snapshot.preferences.display.tray_enabled,
        closeAction: snapshot.preferences.display.close_action,
      },
    },
    runtime: {
      deviceId: snapshot.runtime.device_id,
      messagePort: snapshot.runtime.message_port,
      filePort: snapshot.runtime.file_port,
    },
  }));
}

export function getDiscoveryRefreshHistory(): Promise<DiscoveryRefreshHistoryEntry[]> {
  return invoke<
    Array<{
      id: string;
      timestamp: number;
      status: DiscoveryRefreshHistoryEntry["status"];
      discovered_count: number;
      existing_count: number;
      unmatched_segment_count: number;
      message: string;
      new_device_labels?: string[];
      existing_device_labels?: string[];
      unmatched_segments?: string[];
      segment_statuses?: Array<{
        segment: string;
        status: DiscoveryRefreshHistoryEntry["segmentStatuses"][number]["status"];
        new_device_count: number;
        existing_device_count: number;
      }>;
    }>
  >("get_discovery_refresh_history").then((entries) =>
    entries.map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      status: entry.status,
      discoveredCount: entry.discovered_count,
      existingCount: entry.existing_count,
      unmatchedSegmentCount: entry.unmatched_segment_count,
      message: entry.message,
      newDeviceLabels: entry.new_device_labels ?? [],
      existingDeviceLabels: entry.existing_device_labels ?? [],
      unmatchedSegments: entry.unmatched_segments ?? [],
      segmentStatuses: (entry.segment_statuses ?? []).map((segment) => ({
        segment: segment.segment,
        status: segment.status,
        newDeviceCount: segment.new_device_count,
        existingDeviceCount: segment.existing_device_count,
      })),
    })),
  );
}

export function persistDiscoveryRefreshHistory(
  entries: DiscoveryRefreshHistoryEntry[],
): Promise<void> {
  return invoke("persist_discovery_refresh_history", {
    entries: entries.map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      status: entry.status,
      discovered_count: entry.discoveredCount,
      existing_count: entry.existingCount,
      unmatched_segment_count: entry.unmatchedSegmentCount,
      message: entry.message,
      new_device_labels: entry.newDeviceLabels,
      existing_device_labels: entry.existingDeviceLabels,
      unmatched_segments: entry.unmatchedSegments,
      segment_statuses: entry.segmentStatuses.map((segment) => ({
        segment: segment.segment,
        status: segment.status,
        new_device_count: segment.newDeviceCount,
        existing_device_count: segment.existingDeviceCount,
      })),
    })),
  });
}

export function syncRuntimeSettings(settings: AppPreferences): Promise<void> {
  return invoke("sync_settings", {
    settings: {
      identity: {
        nickname: settings.identity.nickname,
        device_name_mode: settings.identity.deviceNameMode,
        status_message: settings.identity.statusMessage,
      },
      chat: {
        enter_to_send:
          settings.chat?.enterToSend ?? fallbackChatPreferences.enterToSend,
        confirm_before_broadcast:
          settings.chat?.confirmBeforeBroadcast ??
          fallbackChatPreferences.confirmBeforeBroadcast,
        auto_switch_to_incoming_direct:
          settings.chat?.autoSwitchToIncomingDirect ??
          fallbackChatPreferences.autoSwitchToIncomingDirect,
        auto_switch_to_incoming_delivery:
          settings.chat?.autoSwitchToIncomingDelivery ??
          fallbackChatPreferences.autoSwitchToIncomingDelivery,
      },
      transfer: {
        download_dir: settings.transfer.downloadDir,
        receive_before_accept: settings.transfer.receiveBeforeAccept,
        open_folder_after_receive: settings.transfer.openFolderAfterReceive,
        preserve_directory_structure: settings.transfer.preserveDirectoryStructure,
      },
      network: {
        discovery_mode: settings.network.discoveryMode,
        manual_segments: settings.network.manualSegments,
      },
      display: {
        tray_enabled: settings.display.trayEnabled,
        close_action: settings.display.closeAction,
      },
    },
  });
}

export function refreshDiscovery(): Promise<void> {
  return invoke("refresh_discovery");
}

export async function openSettingsWindow(): Promise<void> {
  const existingWindow = await WebviewWindow.getByLabel("settings");
  if (existingWindow) {
    await existingWindow.show();
    await existingWindow.setFocus();
    return;
  }

  const settingsUrl = new URL(window.location.href);
  settingsUrl.searchParams.set("view", "settings");

  new WebviewWindow("settings", {
    title: "设置中心",
    url: settingsUrl.toString(),
    width: 1040,
    height: 760,
    minWidth: 900,
    minHeight: 640,
    center: true,
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
