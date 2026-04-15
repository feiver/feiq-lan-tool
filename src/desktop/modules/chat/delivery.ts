export type PendingDeliveryEntry = {
  source_path: string;
  display_name: string;
  relative_path: string;
  group_name: string | null;
  kind: "file" | "directory";
  file_size: number;
};

type PendingDeliveryGroupSummary = {
  groupName: string;
  entryCount: number;
  totalBytes: number;
  containsDirectory: boolean;
};

type PendingDeliveryFileSummary = {
  displayName: string;
  fileSize: number;
};

type PendingDeliverySummary = {
  groups: PendingDeliveryGroupSummary[];
  files: PendingDeliveryFileSummary[];
  totalEntryCount: number;
  hasDirectoryLikeEntries: boolean;
};

export function createPendingFileEntries(paths: string[]): PendingDeliveryEntry[] {
  return paths
    .filter((path) => path.trim().length > 0)
    .map((path) => ({
      source_path: path,
      display_name: getPathBaseName(path),
      relative_path: getPathBaseName(path),
      group_name: null,
      kind: "file" as const,
      file_size: 0,
    }));
}

export function createPendingDirectoryEntry(path: string): PendingDeliveryEntry {
  const displayName = getPathBaseName(path);

  return {
    source_path: path,
    display_name: displayName,
    relative_path: displayName,
    group_name: displayName,
    kind: "directory",
    file_size: 0,
  };
}

export function createPendingEntriesFromDroppedPaths(
  paths: string[],
): PendingDeliveryEntry[] {
  return paths.map((path) =>
    looksLikeDirectoryPath(path)
      ? createPendingDirectoryEntry(path)
      : createPendingFileEntries([path])[0],
  );
}

export function mergePendingDeliveryEntries(
  existing: PendingDeliveryEntry[],
  incoming: PendingDeliveryEntry[],
): PendingDeliveryEntry[] {
  const seen = new Set(existing.map(createEntryKey));
  const merged = [...existing];

  for (const entry of incoming) {
    const key = createEntryKey(entry);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(entry);
  }

  return merged;
}

export function summarizeDeliverySelection(
  entries: PendingDeliveryEntry[],
): PendingDeliverySummary {
  const groups = new Map<
    string,
    {
      entryCount: number;
      totalBytes: number;
      containsDirectory: boolean;
    }
  >();
  const files: PendingDeliveryFileSummary[] = [];

  for (const entry of entries) {
    if (entry.group_name) {
      const current = groups.get(entry.group_name) ?? {
        entryCount: 0,
        totalBytes: 0,
        containsDirectory: false,
      };

      if (entry.kind === "directory") {
        current.containsDirectory = true;
      } else {
        current.entryCount += 1;
        current.totalBytes += entry.file_size;
      }

      groups.set(entry.group_name, current);
      continue;
    }

    files.push({
      displayName: entry.display_name,
      fileSize: entry.file_size,
    });
  }

  return {
    groups: [...groups.entries()].map(([groupName, summary]) => ({
      groupName,
      entryCount: summary.entryCount > 0 ? summary.entryCount : 1,
      totalBytes: summary.totalBytes,
      containsDirectory: summary.containsDirectory,
    })),
    files,
    totalEntryCount: entries.length,
    hasDirectoryLikeEntries: groups.size > 0,
  };
}

function createEntryKey(entry: PendingDeliveryEntry): string {
  return [entry.kind, entry.source_path, entry.relative_path, entry.group_name ?? ""].join("::");
}

function getPathBaseName(path: string): string {
  const segments = path.split(/[\\/]/).filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : path;
}

function looksLikeDirectoryPath(path: string): boolean {
  const baseName = getPathBaseName(path);
  return !baseName.includes(".");
}
