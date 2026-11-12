export const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:5", "21:9"] as const;
export type AspectRatio = typeof ASPECT_RATIOS[number];

/** Resolution names describe the shorter edge; all encoder dimensions are even. */
export function canvasDimensions(ratio: AspectRatio = "16:9", resolution: "720p" | "1080p" = "1080p"): [number, number] {
  const edge = resolution === "720p" ? 720 : 1080;
  const [w = 16, h = 9] = ratio.split(":").map(Number);
  const even = (n: number) => Math.round(n / 2) * 2;
  return w >= h ? [even(edge * w / h), edge] : [edge, even(edge * h / w)];
}

export const COLOR_PRESETS = [
  { id: "original", label: "Original", values: { brightness: 100, contrast: 100, saturate: 100, sepia: 0, hue: 0 } },
  { id: "warm", label: "Cinematic Warm", values: { brightness: 104, contrast: 115, saturate: 110, sepia: 24, hue: -8 } },
  { id: "teal", label: "Teal & Orange", values: { brightness: 100, contrast: 125, saturate: 135, sepia: 18, hue: -18 } },
  { id: "vintage", label: "Vintage 90s", values: { brightness: 108, contrast: 88, saturate: 75, sepia: 35, hue: -5 } },
  { id: "noir", label: "Film Noir B&W", values: { brightness: 95, contrast: 145, saturate: 0, sepia: 0, hue: 0 } },
  { id: "vibrant", label: "Vibrant Pop", values: { brightness: 106, contrast: 115, saturate: 155, sepia: 0, hue: 0 } },
  { id: "cool", label: "Cool Cyberpunk", values: { brightness: 98, contrast: 135, saturate: 140, sepia: 12, hue: 165 } },
] as const;

export const TEXT_ANIMATIONS = ["none", "fade", "slide", "rise", "zoom", "bounce", "typewriter"] as const;
export type TextAnimation = typeof TEXT_ANIMATIONS[number];

/** Text reveal is calculated from time, not timers, so seeking and export agree. */
export function revealedText(text: string, progress: number) {
  const chars = Array.from(text);
  return chars.slice(0, Math.ceil(chars.length * Math.max(0, Math.min(1, progress)))).join("");
}

export function bounceScale(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const c = 1.70158;
  return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2;
}

/** Compact source-time peaks are independent of clip trimming and playback speed. */
export function audioPeaks(channels: readonly Float32Array[], bins = 2048): number[] {
  const length = channels[0]?.length ?? 0;
  if (!length) return [];
  const count = Math.min(bins, length);
  return Array.from({ length: count }, (_, bin) => {
    const start = Math.floor(bin * length / count), end = Math.floor((bin + 1) * length / count);
    let peak = 0;
    for (const channel of channels) for (let i = start; i < end; i++) peak = Math.max(peak, Math.abs(channel[i] ?? 0));
    return Math.min(1, peak);
  });
}