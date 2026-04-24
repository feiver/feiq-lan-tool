import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { useAppStore } from "../app/store";
import App from "../App";
import * as desktopApi from "../desktop/api";
import * as eventApi from "@tauri-apps/api/event";
import * as windowApi from "@tauri-apps/api/window";
import type {
  DiscoveryRefreshHistoryEntry,
  KnownDevice,
} from "../desktop/types";

const eventListeners = new Map<string, (event: { payload: unknown }) => void>();
const mockedUnlisten = vi.fn();
const mockedWindowUnlisten = vi.fn();
const mockedOnDragDropEvent = vi.fn(async () => mockedWindowUnlisten);

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (_eventName: string, handler: (event: { payload: unknown }) => void) => {
    eventListeners.set(_eventName, handler);
    return mockedUnlisten;
  }),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({
    onDragDropEvent: mockedOnDragDropEvent,
  })),
}));

vi.mock("../desktop/api", async () => {
  const actual = await vi.importActual<typeof import("../desktop/api")>(
    "../desktop/api",
  );

  return {
    ...actual,
    listDevices: vi.fn(),
    listMessages: vi.fn(),
    listTransfers: vi.fn(),
    getRuntimeSettings: vi.fn(),
    getDiscoveryRefreshHistory: vi.fn(),
    persistDiscoveryRefreshHistory: vi.fn(),
    syncRuntimeSettings: vi.fn(),
    refreshDiscovery: vi.fn(),
    openSettingsWindow: vi.fn(),
    pickDeliveryFiles: vi.fn(),
    pickDeliveryDirectory: vi.fn(),
    pickSaveDirectory: vi.fn(),
    sendDeliveryRequest: vi.fn(),
    sendDeliveryResponse: vi.fn(),
    openDirectory: vi.fn(),
    sendFileToDevice: vi.fn(),
    sendDirectMessage: vi.fn(),
    sendBroadcastMessage: vi.fn(),
  };
});

const mockedListDevices = vi.mocked(desktopApi.listDevices);
const mockedListMessages = vi.mocked(desktopApi.listMessages);
const mockedListTransfers = vi.mocked(desktopApi.listTransfers);
const mockedGetRuntimeSettings = vi.mocked(desktopApi.getRuntimeSettings);
const mockedGetDiscoveryRefreshHistory = vi.mocked(desktopApi.getDiscoveryRefreshHistory);
const mockedPersistDiscoveryRefreshHistory = vi.mocked(
  desktopApi.persistDiscoveryRefreshHistory,
);
const mockedSyncRuntimeSettings = vi.mocked(desktopApi.syncRuntimeSettings);
const mockedRefreshDiscovery = vi.mocked(desktopApi.refreshDiscovery);
const mockedOpenSettingsWindow = vi.mocked(desktopApi.openSettingsWindow);
const mockedPickDeliveryFiles = vi.mocked(desktopApi.pickDeliveryFiles);
const mockedPickDeliveryDirectory = vi.mocked(desktopApi.pickDeliveryDirectory);
const mockedPickSaveDirectory = vi.mocked(desktopApi.pickSaveDirectory);
const mockedSendDeliveryRequest = vi.mocked(desktopApi.sendDeliveryRequest);
const mockedSendDeliveryResponse = vi.mocked(desktopApi.sendDeliveryResponse);
const mockedOpenDirectory = vi.mocked(desktopApi.openDirectory);
const mockedSendFileToDevice = vi.mocked(desktopApi.sendFileToDevice);
const mockedSendDirectMessage = vi.mocked(desktopApi.sendDirectMessage);
const mockedSendBroadcastMessage = vi.mocked(desktopApi.sendBroadcastMessage);
const mockedListen = vi.mocked(eventApi.listen);
const mockedGetCurrentWindow = vi.mocked(windowApi.getCurrentWindow);
const mockedClipboardWriteText = vi.fn();
const mockedConfirm = vi.fn(() => true);

function createRefreshHistoryEntry(
  overrides: Partial<DiscoveryRefreshHistoryEntry> & {
    id: string;
    timestamp: number;
    status: DiscoveryRefreshHistoryEntry["status"];
    discoveredCount: number;
    existingCount: number;
    unmatchedSegmentCount: number;
    message: string;
  },
): DiscoveryRefreshHistoryEntry {
  return {
    newDeviceLabels: [],
    existingDeviceLabels: [],
    unmatchedSegments: [],
    segmentStatuses: [],
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  useAppStore.setState({
    devices: [],
    messages: [],
    contactUnreadCounts: {},
    transfers: [],
    selectedDeviceId: null,
    settings: {
      preferences: {
        identity: {
          nickname: "未命名设备",
          deviceNameMode: "NicknameOnly",
          statusMessage: "",
        },
        chat: {
          enterToSend: false,
          confirmBeforeBroadcast: true,
          autoSwitchToIncomingDirect: false,
          autoSwitchToIncomingDelivery: true,
        },
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
      },
      runtime: {
        deviceId: "local-device",
        messagePort: 37001,
        filePort: 37002,
      },
    },
    settingsReady: true,
  });
  mockedListDevices.mockReset();
  mockedListMessages.mockReset();
  mockedListTransfers.mockReset();
  mockedGetRuntimeSettings.mockReset();
  mockedGetDiscoveryRefreshHistory.mockReset();
  mockedPersistDiscoveryRefreshHistory.mockReset();
  mockedSyncRuntimeSettings.mockReset();
  mockedRefreshDiscovery.mockReset();
  mockedOpenSettingsWindow.mockReset();
  mockedPickDeliveryFiles.mockReset();
  mockedPickDeliveryDirectory.mockReset();
  mockedPickSaveDirectory.mockReset();
  mockedSendDeliveryRequest.mockReset();
  mockedSendDeliveryResponse.mockReset();
  mockedOpenDirectory.mockReset();
  mockedSendFileToDevice.mockReset();
  mockedSendDirectMessage.mockReset();
  mockedSendBroadcastMessage.mockReset();
  mockedListen.mockClear();
  mockedUnlisten.mockReset();
  mockedGetCurrentWindow.mockClear();
  mockedOnDragDropEvent.mockClear();
  mockedWindowUnlisten.mockReset();
  mockedClipboardWriteText.mockReset();
  eventListeners.clear();
  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: mockedClipboardWriteText,
    },
  });
  Object.defineProperty(window, "confirm", {
    configurable: true,
    value: mockedConfirm,
  });
  mockedConfirm.mockReset();
  mockedConfirm.mockReturnValue(true);
  mockedListDevices.mockResolvedValue([]);
  mockedListMessages.mockResolvedValue([]);
  mockedListTransfers.mockResolvedValue([]);
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "未命名设备",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      chat: {
        enterToSend: false,
        confirmBeforeBroadcast: true,
        autoSwitchToIncomingDirect: false,
        autoSwitchToIncomingDelivery: true,
      },
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
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([]);
  mockedPersistDiscoveryRefreshHistory.mockResolvedValue();
  mockedSyncRuntimeSettings.mockResolvedValue();
  mockedRefreshDiscovery.mockResolvedValue();
  mockedOpenSettingsWindow.mockResolvedValue();
  mockedPickDeliveryFiles.mockResolvedValue([]);
  mockedPickDeliveryDirectory.mockResolvedValue(null);
  mockedPickSaveDirectory.mockResolvedValue(null);
  mockedSendDeliveryRequest.mockResolvedValue({
    message_id: "request-default",
    from_device_id: "local-device",
    to_device_id: "device-a",
    content: "待投递内容：1 个文件",
    sent_at_ms: 1002,
    kind: "delivery",
    delivery: {
      request_id: "request-default",
      status: "PendingDecision",
      save_root: null,
      entries: [
        {
          entry_id: "entry-default",
          display_name: "demo.txt",
          relative_path: "demo.txt",
          file_size: 12,
          kind: "File",
        },
      ],
    },
  });
  mockedSendDeliveryResponse.mockResolvedValue({
    message_id: "request-default",
    from_device_id: "device-a",
    to_device_id: "local-device",
    content: "待投递内容：1 个文件",
    sent_at_ms: 1002,
    kind: "delivery",
    delivery: {
      request_id: "request-default",
      status: "Accepted",
      save_root: "D:/接收区",
      entries: [
        {
          entry_id: "entry-default",
          display_name: "demo.txt",
          relative_path: "demo.txt",
          file_size: 12,
          kind: "File",
        },
      ],
    },
  });
  mockedOpenDirectory.mockResolvedValue();
  mockedSendFileToDevice.mockResolvedValue();
  mockedSendDirectMessage.mockResolvedValue();
  mockedSendBroadcastMessage.mockResolvedValue();
  mockedClipboardWriteText.mockResolvedValue();
});

test("renders main view with contacts, session and incoming progress", () => {
  render(<App />);

  expect(screen.getByText("在线联系人")).toBeInTheDocument();
  expect(screen.getByText("消息会话")).toBeInTheDocument();
  expect(screen.getByText("接收进度")).toBeInTheDocument();
  expect(screen.queryByText("设置中心")).not.toBeInTheDocument();
});

test("shows helpful empty state when no contacts are online", () => {
  render(<App />);

  return waitFor(() => {
    expect(screen.getByText("暂未发现在线设备")).toBeInTheDocument();
    expect(screen.getByText("请确认对方与您处于同一局域网，并保持应用在线。")).toBeInTheDocument();
  });
});

test("opens settings window from the main view", async () => {
  const user = userEvent.setup();

  render(<App />);

  await user.click(screen.getByRole("button", { name: "设置" }));

  expect(mockedOpenSettingsWindow).toHaveBeenCalledTimes(1);
});

test("renders settings-only view when opened as settings window", () => {
  render(<App view="settings" />);

  expect(screen.getByText("设置中心")).toBeInTheDocument();
  expect(screen.queryByText("在线联系人")).not.toBeInTheDocument();
  expect(screen.queryByText("消息会话")).not.toBeInTheDocument();
});

test("loads persisted settings from desktop api", async () => {
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "D:/LAN/Downloads",
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
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });

  render(<App view="settings" />);

  await waitFor(() => {
    expect(screen.getByDisplayValue("飞秋助手")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: /文件传输/ }));

  await waitFor(() => {
    expect(screen.getByDisplayValue("D:/LAN/Downloads")).toBeInTheDocument();
  });
});

test("loads persisted discovery refresh history in settings view", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264000000,
      status: "Succeeded",
      discoveredCount: 2,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
    createRefreshHistoryEntry({
      id: "history-2",
      timestamp: 1713264100000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请检查本机网络权限或稍后重试。",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  await waitFor(() => {
    expect(screen.getByText("最近刷新历史")).toBeInTheDocument();
    expect(
      screen.getByText("已完成 · 新增 2 台 · 已在线 1 台 · 未命中 0 个网段"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("刷新失败 · 请检查本机网络权限或稍后重试。"),
    ).toBeInTheDocument();
  });
});

test("filters discovery refresh history to failed entries only", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264000000,
      status: "Succeeded",
      discoveredCount: 2,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
    createRefreshHistoryEntry({
      id: "history-2",
      timestamp: 1713264100000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请检查本机网络权限或稍后重试。",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "全部" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "仅失败" })).toBeInTheDocument();
    expect(
      screen.getByText("已完成 · 新增 2 台 · 已在线 1 台 · 未命中 0 个网段"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("刷新失败 · 请检查本机网络权限或稍后重试。"),
    ).toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: "仅失败" }));

  await waitFor(() => {
    expect(
      screen.queryByText("已完成 · 新增 2 台 · 已在线 1 台 · 未命中 0 个网段"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("刷新失败 · 请检查本机网络权限或稍后重试。"),
    ).toBeInTheDocument();
  });
});

test("shows direct actions when failed history filter is empty", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264000000,
      status: "Succeeded",
      discoveredCount: 2,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));
  await user.click(screen.getByRole("button", { name: "仅失败" }));

  const emptyPromptText =
    "当前没有失败刷新记录，你可以立即刷新或切回全部查看最近结果。";

  await waitFor(() => {
    expect(screen.getByText(emptyPromptText)).toBeInTheDocument();
  });

  const emptyPrompt = screen
    .getByText(emptyPromptText)
    .closest(".settings-inline-prompt");

  expect(emptyPrompt).not.toBeNull();

  const promptScope = within(emptyPrompt as HTMLElement);

  expect(promptScope.getByRole("button", { name: "立即刷新" })).toBeInTheDocument();
  expect(promptScope.getByRole("button", { name: "切回全部" })).toBeInTheDocument();

  await user.click(promptScope.getByRole("button", { name: "切回全部" }));

  await waitFor(() => {
    expect(
      screen.getByText("已完成 · 新增 2 台 · 已在线 1 台 · 未命中 0 个网段"),
    ).toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: "仅失败" }));

  await waitFor(() => {
    expect(screen.getByText(emptyPromptText)).toBeInTheDocument();
  });

  const refreshedPrompt = screen
    .getByText(emptyPromptText)
    .closest(".settings-inline-prompt");

  expect(refreshedPrompt).not.toBeNull();

  await user.click(
    within(refreshedPrompt as HTMLElement).getByRole("button", { name: "立即刷新" }),
  );

  expect(mockedRefreshDiscovery).toHaveBeenCalledTimes(1);
});

test("shows direct actions when all refresh history is empty", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  const emptyPromptText =
    "当前还没有刷新历史，你可以立即刷新或查看发现方式。";

  await waitFor(() => {
    expect(screen.getByText(emptyPromptText)).toBeInTheDocument();
  });

  const emptyPrompt = screen
    .getByText(emptyPromptText)
    .closest(".settings-inline-prompt");

  expect(emptyPrompt).not.toBeNull();

  const promptScope = within(emptyPrompt as HTMLElement);

  expect(promptScope.getByRole("button", { name: "立即刷新" })).toBeInTheDocument();
  expect(promptScope.getByRole("button", { name: "查看发现方式" })).toBeInTheDocument();

  await user.click(promptScope.getByRole("button", { name: "查看发现方式" }));

  expect(screen.getByLabelText("发现方式")).toHaveFocus();

  await user.click(promptScope.getByRole("button", { name: "立即刷新" }));

  expect(mockedRefreshDiscovery).toHaveBeenCalledTimes(1);
});

test("shows only the latest three history entries until expanded", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264300000,
      status: "Succeeded",
      discoveredCount: 3,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
    createRefreshHistoryEntry({
      id: "history-2",
      timestamp: 1713264200000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请检查本机网络权限或稍后重试。",
    }),
    createRefreshHistoryEntry({
      id: "history-3",
      timestamp: 1713264100000,
      status: "Succeeded",
      discoveredCount: 1,
      existingCount: 2,
      unmatchedSegmentCount: 1,
      message: "",
    }),
    createRefreshHistoryEntry({
      id: "history-4",
      timestamp: 1713264000000,
      status: "Succeeded",
      discoveredCount: 2,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "展开更多" })).toBeInTheDocument();
    expect(
      screen.getByText("已完成 · 新增 3 台 · 已在线 1 台 · 未命中 0 个网段"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("刷新失败 · 请检查本机网络权限或稍后重试。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("已完成 · 新增 1 台 · 已在线 2 台 · 未命中 1 个网段"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("已完成 · 新增 2 台 · 已在线 1 台 · 未命中 0 个网段"),
    ).not.toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: "展开更多" }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "收起" })).toBeInTheDocument();
    expect(
      screen.getByText("已完成 · 新增 2 台 · 已在线 1 台 · 未命中 0 个网段"),
    ).toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: "收起" }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "展开更多" })).toBeInTheDocument();
    expect(
      screen.queryByText("已完成 · 新增 2 台 · 已在线 1 台 · 未命中 0 个网段"),
    ).not.toBeInTheDocument();
  });
});

