import {
  COVER,
  cablePaint,
  colorfulCables,
  degrees,
  deskCables,
  deviceBox,
  fitPoints,
  mark,
  mix,
  noteCloud,
  paddedHull,
  projectXY,
  sparseDesk,
  typeMark,
  wrapCover,
  type CoverGround,
  type Pt,
} from "./cover.js";
import { inks } from "./abstract.js";
import { deriveGround, type GroundRecipe } from "./ground.js";
import { colorForIndex, DEFAULT_GRAY, withAlpha } from "./palette.js";
import type { VizMixerStrip, VizProject } from "./types.js";

/**
 * These four used to be four dark browns inside a three-point luminance band,
 * so the 2×2 read as one cover. Now each view owns a register: dark board,
 * cooler mid sculpture, light column sheet, deep cascade.
 */
const JEWEL: GroundRecipe = {
  paperL: 0.12,
  paperC: 0.055,
  inkL: 0.93,
  inkC: 0.03,
  flare: "counter",
  flareL: 0.62,
  flareC: 0.17,
  mist: 0.24,
  finish: { grain: 0.07, grainScale: 0.72, vignette: 0.13 },
};

/** Mid ground with lower contrast so the cube facets stay separable. */
const SCULPT: GroundRecipe = {
  paperL: 0.26,
  paperC: 0.05,
  inkL: 0.89,
  inkC: 0.035,
  hue: -26,
  flare: "complement",
  flareL: 0.64,
  flareC: 0.16,
  mist: 0.44,
  finish: { grain: 0.09, grainScale: 0.62, vignette: 0.09 },
};

/** Light sheet — saturated strips read hardest against pale paper. */
const COLUMNS: GroundRecipe = {
  paperL: 0.93,
  paperC: 0.028,
  inkL: 0.14,
  inkC: 0.03,
  flare: "counter",
  flareL: 0.5,
  flareC: 0.18,
  mist: 0.3,
  finish: { grain: 0.045, grainScale: 1.2, vignette: 0.04 },
};

const CASCADE: GroundRecipe = {
  paperL: 0.16,
  paperC: 0.062,
  inkL: 0.95,
  inkC: 0.02,
  hue: 30,
  flare: "cool",
  flareL: 0.68,
  flareC: 0.17,
  mist: 0.32,
  finish: { grain: 0.06, grainScale: 0.85, vignette: 0.15 },
};

export function renderSetup(project: VizProject, variantId: string): string {
  if (variantId === "iso") return iso(project);
  if (variantId === "mixer") return mixer(project);
  if (variantId === "flow") return flow(project);
  return plan(project);
}

function stripPaint(s: VizMixerStrip, paints: string[], i: number): string {
  const raw = colorForIndex(s.colorIndex);
  if (raw !== DEFAULT_GRAY) return raw;
  const tint = paints.find((p) => p !== DEFAULT_GRAY);
  return tint ?? paints[i % paints.length] ?? raw;
}

function plan(project: VizProject): string {
  const ground = deriveGround(project, JEWEL, "plan");
  const sparse = sparseDesk(project);
  const paints = inks(project, 5);
  const pts = deskStones(project);
  const hullSrc = [...pts.values()];
  const plate = plateFromDesk(project, hullSrc);
  let body = mixerRack(project, ground, paints);
  if (plate.length >= 3) {
    const d = plate.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
    body += `<path d="${d}" fill="${mix(ground.paper, ground.flare, 0.34)}" stroke="${withAlpha(ground.ink, 0.45)}" stroke-width="3.2"/>`;
  }
  if (sparse) {
    body += regionWells(project, ground, paints);
    body += ribbonTraces(project, ground, paints);
  }
  body += pcbTraces(project, pts, ground, paints, sparse);
  body += stoneField(project, pts, ground, paints, sparse);
  return wrapCover(body, ground, { id: "su-plan", state: sparse ? "sparse-jewel" : undefined });
}

