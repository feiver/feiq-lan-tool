import { create } from "zustand";

import { getRuntimeSettings, listDevices, listMessages, listTransfers } from "../desktop/api";
import type {
  AppPreferences,
  ChatMessage,
  KnownDevice,
  SettingsSnapshot,
  TransferTask,
} from "../desktop/types";
import { defaultChatPreferences } from "../desktop/types";

type AppStore = {
  devices: KnownDevice[];
  messages: ChatMessage[];
  contactUnreadCounts: Record<string, number>;
  selectedDeviceId: string | null;
  settings: SettingsSnapshot;
  settingsReady: boolean;
  transfers: TransferTask[];
  load: () => Promise<void>;
  setDevices: (devices: KnownDevice[]) => void;
  upsertTransfer: (task: TransferTask) => void;
  selectDevice: (deviceId: string) => void;
  incrementContactUnread: (deviceId: string) => void;
  clearContactUnread: (deviceId: string) => void;
  addMessage: (message: ChatMessage) => void;
  updatePreferences: (updater: (current: AppPreferences) => AppPreferences) => void;
};

const defaultPreferences: AppPreferences = {
  identity: {
    nickname: "未命名设备",
    deviceNameMode: "NicknameOnly",
    statusMessage: "",
  },
  chat: defaultChatPreferences,
  transfer: {
    downloadDir: "~/Downloads",
    receiveBeforeAccept: true,
    openFolderAfterReceive: true,
    preserveDirectoryStructure: true,
  },
  network: {
    discoveryMode: "Auto",
    manualSegments: [],
  },
  display: {
    trayEnabled: true,
    closeAction: "MinimizeToTray",
  },
};

export const useAppStore = create<AppStore>((set) => ({
  devices: [],
  messages: [],
  contactUnreadCounts: {},
  selectedDeviceId: null,
  settings: {
    preferences: defaultPreferences,
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  },
  settingsReady: false,
  transfers: [],
  async load() {
    const [devices, messages, transfers, settings] = await Promise.all([
      listDevices(),
      listMessages(),
      listTransfers(),
      getRuntimeSettings(),
    ]);

    set((state) => ({
      devices,
      messages,
      settings,
      settingsReady: true,
      transfers,
      selectedDeviceId: resolveSelectedDeviceId(state.selectedDeviceId, devices),
    }));
  },
  setDevices(devices) {
    set((state) => ({
      devices,
      contactUnreadCounts: filterContactUnreadCounts(
        state.contactUnreadCounts,
        devices,
      ),
      selectedDeviceId: resolveSelectedDeviceId(state.selectedDeviceId, devices),
    }));
  },
  upsertTransfer(task) {
    set((state) => ({
      transfers: upsertTransferTask(state.transfers, task),
    }));
  },
  selectDevice(deviceId) {
    set((state) => ({
      selectedDeviceId: deviceId,
      contactUnreadCounts: clearUnreadCount(state.contactUnreadCounts, deviceId),
    }));
  },
  incrementContactUnread(deviceId) {
    set((state) => ({
      contactUnreadCounts: {
        ...state.contactUnreadCounts,
        [deviceId]: (state.contactUnreadCounts[deviceId] ?? 0) + 1,
      },
    }));
  },
  clearContactUnread(deviceId) {
    set((state) => ({
      contactUnreadCounts: clearUnreadCount(state.contactUnreadCounts, deviceId),
    }));
  },
  addMessage(message) {
    set((state) => ({
      messages: upsertMessage(state.messages, message),
    }));
  },
  updatePreferences(updater) {
    set((state) => ({
      settings: {
        ...state.settings,
        preferences: updater(state.settings.preferences),
      },
    }));
  },
}));

function resolveSelectedDeviceId(
  selectedDeviceId: string | null,
  devices: KnownDevice[],
): string | null {
  return selectedDeviceId && devices.some((device) => device.device_id === selectedDeviceId)
    ? selectedDeviceId
    : devices[0]?.device_id ?? null;
}

function upsertTransferTask(tasks: TransferTask[], task: TransferTask): TransferTask[] {
  const index = tasks.findIndex((item) => item.transfer_id === task.transfer_id);
  if (index === -1) {
    return [...tasks, task];
  }

  const next = [...tasks];
  next[index] = task;
  return next;
}

function upsertMessage(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const index = messages.findIndex((item) => item.message_id === message.message_id);
  if (index === -1) {
    return [...messages, message];
  }

  const next = [...messages];
  next[index] = message;
  return next;
}

function clearUnreadCount(
  contactUnreadCounts: Record<string, number>,
  deviceId: string,
): Record<string, number> {
  if (!contactUnreadCounts[deviceId]) {
    return contactUnreadCounts;
  }

  const next = { ...contactUnreadCounts };
  delete next[deviceId];
  return next;
}

function filterContactUnreadCounts(
  contactUnreadCounts: Record<string, number>,
  devices: KnownDevice[],
): Record<string, number> {
  const onlineDeviceIds = new Set(devices.map((device) => device.device_id));

  return Object.fromEntries(
    Object.entries(contactUnreadCounts).filter(([deviceId]) =>
      onlineDeviceIds.has(deviceId),
    ),
  );
}
