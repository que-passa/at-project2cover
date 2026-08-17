import {
  COVER,
  coverSeed,
  deskCables,
  deviceBox,
  mix,
  noteCloud,
  projectXY,
  rng,
  sparseDesk,
  wrapCover,
  type CoverGround,
  type Pt,
} from "./cover.js";
import { deriveGround, toneHex, type GroundRecipe } from "./ground.js";
import { withAlpha } from "./palette.js";
import { ticksPerBar } from "./ticks.js";
import type { VizDevice, VizProject } from "./types.js";

type Density = "towns" | "roads" | "relief" | "atlas";
type Mark = "dot" | "square" | "ring" | "tick";

type LandTone = { l: number; c: number; hue?: number };

type PrintingSpec = {
  density: Density;
  recipe: GroundRecipe;
  /** Landmass fill. Always lighter than the sea or the coast inverts. */
  land: LandTone;
  mark: Mark;
  coast: number;
};

/** A spec with sea, land, and ground resolved for one project. */
type Printing = {
  density: Density;
  ground: CoverGround;
  sea: string;
  land: string;
  mark: Mark;
  coast: number;
};

const PRINTINGS: Record<string, PrintingSpec> = {
  ortelius: {
    density: "towns",
    mark: "dot",
    coast: 6.4,
    land: { l: 0.87, c: 0.052, hue: 24 },
    recipe: {
      paperL: 0.2,
      paperC: 0.062,
      inkL: 0.1,
      inkC: 0.03,
      flare: "counter",
      flareL: 0.6,
      flareC: 0.185,
      mist: 0.38,
      finish: { grain: 0.1, grainScale: 0.66, vignette: 0.16 },
    },
  },
  gill: {
    density: "roads",
    mark: "square",
    coast: 3.2,
    land: { l: 0.91, c: 0.042, hue: 8 },
    recipe: {
      paperL: 0.31,
      paperC: 0.055,
      inkL: 0.11,
      inkC: 0.028,
      hue: -62,
      flare: "complement",
      flareL: 0.58,
      flareC: 0.18,
      mist: 0.4,
      finish: { grain: 0.07, grainScale: 0.85, vignette: 0.1 },
    },
  },
  /** Satellite relief: cool dark sea, pale land, dark activity contours. */
  usgs: {
    density: "relief",
    mark: "ring",
    coast: 2.4,
    land: { l: 0.9, c: 0.028 },
    recipe: {
      paperL: 0.24,
      paperC: 0.06,
      inkL: 0.16,
      inkC: 0.035,
      hue: -52,
      flare: "warm",
      flareL: 0.68,
      flareC: 0.17,
      mist: 0.36,
      finish: { grain: 0.045, grainScale: 1.15, vignette: 0.08 },
    },
  },
  walter: {
    density: "atlas",
    mark: "tick",
    coast: 4.2,
    land: { l: 0.93, c: 0.02 },
    recipe: {
      paperL: 0.13,
      paperC: 0.075,
      band: { center: 250, span: 84 },
      inkL: 0.08,
      inkC: 0.03,
      flare: "warm",
      flareL: 0.66,
      flareC: 0.19,
      mist: 0.34,
      finish: { grain: 0.045, grainScale: 1, vignette: 0.14 },
    },
  },
};

export function renderIsland(project: VizProject, variantId: string): string {
  const spec = PRINTINGS[variantId] ?? PRINTINGS.usgs;
  const ground = deriveGround(project, spec.recipe, variantId);
  const printing: Printing = {
    density: spec.density,
    mark: spec.mark,
    coast: spec.coast,
    ground,
    sea: ground.paper,
    land: toneHex(project, spec.land.l, spec.land.c, { hue: spec.land.hue }),
  };
  const sparse = sparseDesk(project);
  const coast = sparse ? inventoryCoast(project) : deviceCoast(project);
  const towns = placeTowns(project, coast, sparse);
  const activity = notesByDevice(project);
  const mutedIds = new Set(
    project.mixer.filter((m) => m.muted).map((m) => m.displayName).filter(Boolean)
  );

  let body = `<rect width="${COVER}" height="${COVER}" fill="${printing.sea}"/>`;
  body += seaWash(printing);
  body += seaGrain(project, printing);
  if (printing.density === "atlas") body += graticule(ground);
  const d = coast.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  body += `<path d="${d}" fill="${printing.land}" stroke="${ground.ink}" stroke-width="${sparse ? printing.coast + 1.4 : printing.coast}"/>`;

  if (printing.density === "relief" || printing.density === "atlas") {
    body += relief(project, towns, activity, printing, sparse);
  }

  if (printing.density === "roads" || printing.density === "atlas") {
    body += roads(project, towns, printing);
  }

  const cap = printing.density === "atlas" ? 80 : printing.density === "towns" ? 32 : 44;
  const ranked = [...towns].sort((a, b) => (activity.get(b.d.id) ?? 0) - (activity.get(a.d.id) ?? 0));
  ranked.forEach((t, i) => {
    if (i >= cap) return;
    const ruined = t.d.displayName ? mutedIds.has(t.d.displayName) : false;
    const port = landUse(t.d.type) === "port";
    const r = sparse ? (port ? 9 : 7) : port ? 5.5 : printing.density === "towns" ? 4.4 : 3.2;
    const fill = ruined ? mix(ground.ink, printing.land, 0.45) : i === 0 ? ground.flare : ground.ink;
    body += townMark(t.p.x, t.p.y, r, fill, printing.mark);
  });

  if (sparse) body += inlandMarks(project, coast, printing);

  body += compassRose(COVER - 108, 108, ground);
  return wrapCover(body, ground, {
    id: `is-${variantId}`,
    state: sparse ? "inventory-coast" : undefined,
  });
}

