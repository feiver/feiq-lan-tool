import { create } from "zustand";

import { listDevices, listTransfers } from "../desktop/api";
import type { KnownDevice, TransferTask } from "../desktop/types";

type AppStore = {
  devices: KnownDevice[];
  selectedDeviceId: string | null;
  transfers: TransferTask[];
  load: () => Promise<void>;
  selectDevice: (deviceId: string) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  devices: [],
  selectedDeviceId: null,
  transfers: [],
  async load() {
    const [devices, transfers] = await Promise.all([
      listDevices(),
      listTransfers(),
    ]);

    set((state) => ({
      devices,
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
}));
