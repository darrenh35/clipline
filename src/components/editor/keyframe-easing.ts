export type Easing = "linear" | "sine-in" | "sine-out" | "sine-in-out" | "smooth";
export type Keyframe = { t: number; v: number; easing?: Easing };

export const EASINGS: { value: Easing; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "sine-in", label: "Sine in" },
  { value: "sine-out", label: "Sine out" },
  { value: "sine-in-out", label: "Sine in/out" },
  { value: "smooth", label: "Smooth" },
];

export function ease(q: number, easing: Easing = "smooth") {
  const t = Math.max(0, Math.min(1, q));
  switch (easing) {
    case "linear": return t;
    case "sine-in": return 1 - Math.cos(t * Math.PI / 2);
    case "sine-out": return Math.sin(t * Math.PI / 2);
    case "sine-in-out": return (1 - Math.cos(Math.PI * t)) / 2;
    default: return t * t * (3 - 2 * t);
  }
}

export function interpolate(ks: Keyframe[], t: number, fallback: number) {
  const first = ks[0];
  if (!first) return fallback;
  if (t <= first.t) return first.v;
  for (let i = 1; i < ks.length; i++) {
    const a = ks[i - 1], b = ks[i];
    if (a && b && t <= b.t) return a.v + (b.v - a.v) * ease((t - a.t) / (b.t - a.t || 1), a.easing);
  }
  return ks.at(-1)?.v ?? fallback;
}