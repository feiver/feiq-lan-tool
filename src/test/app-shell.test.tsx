import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { useAppStore } from "../app/store";
import App from "../App";
import * as desktopApi from "../desktop/api";

vi.mock("../desktop/api", async () => {
  const actual = await vi.importActual<typeof import("../desktop/api")>(
    "../desktop/api",
  );

  return {
    ...actual,
    listDevices: vi.fn(),
    listTransfers: vi.fn(),
    sendDirectMessage: vi.fn(),
    sendBroadcastMessage: vi.fn(),
  };
});

const mockedListDevices = vi.mocked(desktopApi.listDevices);
const mockedListTransfers = vi.mocked(desktopApi.listTransfers);
const mockedSendDirectMessage = vi.mocked(desktopApi.sendDirectMessage);
const mockedSendBroadcastMessage = vi.mocked(desktopApi.sendBroadcastMessage);

beforeEach(() => {
  useAppStore.setState({
    devices: [],
    transfers: [],
    selectedDeviceId: null,
  });
  mockedListDevices.mockReset();
  mockedListTransfers.mockReset();
  mockedSendDirectMessage.mockReset();
  mockedSendBroadcastMessage.mockReset();
  mockedListDevices.mockResolvedValue([]);
  mockedListTransfers.mockResolvedValue([]);
  mockedSendDirectMessage.mockResolvedValue();
  mockedSendBroadcastMessage.mockResolvedValue();
});

test("renders three primary panels", () => {
  render(<App />);

  expect(screen.getByText("在线联系人")).toBeInTheDocument();
  expect(screen.getByText("消息会话")).toBeInTheDocument();
  expect(screen.getByText("传输任务")).toBeInTheDocument();
});

test("renders settings panel", () => {
  render(<App />);

  expect(screen.getByText("本地设置")).toBeInTheDocument();
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
      from_device_id: "device-a",
      to_device_id: "device-b",
      status: "InProgress",
    },
  ]);

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("demo.txt")).toBeInTheDocument();
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