function deskStones(project: VizProject): Map<string, Pt> {
  const pts = new Map<string, Pt>();
  const nodes = project.devices;
  if (nodes.length === 0) return pts;
  const box = deviceBox(nodes);
  const n = nodes.length;
  if (n === 1) {
    pts.set(nodes[0].id, { x: COVER * 0.5, y: COVER * 0.42 });
    return pts;
  }
  if (n === 2) {
    pts.set(nodes[0].id, { x: COVER * 0.28, y: COVER * 0.42 });
    pts.set(nodes[1].id, { x: COVER * 0.72, y: COVER * 0.42 });
    return pts;
  }
  const pad = n < 6 ? 90 : 48;
  for (const d of nodes) pts.set(d.id, projectXY(d.x, d.y, box, pad));
  return pts;
}

function plateFromDesk(project: VizProject, stones: Pt[]): Pt[] {
  if (stones.length >= 3) return paddedHull(stones, stones.length < 6 ? 110 : 56);
  if (stones.length === 2) {
    const [a, b] = stones;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * 96;
    const ny = (dx / len) * 96;
    return [
      { x: a.x + nx - 40, y: a.y + ny - 20 },
      { x: b.x + nx + 40, y: b.y + ny - 20 },
      { x: b.x - nx + 40, y: b.y - ny + 20 },
      { x: a.x - nx - 40, y: a.y - ny + 20 },
    ];
  }
  const regions = project.regions.filter((r) => r.kind !== "automation" && r.enabled);
  if (regions.length >= 2) {
    const end = Math.max(project.durationTicks, 1);
    const corners = regions.flatMap((r) => {
      const x0 = 80 + (r.positionTicks / end) * 740;
      const x1 = x0 + Math.max(40, (r.durationTicks / end) * 740);
      return [
        { x: x0, y: 160 },
        { x: x1, y: 160 },
        { x: x1, y: 620 },
        { x: x0, y: 620 },
      ];
    });
    return paddedHull(corners, 24);
  }
  const bars = Math.max(4, project.durationTicks / 15360);
  const w = clamp(280 + Math.sqrt(bars) * 18, 300, 520);
  const h = clamp(200 + project.tracks.length * 16, 220, 360);
  const cx = COVER / 2;
  const cy = COVER * 0.42;
  return [
    { x: cx - w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy + h / 2 },
    { x: cx - w / 2, y: cy + h / 2 },
  ];
}

function mixerRack(project: VizProject, ground: CoverGround, paints: string[]): string {
  const strips = [...project.mixer].sort((a, b) => a.order - b.order);
  const n = Math.max(1, strips.length);
  const y = COVER * 0.78;
  const h = COVER * 0.22;
  const colW = COVER / n;
  let body = `<rect x="0" y="${y}" width="${COVER}" height="${h}" fill="${mix(ground.paper, ground.mist, 0.55)}"/>`;
  if (strips.length === 0) {
    const bands = Math.max(3, Math.min(8, project.tracks.length || 4));
    for (let i = 0; i < bands; i++) {
      body += `<rect x="${(i / bands) * COVER}" y="${y}" width="${COVER / bands + 0.6}" height="${h}" fill="${mix(ground.mist, paints[i % paints.length] ?? ground.flare, 0.45)}"/>`;
    }
    return body;
  }
  strips.forEach((s, i) => {
    const gain = Math.min(1.4, s.postGain ?? 1);
    const hh = h * (0.35 + gain * 0.6);
    body += `<rect x="${i * colW}" y="${COVER - hh}" width="${colW + 0.5}" height="${hh}" fill="${s.muted ? mix(ground.paper, ground.mist, 0.4) : stripPaint(s, paints, i)}"/>`;
  });
  return body;
}

