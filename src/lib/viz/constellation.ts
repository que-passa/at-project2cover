import {
  COVER,
  cablePaint,
  colorfulCables,
  convexHull,
  coverSeed,
  degrees,
  deskCables,
  deviceBox,
  mix,
  noteCloud,
  paddedHull,
  projectXY,
  rng,
  sparseDesk,
  wrapCover,
  type CoverGround,
  type Pt,
} from "./cover.js";
import { inks } from "./abstract.js";
import { deriveGround, type GroundRecipe } from "./ground.js";
import { colorForIndex, DEFAULT_GRAY, withAlpha } from "./palette.js";
import type { VizDevice, VizProject, VizRegion } from "./types.js";

type Density = "stars" | "outline" | "instrument" | "allegory";
export type SkyFigure = "note-cloud" | "device-graph" | "duration-ring" | "region-hull";

type PrintingSpec = {
  recipe: GroundRecipe;
  density: Density;
};

/** A spec with its ground resolved for one project. */
type Printing = {
  ground: CoverGround;
  density: Density;
};

/**
 * A sky stays dark, so these four separate by ink material and accent instead
 * of polarity: tinted metal (copper, gilt) vs near-neutral bright (silver,
 * instrument). "Copper" now means copper of *this* project's hue.
 */
const PRINTINGS: Record<string, PrintingSpec> = {
  "1603": {
    density: "stars",
    recipe: {
      paperL: 0.15,
      paperC: 0.055,
      inkL: 0.8,
      inkC: 0.095,
      flare: "counter",
      flareL: 0.6,
      flareC: 0.16,
      mist: 0.22,
      finish: { grain: 0.09, grainScale: 0.68, vignette: 0.16 },
    },
  },
  "1820": {
    density: "outline",
    recipe: {
      paperL: 0.27,
      paperC: 0.04,
      inkL: 0.93,
      inkC: 0.014,
      hue: -32,
      flare: "cool",
      flareL: 0.7,
      flareC: 0.12,
      mist: 0.3,
      finish: { grain: 0.06, grainScale: 0.9, vignette: 0.1 },
    },
  },
  nasa: {
    density: "instrument",
    recipe: {
      paperL: 0.06,
      paperC: 0.035,
      inkL: 0.91,
      inkC: 0.03,
      flare: "cool",
      flareL: 0.74,
      flareC: 0.15,
      mist: 0.2,
      mistFlare: 0.25,
      finish: { grain: 0.04, grainScale: 1.1, vignette: 0.2 },
    },
  },
  gilt: {
    density: "allegory",
    recipe: {
      paperL: 0.11,
      paperC: 0.058,
      inkL: 0.83,
      inkC: 0.11,
      hue: 20,
      flare: "warm",
      flareL: 0.71,
      flareC: 0.16,
      mist: 0.26,
      finish: { grain: 0.1, grainScale: 0.6, vignette: 0.18 },
    },
  },
};

export function skyFigure(project: VizProject): SkyFigure {
  const notes = project.facts.noteCount;
  const devices = project.devices.length;
  const cables = deskCables(project).length;
  const regions = liveRegions(project);
  const sparse = devices < 6;

  if (sparse) {
    if (notes >= 20 && regions.length >= 3) return "region-hull";
    if (notes >= 20) return "note-cloud";
    if (notes === 0 && regions.length >= 1) return "duration-ring";
    if (regions.length >= 1) return "region-hull";
    return "duration-ring";
  }
  if (notes >= 40 && notes / Math.max(1, devices) >= 50) return "note-cloud";
  if (cables >= 3) return "device-graph";
  if (notes >= 40) return "note-cloud";
  if (regions.length >= 2) return "region-hull";
  return "duration-ring";
}

export function renderConstellation(project: VizProject, variantId: string): string {
  const spec = PRINTINGS[variantId] ?? PRINTINGS.nasa;
  const ground = deriveGround(project, spec.recipe, variantId);
  const printing: Printing = { ground, density: spec.density };
  const figure = skyFigure(project);
  const sparse = sparseDesk(project);
  let body = "";
  if (printing.density === "instrument") body += instrumentTicks(project, ground);
  body += drawFigure(project, printing, figure);
  return wrapCover(body, ground, {
    id: `ur-${variantId}`,
    state: sparse ? "note-sky" : figure,
  });
}

function drawFigure(project: VizProject, printing: Printing, figure: SkyFigure): string {
  if (figure === "note-cloud") return drawNoteCloud(project, printing);
  if (figure === "device-graph") return drawDeviceGraph(project, printing);
  if (figure === "region-hull") return drawRegionHull(project, printing);
  return drawDurationRing(project, printing);
}

