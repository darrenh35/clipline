import { Bold, Italic, Underline, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SubStyle } from "./subtitles";

export const EDITOR_FONTS = ["Space Grotesk", "Anton", "Bebas Neue", "Playfair Display", "Pacifico", "Permanent Marker", "JetBrains Mono"];
type Style = SubStyle & { glow?: boolean; glowColor?: string; glowStrength?: number };
const field = "h-8 min-w-0 w-full rounded-md border bg-secondary/70 px-2";
export function TextStyleControls({ style, onChange, glow = false }: { style: Style; onChange: (patch: Partial<Style>) => void; glow?: boolean }) {
  return <div className="space-y-3">
    <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] gap-2">
      <label className="space-y-1 text-xs text-muted-foreground">Font<select aria-label="Font" value={style.font} onChange={(e) => onChange({ font: e.target.value })} className={`${field} text-foreground`}>
        {EDITOR_FONTS.map((f) => <option key={f}>{f}</option>)}
      </select></label>
      <label className="space-y-1 text-xs text-muted-foreground">Size<input aria-label="Font size" type="number" min={2} max={30} step={0.5} value={style.size} onChange={(e) => { if (e.target.value) onChange({ size: Math.max(2, Math.min(30, +e.target.value)) }); }} className={`${field} text-foreground`} /></label>
    </div>
    <div className="flex gap-1 border-b pb-3">
      {([['bold', Bold, 'Bold'], ['italic', Italic, 'Italic'], ['underline', Underline, 'Underline']] as const).map(([key, Icon, label]) => <Button key={key} size="icon" variant={style[key] ? "default" : "secondary"} className="h-8 w-8" aria-label={label} title={label} aria-pressed={style[key]} onClick={() => onChange({ [key]: !style[key] })}><Icon /></Button>)}
      <label className="ml-auto flex items-center gap-2 text-xs"><input type="checkbox" checked={style.shadow} onChange={(e) => onChange({ shadow: e.target.checked })} />Shadow</label>
    </div>
    <label className="flex items-center justify-between gap-2">Fill<input aria-label="Fill color" type="color" value={style.color} onChange={(e) => onChange({ color: e.target.value })} className="h-7 w-10 cursor-pointer rounded border bg-secondary p-0.5" /></label>
    <div className="flex items-center justify-between gap-2"><span>Stroke</span><div className="flex items-center gap-2"><input aria-label="Stroke color" type="color" value={style.outline} onChange={(e) => onChange({ outline: e.target.value })} className="h-7 w-10 cursor-pointer rounded border bg-secondary p-0.5" /><input aria-label="Stroke width" type="number" min={0} max={40} value={style.outlineW} onChange={(e) => { if (e.target.value !== '') onChange({ outlineW: Math.max(0, Math.min(40, +e.target.value)) }); }} className={`${field} w-16`} /></div></div>
    <div className="flex items-center justify-between gap-2"><label className="flex items-center gap-2"><input type="checkbox" checked={style.box} onChange={(e) => onChange({ box: e.target.checked })} />Background</label>{style.box && <input aria-label="Background color" type="color" value={style.boxColor} onChange={(e) => onChange({ boxColor: e.target.value })} className="h-7 w-10 cursor-pointer rounded border bg-secondary p-0.5" />}</div>
    {glow && <><div className="flex items-center justify-between gap-2"><Button size="sm" variant={style.glow ? "default" : "secondary"} aria-pressed={!!style.glow} onClick={() => onChange({ glow: !style.glow })}><Sparkles />Glow</Button>{style.glow && <input aria-label="Glow color" type="color" value={style.glowColor ?? style.color} onChange={(e) => onChange({ glowColor: e.target.value })} className="h-7 w-10 cursor-pointer rounded border bg-secondary p-0.5" />}</div>{style.glow && <label className="flex items-center justify-between gap-2">Glow strength<input aria-label="Glow strength" type="number" min={1} max={100} value={style.glowStrength ?? 50} onChange={(e) => { if (e.target.value) onChange({ glowStrength: Math.max(1, Math.min(100, +e.target.value)) }); }} className={`${field} w-16`} /></label>}</>}
  </div>;
}