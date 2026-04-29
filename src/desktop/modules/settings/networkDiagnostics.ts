import type {
  DiscoveryMode,
  DiscoveryRefreshHistoryEntry,
  DiscoveryRefreshSegmentStatus,
  DiscoveryRefreshSegmentStatusSummary,
  KnownDevice,
} from "../../types";

export type DiscoveryRefreshFeedback = {
  isRefreshing: boolean;
  lastRefreshAtMs: number | null;
  lastDiscoveredCount: number | null;
  lastNewDeviceLabels: string[];
  lastExistingDeviceLabels: string[];
  lastUnmatchedSegments: string[];
  lastSegmentStatuses: SegmentRefreshStatusSummary[];
  lastErrorMessage: string | null;
  history: DiscoveryRefreshHistoryEntry[];
};

export type ManualSegmentSummary = {
  segment: string;
  hostCount: number;
};

export type DeviceSegmentMatch = {
  deviceId: string;
  label: string;
  matchedSegment: string | null;
};

export type SegmentCoverage = {
  segment: string;
  hostCount: number;
  matchedDeviceCount: number;
};

export type DiscoveryRefreshResultSummary = {
  discoveredCount: number;
  newDeviceLabels: string[];
  existingDeviceLabels: string[];
  unmatchedSegments: string[];
  segmentStatuses: SegmentRefreshStatusSummary[];
};

export type SegmentRefreshStatus = DiscoveryRefreshSegmentStatus;
export type SegmentRefreshStatusSummary = DiscoveryRefreshSegmentStatusSummary;

export type RefreshHistorySummary = {
  successRate: number;
  consecutiveFailureCount: number;
  latestFailureAt: number | null;
};

export type RefreshHistoryTone = "is-success" | "is-warning" | "is-danger";

type RefreshFailureCategory =
  | "permission"
  | "segment"
  | "presence"
  | "generic";

export function isValidIpv4Cidr(value: string): boolean {
  const match = value.trim().match(
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\/(\d|[12]\d|3[0-2])$/,
  );

  return Boolean(match);
}

