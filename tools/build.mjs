// Builds every SVG in ../assets. All lettering is converted to vector paths.
//   cd tools && npm install && npm run build

import { writeFile } from "node:fs/promises";
import { FONTS, beginDoc, glyphDefs, loadAll, measure, runs, text, textPath } from "./lib/type.mjs";

FONTS.signature = ["allison", "latin-400-normal"];
await loadAll();

// Each asset is built between beginDoc() and out(); out() adds the glyphs it used.
async function out(name, svg) {
  const final = svg.replace("<defs>", `<defs>${glyphDefs()}`).replace(/\n\s*\n/g, "\n");
  beginDoc();
  await writeFile(new URL(`../assets/${name}`, import.meta.url), final);
  return final;
}
const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)} KB`;

/* ───────────────────────── shared pieces ───────────────────────── */

// Palette. Dark-only pieces (banner, footer) use DARK; themed pieces switch with
// prefers-color-scheme, which is the same signal GitHub's <picture> sources use.
const THEME = `
    .card { fill: #F6F8FA; stroke: #D0D7DE; }
    .chip { fill: #FFFFFF; stroke: #D0D7DE; }
    .t1 { fill: #1F2328; } .t2 { fill: #59636E; } .t3 { fill: #8C959F; }
    .acc { fill: #6D28D9; } .ok { fill: #1A7F37; }
    .rule { stroke: #D0D7DE; } .wire { stroke: #B6BEC8; }
    .node { fill: #FFFFFF; stroke: #B6BEC8; }
    .ring { stroke: #6D28D9; }
    .s-a { stop-color: #6D28D9; } .s-b { stop-color: #0E7490; }
    .s-glow { stop-color: #8B5CF6; } .s-glow2 { stop-color: #06B6D4; }
    @media (prefers-color-scheme: dark) {
      .card { fill: #0F1420; stroke: #262D3A; }
      .chip { fill: #161B26; stroke: #2B3342; }
      .t1 { fill: #F0F3F8; } .t2 { fill: #9AA4B5; } .t3 { fill: #5D6780; }
      .acc { fill: #B9A3FF; } .ok { fill: #3FB950; }
      .rule { stroke: #262D3A; } .wire { stroke: #3A4356; }
      .node { fill: #0F1420; stroke: #4A5468; }
      .ring { stroke: #A78BFA; }
      .s-a { stop-color: #A78BFA; } .s-b { stop-color: #22D3EE; }
    }`;

const GRAD = `
    <linearGradient id="grad"><stop offset="0" class="s-a"/><stop offset="1" class="s-b"/></linearGradient>`;

const MOTION = `
    .ping  { transform-box: fill-box; transform-origin: center; animation: ping 2.6s cubic-bezier(0,0,.2,1) infinite; }
    .spin  { transform-box: fill-box; transform-origin: center; animation: spin 1.8s linear infinite; }
    .blink { animation: blink 2.2s ease-in-out infinite; }
    @keyframes ping  { 0% { transform: scale(1); opacity: .7; } 80%, 100% { transform: scale(2.6); opacity: 0; } }
    @keyframes spin  { to { transform: rotate(360deg); } }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
    @media (prefers-reduced-motion: reduce) { .ping, .spin, .blink { animation: none; } .ping { opacity: 0; } }`;

// Chip: rounded pill with centred label, width from the label itself.
function chip(label, x, y, h = 32) {
  const w = Math.round(measure("text", label, 13) + 28);
  return {
    w,
    svg: `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${(h - 1) / 2}" class="chip"/>` +
      text("text", label, x + w / 2, y + h / 2 + 4.6, 13, { anchor: "middle" }, 'class="t1"'),
  };
}
function chipRow(labels, x, y, { gap = 8, align = "start" } = {}) {
  const widths = labels.map((l) => Math.round(measure("text", l, 13) + 28));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (labels.length - 1);
  let cx = align === "end" ? x - total : x;
  return labels.map((l) => { const c = chip(l, cx, y); cx += c.w + gap; return c.svg; }).join("");
}

// Label in the editorial serif, sentence case.
const label = (str, x, y, cls = "acc") => text("serif", str, x, y, 21, {}, `class="${cls}"`);

/* ───────────────────────── banner ───────────────────────── */
{
  const W = 1200, H = 470;

  // Deterministic randomness, so rebuilding gives the same artwork.
  let seed = 20261119;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

  /* Left: stacked poster headline. */
  const L1 = textPath("display", "Rakibul", 60, 236, 132, { track: -0.045 });
  const L2 = textPath("display", "Islam", 60, 352, 132, { track: -0.045 });

  /* Right: a contribution graph whose squares spell HASIB. */
  const GLYPHS = {
    H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  };
  const word = "HASIB", PAD = 1;
  const SPACE = 2;                                   // empty columns between letters
  const cols = PAD * 2 + word.length * 5 + (word.length - 1) * SPACE;
  const CELL = 11, GAP = 3, STEP = CELL + GAP;
  const gridW = cols * STEP - GAP, gridH = 7 * STEP - GAP;

  const card = { x: 0, y: 124, w: 0, h: 240 };
  const dayW = 32;
  card.w = 26 + dayW + gridW + 26;
  card.x = W - 44 - card.w;
  const gx = card.x + 26 + dayW, gy = card.y + 86;

  const LEVEL = ["#161B26", "#2A1660", "#5B21B6", "#8B5CF6", "#B9A3FF"];
  const mix = (a, b, t) => Math.round(a + (b - a) * t).toString(16).padStart(2, "0");
  const ramp = (t) => {
    const [a, b] = [[0xB9, 0xA3, 0xFF], [0x5E, 0xE4, 0xF5]];
    return "#" + a.map((v, i) => mix(v, b[i], t)).join("");
  };
  const lit = (c, r) => {
    const i = c - PAD; if (i < 0) return false;
    const letter = Math.floor(i / (5 + SPACE)), col = i % (5 + SPACE);
    return letter < word.length && col < 5 && GLYPHS[word[letter]][r][col] === "1";
  };
  let cells = "", glints = "";
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < 7; r++) {
      const x = gx + c * STEP, y = gy + r * STEP;
      // Lit squares share one ramp (violet → cyan) so the word reads at a glance;
      // the rest stay in the two darkest levels.
      const fill = lit(c, r) ? ramp(c / (cols - 1)) : LEVEL[rand() < 0.9 ? 0 : 1];
      cells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${fill}"/>`;
      // A light sweep travels across the lit squares, left to right.
      if (lit(c, r)) glints += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5" class="glint" style="animation-delay:${(c * 0.07 + r * 0.02).toFixed(2)}s"/>`;
    }
  }
  const months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
  let monthSvg = "";
  months.forEach((m, i) => {
    const x = gx + (i * gridW) / months.length;
    if (x < gx + gridW - 20) monthSvg += text("text", m, x, gy - 10, 11, {}, 'fill="#5D6780"');
  });
  const days = [[1, "Mon"], [3, "Wed"], [5, "Fri"]]
    .map(([r, d]) => text("text", d, gx - 10, gy + r * STEP + 9.5, 11, { anchor: "end" }, 'fill="#5D6780"')).join("");
  const legendY = gy + gridH + 30;
  let legend = text("text", "More", gx + gridW, legendY, 11, { anchor: "end" }, 'fill="#5D6780"');
  const moreW = measure("text", "More", 11);
  for (let i = 4; i >= 0; i--) {
    const x = gx + gridW - moreW - 8 - (5 - i) * STEP + GAP;
    legend += `<rect x="${x}" y="${legendY - 10}" width="${CELL}" height="${CELL}" rx="2.5" fill="${LEVEL[i]}"/>`;
  }
  legend += text("text", "Less", gx + gridW - moreW - 8 - 5 * STEP - 4, legendY, 11, { anchor: "end" }, 'fill="#5D6780"');

  // Print-style crop marks at the corners.
  const crop = (x, y, dx, dy) => `<path d="M${x} ${y + dy * 14}V${y}H${x + dx * 14}" stroke="#fff" stroke-opacity=".22" stroke-width="1.2"/>`;
  const m = 22;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-labelledby="title desc">
  <title id="title">Rakibul Islam Hasib</title>
  <desc id="desc">Hello, I’m Rakibul Islam Hasib, software developer at AiOpsCamp. Beside the name, a GitHub contribution graph whose squares spell HASIB.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#080A12"/><stop offset="1" stop-color="#0D1222"/></linearGradient>
    <radialGradient id="aurora" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${card.x + card.w / 2} ${card.y + 40}) scale(520 300)"><stop offset="0" stop-color="#7C3AED" stop-opacity=".42"/><stop offset=".55" stop-color="#4C1D95" stop-opacity=".14"/><stop offset="1" stop-color="#4C1D95" stop-opacity="0"/></radialGradient>
    <radialGradient id="tide" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(160 ${H + 40}) scale(560 240)"><stop offset="0" stop-color="#06B6D4" stop-opacity=".2"/><stop offset="1" stop-color="#06B6D4" stop-opacity="0"/></radialGradient>
    <linearGradient id="ink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#C9CFDD"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".07"/><stop offset="1" stop-color="#fff" stop-opacity=".02"/></linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C4B5FD" stop-opacity=".5"/><stop offset=".5" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#22D3EE" stop-opacity=".3"/></linearGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0"/></filter>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="26"/></clipPath>
  </defs>
  <style>
    .drift { animation: drift 18s ease-in-out infinite alternate; }
    .glint { fill: #F5F3FF; opacity: 0; animation: glint 5.5s ease-in-out infinite; }
    @keyframes drift { to { transform: translate(-50px, 24px); } }
    @keyframes glint { 0%, 100% { opacity: 0; } 6% { opacity: .85; } 16% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .drift, .glint { animation: none; } }
  </style>

  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect class="drift" x="${card.x - 500}" y="-320" width="1300" height="760" fill="url(#aurora)"/>
    <rect width="${W}" height="${H}" fill="url(#tide)"/>
    <rect width="${W}" height="${H}" filter="url(#grain)" opacity=".05"/>

    <!-- Headline -->
    ${text("serif", "Hello, I’m", 66, 98, 32, {}, 'fill="#9AA4B5"')}
    <path d="${L1.d}" fill="url(#ink)"/>
    <path d="${L2.d}" fill="url(#ink)"/>
    ${runs([["serif", "Software developer ", 'fill="#E6EAF2"'], ["serif", "at AiOpsCamp", 'fill="#8C96AA"']], 66, 414, 34).svg}

    <!-- Contribution graph that spells the name -->
    <rect x="${card.x}" y="${card.y}" width="${card.w}" height="${card.h}" rx="20" fill="#0A0E1A" fill-opacity=".55"/>
    <rect x="${card.x}" y="${card.y}" width="${card.w}" height="${card.h}" rx="20" fill="url(#glass)"/>
    <rect x="${card.x + 0.5}" y="${card.y + 0.5}" width="${card.w - 1}" height="${card.h - 1}" rx="19.5" stroke="url(#rim)"/>
    ${text("serif", "made with commits", card.x + 26, card.y + 44, 22, {}, 'fill="#C9CFDD"')}
    ${text("text", "github.com/rakibul-islam-hasib", card.x + card.w - 26, card.y + 43, 12, { anchor: "end" }, 'fill="#5D6780"')}
    ${monthSvg}${days}
    ${cells}
    ${glints}
    ${legend}

    ${crop(m, m, 1, 1)}${crop(W - m, m, -1, 1)}${crop(m, H - m, 1, -1)}${crop(W - m, H - m, -1, -1)}
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="25.5" stroke="#fff" stroke-opacity=".08"/>
</svg>`;
  console.log("banner.svg", kb(await out("banner.svg", svg)));
}

/* ───────────────────────── about ───────────────────────── */
{
  const W = 1200, H = 500;

  // Card A — how I work (a real sequence, so the steps are numbered)
  const steps = [
    ["Design", "Figma, wireframes"],
    ["Build", "React, Next.js, Node"],
    ["Ship", "Vercel, Google Cloud"],
    ["Refine", "Speed, polish, DX"],
  ];
  const sx = [110, 290, 470, 650], ty = 182;
  const stepsSvg = steps.map(([t, s], i) => {
    const last = i === steps.length - 1;
    const node = last
      ? `<circle cx="${sx[i]}" cy="${ty}" r="15" class="ring ping" fill="none" stroke-width="2"/><circle cx="${sx[i]}" cy="${ty}" r="15" fill="url(#grad)"/>` +
        text("title", String(i + 1), sx[i], ty + 4.6, 13, { anchor: "middle" }, 'fill="#fff"')
      : `<circle cx="${sx[i]}" cy="${ty}" r="15" class="node" stroke-width="1.5"/>` +
        text("title", String(i + 1), sx[i], ty + 4.6, 13, { anchor: "middle" }, 'class="t2"');
    return node +
      text("title", t, sx[i], ty + 46, 18, { anchor: "middle", track: -0.01 }, 'class="t1"') +
      text("text", s, sx[i], ty + 68, 13, { anchor: "middle" }, 'class="t2"');
  }).join("");

  // Card D — wireframe globe, centred near Bangladesh (≈ 90°E, 24°N)
  const gx = 726, gy = 392, R = 54, tilt = (22 * Math.PI) / 180;
  let globe = `<circle cx="${gx}" cy="${gy}" r="${R}" class="wire" fill="none" stroke-width="1.2"/>`;
  for (const lat of [-60, -30, 0, 30, 60]) {
    const p = (lat * Math.PI) / 180;
    const y = gy - R * Math.sin(p) * Math.cos(tilt), rx = R * Math.cos(p), ry = rx * Math.sin(tilt);
    globe += `<ellipse cx="${gx}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" class="wire" fill="none" stroke-width="1" stroke-dasharray="${lat === 0 ? "none" : "2 4"}"/>`;
  }
  for (const lon of [0, 30, 60]) {
    const rx = R * Math.sin((lon * Math.PI) / 180);
    globe += lon === 0
      ? `<path d="M${gx} ${gy - R}V${gy + R}" class="wire" stroke-width="1"/>`
      : `<ellipse cx="${gx}" cy="${gy}" rx="${rx.toFixed(1)}" ry="${R}" class="wire" fill="none" stroke-width="1"/>`;
  }
  const py = gy - R * Math.sin((24 * Math.PI) / 180) * Math.cos(tilt);
  globe += `<circle cx="${gx}" cy="${py.toFixed(1)}" r="7" class="ring ping" fill="none" stroke-width="2"/><circle cx="${gx}" cy="${py.toFixed(1)}" r="5" fill="url(#grad)"/>`;

  const learning = [
    "Server Components & the App Router",
    "Database architecture with Mongoose",
    "React performance optimization",
  ];
  const learnSvg = learning.map((t, i) => {
    const y = 372 + i * 42;
    return `<circle cx="42" cy="${y - 5}" r="7" class="rule" stroke-width="2" fill="none"/>` +
      `<circle cx="42" cy="${y - 5}" r="7" class="ring spin" stroke-width="2" fill="none" stroke-dasharray="11 33" stroke-linecap="round" style="animation-delay:-${i * 0.6}s"/>` +
      text("text", t, 62, y, 16, {}, 'class="t1"');
  }).join("");

  const card = (x, y, w, h) => `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="19.5" class="card"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-labelledby="title desc">
  <title id="title">About Rakibul Islam Hasib</title>
  <desc id="desc">How I work: design, build, ship, refine. Right now: software developer at AiOpsCamp. Currently learning Server Components and the App Router, database architecture with Mongoose, and React performance. Based in Bangladesh, UTC+6, open to collaborations. Words I code by: “Code is like humor. When you have to explain it, it’s bad.” Cory House.</desc>
  <defs>${GRAD}
    <linearGradient id="gradLine" x1="${sx[0]}" y1="0" x2="${sx[3]}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" class="s-a"/><stop offset="1" class="s-b"/></linearGradient>
    <radialGradient id="glowA" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(752 0) scale(440 260)"><stop offset="0" class="s-glow" stop-opacity=".16"/><stop offset="1" class="s-glow" stop-opacity="0"/></radialGradient>
    <clipPath id="cA"><rect width="752" height="262" rx="20"/></clipPath>
  </defs>
  <style>${THEME}${MOTION}
    .flow { stroke-dasharray: 4 10; animation: flow 1.2s linear infinite; }
    @keyframes flow { to { stroke-dashoffset: -28; } }
    @media (prefers-reduced-motion: reduce) { .flow { animation: none; } }
  </style>

  ${card(0, 0, 752, 262)}
  <g clip-path="url(#cA)"><rect width="752" height="262" fill="url(#glowA)"/></g>
  ${label("how I work", 32, 50)}
  ${text("display", "From a rough idea to a shipped product", 31, 94, 31, { track: -0.025 }, 'class="t1"')}
  ${text("text", "Design it, build it, ship it, then make it faster. Repeat.", 32, 124, 15, {}, 'class="t2"')}
  <path d="M${sx[0]} ${ty}H${sx[3]}" class="rule" stroke-width="2"/>
  <path d="M${sx[0]} ${ty}H${sx[3]}" stroke="url(#gradLine)" stroke-width="2" stroke-opacity=".4"/>
  <path d="M${sx[0]} ${ty}H${sx[3]}" stroke="url(#gradLine)" stroke-width="2.5" stroke-linecap="round" class="flow"/>
  ${stepsSvg}

  ${card(768, 0, 432, 262)}
  <circle cx="805" cy="43" r="4" class="ok blink"/>
  ${label("right now", 818, 50)}
  ${text("display", "Software developer", 799, 108, 36, { track: -0.03 }, 'class="t1"')}
  ${runs([["serif", "at ", 'class="t2"'], ["display", "AiOpsCamp", 'fill="url(#grad)"']], 800, 150, 36, { track: -0.02 }).svg}
  ${text("text", "Building fast, scalable web applications.", 800, 184, 15, {}, 'class="t2"')}
  ${chipRow(["Next.js", "Node.js", "MongoDB", "TypeScript"], 800, 202)}

  ${card(0, 278, 392, 222)}
  ${label("currently learning", 32, 326)}
  ${learnSvg}

  ${card(408, 278, 384, 222)}
  ${label("based in", 440, 326)}
  ${text("display", "Bangladesh", 439, 392, 34, { track: -0.03 }, 'class="t1"')}
  ${text("text", "UTC+6, Asia/Dhaka", 440, 420, 14, {}, 'class="t2"')}
  <circle cx="446" cy="461" r="4" class="ok"/>
  ${text("text", "Open to collaborations", 458, 466, 14, {}, 'class="t2"')}
  ${globe}

  ${card(808, 278, 392, 222)}
  ${label("words I code by", 840, 326)}
  ${text("serif", "“Code is like humor.", 838, 372, 30, {}, 'class="t1"')}
  ${text("serif", "When you have to explain", 840, 406, 30, {}, 'class="t1"')}
  ${text("serif", "it, it’s bad.”", 840, 440, 30, {}, 'class="t1"')}
  <path d="M840 466h18" class="rule" stroke-width="1.5"/>
  ${text("text", "Cory House", 866, 471, 13, {}, 'class="t2"')}
</svg>`;
  console.log("about.svg", kb(await out("about.svg", svg)));
  
}

/* ───────────────────────── stack (marquee) ───────────────────────── */
{
  const ROWS = [
    ["js", "ts", "react", "nextjs", "nodejs", "express", "mongodb", "firebase", "tailwind"],
    ["bootstrap", "figma", "git", "github", "gcp", "vercel", "vscode", "arduino"],
  ];
  const W = 1200, H = 284, ICON = 56, SCALE = ICON / 256, STEP = 300 * SCALE, ROW_Y = [128, 200];

  async function fetchRow(ids, theme) {
    const url = `https://skillicons.dev/icons?i=${ids.join(",")}&theme=${theme}&perline=${ids.length}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} for ${url}`);
    const s = await res.text();
    const inner = s.slice(s.indexOf(">", s.indexOf("<svg")) + 1, s.lastIndexOf("</svg>"));
    const pre = `${theme[0]}${ids.length}${ids[0]}_`;
    return inner.replace(/id="([^"]+)"/g, `id="${pre}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${pre}$1)`).replace(/href="#([^"]+)"/g, `href="#${pre}$1"`);
  }
  const uses = (id, period, y) => {
    const copies = Math.ceil((W + period) / period) + 1;
    let s = "";
    for (let i = 0; i < copies; i++) s += `<use href="#${id}" x="${(i * period) / SCALE}"/>`;
    return `<g transform="translate(0 ${y}) scale(${SCALE})">${s}</g>`;
  };

  const defs = [], rows = [], kf = [];
  for (const [r, ids] of ROWS.entries()) {
    const period = ids.length * STEP;
    for (const theme of ["dark", "light"]) defs.push(`<g id="r${r}${theme}">${await fetchRow(ids, theme)}</g>`);
    const [from, to] = r % 2 === 0 ? [0, -period] : [-period, 0];
    kf.push(`.m${r} { animation: m${r} ${(period / 22).toFixed(1)}s linear infinite; } @keyframes m${r} { from { transform: translateX(${from}px); } to { transform: translateX(${to}px); } }`);
    rows.push(`<g class="m${r}"><g class="only-dark">${uses(`r${r}dark`, period, ROW_Y[r])}</g><g class="only-light">${uses(`r${r}light`, period, ROW_Y[r])}</g></g>`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-labelledby="title desc">
  <title id="title">Tech stack</title>
  <desc id="desc">JavaScript, TypeScript, React, React Native, Next.js, Node.js, Express, MongoDB, Firebase, Tailwind CSS, Bootstrap, Figma, Git, GitHub, Google Cloud, Vercel, VS Code, Arduino.</desc>
  <defs>
    ${defs.join("\n    ")}
    <linearGradient id="fade" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".12" stop-color="#fff"/><stop offset=".88" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="edges"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="20"/></clipPath>
  </defs>
  <style>${THEME}
    .only-dark { display: none; }
    @media (prefers-color-scheme: dark) { .only-dark { display: inline; } .only-light { display: none; } }
    ${kf.join("\n    ")}
    @media (prefers-reduced-motion: reduce) { .m0, .m1 { animation: none; } }
  </style>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="19.5" class="card"/>
  ${label("toolbox", 32, 50)}
  ${text("display", "The stack I build and ship with", 31, 92, 31, { track: -0.025 }, 'class="t1"')}
  ${chipRow(["Frontend", "Backend", "Mobile", "Cloud", "Design"], W - 32, 52, { align: "end" })}
  <g clip-path="url(#frame)" mask="url(#edges)">${rows.join("")}</g>
</svg>`;
  console.log("stack.svg", kb(await out("stack.svg", svg)));
  
}

/* ───────────────────────── section headings ───────────────────────── */
async function heading(file, title, note, extra = "") {
  const W = 1200, H = 100;
  const t = textPath("display", title, 2, 62, 46, { track: -0.035 });
  // Hand-drawn marker stroke under the tail of the title.
  const ux1 = t.x + t.width * 0.58, ux2 = t.x + t.width + 6;
  const under = `M${ux1.toFixed(1)} 80 C ${(ux1 + 60).toFixed(1)} 72, ${(ux2 - 90).toFixed(1)} 71, ${ux2.toFixed(1)} 76`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="${title}">
  <defs>${GRAD}</defs>
  <style>${THEME}
    .draw { stroke-dasharray: 1; animation: draw 9s ease-in-out infinite; }
    @keyframes draw { 0%, 80% { stroke-dashoffset: 0; } 84% { stroke-dashoffset: 1; } 96%, 100% { stroke-dashoffset: 0; } }
    @media (prefers-reduced-motion: reduce) { .draw { animation: none; } }
  </style>
  <path d="${t.d}" class="t1"/>
  <path d="${under}" pathLength="1" class="draw" stroke="url(#grad)" stroke-width="5" stroke-linecap="round"/>
  ${note ? text("serif", note, W - 4, 60, 22, { anchor: "end" }, 'class="t2"') : ""}
  ${extra}
</svg>`;
  console.log(file, kb(await out(file, svg)));
}

await heading("heading-activity.svg", "GitHub at a glance", "refreshed every few hours");
{
  // A drawn arrow curling down toward the contact badges, with a note.
  const note = textPath("serif", "say hello", 1080, 44, 24, { anchor: "end" });
  const arrow = `<path d="M1090 38 C 1140 34, 1160 60, 1138 80 C 1128 89, 1112 90, 1102 86" stroke="url(#grad)" stroke-width="2.4" stroke-linecap="round" fill="none"/>
  <path d="M1112 78 L1100 86 L1113 93" stroke="url(#grad)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  await heading("heading-contact.svg", "Let’s build something together", null, `<path d="${note.d}" class="t2"/>${arrow}`);
}

/* ───────────────────────── divider ───────────────────────── */
{
  // Straight hairline that loosens into a hand-drawn squiggle at the centre.
  // Amplitude swells towards the centre and settles back into the line.
  let wave = "";
  const N = 24;
  for (let i = 0; i < N; i++) {
    const a = (10 * Math.sin((Math.PI * (i + 0.5)) / N)).toFixed(2);
    wave += ` q 7.5 ${i % 2 ? a : -a} 15 0`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="28" viewBox="0 0 1200 28" fill="none" aria-hidden="true">
  <defs>
    <linearGradient id="l" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" class="s-a" stop-opacity="0"/><stop offset=".35" class="s-a"/><stop offset=".65" class="s-b"/><stop offset="1" class="s-b" stop-opacity="0"/></linearGradient>
  </defs>
  <style>${THEME}</style>
  <path d="M0 14H420${wave} H1200" stroke="url(#l)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
  console.log("divider.svg", kb(await out("divider.svg", svg)));
  
}

/* ───────────────────────── footer ───────────────────────── */
{
  const W = 1200, H = 170;
  const line = textPath("serif", "Thanks for stopping by.", 0, 0, 50);
  const sig = textPath("signature", "Hasib", 0, 0, 96);
  const sigW = sig.bbox.x2 - sig.bbox.x1;
  const gap = 36, total = line.width + gap + sigW;
  const lx = (W - total) / 2, sx = lx + line.width + gap - sig.bbox.x1;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="Thanks for stopping by. Hasib.">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0A0D16"/><stop offset="1" stop-color="#0F1526"/></linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#A78BFA"/><stop offset="1" stop-color="#22D3EE"/></linearGradient>
    <linearGradient id="sig" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C4B5FD"/><stop offset="1" stop-color="#22D3EE"/></linearGradient>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(600 190) scale(560 150)"><stop offset="0" stop-color="#7C3AED" stop-opacity=".35"/><stop offset="1" stop-color="#7C3AED" stop-opacity="0"/></radialGradient>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="22"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
    <rect width="${W}" height="3" fill="url(#bar)"/>
    ${text("serif", "Thanks for stopping by.", lx, 98, 50, {}, 'fill="#F5F7FB"')}
    <g transform="translate(${sx.toFixed(1)} 104) rotate(-7)"><path d="${sig.d}" fill="url(#sig)"/></g>
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="21.5" stroke="#fff" stroke-opacity=".08"/>
</svg>`;
  console.log("footer.svg", kb(await out("footer.svg", svg)));
  
}
