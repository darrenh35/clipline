import { describe, expect, it } from "vitest";
import { DEFAULT_SUB_STYLE, assColor, parseSubtitles, toAss, toSrt, toVtt } from "@/components/editor/subtitles";

const cues = [
  { id: "b", start: 4, end: 6.5, text: "Second", italic: true, color: "#ff0000" },
  { id: "a", start: 1, end: 3.25, text: "First" },
];

describe("subtitles", () => {
  it("exports numbered, time-sorted SRT without styling", () => {
    expect(toSrt(cues)).toBe("1\n00:00:01,000 --> 00:00:03,250\nFirst\n\n2\n00:00:04,000 --> 00:00:06,500\nSecond\n");
  });
  it("exports VTT with header and dot milliseconds", () => {
    expect(toVtt(cues).startsWith("WEBVTT\n\n00:00:01.000 --> 00:00:03.250\nFirst")).toBe(true);
  });
  it("converts colors to ASS BGR order", () => {
    expect(assColor("#ff8000")).toBe("&H000080FF");
  });
  it("keeps per-cue italic and color in ASS", () => {
    const ass = toAss(cues, { ...DEFAULT_SUB_STYLE, italic: false });
    expect(ass).toContain("Dialogue: 0,0:00:04.00,0:00:06.50,Default,,0,0,0,,{\\i1\\c&H000000FF&}Second");
  });
  it("round-trips SRT import", () => {
    let n = 0;
    const back = parseSubtitles(toSrt(cues), () => `id${n++}`);
    expect(back.map((c) => [c.start, c.end, c.text])).toEqual([[1, 3.25, "First"], [4, 6.5, "Second"]]);
  });
});
