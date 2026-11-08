import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { clearBrowserDraft, loadBrowserDraft, saveBrowserDraft } from "../components/editor/browser-draft";

beforeEach(async () => { await clearBrowserDraft(); });

describe("browser autosave", () => {
  it("restores edits, keyframe easing, glow and raw media together", async () => {
    const doc = { items: [{ kf: { scale: [{ t: 0, v: 120, easing: "sine-in" }] }, style: { glow: true, glowStrength: 85 } }] };
    const media = new Blob(["real media bytes"], { type: "video/webm" });
    await saveBrowserDraft({ version: 1, doc, options: { res: "720p" } }, [["video", media]]);
    const restored = await loadBrowserDraft<typeof doc, { res: string }>();
    expect(restored.draft?.doc).toEqual(doc);
    expect(restored.draft?.options.res).toBe("720p");
    expect(restored.media.get("video")?.size).toBe(media.size);
    expect(restored.media.get("video")?.type).toBe("video/webm");
  });

  it("retains the latest edit when saves overlap", async () => {
    await Promise.all([1, 2, 3].map((value) => saveBrowserDraft({ version: 1, doc: { value }, options: {} }, [])));
    expect((await loadBrowserDraft<{ value: number }, object>()).draft?.doc.value).toBe(3);
  });

  it("start fresh clears both draft and imported media after pending saves", async () => {
    const saving = saveBrowserDraft({ version: 1, doc: { text: "Old project" }, options: {} }, [["photo", new Blob(["photo"])]]);
    const clearing = clearBrowserDraft();
    await Promise.all([saving, clearing]);
    const restored = await loadBrowserDraft();
    expect(restored.draft).toBeUndefined();
    expect(restored.media.size).toBe(0);
  });
});