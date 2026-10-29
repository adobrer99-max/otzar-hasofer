/**
 * Fetch and decode images ahead of an animation, so art is already on the
 * card when it turns over. Never blocks for long: resolves when every image
 * has decoded (or failed), or after `timeoutMs`, whichever comes first.
 */
export function preloadImages(srcs: string[], timeoutMs: number): Promise<void> {
  if (srcs.length === 0 || typeof Image === "undefined") return Promise.resolve();
  const loads = srcs.map((src) => {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    return img.decode().catch(() => undefined);
  });
  return Promise.race([
    Promise.all(loads).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
