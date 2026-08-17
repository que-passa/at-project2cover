import {
  COVER,
  mix,
  wrapCover,
  type CoverGround,
} from "./cover.js";
import { deriveGround, type GroundRecipe } from "./ground.js";
import { colorForIndex, withAlpha } from "./palette.js";
import { cropDurationTicks, ticksPerBar } from "./ticks.js";
import type { VizProject, VizRegion, VizTrack } from "./types.js";

type Section = { startBar: number; endBar: number };

/**
 * Four views of one arrangement. Register differs per view (dark board, light
 * paper, single-hue heat, cool crop); the hue comes from the document.
 */
const STRIPE: GroundRecipe = {
  paperL: 0.15,
  paperC: 0.05,
  inkL: 0.92,
  inkC: 0.035,
  flare: "counter",
  flareL: 0.66,
  flareC: 0.16,
  mist: 0.28,
  finish: { grain: 0.08, grainScale: 0.7, vignette: 0.1 },
};

/** The "light paper" view sanctioned for concrete modes. */
const CHRONICLE: GroundRecipe = {
  paperL: 0.91,
  paperC: 0.032,
  inkL: 0.16,
  inkC: 0.03,
  hue: 14,
  flare: "counter",
  flareL: 0.52,
  flareC: 0.17,
  mist: 0.34,
  finish: { grain: 0.05, grainScale: 1.15, vignette: 0.05 },
};

/**
 * Thermal / scope register: cold ground → hot flare. Hue still comes from
 * the document; the ramp reads like FLIR at thumbnail size.
 */
const HEAT: GroundRecipe = {
  paperL: 0.07,
  paperC: 0.035,
  inkL: 0.96,
  inkC: 0.02,
  flare: "warm",
  flareL: 0.8,
  flareC: 0.2,
  flareBand: { center: 72, span: 48 },
  mist: 0.12,
  mistFlare: 0.18,
  finish: { grain: 0.04, grainScale: 1.15, vignette: 0.2 },
};

const CROP: GroundRecipe = {
  paperL: 0.13,
  paperC: 0.045,
  inkL: 0.93,
  inkC: 0.025,
  hue: -18,
  flare: "complement",
  flareL: 0.7,
  flareC: 0.17,
  mist: 0.3,
  finish: { grain: 0.07, grainScale: 0.8, vignette: 0.12 },
};

function playableRegions(project: VizProject): VizRegion[] {
  return project.regions.filter((r) => r.kind !== "automation" && r.enabled);
}

function lanes(project: VizProject, regions: VizRegion[]): VizTrack[] {
  const used = new Set(regions.map((r) => r.trackId));
  return project.tracks.filter((t) => t.kind !== "automation" && t.enabled && used.has(t.id));
}

function span(project: VizProject, regions: VizRegion[]): { end: number; tpb: number } {
  const tpb = ticksPerBar(project.sigNum, project.sigDen);
  const contentEnd = regions.reduce((m, r) => Math.max(m, r.positionTicks + r.durationTicks), 0);
  return {
    end: cropDurationTicks(project.durationTicks, contentEnd, project.sigNum, project.sigDen),
    tpb,
  };
}

