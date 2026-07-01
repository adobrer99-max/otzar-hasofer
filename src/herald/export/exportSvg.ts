function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Serializes a live <svg> DOM node and downloads it. Inlines the theme's
 * CSS custom properties as literal colors first, since a downloaded SVG
 * opened outside this app won't have access to the page's CSS variables.
 */
export function exportHeraldSvg(svg: SVGSVGElement, filename: string) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const computed = getComputedStyle(svg);
  const cssVarNames = [
    "--color-charcoal",
    "--color-charcoal-raised",
    "--color-charcoal-line",
    "--color-gold",
    "--color-gold-bright",
    "--color-blue",
    "--color-blue-bright",
    "--color-silver",
    "--color-copper",
    "--color-parchment",
    "--accent",
    "--accent-bright",
    "--text-muted",
    "--font-hebrew",
    "--font-latin",
  ];
  const varMap = new Map(cssVarNames.map((name) => [name, computed.getPropertyValue(name).trim()]));

  function resolve(value: string | null): string | null {
    if (!value) return value;
    return value.replace(/var\((--[a-z-]+)\)/g, (_, name) => varMap.get(name) ?? "#000");
  }

  clone.querySelectorAll<SVGElement>("*").forEach((el) => {
    for (const attr of ["fill", "stroke", "font-family"]) {
      const value = el.getAttribute(attr);
      const resolved = resolve(value);
      if (resolved && resolved !== value) el.setAttribute(attr, resolved);
    }
    const style = el.getAttribute("style");
    if (style) el.setAttribute("style", resolve(style)!);
  });
  clone.style.background = resolve(clone.style.background || "var(--color-charcoal)") ?? "";

  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(clone);
  const blob = new Blob([`<?xml version="1.0" standalone="no"?>\r\n${source}`], {
    type: "image/svg+xml;charset=utf-8",
  });
  triggerDownload(blob, filename);
}