test("shows refresh history summary stats above the timeline", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264300000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请检查本机网络权限或稍后重试。",
    }),
    createRefreshHistoryEntry({
      id: "history-2",
      timestamp: 1713264200000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请检查本机网络权限或稍后重试。",
    }),
    createRefreshHistoryEntry({
      id: "history-3",
      timestamp: 1713264100000,
      status: "Succeeded",
      discoveredCount: 1,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
    createRefreshHistoryEntry({
      id: "history-4",
      timestamp: 1713264000000,
      status: "Succeeded",
      discoveredCount: 2,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
    createRefreshHistoryEntry({
      id: "history-5",
      timestamp: 1713263900000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请检查本机网络权限或稍后重试。",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  await waitFor(() => {
    expect(screen.getByText("最近 5 次成功率")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("连续失败次数")).toBeInTheDocument();
    expect(screen.getByText("2 次")).toBeInTheDocument();
    expect(screen.getByText("最近失败时间")).toBeInTheDocument();
    expect(screen.getAllByText("2024-04-16 18:45:00").length).toBeGreaterThan(0);
  });
});

test("shows direct actions when refresh history has consecutive failures", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264300000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请检查本机网络权限或稍后重试。",
    }),
    createRefreshHistoryEntry({
      id: "history-2",
      timestamp: 1713264200000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请检查本机网络权限或稍后重试。",
    }),
    createRefreshHistoryEntry({
      id: "history-3",
      timestamp: 1713264100000,
      status: "Succeeded",
      discoveredCount: 1,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  let prompt: HTMLElement;
  await waitFor(() => {
    expect(
      screen.getByText(
        "最近已连续 2 次刷新失败，你可以立即重试或查看最近失败详情。",
      ),
    ).toBeInTheDocument();
  });

  prompt = screen
    .getByText("最近已连续 2 次刷新失败，你可以立即重试或查看最近失败详情。")
    .closest(".settings-inline-prompt") as HTMLElement;
  expect(within(prompt).getByRole("button", { name: "立即重试" })).toBeInTheDocument();
  expect(within(prompt).getByRole("button", { name: "查看最近失败" })).toBeInTheDocument();

  await user.click(within(prompt).getByRole("button", { name: "查看最近失败" }));

  await waitFor(() => {
    expect(screen.getByText("失败原因")).toBeInTheDocument();
    expect(screen.getByText("请检查本机网络权限或稍后重试。")).toBeInTheDocument();
  });

  await user.click(within(prompt).getByRole("button", { name: "立即重试" }));

  await waitFor(() => {
    expect(mockedRefreshDiscovery).toHaveBeenCalledTimes(1);
  });
});

test("shows refresh history summary legend for status colors", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264300000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请检查本机网络权限或稍后重试。",
    }),
    createRefreshHistoryEntry({
      id: "history-2",
      timestamp: 1713264200000,
      status: "Succeeded",
      discoveredCount: 1,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  await waitFor(() => {
    expect(screen.getByText("状态说明")).toBeInTheDocument();
    expect(screen.getByText("绿色表示稳定")).toBeInTheDocument();
    expect(screen.getByText("黄色表示关注")).toBeInTheDocument();
    expect(screen.getByText("红色表示异常")).toBeInTheDocument();
  });
});

test("shows refresh history summary rules for each metric", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264300000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请检查本机网络权限或稍后重试。",
    }),
    createRefreshHistoryEntry({
      id: "history-2",
      timestamp: 1713264200000,
      status: "Succeeded",
      discoveredCount: 1,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  await waitFor(() => {
    expect(screen.getByText("成功率：80% 及以上稳定，50% 到 79% 需要关注，低于 50% 视为异常。")).toBeInTheDocument();
    expect(screen.getByText("连续失败：0 次稳定，1 次需要关注，2 次及以上视为异常。")).toBeInTheDocument();
    expect(screen.getByText("最近失败时间：暂无失败或超过 24 小时视为稳定，30 分钟到 24 小时需要关注，30 分钟内视为异常。")).toBeInTheDocument();
  });
});

test("clicking consecutive failure summary card focuses failed history and opens the latest detail", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264300000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "最新一次刷新失败，请检查本机网络权限。",
    }),
    createRefreshHistoryEntry({
      id: "history-2",
      timestamp: 1713264200000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "第二次刷新失败。",
    }),
    createRefreshHistoryEntry({
      id: "history-3",
      timestamp: 1713264100000,
      status: "Succeeded",
      discoveredCount: 1,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
    createRefreshHistoryEntry({
      id: "history-4",
      timestamp: 1713264000000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "第四次刷新失败。",
    }),
    createRefreshHistoryEntry({
      id: "history-5",
      timestamp: 1713263900000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "第五次刷新失败。",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  await waitFor(() => {
    expect(
      screen.getByText("刷新失败 · 最新一次刷新失败，请检查本机网络权限。"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("刷新失败 · 第五次刷新失败。"),
    ).not.toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: "连续失败次数" }));

  await waitFor(() => {
    expect(
      screen.queryByText("已完成 · 新增 1 台 · 已在线 1 台 · 未命中 0 个网段"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("刷新失败 · 第五次刷新失败。"),
    ).toBeInTheDocument();
    expect(screen.getByText("失败原因")).toBeInTheDocument();
    expect(
      screen.getByText("最新一次刷新失败，请检查本机网络权限。"),
    ).toBeInTheDocument();
  });
});

test("copies failed refresh reason and diagnosis summary from the latest failure detail", async () => {
  const user = userEvent.setup();
  const clipboardWriteText = vi.spyOn(window.navigator.clipboard, "writeText");
  clipboardWriteText.mockResolvedValue();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264300000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "最新一次刷新失败，请检查本机网络权限。",
    }),
    createRefreshHistoryEntry({
      id: "history-2",
      timestamp: 1713264200000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "第二次刷新失败。",
    }),
    createRefreshHistoryEntry({
      id: "history-3",
      timestamp: 1713264100000,
      status: "Succeeded",
      discoveredCount: 1,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));
  await user.click(screen.getByRole("button", { name: "连续失败次数" }));

  await waitFor(() => {
    expect(screen.getByText("失败原因")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制失败原因" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制诊断摘要" })).toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: "复制失败原因" }));

  await waitFor(() => {
    expect(clipboardWriteText).toHaveBeenNthCalledWith(
      1,
      "最新一次刷新失败，请检查本机网络权限。",
    );
    expect(screen.getByText("失败原因已复制")).toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: "复制诊断摘要" }));

  await waitFor(() => {
    expect(clipboardWriteText).toHaveBeenNthCalledWith(
      2,
      "最近失败时间：2024-04-16 18:45:00\n当前发现方式：手动网段广播 + 主机主动探测\n当前手动网段：192.168.10.0/24\n失败概览：最近连续失败 2 次；当前手动网段 1 个，未命中 0 个\n建议动作：请先在本机确认网络权限和防火墙放行，再重新刷新一次。\n建议联系对象：优先本机处理\n建议重试时机：完成本机权限和防火墙检查后立即重试。\n失败原因：最新一次刷新失败，请检查本机网络权限。\n连续失败次数：2 次\n建议排查：\n- 确认应用已获得本机网络访问权限，必要时重新以管理员身份启动。\n- 检查系统防火墙或安全软件是否拦截了局域网广播、UDP 端口或文件端口。",
    );
    expect(screen.getByText("诊断摘要已复制")).toBeInTheDocument();
  });
});

test("shows targeted troubleshooting suggestions for permission related refresh failures", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264300000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "最新一次刷新失败，请检查本机网络权限。",
    }),
    createRefreshHistoryEntry({
      id: "history-2",
      timestamp: 1713264200000,
      status: "Succeeded",
      discoveredCount: 1,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));
  await user.click(screen.getByRole("button", { name: "连续失败次数" }));

  await waitFor(() => {
    expect(screen.getByText("建议排查")).toBeInTheDocument();
    expect(
      screen.getByText("确认应用已获得本机网络访问权限，必要时重新以管理员身份启动。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("检查系统防火墙或安全软件是否拦截了局域网广播、UDP 端口或文件端口。"),
    ).toBeInTheDocument();
  });
});

test("shows targeted troubleshooting suggestions for unmatched segment refresh failures", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24", "192.168.20.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264300000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 2,
      unmatchedSegments: ["192.168.10.0/24", "192.168.20.0/24"],
      message: "当前所有手动网段都未命中在线设备，请检查网段配置或确认对端在线。",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));
  await user.click(screen.getByRole("button", { name: "连续失败次数" }));

  await waitFor(() => {
    expect(screen.getByText("建议排查")).toBeInTheDocument();
    expect(
      screen.getByText("检查手动网段配置是否写对，尤其确认 CIDR、子网掩码和目标网段范围。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("如果对端在其他网段，确认它的实际 IP 仍落在当前配置的辅助发现网段内。"),
    ).toBeInTheDocument();
  });
});

test("copies unmatched segments into refresh diagnosis summary", async () => {
  const user = userEvent.setup();
  const clipboardWriteText = vi.spyOn(window.navigator.clipboard, "writeText");
  clipboardWriteText.mockResolvedValue();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24", "192.168.20.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264300000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 2,
      unmatchedSegments: ["192.168.10.0/24", "192.168.20.0/24"],
      message: "当前所有手动网段都未命中在线设备，请检查网段配置或确认对端在线。",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));
  await user.click(screen.getByRole("button", { name: "连续失败次数" }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "复制诊断摘要" })).toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: "复制诊断摘要" }));

  await waitFor(() => {
    expect(clipboardWriteText).toHaveBeenCalledWith(
      "最近失败时间：2024-04-16 18:45:00\n当前发现方式：手动网段广播 + 主机主动探测\n当前手动网段：192.168.10.0/24、192.168.20.0/24\n失败概览：最近连续失败 1 次；当前手动网段 2 个，未命中 2 个\n建议动作：请先核对手动网段 CIDR 配置，并让对端确认实际 IP 仍在这些网段内后再刷新。\n建议联系对象：本机与对端都需要确认\n建议重试时机：确认网段配置修正且对端 IP 信息核对完成后再重试。\n失败原因：当前所有手动网段都未命中在线设备，请检查网段配置或确认对端在线。\n当前未命中网段：192.168.10.0/24、192.168.20.0/24\n连续失败次数：1 次\n建议排查：\n- 检查手动网段配置是否写对，尤其确认 CIDR、子网掩码和目标网段范围。\n- 如果对端在其他网段，确认它的实际 IP 仍落在当前配置的辅助发现网段内。",
    );
  });
});

test("shows targeted troubleshooting suggestions for timeout refresh failures", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264300000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请求超时，请确认对端在线或稍后重试。",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));
  await user.click(screen.getByRole("button", { name: "连续失败次数" }));

  await waitFor(() => {
    expect(screen.getByText("建议排查")).toBeInTheDocument();
    expect(
      screen.getByText("确认对端设备与您处于同一局域网，并保持应用在线且未进入休眠。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("可让对端手动刷新一次在线状态，或先尝试通过当前网段重新发现。"),
    ).toBeInTheDocument();
  });
});

test("copies presence related refresh diagnosis summary", async () => {
  const user = userEvent.setup();
  const clipboardWriteText = vi.spyOn(window.navigator.clipboard, "writeText");
  clipboardWriteText.mockResolvedValue();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264300000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请求超时，请确认对端在线或稍后重试。",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));
  await user.click(screen.getByRole("button", { name: "连续失败次数" }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "复制诊断摘要" })).toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: "复制诊断摘要" }));

  await waitFor(() => {
    expect(clipboardWriteText).toHaveBeenCalledWith(
      "最近失败时间：2024-04-16 18:45:00\n当前发现方式：手动网段广播 + 主机主动探测\n当前手动网段：192.168.10.0/24\n失败概览：最近连续失败 1 次；当前手动网段 1 个，未命中 0 个\n建议动作：请先让对端保持在线并手动刷新一次在线状态，再重新发现。\n建议联系对象：优先联系对端配合\n建议重试时机：等待对端恢复在线并手动刷新状态后再重试。\n失败原因：请求超时，请确认对端在线或稍后重试。\n连续失败次数：1 次\n建议排查：\n- 确认对端设备与您处于同一局域网，并保持应用在线且未进入休眠。\n- 可让对端手动刷新一次在线状态，或先尝试通过当前网段重新发现。",
    );
  });
});

test("copies generic refresh diagnosis summary", async () => {
  const user = userEvent.setup();
  const clipboardWriteText = vi.spyOn(window.navigator.clipboard, "writeText");
  clipboardWriteText.mockResolvedValue();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264300000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "刷新结果异常，请稍后查看系统日志后再试。",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));
  await user.click(screen.getByRole("button", { name: "连续失败次数" }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "复制诊断摘要" })).toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: "复制诊断摘要" }));

  await waitFor(() => {
    expect(clipboardWriteText).toHaveBeenCalledWith(
      "最近失败时间：2024-04-16 18:45:00\n当前发现方式：手动网段广播 + 主机主动探测\n当前手动网段：192.168.10.0/24\n失败概览：最近连续失败 1 次；当前手动网段 1 个，未命中 0 个\n建议动作：请先检查本机权限、网段配置和对端在线状态，再重新执行一次发现刷新。\n建议联系对象：本机与对端都建议确认\n建议重试时机：完成本机网络、网段与在线状态的基础检查后再重试。\n失败原因：刷新结果异常，请稍后查看系统日志后再试。\n连续失败次数：1 次\n建议排查：\n- 先检查本机网络权限、手动网段配置与对端在线状态，再重新执行一次发现刷新。\n- 如果问题持续出现，可复制诊断摘要并结合最近失败时间继续排查。",
    );
  });
});

test("uses danger styling when refresh history success rate is low", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264300000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请检查本机网络权限或稍后重试。",
    }),
    createRefreshHistoryEntry({
      id: "history-2",
      timestamp: 1713264200000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请检查本机网络权限或稍后重试。",
    }),
    createRefreshHistoryEntry({
      id: "history-3",
      timestamp: 1713264100000,
      status: "Succeeded",
      discoveredCount: 1,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  await waitFor(() => {
    const successRateCard = screen.getByText("最近 5 次成功率").closest("div");
    expect(successRateCard?.className).toContain("is-danger");
  });
});

test("uses danger styling when refresh history has consecutive failures", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264300000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请检查本机网络权限或稍后重试。",
    }),
    createRefreshHistoryEntry({
      id: "history-2",
      timestamp: 1713264200000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请检查本机网络权限或稍后重试。",
    }),
    createRefreshHistoryEntry({
      id: "history-3",
      timestamp: 1713264100000,
      status: "Succeeded",
      discoveredCount: 1,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  await waitFor(() => {
    const failureCard = screen.getByText("连续失败次数").closest("div");
    expect(failureCard?.className).toContain("is-danger");
  });
});