function inferSections(regions: VizRegion[], end: number, tpb: number): Section[] {
  const bars = Math.max(1, Math.ceil(end / tpb));
  const occ = Array.from({ length: bars }, () => 0);
  const names = Array.from({ length: bars }, () => new Set<string>());
  for (const r of regions) {
    const a = Math.max(0, Math.floor(r.positionTicks / tpb));
    const b = Math.min(bars, Math.ceil((r.positionTicks + r.durationTicks) / tpb));
    for (let i = a; i < b; i++) {
      occ[i] += 1;
      if (r.displayName) names[i].add(r.displayName);
    }
  }
  const cuts = [0];
  for (let i = 1; i < bars; i++) {
    const change = Math.abs(occ[i] - occ[i - 1]) / Math.max(1, occ[i], occ[i - 1]);
    const inter = [...names[i]].filter((n) => names[i - 1].has(n)).length;
    const union = new Set([...names[i], ...names[i - 1]]).size;
    const jaccard = union === 0 ? 1 : inter / union;
    if (change > 0.45 || jaccard < 0.35) cuts.push(i);
  }
  cuts.push(bars);
  const raw: Section[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const startBar = cuts[i];
    const endBar = cuts[i + 1];
    if (endBar <= startBar) continue;
    raw.push({ startBar, endBar });
  }
  const merged: Section[] = [];
  for (const s of raw) {
    const prev = merged[merged.length - 1];
    if (prev && s.endBar - s.startBar < 2) {
      prev.endBar = s.endBar;
      continue;
    }
    merged.push({ ...s });
  }
  return merged.length ? merged : [{ startBar: 0, endBar: bars }];
}

function laneEnergy(regions: VizRegion[], laneId: string): number {
  return regions
    .filter((r) => r.trackId === laneId)
    .reduce((s, r) => s + (r.noteCount > 0 ? r.velocitySum : r.durationTicks / 4000), 1);
}

export function renderTimeline(project: VizProject, variantId: string): string {
  const regions = playableRegions(project);
  const trackLanes = lanes(project, regions);
  const { end, tpb } = span(project, regions);
  const sections = inferSections(regions, end, tpb);
  if (variantId === "gantt") return stripe(project, regions, trackLanes, end);
  if (variantId === "chronicle") return chronicle(project, regions, trackLanes, end, tpb, sections);
  if (variantId === "lookahead") return lookahead(project, regions, trackLanes, end, tpb);
  return heatmap(project, regions, trackLanes, end, tpb);
}

function stripe(
  project: VizProject,
  regions: VizRegion[],
  trackLanes: VizTrack[],
  end: number
): string {
  const ground = deriveGround(project, STRIPE, "stripe");
  if (trackLanes.length === 0) {
    return wrapCover(emptyPulse(ground, end), ground, { id: "tl-gantt", state: "empty-arrange" });
  }
  const ranked = [...trackLanes]
    .map((lane) => ({ lane, e: laneEnergy(regions, lane.id) }))
    .sort((a, b) => b.e - a.e)
    .slice(0, 7);
  const total = ranked.reduce((s, x) => s + x.e, 0) || 1;
  const heroShare = 0.42;
  const rest = COVER * (1 - heroShare);
  let y = 0;
  let body = `<rect width="${COVER}" height="${COVER}" fill="${ground.paper}"/>`;
  ranked.forEach((item, i) => {
    const h = i === 0 ? COVER * heroShare : Math.max(28, (item.e / (total - ranked[0].e || total)) * rest);
    const wash = colorForIndex(
      regions.find((r) => r.trackId === item.lane.id)?.colorIndex
    );
    body += `<rect x="0" y="${y}" width="${COVER}" height="${h + 1}" fill="${mix(ground.paper, wash, 0.22)}"/>`;
    for (const r of regions.filter((reg) => reg.trackId === item.lane.id)) {
      const x = (r.positionTicks / end) * COVER;
      const w = Math.max(8, (r.durationTicks / end) * COVER);
      body += `<rect x="${x}" y="${y - (i === 0 ? 6 : 0)}" width="${w}" height="${h + (i === 0 ? 12 : 1)}" fill="${colorForIndex(r.colorIndex)}"/>`;
    }
    y += h;
  });
  return wrapCover(body, ground, { id: "tl-gantt" });
}

