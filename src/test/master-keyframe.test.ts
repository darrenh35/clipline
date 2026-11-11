import { describe, expect, it } from "vitest";
import { toggleMasterKeyframe } from "../components/editor/master-keyframe";

describe("master keyframe", () => {
  it("keys all properties with one operation", () => {
    const result = toggleMasterKeyframe({ base: { x: 20, scale: 120 }, kf: {} }, ["x", "scale", "rotation"], { rotation: 0 }, 1);
    expect(result.kf).toEqual({ x: [{ t: 1, v: 20, easing: "linear" }], scale: [{ t: 1, v: 120, easing: "linear" }], rotation: [{ t: 1, v: 0, easing: "linear" }] });
  });
  it("preserves existing outgoing easing when filling a partial keyframe", () => {
    const result = toggleMasterKeyframe({ base: {}, kf: { x: [{ t: 1, v: 30, easing: "sine-in" as const }] } }, ["x", "scale"], { scale: 100 }, 1);
    expect(result.kf.x?.[0]?.easing).toBe("sine-in");
    expect(result.kf.scale?.[0]?.v).toBe(100);
  });
  it("removes all keys together without resetting their values", () => {
    const result = toggleMasterKeyframe({ base: {}, kf: { x: [{ t: 1, v: 30 }], scale: [{ t: 1, v: 120 }] } }, ["x", "scale"], {}, 1);
    expect(result.kf).toEqual({ x: [], scale: [] });
    expect(result.base).toEqual({ x: 30, scale: 120 });
  });
});