test("uses warning styling when refresh history has one consecutive failure", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264300000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请检查本机网络权限或稍后重试。",
    }),
    createRefreshHistoryEntry({
      id: "history-2",
      timestamp: 1713264200000,
      status: "Succeeded",
      discoveredCount: 1,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
    createRefreshHistoryEntry({
      id: "history-3",
      timestamp: 1713264100000,
      status: "Succeeded",
      discoveredCount: 2,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  await waitFor(() => {
    const failureCard = screen.getByText("连续失败次数").closest("div");
    expect(failureCard?.className).toContain("is-warning");
  });
});

test("uses success styling when refresh history has no consecutive failure", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264300000,
      status: "Succeeded",
      discoveredCount: 2,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
    createRefreshHistoryEntry({
      id: "history-2",
      timestamp: 1713264200000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请检查本机网络权限或稍后重试。",
    }),
    createRefreshHistoryEntry({
      id: "history-3",
      timestamp: 1713264100000,
      status: "Succeeded",
      discoveredCount: 1,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  await waitFor(() => {
    const failureCard = screen.getByText("连续失败次数").closest("div");
    expect(failureCard?.className).toContain("is-success");
  });
});

test("uses danger styling when latest failure happened recently", async () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date("2024-04-16T18:50:00"));

    mockedGetRuntimeSettings.mockResolvedValue({
      preferences: {
        identity: {
          nickname: "飞秋助手",
          deviceNameMode: "NicknameOnly",
          statusMessage: "",
        },
        transfer: {
          downloadDir: "~/Downloads",
          receiveBeforeAccept: true,
          openFolderAfterReceive: true,
          preserveDirectoryStructure: true,
        },
        network: {
          discoveryMode: "ManualSegments",
          manualSegments: ["192.168.10.0/24"],
        },
        display: {
          trayEnabled: true,
          closeAction: "MinimizeToTray",
        },
      },
      runtime: {
        deviceId: "persisted-device",
        messagePort: 37001,
        filePort: 37002,
      },
    });
    mockedGetDiscoveryRefreshHistory.mockResolvedValue([
      createRefreshHistoryEntry({
        id: "history-1",
        timestamp: 1713264300000,
        status: "Failed",
        discoveredCount: 0,
        existingCount: 0,
        unmatchedSegmentCount: 0,
        message: "请检查本机网络权限或稍后重试。",
      }),
      createRefreshHistoryEntry({
        id: "history-2",
        timestamp: 1713264200000,
        status: "Succeeded",
        discoveredCount: 1,
        existingCount: 1,
        unmatchedSegmentCount: 0,
        message: "",
      }),
    ]);

    await act(async () => {
      render(<App view="settings" />);
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: /网络与发现/ }));

    const latestFailureCard = screen.getByText("最近失败时间").closest("div");
    expect(latestFailureCard?.className).toContain("is-danger");
  } finally {
    vi.useRealTimers();
  }
});

test("uses warning styling when latest failure is not recent anymore", async () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date("2024-04-16T20:45:00"));

    mockedGetRuntimeSettings.mockResolvedValue({
      preferences: {
        identity: {
          nickname: "飞秋助手",
          deviceNameMode: "NicknameOnly",
          statusMessage: "",
        },
        transfer: {
          downloadDir: "~/Downloads",
          receiveBeforeAccept: true,
          openFolderAfterReceive: true,
          preserveDirectoryStructure: true,
        },
        network: {
          discoveryMode: "ManualSegments",
          manualSegments: ["192.168.10.0/24"],
        },
        display: {
          trayEnabled: true,
          closeAction: "MinimizeToTray",
        },
      },
      runtime: {
        deviceId: "persisted-device",
        messagePort: 37001,
        filePort: 37002,
      },
    });
    mockedGetDiscoveryRefreshHistory.mockResolvedValue([
      createRefreshHistoryEntry({
        id: "history-1",
        timestamp: 1713264300000,
        status: "Failed",
        discoveredCount: 0,
        existingCount: 0,
        unmatchedSegmentCount: 0,
        message: "请检查本机网络权限或稍后重试。",
      }),
      createRefreshHistoryEntry({
        id: "history-2",
        timestamp: 1713264200000,
        status: "Succeeded",
        discoveredCount: 1,
        existingCount: 1,
        unmatchedSegmentCount: 0,
        message: "",
      }),
    ]);

    await act(async () => {
      render(<App view="settings" />);
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: /网络与发现/ }));

    const latestFailureCard = screen.getByText("最近失败时间").closest("div");
    expect(latestFailureCard?.className).toContain("is-warning");
  } finally {
    vi.useRealTimers();
  }
});

test("uses success styling when refresh history has no failure", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264300000,
      status: "Succeeded",
      discoveredCount: 2,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
    createRefreshHistoryEntry({
      id: "history-2",
      timestamp: 1713264200000,
      status: "Succeeded",
      discoveredCount: 1,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  await waitFor(() => {
    expect(screen.getByText("暂无失败")).toBeInTheDocument();
    const latestFailureCard = screen.getByText("最近失败时间").closest("div");
    expect(latestFailureCard?.className).toContain("is-success");
  });
});

test("retries refresh directly from failed history entries", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264200000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请检查本机网络权限或稍后重试。",
    }),
    createRefreshHistoryEntry({
      id: "history-2",
      timestamp: 1713264100000,
      status: "Succeeded",
      discoveredCount: 1,
      existingCount: 2,
      unmatchedSegmentCount: 1,
      message: "",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "立即重试" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "立即重试" })).toHaveLength(1);
  });

  await user.click(screen.getByRole("button", { name: "立即重试" }));

  expect(mockedRefreshDiscovery).toHaveBeenCalledTimes(1);
});

test("expands refresh history details for succeeded entries", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24", "10.0.0.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264000000,
      status: "Succeeded",
      discoveredCount: 2,
      existingCount: 1,
      unmatchedSegmentCount: 1,
      message: "",
      newDeviceLabels: ["Bob · 192.168.10.20"],
      existingDeviceLabels: ["Alice · 192.168.1.10"],
      unmatchedSegments: ["10.0.0.0/24"],
      segmentStatuses: [
        {
          segment: "192.168.10.0/24",
          status: "NewlyMatched",
          newDeviceCount: 1,
          existingDeviceCount: 0,
        },
      ],
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));
  await user.click(screen.getByRole("button", { name: "查看详情" }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "收起详情" })).toBeInTheDocument();
    expect(screen.getByText("Bob · 192.168.10.20")).toBeInTheDocument();
    expect(screen.getByText("Alice · 192.168.1.10")).toBeInTheDocument();
    expect(screen.getAllByText("10.0.0.0/24").length).toBeGreaterThan(0);
    expect(screen.getByText(/本次新增命中/)).toBeInTheDocument();
  });
});

test("shows direct actions when refresh history detail has no new devices", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264000000,
      status: "Succeeded",
      discoveredCount: 0,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
      existingDeviceLabels: ["Alice · 192.168.10.10"],
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));
  await user.click(screen.getByRole("button", { name: "查看详情" }));

  const historyDetailGrid = await screen.findByText("刷新前已在线设备");
  const detailGrid = historyDetailGrid.closest(".settings-history-detail-grid");

  expect(detailGrid).not.toBeNull();

  const detailScope = within(detailGrid as HTMLElement);
  const newDiscoveryCard = detailScope
    .getByText("新增发现设备")
    .closest(".settings-history-detail-card");
  const existingDevicesCard = detailScope
    .getByText("刷新前已在线设备")
    .closest(".settings-history-detail-card");

  expect(newDiscoveryCard).not.toBeNull();
  expect(existingDevicesCard).not.toBeNull();

  const newDiscoveryScope = within(newDiscoveryCard as HTMLElement);

  expect(
    newDiscoveryScope.getByText(
      "这条历史记录没有新增设备，但已有在线设备仍可通信，你可以立即刷新或查看刷新前已在线设备。",
    ),
  ).toBeInTheDocument();
  expect(newDiscoveryScope.getByRole("button", { name: "立即刷新" })).toBeInTheDocument();
  expect(
    newDiscoveryScope.getByRole("button", { name: "查看刷新前已在线设备" }),
  ).toBeInTheDocument();

  await user.click(
    newDiscoveryScope.getByRole("button", { name: "查看刷新前已在线设备" }),
  );

  expect(existingDevicesCard as HTMLElement).toHaveFocus();

  await user.click(newDiscoveryScope.getByRole("button", { name: "立即刷新" }));

  expect(mockedRefreshDiscovery).toHaveBeenCalledTimes(1);
});

test("shows direct actions when refresh history detail has no existing devices", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264000000,
      status: "Succeeded",
      discoveredCount: 1,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "",
      newDeviceLabels: ["Bob · 192.168.10.20"],
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));
  await user.click(screen.getByRole("button", { name: "查看详情" }));

  const historyDetailGrid = await screen.findByText("刷新前已在线设备");
  const detailGrid = historyDetailGrid.closest(".settings-history-detail-grid");

  expect(detailGrid).not.toBeNull();

  const detailScope = within(detailGrid as HTMLElement);
  const newDiscoveryCard = detailScope
    .getByText("新增发现设备")
    .closest(".settings-history-detail-card");
  const existingDevicesCard = detailScope
    .getByText("刷新前已在线设备")
    .closest(".settings-history-detail-card");

  expect(newDiscoveryCard).not.toBeNull();
  expect(existingDevicesCard).not.toBeNull();

  const existingDevicesScope = within(existingDevicesCard as HTMLElement);

  expect(
    existingDevicesScope.getByText(
      "这条历史记录刷新前没有已在线设备，你可以立即刷新或查看新增发现设备。",
    ),
  ).toBeInTheDocument();
  expect(
    existingDevicesScope.getByRole("button", { name: "立即刷新" }),
  ).toBeInTheDocument();
  expect(
    existingDevicesScope.getByRole("button", { name: "查看新增发现设备" }),
  ).toBeInTheDocument();

  await user.click(existingDevicesScope.getByRole("button", { name: "查看新增发现设备" }));

  expect(newDiscoveryCard as HTMLElement).toHaveFocus();

  await user.click(existingDevicesScope.getByRole("button", { name: "立即刷新" }));

  expect(mockedRefreshDiscovery).toHaveBeenCalledTimes(1);
});

test("shows direct actions when refresh history detail has no unmatched segments", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264000000,
      status: "Succeeded",
      discoveredCount: 0,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
      existingDeviceLabels: ["Alice · 192.168.10.10"],
      segmentStatuses: [
        {
          segment: "192.168.10.0/24",
          status: "AlreadyOnline",
          newDeviceCount: 0,
          existingDeviceCount: 1,
        },
      ],
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));
  await user.click(screen.getByRole("button", { name: "查看详情" }));

  const historyDetailGrid = await screen.findByText("当前配置网段仍未命中");
  const detailGrid = historyDetailGrid.closest(".settings-history-detail-grid");

  expect(detailGrid).not.toBeNull();

  const detailScope = within(detailGrid as HTMLElement);
  const unmatchedCard = detailScope
    .getByText("当前配置网段仍未命中")
    .closest(".settings-history-detail-card");
  const segmentStatusCard = detailScope
    .getByText("网段状态")
    .closest(".settings-history-detail-card");

  expect(unmatchedCard).not.toBeNull();
  expect(segmentStatusCard).not.toBeNull();

  const unmatchedScope = within(unmatchedCard as HTMLElement);

  expect(
    unmatchedScope.getByText(
      "这条历史记录中的有效手动网段都已命中至少一台在线设备，你可以立即刷新或查看网段状态。",
    ),
  ).toBeInTheDocument();
  expect(unmatchedScope.getByRole("button", { name: "立即刷新" })).toBeInTheDocument();
  expect(
    unmatchedScope.getByRole("button", { name: "查看网段状态" }),
  ).toBeInTheDocument();

  await user.click(unmatchedScope.getByRole("button", { name: "查看网段状态" }));

  expect(segmentStatusCard as HTMLElement).toHaveFocus();

  await user.click(unmatchedScope.getByRole("button", { name: "立即刷新" }));

  expect(mockedRefreshDiscovery).toHaveBeenCalledTimes(1);
});

test("shows direct actions when refresh history detail has no segment statuses", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264000000,
      status: "Succeeded",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 1,
      message: "",
      unmatchedSegments: ["192.168.10.0/24"],
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));
  await user.click(screen.getByRole("button", { name: "查看详情" }));

  const historyDetailGrid = await screen.findByText("网段状态");
  const detailGrid = historyDetailGrid.closest(".settings-history-detail-grid");

  expect(detailGrid).not.toBeNull();

  const detailScope = within(detailGrid as HTMLElement);
  const unmatchedCard = detailScope
    .getByText("当前配置网段仍未命中")
    .closest(".settings-history-detail-card");
  const segmentStatusCard = detailScope
    .getByText("网段状态")
    .closest(".settings-history-detail-card");

  expect(unmatchedCard).not.toBeNull();
  expect(segmentStatusCard).not.toBeNull();

  const segmentStatusScope = within(segmentStatusCard as HTMLElement);

  expect(
    segmentStatusScope.getByText(
      "这条历史记录还没有可回看的网段状态，你可以立即刷新或查看未命中网段。",
    ),
  ).toBeInTheDocument();
  expect(
    segmentStatusScope.getByRole("button", { name: "立即刷新" }),
  ).toBeInTheDocument();
  expect(
    segmentStatusScope.getByRole("button", { name: "查看未命中网段" }),
  ).toBeInTheDocument();

  await user.click(segmentStatusScope.getByRole("button", { name: "查看未命中网段" }));

  expect(unmatchedCard as HTMLElement).toHaveFocus();

  await user.click(segmentStatusScope.getByRole("button", { name: "立即刷新" }));

  expect(mockedRefreshDiscovery).toHaveBeenCalledTimes(1);
});

test("shows failure reason in refresh history details and keeps one item expanded", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264200000,
      status: "Failed",
      discoveredCount: 0,
      existingCount: 0,
      unmatchedSegmentCount: 0,
      message: "请检查本机网络权限或稍后重试。",
    }),
    createRefreshHistoryEntry({
      id: "history-2",
      timestamp: 1713264100000,
      status: "Succeeded",
      discoveredCount: 1,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
      newDeviceLabels: ["Bob · 192.168.10.20"],
      existingDeviceLabels: ["Alice · 192.168.1.10"],
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  const detailButtons = await screen.findAllByRole("button", { name: "查看详情" });
  await user.click(detailButtons[0]);

  await waitFor(() => {
    expect(screen.getByText("失败原因")).toBeInTheDocument();
    expect(
      screen.getByText("请检查本机网络权限或稍后重试。"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "收起详情" })).toHaveLength(1);
  });

  await user.click(screen.getByRole("button", { name: "收起详情" }));

  await waitFor(() => {
    expect(screen.queryByText("失败原因")).not.toBeInTheDocument();
  });
});