function deviceCoast(project: VizProject): Pt[] {
  const box = deviceBox(project.devices);
  const pts = project.devices.map((d) => projectXY(d.x, d.y, box, 28));
  return paddedHull(pts, project.devices.length <= 8 ? 110 : 78);
}

function inventoryCoast(project: VizProject): Pt[] {
  const cloud = noteCloud(project, 40);
  if (cloud.length >= 6) {
    const pts = cloud.map((p) => ({ x: 200 + p.x * 500, y: 210 + p.y * 460 }));
    return paddedHull(pts, 52);
  }
  const tpb = ticksPerBar(project.sigNum, project.sigDen);
  const bars = Math.max(4, project.durationTicks / tpb);
  const n = clamp(Math.round(11 + bars / 6), 11, 22);
  const rand = rng(coverSeed(project, "coast"));
  const cx = COVER * 0.48;
  const cy = COVER * 0.52;
  const R = clamp(250 + Math.sqrt(bars) * 14 + project.tracks.length * 10, 260, 350);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const wobble = 0.7 + 0.2 * Math.sin(a * (1 + project.sigNum) + bars) + 0.12 * rand();
    pts.push({ x: cx + Math.cos(a) * R * wobble, y: cy + Math.sin(a) * R * wobble * 0.84 });
  }
  return pts;
}

function placeTowns(
  project: VizProject,
  coast: Pt[],
  sparse: boolean
): { d: VizDevice; p: Pt }[] {
  if (project.devices.length === 0) return [];
  if (!sparse) {
    const box = deviceBox(project.devices);
    return project.devices.map((d) => ({ d, p: projectXY(d.x, d.y, box, 28) }));
  }
  const box = pointBox(coast);
  const dbox = deviceBox(project.devices);
  return project.devices.map((d, i) => {
    const nx = project.devices.length === 1 ? 0.42 : (d.x - dbox.minX) / (dbox.maxX - dbox.minX || 1);
    const ny = project.devices.length === 1 ? 0.48 : (d.y - dbox.minY) / (dbox.maxY - dbox.minY || 1);
    return {
      d,
      p: {
        x: lerp(box.minX + 50, box.maxX - 50, project.devices.length === 2 ? i : nx),
        y: lerp(box.minY + 50, box.maxY - 50, project.devices.length === 2 ? 0.4 + i * 0.18 : ny),
      },
    };
  });
}

