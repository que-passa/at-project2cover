import { colorForIndex } from "./palette.js";
import { COVER, hash01, mix, type CoverGround } from "./cover.js";
import type { VizMixerStrip, VizProject } from "./types.js";

export { COVER };
export type Ground = CoverGround;

export function seedOf(project: VizProject, salt = 0): number {
  return hash01(
    `${project.id}|${project.bpm}|${project.facts.noteCount}|${project.facts.deviceCount}|${project.durationTicks}|${salt}`
  );
}

export function rng(seed: number): () => number {
  let s = Math.max(1, Math.floor(seed * 4294967295)) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function gravity(project: VizProject): { x: number; y: number } {
  if (project.devices.length === 0) return { x: 0.38, y: 0.42 };
  const xs = project.devices.map((d) => d.x);
  const ys = project.devices.map((d) => d.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  let sx = 0;
  let sy = 0;
  for (const d of project.devices) {
    sx += (d.x - minX) / (maxX - minX || 1);
    sy += (d.y - minY) / (maxY - minY || 1);
  }
  return {
    x: clamp(sx / project.devices.length, 0.18, 0.82),
    y: clamp(sy / project.devices.length, 0.18, 0.82),
  };
}

export function mixerInks(project: VizProject): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const ranked = [...project.mixer].sort((a, b) => (b.postGain ?? 0) - (a.postGain ?? 0) || a.order - b.order);
  for (const strip of ranked) {
    if (strip.muted) continue;
    const hex = colorForIndex(strip.colorIndex);
    if (seen.has(hex)) continue;
    seen.add(hex);
    out.push(hex);
  }
  if (out.length === 0) {
    for (const strip of project.mixer) {
      const hex = colorForIndex(strip.colorIndex);
      if (!seen.has(hex)) {
        seen.add(hex);
        out.push(hex);
      }
    }
  }
  return out;
}

export function fallbackInks(project: VizProject): string[] {
  if (project.kind === "arrangement") return ["#c45c28", "#e0a030", "#3a2418"];
  if (project.kind === "patch") return ["#2f6a6a", "#c4783a", "#1a2420"];
  if (project.kind === "textile") return ["#8a3a40", "#d4a060", "#2a1814"];
  return ["#6a4a32", "#c4a070", "#1c1610"];
}

export function inks(project: VizProject, need = 3): string[] {
  const fromMix = mixerInks(project);
  const fb = fallbackInks(project);
  const out = [...fromMix];
  for (const hex of fb) {
    if (out.length >= need) break;
    if (!out.includes(hex)) out.push(hex);
  }
  while (out.length < need) out.push(fb[out.length % fb.length] ?? "#8a4030");
  return out.slice(0, Math.max(need, fromMix.length));
}

export function shade(hex: string, amount: number): string {
  return amount < 0 ? mix(hex, "#14110e", Math.abs(amount)) : mix(hex, "#f2ead8", amount);
}

export function luma(hex: string): number {
  const raw = hex.replace("#", "");
  const n = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const r = Number.parseInt(n.slice(0, 2), 16) || 0;
  const g = Number.parseInt(n.slice(2, 4), 16) || 0;
  const b = Number.parseInt(n.slice(4, 6), 16) || 0;
  return (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
}

export function polarBlob(cx: number, cy: number, r: number, rand: () => number, lobes: number): string {
  const n = 56;
  const pts: { x: number; y: number }[] = [];
  const phase = rand() * Math.PI * 2;
  const harm = 2 + Math.floor(rand() * 5);
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const n1 = 0.7 + 0.24 * Math.sin(t * lobes + phase);
    const n2 = 0.1 * Math.sin(t * harm + phase * 1.7);
    const n3 = 0.06 * (rand() - 0.5);
    const rr = r * (n1 + n2 + n3);
    pts.push({ x: cx + Math.cos(t) * rr, y: cy + Math.sin(t) * rr });
  }
  let d = `M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C ${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(p2.x)} ${fmt(p2.y)}`;
  }
  return `${d}Z`;
}

export function fmt(n: number): string {
  return n.toFixed(1);
}

export function density(project: VizProject): number {
  return Math.log1p(
    project.facts.noteCount +
      project.facts.deviceCount * 4 +
      (project.facts.audioCables + project.facts.noteCables) * 2 +
      project.facts.regionCount * 3
  );
}

export function stripWeight(strip: VizMixerStrip): number {
  if (strip.muted) return 0.35;
  const g = strip.postGain;
  if (g === undefined) return strip.soloed ? 1.2 : 1;
  return clamp(0.45 + (g + 12) / 24, 0.35, 1.6);
}

export function ground(paper: string, ink: string, flare?: string): CoverGround {
  return {
    paper,
    ink,
    mist: mix(paper, ink, 0.35),
    flare: flare ?? mix(ink, paper, 0.25),
  };
}
