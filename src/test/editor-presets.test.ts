import { describe, expect, it } from "vitest";
import { audioPeaks, bounceScale, canvasDimensions, COLOR_PRESETS, revealedText } from "../components/editor/editor-presets";

describe("canvas aspect ratios", () => {
  it.each([
    ["16:9", [1920, 1080], [1280, 720]],
    ["9:16", [1080, 1920], [720, 1280]],
    ["1:1", [1080, 1080], [720, 720]],
    ["4:5", [1080, 1350], [720, 900]],
    ["21:9", [2520, 1080], [1680, 720]],
  ] as const)("%s matches preview and recording dimensions", (ratio, hd, small) => {
    expect(canvasDimensions(ratio, "1080p")).toEqual(hd);
    expect(canvasDimensions(ratio, "720p")).toEqual(small);
  });
  it("retains legacy wide dimensions", () => expect(canvasDimensions()).toEqual([1920, 1080]));
});
it("waveforms retain stereo peaks and silent intervals", () => {
  expect(audioPeaks([new Float32Array([0, 0, 0.5, -1]), new Float32Array([0, 0, 0.8, 0])], 2)).toEqual([0, 1]);
});
it("typewriter supports seeking and complete Unicode characters", () => {
  expect(revealedText("A😀BC", 0)).toBe("");
  expect(revealedText("A😀BC", 0.5)).toBe("A😀");
  expect(revealedText("A😀BC", 1)).toBe("A😀BC");
});
it("bounce starts at zero, overshoots, and finishes at the saved scale", () => {
  expect(bounceScale(0)).toBeCloseTo(0);
  expect(bounceScale(0.7)).toBeGreaterThan(1);
  expect(bounceScale(1)).toBe(1);
});
it("black and white removes saturation and Original clears the filters", () => {
  expect(COLOR_PRESETS.find((p) => p.id === "noir")?.values.saturate).toBe(0);
  expect(COLOR_PRESETS[0].values).toEqual({ brightness: 100, contrast: 100, saturate: 100, sepia: 0, hue: 0 });
});