import { render, screen } from "@testing-library/react";

import App from "../App";

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
