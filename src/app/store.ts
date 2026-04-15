import { create } from "zustand";

import { listDevices, listMessages, listTransfers } from "../desktop/api";
import type { ChatMessage, KnownDevice, TransferTask } from "../desktop/types";

type AppStore = {
  devices: KnownDevice[];
  messages: ChatMessage[];
  selectedDeviceId: string | null;
  transfers: TransferTask[];
  load: () => Promise<void>;
  selectDevice: (deviceId: string) => void;
  addMessage: (message: ChatMessage) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  devices: [],
  messages: [],
  selectedDeviceId: null,
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
      selectedDeviceId:
        state.selectedDeviceId && devices.some((device) => device.device_id === state.selectedDeviceId)
          ? state.selectedDeviceId
          : devices[0]?.device_id ?? null,
    }));
  },
  selectDevice(deviceId) {
    set({ selectedDeviceId: deviceId });
  },
  addMessage(message) {
    set((state) => ({ messages: [...state.messages, message] }));
  },
}));
