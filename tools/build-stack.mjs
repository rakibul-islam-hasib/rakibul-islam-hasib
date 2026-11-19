// Builds assets/stack.svg: a two-row, infinitely scrolling tech-stack marquee.
// Icons come from https://skillicons.dev (MIT) and are inlined, because GitHub
// does not load external resources from inside an <img>-embedded SVG.
//
// Edit ROWS below, then run:  node tools/build-stack.mjs

import { writeFile } from "node:fs/promises";

const ROWS = [
  ["js", "ts", "react", "nextjs", "nodejs", "express", "mongodb", "firebase", "tailwind"],
  ["bootstrap", "figma", "git", "github", "gcp", "vercel", "vscode", "arduino"],
];
const CHIPS = ["Frontend", "Backend", "Mobile", "Cloud", "Design"];

const W = 1200;
const ICON = 56;                      // rendered icon size, px
const SCALE = ICON / 256;             // skillicons draw on a 256 grid
const STEP = 300 * SCALE;             // 256 icon + 44 gap
const ROW_Y = [120, 192];
const H = 276;

async function fetchRow(ids, theme) {
  const url = `https://skillicons.dev/icons?i=${ids.join(",")}&theme=${theme}&perline=${ids.length}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  const svg = await res.text();
  // Keep only the inner markup of the outer <svg>.
  const inner = svg.slice(svg.indexOf(">", svg.indexOf("<svg")) + 1, svg.lastIndexOf("</svg>"));
  // Make gradient/clip ids unique per row and theme so nothing collides.
  const prefix = `${theme[0]}${ids.length}${ids[0]}_`;
  return inner
    .replace(/id="([^"]+)"/g, `id="${prefix}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${prefix}$1"`);
}

function rowUses(id, count, period, y) {
  const copies = Math.ceil((W + period) / period) + 1;
  let out = "";
  for (let i = 0; i < copies; i++) {
    out += `<use href="#${id}" x="${(i * period) / SCALE}"/>`;
  }
  return `<g transform="translate(0 ${y}) scale(${SCALE})">${out}</g>`;
}

const defs = [];
const rows = [];
const keyframes = [];
for (const [r, ids] of ROWS.entries()) {
  const period = ids.length * STEP;
  for (const theme of ["dark", "light"]) {
    const id = `r${r}${theme}`;
    defs.push(`<g id="${id}">${await fetchRow(ids, theme)}</g>`);
  }
  const [from, to] = r % 2 === 0 ? [0, -period] : [-period, 0];
  keyframes.push(
    `.m${r} { animation: m${r} ${(period / 22).toFixed(1)}s linear infinite; }` +
    `@keyframes m${r} { from { transform: translateX(${from}px); } to { transform: translateX(${to}px); } }`,
  );
  rows.push(`
    <g class="m${r}">
      <g class="only-dark">${rowUses(`r${r}dark`, ids.length, period, ROW_Y[r])}</g>
      <g class="only-light">${rowUses(`r${r}light`, ids.length, period, ROW_Y[r])}</g>
    </g>`);
}

// Right-aligned mono chips in the header.
const CHAR = 7.4, PAD = 14, GAP = 8;
let x = W - 32;
const chips = [];
for (const label of [...CHIPS].reverse()) {
  const w = Math.round(label.length * CHAR + PAD * 2);
  x -= w;
  chips.unshift(
    `<rect x="${x + 0.5}" y="42.5" width="${w - 1}" height="29" rx="14.5" class="chip"/>` +
    `<text x="${x + w / 2}" y="61.5" text-anchor="middle">${label}</text>`,
  );
  x -= GAP;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-labelledby="title desc">
  <title id="title">Tech stack</title>
  <desc id="desc">${ROWS.flat().join(", ")}</desc>
  <defs>
    ${defs.join("\n    ")}
    <linearGradient id="fade" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset="0.12" stop-color="#fff"/>
      <stop offset="0.88" stop-color="#fff"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <mask id="edges"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="20"/></clipPath>
  </defs>
  <style>
    .sans { font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; }
    .mono { font-family: 'JetBrains Mono', 'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; }
    .card { fill: #F6F8FA; stroke: #D0D7DE; }
    .chip { fill: #FFFFFF; stroke: #D0D7DE; }
    .t1 { fill: #1F2328; } .t2 { fill: #57606A; } .acc { fill: #7C3AED; }
    .only-dark { display: none; }
    @media (prefers-color-scheme: dark) {
      .card { fill: #0F1420; stroke: #262D3A; }
      .chip { fill: #161B26; stroke: #2B3342; }
      .t1 { fill: #F0F3F8; } .t2 { fill: #9AA4B5; } .acc { fill: #A78BFA; }
      .only-dark { display: inline; } .only-light { display: none; }
    }
    ${keyframes.join("\n    ")}
    @media (prefers-reduced-motion: reduce) { ${ROWS.map((_, r) => `.m${r}`).join(", ")} { animation: none; } }
  </style>

  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="19.5" class="card"/>
  <text x="32" y="46" class="mono acc" font-size="12" letter-spacing="2.4">TOOLBOX</text>
  <text x="32" y="82" class="sans t1" font-size="26" font-weight="800" letter-spacing="-0.6">The stack I build and ship with</text>
  <g class="mono t2" font-size="12">${chips.join("")}</g>

  <g clip-path="url(#frame)" mask="url(#edges)">${rows.join("")}
  </g>
</svg>
`;

await writeFile(new URL("../assets/stack.svg", import.meta.url), svg);
console.log(`assets/stack.svg written (${(svg.length / 1024).toFixed(1)} KB)`);
