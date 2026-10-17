import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search, Play, Pause, Undo2, Redo2, Scissors, Trash2, Upload, Type, FolderOpen, Save, RotateCw, Film, Image as ImageIcon, Music,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EASINGS, interpolate, type Easing, type Keyframe } from "./keyframe-easing";
import { detectKind, guessMime, pickExportMime, resolveDuration, type ExportFormat } from "./media-utils";

type Kind = "video" | "image" | "audio" | "text";
type Trans = "none" | "fade" | "slide" | "wipe" | "zoom" | "rise";
type KF = Keyframe;
type TextStyle = { text: string; size: number; font: string; bold: boolean; italic: boolean; color: string; stroke: string; strokeW: number; shadow: boolean; bg: boolean };
type Item = {
  id: string; kind: Kind; track: number; start: number; dur: number; name: string; mediaId?: string;
  inP: number; speed: number; base: Record<string, number>; kf: Record<string, KF[]>;
  tIn: Trans; tOut: Trans; tInD: number; tOutD: number; style?: TextStyle;
};
type Media = { id: string; kind: "video" | "image" | "audio"; name: string; duration: number; type: string };
type Doc = { items: Item[]; media: Record<string, Media> };

const PROPS = {
  x: { label: "Position X", min: -50, max: 150, def: 50, unit: "%" },
  y: { label: "Position Y", min: -50, max: 150, def: 50, unit: "%" },
  scale: { label: "Scale", min: 0, max: 400, def: 100, unit: "%" },
  rotation: { label: "Rotation", min: -180, max: 180, def: 0, unit: "°" },
  opacity: { label: "Opacity", min: 0, max: 100, def: 100, unit: "%" },
  volume: { label: "Volume", min: 0, max: 200, def: 100, unit: "%" },
  brightness: { label: "Brightness", min: 0, max: 200, def: 100, unit: "%" },
  contrast: { label: "Contrast", min: 0, max: 200, def: 100, unit: "%" },
  saturate: { label: "Saturation", min: 0, max: 200, def: 100, unit: "%" },
} as const;
type Prop = keyof typeof PROPS;
const VIS: Prop[] = ["x", "y", "scale", "rotation", "opacity"];
const GRADE: Prop[] = ["brightness", "contrast", "saturate"];
const KIND_PROPS: Record<Kind, Prop[]> = {
  video: [...VIS, "volume", ...GRADE],
  image: [...VIS, ...GRADE],
  text: VIS,
  audio: ["volume"],
};
const FONTS = ["Space Grotesk", "Anton", "Bebas Neue", "Playfair Display", "Pacifico", "Permanent Marker", "JetBrains Mono"];
const TRANSITIONS: Trans[] = ["none", "fade", "slide", "wipe", "zoom", "rise"];
const FPS = 30;
const TRACK_H = 46;
const Z_MIN = 2, Z_MAX = 600, Z_DEF = 50;
const STEPS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
const RES = { "720p": [1280, 720], "1080p": [1920, 1080] } as const;
type ResKey = keyof typeof RES;

const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const f = Math.floor((s % 1) * FPS);
  return `${m}:${String(sec).padStart(2, "0")}.${String(f).padStart(2, "0")}`;
};
const fmtRuler = (s: number, step: number) => {
  if (s < 60 || step < 1) return `${+s.toFixed(2)}s`;
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
};
const isMedia = (it: Item) => it.kind === "video" || it.kind === "audio";
const shiftKf = (kf: Record<string, KF[]>, d: number, k = 1) =>
  Object.fromEntries(Object.entries(kf).map(([p, ks]) => [p, ks.map((x) => ({ ...x, t: x.t * k + d }))]));
const val = (it: Item, p: Prop, t: number) => {
  return interpolate(it.kf[p] ?? [], t - it.start, it.base[p] ?? PROPS[p].def);
};
const transP = (it: Item, t: number) => ({
  pin: it.tIn === "none" ? 1 : clamp((t - it.start) / it.tInD, 0, 1),
  pout: it.tOut === "none" ? 1 : clamp((it.start + it.dur - t) / it.tOutD, 0, 1),
});
type FX = { dx: number; dy: number; k: number; a: number; wl: number; wr: number };
const applyFx = (tr: Trans, p: number, isIn: boolean, W: number, H: number, s: FX) => {
  if (tr === "none" || p >= 1) return;
  const e = 1 - Math.pow(1 - p, 3);
  if (tr === "fade") s.a *= p;
  else if (tr === "slide") s.dx += (1 - e) * W * (isIn ? 1 : -1);
  else if (tr === "rise") { s.dy += (1 - e) * H * 0.12 * (isIn ? 1 : -1); s.a *= p; }
  else if (tr === "zoom") { s.k *= 0.5 + 0.5 * e; s.a *= p; }
  else if (tr === "wipe") { if (isIn) s.wr = Math.min(s.wr, p); else s.wl = Math.max(s.wl, 1 - p); }
};
const mkItem = (kind: Kind, extra: Partial<Item>): Item => ({
  id: uid(), kind, track: 0, start: 0, dur: 3, name: "", inP: 0, speed: 1,
  base: kind === "text" ? { y: 80 } : {}, kf: {}, tIn: "none", tOut: "none", tInD: 0.5, tOutD: 0.5, ...extra,
});
const collides = (n: Item, others: Item[]) =>
  others.some((o) => o.track === n.track && n.start < o.start + o.dur - 1e-3 && o.start < n.start + n.dur - 1e-3);
const trackCount = (items: Item[]) => (items.length ? Math.max(...items.map((i) => i.track)) + 1 : 0);
const free = (items: Item[], track: number, s: number, d: number, kinds: Kind[]) =>
  items.filter((o) => o.track === track).every((o) => kinds.includes(o.kind) && (s >= o.start + o.dur || o.start >= s + d));

const EMPTY: Doc = { items: [], media: {} };
const COLOR: Record<Kind, string> = { video: "bg-clip", image: "bg-image-track", audio: "bg-audio-track", text: "bg-text-track" };

