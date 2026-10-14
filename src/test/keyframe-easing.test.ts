import { describe, expect, it } from "vitest";
import { ease, interpolate } from "@/components/editor/keyframe-easing";

describe("keyframe easing", () => {
  it("supports linear and sine curves with exact endpoints", () => {
    for (const style of ["linear", "sine-in", "sine-out", "sine-in-out", "smooth"] as const) {
      expect(ease(0, style)).toBeCloseTo(0);
      expect(ease(1, style)).toBeCloseTo(1);
    }
    expect(ease(0.5, "linear")).toBe(0.5);
    expect(ease(0.5, "sine-in")).toBeCloseTo(0.292893);
    expect(ease(0.5, "sine-out")).toBeCloseTo(0.707107);
  });
  it("uses the outgoing keyframe curve and preserves legacy smooth motion", () => {
    expect(interpolate([{ t: 0, v: 10, easing: "linear" }, { t: 2, v: 30 }], 0.5, 0)).toBe(15);
    expect(interpolate([{ t: 0, v: 0 }, { t: 1, v: 100 }], 0.25, 0)).toBe(15.625);
    expect(interpolate([], 1, 50)).toBe(50);
  });
});