function regionWells(project: VizProject, ground: CoverGround, paints: string[]): string {
  const regions = project.regions.filter((r) => r.kind !== "automation" && r.enabled).slice(0, 36);
  if (regions.length === 0) return "";
  const end = Math.max(project.durationTicks, 1);
  const tracks = [...project.tracks].sort((a, b) => a.order - b.order);
  const rowOf = new Map(tracks.map((t, i) => [t.id, i]));
  const rows = Math.max(1, tracks.length);
  let body = "";
  regions.forEach((r, i) => {
    const x = 70 + (r.positionTicks / end) * 760;
    const w = Math.max(22, (r.durationTicks / end) * 760);
    const row = rowOf.get(r.trackId) ?? 0;
    const y = 90 + (row / rows) * 520;
    const h = Math.max(18, 520 / rows - 10);
    const fill =
      colorForIndex(r.colorIndex) === DEFAULT_GRAY
        ? mix(ground.mist, paints[i % paints.length] ?? ground.flare, 0.5)
        : colorForIndex(r.colorIndex);
    body += `<rect x="${x}" y="${y}" width="${w}" height="${Math.min(h, 70)}" fill="${withAlpha(fill, 0.38)}" stroke="${withAlpha(ground.ink, 0.22)}" stroke-width="1.4"/>`;
  });
  return body;
}

function ribbonTraces(project: VizProject, ground: CoverGround, paints: string[]): string {
  const notes = project.notes;
  if (notes.length === 0) return "";
  const p0 = Math.min(...notes.map((n) => n.pitch));
  const p1 = Math.max(...notes.map((n) => n.pitch), p0 + 1);
  const bands = new Map<number, number>();
  for (const n of notes) {
    const band = Math.round(((n.pitch - p0) / (p1 - p0 || 1)) * 11);
    bands.set(band, (bands.get(band) ?? 0) + 1);
  }
  const max = Math.max(1, ...bands.values());
  let body = "";
  for (const [band, count] of [...bands.entries()].sort((a, b) => a[0] - b[0])) {
    const y = 130 + band * 38;
    const w = 120 + (count / max) * 620;
    body += `<rect x="70" y="${y}" width="${w}" height="${3.2 + (count / max) * 5}" fill="${withAlpha(paints[band % paints.length] ?? ground.flare, 0.55)}" rx="1"/>`;
  }
  return body;
}

function pcbTraces(
  project: VizProject,
  pts: Map<string, Pt>,
  ground: CoverGround,
  paints: string[],
  sparse: boolean
): string {
  const cables = deskCables(project);
  const colorful = colorfulCables(project);
  const deg = degrees(cables);
  const maxDeg = Math.max(1, ...deg.values());
  let body = "";
  let drawn = 0;
  for (const c of cables) {
    const a = pts.get(c.from);
    const b = pts.get(c.to);
    if (!a || !b) continue;
    const w = (sparse ? 10 : 4.2) + (((deg.get(c.from) ?? 1) + (deg.get(c.to) ?? 1)) / maxDeg) * (sparse ? 6 : 5);
    const paint = cablePaint(c, colorful, ground.flare, paints[1] ?? "#6a8aa0");
    body += orthoTrace(a, b, paint, w);
    drawn += 1;
  }
  if (drawn === 0) {
    const rackY = COVER * 0.78;
    const nodes = [...pts.values()];
    nodes.forEach((p, i) => {
      const dest = { x: lerp(COVER * 0.22, COVER * 0.78, nodes.length === 1 ? 0.5 : i / Math.max(1, nodes.length - 1)), y: rackY };
      body += orthoTrace(p, dest, paints[i % paints.length] ?? ground.flare, sparse ? 12 : 5);
    });
  }
  return body;
}

