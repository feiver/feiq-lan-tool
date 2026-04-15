import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { useAppStore } from "../app/store";
import App from "../App";
import * as desktopApi from "../desktop/api";
import * as eventApi from "@tauri-apps/api/event";
import * as windowApi from "@tauri-apps/api/window";
import type { KnownDevice } from "../desktop/types";

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
    syncRuntimeSettings: vi.fn(),
    pickDeliveryFiles: vi.fn(),
    pickDeliveryDirectory: vi.fn(),
    sendFileToDevice: vi.fn(),
    sendDirectMessage: vi.fn(),
    sendBroadcastMessage: vi.fn(),
  };
});

const mockedListDevices = vi.mocked(desktopApi.listDevices);
const mockedListMessages = vi.mocked(desktopApi.listMessages);
const mockedListTransfers = vi.mocked(desktopApi.listTransfers);
const mockedGetRuntimeSettings = vi.mocked(desktopApi.getRuntimeSettings);
const mockedSyncRuntimeSettings = vi.mocked(desktopApi.syncRuntimeSettings);
const mockedPickDeliveryFiles = vi.mocked(desktopApi.pickDeliveryFiles);
const mockedPickDeliveryDirectory = vi.mocked(desktopApi.pickDeliveryDirectory);
const mockedSendFileToDevice = vi.mocked(desktopApi.sendFileToDevice);
const mockedSendDirectMessage = vi.mocked(desktopApi.sendDirectMessage);
const mockedSendBroadcastMessage = vi.mocked(desktopApi.sendBroadcastMessage);
const mockedListen = vi.mocked(eventApi.listen);
const mockedGetCurrentWindow = vi.mocked(windowApi.getCurrentWindow);

beforeEach(() => {
  useAppStore.setState({
    devices: [],
    messages: [],
    transfers: [],
    selectedDeviceId: null,
    settings: {
      deviceId: "local-device",
      nickname: "未命名设备",
      downloadDir: "~/Downloads",
    },
    settingsReady: true,
  });
  mockedListDevices.mockReset();
  mockedListMessages.mockReset();
  mockedListTransfers.mockReset();
  mockedGetRuntimeSettings.mockReset();
  mockedSyncRuntimeSettings.mockReset();
  mockedPickDeliveryFiles.mockReset();
  mockedPickDeliveryDirectory.mockReset();
  mockedSendFileToDevice.mockReset();
  mockedSendDirectMessage.mockReset();
  mockedSendBroadcastMessage.mockReset();
  mockedListen.mockClear();
  mockedUnlisten.mockReset();
  mockedGetCurrentWindow.mockClear();
  mockedOnDragDropEvent.mockClear();
  mockedWindowUnlisten.mockReset();
  eventListeners.clear();
  mockedListDevices.mockResolvedValue([]);
  mockedListMessages.mockResolvedValue([]);
  mockedListTransfers.mockResolvedValue([]);
  mockedGetRuntimeSettings.mockResolvedValue({
    deviceId: "local-device",
    nickname: "未命名设备",
    downloadDir: "~/Downloads",
  });
  mockedSyncRuntimeSettings.mockResolvedValue();
  mockedPickDeliveryFiles.mockResolvedValue([]);
  mockedPickDeliveryDirectory.mockResolvedValue(null);
  mockedSendFileToDevice.mockResolvedValue();
  mockedSendDirectMessage.mockResolvedValue();
  mockedSendBroadcastMessage.mockResolvedValue();
});

test("renders three primary panels", () => {
  render(<App />);

  expect(screen.getByText("在线联系人")).toBeInTheDocument();
  expect(screen.getByText("消息会话")).toBeInTheDocument();
  expect(screen.getByText("传输任务")).toBeInTheDocument();
});

test("shows helpful empty state when no contacts are online", () => {
  render(<App />);

  return waitFor(() => {
    expect(screen.getByText("暂未发现在线设备")).toBeInTheDocument();
    expect(screen.getByText("请确认对方与您处于同一局域网，并保持应用在线。")).toBeInTheDocument();
  });
});

test("renders settings panel", () => {
  render(<App />);

  expect(screen.getByText("本地设置")).toBeInTheDocument();
});

test("loads persisted settings from desktop api", async () => {
  mockedGetRuntimeSettings.mockResolvedValue({
    deviceId: "persisted-device",
    nickname: "飞秋助手",
    downloadDir: "D:/LAN/Downloads",
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByDisplayValue("飞秋助手")).toBeInTheDocument();
    expect(screen.getByDisplayValue("D:/LAN/Downloads")).toBeInTheDocument();
  });
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
      to_device_id: "device-b",
      status: "InProgress",
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("demo.txt")).toBeInTheDocument();
    expect(screen.getByText("来自 Alice")).toBeInTheDocument();
    expect(screen.getByText("50% · 6 B / 12 B")).toBeInTheDocument();
    expect(screen.getByText("传输中")).toBeInTheDocument();
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

test("shows transfer task when transfer event arrives", async () => {
  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("传输任务")).toBeInTheDocument();
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

test("shows outgoing transfer direction and localized status", async () => {
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
    expect(screen.getByText("design.pdf")).toBeInTheDocument();
    expect(screen.getByText("发送至 Alice")).toBeInTheDocument();
    expect(screen.getByText("传输中")).toBeInTheDocument();
    expect(screen.getByText("40% · 40 B / 100 B")).toBeInTheDocument();
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
    expect(screen.getByText("已完成")).toBeInTheDocument();
    expect(screen.getByText("100% · 200 B / 200 B")).toBeInTheDocument();
  });
});

test("shows transferred bytes when total file size is unknown", async () => {
  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("传输任务")).toBeInTheDocument();
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

test("sends selected standalone files through the legacy file transfer command", async () => {
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
    expect(mockedSendFileToDevice).toHaveBeenCalledWith(
      "192.168.1.10:37002",
      "C:\\temp\\demo.txt",
      "device-a",
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
  render(<App />);

  const nicknameInput = screen.getByDisplayValue("未命名设备");
  fireEvent.change(nicknameInput, { target: { value: "局域网助手" } });

  expect(useAppStore.getState().settings.nickname).toBe("局域网助手");
});
