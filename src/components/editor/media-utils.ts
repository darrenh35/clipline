export type MediaKind = "video" | "image" | "audio";

const EXT: Record<string, MediaKind> = {
  webm: "video", mkv: "video", mp4: "video", m4v: "video", mov: "video", ogv: "video", avi: "video",
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", avif: "image", bmp: "image", svg: "image",
  mp3: "audio", wav: "audio", ogg: "audio", oga: "audio", m4a: "audio", aac: "audio", flac: "audio", opus: "audio", weba: "audio",
};
const MIME_BY_EXT: Record<string, string> = {
  webm: "video/webm", mkv: "video/x-matroska", mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", ogv: "video/ogg",
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4", flac: "audio/flac", opus: "audio/ogg", weba: "audio/webm",
};

/** Detect media kind from MIME type, falling back to the file extension when the OS gives no type. */
export function detectKind(name: string, type: string): MediaKind | null {
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("audio/")) return "audio";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT[ext] ?? null;
}

export function guessMime(name: string, type: string): string {
  if (type) return type;
  return MIME_BY_EXT[name.split(".").pop()?.toLowerCase() ?? ""] ?? "";
}

/**
 * Load metadata and resolve a real duration. Browser-recorded WebM reports Infinity until the
 * element is forced to seek past the end, after which the true duration becomes known.
 */
export function resolveDuration(el: HTMLMediaElement, timeoutMs = 8000): Promise<number> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (d: number) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      el.ontimeupdate = el.ondurationchange = el.onseeked = el.onerror = el.onloadedmetadata = null;
      resolve(d);
    };
    const timer = setTimeout(() => finish(isFinite(el.duration) && el.duration > 0 ? el.duration : 0), timeoutMs);
    el.onerror = () => finish(0);
    el.onloadedmetadata = () => {
      if (isFinite(el.duration) && el.duration > 0) return finish(el.duration);
      const check = () => {
        if (isFinite(el.duration) && el.duration > 0) {
          const d = el.duration;
          el.currentTime = 0;
          finish(d);
        }
      };
      el.ondurationchange = check;
      el.ontimeupdate = check;
      el.onseeked = check;
      el.currentTime = 1e101;
    };
  });
}

export type ExportFormat = "auto" | "mp4" | "webm";
const MP4 = ["video/mp4;codecs=avc1,mp4a", "video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1", "video/mp4"];
const WEBM = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];

/** Pick the best recorder MIME type for the chosen format; null when the browser can't record it. */
export function pickExportMime(format: ExportFormat, supported: (m: string) => boolean): string | null {
  const list = format === "mp4" ? MP4 : format === "webm" ? WEBM : [...MP4, ...WEBM];
  return list.find(supported) ?? null;
}
