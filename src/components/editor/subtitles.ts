// Subtitle cues, styling and file export (.srt main, .vtt, styled .ass).
export type SubCue = { id: string; start: number; end: number; text: string; bold?: boolean; italic?: boolean; underline?: boolean; color?: string };
export type SubStyle = {
  font: string; size: number; color: string; outline: string; outlineW: number;
  bold: boolean; italic: boolean; underline: boolean; shadow: boolean; box: boolean; boxColor: string; marginV: number;
};
export const DEFAULT_SUB_STYLE: SubStyle = {
  font: "Space Grotesk", size: 5.5, color: "#ffffff", outline: "#000000", outlineW: 8,
  bold: true, italic: false, underline: false, shadow: true, box: false, boxColor: "#000000", marginV: 7,
};

const pad = (n: number, l = 2) => String(n).padStart(l, "0");
const split = (s: number) => {
  const ms = Math.max(0, Math.round(s * 1000));
  return { h: Math.floor(ms / 3600000), m: Math.floor(ms / 60000) % 60, s: Math.floor(ms / 1000) % 60, ms: ms % 1000 };
};
export const srtTime = (s: number) => { const t = split(s); return `${pad(t.h)}:${pad(t.m)}:${pad(t.s)},${pad(t.ms, 3)}`; };
export const vttTime = (s: number) => srtTime(s).replace(",", ".");
export const assTime = (s: number) => { const cs = Math.max(0, Math.round(s * 100)); return `${Math.floor(cs / 360000)}:${pad(Math.floor(cs / 6000) % 60)}:${pad(Math.floor(cs / 100) % 60)}.${pad(cs % 100)}`; };

const sorted = (cues: SubCue[]) => [...cues].filter((c) => c.end > c.start && c.text.trim()).sort((a, b) => a.start - b.start);

export const toSrt = (cues: SubCue[]) =>
  sorted(cues).map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text.trim()}\n`).join("\n");

export const toVtt = (cues: SubCue[]) =>
  "WEBVTT\n\n" + sorted(cues).map((c) => `${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.text.trim()}\n`).join("\n");

/** #rrggbb -> ASS &H00BBGGRR */
export const assColor = (hex: string, alpha = 0) => {
  const h = hex.replace("#", "").padEnd(6, "0");
  const a = alpha.toString(16).padStart(2, "0").toUpperCase();
  return `&H${a}${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase();
};

export const toAss = (cues: SubCue[], st: SubStyle, w = 1920, h = 1080) => {
  const fs = Math.round((st.size / 100) * h);
  const outline = +((fs * st.outlineW) / 200).toFixed(1);
  const style = [
    "Default", st.font, fs, assColor(st.color), assColor(st.color), assColor(st.outline), st.box ? assColor(st.boxColor, 0x60) : assColor("#000000", 0x80),
    st.bold ? -1 : 0, st.italic ? -1 : 0, st.underline ? -1 : 0, 0, 100, 100, 0, 0, st.box ? 3 : 1, st.box ? Math.max(4, outline) : outline, st.shadow ? 2 : 0, 2, 40, 40, Math.round((st.marginV / 100) * h), 1,
  ].join(",");
  const ev = sorted(cues).map((c) => {
    let tags = "";
    if (c.bold !== undefined && c.bold !== st.bold) tags += `\\b${c.bold ? 1 : 0}`;
    if (c.italic !== undefined && c.italic !== st.italic) tags += `\\i${c.italic ? 1 : 0}`;
    if (c.underline !== undefined && c.underline !== st.underline) tags += `\\u${c.underline ? 1 : 0}`;
    if (c.color && c.color.toLowerCase() !== st.color.toLowerCase()) tags += `\\c${assColor(c.color)}&`;
    const text = c.text.trim().replace(/\r?\n/g, "\\N").replace(/[{}]/g, "");
    return `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Default,,0,0,0,,${tags ? `{${tags}}` : ""}${text}`;
  });
  return [
    "[Script Info]", "; Made with Clipline", "ScriptType: v4.00+", `PlayResX: ${w}`, `PlayResY: ${h}`, "WrapStyle: 0", "ScaledBorderAndShadow: yes", "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: ${style}`, "",
    "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...ev, "",
  ].join("\n");
};

const parseTime = (t: string) => {
  const m = t.trim().match(/(?:(\d+):)?(\d+):(\d+)[,.](\d+)/);
  if (!m) return NaN;
  return (+(m[1] ?? 0)) * 3600 + +m[2] * 60 + +m[3] + +`0.${m[4]}`;
};

/** Parses .srt or .vtt text into cues (styling tags stripped). */
export const parseSubtitles = (src: string, mkId: () => string): SubCue[] => {
  const blocks = src.replace(/\r/g, "").replace(/^WEBVTT[^\n]*\n/, "").split(/\n{2,}/);
  const out: SubCue[] = [];
  for (const b of blocks) {
    const lines = b.split("\n").filter((l) => l.trim() !== "");
    const i = lines.findIndex((l) => l.includes("-->"));
    if (i < 0) continue;
    const [a, z] = lines[i].split("-->");
    const start = parseTime(a), end = parseTime(z.split(/\s+/).filter(Boolean)[0] ?? "");
    const text = lines.slice(i + 1).join("\n").replace(/<[^>]+>/g, "").trim();
    if (isFinite(start) && isFinite(end) && text) out.push({ id: mkId(), start, end, text });
  }
  return out;
};