function chronicle(
  project: VizProject,
  regions: VizRegion[],
  _trackLanes: VizTrack[],
  end: number,
  tpb: number,
  sections: Section[]
): string {
  const ground = deriveGround(project, CHRONICLE, "chronicle");
  if (regions.length === 0) {
    return wrapCover(emptyPulse(ground, end), ground, { id: "tl-chr", state: "empty-arrange" });
  }
  const slabs = mergeSlabs(sections, 4);
  let body = "";
  slabs.forEach((s, i) => {
    const x1 = (s.startBar * tpb / end) * COVER;
    const x2 = (s.endBar * tpb / end) * COVER;
    const inSec = regions.filter((r) => {
      const a = r.positionTicks / tpb;
      const b = (r.positionTicks + r.durationTicks) / tpb;
      return a < s.endBar && b > s.startBar;
    });
    const field = colorForIndex(inSec[0]?.colorIndex);
    body += `<rect x="${x1}" y="0" width="${Math.max(8, x2 - x1)}" height="${COVER}" fill="${field}"/>`;
    const second = colorForIndex(inSec[Math.floor(inSec.length / 2)]?.colorIndex);
    const inset = 40 + i * 18;
    body += `<rect x="${x1 + 8}" y="${inset}" width="${Math.max(4, x2 - x1 - 16)}" height="${COVER - inset * 2}" fill="${second}" opacity="0.38"/>`;
  });
  return wrapCover(body, ground, { id: "tl-chr" });
}

function mergeSlabs(sections: Section[], max: number): Section[] {
  const out = sections.map((s) => ({ ...s }));
  while (out.length > max) {
    let best = 0;
    let bestW = Infinity;
    for (let i = 0; i < out.length; i++) {
      const w = out[i].endBar - out[i].startBar;
      if (w < bestW) {
        bestW = w;
        best = i;
      }
    }
    if (best === 0) {
      out[1].startBar = out[0].startBar;
      out.shift();
    } else {
      out[best - 1].endBar = out[best].endBar;
      out.splice(best, 1);
    }
  }
  return out;
}

function heatmap(
  project: VizProject,
  regions: VizRegion[],
  trackLanes: VizTrack[],
  end: number,
  tpb: number
): string {
  const ground = deriveGround(project, HEAT, "heat");
  if (trackLanes.length === 0 || (regions.length < 3 && project.facts.noteCount < 80)) {
    return wrapCover(emptyPulse(ground, end), ground, { id: "tl-heat", state: "empty-arrange" });
  }
  const rawBars = Math.max(1, Math.ceil(end / tpb));
  const bins = Math.min(28, rawBars);
  const bin = Math.max(1, Math.ceil(rawBars / bins));
  const bars = Math.ceil(rawBars / bin);
  const shown = [...trackLanes]
    .map((lane) => ({ lane, e: laneEnergy(regions, lane.id) }))
    .sort((a, b) => b.e - a.e)
    .slice(0, 8)
    .map((x) => x.lane);
  const cellW = COVER / bars;
  const cellH = COVER / shown.length;
  const grid = shown.map(() => Array.from({ length: bars }, () => 0));
  for (const r of regions) {
    const li = shown.findIndex((t) => t.id === r.trackId);
    if (li < 0) continue;
    const a = Math.max(0, Math.floor(r.positionTicks / tpb / bin));
    const b = Math.min(bars, Math.ceil((r.positionTicks + r.durationTicks) / tpb / bin));
    const energy = r.noteCount > 0 ? r.velocitySum : 1;
    for (let i = a; i < b; i++) grid[li][i] += energy;
  }
  let peak = 0;
  let peakAt = { l: 0, b: 0 };
  for (let l = 0; l < grid.length; l++) {
    for (let b = 0; b < bars; b++) {
      if (grid[l][b] > peak) {
        peak = grid[l][b];
        peakAt = { l, b };
      }
    }
  }
  let body = `<rect width="${COVER}" height="${COVER}" fill="${ground.paper}"/>`;
  shown.forEach((_, i) => {
    for (let b = 0; b < bars; b++) {
      const v = peak ? grid[i][b] / peak : 0;
      const fill = mix(ground.mist, ground.flare, 0.08 + v * 0.92);
      body += `<rect x="${b * cellW}" y="${i * cellH}" width="${cellW + 0.6}" height="${cellH + 0.6}" fill="${fill}"/>`;
    }
  });
  if (peak > 0) {
    const px = peakAt.b * cellW + cellW / 2;
    const py = peakAt.l * cellH + cellH / 2;
    body += `<circle cx="${px}" cy="${py}" r="${Math.max(36, cellH * 1.1)}" fill="${withAlpha(ground.ink, 0.28)}"/>`;
    body += `<circle cx="${px}" cy="${py}" r="${Math.max(14, cellH * 0.35)}" fill="${ground.ink}"/>`;
  }
  return wrapCover(body, ground, { id: "tl-heat" });
}