function orthoTrace(a: Pt, b: Pt, paint: string, w: number): string {
  const midX = (a.x + b.x) / 2;
  return `<path d="M ${a.x} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${b.x} ${b.y}" fill="none" stroke="${paint}" stroke-width="${w}" stroke-linecap="square" stroke-linejoin="miter" opacity="0.9"/>`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function stoneField(
  project: VizProject,
  pts: Map<string, Pt>,
  ground: CoverGround,
  paints: string[],
  sparse: boolean
): string {
  const cables = deskCables(project);
  const deg = degrees(cables);
  const maxDeg = Math.max(1, ...deg.values());
  const ranked = [...project.devices].sort((a, b) => (deg.get(b.id) ?? 0) - (deg.get(a.id) ?? 0));
  let body = "";
  ranked.forEach((d, i) => {
    const p = pts.get(d.id);
    if (!p) return;
    const r = (sparse ? 54 : 14) + ((deg.get(d.id) ?? 0) / maxDeg) * (sparse ? 20 : 22) + (i === 0 ? (sparse ? 18 : 10) : 0);
    const fill = i === 0 ? ground.ink : mix(paints[i % paints.length] ?? ground.flare, ground.ink, 0.35);
    body += padAndStone(p.x, p.y, r, fill, ground, 6 + (i % 3));
  });
  if (project.devices.length === 0) {
    const cx = COVER / 2;
    const cy = COVER * 0.42;
    body += padAndStone(cx, cy, 70, ground.ink, ground, 8);
  }
  return body;
}

function padAndStone(x: number, y: number, r: number, fill: string, ground: CoverGround, facets: number): string {
  const pad = r * 1.35;
  let body = `<rect x="${x - pad}" y="${y - pad}" width="${pad * 2}" height="${pad * 2}" fill="${mix(ground.paper, ground.mist, 0.5)}" stroke="${withAlpha(ground.ink, 0.35)}" stroke-width="2"/>`;
  const n = Math.max(5, facets);
  const outer: string[] = [];
  const inner: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    outer.push(`${x + Math.cos(a) * r},${y + Math.sin(a) * r}`);
    inner.push(`${x + Math.cos(a) * r * 0.48},${y + Math.sin(a) * r * 0.48}`);
  }
  body += `<polygon points="${outer.join(" ")}" fill="${fill}"/>`;
  body += `<polygon points="${inner.join(" ")}" fill="${mix(fill, ground.paper, 0.35)}"/>`;
  return body;
}

function iso(project: VizProject): string {
  const ground = deriveGround(project, SCULPT, "iso");
  const sparse = sparseDesk(project);
  if (project.devices.length === 0) {
    return wrapCover(isoPlinth(project, ground, []), ground, { id: "su-iso", state: "sparse-jewel" });
  }
  if (sparse) {
    return wrapCover(isoSparse(project, ground), ground, { id: "su-iso", state: "sparse-jewel" });
  }
  const box = deviceBox(project.devices);
  const raw = project.devices.map((d) => {
    const nx = (d.x - box.minX) / (box.maxX - box.minX || 1);
    const ny = (d.y - box.minY) / (box.maxY - box.minY || 1);
    return { id: d.id, d, p: { x: (nx - ny) * 0.86, y: (nx + ny) * 0.42 } };
  });
  const fit = fitPoints(
    raw.map((t) => t.p),
    32
  );
  const pts = new Map(raw.map((t) => [t.id, fit(t.p)]));
  const cables = deskCables(project);
  const deg = degrees(cables);
  const maxDeg = Math.max(1, ...deg.values());
  const colorful = colorfulCables(project);
  const n = project.devices.length;
  const base = Math.max(28, Math.min(88, 400 / Math.sqrt(n)));
  let body = "";
  for (const c of cables) {
    const a = pts.get(c.from);
    const b = pts.get(c.to);
    if (!a || !b) continue;
    body += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${cablePaint(c, colorful, ground.flare, "#6a8aa0")}" stroke-width="4.4" stroke-linecap="round" opacity="0.82"/>`;
  }
  const ordered = [...raw].sort((a, b) => a.p.y - b.p.y || a.p.x - b.p.x);
  for (const item of ordered) {
    const p = pts.get(item.id);
    if (!p) continue;
    const s = base * (1.08 + ((deg.get(item.id) ?? 0) / maxDeg) * 1.3);
    body += cube(p.x, p.y, s, s * 0.62, s * 0.38, ground);
  }
  return wrapCover(body, ground, { id: "su-iso" });
}

