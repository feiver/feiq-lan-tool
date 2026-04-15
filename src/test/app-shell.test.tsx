import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

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
  };
});

const mockedListDevices = vi.mocked(desktopApi.listDevices);
const mockedListTransfers = vi.mocked(desktopApi.listTransfers);

beforeEach(() => {
  mockedListDevices.mockReset();
  mockedListTransfers.mockReset();
  mockedListDevices.mockResolvedValue([]);
  mockedListTransfers.mockResolvedValue([]);
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
