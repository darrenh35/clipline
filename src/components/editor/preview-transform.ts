/** Uniform resizing works in any orientation and shares the editor's scale limits. */
export function resizedScale(initialScale: number, initialDistance: number, distance: number) {
  const next = initialScale * distance / Math.max(1, initialDistance);
  return Math.round(Math.max(1, Math.min(400, next)) * 10) / 10;
}