function isoSparse(project: VizProject, ground: CoverGround): string {
  const paints = inks(project, 3);
  const nodes = project.devices;
  const bars = Math.max(4, project.durationTicks / 15360);
  const s = clamp(150 + Math.sqrt(bars) * 6 + Math.min(40, project.notes.length * 0.12), 160, 210);
  const pts = new Map<string, Pt>();
  nodes.forEach((d, i) => {
    if (nodes.length === 1) {
      pts.set(d.id, { x: COVER * 0.34, y: COVER * 0.38 });
      return;
    }
    pts.set(d.id, { x: 150 + i * 230, y: 250 + i * 90 });
  });
  let body = isoPlinth(project, ground, paints);
  const colorful = colorfulCables(project);
  for (const c of deskCables(project)) {
    const a = pts.get(c.from);
    const b = pts.get(c.to);
    if (!a || !b) continue;
    body += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${cablePaint(c, colorful, ground.flare, paints[1] ?? ground.ink)}" stroke-width="8" stroke-linecap="round" opacity="0.8"/>`;
  }
  for (const d of nodes) {
    const p = pts.get(d.id);
    if (!p) continue;
    body += cube(p.x, p.y, s, s * 0.62, s * 0.38, ground, paints[0]);
  }
  return body;
}

function isoPlinth(project: VizProject, ground: CoverGround, paints: string[]): string {
  const tint = paints[0] ?? ground.flare;
  const h = clamp(70 + project.tracks.length * 8, 70, 140);
  return `<polygon points="140,${720 + h} 760,${720 + h} 820,720 200,720" fill="${mix(ground.paper, tint, 0.28)}"/>
    <polygon points="200,720 820,720 820,${720 - h * 0.15} 200,${720 - h * 0.15}" fill="${mix(ground.mist, tint, 0.2)}"/>`;
}

function cube(
  x: number,
  y: number,
  w: number,
  h: number,
  d: number,
  ground: CoverGround,
  tint?: string
): string {
  const flare = tint ?? ground.flare;
  const top = mix(ground.ink, flare, 0.22);
  const side = mix(ground.paper, flare, 0.5);
  const front = mix(ground.mist, ground.ink, 0.3);
  return `
  <polygon points="${x},${y} ${x + w},${y} ${x + w},${y + h} ${x},${y + h}" fill="${front}"/>
  <polygon points="${x},${y} ${x + d},${y - d} ${x + w + d},${y - d} ${x + w},${y}" fill="${top}"/>
  <polygon points="${x + w},${y} ${x + w + d},${y - d} ${x + w + d},${y + h - d} ${x + w},${y + h}" fill="${side}"/>`;
}

function mixer(project: VizProject): string {
  const ground = deriveGround(project, COLUMNS, "mixer");
  const strips = [...project.mixer].sort((a, b) => a.order - b.order);
  const paints = inks(project, Math.max(3, strips.length || 3));
  const sparse = strips.length < 5;
  if (strips.length === 0) {
    return wrapCover(mixerField(project, ground, paints), ground, {
      id: "su-mix",
      state: "sparse-jewel",
    });
  }
  const colW = COVER / strips.length;
  const groupOf = new Map(project.groupings.map((g) => [g.childId, g.groupId]));
  let body = "";
  strips.forEach((s, i) => {
    const x = i * colW;
    const gain = Math.min(1.35, s.postGain ?? 1);
    const hgt = COVER * (sparse ? 0.88 : 0.42 + gain * 0.5);
    const y = COVER - hgt;
    const fill = s.muted ? mix(ground.paper, ground.mist, 0.4) : stripPaint(s, paints, i);
    body += `<rect x="${x}" y="0" width="${colW + 0.6}" height="${COVER}" fill="${mix(ground.paper, fill, 0.16)}"/>`;
    body += `<rect x="${x}" y="${y}" width="${colW + 0.6}" height="${hgt}" fill="${fill}"/>`;
    if (s.soloed) {
      body += `<rect x="${x}" y="${y}" width="${Math.max(3, colW * 0.18)}" height="${hgt}" fill="${ground.ink}"/>`;
    }
  });
  if (sparse) body += mixerInventory(project, ground, paints, strips.length);
  const groups = strips.filter((s) => s.kind === "group");
  for (const g of groups) {
    const children = strips.filter((s) => groupOf.get(s.id) === g.id);
    if (!children.length) continue;
    const i0 = strips.indexOf(children[0]);
    const i1 = strips.indexOf(children[children.length - 1]);
    if (i0 < 0 || i1 < 0) continue;
    const x1 = i0 * colW;
    const x2 = (i1 + 1) * colW;
    body += `<rect x="${x1}" y="0" width="${x2 - x1}" height="${COVER * 0.06}" fill="${withAlpha(ground.ink, 0.2)}"/>`;
  }
  for (const sc of project.sidechains) {
    const a = strips.findIndex((s) => s.id === sc.from);
    const b = strips.findIndex((s) => s.id === sc.to);
    if (a < 0 || b < 0) continue;
    const x1 = a * colW + colW / 2;
    const x2 = b * colW + colW / 2;
    body += `<path d="M ${x1} ${COVER * 0.08} C ${x1} ${-20}, ${x2} ${-20}, ${x2} ${COVER * 0.08}" fill="none" stroke="${ground.ink}" stroke-width="3" opacity="0.55"/>`;
  }
  return wrapCover(body, ground, { id: "su-mix", state: sparse ? "sparse-jewel" : undefined });
}

