// Text → SVG path outlines, so the artwork renders in the exact typefaces
// everywhere (GitHub will not load web fonts inside README images).
// Fonts are OFL-licensed, fetched from Fontsource and cached in tools/.cache.

import opentype from "opentype.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const CACHE = new URL("../.cache/", import.meta.url);
const CDN = "https://cdn.jsdelivr.net/fontsource/fonts";

export const FONTS = {
  display:   ["bricolage-grotesque", "latin-800-normal"],
  title:     ["bricolage-grotesque", "latin-700-normal"],
  text:      ["bricolage-grotesque", "latin-500-normal"],
  serif:     ["instrument-serif", "latin-400-italic"],
  mono:      ["jetbrains-mono", "latin-500-normal"],
  signature: ["mrs-saint-delafield", "latin-400-normal"],
};

const loaded = {};

export async function font(role) {
  if (loaded[role]) return loaded[role];
  const [family, file] = FONTS[role];
  const local = new URL(`${family}-${file}.woff`, CACHE);
  let buf;
  try {
    buf = await readFile(local);
  } catch {
    const res = await fetch(`${CDN}/${family}@latest/${file}.woff`);
    if (!res.ok) throw new Error(`Font ${family}/${file}: HTTP ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
    await mkdir(CACHE, { recursive: true });
    await writeFile(local, buf);
  }
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return (loaded[role] = opentype.parse(ab));
}

export async function loadAll() {
  for (const role of Object.keys(FONTS)) await font(role);
}

const r = (n) => Math.round(n * 100) / 100;

/** Width of a string, in px. `track` is letter-spacing in em. */
export function measure(role, str, size, track = 0) {
  return loaded[role].getAdvanceWidth(str, size, { kerning: true, letterSpacing: track });
}

/**
 * One run of text as path data.
 * anchor: "start" | "middle" | "end"
 */
export function textPath(role, str, x, y, size, { track = 0, anchor = "start" } = {}) {
  const f = loaded[role];
  const w = measure(role, str, size, track);
  const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  const p = f.getPath(str, x0, y, size, { kerning: true, letterSpacing: track });
  const bb = p.getBoundingBox();
  return { d: p.toPathData(2), width: w, x: x0, bbox: { x1: r(bb.x1), y1: r(bb.y1), x2: r(bb.x2), y2: r(bb.y2) } };
}

// Glyph registry: each glyph outline is defined once per document (in font
// units) and placed with <use>, which keeps files small.
const PREFIX = { display: "d", title: "b", text: "t", serif: "i", mono: "m", signature: "g" };
let registry = new Map();
export function beginDoc() { registry = new Map(); }
export function glyphDefs() {
  return [...registry.values()].filter(Boolean).map(({ id, d }) => `<path id="${id}" d="${d}"/>`).join("");
}

/**
 * A run of text. Glyphs are shared via <use> unless `inline` is set, which
 * emits one <path> instead (needed when a gradient should span the whole run).
 */
export function text(role, str, x, y, size, opts = {}, attrs = "") {
  // Gradient fills must span the whole run, so those stay one path.
  if (opts.inline || attrs.includes("url(")) return `<path d="${textPath(role, str, x, y, size, opts).d}" ${attrs}/>`;
  const f = loaded[role];
  const upm = f.unitsPerEm, s = size / upm;
  const { track = 0, anchor = "start" } = opts;
  const w = measure(role, str, size, track);
  const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  let uses = "";
  f.forEachGlyph(str, 0, 0, size, { kerning: true, letterSpacing: track }, (g, gx) => {
    const key = `${role}:${g.index}`;
    if (!registry.has(key)) {
      const d = g.getPath(0, 0, upm).toPathData(0);
      if (!d) { registry.set(key, null); return; }
      registry.set(key, { id: `${PREFIX[role] ?? role}${g.index}`, d });
    }
    const entry = registry.get(key);
    if (entry) uses += `<use href="#${entry.id}" x="${Math.round(gx / s)}"/>`;
  });
  return `<g transform="translate(${r(x0)} ${r(y)}) scale(${+s.toFixed(5)})" ${attrs}>${uses}</g>`;
}

/**
 * Several runs set one after another on a single baseline, each with its own
 * role and attributes: [[role, str, attrs], ...]. Returns markup and width.
 */
export function runs(list, x, y, size, { track = 0, anchor = "start" } = {}) {
  const widths = list.map(([role, str]) => measure(role, str, size, track));
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = anchor === "middle" ? x - total / 2 : anchor === "end" ? x - total : x;
  let out = "";
  list.forEach(([role, str, attrs = ""], i) => {
    out += text(role, str, cx, y, size, { track }, attrs);
    cx += widths[i];
  });
  return { svg: out, width: total };
}
