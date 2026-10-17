import { describe, expect, it } from "vitest";
import { detectKind, pickExportMime } from "@/components/editor/media-utils";

describe("media import detection", () => {
  it("treats a .webm with no MIME type as video", () => {
    expect(detectKind("clip.webm", "")).toBe("video");
  });
  it("treats an unknown extension with no MIME type as unsupported", () => {
    expect(detectKind("notes.txt", "")).toBeNull();
  });
});

describe("export format", () => {
  it("falls back to null for mp4 when the browser only records webm", () => {
    expect(pickExportMime("mp4", (m) => m.startsWith("video/webm"))).toBeNull();
  });
  it("auto prefers mp4 when available", () => {
    expect(pickExportMime("auto", () => true)).toContain("mp4");
  });
});
