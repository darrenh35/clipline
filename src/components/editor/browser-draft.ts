/** Browser-only calls; imports are safe during SSR. Draft and media commit atomically. */
export type BrowserDraft<D, O> = { version: 1; doc: D; options: O };
const DATABASE = "clipline-drafts";
let queue: Promise<unknown> | undefined;

function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const result = (queue ?? Promise.resolve()).then(operation);
  queue = result.catch(() => undefined);
  return result;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("draft");
      request.result.createObjectStore("media");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Browser draft storage is busy."));
  });
}

export function saveBrowserDraft<D, O>(draft: BrowserDraft<D, O>, media: [string, Blob][]) {
  return serialized(async () => {
    const db = await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(["draft", "media"], "readwrite");
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error ?? new Error("Draft save failed."));
        tx.onerror = () => reject(tx.error);
        tx.objectStore("draft").put(draft, "current");
        const store = tx.objectStore("media");
        // Imported media is immutable: don't copy large videos on every keystroke.
        for (const [id, blob] of media) {
          const existing = store.getKey(id);
          existing.onsuccess = () => { if (existing.result === undefined) store.put(blob, id); };
        }
      });
    } finally { db.close(); }
  });
}

export function loadBrowserDraft<D, O>() {
  return serialized(async () => {
    const db = await openDatabase();
    try {
      return await new Promise<{ draft: BrowserDraft<D, O> | undefined; media: Map<string, Blob> }>((resolve, reject) => {
        const tx = db.transaction(["draft", "media"], "readonly");
        const request = tx.objectStore("draft").get("current");
        const media = new Map<string, Blob>();
        const cursor = tx.objectStore("media").openCursor();
        cursor.onsuccess = () => {
          const entry = cursor.result;
          if (entry) { media.set(String(entry.key), entry.value as Blob); entry.continue(); }
        };
        tx.oncomplete = () => resolve({ draft: request.result, media });
        tx.onabort = () => reject(tx.error);
        tx.onerror = () => reject(tx.error);
      });
    } finally { db.close(); }
  });
}

export function clearBrowserDraft() {
  return serialized(async () => {
    const db = await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(["draft", "media"], "readwrite");
        tx.objectStore("draft").clear();
        tx.objectStore("media").clear();
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error);
        tx.onerror = () => reject(tx.error);
      });
    } finally { db.close(); }
  });
}