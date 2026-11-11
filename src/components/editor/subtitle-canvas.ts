import type { SubCue, SubStyle } from "./subtitles";

/** The same draw call burns captions into both preview and recorded exports. */
export function drawSubtitles(ctx: CanvasRenderingContext2D, cues: SubCue[], style: SubStyle, time: number, width: number, height: number) {
  const active = cues.filter((c) => time >= c.start && time < c.end);
  let bottom = height * (1 - style.marginV / 100);
  for (const cue of [...active].reverse()) {
    ctx.save();
    const px = style.size / 100 * height;
    ctx.font = `${(cue.italic ?? style.italic) ? "italic " : ""}${(cue.bold ?? style.bold) ? 700 : 400} ${px}px "${style.font}", sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    const lines: string[] = [];
    for (const paragraph of cue.text.split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > width * 0.9) { lines.push(line); line = word; }
        else line = next;
      }
      lines.push(line);
    }
    const widest = Math.max(0, ...lines.map((l) => ctx.measureText(l).width));
    const shrink = Math.min(1, width * 0.9 / Math.max(1, widest));
    ctx.translate(width / 2, bottom); ctx.scale(shrink, shrink);
    const top = -(lines.length - 1) * px * 1.25;
    if (style.box) {
      ctx.fillStyle = style.boxColor; ctx.globalAlpha = 0.6;
      ctx.fillRect(-widest / 2 - px * 0.3, top - px * 0.65, widest + px * 0.6, lines.length * px * 1.25);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = cue.color ?? style.color;
    ctx.strokeStyle = style.outline; ctx.lineWidth = px * style.outlineW / 100;
    if (style.shadow) { ctx.shadowColor = style.outline; ctx.shadowBlur = px * 0.2; ctx.shadowOffsetY = px * 0.05; }
    lines.forEach((line, index) => {
      const y = top + index * px * 1.25;
      if (style.outlineW) ctx.strokeText(line, 0, y);
      ctx.fillText(line, 0, y);
      if (cue.underline ?? style.underline) { const w = ctx.measureText(line).width; ctx.fillRect(-w / 2, y + px * 0.45, w, px * 0.05); }
    });
    ctx.restore();
    bottom -= lines.length * px * 1.25 * shrink + px * 0.35;
  }
}