test("clears persisted discovery refresh history from settings view", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "persisted-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedGetDiscoveryRefreshHistory.mockResolvedValue([
    createRefreshHistoryEntry({
      id: "history-1",
      timestamp: 1713264000000,
      status: "Succeeded",
      discoveredCount: 2,
      existingCount: 1,
      unmatchedSegmentCount: 0,
      message: "",
    }),
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  await waitFor(() => {
    expect(screen.getByText("最近刷新历史")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "清空历史" })).toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: "清空历史" }));

  await waitFor(() => {
    expect(screen.getByText("最近刷新历史")).toBeInTheDocument();
    expect(
      screen.getByText("当前还没有刷新历史，你可以立即刷新或查看发现方式。"),
    ).toBeInTheDocument();
  });

  expect(mockedPersistDiscoveryRefreshHistory).toHaveBeenCalledWith([]);
});

test("loads devices and transfers from desktop api", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
  ]);
  mockedListTransfers.mockResolvedValue([
    {
      transfer_id: "tx-1",
      file_name: "demo.txt",
      file_size: 12,
      transferred_bytes: 6,
      from_device_id: "device-a",
      to_device_id: "local-device",
      status: "InProgress",
    },
  ]);

  render(<App />);

  await waitFor(() => {
    const transferItem = screen.getByText("demo.txt").closest("li");

    expect(screen.getByText("接收进度")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("demo.txt")).toBeInTheDocument();
    expect(screen.getByText("来自 Alice")).toBeInTheDocument();
    expect(screen.getByText("50% · 6 B / 12 B")).toBeInTheDocument();
    expect(transferItem).not.toBeNull();
    expect(within(transferItem as HTMLElement).getByText("传输中")).toBeInTheDocument();
  });
});

test("loads existing session messages from desktop api", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
  ]);
  mockedListMessages.mockResolvedValue([
    {
      message_id: "msg-history-1",
      from_device_id: "device-a",
      to_device_id: "local-device",
      content: "历史消息",
      sent_at_ms: 1001,
      kind: "direct",
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("历史消息")).toBeInTheDocument();
  });
});

test("shows actionable empty state for the active session", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
    expect(screen.getByText("已连接 Alice，可发送单聊消息或文件。")).toBeInTheDocument();
  });
});

test("shows grouped folders and standalone files in the pending delivery preview", async () => {
  const user = userEvent.setup();

  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
  ]);
  mockedPickDeliveryFiles.mockResolvedValue([
    "C:/work/报价单.xlsx",
    "C:/work/封面.png",
  ]);
  mockedPickDeliveryDirectory.mockResolvedValue("C:/work/项目资料");

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: "选择文件" }));
  await waitFor(() => {
    expect(screen.getByText("报价单.xlsx")).toBeInTheDocument();
    expect(screen.getByText("封面.png")).toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: "选择文件夹" }));

  await waitFor(() => {
    expect(screen.getByText("项目资料/")).toBeInTheDocument();
    expect(screen.getByText("报价单.xlsx")).toBeInTheDocument();
    expect(screen.getByText("封面.png")).toBeInTheDocument();
  });
});

test("shows accept and cancel actions on incoming delivery cards", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "msg-delivery-1",
        from_device_id: "device-a",
        to_device_id: "local-device",
        content: "delivery request",
        sent_at_ms: 1002,
        kind: "delivery",
        delivery: {
          request_id: "req-1",
          status: "PendingDecision",
          save_root: null,
          entries: [
            {
              entry_id: "entry-file",
              display_name: "报价单.xlsx",
              relative_path: "报价单.xlsx",
              file_size: 1024,
              kind: "File",
            },
          ],
        },
      },
    });
  });

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "接收" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument();
  });
});

test("sends accepted delivery response with the selected save directory", async () => {
  const user = userEvent.setup();

  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
  ]);
  mockedPickSaveDirectory.mockResolvedValue("D:/接收区");

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "req-1",
        from_device_id: "device-a",
        to_device_id: "local-device",
        content: "delivery request",
        sent_at_ms: 1002,
        kind: "delivery",
        delivery: {
          request_id: "req-1",
          status: "PendingDecision",
          save_root: null,
          entries: [
            {
              entry_id: "entry-file",
              display_name: "报价单.xlsx",
              relative_path: "报价单.xlsx",
              file_size: 1024,
              kind: "File",
            },
          ],
        },
      },
    });
  });

  await user.click(screen.getByRole("button", { name: "接收" }));

  await waitFor(() => {
    expect(mockedSendDeliveryResponse).toHaveBeenCalledWith({
      addr: "192.168.1.10:37001",
      requestId: "req-1",
      toDeviceId: "device-a",
      decision: "Accepted",
      saveRoot: "D:/接收区",
    });
  });
});

test("sends rejected delivery response when the receiver cancels", async () => {
  const user = userEvent.setup();

  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "req-2",
        from_device_id: "device-a",
        to_device_id: "local-device",
        content: "delivery request",
        sent_at_ms: 1002,
        kind: "delivery",
        delivery: {
          request_id: "req-2",
          status: "PendingDecision",
          save_root: null,
          entries: [
            {
              entry_id: "entry-file",
              display_name: "封面.png",
              relative_path: "封面.png",
              file_size: 2048,
              kind: "File",
            },
          ],
        },
      },
    });
  });

  await user.click(screen.getByRole("button", { name: "取消" }));

  await waitFor(() => {
    expect(mockedSendDeliveryResponse).toHaveBeenCalledWith({
      addr: "192.168.1.10:37001",
      requestId: "req-2",
      toDeviceId: "device-a",
      decision: "Rejected",
      saveRoot: null,
    });
  });
});

test("opens the saved directory from a completed incoming delivery card", async () => {
  const user = userEvent.setup();

  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "req-3",
        from_device_id: "device-a",
        to_device_id: "local-device",
        content: "delivery request",
        sent_at_ms: 1002,
        kind: "delivery",
        delivery: {
          request_id: "req-3",
          status: "Completed",
          save_root: "D:/接收区",
          entries: [
            {
              entry_id: "entry-file",
              display_name: "项目资料",
              relative_path: "项目资料/说明.txt",
              file_size: 512,
              kind: "File",
            },
          ],
        },
      },
    });
  });

  await user.click(screen.getByRole("button", { name: "打开目录" }));

  await waitFor(() => {
    expect(mockedOpenDirectory).toHaveBeenCalledWith("D:/接收区");
  });
});

test("shows incoming message only in the sender session", async () => {
  const user = userEvent.setup();

  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);
  mockedListMessages.mockResolvedValue([
    {
      message_id: "msg-incoming-1",
      from_device_id: "device-a",
      to_device_id: "local-device",
      content: "Alice ping",
      sent_at_ms: 1002,
      kind: "direct",
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("Alice ping")).toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: /Bob/ }));

  await waitFor(() => {
    expect(screen.queryByText("Alice ping")).not.toBeInTheDocument();
  });
});

test("shows localized message tags for direct and broadcast messages", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
  ]);
  mockedListMessages.mockResolvedValue([
    {
      message_id: "msg-direct-1",
      from_device_id: "device-a",
      to_device_id: "local-device",
      content: "hi there",
      sent_at_ms: 1002,
      kind: "direct",
    },
    {
      message_id: "msg-broadcast-1",
      from_device_id: "local-device",
      to_device_id: "*",
      content: "team update",
      sent_at_ms: 1003,
      kind: "broadcast",
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("Alice · 单聊")).toBeInTheDocument();
    expect(screen.getByText("我 · 广播")).toBeInTheDocument();
    expect(screen.getByText("hi there")).toBeInTheDocument();
    expect(screen.getByText("team update")).toBeInTheDocument();
  });
});

test("appends realtime incoming message from tauri event", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  expect(mockedListen).toHaveBeenCalled();
  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  messageListener?.({
    payload: {
      message_id: "msg-realtime-1",
      from_device_id: "device-a",
      to_device_id: "local-device",
      content: "实时到达",
      sent_at_ms: 1003,
      kind: "direct",
    },
  });

  await waitFor(() => {
    expect(screen.getByText("实时到达")).toBeInTheDocument();
  });
});

test("switches to the sender session when incoming direct auto switch is enabled", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "未命名设备",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      chat: {
        enterToSend: false,
        confirmBeforeBroadcast: true,
        autoSwitchToIncomingDirect: true,
        autoSwitchToIncomingDelivery: true,
      },
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
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "msg-realtime-bob-1",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "Bob 来了",
        sent_at_ms: 1004,
        kind: "direct",
      },
    });
  });

  const bobButton = screen.getByRole("button", { name: /Bob/ });

  await waitFor(() => {
    expect(bobButton.className).toContain("is-active");
    expect(screen.getByText("Bob 来了")).toBeInTheDocument();
  });
});

test("keeps the current session when incoming direct auto switch is disabled", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "未命名设备",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      chat: {
        enterToSend: false,
        confirmBeforeBroadcast: true,
        autoSwitchToIncomingDirect: false,
        autoSwitchToIncomingDelivery: true,
      },
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
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "msg-realtime-bob-2",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "Bob 还在另一个会话",
        sent_at_ms: 1005,
        kind: "direct",
      },
    });
  });

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  expect(screen.queryByText("Bob 还在另一个会话")).not.toBeInTheDocument();
});

test("switches to the sender session when incoming delivery auto switch is enabled", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "未命名设备",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      chat: {
        enterToSend: false,
        confirmBeforeBroadcast: true,
        autoSwitchToIncomingDirect: false,
        autoSwitchToIncomingDelivery: true,
      },
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
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "msg-delivery-bob-1",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "delivery request",
        sent_at_ms: 1006,
        kind: "delivery",
        delivery: {
          request_id: "req-bob-1",
          status: "PendingDecision",
          save_root: null,
          entries: [
            {
              entry_id: "entry-bob-file",
              display_name: "项目说明.docx",
              relative_path: "项目说明.docx",
              file_size: 4096,
              kind: "File",
            },
          ],
        },
      },
    });
  });

  const bobButton = screen.getByRole("button", { name: /Bob/ });

  await waitFor(() => {
    expect(bobButton.className).toContain("is-active");
    expect(screen.getByRole("button", { name: "接收" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument();
  });
});

test("shows unread badge for the sender when incoming direct message stays in another session", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "未命名设备",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      chat: {
        enterToSend: false,
        confirmBeforeBroadcast: true,
        autoSwitchToIncomingDirect: false,
        autoSwitchToIncomingDelivery: true,
      },
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
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "msg-unread-bob-1",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "Bob 未读消息",
        sent_at_ms: 1006,
        kind: "direct",
      },
    });
  });

  const bobButton = screen.getByRole("button", { name: /Bob/ });

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
    expect(within(bobButton).getByLabelText("未读 1 条")).toBeInTheDocument();
  });
});

test("clears unread badge after opening the sender session", async () => {
  const user = userEvent.setup();

  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "未命名设备",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      chat: {
        enterToSend: false,
        confirmBeforeBroadcast: true,
        autoSwitchToIncomingDirect: false,
        autoSwitchToIncomingDelivery: true,
      },
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
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "msg-unread-bob-2",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "Bob 第二条未读",
        sent_at_ms: 1007,
        kind: "direct",
      },
    });
  });

  const bobButton = screen.getByRole("button", { name: /Bob/ });

  await waitFor(() => {
    expect(within(bobButton).getByLabelText("未读 1 条")).toBeInTheDocument();
  });

  await user.click(bobButton);

  await waitFor(() => {
    expect(bobButton.className).toContain("is-active");
    expect(within(bobButton).queryByLabelText("未读 1 条")).not.toBeInTheDocument();
  });
});

test("does not add unread badge when message arrives in the active session", async () => {
  const user = userEvent.setup();

  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);

  render(<App />);

  const bobButton = await screen.findByRole("button", { name: /Bob/ });
  await user.click(bobButton);

  await waitFor(() => {
    expect(bobButton.className).toContain("is-active");
  });

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "msg-active-bob-1",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "Bob 当前会话消息",
        sent_at_ms: 1008,
        kind: "direct",
      },
    });
  });

  await waitFor(() => {
    expect(screen.getByText("Bob 当前会话消息")).toBeInTheDocument();
  });

  expect(within(bobButton).queryByLabelText("未读 1 条")).not.toBeInTheDocument();
});

test("does not add unread badge for incoming broadcast messages", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);

  render(<App />);

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "msg-broadcast-unread-1",
        from_device_id: "device-b",
        to_device_id: "*",
        content: "Bob 广播消息",
        sent_at_ms: 1009,
        kind: "broadcast",
      },
    });
  });

  const aliceButton = screen.getByRole("button", { name: /Alice/ });
  const bobButton = screen.getByRole("button", { name: /Bob/ });

  expect(within(aliceButton).queryByLabelText("未读 1 条")).not.toBeInTheDocument();
  expect(within(bobButton).queryByLabelText("未读 1 条")).not.toBeInTheDocument();
});

test("shows unread badge for incoming delivery when delivery auto switch is disabled", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "未命名设备",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      chat: {
        enterToSend: false,
        confirmBeforeBroadcast: true,
        autoSwitchToIncomingDirect: false,
        autoSwitchToIncomingDelivery: false,
      },
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
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "delivery-unread-bob-1",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "Bob 文件投递",
        sent_at_ms: 1010,
        kind: "delivery",
        delivery: {
          request_id: "delivery-unread-bob-1",
          status: "PendingDecision",
          save_root: null,
          entries: [
            {
              entry_id: "entry-unread-1",
              display_name: "demo.txt",
              relative_path: "demo.txt",
              file_size: 12,
              kind: "File",
            },
          ],
        },
      },
    });
  });

  const bobButton = screen.getByRole("button", { name: /Bob/ });

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
    expect(within(bobButton).getByLabelText("未读 1 条")).toBeInTheDocument();
  });
});

test("shows pending delivery indicator for the sender when incoming delivery needs a decision", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "未命名设备",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      chat: {
        enterToSend: false,
        confirmBeforeBroadcast: true,
        autoSwitchToIncomingDirect: false,
        autoSwitchToIncomingDelivery: false,
      },
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
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "pending-indicator-bob-1",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "Bob 文件投递",
        sent_at_ms: 1011,
        kind: "delivery",
        delivery: {
          request_id: "pending-indicator-bob-1",
          status: "PendingDecision",
          save_root: null,
          entries: [
            {
              entry_id: "pending-entry-1",
              display_name: "demo.txt",
              relative_path: "demo.txt",
              file_size: 12,
              kind: "File",
            },
          ],
        },
      },
    });
  });

  const bobButton = screen.getByRole("button", { name: /Bob/ });

  await waitFor(() => {
    expect(within(bobButton).getByText("待接收")).toBeInTheDocument();
  });
});

test("keeps pending delivery indicator after opening the sender session", async () => {
  const user = userEvent.setup();

  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "未命名设备",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      chat: {
        enterToSend: false,
        confirmBeforeBroadcast: true,
        autoSwitchToIncomingDirect: false,
        autoSwitchToIncomingDelivery: false,
      },
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
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "pending-indicator-bob-2",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "Bob 文件投递",
        sent_at_ms: 1012,
        kind: "delivery",
        delivery: {
          request_id: "pending-indicator-bob-2",
          status: "PendingDecision",
          save_root: null,
          entries: [
            {
              entry_id: "pending-entry-2",
              display_name: "demo.txt",
              relative_path: "demo.txt",
              file_size: 12,
              kind: "File",
            },
          ],
        },
      },
    });
  });

  const bobButton = screen.getByRole("button", { name: /Bob/ });

  await waitFor(() => {
    expect(within(bobButton).getByText("待接收")).toBeInTheDocument();
  });

  await user.click(bobButton);

  await waitFor(() => {
    expect(bobButton.className).toContain("is-active");
    expect(within(bobButton).getByText("待接收")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "接收" })).toBeInTheDocument();
  });
});

