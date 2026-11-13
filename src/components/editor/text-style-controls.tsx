import { Bold, Italic, Underline, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "./i18n";
import type { SubStyle } from "./subtitles";

export const EDITOR_FONTS = ["Space Grotesk", "Anton", "Bebas Neue", "Playfair Display", "Pacifico", "Permanent Marker", "JetBrains Mono"];
type Style = SubStyle & { glow?: boolean; glowColor?: string; glowStrength?: number };
const field = "h-8 min-w-0 w-full rounded-md border bg-secondary/70 px-2";

export function TextStyleControls({ style, onChange, glow = false }: { style: Style; onChange: (patch: Partial<Style>) => void; glow?: boolean }) {
  const { t } = useI18n();
  return <div className="space-y-3">
    <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] gap-2">
      <label className="min-w-0 space-y-1 text-xs text-muted-foreground">{t("font")}<select aria-label={t("font")} value={style.font} onChange={(e) => onChange({ font: e.target.value })} className={`${field} text-foreground`}>
        {EDITOR_FONTS.map((f) => <option key={f}>{f}</option>)}
      </select></label>
      <label className="min-w-0 space-y-1 text-xs text-muted-foreground">{t("fontSize")}<input aria-label={t("fontSize")} type="number" min={2} max={30} step={0.5} value={style.size} onChange={(e) => { if (e.target.value) onChange({ size: Math.max(2, Math.min(30, +e.target.value)) }); }} className={`${field} text-foreground`} /></label>
    </div>
    <div className="flex flex-wrap gap-1 border-b pb-3">
      {([["bold", Bold, "bold"], ["italic", Italic, "italic"], ["underline", Underline, "underline"]] as const).map(([key, Icon, label]) => <Button key={key} size="icon" variant={style[key] ? "default" : "secondary"} className="h-8 w-8 shrink-0" aria-label={t(label)} title={t(label)} aria-pressed={style[key]} onClick={() => onChange({ [key]: !style[key] })}><Icon /></Button>)}
      <label className="ml-auto flex items-center gap-2 whitespace-nowrap text-xs"><input type="checkbox" checked={style.shadow} onChange={(e) => onChange({ shadow: e.target.checked })} />{t("shadow")}</label>
    </div>
    <label className="flex items-center justify-between gap-2">{t("fill")}<input aria-label={t("fillColor")} type="color" value={style.color} onChange={(e) => onChange({ color: e.target.value })} className="h-7 w-10 shrink-0 cursor-pointer rounded border bg-secondary p-0.5" /></label>
    <div className="flex items-center justify-between gap-2"><span>{t("stroke")}</span><div className="flex min-w-0 items-center gap-2"><input aria-label={t("strokeColor")} type="color" value={style.outline} onChange={(e) => onChange({ outline: e.target.value })} className="h-7 w-10 shrink-0 cursor-pointer rounded border bg-secondary p-0.5" /><input aria-label={t("strokeWidth")} type="number" min={0} max={40} value={style.outlineW} onChange={(e) => { if (e.target.value !== "") onChange({ outlineW: Math.max(0, Math.min(40, +e.target.value)) }); }} className={`${field} w-16`} /></div></div>
    <div className="flex items-center justify-between gap-2"><label className="flex items-center gap-2"><input type="checkbox" checked={style.box} onChange={(e) => onChange({ box: e.target.checked })} />{t("background")}</label>{style.box && <input aria-label={t("backgroundColor")} type="color" value={style.boxColor} onChange={(e) => onChange({ boxColor: e.target.value })} className="h-7 w-10 shrink-0 cursor-pointer rounded border bg-secondary p-0.5" />}</div>
    {glow && <><div className="flex items-center justify-between gap-2"><Button size="sm" variant={style.glow ? "default" : "secondary"} aria-pressed={!!style.glow} onClick={() => onChange({ glow: !style.glow })}><Sparkles />{t("glow")}</Button>{style.glow && <input aria-label={t("glowColor")} type="color" value={style.glowColor ?? style.color} onChange={(e) => onChange({ glowColor: e.target.value })} className="h-7 w-10 shrink-0 cursor-pointer rounded border bg-secondary p-0.5" />}</div>{style.glow && <label className="flex items-center justify-between gap-2">{t("glowStrength")}<input aria-label={t("glowStrength")} type="number" min={1} max={100} value={style.glowStrength ?? 50} onChange={(e) => { if (e.target.value) onChange({ glowStrength: Math.max(1, Math.min(100, +e.target.value)) }); }} className={`${field} w-16`} /></label>}</>}
  </div>;
}
