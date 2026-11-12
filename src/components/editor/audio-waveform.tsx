import { useEffect, useRef } from "react";

export function AudioWaveform({ peaks, duration, offset, speed, clipDuration, zoom }: {
  peaks: number[]; duration: number; offset: number; speed: number; clipDuration: number; zoom: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !duration || !peaks.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Cap raster width while retaining the entire trimmed clip at any zoom.
    const width = Math.max(1, Math.min(8192, Math.ceil(clipDuration * zoom)));
    canvas.width = width; canvas.height = 24;
    ctx.clearRect(0, 0, width, 24);
    ctx.fillStyle = getComputedStyle(canvas).color;
    for (let x = 0; x < width; x += 3) {
      const start = Math.floor((offset + x / width * clipDuration * speed) / duration * peaks.length);
      const end = Math.ceil((offset + Math.min(width, x + 3) / width * clipDuration * speed) / duration * peaks.length);
      let peak = 0;
      for (let i = Math.max(0, start); i < Math.min(peaks.length, end); i++) peak = Math.max(peak, peaks[i] ?? 0);
      const height = Math.max(1, peak * 22);
      ctx.fillRect(x, (24 - height) / 2, 2, height);
    }
  }, [peaks, duration, offset, speed, clipDuration, zoom]);
  return <canvas ref={ref} aria-label="Audio waveform" className="pointer-events-none absolute inset-x-0 bottom-0 h-6 w-full text-primary-foreground opacity-60" />;
}