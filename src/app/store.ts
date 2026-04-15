import { create } from "zustand";

import { listDevices, listTransfers } from "../desktop/api";
import type { KnownDevice, TransferTask } from "../desktop/types";

type AppStore = {
  devices: KnownDevice[];
  transfers: TransferTask[];
  load: () => Promise<void>;
};

export const useAppStore = create<AppStore>((set) => ({
  devices: [],
  transfers: [],
  async load() {
    const [devices, transfers] = await Promise.all([
      listDevices(),
      listTransfers(),
    ]);

    set({ devices, transfers });
  },
}));
