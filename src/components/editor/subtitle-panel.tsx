import { useRef, useState } from "react";
import { Bold, Italic, Underline, Plus, Trash2, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextStyleControls } from "./text-style-controls";
import { parseSubtitles, toSrt, toVtt, toAss, type SubCue, type SubStyle } from "./subtitles";

export function SubtitlePanel({ cues, style, enabled, time, dimensions, onChange, onSeek }: {
  cues: SubCue[]; style: SubStyle; enabled: boolean; time: number; dimensions: readonly [number, number];
  onChange: (patch: { subtitles?: SubCue[]; subStyle?: SubStyle; burnSubtitles?: boolean }) => void;
  onSeek: (time: number) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [format, setFormat] = useState<"srt" | "vtt" | "ass">("srt");
  const [error, setError] = useState("");
  const update = (id: string, patch: Partial<SubCue>) => onChange({ subtitles: cues.map((c) => c.id === id ? { ...c, ...patch } : c) });
  const resetCue = (id: string) => onChange({ subtitles: cues.map((c) => {
    if (c.id !== id) return c;
    const { bold: _bold, italic: _italic, underline: _underline, color: _color, ...plain } = c;
    return plain;
  }) });
  const exportFile = () => {
    const text = format === "srt" ? toSrt(cues) : format === "vtt" ? toVtt(cues) : toAss(cues, style, ...dimensions);
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `clipline-subtitles.${format}`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
  return <div className="space-y-4">
    <div className="flex items-center gap-2"><Button size="sm" variant="secondary" onClick={() => input.current?.click()}><Upload />Import subtitles</Button><Button size="icon" variant="outline" aria-label="Add subtitle" title="Add subtitle" onClick={() => onChange({ subtitles: [...cues, { id: crypto.randomUUID(), start: time, end: time + 2, text: "New subtitle" }] })}><Plus /></Button></div>
    <input ref={input} type="file" accept=".srt,.vtt" hidden onChange={async (e) => {
      const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
      try { const parsed = parseSubtitles(await file.text(), () => crypto.randomUUID()); if (!parsed.length) { setError("No subtitle timings found in this file."); return; } onChange({ subtitles: [...cues, ...parsed].sort((a, b) => a.start - b.start) }); setError(""); }
      catch { setError("This subtitle file could not be read."); }
    }} />
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    <label className="flex items-center gap-2"><input type="checkbox" checked={enabled} onChange={(e) => onChange({ burnSubtitles: e.target.checked })} />Burn subtitles into video</label>
    <TextStyleControls style={style} onChange={(patch) => onChange({ subStyle: { ...style, ...patch } })} />
    <label className="flex items-center justify-between gap-2">Bottom margin (%)<input aria-label="Subtitle bottom margin" type="number" min={0} max={50} value={style.marginV} onChange={(e) => { if (e.target.value !== '') onChange({ subStyle: { ...style, marginV: Math.max(0, Math.min(50, +e.target.value)) } }); }} className="h-8 w-16 rounded-md border bg-secondary px-2" /></label>
    <div className="flex gap-2 border-y py-3"><select aria-label="Subtitle export format" value={format} onChange={(e) => setFormat(e.target.value as typeof format)} className="h-8 min-w-0 flex-1 rounded-md border bg-secondary px-2"><option value="srt">SRT</option><option value="vtt">VTT</option><option value="ass">ASS (styled)</option></select><Button size="sm" onClick={exportFile} disabled={!cues.some((c) => c.end > c.start && c.text.trim())}><Download />Export</Button></div>
    <div className="space-y-3">
      {[...cues].sort((a, b) => a.start - b.start).map((cue, index) => <div key={cue.id} className={`space-y-2 rounded-md border p-2 ${time >= cue.start && time < cue.end ? 'border-primary' : ''}`}>
        <div className="flex items-center justify-between"><Button size="sm" variant="ghost" className="h-6 px-1 font-mono text-xs" onClick={() => onSeek(cue.start)}>#{index + 1}</Button><Button size="icon" variant="ghost" className="h-6 w-6" aria-label={`Delete subtitle ${index + 1}`} onClick={() => onChange({ subtitles: cues.filter((c) => c.id !== cue.id) })}><Trash2 /></Button></div>
        <div className="grid grid-cols-2 gap-2">{(['start', 'end'] as const).map((key) => <label key={key} className="text-xs text-muted-foreground capitalize">{key} (s)<input aria-label={`Subtitle ${index + 1} ${key}`} type="number" min={key === 'start' ? 0 : cue.start + 0.01} max={key === 'start' ? cue.end - 0.01 : undefined} step={0.01} value={cue[key]} onChange={(e) => { if (e.target.value !== '') { const v = +e.target.value; if (v >= 0 && (key === 'start' ? v < cue.end : v > cue.start)) update(cue.id, { [key]: v }); } }} className="mt-1 h-8 w-full rounded-md border bg-secondary px-2 text-foreground" /></label>)}</div>
        <textarea aria-label={`Subtitle ${index + 1} text`} value={cue.text} onChange={(e) => update(cue.id, { text: e.target.value })} className="min-h-16 w-full resize-y rounded-md border bg-secondary px-2 py-1" />
        <div className="flex flex-wrap items-center gap-1">{([['bold', Bold, 'bold'], ['italic', Italic, 'italic'], ['underline', Underline, 'underline']] as const).map(([key, Icon, label]) => <Button key={key} size="icon" className="h-7 w-7" variant={(cue[key] ?? style[key]) ? 'default' : 'secondary'} aria-label={`Subtitle ${index + 1} ${label}`} aria-pressed={cue[key] ?? style[key]} title={label} onClick={() => update(cue.id, { [key]: !(cue[key] ?? style[key]) })}><Icon /></Button>)}<input aria-label={`Subtitle ${index + 1} color`} type="color" value={cue.color ?? style.color} onChange={(e) => update(cue.id, { color: e.target.value })} className="ml-auto h-7 w-9 cursor-pointer rounded border bg-secondary" /><Button variant="ghost" size="sm" className="h-7 px-1 text-xs" onClick={() => resetCue(cue.id)}>Reset</Button></div>
      </div>)}
    </div>
  </div>;
}