function relief(
  project: VizProject,
  towns: { d: VizDevice; p: Pt }[],
  activity: Map<string, number>,
  printing: Printing,
  sparse: boolean
): string {
  const ground = printing.ground;
  let body = "";
  if (towns.length && !sparse) {
    const ranked = [...towns].sort((a, b) => (activity.get(b.d.id) ?? 0) - (activity.get(a.d.id) ?? 0));
    ranked.forEach(({ d, p }, i) => {
      const n = activity.get(d.id) ?? 0;
      if (n === 0) return;
      const rr = 18 + Math.min(96, Math.sqrt(n) * 4.4);
      const fill = mix(printing.land, ground.ink, 0.08 + Math.min(0.45, Math.sqrt(n) / 28));
      body += `<circle cx="${p.x}" cy="${p.y}" r="${rr}" fill="${withAlpha(fill, 0.42)}" stroke="${i === 0 ? ground.flare : ground.ink}" stroke-width="${i === 0 ? 2.4 : 1.5}"/>`;
      body += `<circle cx="${p.x}" cy="${p.y}" r="${rr * 0.55}" fill="none" stroke="${ground.ink}" stroke-width="1.1" opacity="0.7"/>`;
    });
    return body;
  }
  const cloud = noteCloud(project, 18);
  if (cloud.length) {
    cloud.forEach((p, i) => {
      const x = 200 + p.x * 500;
      const y = 210 + p.y * 460;
      const rr = 22 + (i % 5) * 8;
      body += `<circle cx="${x}" cy="${y}" r="${rr}" fill="${withAlpha(mix(printing.land, ground.ink, 0.2), 0.35)}" stroke="${i === 0 ? ground.flare : ground.ink}" stroke-width="1.6"/>`;
    });
    return body;
  }
  const regions = project.regions.filter((r) => r.kind !== "automation" && r.enabled);
  const hero = regions.reduce((h, r, i) => (r.durationTicks > (regions[h]?.durationTicks ?? 0) ? i : h), 0);
  regions.forEach((r, i) => {
    const end = Math.max(project.durationTicks, 1);
    const x = 160 + (r.positionTicks / end) * 560;
    const y = 280 + (i % 3) * 90;
    const rr = 40 + Math.min(80, r.durationTicks / 12000);
    body += `<circle cx="${x}" cy="${y}" r="${rr}" fill="${withAlpha(mix(printing.land, ground.ink, 0.25), 0.4)}" stroke="${i === hero ? ground.flare : ground.ink}" stroke-width="1.8"/>`;
  });
  return body;
}

function roads(project: VizProject, towns: { d: VizDevice; p: Pt }[], printing: Printing): string {
  const ground = printing.ground;
  let body = "";
  const byId = new Map(towns.map((t) => [t.d.id, t.p]));
  const cables = deskCables(project);
  const pictorial = printing.density === "roads";
  if (cables.length) {
    for (const c of cables) {
      const a = byId.get(c.from);
      const b = byId.get(c.to);
      if (!a || !b) continue;
      const ferry = c.kind === "note";
      const stroke = pictorial || ferry ? ground.flare : ground.ink;
      const width = pictorial ? (ferry ? 2.6 : 5.2) : ferry ? 1.8 : 3.4;
      body += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${stroke}" stroke-width="${width}" opacity="0.92"${ferry && !pictorial ? ' stroke-dasharray="7 5"' : ""}/>`;
    }
  } else if (towns.length >= 2) {
    for (let i = 0; i < towns.length - 1; i++) {
      const a = towns[i].p;
      const b = towns[i + 1].p;
      body += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${pictorial ? ground.flare : ground.ink}" stroke-width="${pictorial ? 4.6 : 3.2}" opacity="0.9"/>`;
    }
  }
  if (sparseDesk(project) && towns.length && project.mixer.some((m) => m.kind === "channel")) {
    const port = { x: COVER * 0.78, y: COVER * 0.7 };
    const from = towns[0].p;
    body += `<line x1="${from.x}" y1="${from.y}" x2="${port.x}" y2="${port.y}" stroke="${ground.flare}" stroke-width="2.8" opacity="0.9" stroke-dasharray="7 5"/>`;
    body += `<circle cx="${port.x}" cy="${port.y}" r="6" fill="${ground.flare}"/>`;
  }
  return body;
}

function inlandMarks(project: VizProject, coast: Pt[], printing: Printing): string {
  const box = pointBox(coast);
  const regions = project.regions.filter((r) => r.kind !== "automation" && r.enabled);
  if (!regions.length) return "";
  const end = Math.max(project.durationTicks, 1);
  const hero = regions.reduce((h, r, i) => (r.durationTicks > (regions[h]?.durationTicks ?? 0) ? i : h), 0);
  let body = "";
  regions.slice(0, 6).forEach((r, i) => {
    const x = lerp(box.minX + 40, box.maxX - 40, r.positionTicks / end);
    const y = lerp(box.minY + 50, box.maxY - 50, 0.35 + (i % 3) * 0.18);
    const rx = 18 + Math.min(36, r.durationTicks / 20000);
    const fill = i === hero ? printing.ground.flare : mix(printing.land, printing.ground.ink, 0.35);
    body += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * 0.55}" fill="${withAlpha(fill, i === hero ? 0.7 : 0.45)}" stroke="${printing.ground.ink}" stroke-width="1.4"/>`;
  });
  return body;
}

function seaWash(printing: Printing): string {
  return `<circle cx="${COVER * 0.48}" cy="${COVER * 0.52}" r="${COVER * 0.62}" fill="${withAlpha(mix(printing.sea, printing.ground.mist, 0.45), 0.55)}"/>`;
}

