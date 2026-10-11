import { useCallback, useEffect, useRef, useState } from "react";

type Transition = "none" | "fade" | "dissolve" | "slide" | "wipe" | "zoom";
type Clip = { id: string; name: string; url: string; duration: number; inP: number; outP: number; transition?: Transition; tDur?: number };
type TextItem = {
  id: string; text: string; start: number; end: number; size: number; y: number;
  font?: string; bold?: boolean; italic?: boolean; color?: string; stroke?: string; strokeW?: number; shadow?: boolean; bg?: boolean;
};
const FONTS = ["Space Grotesk", "Anton", "Bebas Neue", "Playfair Display", "Pacifico", "Permanent Marker", "JetBrains Mono"];
const TRANSITIONS: Transition[] = ["none", "fade", "dissolve", "slide", "wipe", "zoom"];
const FPS = 30;
type Doc = { clips: Clip[]; texts: TextItem[]; grade: Grade };
type Grade = { brightness: number; contrast: number; saturate: number };

const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const f = Math.floor((s % 1) * 30);
  return `${m}:${String(sec).padStart(2, "0")}.${String(f).padStart(2, "0")}`;
};
const RES = { "720p": [1280, 720], "1080p": [1920, 1080] } as const;
type ResKey = keyof typeof RES;

export function VideoEditor() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [grade, setGrade] = useState<Grade>({ brightness: 100, contrast: 100, saturate: 100 });
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<{ kind: "clip" | "text"; id: string } | null>(null);
  const [zoom, setZoom] = useState(60);
  const [res, setRes] = useState<ResKey>("1080p");
  const [exporting, setExporting] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videos = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioCtx = useRef<AudioContext | null>(null);
  const audioDest = useRef<MediaStreamAudioDestinationNode | null>(null);
  const state = useRef({ clips, texts, grade, time, playing, res });
  state.current = { clips, texts, grade, time, playing, res };
  const activeId = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // undo / redo: snapshot doc changes (debounced so slider drags = one step)
  const hist = useRef<{ past: Doc[]; future: Doc[]; cur: Doc; applying: boolean }>({
    past: [], future: [], cur: { clips: [], texts: [], grade: { brightness: 100, contrast: 100, saturate: 100 } }, applying: false,
  });
  const [, bump] = useState(0);
  useEffect(() => {
    const h = hist.current;
    if (h.applying) { h.applying = false; return; }
    const next = { clips, texts, grade };
    const id = setTimeout(() => {
      h.past.push(h.cur);
      if (h.past.length > 100) h.past.shift();
      h.cur = next;
      h.future = [];
      bump((x) => x + 1);
    }, 350);
    return () => clearTimeout(id);
  }, [clips, texts, grade]);
  const applyDoc = (d: Doc) => {
    hist.current.applying = true;
    hist.current.cur = d;
    setClips(d.clips); setTexts(d.texts); setGrade(d.grade);
    setSel(null);
    bump((x) => x + 1);
  };
  const undo = () => {
    const h = hist.current;
    const live = { clips: state.current.clips, texts: state.current.texts, grade: state.current.grade };
    if (live.clips !== h.cur.clips || live.texts !== h.cur.texts || live.grade !== h.cur.grade) { h.future.push(live); applyDoc(h.cur); return; }
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

  const total = clips.reduce((a, c) => a + (c.outP - c.inP), 0);

  const ensureAudio = () => {
    if (!audioCtx.current) {
      audioCtx.current = new AudioContext();
      audioDest.current = audioCtx.current.createMediaStreamDestination();
    }
    audioCtx.current.resume();
    return audioCtx.current;
  };

  const locate = (t: number, list = state.current.clips) => {
    let acc = 0;
    for (const c of list) {
      const len = c.outP - c.inP;
      if (t < acc + len || c === list[list.length - 1]) return { clip: c, local: c.inP + Math.min(t - acc, len) };
      acc += len;
    }
    return null;
  };

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const ctx = ensureAudio();
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("video")) continue;
      const url = URL.createObjectURL(f);
      const v = document.createElement("video");
      v.src = url;
      v.playsInline = true;
      v.preload = "auto";
      v.crossOrigin = "anonymous";
      await new Promise<void>((r) => (v.onloadedmetadata = () => r()));
      const id = uid();
      const src = ctx.createMediaElementSource(v);
      src.connect(ctx.destination);
      src.connect(audioDest.current!);
      videos.current.set(id, v);
      setClips((p) => [...p, { id, name: f.name, url, duration: v.duration, inP: 0, outP: v.duration }]);
    }
  };

  // render loop
  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const { texts, grade, time } = state.current;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cv.width, cv.height);
    const loc = locate(time);
    const paint = (v: HTMLVideoElement | undefined, alpha = 1, dx = 0, scale = 1) => {
      if (!v || !v.videoWidth) return;
      const s = Math.min(cv.width / v.videoWidth, cv.height / v.videoHeight) * scale;
      const w = v.videoWidth * s, h = v.videoHeight * s;
      ctx.globalAlpha = alpha;
      ctx.filter = `brightness(${grade.brightness}%) contrast(${grade.contrast}%) saturate(${grade.saturate}%)`;
      ctx.drawImage(v, (cv.width - w) / 2 + dx, (cv.height - h) / 2, w, h);
      ctx.filter = "none";
      ctx.globalAlpha = 1;
    };
    if (loc) {
      const list = state.current.clips;
      const idx = list.indexOf(loc.clip);
      const prevClip = idx > 0 ? list[idx - 1] : undefined;
      const tr = loc.clip.transition ?? "none";
      const td = Math.min(loc.clip.tDur ?? 0.6, (loc.clip.outP - loc.clip.inP) / 2);
      const into = loc.local - loc.clip.inP;
      const cur = videos.current.get(loc.clip.id);
      if (prevClip && tr !== "none" && into < td) {
        const p = into / td;
        const prev = videos.current.get(prevClip.id);
        const W = cv.width;
        if (tr === "fade") { if (p < 0.5) paint(prev, 1 - p * 2); else paint(cur, p * 2 - 1); }
        else if (tr === "dissolve") { paint(prev); paint(cur, p); }
        else if (tr === "slide") { const e = 1 - Math.pow(1 - p, 3); paint(prev, 1, -e * W); paint(cur, 1, (1 - e) * W); }
        else if (tr === "wipe") { paint(prev); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W * p, cv.height); ctx.clip(); paint(cur); ctx.restore(); }
        else if (tr === "zoom") { paint(prev, 1 - p, 0, 1 + p * 0.4); paint(cur, p, 0, 1.4 - p * 0.4); }
      } else paint(cur);
    }
    for (const t of texts) {
      if (time < t.start || time > t.end) continue;
      const px = (t.size / 100) * cv.height;
      ctx.font = `${t.italic ? "italic " : ""}${t.bold === false ? 400 : 700} ${px}px "${t.font ?? "Space Grotesk"}", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      const y = (t.y / 100) * cv.height;
      if (t.bg) {
        const w = ctx.measureText(t.text).width;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath();
        ctx.roundRect(cv.width / 2 - w / 2 - px * 0.4, y - px * 0.7, w + px * 0.8, px * 1.4, px * 0.2);
        ctx.fill();
      }
      if (t.shadow !== false) { ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = px * 0.25; ctx.shadowOffsetY = px * 0.06; }
      const sw = t.strokeW ?? 12;
      if (sw > 0) {
        ctx.lineWidth = (px * sw) / 100;
        ctx.strokeStyle = t.stroke ?? "#000000";
        ctx.strokeText(t.text, cv.width / 2, y);
        ctx.shadowColor = "transparent";
      }
      ctx.fillStyle = t.color ?? "#ffffff";
      ctx.fillText(t.text, cv.width / 2, y);
      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    }
  }, []);

  // sync videos to timeline time when paused / scrubbing
  const seekTo = useCallback((t: number) => {
    const loc = locate(t);
    if (!loc) return;
    const v = videos.current.get(loc.clip.id)!;
    if (Math.abs(v.currentTime - loc.local) > 0.02) v.currentTime = loc.local;
    v.onseeked = () => draw();
    const list = state.current.clips;
    const i = list.indexOf(loc.clip);
    if (i > 0 && (loc.clip.transition ?? "none") !== "none") {
      const pv = videos.current.get(list[i - 1]!.id)!;
      const end = Math.max(0, list[i - 1]!.outP - 0.04);
      if (Math.abs(pv.currentTime - end) > 0.05) { pv.currentTime = end; pv.onseeked = () => draw(); }
    }
  }, [draw]);

  useEffect(() => {
    const fams = new Set(texts.map((t) => t.font ?? "Space Grotesk"));
    Promise.all([...fams].map((f) => document.fonts.load(`700 40px "${f}"`).catch(() => null))).then(() => draw());
  }, [texts, draw]);

  useEffect(() => {
    if (!playing) { seekTo(time); draw(); }
  }, [time, playing, clips, texts, grade, res, seekTo, draw]);

  // playback
  useEffect(() => {
    if (!playing) {
      videos.current.forEach((v) => v.pause());
      activeId.current = null;
      return;
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const st = state.current;
      const totalLen = st.clips.reduce((a, c) => a + (c.outP - c.inP), 0);
      let t = st.time;
      const loc = locate(t);
      if (loc) {
        const v = videos.current.get(loc.clip.id)!;
        if (activeId.current !== loc.clip.id) {
          if (activeId.current) { const pv = videos.current.get(activeId.current); pv?.pause(); }
          activeId.current = loc.clip.id;
          v.currentTime = loc.local;
          v.play();
          t += dt;
        } else {
          // derive time from video clock for A/V sync
          let acc = 0;
          for (const c of st.clips) { if (c.id === loc.clip.id) break; acc += c.outP - c.inP; }
          t = !v.paused && !v.seeking ? acc + (v.currentTime - loc.clip.inP) : t + dt;
          if (v.currentTime >= loc.clip.outP - 0.02) { t = acc + (loc.clip.outP - loc.clip.inP) + 0.0001; }
        }
      }
      if (t >= totalLen) { setTime(totalLen); setPlaying(false); return; }
      state.current.time = t;
      setTime(t);
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, draw]);

  const togglePlay = () => {
    if (!clips.length) return;
    ensureAudio();
    if (!playing && time >= total - 0.05) setTime(0);
    setPlaying((p) => !p);
  };

  const split = () => {
    const loc = locate(time);
    if (!loc) return;
    const { clip, local } = loc;
    if (local - clip.inP < 0.1 || clip.outP - local < 0.1) return;
    const v = videos.current.get(clip.id)!;
    const nid = uid();
    const v2 = v.cloneNode() as HTMLVideoElement;
    v2.src = clip.url;
    const ctx = ensureAudio();
    const s = ctx.createMediaElementSource(v2);
    s.connect(ctx.destination);
    s.connect(audioDest.current!);
    videos.current.set(nid, v2);
    setClips((p) => p.flatMap((c) => c.id === clip.id
      ? [{ ...c, outP: local }, { ...c, id: nid, inP: local }]
      : [c]));
  };

  const del = () => {
    if (!sel) return;
    if (sel.kind === "clip") setClips((p) => p.filter((c) => c.id !== sel.id));
    else setTexts((p) => p.filter((t) => t.id !== sel.id));
    setSel(null);
  };

  const move = (dir: -1 | 1) => {
    if (sel?.kind !== "clip") return;
    setClips((p) => {
      const i = p.findIndex((c) => c.id === sel.id);
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const n = [...p];
      [n[i], n[j]] = [n[j]!, n[i]!];
      return n;
    });
  };

  const addText = () => {
    const t: TextItem = { id: uid(), text: "Your text", start: time, end: Math.min(time + 3, Math.max(total, 3)), size: 9, y: 80, font: "Space Grotesk", bold: true, color: "#ffffff", stroke: "#000000", strokeW: 12, shadow: true };
    setTexts((p) => [...p, t]);
    setSel({ kind: "text", id: t.id });
  };

  const exportVideo = async () => {
    if (!clips.length || exporting !== null) return;
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
    setTime(0);
    state.current.time = 0;
    await new Promise((r) => setTimeout(r, 300));
    rec.start(250);
    setExporting(0);
    setPlaying(true);
    const iv = setInterval(() => {
      setExporting(Math.min(99, Math.round((state.current.time / total) * 100)));
      if (!state.current.playing && state.current.time >= total - 0.01) {
        clearInterval(iv);
        setTimeout(() => rec.stop(), 200);
      }
    }, 200);
    await done;
    const blob = new Blob(chunks, { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cutline-export.${mime.includes("mp4") ? "mp4" : "webm"}`;
    a.click();
    setExporting(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const typing = tag === "INPUT" && (e.target as HTMLInputElement).type === "text" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !typing) {
        const k = e.key.toLowerCase();
        if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
        if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); redo(); return; }
      }
      if (typing || tag === "SELECT") return;
      if (mod) return;
      if ((e.key === "," || e.key === ".") && !playing) {
        e.preventDefault();
        const step = e.key === "," ? -1 / FPS : 1 / FPS;
        setTime((t) => Math.max(0, Math.min(total, Math.round((t + step) * FPS) / FPS)));
        return;
      }
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      if (e.key === "s") split();
      if (e.key === "Delete" || e.key === "Backspace") del();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const selClip = sel?.kind === "clip" ? clips.find((c) => c.id === sel.id) : undefined;
  const selText = sel?.kind === "text" ? texts.find((t) => t.id === sel.id) : undefined;
  const [W, H] = RES[res];
  const timelineW = Math.max(total, 10) * zoom + 40;

  const scrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const go = (x: number) => setTime(Math.max(0, Math.min(total, (x - rect.left) / zoom)));
    go(e.clientX);
    const mv = (ev: MouseEvent) => go(ev.clientX);
    const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-14 items-center justify-between border-b px-5">
        <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="inline-block h-3 w-3 rounded-sm bg-primary" /> Cutline
        </div>
        <div className="flex items-center gap-3">
          <select value={res} onChange={(e) => setRes(e.target.value as ResKey)} className="h-9 rounded-md border bg-secondary px-2 text-sm">
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
          </select>
          <button onClick={exportVideo} disabled={!clips.length || exporting !== null} className="h-9 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40">
            {exporting !== null ? `Exporting ${exporting}%` : "Export"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-64 shrink-0 space-y-4 overflow-y-auto border-r p-4">
          <button onClick={() => fileInput.current?.click()} className="flex h-24 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground transition hover:border-primary hover:text-foreground">
            <span className="text-2xl">+</span> Import videos
          </button>
          <input ref={fileInput} type="file" accept="video/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <button onClick={addText} disabled={!clips.length} className="h-10 w-full rounded-md bg-secondary text-sm font-medium transition hover:bg-accent disabled:opacity-40">T  Add text</button>
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Color</h3>
            {(["brightness", "contrast", "saturate"] as const).map((k) => (
              <label key={k} className="mb-3 block text-sm">
                <div className="mb-1 flex justify-between capitalize"><span>{k === "saturate" ? "saturation" : k}</span><span className="font-mono text-muted-foreground">{grade[k]}</span></div>
                <input type="range" min={0} max={200} value={grade[k]} onChange={(e) => setGrade({ ...grade, [k]: +e.target.value })} className="w-full" />
              </label>
            ))}
            <button onClick={() => setGrade({ brightness: 100, contrast: 100, saturate: 100 })} className="text-xs text-muted-foreground hover:text-foreground">Reset</button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 bg-stage p-6">
          <div className="relative flex w-full max-w-4xl items-center justify-center">
            <canvas ref={canvasRef} width={W} height={H} className="aspect-video w-full rounded-md shadow-2xl" />
            {!clips.length && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">Import a video to start editing</div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="w-24 text-right font-mono text-sm text-muted-foreground">{fmt(time)}</span>
            <button onClick={togglePlay} className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:scale-105" aria-label="Play">
              {playing ? "❚❚" : "▶"}
            </button>
            <span className="w-24 font-mono text-sm text-muted-foreground">{fmt(total)}</span>
          </div>
        </main>

        <aside className="w-64 shrink-0 space-y-3 overflow-y-auto border-l p-4 text-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Properties</h3>
          {!sel && <p className="text-muted-foreground">Select a clip or text on the timeline.</p>}
          {selClip && (
            <>
              <p className="truncate font-medium">{selClip.name}</p>
              <label className="block">Trim start <span className="font-mono text-muted-foreground">{selClip.inP.toFixed(2)}s</span>
                <input type="range" min={0} max={selClip.duration} step={0.01} value={selClip.inP} onChange={(e) => setClips((p) => p.map((c) => c.id === selClip.id ? { ...c, inP: Math.min(+e.target.value, c.outP - 0.1) } : c))} className="w-full" />
              </label>
              <label className="block">Trim end <span className="font-mono text-muted-foreground">{selClip.outP.toFixed(2)}s</span>
                <input type="range" min={0} max={selClip.duration} step={0.01} value={selClip.outP} onChange={(e) => setClips((p) => p.map((c) => c.id === selClip.id ? { ...c, outP: Math.max(+e.target.value, c.inP + 0.1) } : c))} className="w-full" />
              </label>
              <label className="block">Transition in
                <select disabled={clips[0]?.id === selClip.id} value={selClip.transition ?? "none"} onChange={(e) => setClips((p) => p.map((c) => c.id === selClip.id ? { ...c, transition: e.target.value as Transition } : c))} className="mt-1 h-9 w-full rounded-md border bg-secondary px-2 capitalize disabled:opacity-40">
                  {TRANSITIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              {clips[0]?.id === selClip.id && <p className="text-xs text-muted-foreground">First clip has no transition.</p>}
              {(selClip.transition ?? "none") !== "none" && (
                <label className="block">Duration <span className="font-mono text-muted-foreground">{(selClip.tDur ?? 0.6).toFixed(1)}s</span>
                  <input type="range" min={0.2} max={2} step={0.1} value={selClip.tDur ?? 0.6} onChange={(e) => setClips((p) => p.map((c) => c.id === selClip.id ? { ...c, tDur: +e.target.value } : c))} className="w-full" />
                </label>
              )}
              <div className="flex gap-2">
                <button onClick={() => move(-1)} className="h-9 flex-1 rounded-md bg-secondary hover:bg-accent">← Move</button>
                <button onClick={() => move(1)} className="h-9 flex-1 rounded-md bg-secondary hover:bg-accent">Move →</button>
              </div>
            </>
          )}
          {selText && (
            <>
              <input value={selText.text} onChange={(e) => setTexts((p) => p.map((t) => t.id === selText.id ? { ...t, text: e.target.value } : t))} className="h-9 w-full rounded-md border bg-secondary px-2" />
              <label className="block">Font
                <select value={selText.font ?? "Space Grotesk"} onChange={(e) => setTexts((p) => p.map((t) => t.id === selText.id ? { ...t, font: e.target.value } : t))} className="mt-1 h-9 w-full rounded-md border bg-secondary px-2" style={{ fontFamily: selText.font }}>
                  {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                </select>
              </label>
              <div className="flex gap-1">
                {([["bold", "B", true], ["italic", "I", false], ["shadow", "Shadow", true], ["bg", "Box", false]] as const).map(([k, l, def]) => {
                  const on = selText[k] ?? def;
                  return <button key={k} onClick={() => setTexts((p) => p.map((t) => t.id === selText.id ? { ...t, [k]: !on } : t))} className={`h-8 flex-1 rounded-md text-xs ${on ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-accent"}`}>{l}</button>;
                })}
              </div>
              <div className="flex gap-2">
                <label className="flex-1">Fill<input type="color" value={selText.color ?? "#ffffff"} onChange={(e) => setTexts((p) => p.map((t) => t.id === selText.id ? { ...t, color: e.target.value } : t))} className="mt-1 h-9 w-full cursor-pointer rounded-md border bg-secondary" /></label>
                <label className="flex-1">Stroke<input type="color" value={selText.stroke ?? "#000000"} onChange={(e) => setTexts((p) => p.map((t) => t.id === selText.id ? { ...t, stroke: e.target.value } : t))} className="mt-1 h-9 w-full cursor-pointer rounded-md border bg-secondary" /></label>
              </div>
              <label className="block">Stroke width
                <input type="range" min={0} max={40} value={selText.strokeW ?? 12} onChange={(e) => setTexts((p) => p.map((t) => t.id === selText.id ? { ...t, strokeW: +e.target.value } : t))} className="w-full" />
              </label>
              {([["size", "Size", 3, 25], ["y", "Position", 5, 95]] as const).map(([k, l, mn, mx]) => (
                <label key={k} className="block">{l}
                  <input type="range" min={mn} max={mx} value={selText[k]} onChange={(e) => setTexts((p) => p.map((t) => t.id === selText.id ? { ...t, [k]: +e.target.value } : t))} className="w-full" />
                </label>
              ))}
              <div className="flex gap-2">
                <button onClick={() => setTexts((p) => p.map((t) => t.id === selText.id ? { ...t, start: time } : t))} className="h-9 flex-1 rounded-md bg-secondary hover:bg-accent">Start here</button>
                <button onClick={() => setTexts((p) => p.map((t) => t.id === selText.id ? { ...t, end: Math.max(time, t.start + 0.2) } : t))} className="h-9 flex-1 rounded-md bg-secondary hover:bg-accent">End here</button>
              </div>
            </>
          )}
          {sel && <button onClick={del} className="h-9 w-full rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25">Delete</button>}
        </aside>
      </div>

      <section className="h-56 shrink-0 border-t">
        <div className="flex h-11 items-center gap-2 border-b px-4">
          <button onClick={undo} disabled={!hist.current.past.length && !(clips !== hist.current.cur.clips || texts !== hist.current.cur.texts || grade !== hist.current.cur.grade)} className="h-8 rounded-md bg-secondary px-3 text-sm hover:bg-accent disabled:opacity-40" title="Undo (Ctrl+Z)">↶</button>
          <button onClick={redo} disabled={!hist.current.future.length} className="h-8 rounded-md bg-secondary px-3 text-sm hover:bg-accent disabled:opacity-40" title="Redo (Ctrl+Shift+Z / Ctrl+Y)">↷</button>
          <button onClick={split} disabled={!clips.length} className="h-8 rounded-md bg-secondary px-3 text-sm hover:bg-accent disabled:opacity-40">✂ Split (S)</button>
          <button onClick={del} disabled={!sel} className="h-8 rounded-md bg-secondary px-3 text-sm hover:bg-accent disabled:opacity-40">Delete</button>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            Zoom <input type="range" min={15} max={200} value={zoom} onChange={(e) => setZoom(+e.target.value)} />
          </div>
        </div>
        <div className="h-[calc(100%-2.75rem)] overflow-x-auto overflow-y-hidden px-4">
          <div className="relative h-full" style={{ width: timelineW }}>
            <div className="h-6 cursor-pointer border-b font-mono text-[10px] text-muted-foreground" onMouseDown={scrub}>
              {Array.from({ length: Math.ceil(Math.max(total, 10)) + 1 }).map((_, i) => (
                <span key={i} className="absolute top-1" style={{ left: i * zoom }}>{i % Math.max(1, Math.round(60 / zoom)) === 0 ? `${i}s` : "·"}</span>
              ))}
            </div>
            <div className="relative mt-2 h-10" onMouseDown={(e) => e.target === e.currentTarget && scrub(e)}>
              {texts.map((t) => (
                <button key={t.id} onClick={() => setSel({ kind: "text", id: t.id })}
                  className={`absolute top-0 h-full truncate rounded-md bg-text-track px-2 text-left text-xs font-medium text-primary-foreground ${sel?.id === t.id ? "ring-2 ring-foreground" : ""}`}
                  style={{ left: t.start * zoom, width: Math.max(8, (t.end - t.start) * zoom) }}>T {t.text}</button>
              ))}
            </div>
            <div className="relative mt-2 flex h-16" onMouseDown={(e) => e.target === e.currentTarget && scrub(e)}>
              {clips.map((c) => (
                <button key={c.id} onClick={() => setSel({ kind: "clip", id: c.id })}
                  className={`h-full shrink-0 truncate rounded-md border border-background bg-clip px-2 text-left text-xs font-medium text-foreground ${sel?.id === c.id ? "ring-2 ring-primary" : ""}`}
                  style={{ width: (c.outP - c.inP) * zoom }}>{c.name}</button>
              ))}
            </div>
            <div className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-primary" style={{ left: time * zoom }}>
              <div className="-ml-1.5 h-3 w-3.5 rounded-sm bg-primary" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