export function VideoEditor() {
  const [doc, setDoc] = useState<Doc>(EMPTY);
  const items = doc.items;
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [zoom, setZoom] = useState(Z_DEF);
  const [res, setRes] = useState<ResKey>("1080p");
  const [fmtSel, setFmtSel] = useState<ExportFormat>("auto");
  const [canMp4, setCanMp4] = useState(true);
  useEffect(() => {
    setCanMp4(typeof MediaRecorder !== "undefined" && !!pickExportMime("mp4", (m) => MediaRecorder.isTypeSupported(m)));
  }, []);
  const [exporting, setExporting] = useState<number | null>(null);
  const [bad, setBad] = useState(false);
  const [, bump] = useState(0);

  const total = items.reduce((a, i) => Math.max(a, i.start + i.dur), 0);
  const tracks = trackCount(items);

  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 640, h: 360 });
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setStageSize({ w: Math.max(1, entry.contentRect.width - 64), h: Math.max(1, entry.contentRect.height - 64) });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const projInput = useRef<HTMLInputElement>(null);
  const els = useRef(new Map<string, { el: HTMLMediaElement; gain: GainNode }>());
  const imgs = useRef(new Map<string, HTMLImageElement>());
  const urls = useRef(new Map<string, string>());
  const blobs = useRef(new Map<string, Blob>());
  const frames = useRef(new Map<string, { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D }>());
  const audioCtx = useRef<AudioContext | null>(null);
  const audioDest = useRef<MediaStreamAudioDestinationNode | null>(null);
  const dragging = useRef(false);
  const saved = useRef<Doc>(EMPTY);
  const S = useRef({ doc, items, time: 0, playing, res, total, zoom });
  Object.assign(S.current, { doc, items, playing, res, total, zoom });
  const setT = (t: number) => { S.current.time = t; setTime(t); };

  // ---------- undo / redo ----------
  const hist = useRef<{ past: Doc[]; future: Doc[]; cur: Doc; applying: boolean }>({ past: [], future: [], cur: EMPTY, applying: false });
  useEffect(() => {
    const h = hist.current;
    if (h.applying) { h.applying = false; return; }
    if (dragging.current || doc === h.cur) return;
    const id = setTimeout(() => {
      h.past.push(h.cur);
      if (h.past.length > 150) h.past.shift();
      h.cur = doc;
      h.future = [];
      bump((x) => x + 1);
    }, 300);
    return () => clearTimeout(id);
  }, [doc]);
  const applyDoc = (d: Doc) => { hist.current.applying = true; hist.current.cur = d; setDoc(d); bump((x) => x + 1); };
  const undo = () => {
    const h = hist.current;
    if (S.current.doc !== h.cur) { h.future.push(S.current.doc); applyDoc(h.cur); return; }
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(h.cur);
    applyDoc(prev);
  };
  const redo = () => {
    const h = hist.current;
    const nxt = h.future.pop();
    if (!nxt) return;
    h.past.push(h.cur);
    applyDoc(nxt);
  };
  const updItem = (id: string, fn: (i: Item) => Item) =>
    setDoc((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? fn(i) : i)) }));

  // ---------- media engine ----------
  const ensureAudio = () => {
    if (!audioCtx.current) {
      audioCtx.current = new AudioContext();
      audioDest.current = audioCtx.current.createMediaStreamDestination();
    }
    audioCtx.current.resume();
    return audioCtx.current;
  };

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const { items } = S.current;
    const t = S.current.time;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    const vis = items.filter((i) => i.kind !== "audio" && t >= i.start && t < i.start + i.dur).sort((a, b) => b.track - a.track);
    for (const it of vis) {
      const s: FX = { dx: 0, dy: 0, k: 1, a: 1, wl: 0, wr: 1 };
      const { pin, pout } = transP(it, t);
      applyFx(it.tIn, pin, true, W, H, s);
      applyFx(it.tOut, pout, false, W, H, s);
      const alpha = s.a * (val(it, "opacity", t) / 100);
      if (alpha <= 0.002) continue;
      ctx.save();
      if (s.wl > 0 || s.wr < 1) { ctx.beginPath(); ctx.rect(s.wl * W, 0, (s.wr - s.wl) * W, H); ctx.clip(); }
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.translate((val(it, "x", t) / 100) * W + s.dx, (val(it, "y", t) / 100) * H + s.dy);
      ctx.rotate((val(it, "rotation", t) * Math.PI) / 180);
      const k = (val(it, "scale", t) / 100) * s.k;
      ctx.scale(k, k);
      if (it.kind === "text" && it.style) {
        const st = it.style;
        const px = (st.size / 100) * H;
        ctx.font = `${st.italic ? "italic " : ""}${st.bold ? 700 : 400} ${px}px "${st.font}", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        if (st.bg) {
          const w = ctx.measureText(st.text).width;
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.beginPath();
          ctx.roundRect(-w / 2 - px * 0.4, -px * 0.7, w + px * 0.8, px * 1.4, px * 0.2);
          ctx.fill();
        }
        if (st.shadow) { ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = px * 0.25; ctx.shadowOffsetY = px * 0.06; }
        if (st.strokeW > 0) {
          ctx.lineWidth = (px * st.strokeW) / 100;
          ctx.strokeStyle = st.stroke;
          ctx.strokeText(st.text, 0, 0);
          ctx.shadowColor = "transparent";
        }
        ctx.fillStyle = st.color;
        ctx.fillText(st.text, 0, 0);
      } else {
        let src: CanvasImageSource | undefined, w = 0, h = 0;
        if (it.kind === "image") {
          const img = imgs.current.get(it.mediaId!);
          if (img?.naturalWidth) { src = img; w = img.naturalWidth; h = img.naturalHeight; }
        } else {
          const v = els.current.get(it.id)?.el as HTMLVideoElement | undefined;
          if (v?.videoWidth && v.readyState >= 2) {
            src = v; w = v.videoWidth; h = v.videoHeight;
            let f = frames.current.get(it.id);
            if (!f) {
              const cv = document.createElement("canvas");
              f = { cv, ctx: cv.getContext("2d")! };
              frames.current.set(it.id, f);
            }
            if (f.cv.width !== w || f.cv.height !== h) { f.cv.width = w; f.cv.height = h; }
            f.ctx.drawImage(v, 0, 0);
          } else {
            const f = frames.current.get(it.id);
            if (f && f.cv.width) { src = f.cv; w = f.cv.width; h = f.cv.height; }
          }
        }
        if (src) {
          const f = Math.min(W / w, H / h);
          ctx.filter = `brightness(${val(it, "brightness", t)}%) contrast(${val(it, "contrast", t)}%) saturate(${val(it, "saturate", t)}%)`;
          ctx.drawImage(src, (-w * f) / 2, (-h * f) / 2, w * f, h * f);
        }
      }
      ctx.restore();
    }
  }, []);

  const redraw = () => { if (!S.current.playing) draw(); };

  const getEl = (it: Item) => {
    const ex = els.current.get(it.id);
    if (ex) return ex;
    const url = urls.current.get(it.mediaId!);
    if (!url) return null;
    const ctx = ensureAudio();
    const el = document.createElement(it.kind === "audio" ? "audio" : "video") as HTMLMediaElement;
    el.preload = "auto";
    (el as HTMLVideoElement).playsInline = true;
    el.src = url;
    const src = ctx.createMediaElementSource(el);
    const gain = ctx.createGain();
    src.connect(gain);
    gain.connect(ctx.destination);
    gain.connect(audioDest.current!);
    el.addEventListener("seeked", () => draw());
    el.addEventListener("loadeddata", () => draw());
    const e = { el, gain };
    els.current.set(it.id, e);
    return e;
  };

  const sync = (t: number, play: boolean) => {
    const { items, doc } = S.current;
    const live = new Set<string>();
    for (const it of items) {
      if (!isMedia(it)) continue;
      const e = getEl(it);
      if (!e) continue;
      live.add(it.id);
      const mdur = doc.media[it.mediaId!]?.duration ?? 0;
      const active = t >= it.start && t < it.start + it.dur;
      if (!active) {
        if (!e.el.paused) e.el.pause();
        if (it.start > t && it.start - t < 1.2 && !e.el.seeking && Math.abs(e.el.currentTime - it.inP) > 0.05) e.el.currentTime = it.inP;
        continue;
      }
      const local = Math.min(it.inP + (t - it.start) * it.speed, Math.max(0, mdur - 0.03));
      const { pin, pout } = transP(it, t);
      e.gain.gain.value = Math.max(0, (val(it, "volume", t) / 100) * Math.min(pin, pout));
      if (e.el.playbackRate !== it.speed) e.el.playbackRate = it.speed;
      if (play) {
        if (e.el.paused) {
          if (Math.abs(e.el.currentTime - local) > 0.15) e.el.currentTime = local;
          e.el.play().catch(() => {});
        } else if (Math.abs(e.el.currentTime - local) > 0.3) e.el.currentTime = local;
      } else {
        if (!e.el.paused) e.el.pause();
        if (Math.abs(e.el.currentTime - local) > 0.01) e.el.currentTime = local;
      }
    }
    els.current.forEach((e, id) => { if (!live.has(id) && !e.el.paused) e.el.pause(); });
  };

  useEffect(() => {
    const fams = new Set(items.filter((i) => i.style).map((i) => i.style!.font));
    Promise.all([...fams].map((f) => document.fonts.load(`700 40px "${f}"`).catch(() => null))).then(() => redraw());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    if (!playing) { sync(time, false); draw(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, playing, items, res]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const t = S.current.time + dt;
      if (t >= S.current.total) { setT(S.current.total); setPlaying(false); return; }
      S.current.time = t;
      setTime(t);
      sync(t, true);
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const togglePlay = () => {
    if (S.current.total <= 0) return;
    ensureAudio();
    if (!S.current.playing && S.current.time >= S.current.total - 0.05) setT(0);
    setPlaying((p) => !p);
  };

  // ---------- import ----------
  const loadImg = (id: string, url: string) => {
    const img = new Image();
    img.onload = () => redraw();
    img.src = url;
    imgs.current.set(id, img);
    return img;
  };

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    ensureAudio();
    const list = [...S.current.items];
    const media = { ...S.current.doc.media };
    let last: string | null = null;
    const skipped: string[] = [];
    for (const f of Array.from(files)) {
      const kind = detectKind(f.name, f.type);
      if (!kind) { skipped.push(f.name); continue; }
      const id = uid();
      const url = URL.createObjectURL(f);
      let duration = 5;
      if (kind === "image") {
        await loadImg(id, url).decode().catch(() => {});
      } else {
        const el = document.createElement(kind === "audio" ? "audio" : "video");
        el.preload = "metadata";
        el.muted = true;
        el.src = url;
        duration = await resolveDuration(el);
        el.removeAttribute("src"); el.load();
        if (!isFinite(duration) || duration <= 0) { URL.revokeObjectURL(url); skipped.push(f.name); continue; }
      }
      urls.current.set(id, url);
      blobs.current.set(id, f);
      media[id] = { id, kind, name: f.name, duration, type: guessMime(f.name, f.type) };
      const n = trackCount(list);
      let track = n, start = 0;
      if (kind === "audio") {
        start = list.length ? S.current.time : 0;
        for (let t = n - 1; t >= 0; t--) if (list.some((o) => o.track === t) && free(list, t, start, duration, ["audio"])) { track = t; break; }
      } else {
        const vt = list.filter((o) => o.kind === "video" || o.kind === "image").sort((a, b) => a.track - b.track)[0]?.track;
        if (vt !== undefined) { track = vt; start = list.filter((o) => o.track === vt).reduce((a, o) => Math.max(a, o.start + o.dur), 0); }
      }
      const it = mkItem(kind, { mediaId: id, name: f.name, dur: duration, track, start });
      list.push(it);
      last = it.id;
    }
    setDoc((d) => ({ ...d, items: list, media }));
    if (last) setSel(last);
    if (skipped.length) window.alert(`Couldn't import: ${skipped.join(", ")}\nThis browser can't read that file format.`);
  };

  const addText = () => {
    const t = S.current.time;
    const list = [...S.current.items];
    const n = trackCount(list);
    let track = -1;
    for (let k = 0; k < n; k++) if (list.some((o) => o.track === k) && free(list, k, t, 3, ["text"])) { track = k; break; }
    let next = list;
    if (track < 0) { next = list.map((o) => ({ ...o, track: o.track + 1 })); track = 0; }
    const it = mkItem("text", {
      track, start: t, dur: 3, name: "Text",
      style: { text: "Your text", size: 9, font: "Space Grotesk", bold: true, italic: false, color: "#ffffff", stroke: "#000000", strokeW: 12, shadow: true, bg: false },
    });
    setDoc((d) => ({ ...d, items: [...next, it] }));
    setSel(it.id);
  };

  // ---------- edit ops ----------
  const split = () => {
    const t = S.current.time;
    const under = S.current.items.filter((i) => t > i.start + 0.05 && t < i.start + i.dur - 0.05);
    const target = under.find((i) => i.id === sel) ?? under.sort((a, b) => a.track - b.track)[0];
    if (!target) return;
    const r = t - target.start;
    const right: Item = { ...target, id: uid(), start: t, dur: target.dur - r, inP: target.inP + (isMedia(target) ? r * target.speed : 0), kf: shiftKf(target.kf, -r), tIn: "none" };
    const left: Item = { ...target, dur: r, tOut: "none" };
    setDoc((d) => ({ ...d, items: d.items.flatMap((i) => (i.id === target.id ? [left, right] : [i])) }));
  };

  const del = () => {
    if (!sel) return;
    setDoc((d) => ({ ...d, items: d.items.filter((i) => i.id !== sel) }));
    setSel(null);
  };

  const setProp = (it: Item, p: Prop, v: number) => {
    updItem(it.id, (i) => {
      const ks = i.kf[p];
      if (!ks?.length) return { ...i, base: { ...i.base, [p]: v } };
      const r = clamp(S.current.time - i.start, 0, i.dur);
      const existing = ks.find((k) => Math.abs(k.t - r) <= 0.5 / FPS);
      const previous = ks.filter((k) => k.t <= r).at(-1);
      const rest = ks.filter((k) => Math.abs(k.t - r) > 0.5 / FPS);
      return { ...i, kf: { ...i.kf, [p]: [...rest, { t: r, v, easing: existing?.easing ?? previous?.easing ?? "linear" }].sort((a, b) => a.t - b.t) } };
    });
  };
  const toggleKf = (it: Item, p: Prop) => {
    const r = clamp(S.current.time - it.start, 0, it.dur);
    const cur = val(it, p, S.current.time);
    updItem(it.id, (i) => {
      const ks = i.kf[p] ?? [];
      const has = ks.some((k) => Math.abs(k.t - r) <= 0.5 / FPS);
      if (has) {
        const rest = ks.filter((k) => Math.abs(k.t - r) > 0.5 / FPS);
        return { ...i, kf: { ...i.kf, [p]: rest }, base: rest.length ? i.base : { ...i.base, [p]: cur } };
      }
      return { ...i, kf: { ...i.kf, [p]: [...ks, { t: r, v: cur, easing: ks.filter((k) => k.t <= r).at(-1)?.easing ?? "linear" }].sort((a, b) => a.t - b.t) } };
    });
  };
  const setSpeed = (it: Item, s: number) =>
    updItem(it.id, (i) => ({ ...i, speed: s, dur: (i.dur * i.speed) / s, kf: shiftKf(i.kf, 0, i.speed / s) }));
  const setStyle = (it: Item, patch: Partial<TextStyle>) => updItem(it.id, (i) => ({ ...i, style: { ...i.style!, ...patch } }));

  // ---------- timeline drag ----------
  const startDrag = (e: React.MouseEvent, it: Item, mode: "move" | "l" | "r") => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    setSel(it.id);
    const x0 = e.clientX, y0 = e.clientY;
    const orig = it;
    const startDoc = S.current.doc;
    const others = S.current.items.filter((o) => o.id !== it.id);
    const z = S.current.zoom;
    const edges = [0, S.current.time, ...others.flatMap((o) => [o.start, o.start + o.dur])];
    const snap = (v: number) => {
      let best = v, bd = 8 / z;
      for (const s of edges) { const d = Math.abs(s - v); if (d < bd) { bd = d; best = s; } }
      return best;
    };
    const mdur = it.mediaId ? S.current.doc.media[it.mediaId]?.duration ?? Infinity : Infinity;
    const maxTrack = trackCount(S.current.items);
    let moved = false;
    dragging.current = true;
    const mv = (ev: MouseEvent) => {
      if (!moved && Math.abs(ev.clientX - x0) < 3 && Math.abs(ev.clientY - y0) < 3) return;
      moved = true;
      const d = (ev.clientX - x0) / z;
      let n: Item;
      if (mode === "move") {
        const raw = Math.max(0, orig.start + d);
        const a = snap(raw), b = snap(raw + orig.dur) - orig.dur;
        const s = Math.max(0, Math.abs(a - raw) <= Math.abs(b - raw) && a !== raw ? a : b !== raw ? b : raw);
        const track = clamp(orig.track + Math.round((ev.clientY - y0) / TRACK_H), 0, maxTrack);
        n = { ...orig, start: s, track };
      } else if (mode === "l") {
        const minS = isMedia(orig) ? orig.start - orig.inP / orig.speed : 0;
        const s = clamp(snap(orig.start + d), Math.max(0, minS), orig.start + orig.dur - 0.1);
        const dd = s - orig.start;
        n = { ...orig, start: s, dur: orig.dur - dd, inP: isMedia(orig) ? orig.inP + dd * orig.speed : 0, kf: shiftKf(orig.kf, -dd) };
      } else {
        const maxEnd = isMedia(orig) ? orig.start + (mdur - orig.inP) / orig.speed : Infinity;
        const end = clamp(snap(orig.start + orig.dur + d), orig.start + 0.1, maxEnd);
        n = { ...orig, dur: end - orig.start };
      }
      setDoc((dd) => ({ ...dd, items: dd.items.map((o) => (o.id === it.id ? n : o)) }));
      setBad(collides(n, others));
    };
    const up = () => {
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("mouseup", up);
      dragging.current = false;
      setBad(false);
      if (!moved) return;
      const cur = S.current.items.find((o) => o.id === it.id);
      if (cur && collides(cur, others)) setDoc(startDoc);
      else setDoc((d) => ({ ...d }));
    };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
  };

  const scrub = (e: React.MouseEvent, deselect: boolean) => {
    if (e.button !== 0) return;
    if (deselect) setSel(null);
    const rect = contentRef.current!.getBoundingClientRect();
    const go = (x: number) => setT(clamp((x - rect.left) / S.current.zoom, 0, S.current.total));
    go(e.clientX);
    const mv = (ev: MouseEvent) => go(ev.clientX);
    const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
  };

  // Preview bounds use the same source fit and transform as the rendered media.
  const previewBounds = (it: Item) => {
    const cv = canvasRef.current;
    if (!cv) return null;
    let w = cv.width, h = cv.height;
    if (it.style) {
      const ctx = cv.getContext("2d");
      if (!ctx) return null;
      const st = it.style, px = st.size / 100 * cv.height;
      ctx.save();
      ctx.font = `${st.italic ? "italic " : ""}${st.bold ? 700 : 400} ${px}px "${st.font}", sans-serif`;
      w = ctx.measureText(st.text).width + px * 0.8;
      h = px * 1.4;
      ctx.restore();
    } else {
      const img = it.mediaId ? imgs.current.get(it.mediaId) : undefined;
      const video = els.current.get(it.id)?.el as HTMLVideoElement | undefined;
      const sw = img?.naturalWidth || video?.videoWidth || w;
      const sh = img?.naturalHeight || video?.videoHeight || h;
      const fit = Math.min(w / sw, h / sh);
      w = sw * fit; h = sh * fit;
    }
    const t = S.current.time, scale = val(it, "scale", t) / 100;
    return { x: val(it, "x", t) / 100 * cv.width, y: val(it, "y", t) / 100 * cv.height,
      w: w * scale, h: h * scale, rotation: val(it, "rotation", t) };
  };

  const previewDrag = (e: React.PointerEvent, mode: "move" | "rotate") => {
    if (e.button !== 0 || S.current.playing || exporting !== null) return;
    const cv = canvasRef.current;
    if (!cv) return;
    e.preventDefault();
    const rect = cv.getBoundingClientRect(), t = S.current.time;
    const x = (e.clientX - rect.left) / rect.width * cv.width;
    const y = (e.clientY - rect.top) / rect.height * cv.height;
    const active = S.current.items.filter((i) => i.kind !== "audio" && t >= i.start && t < i.start + i.dur).sort((a, b) => a.track - b.track);
    const it = mode === "rotate" ? active.find((i) => i.id === sel) : active.find((i) => {
      const b = previewBounds(i);
      if (!b) return false;
      const angle = b.rotation * Math.PI / 180, dx = x - b.x, dy = y - b.y;
      return Math.abs(dx * Math.cos(angle) + dy * Math.sin(angle)) <= b.w / 2
        && Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle)) <= b.h / 2;
    });
    if (!it) { setSel(null); return; }
    setSel(it.id);
    const b = previewBounds(it);
    if (!b) return;
    const x0 = e.clientX, y0 = e.clientY, bx = val(it, "x", t), by = val(it, "y", t);
    const cx = rect.left + b.x / cv.width * rect.width, cy = rect.top + b.y / cv.height * rect.height;
    let lastAngle = Math.atan2(e.clientY - cy, e.clientX - cx), rotation = b.rotation;
    let moved = false;
    dragging.current = true;
    const mv = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 2) return;
      moved = true;
      if (mode === "rotate") {
        const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx);
        const delta = Math.atan2(Math.sin(angle - lastAngle), Math.cos(angle - lastAngle));
        rotation += delta * 180 / Math.PI;
        lastAngle = angle;
        const normalized = ((rotation + 180) % 360 + 360) % 360 - 180;
        setProp(it, "rotation", ev.shiftKey ? Math.round(normalized / 15) * 15 : Math.round(normalized));
      } else {
        setProp(it, "x", +(bx + (ev.clientX - x0) / rect.width * 100).toFixed(1));
        setProp(it, "y", +(by + (ev.clientY - y0) / rect.height * 100).toFixed(1));
      }
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      dragging.current = false;
      if (moved) setDoc((d) => ({ ...d }));
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  // ---------- save / open ----------
  const saveProject = () => {
    const d = S.current.doc;
    const used = new Set(d.items.map((i) => i.mediaId).filter(Boolean) as string[]);
    const media = Object.fromEntries(Object.entries(d.media).filter(([id]) => used.has(id) && blobs.current.has(id)));
    const ids = Object.keys(media);
    const files = ids.map((id) => ({ id, size: blobs.current.get(id)!.size }));
    const json = new TextEncoder().encode(JSON.stringify({ app: "clipline", v: 1, doc: { ...d, media }, files }));
    const len = new Uint8Array(4);
    new DataView(len.buffer).setUint32(0, json.length, true);
    const blob = new Blob([len, json, ...ids.map((id) => blobs.current.get(id)!)], { type: "application/octet-stream" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "project.clipline";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    saved.current = d;
    bump((x) => x + 1);
  };

  const openProject = async (f: File | undefined) => {
    if (!f) return;
    if (S.current.items.length && S.current.doc !== saved.current && !confirm("Open another project? Unsaved changes will be lost.")) return;
    try {
      const len = new DataView(await f.slice(0, 4).arrayBuffer()).getUint32(0, true);
      const head = JSON.parse(await f.slice(4, 4 + len).text()) as { app: string; doc: Doc; files: { id: string; size: number }[] };
      if (head.app !== "clipline" && head.app !== "cutline") throw new Error("bad file");
      setPlaying(false);
      els.current.forEach((e) => { e.el.pause(); e.el.removeAttribute("src"); e.el.load(); });
      els.current.clear();
      imgs.current.clear();
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      urls.current.clear();
      blobs.current.clear();
      ensureAudio();
      let off = 4 + len;
      for (const fi of head.files) {
        const m = head.doc.media[fi.id]!;
        const b = f.slice(off, off + fi.size, m.type);
        off += fi.size;
        const url = URL.createObjectURL(b);
        blobs.current.set(fi.id, b);
        urls.current.set(fi.id, url);
        if (m.kind === "image") loadImg(fi.id, url);
      }
      hist.current = { past: [], future: [], cur: head.doc, applying: true };
      saved.current = head.doc;
      setDoc(head.doc);
      setSel(null);
      setT(0);
    } catch {
      alert("That file isn't a Clipline project.");
    }
  };

  // ---------- export ----------
  const exportVideo = async () => {
    if (!total || exporting !== null) return;
    setPlaying(false);
    const cv = canvasRef.current!;
    ensureAudio();
    const stream = cv.captureStream(30);
    audioDest.current!.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
    const mime = ["video/mp4;codecs=avc1,mp4a", "video/webm;codecs=vp9,opus", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m))!;
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: res === "1080p" ? 12_000_000 : 6_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise<void>((r) => (rec.onstop = () => r()));
    setT(0);
    await new Promise((r) => setTimeout(r, 400));
    rec.start(250);
    setExporting(0);
    setPlaying(true);
    const iv = setInterval(() => {
      setExporting(Math.min(99, Math.round((S.current.time / S.current.total) * 100)));
      if (!S.current.playing && S.current.time >= S.current.total - 0.01) {
        clearInterval(iv);
        setTimeout(() => rec.stop(), 200);
      }
    }, 200);
    await done;
    const blob = new Blob(chunks, { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `clipline-export.${mime.includes("mp4") ? "mp4" : "webm"}`;
    a.click();
    setExporting(null);
  };

  // ---------- keyboard & unload ----------
  useEffect(() => {
    const isTyping = (el: HTMLElement) =>
      (el.tagName === "INPUT" && ["text", "number", "search"].includes((el as HTMLInputElement).type)) || el.tagName === "TEXTAREA" || el.isContentEditable;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = isTyping(el);
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === "s") { e.preventDefault(); saveProject(); return; }
      if (mod && k === "o") { e.preventDefault(); projInput.current?.click(); return; }
      if (mod && !typing) {
        if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
        if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); redo(); return; }
      }
      if (typing || el.tagName === "SELECT" || mod) return;
      if ((e.key === "," || e.key === ".") && !S.current.playing) {
        e.preventDefault();
        const step = e.key === "," ? -1 / FPS : 1 / FPS;
        setT(clamp(Math.round((S.current.time + step) * FPS) / FPS, 0, S.current.total));
        return;
      }
      if (e.code === "Space") { e.preventDefault(); if (!e.repeat) togglePlay(); return; }
      if (k === "s") split();
      if (e.key === "Delete" || e.key === "Backspace") del();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTyping(e.target as HTMLElement)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); };
  });

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (S.current.items.length && S.current.doc !== saved.current) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  // ---------- render ----------
  const selItem = items.find((i) => i.id === sel);
  const [W, H] = RES[res];
  const selection = selItem && selItem.kind !== "audio" && time >= selItem.start && time < selItem.start + selItem.dur && !playing && exporting === null ? previewBounds(selItem) : null;
  const previewWidth = Math.min(stageSize.w, stageSize.h * W / H);
  const rotateAngle = (selection?.rotation ?? 0) * Math.PI / 180;
  const handleDistance = selection ? selection.h / 2 + 24 * W / previewWidth : 0;
  const timelineLen = Math.max(total + 20, 60);
  const step = STEPS.find((s) => s * zoom >= 70) ?? 600;
  const minor = step / (step === 0.25 ? 5 : 5);
  const zv = (Math.log(zoom / Z_MIN) / Math.log(Z_MAX / Z_MIN)) * 100;
  const h = hist.current;
  const canUndo = h.past.length > 0 || doc !== h.cur;
  const btn = "inline-flex h-8 items-center gap-1.5 rounded-md bg-secondary/70 px-2.5 text-sm transition hover:bg-accent disabled:opacity-40";
  const field = "mt-1 h-9 w-full rounded-md border bg-secondary/70 px-2";
  const KindIcon = ({ k }: { k: Kind }) => {
    const C = k === "video" ? Film : k === "image" ? ImageIcon : k === "audio" ? Music : Type;
    return <C className="h-3 w-3 shrink-0" />;
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden text-foreground">
      <header className="glass flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <div className="mr-3 flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="inline-block h-3 w-3 rounded-sm bg-primary" /> Clipline
        </div>
        <button onClick={() => fileInput.current?.click()} className={btn} title="Import video, photos or audio"><Upload className="h-4 w-4" /><span className="hidden md:inline">Import</span></button>
        <button onClick={addText} className={btn} title="Add text"><Type className="h-4 w-4" /><span className="hidden md:inline">Text</span></button>
        <input ref={fileInput} type="file" accept="video/*,image/*,audio/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        <input ref={projInput} type="file" accept=".clipline,.cutline" hidden onChange={(e) => { openProject(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => projInput.current?.click()} className={btn} title="Open project (Ctrl+O)"><FolderOpen className="h-4 w-4" /><span className="hidden md:inline">Open</span></button>
          <button onClick={saveProject} disabled={!items.length} className={btn} title="Save project (Ctrl+S)"><Save className="h-4 w-4" /><span className="hidden md:inline">Save</span>{items.length > 0 && doc !== saved.current && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}</button>
          <select value={res} onChange={(e) => setRes(e.target.value as ResKey)} className="h-8 rounded-md border bg-secondary/70 px-2 text-sm">
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
          </select>
          <button onClick={exportVideo} disabled={!total || exporting !== null} className="h-8 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40">
            {exporting !== null ? `Exporting ${exporting}%` : "Export"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main ref={stageRef} className="flex min-w-0 flex-1 items-center justify-center bg-stage/60 p-4">
          <div className="relative shrink-0" style={{ width: previewWidth, aspectRatio: `${W} / ${H}` }}>
            <canvas ref={canvasRef} width={W} height={H} onPointerDown={(e) => previewDrag(e, "move")}
              aria-label="Video preview" className="block h-full w-full touch-none rounded-md shadow-2xl cursor-move" />
            {selection && <>
              <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible text-primary" aria-hidden="true">
                <g transform={`translate(${selection.x} ${selection.y}) rotate(${selection.rotation})`}>
                  <rect x={-selection.w / 2} y={-selection.h / 2} width={selection.w} height={selection.h} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                  <line x1={0} x2={0} y1={selection.h / 2} y2={handleDistance} stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                </g>
              </svg>
              <Button size="icon" variant="outline" aria-label="Rotate selection" title="Drag to rotate" onPointerDown={(e) => previewDrag(e, "rotate")}
                className="absolute z-10 h-7 w-7 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-primary bg-background text-primary cursor-grab active:cursor-grabbing"
                style={{ left: `${(selection.x - Math.sin(rotateAngle) * handleDistance) / W * 100}%`, top: `${(selection.y + Math.cos(rotateAngle) * handleDistance) / H * 100}%` }}>
                <RotateCw />
              </Button>
            </>}
            {!items.length && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-sm text-muted-foreground">Import video, photos or audio to start editing</div>
            )}
          </div>
        </main>

        <aside className="glass w-72 shrink-0 space-y-3 overflow-y-auto border-l p-4 text-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Properties</h3>
          {!selItem && <p className="text-muted-foreground">Select something on the timeline. Drag items to move them, drag their edges to trim, and drag up or down to change track.</p>}
          {selItem && (
            <>
              <p className="flex items-center gap-1.5 truncate font-medium"><KindIcon k={selItem.kind} />{selItem.kind === "text" ? "Text" : selItem.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{fmt(selItem.start)} → {fmt(selItem.start + selItem.dur)}</p>

              {selItem.style && (
                <div className="space-y-3 rounded-lg border p-3">
                  <input value={selItem.style.text} onChange={(e) => setStyle(selItem, { text: e.target.value })} className="h-9 w-full rounded-md border bg-secondary/70 px-2" />
                  <label className="block">Font
                    <select value={selItem.style.font} onChange={(e) => setStyle(selItem, { font: e.target.value })} className={field} style={{ fontFamily: selItem.style.font }}>
                      {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                    </select>
                  </label>
                  <div className="flex gap-1">
                    {([["bold", "B"], ["italic", "I"], ["shadow", "Shadow"], ["bg", "Box"]] as const).map(([k, l]) => {
                      const on = selItem.style![k];
                      return <button key={k} onClick={() => setStyle(selItem, { [k]: !on })} className={`h-8 flex-1 rounded-md text-xs ${on ? "bg-primary text-primary-foreground" : "bg-secondary/70 hover:bg-accent"}`}>{l}</button>;
                    })}
                  </div>
                  <div className="flex gap-2">
                    <label className="flex-1">Fill<input type="color" value={selItem.style.color} onChange={(e) => setStyle(selItem, { color: e.target.value })} className="mt-1 h-9 w-full cursor-pointer rounded-md border bg-secondary" /></label>
                    <label className="flex-1">Stroke<input type="color" value={selItem.style.stroke} onChange={(e) => setStyle(selItem, { stroke: e.target.value })} className="mt-1 h-9 w-full cursor-pointer rounded-md border bg-secondary" /></label>
                  </div>
                  <label className="block">Stroke width
                    <input type="range" min={0} max={40} value={selItem.style.strokeW} onChange={(e) => setStyle(selItem, { strokeW: +e.target.value })} className="w-full" />
                  </label>
                  <label className="block">Font size
                    <input type="range" min={2} max={30} step={0.5} value={selItem.style.size} onChange={(e) => setStyle(selItem, { size: +e.target.value })} className="w-full" />
                  </label>
                </div>
              )}

              {isMedia(selItem) && (
                <label className="block">Speed <span className="font-mono text-muted-foreground">{selItem.speed.toFixed(2)}×</span>
                  <input type="range" min={0.25} max={4} step={0.05} value={selItem.speed} onChange={(e) => setSpeed(selItem, +e.target.value)} className="w-full" />
                </label>
              )}

              <div className="grid grid-cols-2 gap-2">
                {(["in", "out"] as const).map((w) => {
                  const tk = w === "in" ? "tIn" : "tOut", dk = w === "in" ? "tInD" : "tOutD";
                  const opts = selItem.kind === "audio" ? (["none", "fade"] as Trans[]) : TRANSITIONS;
                  return (
                    <div key={w}>
                      <label className="block">Transition {w}
                        <select value={selItem[tk]} onChange={(e) => updItem(selItem.id, (i) => ({ ...i, [tk]: e.target.value as Trans }))} className={`${field} capitalize`}>
                          {opts.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </label>
                      {selItem[tk] !== "none" && (
                        <label className="mt-1 block text-xs text-muted-foreground">{selItem[dk].toFixed(1)}s
                          <input type="range" min={0.1} max={Math.max(0.2, Math.min(3, selItem.dur))} step={0.1} value={selItem[dk]} onChange={(e) => updItem(selItem.id, (i) => ({ ...i, [dk]: +e.target.value }))} className="w-full" />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Animate</h4>
                  <span className="text-[10px] text-muted-foreground">◇ = add keyframe</span>
                </div>
                {KIND_PROPS[selItem.kind].map((p) => {
                  const d = PROPS[p];
                  const ks = selItem.kf[p] ?? [];
                  const r = time - selItem.start;
                  const inRange = r >= 0 && r <= selItem.dur;
                  const on = ks.some((k) => Math.abs(k.t - r) <= 0.5 / FPS);
                  const outgoing = ks.filter((k) => k.t <= r + 0.5 / FPS).at(-1) ?? ks[0];
                  const v = val(selItem, p, time);
                  return (
                    <div key={p}>
                      <div className="flex items-center justify-between">
                        <span>{d.label}</span>
                        <span className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-muted-foreground">{Math.round(v)}{d.unit}</span>
                          <button onClick={() => toggleKf(selItem, p)} disabled={!inRange} aria-label={`${on ? "Remove" : "Add"} ${d.label} keyframe`} title={on ? "Remove keyframe" : "Add keyframe here"}
                            className={`w-4 text-sm leading-none disabled:opacity-30 ${on ? "text-primary" : ks.length ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{on ? "◆" : "◇"}</button>
                        </span>
                      </div>
                      <input aria-label={d.label} type="range" min={d.min} max={d.max} step={p === "x" || p === "y" ? 0.5 : 1} value={v} onChange={(e) => setProp(selItem, p, +e.target.value)} className="w-full" />
                      {outgoing && <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        Easing
                        <select aria-label={`${d.label} easing`} value={outgoing.easing ?? "smooth"} className="h-7 min-w-0 flex-1 rounded-md border bg-secondary px-1 text-foreground"
                          onChange={(e) => {
                            const easing = e.target.value as Easing;
                            updItem(selItem.id, (i) => ({ ...i, kf: { ...i.kf, [p]: (i.kf[p] ?? []).map((k) => k.t === outgoing.t ? { ...k, easing } : k) } }));
                          }}>
                          {EASINGS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>}
                    </div>
                  );
                })}
                <p className="text-[11px] text-muted-foreground">Once a property has a keyframe, moving its slider sets a keyframe at the playhead.</p>
              </div>

              <button onClick={del} className="h-9 w-full rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25">Delete</button>
            </>
          )}
        </aside>
      </div>

      <section className="glass flex h-64 shrink-0 flex-col border-t">
        <div className="flex h-12 shrink-0 items-center gap-2 overflow-x-auto border-b px-3">
          <div className="flex flex-1 items-center gap-1.5">
            <button onClick={undo} disabled={!canUndo} className={btn} title="Undo (Ctrl+Z)"><Undo2 className="h-4 w-4" /></button>
            <button onClick={redo} disabled={!h.future.length} className={btn} title="Redo (Ctrl+Shift+Z / Ctrl+Y)"><Redo2 className="h-4 w-4" /></button>
            <button onClick={split} disabled={!items.length} className={btn} title="Split at playhead (S)"><Scissors className="h-4 w-4" /><span className="hidden lg:inline">Split</span></button>
            <button onClick={del} disabled={!sel} className={btn} title="Delete"><Trash2 className="h-4 w-4" /><span className="hidden lg:inline">Delete</span></button>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden w-20 text-right font-mono text-xs text-muted-foreground sm:inline">{fmt(time)}</span>
            <button onClick={togglePlay} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90" aria-label={playing ? "Pause" : "Play"} title="Play / pause (Space)">
              {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
            </button>
            <span className="hidden w-20 font-mono text-xs text-muted-foreground sm:inline">{fmt(total)}</span>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2 text-xs text-muted-foreground">
            <Search className="h-4 w-4 shrink-0" aria-label="Zoom" />
            <input type="range" min={0} max={100} step={0.5} value={zv} onChange={(e) => setZoom(Z_MIN * Math.pow(Z_MAX / Z_MIN, +e.target.value / 100))} className="w-24" aria-label="Timeline zoom" />
            <button onClick={() => setZoom(Z_DEF)} className="h-7 rounded-md bg-secondary/70 px-2 hover:bg-accent hover:text-foreground" title="Reset zoom">Reset</button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto pl-3">
          <div ref={contentRef} className="relative" style={{ width: timelineLen * zoom, minHeight: "100%" }}>
            <div className="sticky top-0 z-20 h-6 cursor-pointer border-b bg-background/80 font-mono text-[10px] text-muted-foreground" onMouseDown={(e) => scrub(e, false)}
              style={{ backgroundImage: "linear-gradient(to right, var(--border) 1px, transparent 1px)", backgroundSize: `${minor * zoom}px 5px`, backgroundRepeat: "repeat-x", backgroundPosition: "0 100%" }}>
              {Array.from({ length: Math.floor(timelineLen / step) + 1 }).map((_, i) => (
                <span key={i} className="absolute top-0 h-full border-l border-muted-foreground/50 pl-1 leading-4" style={{ left: i * step * zoom }}>{fmtRuler(i * step, step)}</span>
              ))}
            </div>
            <div className="relative" style={{ height: (tracks + 1) * TRACK_H }} onMouseDown={(e) => scrub(e, true)}>
              {Array.from({ length: tracks + 1 }).map((_, i) => (
                <div key={i} className={`pointer-events-none absolute inset-x-0 border-b ${i % 2 ? "bg-foreground/[0.02]" : ""}`} style={{ top: i * TRACK_H, height: TRACK_H }} />
              ))}
              {items.map((it) => {
                const kts = [...new Set(Object.values(it.kf).flat().map((k) => +k.t.toFixed(3)))];
                const isSel = sel === it.id;
                return (
                  <div key={it.id} onMouseDown={(e) => startDrag(e, it, "move")}
                    className={`group absolute flex cursor-grab items-center overflow-hidden rounded-md text-xs font-medium text-primary-foreground shadow-sm active:cursor-grabbing ${COLOR[it.kind]} ${isSel ? (bad ? "ring-2 ring-destructive" : "z-10 ring-2 ring-foreground") : ""}`}
                    style={{ left: it.start * zoom, width: Math.max(6, it.dur * zoom), top: it.track * TRACK_H + 4, height: TRACK_H - 8 }}>
                    {it.tIn !== "none" && <div className="pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r from-background/50 to-transparent" style={{ width: it.tInD * zoom }} />}
                    {it.tOut !== "none" && <div className="pointer-events-none absolute inset-y-0 right-0 bg-gradient-to-l from-background/50 to-transparent" style={{ width: it.tOutD * zoom }} />}
                    <span className="pointer-events-none flex min-w-0 items-center gap-1 px-2.5">
                      <KindIcon k={it.kind} />
                      <span className="truncate">{it.style ? it.style.text : it.name}</span>
                      {it.speed !== 1 && <span className="font-mono opacity-80">{it.speed.toFixed(2)}×</span>}
                    </span>
                    {kts.map((t) => (
                      <span key={t} onMouseDown={(e) => { e.stopPropagation(); setT(it.start + t); setSel(it.id); }}
                        className="absolute bottom-0 -translate-x-1/2 cursor-pointer text-[9px] leading-none text-foreground" style={{ left: t * zoom }} title="Jump to keyframe">◆</span>
                    ))}
                    <div onMouseDown={(e) => startDrag(e, it, "l")} className="absolute inset-y-0 left-0 w-2 cursor-ew-resize rounded-l-md group-hover:bg-foreground/40" />
                    <div onMouseDown={(e) => startDrag(e, it, "r")} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize rounded-r-md group-hover:bg-foreground/40" />
                  </div>
                );
              })}
            </div>
            <div className="pointer-events-none absolute top-0 bottom-0 z-30 w-0.5 bg-primary" style={{ left: time * zoom }}>
              <div className="-ml-1.5 h-3 w-3.5 rounded-sm bg-primary" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