function lookahead(
  project: VizProject,
  regions: VizRegion[],
  trackLanes: VizTrack[],
  end: number,
  tpb: number
): string {
  const ground = deriveGround(project, CROP, "crop");
  const windowTicks = 16 * tpb;
  let bestStart = 0;
  let bestEnergy = -1;
  for (let t = 0; t < end; t += tpb) {
    const energy = regions.reduce((s, r) => {
      const a = Math.max(r.positionTicks, t);
      const b = Math.min(r.positionTicks + r.durationTicks, t + windowTicks);
      return s + (b > a ? (r.noteCount || 1) : 0);
    }, 0);
    if (energy > bestEnergy) {
      bestEnergy = energy;
      bestStart = t;
    }
  }
  if (trackLanes.length === 0) {
    return wrapCover(emptyPulse(ground, end), ground, { id: "tl-look", state: "empty-arrange" });
  }
  const cx = COVER / 2;
  const cy = COVER / 2;
  const r0 = 28;
  const r1 = COVER * 0.64;
  const energies = trackLanes.map((lane) => laneEnergy(regions, lane.id));
  const total = energies.reduce((a, b) => a + b, 0) || 1;
  let body = `<circle cx="${cx}" cy="${cy}" r="${r1}" fill="${ground.mist}"/>`;
  let inner = r0;
  trackLanes.forEach((lane, i) => {
    const ring = 10 + ((energies[i] / total) * (r1 - r0 - 10));
    const outer = inner + ring;
    for (const r of regions.filter((reg) => reg.trackId === lane.id)) {
      const a = Math.max(r.positionTicks, bestStart);
      const b = Math.min(r.positionTicks + r.durationTicks, bestStart + windowTicks);
      if (b <= a) continue;
      const t0 = ((a - bestStart) / windowTicks) * Math.PI * 2 - Math.PI / 2;
      const t1 = ((b - bestStart) / windowTicks) * Math.PI * 2 - Math.PI / 2;
      body += annular(cx, cy, inner, outer, t0, t1, colorForIndex(r.colorIndex));
    }
    inner = outer;
  });
  body += `<circle cx="${cx}" cy="${cy}" r="${r0}" fill="${ground.paper}"/>`;
  return wrapCover(body, ground, { id: "tl-look" });
}

function annular(
  cx: number,
  cy: number,
  rIn: number,
  rOut: number,
  a0: number,
  a1: number,
  fill: string
): string {
  const span = Math.max(0.02, a1 - a0);
  const large = span > Math.PI ? 1 : 0;
  const p = (r: number, a: number) => `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  return `<path d="M ${p(rOut, a0)} A ${rOut} ${rOut} 0 ${large} 1 ${p(rOut, a0 + span)} L ${p(rIn, a0 + span)} A ${rIn} ${rIn} 0 ${large} 0 ${p(rIn, a0)} Z" fill="${fill}"/>`;
}

function emptyPulse(ground: CoverGround, end: number): string {
  const y = COVER * 0.5;
  const w = Math.min(COVER, 80 + Math.log10(Math.max(end, 1)) * 40);
  return `<rect x="${(COVER - w) / 2}" y="${y - 7}" width="${w}" height="14" fill="${ground.mist}"/>`;
}