function drawNoteCloud(project: VizProject, printing: Printing): string {
  const ground = printing.ground;
  const paints = inks(project, 4);
  const cap = printing.density === "allegory" ? 160 : printing.density === "stars" ? 110 : 70;
  const cloud = noteCloud(project, cap);
  const pts = starPoints(cloud);
  const field = pts.length >= 3 ? pts : durationPolygon(project);
  let body = figurePath(field, printing, ground, 0.22);
  if (printing.density === "outline" || printing.density === "allegory") {
    body += neighborPaths(field, printing.density === "allegory" ? 3 : 2, withAlpha(ground.ink, 0.42), 1.6);
  }
  const starR = printing.density === "stars" ? 2.4 : printing.density === "allegory" ? 1.8 : 1.3;
  field.forEach((p, i) => {
    const r = starR + (i % 5) * 0.45;
    const fill = i % 9 === 0 ? ground.ink : mix(ground.ink, paints[i % paints.length] ?? ground.flare, 0.28);
    body += `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${fill}" opacity="${0.62 + (i % 4) * 0.1}"/>`;
  });
  return body;
}

function drawDeviceGraph(project: VizProject, printing: Printing): string {
  const ground = printing.ground;
  const devices = project.devices;
  if (devices.length === 0) return drawDurationRing(project, printing);
  const box = deviceBox(devices);
  const pt = (d: VizDevice) => projectXY(d.x, d.y, box, 36);
  const pts = devices.map(pt);
  const cables = deskCables(project);
  const deg = degrees(cables);
  const maxDeg = Math.max(1, ...deg.values());
  const colorful = colorfulCables(project);
  let body = figurePath(pts, printing, ground, 0.18);
  for (const c of cables) {
    const a = devices.find((d) => d.id === c.from);
    const b = devices.find((d) => d.id === c.to);
    if (!a || !b) continue;
    const pa = pt(a);
    const pb = pt(b);
    const stroke = cablePaint(c, colorful, ground.flare, mix(ground.ink, ground.flare, 0.4));
    const w = printing.density === "allegory" ? 2.4 : printing.density === "stars" ? 1.1 : 1.5;
    body += `<line x1="${pa.x}" y1="${pa.y}" x2="${pb.x}" y2="${pb.y}" stroke="${stroke}" stroke-width="${w}" opacity="${printing.density === "stars" ? 0.55 : 0.78}"/>`;
  }
  let heroId = devices[0]?.id;
  let heroDeg = -1;
  for (const d of devices) {
    const n = deg.get(d.id) ?? 0;
    if (n > heroDeg) {
      heroDeg = n;
      heroId = d.id;
    }
  }
  const base = printing.density === "stars" ? 5.5 : 7;
  for (const d of devices) {
    const p = pt(d);
    const r = base + ((deg.get(d.id) ?? 0) / maxDeg) * 16 + (d.id === heroId ? 8 : 0);
    body += `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${d.id === heroId ? ground.ink : mix(ground.ink, ground.flare, 0.2)}"/>`;
  }
  return body;
}

function drawRegionHull(project: VizProject, printing: Printing): string {
  const ground = printing.ground;
  const paints = inks(project, 4);
  const boxes = regionBoxes(project);
  if (boxes.length === 0) return drawDurationRing(project, printing);
  const corners = boxes.flatMap((b) => [
    { x: b.x, y: b.y },
    { x: b.x + b.w, y: b.y },
    { x: b.x + b.w, y: b.y + b.h },
    { x: b.x, y: b.y + b.h },
  ]);
  let body = figurePath(corners, printing, ground, 0.16);
  boxes.forEach((b, i) => {
    const fill =
      colorForIndex(b.colorIndex) === DEFAULT_GRAY
        ? mix(ground.mist, paints[i % paints.length] ?? ground.flare, 0.55)
        : colorForIndex(b.colorIndex);
    const alpha = printing.density === "allegory" ? 0.55 : printing.density === "outline" ? 0.2 : 0.32;
    body += `<polygon points="${b.x},${b.y} ${b.x + b.w},${b.y} ${b.x + b.w},${b.y + b.h} ${b.x},${b.y + b.h}" fill="${withAlpha(fill, alpha)}" stroke="${withAlpha(ground.ink, 0.55)}" stroke-width="${printing.density === "outline" ? 3 : 1.8}"/>`;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    body += `<circle cx="${cx}" cy="${cy}" r="${printing.density === "stars" ? 4.2 : 3.2}" fill="${ground.ink}"/>`;
  });
  return body;
}

function drawDurationRing(project: VizProject, printing: Printing): string {
  const ground = printing.ground;
  const paints = inks(project, 3);
  const ring = durationPolygon(project);
  let body = figurePath(ring, printing, ground, 0.2);
  if (printing.density === "outline" || printing.density === "allegory") {
    const inner = ring.map((p) => ({
      x: COVER / 2 + (p.x - COVER / 2) * 0.62,
      y: COVER / 2 + (p.y - COVER / 2) * 0.62,
    }));
    body += figureStroke(inner, ground.ink, printing.density === "allegory" ? 3.2 : 2);
  }
  ring.forEach((p, i) => {
    const r = printing.density === "stars" ? 5.5 : 3.6;
    body += `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${i % 4 === 0 ? ground.ink : mix(ground.ink, paints[i % paints.length] ?? ground.flare, 0.3)}"/>`;
  });
  return body;
}