function graticule(ground: CoverGround): string {
  let body = "";
  for (let i = 1; i < 6; i++) {
    const x = (COVER / 6) * i;
    const y = (COVER / 6) * i;
    body += `<line x1="${x}" y1="0" x2="${x}" y2="${COVER}" stroke="${withAlpha(ground.ink, 0.16)}" stroke-width="1"/>`;
    body += `<line x1="0" y1="${y}" x2="${COVER}" y2="${y}" stroke="${withAlpha(ground.ink, 0.16)}" stroke-width="1"/>`;
  }
  return body;
}

function townMark(x: number, y: number, r: number, fill: string, mark: Mark): string {
  if (mark === "square") {
    return `<rect x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}" fill="${fill}"/>`;
  }
  if (mark === "ring") {
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${fill}" stroke-width="${Math.max(1.6, r * 0.35)}"/>`;
  }
  if (mark === "tick") {
    return `<path d="M ${x} ${y - r} L ${x} ${y + r} M ${x - r} ${y} L ${x + r} ${y}" stroke="${fill}" stroke-width="${Math.max(1.8, r * 0.4)}" stroke-linecap="square"/>`;
  }
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
}

function seaGrain(project: VizProject, printing: Printing): string {
  const rand = rng(coverSeed(project, "sea"));
  const n = Math.max(4, Math.min(10, project.tracks.length + 3));
  let body = "";
  for (let i = 0; i < n; i++) {
    const y = 40 + rand() * 820;
    body += `<path d="M 0 ${y} Q ${200 + rand() * 200} ${y + (rand() - 0.5) * 18} ${COVER} ${y + (rand() - 0.5) * 10}" fill="none" stroke="${withAlpha(mix(printing.sea, printing.ground.ink, 0.55), 0.22)}" stroke-width="1.2"/>`;
  }
  return body;
}

function convexHull(points: Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length <= 2) return pts;
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function paddedHull(points: Pt[], pad: number): Pt[] {
  if (points.length === 0) return inventoryCoastEmpty();
  if (points.length === 1) {
    const p = points[0];
    return [
      { x: p.x - pad, y: p.y },
      { x: p.x, y: p.y - pad * 0.7 },
      { x: p.x + pad, y: p.y },
      { x: p.x, y: p.y + pad * 0.7 },
    ];
  }
  if (points.length === 2) {
    const [a, b] = points;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    return [
      { x: a.x - pad * 0.35, y: a.y },
      { x: mx, y: my - pad },
      { x: b.x + pad * 0.35, y: b.y },
      { x: mx + pad * 0.2, y: my + pad * 0.75 },
      { x: mx - pad * 0.35, y: my + pad * 0.55 },
    ];
  }
  const hull = convexHull(points);
  const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
  return hull.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / dist) * pad, y: p.y + (dy / dist) * pad };
  });
}

function inventoryCoastEmpty(): Pt[] {
  return [
    { x: 220, y: 300 },
    { x: 450, y: 210 },
    { x: 680, y: 340 },
    { x: 620, y: 620 },
    { x: 280, y: 640 },
  ];
}

function pointBox(points: Pt[]): { minX: number; maxX: number; minY: number; maxY: number } {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function notesByDevice(project: VizProject): Map<string, number> {
  const regionByCol = new Map(project.regions.map((r) => [r.collectionId ?? "", r]));
  const trackById = new Map(project.tracks.map((t) => [t.id, t]));
  const counts = new Map<string, number>();
  for (const n of project.notes) {
    const region = regionByCol.get(n.collectionId);
    const player = region ? trackById.get(region.trackId)?.playerId : undefined;
    if (!player) continue;
    counts.set(player, (counts.get(player) ?? 0) + 1);
  }
  return counts;
}

function landUse(type: string): "port" | "mill" | "chapel" | "town" {
  if (/minimixer|merger|splitter|tinyGain/.test(type)) return "port";
  if (/waveshaper|curve|eq|filter/.test(type)) return "mill";
  if (/beatbox|machiniste|rasselbock|bassline/.test(type)) return "chapel";
  return "town";
}

function compassRose(x: number, y: number, ground: CoverGround): string {
  return `<g>
    <circle cx="${x}" cy="${y}" r="48" fill="${withAlpha(ground.ink, 0.18)}" stroke="${ground.ink}" stroke-width="2.4"/>
    <polygon points="${x},${y - 34} ${x + 8},${y} ${x},${y + 14} ${x - 8},${y}" fill="${ground.flare}"/>
  </g>`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}
