import { describe, expect, it } from "vitest";
import { resizedScale } from "../components/editor/preview-transform";

describe("direct preview resizing", () => {
  it("doubles scale when the handle is dragged twice as far from the center", () => {
    expect(resizedScale(100, 80, 160)).toBe(200);
  });
  it("shrinks scale when the handle is moved towards the center", () => {
    expect(resizedScale(100, 80, 40)).toBe(50);
  });
  it("keeps scale inside supported limits", () => {
    expect(resizedScale(100, 80, 0)).toBe(1);
    expect(resizedScale(100, 80, 800)).toBe(400);
  });
});