test("removes pending delivery indicator after accepting the delivery", async () => {
  const user = userEvent.setup();

  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);
  mockedPickSaveDirectory.mockResolvedValue("D:/接收区");
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "未命名设备",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      chat: {
        enterToSend: false,
        confirmBeforeBroadcast: true,
        autoSwitchToIncomingDirect: false,
        autoSwitchToIncomingDelivery: false,
      },
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
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedSendDeliveryResponse.mockResolvedValueOnce({
    message_id: "pending-indicator-bob-3-response",
    from_device_id: "device-b",
    to_device_id: "local-device",
    content: "Bob 文件投递",
    sent_at_ms: 1014,
    kind: "delivery",
    delivery: {
      request_id: "pending-indicator-bob-3",
      status: "Accepted",
      save_root: "D:/接收区",
      entries: [
        {
          entry_id: "pending-entry-3",
          display_name: "demo.txt",
          relative_path: "demo.txt",
          file_size: 12,
          kind: "File",
        },
      ],
    },
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "pending-indicator-bob-3",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "Bob 文件投递",
        sent_at_ms: 1013,
        kind: "delivery",
        delivery: {
          request_id: "pending-indicator-bob-3",
          status: "PendingDecision",
          save_root: null,
          entries: [
            {
              entry_id: "pending-entry-3",
              display_name: "demo.txt",
              relative_path: "demo.txt",
              file_size: 12,
              kind: "File",
            },
          ],
        },
      },
    });
  });

  const bobButton = screen.getByRole("button", { name: /Bob/ });
  await waitFor(() => {
    expect(within(bobButton).getByText("待接收")).toBeInTheDocument();
  });

  await user.click(bobButton);
  await user.click(screen.getByRole("button", { name: "接收" }));

  await waitFor(() => {
    expect(within(bobButton).queryByText("待接收")).not.toBeInTheDocument();
  });
});

test("removes pending delivery indicator after rejecting the delivery", async () => {
  const user = userEvent.setup();

  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "未命名设备",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      chat: {
        enterToSend: false,
        confirmBeforeBroadcast: true,
        autoSwitchToIncomingDirect: false,
        autoSwitchToIncomingDelivery: false,
      },
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
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedSendDeliveryResponse.mockResolvedValueOnce({
    message_id: "pending-indicator-bob-4-response",
    from_device_id: "device-b",
    to_device_id: "local-device",
    content: "Bob 文件投递",
    sent_at_ms: 1016,
    kind: "delivery",
    delivery: {
      request_id: "pending-indicator-bob-4",
      status: "Rejected",
      save_root: null,
      entries: [
        {
          entry_id: "pending-entry-4",
          display_name: "demo.txt",
          relative_path: "demo.txt",
          file_size: 12,
          kind: "File",
        },
      ],
    },
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "pending-indicator-bob-4",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "Bob 文件投递",
        sent_at_ms: 1015,
        kind: "delivery",
        delivery: {
          request_id: "pending-indicator-bob-4",
          status: "PendingDecision",
          save_root: null,
          entries: [
            {
              entry_id: "pending-entry-4",
              display_name: "demo.txt",
              relative_path: "demo.txt",
              file_size: 12,
              kind: "File",
            },
          ],
        },
      },
    });
  });

  const bobButton = screen.getByRole("button", { name: /Bob/ });
  await waitFor(() => {
    expect(within(bobButton).getByText("待接收")).toBeInTheDocument();
  });

  await user.click(bobButton);
  await user.click(screen.getByRole("button", { name: "取消" }));

  await waitFor(() => {
    expect(within(bobButton).queryByText("待接收")).not.toBeInTheDocument();
  });
});

test("shows pending delivery indicator together with the unread badge", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "未命名设备",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      chat: {
        enterToSend: false,
        confirmBeforeBroadcast: true,
        autoSwitchToIncomingDirect: false,
        autoSwitchToIncomingDelivery: false,
      },
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
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "pending-indicator-bob-5",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "Bob 文件投递",
        sent_at_ms: 1017,
        kind: "delivery",
        delivery: {
          request_id: "pending-indicator-bob-5",
          status: "PendingDecision",
          save_root: null,
          entries: [
            {
              entry_id: "pending-entry-5",
              display_name: "demo.txt",
              relative_path: "demo.txt",
              file_size: 12,
              kind: "File",
            },
          ],
        },
      },
    });
  });

  const bobButton = screen.getByRole("button", { name: /Bob/ });

  await waitFor(() => {
    expect(within(bobButton).getByText("待接收")).toBeInTheDocument();
    expect(within(bobButton).getByLabelText("未读 1 条")).toBeInTheDocument();
  });
});

test("shows pending delivery as the highest priority contact summary", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);
  mockedListTransfers.mockResolvedValue([
    {
      transfer_id: "tx-bob-1",
      file_name: "archive.zip",
      file_size: 100,
      transferred_bytes: 40,
      from_device_id: "device-b",
      to_device_id: "local-device",
      status: "InProgress",
    },
  ]);
  mockedListMessages.mockResolvedValue([
    {
      message_id: "delivery-bob-1",
      from_device_id: "device-b",
      to_device_id: "local-device",
      content: "Bob 文件投递",
      sent_at_ms: 1010,
      kind: "delivery",
      delivery: {
        request_id: "delivery-bob-1",
        status: "PendingDecision",
        save_root: null,
        entries: [
          {
            entry_id: "entry-bob-1",
            display_name: "demo.txt",
            relative_path: "demo.txt",
            file_size: 12,
            kind: "File",
          },
        ],
      },
    },
  ]);

  render(<App />);

  const bobButton = await screen.findByRole("button", { name: /Bob/ });

  expect(within(bobButton).getByText("待接收")).toBeInTheDocument();
  expect(within(bobButton).getByText("待接收文件")).toBeInTheDocument();
  expect(within(bobButton).queryByText("传输中")).not.toBeInTheDocument();
});

test("shows transfer summary before unread summary", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);
  mockedListTransfers.mockResolvedValue([
    {
      transfer_id: "tx-bob-2",
      file_name: "archive.zip",
      file_size: 100,
      transferred_bytes: 40,
      from_device_id: "device-b",
      to_device_id: "local-device",
      status: "InProgress",
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "unread-bob-1",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "Bob 未读消息",
        sent_at_ms: 1020,
        kind: "direct",
      },
    });
  });

  const bobButton = screen.getByRole("button", { name: /Bob/ });

  await waitFor(() => {
    expect(within(bobButton).getByLabelText("未读 1 条")).toBeInTheDocument();
    expect(within(bobButton).getByText("传输中")).toBeInTheDocument();
    expect(within(bobButton).queryByText("有未读消息")).not.toBeInTheDocument();
  });
});

test("shows unread summary before latest message preview", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "unread-bob-2",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "这是最近消息",
        sent_at_ms: 1030,
        kind: "direct",
      },
    });
  });

  const bobButton = screen.getByRole("button", { name: /Bob/ });

  await waitFor(() => {
    expect(within(bobButton).getByText("有未读消息")).toBeInTheDocument();
    expect(within(bobButton).queryByText("对方：这是最近消息")).not.toBeInTheDocument();
  });
});

test("falls back to latest message preview after opening unread contact", async () => {
  const user = userEvent.setup();

  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const messageListener = eventListeners.get("chat-message-received");
  expect(messageListener).toBeDefined();

  await act(async () => {
    messageListener?.({
      payload: {
        message_id: "unread-bob-3",
        from_device_id: "device-b",
        to_device_id: "local-device",
        content: "打开后显示预览",
        sent_at_ms: 1040,
        kind: "direct",
      },
    });
  });

  const bobButton = screen.getByRole("button", { name: /Bob/ });

  await waitFor(() => {
    expect(within(bobButton).getByText("有未读消息")).toBeInTheDocument();
  });

  await user.click(bobButton);

  await waitFor(() => {
    expect(within(bobButton).queryByLabelText("未读 1 条")).not.toBeInTheDocument();
    expect(within(bobButton).getByText("对方：打开后显示预览")).toBeInTheDocument();
  });
});

test("shows latest message preview with direction labels", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);
  mockedListMessages.mockResolvedValue([
    {
      message_id: "outgoing-alice-1",
      from_device_id: "local-device",
      to_device_id: "device-a",
      content: "我发出的消息",
      sent_at_ms: 1050,
      kind: "direct",
    },
    {
      message_id: "incoming-bob-1",
      from_device_id: "device-b",
      to_device_id: "local-device",
      content: "对方发来的消息",
      sent_at_ms: 1051,
      kind: "direct",
    },
  ]);

  render(<App />);

  const aliceButton = await screen.findByRole("button", { name: /Alice/ });
  const bobButton = await screen.findByRole("button", { name: /Bob/ });

  expect(within(aliceButton).getByText("你：我发出的消息")).toBeInTheDocument();
  expect(within(bobButton).getByText("对方：对方发来的消息")).toBeInTheDocument();
});

test("uses short previews for delivery file and directory messages", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);
  mockedListMessages.mockResolvedValue([
    {
      message_id: "delivery-file-alice-1",
      from_device_id: "device-a",
      to_device_id: "local-device",
      content: "Alice 文件",
      sent_at_ms: 1052,
      kind: "delivery",
      delivery: {
        request_id: "delivery-file-alice-1",
        status: "Completed",
        save_root: null,
        entries: [
          {
            entry_id: "file-entry-1",
            display_name: "very-long-file-name.txt",
            relative_path: "very-long-file-name.txt",
            file_size: 12,
            kind: "File",
          },
        ],
      },
    },
    {
      message_id: "delivery-dir-bob-1",
      from_device_id: "device-b",
      to_device_id: "local-device",
      content: "Bob 目录",
      sent_at_ms: 1053,
      kind: "delivery",
      delivery: {
        request_id: "delivery-dir-bob-1",
        status: "Completed",
        save_root: null,
        entries: [
          {
            entry_id: "dir-entry-1",
            display_name: "project-folder",
            relative_path: "project-folder",
            file_size: 0,
            kind: "Directory",
          },
        ],
      },
    },
  ]);

  render(<App />);

  const aliceButton = await screen.findByRole("button", { name: /Alice/ });
  const bobButton = await screen.findByRole("button", { name: /Bob/ });

  expect(within(aliceButton).getByText("对方：发送了文件")).toBeInTheDocument();
  expect(within(bobButton).getByText("对方：发送了目录")).toBeInTheDocument();
  expect(within(aliceButton).queryByText(/very-long-file-name/)).not.toBeInTheDocument();
  expect(within(bobButton).queryByText(/project-folder/)).not.toBeInTheDocument();
});

test("updates contacts when discovery event arrives", async () => {
  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("在线联系人")).toBeInTheDocument();
  });

  const discoveryListener = eventListeners.get("devices-updated");
  expect(discoveryListener).toBeDefined();

  const devices: KnownDevice[] = [
    {
      device_id: "device-c",
      nickname: "Carol",
      host_name: "carol-book",
      ip_addr: "192.168.1.12",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1004,
    },
  ];

  discoveryListener?.({ payload: devices });

  await waitFor(() => {
    expect(screen.getByText("Carol")).toBeInTheDocument();
  });
});

test("shows incoming transfer task when transfer event arrives", async () => {
  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("接收进度")).toBeInTheDocument();
  });

  const transferListener = eventListeners.get("transfer-updated");
  expect(transferListener).toBeDefined();

  await act(async () => {
    transferListener?.({
      payload: {
        transfer_id: "tx-runtime-1",
        file_name: "incoming.bin",
        file_size: 100,
        transferred_bytes: 40,
        from_device_id: "device-a",
        to_device_id: "local-device",
        status: "InProgress",
      },
    });
  });

  await waitFor(() => {
    expect(screen.getByText("incoming.bin")).toBeInTheDocument();
    expect(screen.getByText("来自 device-a")).toBeInTheDocument();
    expect(screen.getByText("40% · 40 B / 100 B")).toBeInTheDocument();
    expect(screen.getByText("传输中")).toBeInTheDocument();
  });
});

test("hides outgoing transfer from the incoming progress summary", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
  ]);
  mockedListTransfers.mockResolvedValue([
    {
      transfer_id: "tx-outgoing-1",
      file_name: "design.pdf",
      file_size: 100,
      transferred_bytes: 40,
      from_device_id: "local-device",
      to_device_id: "device-a",
      status: "InProgress",
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.queryByText("design.pdf")).not.toBeInTheDocument();
    expect(screen.getByText("等待新的接收任务")).toBeInTheDocument();
  });
});

test("shows incoming transfer direction with contact name", async () => {
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
  ]);
  mockedListTransfers.mockResolvedValue([
    {
      transfer_id: "tx-incoming-1",
      file_name: "report.zip",
      file_size: 200,
      transferred_bytes: 200,
      from_device_id: "device-a",
      to_device_id: "local-device",
      status: "Completed",
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("report.zip")).toBeInTheDocument();
    expect(screen.getByText("来自 Alice")).toBeInTheDocument();
    expect(screen.getAllByText("已完成").length).toBeGreaterThan(0);
    expect(screen.getByText("100% · 200 B / 200 B")).toBeInTheDocument();
  });
});

test("shows transferred bytes when total file size is unknown", async () => {
  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("接收进度")).toBeInTheDocument();
  });

  const transferListener = eventListeners.get("transfer-updated");
  expect(transferListener).toBeDefined();

  transferListener?.({
    payload: {
      transfer_id: "tx-runtime-2",
      file_name: "unknown-size.bin",
      file_size: 0,
      transferred_bytes: 40,
      from_device_id: "device-a",
      to_device_id: "local-device",
      status: "InProgress",
    },
  });

  await waitFor(() => {
    expect(screen.getByText("unknown-size.bin")).toBeInTheDocument();
    expect(screen.getByText("40 B")).toBeInTheDocument();
  });
});

test("sends selected files as a delivery request to the active device", async () => {
  const user = userEvent.setup();

  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  mockedPickDeliveryFiles.mockResolvedValue(["C:\\temp\\demo.txt"]);

  await user.click(screen.getByRole("button", { name: "选择文件" }));
  await user.click(screen.getByRole("button", { name: "发送投递" }));

  await waitFor(() => {
    expect(mockedSendDeliveryRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        addr: "192.168.1.10:37001",
        fileAddr: "192.168.1.10:37002",
        toDeviceId: "device-a",
      }),
    );
  });
});

test("switches active chat session when selecting another contact", async () => {
  const user = userEvent.setup();

  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1001,
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: /Bob/ }));

  await waitFor(() => {
    expect(screen.getByText("当前会话：Bob")).toBeInTheDocument();
  });
});

test("sends direct message to the active device", async () => {
  const user = userEvent.setup();

  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  await user.type(screen.getByPlaceholderText("输入消息内容"), "hello Alice");
  await user.click(screen.getByRole("button", { name: "发送单聊" }));

  await waitFor(() => {
    expect(mockedSendDirectMessage).toHaveBeenCalledWith(
      "192.168.1.10:37001",
      expect.objectContaining({
        from_device_id: "local-device",
        to_device_id: "device-a",
        content: "hello Alice",
      }),
    );
  });
});

