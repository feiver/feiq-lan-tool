import { describe, expect, test } from "vitest";

import type { DiscoveryRefreshHistoryEntry } from "../desktop/types";
import {
  buildRefreshFailureActionSummary,
  buildRefreshFailureContactSummary,
  buildRefreshFailureRetryTimingSummary,
  buildRefreshFailureSuggestions,
} from "../desktop/modules/settings/networkDiagnostics";

function createFailedEntry(
  overrides: Partial<DiscoveryRefreshHistoryEntry> = {},
): DiscoveryRefreshHistoryEntry {
  return {
    id: "history-1",
    timestamp: 1713264300000,
    status: "Failed",
    discoveredCount: 0,
    existingCount: 0,
    unmatchedSegmentCount: 0,
    message: "刷新失败。",
    newDeviceLabels: [],
    existingDeviceLabels: [],
    unmatchedSegments: [],
    segmentStatuses: [],
    ...overrides,
  };
}

describe("refresh failure classification", () => {
  test("classifies access denied failures as permission issues", () => {
    const entry = createFailedEntry({
      message: "Access denied while opening local discovery socket.",
    });

    expect(buildRefreshFailureActionSummary(entry)).toBe(
      "请先在本机确认网络权限和防火墙放行，再重新刷新一次。",
    );
    expect(buildRefreshFailureContactSummary(entry)).toBe("优先本机处理");
    expect(buildRefreshFailureRetryTimingSummary(entry)).toBe(
      "完成本机权限和防火墙检查后立即重试。",
    );
  });

  test("classifies subnet wording as segment issues", () => {
    const entry = createFailedEntry({
      message: "Manual subnet mask mismatch detected for helper probe.",
    });

    expect(buildRefreshFailureActionSummary(entry)).toBe(
      "请先核对手动网段 CIDR 配置，并让对端确认实际 IP 仍在这些网段内后再刷新。",
    );
    expect(buildRefreshFailureContactSummary(entry)).toBe(
      "本机与对端都需要确认",
    );
    expect(buildRefreshFailureRetryTimingSummary(entry)).toBe(
      "确认网段配置修正且对端 IP 信息核对完成后再重试。",
    );
  });

  test("classifies offline no-response wording as presence issues", () => {
    const entry = createFailedEntry({
      message: "Peer offline and no response received from the device.",
    });

    expect(buildRefreshFailureActionSummary(entry)).toBe(
      "请先让对端保持在线并手动刷新一次在线状态，再重新发现。",
    );
    expect(buildRefreshFailureContactSummary(entry)).toBe("优先联系对端配合");
    expect(buildRefreshFailureRetryTimingSummary(entry)).toBe(
      "等待对端恢复在线并手动刷新状态后再重试。",
    );
    expect(buildRefreshFailureSuggestions(entry)).toEqual([
      "确认对端设备与您处于同一局域网，并保持应用在线且未进入休眠。",
      "可让对端手动刷新一次在线状态，或先尝试通过当前网段重新发现。",
    ]);
  });

  test("keeps unmatched segment count classified as segment issues", () => {
    const entry = createFailedEntry({
      message: "辅助发现未返回结果。",
      unmatchedSegmentCount: 1,
    });

    expect(buildRefreshFailureContactSummary(entry)).toBe(
      "本机与对端都需要确认",
    );
  });

  test("falls back to generic guidance for unknown failures", () => {
    const entry = createFailedEntry({
      message: "Refresh metadata checksum mismatch.",
    });

    expect(buildRefreshFailureActionSummary(entry)).toBe(
      "请先检查本机权限、网段配置和对端在线状态，再重新执行一次发现刷新。",
    );
    expect(buildRefreshFailureContactSummary(entry)).toBe("本机与对端都建议确认");
    expect(buildRefreshFailureRetryTimingSummary(entry)).toBe(
      "完成本机网络、网段与在线状态的基础检查后再重试。",
    );
  });
});
