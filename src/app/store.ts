import { create } from "zustand";

import { listDevices, listMessages, listTransfers } from "../desktop/api";
import type { ChatMessage, KnownDevice, TransferTask } from "../desktop/types";

type LocalSettings = {
  deviceId: string;
  nickname: string;
  downloadDir: string;
};

type AppStore = {
  devices: KnownDevice[];
  messages: ChatMessage[];
  selectedDeviceId: string | null;
  settings: LocalSettings;
  transfers: TransferTask[];
  load: () => Promise<void>;
  setDevices: (devices: KnownDevice[]) => void;
  selectDevice: (deviceId: string) => void;
  addMessage: (message: ChatMessage) => void;
  updateSettings: (patch: Partial<LocalSettings>) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  devices: [],
  messages: [],
  selectedDeviceId: null,
  settings: {
    deviceId: "local-device",
    nickname: "未命名设备",
    downloadDir: "~/Downloads",
  },
  transfers: [],
  async load() {
    const [devices, messages, transfers] = await Promise.all([
      listDevices(),
      listMessages(),
      listTransfers(),
    ]);

    set((state) => ({
      devices,
      messages,
      transfers,
      selectedDeviceId: resolveSelectedDeviceId(state.selectedDeviceId, devices),
    }));
  },
  setDevices(devices) {
    set((state) => ({
      devices,
      selectedDeviceId: resolveSelectedDeviceId(state.selectedDeviceId, devices),
    }));
  },
  selectDevice(deviceId) {
    set({ selectedDeviceId: deviceId });
  },
  addMessage(message) {
    set((state) => ({ messages: [...state.messages, message] }));
  },
  updateSettings(patch) {
    set((state) => ({
      settings: {
        ...state.settings,
        ...patch,
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