test("broadcasts message to all online devices", async () => {
  const user = userEvent.setup();

  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  await user.type(screen.getByPlaceholderText("输入消息内容"), "hello team");
  await user.click(screen.getByRole("button", { name: "发送广播" }));

  await waitFor(() => {
    expect(mockedSendBroadcastMessage).toHaveBeenCalledTimes(2);
    expect(mockedSendBroadcastMessage).toHaveBeenNthCalledWith(
      1,
      "192.168.1.10:37001",
      expect.objectContaining({
        from_device_id: "local-device",
        to_device_id: "*",
        content: "hello team",
      }),
    );
    expect(mockedSendBroadcastMessage).toHaveBeenNthCalledWith(
      2,
      "192.168.1.11:37003",
      expect.objectContaining({
        from_device_id: "local-device",
        to_device_id: "*",
        content: "hello team",
      }),
    );
  });
});

test("sends direct message on Enter when enter-to-send is enabled", async () => {
  const user = userEvent.setup();

  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
  ]);
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "未命名设备",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      chat: {
        enterToSend: true,
        confirmBeforeBroadcast: true,
      },
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
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const input = screen.getByPlaceholderText("输入消息内容");
  await user.type(input, "hello by enter");
  await user.keyboard("{Enter}");

  await waitFor(() => {
    expect(mockedSendDirectMessage).toHaveBeenCalledWith(
      "192.168.1.10:37001",
      expect.objectContaining({
        from_device_id: "local-device",
        to_device_id: "device-a",
        content: "hello by enter",
      }),
    );
  });

  expect(input).toHaveValue("");
});

test("cancels broadcast when confirm-before-broadcast is enabled and user rejects", async () => {
  const user = userEvent.setup();
  const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

  useAppStore.setState((current) => ({
    ...current,
    settings: {
      ...current.settings,
      preferences: {
        ...current.settings.preferences,
        chat: {
          enterToSend: false,
          confirmBeforeBroadcast: true,
        },
      },
    },
  }));
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-mac",
      ip_addr: "192.168.1.11",
      message_port: 37003,
      file_port: 37004,
      last_seen_ms: 1001,
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  await user.type(screen.getByPlaceholderText("输入消息内容"), "hold broadcast");
  await user.click(screen.getByRole("button", { name: "发送广播" }));

  expect(confirmSpy).toHaveBeenCalledTimes(1);
  expect(mockedSendBroadcastMessage).not.toHaveBeenCalled();
  expect(screen.getByPlaceholderText("输入消息内容")).toHaveValue("hold broadcast");

  confirmSpy.mockRestore();
});

test("shows sent direct messages in the active session", async () => {
  const user = userEvent.setup();

  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("当前会话：Alice")).toBeInTheDocument();
  });

  const input = screen.getByPlaceholderText("输入消息内容");
  await user.type(input, "follow up");
  await user.click(screen.getByRole("button", { name: "发送单聊" }));

  await waitFor(() => {
    expect(screen.getByText("follow up")).toBeInTheDocument();
  });

  expect(input).toHaveValue("");
});

test("updates local nickname in shared settings state", async () => {
  render(<App view="settings" />);

  const nicknameInput = screen.getByDisplayValue("未命名设备");
  fireEvent.change(nicknameInput, { target: { value: "局域网助手" } });

  expect(useAppStore.getState().settings.preferences.identity.nickname).toBe("局域网助手");
});

test("picks download directory from dialog and updates shared settings state", async () => {
  const user = userEvent.setup();

  mockedPickSaveDirectory.mockResolvedValue("D:/LAN/Downloads");

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /文件传输/ }));
  await user.click(screen.getByRole("button", { name: "选择目录" }));

  await waitFor(() => {
    expect(mockedPickSaveDirectory).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().settings.preferences.transfer.downloadDir).toBe("D:/LAN/Downloads");
    expect(screen.getByDisplayValue("D:/LAN/Downloads")).toBeInTheDocument();
  });
});

test("shows readonly runtime ports in network group", async () => {
  const user = userEvent.setup();

  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  expect(screen.getByText("37001")).toBeInTheDocument();
  expect(screen.getByText("37002")).toBeInTheDocument();
  expect(screen.getByText("当前在线设备数")).toBeInTheDocument();
  expect(screen.getByText("1 台")).toBeInTheDocument();
  expect(screen.getByText("当前发现策略")).toBeInTheDocument();
  expect(screen.getByText("全局广播发现")).toBeInTheDocument();
});

test("shows manual segment diagnostics and device attribution in network group", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/29", "10.0.0.8/31"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.10.2",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
    {
      device_id: "device-b",
      nickname: "Bob",
      host_name: "bob-pc",
      ip_addr: "172.16.5.8",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1001,
    },
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  expect(screen.getByText("手动网段广播 + 主机主动探测")).toBeInTheDocument();
  expect(screen.getByText("有效手动网段数")).toBeInTheDocument();
  expect(screen.getByText("2 个")).toBeInTheDocument();
  expect(screen.getByText("预计主动探测主机数")).toBeInTheDocument();
  expect(screen.getByText("8 台")).toBeInTheDocument();
  expect(screen.getByText("命中手动网段设备")).toBeInTheDocument();
  expect(screen.getByText("未命中手动网段设备")).toBeInTheDocument();
  expect(screen.getByText("Alice · 192.168.10.2")).toBeInTheDocument();
  expect(screen.getByText("命中 192.168.10.0/29")).toBeInTheDocument();
  expect(screen.getByText("Bob · 172.16.5.8")).toBeInTheDocument();
  expect(screen.getByText("未命中手动网段")).toBeInTheDocument();
  expect(screen.getByText("已命中 1 台在线设备 · 预计探测 6 台主机")).toBeInTheDocument();
  expect(screen.getByText("当前未命中在线设备 · 预计探测 2 台主机")).toBeInTheDocument();
  expect(screen.getByText("暂未命中在线设备的网段：10.0.0.8/31")).toBeInTheDocument();
});

test("shows direct actions when all manual segments are matched", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.10.2",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
    },
  ]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  const overviewBlock = screen
    .getByRole("heading", { name: "手动网段概览" })
    .closest(".settings-diagnostics-block");
  const attributionBlock = screen
    .getByRole("heading", { name: "在线设备归因" })
    .closest(".settings-diagnostics-block");

  expect(overviewBlock).not.toBeNull();
  expect(attributionBlock).not.toBeNull();

  const overviewScope = within(overviewBlock as HTMLElement);

  expect(
    overviewScope.getByText(
      "当前所有有效手动网段都已命中至少一台在线设备，你可以立即刷新或查看在线设备归因。",
    ),
  ).toBeInTheDocument();
  expect(overviewScope.getByRole("button", { name: "立即刷新" })).toBeInTheDocument();
  expect(
    overviewScope.getByRole("button", { name: "查看在线设备归因" }),
  ).toBeInTheDocument();

  await user.click(overviewScope.getByRole("button", { name: "查看在线设备归因" }));

  expect(attributionBlock as HTMLElement).toHaveFocus();

  await user.click(overviewScope.getByRole("button", { name: "立即刷新" }));

  expect(mockedRefreshDiscovery).toHaveBeenCalledTimes(1);
});

test("shows validation error for invalid manual network segments", async () => {
  const user = userEvent.setup();

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));
  await user.selectOptions(screen.getByLabelText("发现方式"), "ManualSegments");
  fireEvent.change(screen.getByLabelText("手动网段"), {
    target: { value: "192.168.10.0/24\n192.168.1.10/99" },
  });

  expect(
    screen.getByText("以下网段格式无效：192.168.1.10/99"),
  ).toBeInTheDocument();
  const invalidSegmentPrompt = screen
    .getByText("以下网段格式无效：192.168.1.10/99")
    .closest(".settings-inline-prompt");
  const mainActions = document.querySelector(".settings-actions");

  expect(invalidSegmentPrompt).not.toBeNull();
  expect(mainActions).not.toBeNull();

  const invalidSegmentScope = within(invalidSegmentPrompt as HTMLElement);
  const mainActionScope = within(mainActions as HTMLElement);

  expect(mainActionScope.getByRole("button", { name: "立即刷新" })).toBeDisabled();
  expect(invalidSegmentScope.getByRole("button", { name: "清空无效项" })).toBeInTheDocument();
  expect(invalidSegmentScope.getByRole("button", { name: "填入示例网段" })).toBeInTheDocument();

  await user.click(invalidSegmentScope.getByRole("button", { name: "清空无效项" }));

  expect(screen.getByLabelText("手动网段")).toHaveValue("192.168.10.0/24");
  expect(screen.queryByText("以下网段格式无效：192.168.1.10/99")).not.toBeInTheDocument();
  expect(mainActionScope.getByRole("button", { name: "立即刷新" })).not.toBeDisabled();

  await user.clear(screen.getByLabelText("手动网段"));
  await user.type(screen.getByLabelText("手动网段"), "10.10.10.10/99");

  const refreshedInvalidSegmentPrompt = screen
    .getByText("以下网段格式无效：10.10.10.10/99")
    .closest(".settings-inline-prompt");

  expect(refreshedInvalidSegmentPrompt).not.toBeNull();

  const refreshedInvalidSegmentScope = within(
    refreshedInvalidSegmentPrompt as HTMLElement,
  );

  expect(
    refreshedInvalidSegmentScope.getByRole("button", { name: "填入示例网段" }),
  ).toBeInTheDocument();

  await user.click(
    refreshedInvalidSegmentScope.getByRole("button", { name: "填入示例网段" }),
  );

  expect(screen.getByLabelText("手动网段")).toHaveValue("192.168.10.0/24");
  expect(screen.queryByText("以下网段格式无效：10.10.10.10/99")).not.toBeInTheDocument();
  expect(mainActionScope.getByRole("button", { name: "立即刷新" })).not.toBeDisabled();
});

test("shows direct actions when manual segments are empty", async () => {
  const user = userEvent.setup();

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));
  await user.selectOptions(screen.getByLabelText("发现方式"), "ManualSegments");

  expect(
    screen.getByText("请先填写至少一个有效 CIDR，或直接使用下面的快捷操作。"),
  ).toBeInTheDocument();
  const mainActions = document.querySelector(".settings-actions");

  expect(mainActions).not.toBeNull();

  const mainActionScope = within(mainActions as HTMLElement);

  expect(mainActionScope.getByRole("button", { name: "立即刷新" })).toBeDisabled();
  expect(mainActionScope.getByRole("button", { name: "填入示例网段" })).toBeInTheDocument();
  expect(mainActionScope.getByRole("button", { name: "切回自动发现" })).toBeInTheDocument();

  await user.click(mainActionScope.getByRole("button", { name: "切回自动发现" }));

  expect(screen.getByLabelText("发现方式")).toHaveValue("Auto");

  await user.selectOptions(screen.getByLabelText("发现方式"), "ManualSegments");
  await user.click(mainActionScope.getByRole("button", { name: "填入示例网段" }));

  expect(screen.getByLabelText("手动网段")).toHaveValue("192.168.10.0/24");
  expect(mainActionScope.getByRole("button", { name: "立即刷新" })).not.toBeDisabled();
});

test("shows direct actions when manual segment overview is empty", async () => {
  const user = userEvent.setup();

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));
  await user.selectOptions(screen.getByLabelText("发现方式"), "ManualSegments");

  const overviewBlock = screen
    .getByRole("heading", { name: "手动网段概览" })
    .closest(".settings-diagnostics-block");

  expect(overviewBlock).not.toBeNull();

  const overviewScope = within(overviewBlock as HTMLElement);

  expect(
    overviewScope.getByText("当前没有可参与主动探测的有效手动网段，你可以填入示例网段或切回自动发现。"),
  ).toBeInTheDocument();
  expect(overviewScope.getByRole("button", { name: "填入示例网段" })).toBeInTheDocument();
  expect(overviewScope.getByRole("button", { name: "切回自动发现" })).toBeInTheDocument();

  await user.click(overviewScope.getByRole("button", { name: "切回自动发现" }));

  expect(screen.getByLabelText("发现方式")).toHaveValue("Auto");

  await user.selectOptions(screen.getByLabelText("发现方式"), "ManualSegments");

  const refreshedOverviewBlock = screen
    .getByRole("heading", { name: "手动网段概览" })
    .closest(".settings-diagnostics-block");

  expect(refreshedOverviewBlock).not.toBeNull();

  const refreshedOverviewScope = within(refreshedOverviewBlock as HTMLElement);

  await user.click(refreshedOverviewScope.getByRole("button", { name: "填入示例网段" }));

  expect(screen.getByLabelText("手动网段")).toHaveValue("192.168.10.0/24");
});

test("shows direct actions when device attribution is empty", async () => {
  const user = userEvent.setup();

  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "飞秋助手",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedListDevices.mockResolvedValue([]);

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /网络与发现/ }));

  const attributionSection = screen
    .getByRole("heading", { name: "在线设备归因" })
    .closest(".settings-diagnostics-block");

  expect(attributionSection).not.toBeNull();

  const attributionScope = within(attributionSection as HTMLElement);

  expect(
    attributionScope.getByText("当前还没有在线设备，你可以立即刷新或切换发现方式。"),
  ).toBeInTheDocument();
  expect(attributionScope.getByRole("button", { name: "立即刷新" })).toBeInTheDocument();
  expect(attributionScope.getByRole("button", { name: "切换发现方式" })).toBeInTheDocument();

  await user.click(attributionScope.getByRole("button", { name: "切换发现方式" }));

  expect(screen.getByLabelText("发现方式")).toHaveFocus();

  await user.click(attributionScope.getByRole("button", { name: "立即刷新" }));

  expect(mockedRefreshDiscovery).toHaveBeenCalledTimes(1);
});

