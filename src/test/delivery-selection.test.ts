import { describe, expect, test } from "vitest";

import {
  createPendingDirectoryEntry,
  createPendingFileEntries,
  mergePendingDeliveryEntries,
  summarizeDeliverySelection,
} from "../desktop/modules/chat/delivery";

describe("delivery selection helpers", () => {
  test("keeps grouped directories and standalone files separated", () => {
    const entries = [
      {
        source_path: "C:/work/项目资料/图片/logo.png",
        display_name: "logo.png",
        relative_path: "项目资料/图片/logo.png",
        group_name: "项目资料",
        kind: "file" as const,
        file_size: 2048,
      },
      {
        source_path: "C:/work/项目资料/文档/说明.txt",
        display_name: "说明.txt",
        relative_path: "项目资料/文档/说明.txt",
        group_name: "项目资料",
        kind: "file" as const,
        file_size: 512,
      },
      {
        source_path: "C:/work/报价单.xlsx",
        display_name: "报价单.xlsx",
        relative_path: "报价单.xlsx",
        group_name: null,
        kind: "file" as const,
        file_size: 1024,
      },
    ];

    expect(summarizeDeliverySelection(entries)).toEqual({
      groups: [
        {
          groupName: "项目资料",
          entryCount: 2,
          totalBytes: 2560,
          containsDirectory: false,
        },
      ],
      files: [
        {
          displayName: "报价单.xlsx",
          fileSize: 1024,
        },
      ],
      totalEntryCount: 3,
      hasDirectoryLikeEntries: true,
    });
  });

  test("merges repeated selections without duplicating existing entries", () => {
    const initial = createPendingFileEntries([
      "C:/work/报价单.xlsx",
      "C:/work/封面.png",
    ]);

    const merged = mergePendingDeliveryEntries(initial, [
      ...createPendingFileEntries(["C:/work/封面.png"]),
      createPendingDirectoryEntry("C:/work/项目资料"),
    ]);

    expect(merged).toEqual([
      {
        source_path: "C:/work/报价单.xlsx",
        display_name: "报价单.xlsx",
        relative_path: "报价单.xlsx",
        group_name: null,
        kind: "file",
        file_size: 0,
      },
      {
        source_path: "C:/work/封面.png",
        display_name: "封面.png",
        relative_path: "封面.png",
        group_name: null,
        kind: "file",
        file_size: 0,
      },
      {
        source_path: "C:/work/项目资料",
        display_name: "项目资料",
        relative_path: "项目资料",
        group_name: "项目资料",
        kind: "directory",
        file_size: 0,
      },
    ]);
  });
});