function figurePath(points: Pt[], printing: Printing, ground: CoverGround, fillAmt: number): string {
  const hull = convexHull(points);
  if (hull.length < 3) return "";
  const grown = paddedHull(hull, printing.density === "allegory" ? 28 : 16);
  const d = grown.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  if (printing.density === "stars") {
    return `<path d="${d}" fill="none" stroke="${withAlpha(ground.ink, 0.28)}" stroke-width="1.6"/>`;
  }
  if (printing.density === "outline") {
    return `<path d="${d}" fill="none" stroke="${ground.ink}" stroke-width="3.4"/>`;
  }
  if (printing.density === "instrument") {
    return `<path d="${d}" fill="none" stroke="${withAlpha(ground.flare, 0.7)}" stroke-width="1.8"/>`;
  }
  return `<path d="${d}" fill="${withAlpha(ground.flare, fillAmt + 0.12)}" stroke="${ground.ink}" stroke-width="5.2"/>`;
}

function figureStroke(points: Pt[], stroke: string, width: number): string {
  if (points.length < 2) return "";
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" opacity="0.7"/>`;
}

function neighborPaths(points: Pt[], k: number, stroke: string, width: number): string {
  if (points.length < 3) return "";
  let body = "";
  const used = new Set<string>();
  points.forEach((a, i) => {
    const near = points
      .map((b, j) => ({ j, d: Math.hypot(a.x - b.x, a.y - b.y) }))
      .filter((n) => n.j !== i)
      .sort((x, y) => x.d - y.d)
      .slice(0, k);
    for (const n of near) {
      const key = i < n.j ? `${i}-${n.j}` : `${n.j}-${i}`;
      if (used.has(key)) continue;
      used.add(key);
      const b = points[n.j];
      body += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${stroke}" stroke-width="${width}" opacity="0.55"/>`;
    }
  });
  return body;
}

function starPoints(cloud: Pt[]): Pt[] {
  return cloud.map((p) => ({
    x: 48 + p.x * (COVER - 96),
    y: 64 + p.y * (COVER - 128),
  }));
}

function durationPolygon(project: VizProject): Pt[] {
  const bars = Math.max(8, project.durationTicks / 15360);
  const n = Math.max(9, Math.min(22, Math.round(8 + bars / 6)));
  const rand = rng(coverSeed(project, "ring"));
  const cx = COVER / 2;
  const cy = COVER / 2;
  const R = 250 + Math.min(80, project.tracks.length * 12);
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const wobble = 0.78 + 0.22 * rand();
    out.push({ x: cx + Math.cos(a) * R * wobble, y: cy + Math.sin(a) * R * wobble });
  }
  return out;
}

function liveRegions(project: VizProject): VizRegion[] {
  return project.regions.filter((r) => r.kind !== "automation" && r.enabled);
}

function regionBoxes(project: VizProject): { x: number; y: number; w: number; h: number; colorIndex?: number | null }[] {
  const regions = liveRegions(project);
  if (regions.length === 0) return [];
  const tracks = [...project.tracks].sort((a, b) => a.order - b.order);
  const rowOf = new Map(tracks.map((t, i) => [t.id, i]));
  const rows = Math.max(1, tracks.length);
  const end = Math.max(project.durationTicks, 1);
  const pad = 64;
  const inner = COVER - pad * 2;
  const maxNotes = Math.max(1, ...regions.map((r) => r.noteCount));
  return regions.map((r, i) => {
    const row = rowOf.get(r.trackId) ?? 0;
    const x = pad + (r.positionTicks / end) * inner;
    const w = Math.max(40, (r.durationTicks / end) * inner);
    const stagger = rows === 1 ? (i % 3) * 0.22 : row / rows;
    const mass = 0.35 + (r.noteCount / maxNotes) * 0.45;
    const h = Math.max(70, inner * (rows === 1 ? 0.22 * mass + 0.12 : 0.62 / rows));
    const y = pad + stagger * (inner - h);
    return { x, y, w, h, colorIndex: r.colorIndex };
  });
}

function instrumentTicks(project: VizProject, ground: CoverGround): string {
  const cx = COVER / 2;
  const cy = COVER / 2;
  const ticks = Math.max(project.sigNum, project.tracks.length % 12 || 8);
  const r0 = COVER * 0.44;
  const r1 = COVER * 0.3;
  let body = `<circle cx="${cx}" cy="${cy}" r="${r0}" fill="none" stroke="${withAlpha(ground.flare, 0.28)}" stroke-width="1.2"/>`;
  body += `<circle cx="${cx}" cy="${cy}" r="${r1}" fill="none" stroke="${withAlpha(ground.flare, 0.16)}" stroke-width="0.8"/>`;
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2;
    body += `<line x1="${cx + Math.cos(a) * COVER * 0.42}" y1="${cy + Math.sin(a) * COVER * 0.42}" x2="${cx + Math.cos(a) * COVER * 0.47}" y2="${cy + Math.sin(a) * COVER * 0.47}" stroke="${withAlpha(ground.flare, 0.38)}" stroke-width="1.2"/>`;
  }
  return body;
}