test("triggers discovery refresh from the network settings panel", async () => {
  vi.useFakeTimers();
  try {
    useAppStore.setState((current) => ({
      ...current,
      devices: [
        {
          device_id: "device-a",
          nickname: "Alice",
          host_name: "alice-pc",
          ip_addr: "192.168.1.10",
          message_port: 37001,
          file_port: 37002,
          last_seen_ms: 1000,
        },
      ],
      settings: {
        ...current.settings,
        preferences: {
          ...current.settings.preferences,
          network: {
            discoveryMode: "ManualSegments",
            manualSegments: [
              "192.168.1.0/24",
              "192.168.10.0/24",
              "10.0.0.0/24",
            ],
          },
        },
      },
    }));
    mockedListDevices.mockResolvedValue([
      {
        device_id: "device-a",
        nickname: "Alice",
        host_name: "alice-pc",
        ip_addr: "192.168.1.10",
        message_port: 37001,
        file_port: 37002,
        last_seen_ms: 1000,
      },
    ]);
    mockedGetRuntimeSettings.mockResolvedValue({
      preferences: {
        identity: {
          nickname: "未命名设备",
          deviceNameMode: "NicknameOnly",
          statusMessage: "",
        },
        transfer: {
          downloadDir: "~/Downloads",
          receiveBeforeAccept: true,
          openFolderAfterReceive: true,
          preserveDirectoryStructure: true,
        },
        network: {
          discoveryMode: "ManualSegments",
          manualSegments: [
            "192.168.1.0/24",
            "192.168.10.0/24",
            "10.0.0.0/24",
          ],
        },
        display: {
          trayEnabled: true,
          closeAction: "MinimizeToTray",
        },
      },
      runtime: {
        deviceId: "local-device",
        messagePort: 37001,
        filePort: 37002,
      },
    });

    render(<App view="settings" />);

    fireEvent.click(screen.getByRole("button", { name: /网络与发现/ }));
    expect(screen.getByText("手动网段广播 + 主机主动探测")).toBeInTheDocument();

    const mainActions = document.querySelector(".settings-actions");

    expect(mainActions).not.toBeNull();

    const mainActionScope = within(mainActions as HTMLElement);

    await act(async () => {
      fireEvent.click(mainActionScope.getByRole("button", { name: "立即刷新" }));
      await Promise.resolve();
    });

    expect(screen.getByText("刷新状态")).toBeInTheDocument();
    expect(screen.getByText("刷新中")).toBeInTheDocument();

    await act(async () => {
      eventListeners.get("devices-updated")?.({
        payload: [
          {
            device_id: "device-a",
            nickname: "Alice",
            host_name: "alice-pc",
            ip_addr: "192.168.1.10",
            message_port: 37001,
            file_port: 37002,
            last_seen_ms: 1000,
          },
          {
            device_id: "device-b",
            nickname: "Bob",
            host_name: "bob-pc",
            ip_addr: "192.168.10.20",
            message_port: 37001,
            file_port: 37002,
            last_seen_ms: 1001,
          },
        ],
      });
      await vi.advanceTimersByTimeAsync(1600);
    });

    expect(mockedRefreshDiscovery).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("已完成").length).toBeGreaterThan(0);
    expect(screen.getByText("本次新增发现数")).toBeInTheDocument();
    expect(screen.getAllByText("1 台").length).toBeGreaterThan(0);
    expect(screen.getByText(/最近刷新：/)).toBeInTheDocument();
    expect(screen.getByText("最近一次刷新结果")).toBeInTheDocument();
    expect(screen.getByText("新增发现设备")).toBeInTheDocument();
    expect(screen.getAllByText("Bob · 192.168.10.20").length).toBeGreaterThan(0);
    expect(screen.getByText("刷新前已在线设备")).toBeInTheDocument();
    expect(screen.getAllByText("Alice · 192.168.1.10").length).toBeGreaterThan(0);
    expect(screen.getByText("当前配置网段仍未命中")).toBeInTheDocument();
    expect(screen.getAllByText("10.0.0.0/24").length).toBeGreaterThan(0);
    expect(screen.getByText("本次新增命中")).toBeInTheDocument();
    expect(screen.getByText("已有在线设备")).toBeInTheDocument();
    expect(screen.getByText("当前未命中")).toBeInTheDocument();
    expect(screen.getByText("最近刷新历史")).toBeInTheDocument();
    expect(
      screen.getByText("已完成 · 新增 1 台 · 已在线 1 台 · 未命中 1 个网段"),
    ).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

test("shows direct prompt when no new device is found", async () => {
  vi.useFakeTimers();
  try {
    useAppStore.setState((current) => ({
      ...current,
      devices: [
        {
          device_id: "device-a",
          nickname: "Alice",
          host_name: "alice-pc",
          ip_addr: "192.168.1.10",
          message_port: 37001,
          file_port: 37002,
          last_seen_ms: 1000,
        },
      ],
      settings: {
        ...current.settings,
        preferences: {
          ...current.settings.preferences,
          network: {
            discoveryMode: "ManualSegments",
            manualSegments: ["192.168.1.0/24"],
          },
        },
      },
    }));
    mockedListDevices.mockResolvedValue([
      {
        device_id: "device-a",
        nickname: "Alice",
        host_name: "alice-pc",
        ip_addr: "192.168.1.10",
        message_port: 37001,
        file_port: 37002,
        last_seen_ms: 1000,
      },
    ]);
    mockedGetRuntimeSettings.mockResolvedValue({
      preferences: {
        identity: {
          nickname: "未命名设备",
          deviceNameMode: "NicknameOnly",
          statusMessage: "",
        },
        transfer: {
          downloadDir: "~/Downloads",
          receiveBeforeAccept: true,
          openFolderAfterReceive: true,
          preserveDirectoryStructure: true,
        },
        network: {
          discoveryMode: "ManualSegments",
          manualSegments: ["192.168.1.0/24"],
        },
        display: {
          trayEnabled: true,
          closeAction: "MinimizeToTray",
        },
      },
      runtime: {
        deviceId: "local-device",
        messagePort: 37001,
        filePort: 37002,
      },
    });

    render(<App view="settings" />);

    fireEvent.click(screen.getByRole("button", { name: /网络与发现/ }));

    const mainActions = document.querySelector(".settings-actions");

    expect(mainActions).not.toBeNull();

    const mainActionScope = within(mainActions as HTMLElement);

    await act(async () => {
      fireEvent.click(mainActionScope.getByRole("button", { name: "立即刷新" }));
      await Promise.resolve();
    });

    await act(async () => {
      eventListeners.get("devices-updated")?.({
        payload: [
          {
            device_id: "device-a",
            nickname: "Alice",
            host_name: "alice-pc",
            ip_addr: "192.168.1.10",
            message_port: 37001,
            file_port: 37002,
            last_seen_ms: 1000,
          },
        ],
      });
      await vi.advanceTimersByTimeAsync(1600);
    });

    const latestRefreshBlock = screen
      .getByText("最近一次刷新结果")
      .closest(".settings-diagnostics-block");

    expect(latestRefreshBlock).not.toBeNull();

    const newDiscoveryCard = within(latestRefreshBlock as HTMLElement)
      .getByText("新增发现设备")
      .closest(".settings-refresh-result-card");

    expect(newDiscoveryCard).not.toBeNull();

    const newDiscoveryScope = within(newDiscoveryCard as HTMLElement);

    expect(
      newDiscoveryScope.getByText(
        "本次没有新增设备，但已有在线设备仍可通信，你可以立即刷新或查看刷新前已在线设备。",
      ),
    ).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

test("shows direct actions when latest refresh result has no unmatched segments", async () => {
  vi.useFakeTimers();
  try {
    useAppStore.setState((current) => ({
      ...current,
      devices: [
        {
          device_id: "device-a",
          nickname: "Alice",
          host_name: "alice-pc",
          ip_addr: "192.168.1.10",
          message_port: 37001,
          file_port: 37002,
          last_seen_ms: 1000,
        },
      ],
      settings: {
        ...current.settings,
        preferences: {
          ...current.settings.preferences,
          network: {
            discoveryMode: "ManualSegments",
            manualSegments: ["192.168.1.0/24"],
          },
        },
      },
    }));
    mockedListDevices.mockResolvedValue([
      {
        device_id: "device-a",
        nickname: "Alice",
        host_name: "alice-pc",
        ip_addr: "192.168.1.10",
        message_port: 37001,
        file_port: 37002,
        last_seen_ms: 1000,
      },
    ]);
    mockedGetRuntimeSettings.mockResolvedValue({
      preferences: {
        identity: {
          nickname: "未命名设备",
          deviceNameMode: "NicknameOnly",
          statusMessage: "",
        },
        transfer: {
          downloadDir: "~/Downloads",
          receiveBeforeAccept: true,
          openFolderAfterReceive: true,
          preserveDirectoryStructure: true,
        },
        network: {
          discoveryMode: "ManualSegments",
          manualSegments: ["192.168.1.0/24"],
        },
        display: {
          trayEnabled: true,
          closeAction: "MinimizeToTray",
        },
      },
      runtime: {
        deviceId: "local-device",
        messagePort: 37001,
        filePort: 37002,
      },
    });

    render(<App view="settings" />);

    fireEvent.click(screen.getByRole("button", { name: /网络与发现/ }));

    const mainActions = document.querySelector(".settings-actions");

    expect(mainActions).not.toBeNull();

    const mainActionScope = within(mainActions as HTMLElement);

    await act(async () => {
      fireEvent.click(mainActionScope.getByRole("button", { name: "立即刷新" }));
      await Promise.resolve();
    });

    await act(async () => {
      eventListeners.get("devices-updated")?.({
        payload: [
          {
            device_id: "device-a",
            nickname: "Alice",
            host_name: "alice-pc",
            ip_addr: "192.168.1.10",
            message_port: 37001,
            file_port: 37002,
            last_seen_ms: 1000,
          },
        ],
      });
      await vi.advanceTimersByTimeAsync(1600);
    });

    const latestRefreshBlock = screen
      .getByText("最近一次刷新结果")
      .closest(".settings-diagnostics-block");
    const attributionBlock = screen
      .getByRole("heading", { name: "在线设备归因" })
      .closest(".settings-diagnostics-block");

    expect(latestRefreshBlock).not.toBeNull();
    expect(attributionBlock).not.toBeNull();

    const latestRefreshScope = within(latestRefreshBlock as HTMLElement);
    const unmatchedResultCard = latestRefreshScope
      .getByText("当前配置网段仍未命中")
      .closest(".settings-refresh-result-card");

    expect(unmatchedResultCard).not.toBeNull();

    const unmatchedResultScope = within(unmatchedResultCard as HTMLElement);

    expect(
      unmatchedResultScope.getByText(
        "当前所有有效手动网段都已命中至少一台在线设备，你可以立即刷新或查看在线设备归因。",
      ),
    ).toBeInTheDocument();
    expect(
      unmatchedResultScope.getByRole("button", { name: "立即刷新" }),
    ).toBeInTheDocument();
    expect(
      unmatchedResultScope.getByRole("button", { name: "查看在线设备归因" }),
    ).toBeInTheDocument();

    fireEvent.click(unmatchedResultScope.getByRole("button", { name: "查看在线设备归因" }));

    expect(attributionBlock as HTMLElement).toHaveFocus();

    fireEvent.click(unmatchedResultScope.getByRole("button", { name: "立即刷新" }));

    expect(mockedRefreshDiscovery).toHaveBeenCalledTimes(2);
  } finally {
    vi.useRealTimers();
  }
});

test("shows direct actions when latest refresh result has no existing devices", async () => {
  vi.useFakeTimers();
  try {
    mockedGetRuntimeSettings.mockResolvedValue({
      preferences: {
        identity: {
          nickname: "未命名设备",
          deviceNameMode: "NicknameOnly",
          statusMessage: "",
        },
        transfer: {
          downloadDir: "~/Downloads",
          receiveBeforeAccept: true,
          openFolderAfterReceive: true,
          preserveDirectoryStructure: true,
        },
        network: {
          discoveryMode: "ManualSegments",
          manualSegments: ["192.168.10.0/24"],
        },
        display: {
          trayEnabled: true,
          closeAction: "MinimizeToTray",
        },
      },
      runtime: {
        deviceId: "local-device",
        messagePort: 37001,
        filePort: 37002,
      },
    });
    mockedListDevices.mockResolvedValue([]);

    render(<App view="settings" />);

    fireEvent.click(screen.getByRole("button", { name: /网络与发现/ }));

    const mainActions = document.querySelector(".settings-actions");

    expect(mainActions).not.toBeNull();

    const mainActionScope = within(mainActions as HTMLElement);

    await act(async () => {
      fireEvent.click(mainActionScope.getByRole("button", { name: "立即刷新" }));
      await Promise.resolve();
    });

    await act(async () => {
      eventListeners.get("devices-updated")?.({
        payload: [
          {
            device_id: "device-a",
            nickname: "Bob",
            host_name: "bob-pc",
            ip_addr: "192.168.10.20",
            message_port: 37001,
            file_port: 37002,
            last_seen_ms: 1001,
          },
        ],
      });
      await vi.advanceTimersByTimeAsync(1600);
    });

    const latestRefreshBlock = screen
      .getByText("最近一次刷新结果")
      .closest(".settings-diagnostics-block");

    expect(latestRefreshBlock).not.toBeNull();

    const latestRefreshScope = within(latestRefreshBlock as HTMLElement);
    const newDiscoveryCard = latestRefreshScope
      .getByText("新增发现设备")
      .closest(".settings-refresh-result-card");
    const existingDevicesCard = latestRefreshScope
      .getByText("刷新前已在线设备")
      .closest(".settings-refresh-result-card");

    expect(newDiscoveryCard).not.toBeNull();
    expect(existingDevicesCard).not.toBeNull();

    const existingDevicesScope = within(existingDevicesCard as HTMLElement);

    expect(
      existingDevicesScope.getByText("刷新前没有已在线设备，你可以立即刷新或查看新增发现设备。"),
    ).toBeInTheDocument();
    expect(
      existingDevicesScope.getByRole("button", { name: "立即刷新" }),
    ).toBeInTheDocument();
    expect(
      existingDevicesScope.getByRole("button", { name: "查看新增发现设备" }),
    ).toBeInTheDocument();

    fireEvent.click(existingDevicesScope.getByRole("button", { name: "查看新增发现设备" }));

    expect(newDiscoveryCard as HTMLElement).toHaveFocus();

    fireEvent.click(existingDevicesScope.getByRole("button", { name: "立即刷新" }));

    expect(mockedRefreshDiscovery).toHaveBeenCalledTimes(2);
  } finally {
    vi.useRealTimers();
  }
});

test("shows direct actions when latest refresh result has no new devices", async () => {
  vi.useFakeTimers();
  try {
    useAppStore.setState((current) => ({
      ...current,
      devices: [
        {
          device_id: "device-a",
          nickname: "Bob",
          host_name: "bob-pc",
          ip_addr: "192.168.10.20",
          message_port: 37001,
          file_port: 37002,
          last_seen_ms: 1000,
        },
      ],
    }));
    mockedGetRuntimeSettings.mockResolvedValue({
      preferences: {
        identity: {
          nickname: "未命名设备",
          deviceNameMode: "NicknameOnly",
          statusMessage: "",
        },
        transfer: {
          downloadDir: "~/Downloads",
          receiveBeforeAccept: true,
          openFolderAfterReceive: true,
          preserveDirectoryStructure: true,
        },
        network: {
          discoveryMode: "ManualSegments",
          manualSegments: ["192.168.10.0/24"],
        },
        display: {
          trayEnabled: true,
          closeAction: "MinimizeToTray",
        },
      },
      runtime: {
        deviceId: "local-device",
        messagePort: 37001,
        filePort: 37002,
      },
    });

    render(<App view="settings" />);

    fireEvent.click(screen.getByRole("button", { name: /网络与发现/ }));

    const mainActions = document.querySelector(".settings-actions");

    expect(mainActions).not.toBeNull();

    const mainActionScope = within(mainActions as HTMLElement);

    await act(async () => {
      fireEvent.click(mainActionScope.getByRole("button", { name: "立即刷新" }));
      await Promise.resolve();
    });

    await act(async () => {
      eventListeners.get("devices-updated")?.({
        payload: [
          {
            device_id: "device-a",
            nickname: "Bob",
            host_name: "bob-pc",
            ip_addr: "192.168.10.20",
            message_port: 37001,
            file_port: 37002,
            last_seen_ms: 1001,
          },
        ],
      });
      await vi.advanceTimersByTimeAsync(1600);
    });

    const latestRefreshBlock = screen
      .getByText("最近一次刷新结果")
      .closest(".settings-diagnostics-block");

    expect(latestRefreshBlock).not.toBeNull();

    const latestRefreshScope = within(latestRefreshBlock as HTMLElement);
    const newDiscoveryCard = latestRefreshScope
      .getByText("新增发现设备")
      .closest(".settings-refresh-result-card");
    const existingDevicesCard = latestRefreshScope
      .getByText("刷新前已在线设备")
      .closest(".settings-refresh-result-card");

    expect(newDiscoveryCard).not.toBeNull();
    expect(existingDevicesCard).not.toBeNull();

    const newDiscoveryScope = within(newDiscoveryCard as HTMLElement);

    expect(
      newDiscoveryScope.getByText(
        "本次没有新增设备，但已有在线设备仍可通信，你可以立即刷新或查看刷新前已在线设备。",
      ),
    ).toBeInTheDocument();
    expect(
      newDiscoveryScope.getByRole("button", { name: "立即刷新" }),
    ).toBeInTheDocument();
    expect(
      newDiscoveryScope.getByRole("button", { name: "查看刷新前已在线设备" }),
    ).toBeInTheDocument();

    fireEvent.click(
      newDiscoveryScope.getByRole("button", { name: "查看刷新前已在线设备" }),
    );

    expect(existingDevicesCard as HTMLElement).toHaveFocus();

    fireEvent.click(newDiscoveryScope.getByRole("button", { name: "立即刷新" }));

    expect(mockedRefreshDiscovery).toHaveBeenCalledTimes(2);
  } finally {
    vi.useRealTimers();
  }
});

test("shows direct prompt when refresh finds no online devices", async () => {
  vi.useFakeTimers();
  try {
    mockedGetRuntimeSettings.mockResolvedValue({
      preferences: {
        identity: {
          nickname: "未命名设备",
          deviceNameMode: "NicknameOnly",
          statusMessage: "",
        },
        transfer: {
          downloadDir: "~/Downloads",
          receiveBeforeAccept: true,
          openFolderAfterReceive: true,
          preserveDirectoryStructure: true,
        },
        network: {
          discoveryMode: "ManualSegments",
          manualSegments: ["192.168.10.0/24"],
        },
        display: {
          trayEnabled: true,
          closeAction: "MinimizeToTray",
        },
      },
      runtime: {
        deviceId: "local-device",
        messagePort: 37001,
        filePort: 37002,
      },
    });

    render(<App view="settings" />);

    fireEvent.click(screen.getByRole("button", { name: /网络与发现/ }));

    const mainActions = document.querySelector(".settings-actions");

    expect(mainActions).not.toBeNull();

    const mainActionScope = within(mainActions as HTMLElement);

    await act(async () => {
      fireEvent.click(mainActionScope.getByRole("button", { name: "立即刷新" }));
      await Promise.resolve();
    });

    await act(async () => {
      eventListeners.get("devices-updated")?.({
        payload: [],
      });
      await vi.advanceTimersByTimeAsync(1600);
    });

    expect(
      screen.getByText("当前未发现任何在线设备，你可以重新扫描或切换发现方式。"),
    ).toBeInTheDocument();
    const emptyDiscoveryCard = screen
      .getByText("新增发现设备")
      .closest(".settings-refresh-result-card");

    expect(emptyDiscoveryCard).not.toBeNull();

    const emptyDiscoveryScope = within(emptyDiscoveryCard as HTMLElement);

    expect(emptyDiscoveryScope.getByRole("button", { name: "重新扫描" })).toBeInTheDocument();
    expect(
      emptyDiscoveryScope.getByRole("button", { name: "切换发现方式" }),
    ).toBeInTheDocument();

    fireEvent.click(emptyDiscoveryScope.getByRole("button", { name: "切换发现方式" }));

    expect(screen.getByLabelText("发现方式")).toHaveFocus();

    fireEvent.click(emptyDiscoveryScope.getByRole("button", { name: "重新扫描" }));

    expect(mockedRefreshDiscovery).toHaveBeenCalledTimes(2);
  } finally {
    vi.useRealTimers();
  }
});

test("shows direct prompt when configured segments are unavailable", async () => {
  vi.useFakeTimers();
  try {
    mockedGetRuntimeSettings.mockResolvedValue({
      preferences: {
        identity: {
          nickname: "未命名设备",
          deviceNameMode: "NicknameOnly",
          statusMessage: "",
        },
        transfer: {
          downloadDir: "~/Downloads",
          receiveBeforeAccept: true,
          openFolderAfterReceive: true,
          preserveDirectoryStructure: true,
        },
        network: {
          discoveryMode: "ManualSegments",
          manualSegments: ["10.0.0.0/24"],
        },
        display: {
          trayEnabled: true,
          closeAction: "MinimizeToTray",
        },
      },
      runtime: {
        deviceId: "local-device",
        messagePort: 37001,
        filePort: 37002,
      },
    });

    render(<App view="settings" />);

    fireEvent.click(screen.getByRole("button", { name: /网络与发现/ }));

    const mainActions = document.querySelector(".settings-actions");

    expect(mainActions).not.toBeNull();

    const mainActionScope = within(mainActions as HTMLElement);

    await act(async () => {
      fireEvent.click(mainActionScope.getByRole("button", { name: "立即刷新" }));
      await Promise.resolve();
    });

    await act(async () => {
      eventListeners.get("devices-updated")?.({
        payload: [
          {
            device_id: "device-a",
            nickname: "Alice",
            host_name: "alice-pc",
            ip_addr: "192.168.1.10",
            message_port: 37001,
            file_port: 37002,
            last_seen_ms: 1000,
          },
        ],
      });
      await vi.advanceTimersByTimeAsync(1600);
    });

    const latestRefreshBlock = screen
      .getByText("最近一次刷新结果")
      .closest(".settings-diagnostics-block");

    expect(latestRefreshBlock).not.toBeNull();

    const unmatchedResultCard = within(latestRefreshBlock as HTMLElement)
      .getByText("当前配置网段仍未命中")
      .closest(".settings-refresh-result-card");

    expect(unmatchedResultCard).not.toBeNull();

    const unmatchedResultScope = within(unmatchedResultCard as HTMLElement);

    expect(
      unmatchedResultScope.getByText(
        "当前配置网段暂不可用，你可以重新扫描或直接更改手动网段。",
      ),
    ).toBeInTheDocument();
    expect(unmatchedResultScope.getByRole("button", { name: "重新扫描" })).toBeInTheDocument();
    expect(unmatchedResultScope.getByRole("button", { name: "更改网段" })).toBeInTheDocument();

    fireEvent.click(unmatchedResultScope.getByRole("button", { name: "更改网段" }));

    expect(screen.getByLabelText("手动网段")).toHaveFocus();

    fireEvent.click(unmatchedResultScope.getByRole("button", { name: "重新扫描" }));

    expect(mockedRefreshDiscovery).toHaveBeenCalledTimes(2);
  } finally {
    vi.useRealTimers();
  }
});

test("shows refresh failure hint when discovery refresh command fails", async () => {
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "未命名设备",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "~/Downloads",
        receiveBeforeAccept: true,
        openFolderAfterReceive: true,
        preserveDirectoryStructure: true,
      },
      network: {
        discoveryMode: "ManualSegments",
        manualSegments: ["192.168.10.0/24"],
      },
      display: {
        trayEnabled: true,
        closeAction: "MinimizeToTray",
      },
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedRefreshDiscovery.mockRejectedValueOnce(new Error("boom"));

  render(<App view="settings" />);

  fireEvent.click(screen.getByRole("button", { name: /网络与发现/ }));

  const mainActions = document.querySelector(".settings-actions");

  expect(mainActions).not.toBeNull();

  const mainActionScope = within(mainActions as HTMLElement);

  await act(async () => {
    fireEvent.click(mainActionScope.getByRole("button", { name: "立即刷新" }));
    await Promise.resolve();
  });

  const latestRefreshBlock = screen
    .getByText("最近一次刷新结果")
    .closest(".settings-diagnostics-block") as HTMLElement;

  expect(screen.getAllByText("刷新失败").length).toBeGreaterThan(0);
  expect(
    within(latestRefreshBlock).getAllByText("刷新失败，请检查本机网络权限或稍后重试。")
      .length,
  ).toBeGreaterThan(0);
  expect(
    within(latestRefreshBlock).getByRole("button", { name: "立即重试" }),
  ).toBeInTheDocument();
  expect(
    within(latestRefreshBlock).getByRole("button", { name: "查看建议排查" }),
  ).toBeInTheDocument();
  expect(screen.getByText("最近刷新历史")).toBeInTheDocument();
  expect(
    screen.getByText("刷新失败 · 请检查本机网络权限或稍后重试。"),
  ).toBeInTheDocument();
});

test("shows failure guidance and copy actions in latest refresh result", async () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date("2024-04-16T18:50:00"));
    const clipboardWriteText = vi.spyOn(window.navigator.clipboard, "writeText");
    clipboardWriteText.mockResolvedValue();

    mockedGetRuntimeSettings.mockResolvedValue({
      preferences: {
        identity: {
          nickname: "未命名设备",
          deviceNameMode: "NicknameOnly",
          statusMessage: "",
        },
        transfer: {
          downloadDir: "~/Downloads",
          receiveBeforeAccept: true,
          openFolderAfterReceive: true,
          preserveDirectoryStructure: true,
        },
        network: {
          discoveryMode: "ManualSegments",
          manualSegments: ["192.168.10.0/24"],
        },
        display: {
          trayEnabled: true,
          closeAction: "MinimizeToTray",
        },
      },
      runtime: {
        deviceId: "local-device",
        messagePort: 37001,
        filePort: 37002,
      },
    });
    mockedRefreshDiscovery.mockRejectedValueOnce(new Error("boom"));

    render(<App view="settings" />);

    fireEvent.click(screen.getByRole("button", { name: /网络与发现/ }));

    const mainActions = document.querySelector(".settings-actions");

    expect(mainActions).not.toBeNull();

    const mainActionScope = within(mainActions as HTMLElement);

    await act(async () => {
      fireEvent.click(mainActionScope.getByRole("button", { name: "立即刷新" }));
      await Promise.resolve();
    });

    const latestRefreshBlock = screen
      .getByText("最近一次刷新结果")
      .closest(".settings-diagnostics-block") as HTMLElement;

    expect(screen.getByText("最近一次刷新结果")).toBeInTheDocument();
    expect(
      within(latestRefreshBlock).getAllByText("刷新失败，请检查本机网络权限或稍后重试。")
        .length,
    ).toBeGreaterThan(0);
    expect(
      within(latestRefreshBlock).getByRole("button", { name: "立即重试" }),
    ).toBeInTheDocument();
    expect(
      within(latestRefreshBlock).getByRole("button", { name: "查看建议排查" }),
    ).toBeInTheDocument();
    expect(within(latestRefreshBlock).getByText("建议排查")).toBeInTheDocument();
    expect(
      within(latestRefreshBlock).getByRole("button", { name: "复制失败原因" }),
    ).toBeInTheDocument();
    expect(
      within(latestRefreshBlock).getByRole("button", { name: "复制诊断摘要" }),
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(
        within(latestRefreshBlock).getByRole("button", { name: "复制诊断摘要" }),
      );
      await Promise.resolve();
    });

    expect(clipboardWriteText).toHaveBeenCalledWith(
      "最近失败时间：2024-04-16 18:50:00\n当前发现方式：手动网段广播 + 主机主动探测\n当前手动网段：192.168.10.0/24\n失败概览：最近连续失败 1 次；当前手动网段 1 个，未命中 0 个\n建议动作：请先在本机确认网络权限和防火墙放行，再重新刷新一次。\n建议联系对象：优先本机处理\n建议重试时机：完成本机权限和防火墙检查后立即重试。\n失败原因：刷新失败，请检查本机网络权限或稍后重试。\n连续失败次数：1 次\n建议排查：\n- 确认应用已获得本机网络访问权限，必要时重新以管理员身份启动。\n- 检查系统防火墙或安全软件是否拦截了局域网广播、UDP 端口或文件端口。",
    );
    expect(screen.getByText("诊断摘要已复制")).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

test("auto accepts incoming delivery when receive-before-accept is disabled", async () => {
  mockedGetRuntimeSettings.mockResolvedValue({
    preferences: {
      identity: {
        nickname: "未命名设备",
        deviceNameMode: "NicknameOnly",
        statusMessage: "",
      },
      transfer: {
        downloadDir: "D:/LAN/Downloads",
        receiveBeforeAccept: false,
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
    },
    runtime: {
      deviceId: "local-device",
      messagePort: 37001,
      filePort: 37002,
    },
  });
  mockedListDevices.mockResolvedValue([
    {
      device_id: "device-a",
      nickname: "Alice",
      host_name: "alice-pc",
      ip_addr: "192.168.1.10",
      message_port: 37001,
      file_port: 37002,
      last_seen_ms: 1000,
      status_message: "在线",
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  act(() => {
    eventListeners.get("chat-message-received")?.({
      payload: {
        message_id: "req-auto-1",
        from_device_id: "device-a",
        to_device_id: "local-device",
        content: "delivery request",
        sent_at_ms: 1002,
        kind: "delivery",
        delivery: {
          request_id: "req-auto-1",
          status: "PendingDecision",
          save_root: null,
          entries: [
            {
              entry_id: "entry-1",
              display_name: "demo.txt",
              relative_path: "demo.txt",
              file_size: 12,
              kind: "File",
            },
          ],
        },
      },
    });
  });

  await waitFor(() => {
    expect(mockedSendDeliveryResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "req-auto-1",
        decision: "Accepted",
        saveRoot: "D:/LAN/Downloads",
      }),
    );
  });
});

test("shows display settings and updates shared settings state", async () => {
  const user = userEvent.setup();

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /显示与通用/ }));

  expect(screen.getByLabelText("托盘显示")).toBeInTheDocument();
  expect(screen.getByLabelText("关闭窗口行为")).toBeInTheDocument();

  await user.click(screen.getByLabelText("托盘显示"));
  await user.selectOptions(screen.getByLabelText("关闭窗口行为"), "Exit");

  expect(useAppStore.getState().settings.preferences.display.trayEnabled).toBe(false);
  expect(useAppStore.getState().settings.preferences.display.closeAction).toBe("Exit");
});

test("shows chat settings and updates shared settings state", async () => {
  const user = userEvent.setup();

  render(<App view="settings" />);

  await user.click(screen.getByRole("button", { name: /聊天与通知/ }));

  expect(screen.getByLabelText("Enter 发送消息")).toBeInTheDocument();
  expect(screen.getByLabelText("广播前确认")).toBeInTheDocument();
  expect(screen.getByLabelText("收到单聊自动切换到来源会话")).toBeInTheDocument();
  expect(screen.getByLabelText("收到文件投递自动切换到来源会话")).toBeInTheDocument();

  await user.click(screen.getByLabelText("Enter 发送消息"));
  await user.click(screen.getByLabelText("广播前确认"));
  await user.click(screen.getByLabelText("收到单聊自动切换到来源会话"));
  await user.click(screen.getByLabelText("收到文件投递自动切换到来源会话"));

  expect(useAppStore.getState().settings.preferences.chat).toEqual({
    enterToSend: true,
    confirmBeforeBroadcast: false,
    autoSwitchToIncomingDirect: true,
    autoSwitchToIncomingDelivery: false,
  });
});
