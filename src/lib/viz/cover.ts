/**
 * Shared cover-art substrate.
 *
 * The canvas IS the picture published beside a track. Composition, scale,
 * contrast, and color exist for that job — not for a report, dashboard,
 * museum plate, legend, or UI screenshot.
 *
 * Contract:
 * - Square, full bleed. COVER × COVER. No slide padding, no chrome frame.
 * - No titles, axes, legends, colophons, captions, mixer-name posters.
 *   If a mark is unavoidable it must not read as UI.
 * - One focal composition. Strong figure–ground. Real contrast.
 * - Data stays bound (ticks, devices, cables, notes, patterns, colorIndex)
 *   but the picture must survive if the viewer never knows the encoding.
 * - Four variants of a mode are four complete covers of the same inventory,
 *   not four chart types on one report.
 * - Other modes may import wrapCover / fitPoints / CoverGround.
 */
import { mixOk } from "./oklch.js";
import { colorForIndex } from "./palette.js";
import type { Theme } from "./svg.js";
import type { VizCable, VizDevice, VizProject } from "./types.js";

export type { Theme } from "./svg.js";
export { wrapPlate } from "./svg.js";

export const COVER = 900;

/**
 * Print finish. Part of the printing, not a global filter — a phosphor tile
 * should be clean and hard while a punch-card tile can carry real tooth.
 */
export type Finish = {
  /** Grain opacity. 0 leaves the cover perfectly flat. */
  grain: number;
  /** Turbulence frequency. Low is coarse tooth, high is fine film grain. */
  grainScale: number;
  /** Edge darkening. Kept low; full-bleed covers need live corners. */
  vignette: number;
};

export type CoverGround = {
  /** Dominant field. Tint; never pure black or white. */
  paper: string;
  /** Figure / stone / ink. */
  ink: string;
  /** Mid-weight atmosphere. */
  mist: string;
  /** Focal flare. */
  flare: string;
  /** Applied by wrapCover unless the caller overrides. */
  finish?: Finish;
  /** Per-project grain seed so two documents never share the same noise. */
  seed?: number;
};

export type CoverMeta = {
  id?: string;
  state?: string;
  defs?: string;
  finish?: Partial<Finish>;
  seed?: number;
};

const BASE_FINISH: Finish = { grain: 0.07, grainScale: 0.78, vignette: 0.12 };

export type Pt = { x: number; y: number };

export type Box = { minX: number; maxX: number; minY: number; maxY: number };

export function asGround(ground: CoverGround | Theme): CoverGround {
  if ("mist" in ground && "flare" in ground) return ground;
  const t = ground as Theme;
  return { paper: t.paper, ink: t.ink, mist: t.muted, flare: t.accent };
}