function mixerField(project: VizProject, ground: CoverGround, paints: string[]): string {
  const bands = Math.max(3, project.tracks.length, Math.min(8, Math.round(project.durationTicks / 245760)));
  let body = "";
  for (let i = 0; i < bands; i++) {
    const y = (i / bands) * COVER;
    body += `<rect x="0" y="${y}" width="${COVER}" height="${COVER / bands + 1}" fill="${mix(ground.paper, paints[i % paints.length] ?? ground.flare, 0.55 + (i % 3) * 0.12)}"/>`;
  }
  return body + mixerStriations(project, ground, paints);
}

function mixerInventory(
  project: VizProject,
  ground: CoverGround,
  paints: string[],
  stripCount: number
): string {
  const cloud = noteCloud(project, 48);
  const regions = project.regions.filter((r) => r.kind !== "automation" && r.enabled);
  const bars = Math.max(4, Math.round(project.durationTicks / 15360));
  let body = "";
  if (cloud.length) {
    cloud.forEach((p, i) => {
      const y = 36 + p.x * (COVER - 72);
      const w = COVER * (0.42 + p.y * 0.5);
      const x = stripCount <= 1 ? COVER * 0.08 : 0;
      body += `<rect x="${x}" y="${y}" width="${w}" height="${4 + p.y * 7}" fill="${withAlpha(paints[i % paints.length] ?? ground.ink, 0.42)}"/>`;
    });
    return body;
  }
  if (regions.length) {
    const end = Math.max(project.durationTicks, 1);
    regions.forEach((r, i) => {
      const y = (r.positionTicks / end) * COVER;
      const h = Math.max(48, (r.durationTicks / end) * COVER);
      const fill =
        colorForIndex(r.colorIndex) === DEFAULT_GRAY
          ? paints[i % paints.length] ?? ground.flare
          : colorForIndex(r.colorIndex);
      body += `<rect x="${COVER * 0.12}" y="${y}" width="${COVER * 0.76}" height="${h}" fill="${withAlpha(fill, 0.5)}"/>`;
    });
    return body;
  }
  const bands = Math.min(16, Math.max(5, Math.round(bars / 6)));
  for (let i = 0; i < bands; i++) {
    const y = (i / bands) * COVER;
    body += `<rect x="0" y="${y}" width="${COVER}" height="${COVER / bands}" fill="${withAlpha(paints[i % paints.length] ?? ground.flare, 0.1 + (i % 3) * 0.05)}"/>`;
  }
  return body;
}

function mixerStriations(project: VizProject, ground: CoverGround, paints: string[]): string {
  return mixerInventory(project, ground, paints, 0);
}