export function formatRefreshTime(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => value.toString().padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}`;
}

export function getDiscoveryModeDescription(mode: DiscoveryMode): string {
  switch (mode) {
    case "Auto":
      return "全局广播发现";
    case "CurrentSegmentOnly":
      return "仅当前网段广播";
    case "ManualSegments":
      return "手动网段广播 + 主机主动探测";
    default:
      return "未知方式";
  }
}

export function buildManualSegmentSummaries(
  manualSegments: string[],
): ManualSegmentSummary[] {
  return manualSegments
    .filter((segment) => isValidIpv4Cidr(segment))
    .map((segment) => ({
      segment,
      hostCount: countHostsInSegment(segment),
    }));
}

export function totalManualProbeHosts(segments: ManualSegmentSummary[]): number {
  return segments.reduce((total, segment) => total + segment.hostCount, 0);
}

export function matchDevicesToManualSegments(
  devices: KnownDevice[],
  segments: ManualSegmentSummary[],
): DeviceSegmentMatch[] {
  return devices.map((device) => {
    const matchedSegment =
      segments.find((segment) => isIpInSegment(device.ip_addr, segment.segment))?.segment ??
      null;

    return {
      deviceId: device.device_id,
      label: `${device.nickname} · ${device.ip_addr}`,
      matchedSegment,
    };
  });
}

export function buildManualSegmentCoverage(
  segments: ManualSegmentSummary[],
  deviceMatches: DeviceSegmentMatch[],
): SegmentCoverage[] {
  return segments.map((segment) => ({
    segment: segment.segment,
    hostCount: segment.hostCount,
    matchedDeviceCount: deviceMatches.filter(
      (device) => device.matchedSegment === segment.segment,
    ).length,
  }));
}

export function buildRefreshResultSummary(params: {
  devices: KnownDevice[];
  baselineDeviceIds: Set<string>;
  manualSegments: string[];
  discoveryMode: DiscoveryMode;
}): DiscoveryRefreshResultSummary {
  const { devices, baselineDeviceIds, manualSegments, discoveryMode } = params;
  const newDeviceLabels = devices
    .filter((device) => !baselineDeviceIds.has(device.device_id))
    .map(labelKnownDevice);
  const existingDeviceLabels = devices
    .filter((device) => baselineDeviceIds.has(device.device_id))
    .map(labelKnownDevice);

  let unmatchedSegments: string[] = [];
  let segmentStatuses: SegmentRefreshStatusSummary[] = [];
  if (discoveryMode === "ManualSegments") {
    const summaries = buildManualSegmentSummaries(manualSegments);
    const newMatches = matchDevicesToManualSegments(
      devices.filter((device) => !baselineDeviceIds.has(device.device_id)),
      summaries,
    );
    const existingMatches = matchDevicesToManualSegments(
      devices.filter((device) => baselineDeviceIds.has(device.device_id)),
      summaries,
    );

    segmentStatuses = summaries.map((segment) => {
      const newDeviceCount = newMatches.filter(
        (device) => device.matchedSegment === segment.segment,
      ).length;
      const existingDeviceCount = existingMatches.filter(
        (device) => device.matchedSegment === segment.segment,
      ).length;
      const status =
        newDeviceCount > 0
          ? "NewlyMatched"
          : existingDeviceCount > 0
            ? "AlreadyOnline"
            : "Unmatched";

      return {
        segment: segment.segment,
        status,
        newDeviceCount,
        existingDeviceCount,
      };
    });
    unmatchedSegments = segmentStatuses
      .filter((segment) => segment.status === "Unmatched")
      .map((segment) => segment.segment);
  }

  return {
    discoveredCount: newDeviceLabels.length,
    newDeviceLabels,
    existingDeviceLabels,
    unmatchedSegments,
    segmentStatuses,
  };
}

export function getSegmentRefreshStatusLabel(status: SegmentRefreshStatus): string {
  switch (status) {
    case "NewlyMatched":
      return "本次新增命中";
    case "AlreadyOnline":
      return "已有在线设备";
    case "Unmatched":
      return "当前未命中";
    default:
      return "未知状态";
  }
}

export function formatRefreshHistoryEntry(
  entry: DiscoveryRefreshHistoryEntry,
): string {
  if (entry.status === "Failed") {
    return `刷新失败 · ${entry.message}`;
  }

  return `已完成 · 新增 ${entry.discoveredCount} 台 · 已在线 ${entry.existingCount} 台 · 未命中 ${entry.unmatchedSegmentCount} 个网段`;
}

export function buildRefreshHistorySummary(
  history: DiscoveryRefreshHistoryEntry[],
): RefreshHistorySummary {
  if (history.length === 0) {
    return {
      successRate: 0,
      consecutiveFailureCount: 0,
      latestFailureAt: null,
    };
  }

  const succeededCount = history.filter((entry) => entry.status === "Succeeded").length;
  let consecutiveFailureCount = 0;
  for (const entry of history) {
    if (entry.status !== "Failed") {
      break;
    }

    consecutiveFailureCount += 1;
  }

  return {
    successRate: Math.round((succeededCount / history.length) * 100),
    consecutiveFailureCount,
    latestFailureAt:
      history.find((entry) => entry.status === "Failed")?.timestamp ?? null,
  };
}

export function getLatestFailureTone(
  latestFailureAt: number | null,
  nowMs: number = Date.now(),
): RefreshHistoryTone {
  if (latestFailureAt === null) {
    return "is-success";
  }

  const elapsedMs = Math.max(0, nowMs - latestFailureAt);
  const thirtyMinutesMs = 30 * 60 * 1000;
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;

  if (elapsedMs <= thirtyMinutesMs) {
    return "is-danger";
  }
  if (elapsedMs <= twentyFourHoursMs) {
    return "is-warning";
  }

  return "is-success";
}

export function buildRefreshFailureSuggestions(
  entry: DiscoveryRefreshHistoryEntry,
): string[] {
  switch (getRefreshFailureCategory(entry)) {
    case "permission":
      return [
        "确认应用已获得本机网络访问权限，必要时重新以管理员身份启动。",
        "检查系统防火墙或安全软件是否拦截了局域网广播、UDP 端口或文件端口。",
      ];
    case "segment":
      return [
        "检查手动网段配置是否写对，尤其确认 CIDR、子网掩码和目标网段范围。",
        "如果对端在其他网段，确认它的实际 IP 仍落在当前配置的辅助发现网段内。",
      ];
    case "presence":
      return [
        "确认对端设备与您处于同一局域网，并保持应用在线且未进入休眠。",
        "可让对端手动刷新一次在线状态，或先尝试通过当前网段重新发现。",
      ];
    default:
      return [
        "先检查本机网络权限、手动网段配置与对端在线状态，再重新执行一次发现刷新。",
        "如果问题持续出现，可复制诊断摘要并结合最近失败时间继续排查。",
      ];
  }
}

export function buildRefreshFailureActionSummary(
  entry: DiscoveryRefreshHistoryEntry,
): string {
  switch (getRefreshFailureCategory(entry)) {
    case "permission":
      return "请先在本机确认网络权限和防火墙放行，再重新刷新一次。";
    case "segment":
      return "请先核对手动网段 CIDR 配置，并让对端确认实际 IP 仍在这些网段内后再刷新。";
    case "presence":
      return "请先让对端保持在线并手动刷新一次在线状态，再重新发现。";
    default:
      return "请先检查本机权限、网段配置和对端在线状态，再重新执行一次发现刷新。";
  }
}

export function buildRefreshFailureContactSummary(
  entry: DiscoveryRefreshHistoryEntry,
): string {
  switch (getRefreshFailureCategory(entry)) {
    case "permission":
      return "优先本机处理";
    case "segment":
      return "本机与对端都需要确认";
    case "presence":
      return "优先联系对端配合";
    default:
      return "本机与对端都建议确认";
  }
}

export function buildRefreshFailureRetryTimingSummary(
  entry: DiscoveryRefreshHistoryEntry,
): string {
  switch (getRefreshFailureCategory(entry)) {
    case "permission":
      return "完成本机权限和防火墙检查后立即重试。";
    case "segment":
      return "确认网段配置修正且对端 IP 信息核对完成后再重试。";
    case "presence":
      return "等待对端恢复在线并手动刷新状态后再重试。";
    default:
      return "完成本机网络、网段与在线状态的基础检查后再重试。";
  }
}

function getRefreshFailureCategory(
  entry: DiscoveryRefreshHistoryEntry,
): RefreshFailureCategory {
  const message = entry.message.toLowerCase();

  if (
    message.includes("权限") ||
    message.includes("拒绝") ||
    message.includes("permission") ||
    message.includes("access denied") ||
    message.includes("denied") ||
    message.includes("forbidden") ||
    message.includes("firewall") ||
    message.includes("防火墙")
  ) {
    return "permission";
  }

  if (
    message.includes("网段") ||
    message.includes("子网") ||
    message.includes("掩码") ||
    message.includes("cidr") ||
    message.includes("subnet") ||
    message.includes("mask") ||
    message.includes("segment") ||
    entry.unmatchedSegmentCount > 0
  ) {
    return "segment";
  }

  if (
    message.includes("在线") ||
    message.includes("离线") ||
    message.includes("无响应") ||
    message.includes("未发现") ||
    message.includes("offline") ||
    message.includes("no response") ||
    message.includes("timeout") ||
    message.includes("超时") ||
    message.includes("unreachable") ||
    message.includes("不可达")
  ) {
    return "presence";
  }

  return "generic";
}

function countHostsInSegment(segment: string): number {
  const parsed = parseCidr(segment);
  if (!parsed) {
    return 0;
  }

  const hostBits = 32 - parsed.prefix;
  if (parsed.prefix === 32) {
    return 1;
  }
  if (parsed.prefix === 31) {
    return 2;
  }
  if (hostBits <= 1) {
    return 0;
  }

  return 2 ** hostBits - 2;
}

function isIpInSegment(ip: string, segment: string): boolean {
  const parsed = parseCidr(segment);
  const ipValue = parseIpv4ToInt(ip);
  if (!parsed || ipValue === null) {
    return false;
  }

  const mask = parsed.prefix === 0 ? 0 : (0xffffffff << (32 - parsed.prefix)) >>> 0;
  return (ipValue & mask) >>> 0 === parsed.network;
}

function parseCidr(segment: string): { prefix: number; network: number } | null {
  const [ip, prefixText] = segment.split("/");
  if (!ip || !prefixText) {
    return null;
  }

  const prefix = Number(prefixText);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return null;
  }

  const ipValue = parseIpv4ToInt(ip);
  if (ipValue === null) {
    return null;
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return {
    prefix,
    network: (ipValue & mask) >>> 0,
  };
}

function parseIpv4ToInt(ip: string): number | null {
  const octets = ip.split(".");
  if (octets.length !== 4) {
    return null;
  }

  const values = octets.map((octet) => Number(octet));
  if (
    values.some(
      (value) =>
        !Number.isInteger(value) || value < 0 || value > 255,
    )
  ) {
    return null;
  }

  return (
    ((values[0] << 24) >>> 0) +
    ((values[1] << 16) >>> 0) +
    ((values[2] << 8) >>> 0) +
    values[3]
  ) >>> 0;
}

function labelKnownDevice(device: KnownDevice): string {
  return `${device.nickname} · ${device.ip_addr}`;
}
