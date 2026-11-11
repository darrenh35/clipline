import { interpolate, type Keyframe } from "./keyframe-easing";

type Animated = { base: Record<string, number>; kf: Record<string, Keyframe[]> };
export function toggleMasterKeyframe<T extends Animated>(item: T, properties: string[], defaults: Record<string, number>, time: number, tolerance = 1 / 60): T {
  const remove = properties.every((p) => item.kf[p]?.some((k) => Math.abs(k.t - time) <= tolerance));
  const base = { ...item.base }, kf = { ...item.kf };
  for (const p of properties) {
    const keys = item.kf[p] ?? [];
    const value = interpolate(keys, time, item.base[p] ?? defaults[p] ?? 0);
    const existing = keys.find((k) => Math.abs(k.t - time) <= tolerance);
    const previous = keys.filter((k) => k.t <= time).at(-1);
    const rest = keys.filter((k) => Math.abs(k.t - time) > tolerance);
    kf[p] = remove ? rest : [...rest, { t: time, v: value, easing: existing?.easing ?? previous?.easing ?? "linear" }].sort((a, b) => a.t - b.t);
    if (remove && !rest.length) base[p] = value;
  }
  return { ...item, base, kf };
}