function flow(project: VizProject): string {
  const ground = deriveGround(project, CASCADE, "flow");
  const nodes = project.devices;
  const sparse = sparseDesk(project);
  if (nodes.length === 0) {
    return wrapCover(flowInventory(project, ground, new Map()), ground, {
      id: "su-flow",
      state: "sparse-jewel",
    });
  }
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  for (const n of nodes) {
    incoming.set(n.id, 0);
    outgoing.set(n.id, 0);
  }
  for (const c of project.cables) {
    if (!incoming.has(c.from) || !incoming.has(c.to)) continue;
    incoming.set(c.to, (incoming.get(c.to) ?? 0) + 1);
    outgoing.set(c.from, (outgoing.get(c.from) ?? 0) + 1);
  }
  const sources = nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0);
  const sinks = nodes.filter((n) => (outgoing.get(n.id) ?? 0) === 0 && (incoming.get(n.id) ?? 0) > 0);
  const mids = nodes.filter((n) => !sources.includes(n) && !sinks.includes(n));
  const layers = [sources, mids, sinks].map((layer) => (layer.length ? layer : []));
  if (layers.every((l) => l.length === 0)) layers[0] = nodes;

  const pts = new Map<string, Pt>();
  const live = layers.filter((l) => l.length);
  const cx = COVER / 2;
  const cy = COVER / 2;
  const ring0 = sparse ? 0 : 70;
  live.forEach((layer, li) => {
    const ring = ring0 + (li / Math.max(1, live.length - 1 || 1)) * (COVER * (sparse ? 0.12 : 0.36));
    layer.forEach((n, i) => {
      const a = -Math.PI / 2 + ((i + 0.5) / layer.length) * Math.PI * 2 + li * 0.18;
      pts.set(n.id, { x: cx + Math.cos(a) * ring, y: cy + Math.sin(a) * ring });
    });
  });
  const mixerCol = [...project.mixer].filter((m) => m.kind === "channel").sort((a, b) => a.order - b.order);
  const outer = sparse ? COVER * 0.4 : COVER * 0.46;
  mixerCol.forEach((m, i) => {
    const a = -Math.PI / 2 + ((i + 0.5) / Math.max(1, mixerCol.length)) * Math.PI * 2;
    pts.set(m.id, { x: cx + Math.cos(a) * outer, y: cy + Math.sin(a) * outer });
  });

  const colorful = colorfulCables(project);
  const paints = inks(project, 4);
  let body = sparse ? flowInventory(project, ground, pts) : "";
  for (const c of project.cables) {
    const a = pts.get(c.from);
    const b = pts.get(c.to);
    if (!a || !b) continue;
    body += `<path d="M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}" fill="none" stroke="${cablePaint(c, colorful, ground.flare, paints[1] ?? "#6a8aa0")}" stroke-width="${sparse ? 6 : 3.8}" opacity="0.82"/>`;
  }
  for (const n of nodes) {
    const p = pts.get(n.id);
    if (!p) continue;
    const r = (sparse ? 52 : 16) + Math.min(sparse ? 36 : 28, ((outgoing.get(n.id) ?? 0) + (incoming.get(n.id) ?? 0)) * 2.2);
    body += mark(typeMark(n.type), p.x, p.y, r, ground.ink);
  }
  for (const m of mixerCol) {
    const p = pts.get(m.id);
    if (!p) continue;
    body += `<circle cx="${p.x}" cy="${p.y}" r="${sparse ? 22 : 16}" fill="${stripPaint(m, paints, 0)}"/>`;
  }
  return wrapCover(body, ground, { id: "su-flow", state: sparse ? "sparse-jewel" : undefined });
}

function flowInventory(project: VizProject, ground: CoverGround, pts: Map<string, Pt>): string {
  const paints = inks(project, 4);
  const cx = COVER / 2;
  const cy = COVER / 2;
  const cloud = noteCloud(project, 28);
  let body = "";
  const rings = Math.max(3, Math.min(7, Math.max(project.tracks.length, Math.round(project.durationTicks / 280000))));
  for (let i = 1; i <= rings; i++) {
    body += `<circle cx="${cx}" cy="${cy}" r="${110 + i * 48}" fill="none" stroke="${withAlpha(paints[i % paints.length] ?? ground.flare, 0.22)}" stroke-width="2"/>`;
  }
  const origin = pts.size ? [...pts.values()][0] : { x: cx, y: cy };
  cloud.forEach((p, i) => {
    const x = cx + (p.x - 0.5) * 620;
    const y = cy + (p.y - 0.5) * 620;
    body += `<path d="M ${origin.x} ${origin.y} Q ${cx} ${cy} ${x} ${y}" fill="none" stroke="${paints[i % paints.length] ?? ground.flare}" stroke-width="2.6" opacity="0.5"/>`;
  });
  return body;
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}