export function wrapCover(inner: string, ground: CoverGround | Theme, meta: CoverMeta = {}): string {
  const g = asGround(ground);
  const id = sanitizeId(meta.id ?? "cover");
  const state = meta.state ? ` data-cover-state="${escAttr(meta.state)}"` : "";
  const finish: Finish = { ...BASE_FINISH, ...g.finish, ...meta.finish };
  const seed = meta.seed ?? g.seed ?? 0;
  const defs: string[] = [];
  const layers: string[] = [];
  if (finish.grain > 0.004) {
    defs.push(grainDef(id, finish.grainScale, seed));
    layers.push(
      `<rect width="${COVER}" height="${COVER}" filter="url(#${id}-grain)" opacity="${finish.grain.toFixed(3)}" style="pointer-events:none"/>`
    );
  }
  if (finish.vignette > 0.004) {
    defs.push(vignetteDef(id, g, finish.vignette));
    layers.push(
      `<rect width="${COVER}" height="${COVER}" fill="url(#${id}-vig)" style="pointer-events:none"/>`
    );
  }
  if (meta.defs) defs.push(meta.defs);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${COVER}" height="${COVER}" viewBox="0 0 ${COVER} ${COVER}" role="img" data-cover="1"${state}>
  <defs>
    ${defs.join("\n    ")}
  </defs>
  <rect width="${COVER}" height="${COVER}" fill="${g.paper}"/>
  ${inner}
  ${layers.join("\n  ")}
</svg>`;
}

export function grainDef(id: string, scale = 0.78, seed = 0): string {
  const s = Math.floor(Math.abs(seed) * 4096) % 4096;
  const freq = clamp(scale, 0.2, 1.6).toFixed(3);
  return `<filter id="${id}-grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${s}" stitchTiles="stitch" result="n"/>
    <feColorMatrix type="saturate" values="0" in="n" result="g"/>
    <feComponentTransfer in="g">
      <feFuncA type="table" tableValues="0 0.62"/>
    </feComponentTransfer>
  </filter>`;
}

export function vignetteDef(id: string, ground: CoverGround, amount = 0.12): string {
  const edge = mix(ground.paper, ground.ink, 0.55);
  return `<radialGradient id="${id}-vig" cx="50%" cy="46%" r="74%">
    <stop offset="52%" stop-color="${edge}" stop-opacity="0"/>
    <stop offset="100%" stop-color="${edge}" stop-opacity="${clamp(amount, 0, 0.6).toFixed(3)}"/>
  </radialGradient>`;
}

export function deviceBox(devices: VizDevice[]): Box {
  if (devices.length === 0) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  const xs = devices.map((d) => d.x);
  const ys = devices.map((d) => d.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    maxX: maxX === minX ? minX + 80 : maxX,
    minY,
    maxY: maxY === minY ? minY + 80 : maxY,
  };
}

export function pointBox(points: Pt[]): Box {
  if (points.length === 0) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    maxX: maxX === minX ? minX + 1 : maxX,
    minY,
    maxY: maxY === minY ? minY + 1 : maxY,
  };
}

/** Map a content bbox onto the square with a hairline optical inset — not slide margins. */
export function projectXY(x: number, y: number, box: Box, pad = 36): Pt {
  const w = COVER - pad * 2;
  const h = COVER - pad * 2;
  const nx = (x - box.minX) / (box.maxX - box.minX || 1);
  const ny = (y - box.minY) / (box.maxY - box.minY || 1);
  return { x: pad + nx * w, y: pad + ny * h };
}

/** Scale an already-projected point cloud so it occupies the square. */
export function fitPoints(points: Pt[], pad = 40): (p: Pt) => Pt {
  const box = pointBox(points);
  return (p: Pt) => projectXY(p.x, p.y, box, pad);
}

export function degrees(cables: VizCable[]): Map<string, number> {
  const deg = new Map<string, number>();
  for (const c of cables) {
    deg.set(c.from, (deg.get(c.from) ?? 0) + 1);
    deg.set(c.to, (deg.get(c.to) ?? 0) + 1);
  }
  return deg;
}

export function colorfulCables(project: VizProject): boolean {
  return new Set(project.cables.map((c) => c.colorIndex ?? "n")).size >= 6;
}

export function cablePaint(
  c: VizCable,
  colorful: boolean,
  audio: string,
  note: string
): string {
  if (colorful) return colorForIndex(c.colorIndex);
  return c.kind === "note" ? note : audio;
}

export function typeMark(type: string): "diamond" | "circle" | "square" | "tri" {
  if (/beatbox|machiniste|rasselbock|bassline|tonematrix/.test(type)) return "tri";
  if (/heisenberg|pulverisateur|quantum|gakki|helmholtz|pulsar|audioDevice/.test(type)) {
    return "diamond";
  }
  if (/splitter|merger|centroid|minimixer|tinyGain|panorama/.test(type)) return "square";
  return "circle";
}

export function mark(kind: ReturnType<typeof typeMark>, x: number, y: number, r: number, fill: string): string {
  if (kind === "circle") return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
  if (kind === "square") {
    return `<rect x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}" fill="${fill}"/>`;
  }
  if (kind === "tri") {
    return `<polygon points="${x},${y - r} ${x + r},${y + r} ${x - r},${y + r}" fill="${fill}"/>`;
  }
  return `<polygon points="${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}" fill="${fill}"/>`;
}

export function hexRgb(hex: string): [number, number, number] {
  const raw = hex.replace("#", "");
  const n = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  return [
    Number.parseInt(n.slice(0, 2), 16),
    Number.parseInt(n.slice(2, 4), 16),
    Number.parseInt(n.slice(4, 6), 16),
  ];
}

export function rgbHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Blend two colors perceptually. sRGB interpolation drops chroma through the
 * midpoint, which is how a saturated wash over a dark paper used to arrive as
 * mud; OKLab keeps the midpoint as colorful as its endpoints.
 */
export function mix(a: string, b: string, t: number): string {
  return mixOk(a, b, t);
}

/** Channel-wise sRGB blend, for the rare case a caller wants the old ramp. */
export function mixRgb(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexRgb(a);
  const [br, bg, bb] = hexRgb(b);
  return rgbHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

export function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export const PLATE = COVER;

export function grainOverlay(id: string, seed: number, opacity = 0.12): string {
  const s = Math.floor(Math.abs(seed) * 2048) % 2048;
  return `<filter id="${id}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="${s}" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>
  <rect width="${COVER}" height="${COVER}" filter="url(#${id})" opacity="${opacity}"/>`;
}

export function vig(id: string, color: string, opacity = 0.4): string {
  return `<radialGradient id="${id}" cx="50%" cy="46%" r="72%">
    <stop offset="40%" stop-color="${color}" stop-opacity="0"/>
    <stop offset="100%" stop-color="${color}" stop-opacity="${opacity}"/>
  </radialGradient>
  <rect width="${COVER}" height="${COVER}" fill="url(#${id})"/>`;
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "") || "cover";
}

function escAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export const mixHex = mix;

export function hash32(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function coverSeed(project: VizProject, salt = ""): number {
  return hash01(`${project.id}|${salt}|${project.bpm}|${project.facts.noteCount}|${project.durationTicks}`);
}

export function rng(seed: number): () => number {
  let s = (seed > 0 && seed < 1 ? Math.floor(seed * 4294967295) : Math.floor(seed)) >>> 0;
  if (s === 0) s = 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function uid(prefix: string, project: VizProject, variant: string): string {
  return sanitizeId(`${prefix}-${project.id.slice(0, 8)}-${variant}`);
}

export function clipCover(id: string, inner: string): string {
  const safe = sanitizeId(id);
  return `<defs><clipPath id="${safe}"><rect width="${COVER}" height="${COVER}"/></clipPath></defs>
  <g clip-path="url(#${safe})">${inner}</g>`;
}

export function grainLayer(id: string, opacity: number): string {
  const safe = sanitizeId(id);
  const o = clamp(opacity, 0.04, 0.35);
  return `<filter id="${safe}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="3" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>
  <rect width="${COVER}" height="${COVER}" filter="url(#${safe})" opacity="${o}"/>`;
}

/** Few desktop objects — not enough for a rack, sky, or landmass on XY alone. */
export function sparseDesk(project: VizProject): boolean {
  return project.devices.length < 6;
}

export function deskCables(project: VizProject): VizCable[] {
  const ids = new Set(project.devices.map((d) => d.id));
  return project.cables.filter((c) => ids.has(c.from) && ids.has(c.to));
}

/** Notes as a unit-square cloud (time → x, pitch → y). Empty if no notes. */
export function noteCloud(project: VizProject, cap = 160): Pt[] {
  const notes = project.notes;
  if (notes.length === 0) return [];
  const t0 = Math.min(...notes.map((n) => n.positionTicks));
  const t1 = Math.max(...notes.map((n) => n.positionTicks + n.durationTicks), t0 + 1);
  const p0 = Math.min(...notes.map((n) => n.pitch));
  const p1 = Math.max(...notes.map((n) => n.pitch), p0 + 1);
  const step = Math.max(1, Math.ceil(notes.length / cap));
  const out: Pt[] = [];
  for (let i = 0; i < notes.length; i += step) {
    const n = notes[i];
    out.push({
      x: (n.positionTicks - t0) / (t1 - t0 || 1),
      y: 1 - (n.pitch - p0) / (p1 - p0 || 1),
    });
  }
  return out;
}

export function desktopMass(project: VizProject): {
  nx: number;
  ny: number;
  side: "left" | "right" | "center";
} {
  if (project.devices.length === 0) return { nx: 0.5, ny: 0.5, side: "center" };
  const box = deviceBox(project.devices);
  let sx = 0;
  let sy = 0;
  for (const d of project.devices) {
    sx += (d.x - box.minX) / (box.maxX - box.minX || 1);
    sy += (d.y - box.minY) / (box.maxY - box.minY || 1);
  }
  const nx = clamp(sx / project.devices.length, 0, 1);
  const ny = clamp(sy / project.devices.length, 0, 1);
  const side = nx < 0.38 ? "left" : nx > 0.62 ? "right" : "center";
  return { nx, ny, side };
}

export function convexHull(points: Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length <= 2) return pts;
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export function paddedHull(points: Pt[], pad: number): Pt[] {
  if (points.length === 0) return [];
  if (points.length === 1) {
    const p = points[0];
    return [
      { x: p.x - pad, y: p.y },
      { x: p.x, y: p.y - pad * 0.7 },
      { x: p.x + pad, y: p.y },
      { x: p.x, y: p.y + pad * 0.7 },
    ];
  }
  const hull = points.length === 2 ? points : convexHull(points);
  const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
  return hull.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / dist) * pad, y: p.y + (dy / dist) * pad };
  });
}

export function nightRatio(project: VizProject): number {
  const tags = `${project.tags.join(" ")} ${project.genreName ?? ""}`.toLowerCase();
  let n = 0.42;
  if (/dark|night|rap|ambient|drone/.test(tags)) n += 0.28;
  if (project.kind === "sketch") n += 0.08;
  if (project.facts.noteCount > 800) n += 0.06;
  return clamp(n, 0.16, 0.94);
}
