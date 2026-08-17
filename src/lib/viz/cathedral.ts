import { COVER, mix, noteCloud, wrapCover, type CoverGround } from "./cover.js";
import { deriveGround, type GroundRecipe } from "./ground.js";
import { cropDurationTicks, ticksPerBar } from "./ticks.js";
import type { VizNote, VizProject, VizRegion } from "./types.js";

type Match = "exact" | "pc" | "length" | "rose";

type PrintingSpec = {
  match: Match;
  recipe: GroundRecipe;
  /** Stone offset from paper. 0 means the stone *is* the ground. */
  stoneShift?: number;
};

/** A spec with its ground resolved for one project. */
type Printing = {
  match: Match;
  ground: CoverGround;
  stone: string;
};

const PRINTINGS: Record<string, PrintingSpec> = {
  chartres: {
    match: "exact",
    recipe: {
      paperL: 0.11,
      paperC: 0.05,
      inkL: 0.9,
      inkC: 0.04,
      flare: "counter",
      flareL: 0.58,
      flareC: 0.185,
      mist: 0.3,
      finish: { grain: 0.08, grainScale: 0.7, vignette: 0.17 },
    },
  },
  tiffany: {
    match: "pc",
    stoneShift: -0.62,
    recipe: {
      paperL: 0.88,
      paperC: 0.048,
      inkL: 0.16,
      inkC: 0.03,
      hue: 18,
      flare: "complement",
      flareL: 0.48,
      flareC: 0.15,
      mist: 0.36,
      finish: { grain: 0.06, grainScale: 1.05, vignette: 0.07 },
    },
  },
  print: {
    match: "length",
    recipe: {
      paperL: 0.93,
      paperC: 0.012,
      inkL: 0.13,
      inkC: 0.02,
      flare: "counter",
      flareL: 0.5,
      flareC: 0.15,
      mist: 0.28,
      finish: { grain: 0.035, grainScale: 1.25, vignette: 0.04 },
    },
  },
  /** Prussian: the temperature is the identity, the exact blue is the project's. */
  blueprint: {
    match: "rose",
    recipe: {
      paperL: 0.17,
      paperC: 0.088,
      band: { center: 252, span: 92 },
      inkL: 0.94,
      inkC: 0.025,
      flare: "warm",
      flareL: 0.74,
      flareC: 0.17,
      mist: 0.26,
      finish: { grain: 0.05, grainScale: 0.95, vignette: 0.13 },
    },
  },
};

type Span = {
  start: number;
  end: number;
  key: string;
  color: string;
  track: number;
  notes: number;
  duration: number;
};

type Petal = { color: string; weight: number };

export function renderCathedral(project: VizProject, variantId: string): string {
  const spec = PRINTINGS[variantId] ?? PRINTINGS.chartres;
  const ground = deriveGround(project, spec.recipe, variantId);
  const printing: Printing = {
    match: spec.match,
    ground,
    stone: spec.stoneShift ? mix(ground.paper, ground.ink, Math.abs(spec.stoneShift)) : ground.paper,
  };
  const regions = project.regions.filter((r) => r.kind !== "automation" && r.enabled);
  const tpb = ticksPerBar(project.sigNum, project.sigDen);
  const contentEnd = regions.reduce((m, r) => Math.max(m, r.positionTicks + r.durationTicks), 0);
  const end = cropDurationTicks(project.durationTicks, contentEnd, project.sigNum, project.sigDen);
  const cx = COVER / 2;
  const cy = COVER / 2;
  const sparse = thinNave(project, regions);
  const r = sparse ? COVER * 0.46 : COVER * 0.7;

  if (printing.match === "rose") {
    return wrapCover(
      `<rect width="${COVER}" height="${COVER}" fill="${printing.stone}"/>${hueWash(printing, cx, cy)}${rose(project, printing, cx, cy, r)}`,
      ground,
      { id: "cat-blue", state: sparse ? "inventory-rose" : undefined }
    );
  }

  const spans = fingerprintSpans(project, regions, printing, tpb);
  const arcs = pairRepeats(spans);
  let body = `<rect width="${COVER}" height="${COVER}" fill="${printing.stone}"/>`;
  body += hueWash(printing, cx, cy);
  body += rose(project, printing, cx, cy, sparse ? r : r * 0.76);

  if (!sparse && (spans.length || arcs.length)) {
    const ringR = r;
    const xOf = (ticks: number) => -Math.PI / 2 + (ticks / (end || 1)) * Math.PI * 2;
    const maxTrack = Math.max(1, ...spans.map((s) => s.track));
    for (const s of spans) {
      const a0 = xOf(s.start);
      const a1 = Math.max(a0 + 0.04, xOf(s.end));
      const t = s.track / maxTrack;
      const r0 = ringR * (0.48 + t * 0.36);
      const thick = ringR * (0.028 + Math.min(0.1, s.notes / 140 + s.duration / 400000));
      body += wedge(cx, cy, r0, r0 + thick, a0, a1, s.color);
    }
    const shown = arcs.slice(0, 64);
    for (const a of shown) {
      const t1 = (xOf(a.left.start) + xOf(a.left.end)) / 2;
      const t2 = (xOf(a.right.start) + xOf(a.right.end)) / 2;
      const p1 = { x: cx + Math.cos(t1) * ringR * 0.64, y: cy + Math.sin(t1) * ringR * 0.64 };
      const p2 = { x: cx + Math.cos(t2) * ringR * 0.64, y: cy + Math.sin(t2) * ringR * 0.64 };
      const pinch = project.sidechains.length > 0 ? 0.78 : 1;
      body += `<path d="M ${p1.x} ${p1.y} Q ${cx} ${cy * pinch} ${p2.x} ${p2.y}" fill="none" stroke="${a.color}" stroke-width="3.2" opacity="0.88"/>`;
    }
  } else {
    body += naveTracery(project, printing, cx, cy, r);
  }

  return wrapCover(body, ground, {
    id: `cat-${variantId}`,
    state: sparse ? "inventory-rose" : undefined,
  });
}

function hueWash(printing: Printing, cx: number, cy: number): string {
  const id = `cat-wash-${printing.match}`;
  return `<defs>
    <radialGradient id="${id}" cx="50%" cy="46%" r="62%">
      <stop offset="0%" stop-color="${mix(printing.stone, printing.ground.mist, 0.55)}"/>
      <stop offset="100%" stop-color="${printing.stone}"/>
    </radialGradient>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${COVER * 0.52}" fill="url(#${id})"/>`;
}

function thinNave(project: VizProject, regions: VizRegion[]): boolean {
  const strips = project.mixer.filter((m) => m.kind === "channel" || m.kind === "group");
  return regions.length < 8 && project.notes.length < 200 && strips.length < 6;
}

function rose(project: VizProject, printing: Printing, cx: number, cy: number, r: number): string {
  const petals = rosePetals(project, printing);
  const n = Math.max(6, petals.length);
  const items = petals.length >= n ? petals.slice(0, n) : [...petals, ...durationPetals(project, printing)].slice(0, n);
  const weights = items.map((p) => Math.max(0.16, p.weight));
  const total = weights.reduce((s, w) => s + w, 0) || 1;
  let out = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${printing.ground.mist}"/>`;
  let a = -Math.PI / 2;
  items.forEach((p, i) => {
    const sweep = (weights[i] / total) * Math.PI * 2;
    const reach = 0.7 + Math.min(0.26, weights[i] * 0.18);
    const inner = r * (0.14 + Math.min(0.22, (1 / weights[i]) * 0.04));
    out += wedge(cx, cy, inner, r * reach, a, a + sweep, p.color);
    const stripeR = r * (0.4 + (i % 4) * 0.07);
    const stripeSweep = sweep * (0.35 + Math.min(0.6, weights[i] * 0.28));
    out += arcStroke(cx, cy, stripeR, a + sweep * 0.08, a + stripeSweep, p.color === printing.ground.flare ? printing.ground.flare : printing.ground.ink, 2.4 + Math.min(6, weights[i] * 2.2));
    a += sweep;
  });
  const shaper = project.shapers.find((s) => s.anchors.length >= 2);
  if (shaper) {
    const d = shaper.anchors
      .map((pt, i) => {
        const x = cx - r * 0.36 + pt.x * r * 0.72;
        const y = cy + r * 0.18 - pt.y * r * 0.4;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
    out += `<path d="${d}" fill="none" stroke="${printing.ground.flare}" stroke-width="2"/>`;
  }
  out += `<circle cx="${cx}" cy="${cy}" r="${r * 0.1}" fill="${printing.ground.paper}"/>`;
  return out;
}

function arcStroke(cx: number, cy: number, r: number, a0: number, a1: number, stroke: string, width: number): string {
  const span = Math.max(0.06, a1 - a0);
  const large = span > Math.PI ? 1 : 0;
  const x0 = cx + Math.cos(a0) * r;
  const y0 = cy + Math.sin(a0) * r;
  const x1 = cx + Math.cos(a0 + span) * r;
  const y1 = cy + Math.sin(a0 + span) * r;
  return `<path d="M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="butt"/>`;
}

function rosePetals(project: VizProject, printing: Printing): Petal[] {
  const strips = [...project.mixer]
    .filter((m) => m.kind === "channel" || m.kind === "group")
    .sort((a, b) => a.order - b.order);
  const regions = project.regions.filter((r) => r.kind !== "automation" && r.enabled);
  const notesByCol = notesByCollection(project);

  if (strips.length >= 4) {
    const maxG = Math.max(1, ...strips.map((s) => s.postGain ?? 1));
    return dyePetals(
      printing,
      strips.slice(0, 18).map((s) => 0.45 + ((s.postGain ?? 1) / maxG) * 1.1)
    );
  }

  if (printing.match === "pc" && project.notes.length >= 8) {
    return pitchPetals(project, printing);
  }
  if (printing.match === "exact" && regions.length >= 1) {
    const maxN = Math.max(1, ...regions.map((r) => (r.collectionId ? notesByCol.get(r.collectionId)?.length ?? 0 : 0)));
    const fromRegs = regions.slice(0, 12).map((r) => {
      const notes = r.collectionId ? notesByCol.get(r.collectionId)?.length ?? 0 : 0;
      return 0.35 + Math.min(1.4, r.durationTicks / 80000) + (notes / maxN) * 0.7;
    });
    if (fromRegs.length >= 6) return dyePetals(printing, fromRegs);
    const pad = durationPetals(project, printing);
    return dyePetals(printing, [...fromRegs, ...pad.map((p) => p.weight)]).slice(0, 10);
  }
  if (printing.match === "pc" && project.notes.length < 8) {
    return dyePetals(
      printing,
      Array.from({ length: 6 }, (_, i) => 0.7 + (i % 3) * 0.35)
    );
  }
  if (printing.match === "length" || printing.match === "rose") {
    return durationPetals(project, printing);
  }
  if (project.notes.length >= 8) return pitchPetals(project, printing);
  return durationPetals(project, printing);
}

function dyePetals(printing: Printing, weights: number[]): Petal[] {
  const hero = weights.reduce((h, w, i) => (w > weights[h] ? i : h), 0);
  return weights.map((weight, i) => ({
    color: glassAt(printing, i, weights.length, i === hero),
    weight,
  }));
}

function glassAt(printing: Printing, i: number, n: number, accent: boolean): string {
  if (accent) return printing.ground.flare;
  const t = n <= 1 ? 0.55 : i / (n - 1);
  return mix(printing.ground.mist, printing.ground.ink, 0.28 + t * 0.72);
}

function pitchPetals(project: VizProject, printing: Printing): Petal[] {
  const bins = new Array(12).fill(0);
  for (const n of project.notes) bins[((n.pitch % 12) + 12) % 12] += 1;
  const max = Math.max(...bins, 1);
  return dyePetals(
    printing,
    bins.map((b) => 0.28 + (b / max) * 1.35)
  );
}

function durationPetals(project: VizProject, printing: Printing): Petal[] {
  const tpb = ticksPerBar(project.sigNum, project.sigDen);
  const bars = Math.max(4, project.durationTicks / tpb);
  const petals =
    printing.match === "length"
      ? Math.max(8, Math.min(16, Math.round(bars / 6)))
      : printing.match === "rose"
        ? Math.max(project.sigNum * 2, 10)
        : Math.max(project.sigNum * 2, 8);
  return dyePetals(
    printing,
    Array.from({ length: petals }, (_, i) => 0.4 + ((i + Math.round(bars)) % 5) * 0.22 + ((i * 3 + bars) % 7) * 0.06)
  );
}

function naveTracery(project: VizProject, printing: Printing, cx: number, cy: number, r: number): string {
  const cloud = noteCloud(project, 24);
  const regions = project.regions.filter((reg) => reg.kind !== "automation" && reg.enabled);
  let out = "";
  if (cloud.length) {
    cloud.forEach((p, i) => {
      const a = -Math.PI / 2 + p.x * Math.PI * 2;
      const rr = r * (0.22 + p.y * 0.62);
      out += `<circle cx="${cx + Math.cos(a) * rr}" cy="${cy + Math.sin(a) * rr}" r="2.4" fill="${i === 0 ? printing.ground.flare : printing.ground.ink}"/>`;
    });
    return out;
  }
  const notesByCol = notesByCollection(project);
  const maxN = Math.max(1, ...regions.map((reg) => (reg.collectionId ? notesByCol.get(reg.collectionId)?.length ?? 0 : 0)));
  const hero = regions.reduce((h, reg, i) => (reg.durationTicks > (regions[h]?.durationTicks ?? 0) ? i : h), 0);
  regions.forEach((reg, i) => {
    const end = Math.max(project.durationTicks, 1);
    const a0 = -Math.PI / 2 + (reg.positionTicks / end) * Math.PI * 2;
    const notes = reg.collectionId ? notesByCol.get(reg.collectionId)?.length ?? 0 : 0;
    const sweep = Math.max(0.08, (reg.durationTicks / end) * Math.PI * 2);
    const a1 = a0 + sweep;
    const r0 = r * (0.62 + (i % 3) * 0.08);
    const r1 = r0 + r * (0.08 + (notes / maxN) * 0.12);
    out += wedge(cx, cy, r0, r1, a0, a1, glassAt(printing, i, regions.length, i === hero));
  });
  return out;
}

function wedge(cx: number, cy: number, rIn: number, rOut: number, a0: number, a1: number, fill: string): string {
  const raw = Math.max(0.01, a1 - a0);
  const pad = Math.min(raw * 0.22, Math.max(0.045, raw * 0.14));
  const span = Math.max(0.014, raw - pad * 2);
  const aa0 = a0 + (raw - span) / 2;
  const depth = Math.max(0, rOut - Math.max(0, rIn));
  const inset = Math.max(5, depth * 0.12);
  const rrIn = Math.max(0, rIn) + inset;
  const rrOut = rOut - inset;
  if (rrOut <= rrIn + 2) return "";
  const large = span > Math.PI ? 1 : 0;
  const p = (rad: number, a: number) => `${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`;
  return `<path d="M ${p(rrOut, aa0)} A ${rrOut} ${rrOut} 0 ${large} 1 ${p(rrOut, aa0 + span)} L ${p(rrIn, aa0 + span)} A ${rrIn} ${rrIn} 0 ${large} 0 ${p(rrIn, aa0)} Z" fill="${fill}"/>`;
}

function fingerprintSpans(project: VizProject, regions: VizRegion[], printing: Printing, tpb: number): Span[] {
  const notesByCol = notesByCollection(project);
  const trackById = new Map(project.tracks.map((t, i) => [t.id, i]));
  const spans: Span[] = [];
  const ranked = [...regions].sort((a, b) => b.durationTicks - a.durationTicks);
  const heroId = ranked[0]?.id;
  regions.forEach((r, i) => {
    const key = regionKey(r, printing.match, tpb, notesByCol);
    if (!key) return;
    const notes = r.collectionId ? notesByCol.get(r.collectionId)?.length ?? 0 : 0;
    spans.push({
      start: r.positionTicks,
      end: r.positionTicks + r.durationTicks,
      key,
      color: glassAt(printing, i, Math.max(1, regions.length), r.id === heroId),
      track: trackById.get(r.trackId) ?? i,
      notes,
      duration: r.durationTicks,
    });
  });
  return spans.sort((a, b) => a.start - b.start);
}

function notesByCollection(project: VizProject): Map<string, VizNote[]> {
  const notesByCol = new Map<string, VizNote[]>();
  for (const n of project.notes) {
    const list = notesByCol.get(n.collectionId) ?? [];
    list.push(n);
    notesByCol.set(n.collectionId, list);
  }
  return notesByCol;
}

function regionKey(
  r: VizRegion,
  match: Match,
  tpb: number,
  notesByCol: Map<string, VizNote[]>
): string | null {
  if (match === "exact") {
    if (r.displayName) return `n:${r.displayName}`;
    if (r.collectionId) return `c:${r.collectionId}`;
    return `t:${r.trackId}:${Math.round(r.durationTicks / tpb)}`;
  }
  if (match === "length") {
    const bars = Math.round(r.durationTicks / tpb);
    return bars >= 1 ? `l:${bars}` : null;
  }
  const notes = r.collectionId ? notesByCol.get(r.collectionId) ?? [] : [];
  if (notes.length < 4) return null;
  return `p:${pitchClassSig(notes)}`;
}

function pitchClassSig(notes: VizNote[]): string {
  const bins = new Array(12).fill(0);
  for (const n of notes) bins[((n.pitch % 12) + 12) % 12] += 1;
  const max = Math.max(...bins, 1);
  return bins.map((b) => Math.round((b / max) * 2)).join("");
}

function pairRepeats(spans: Span[]): { left: Span; right: Span; color: string }[] {
  const groups = new Map<string, Span[]>();
  for (const s of spans) {
    const list = groups.get(s.key) ?? [];
    list.push(s);
    groups.set(s.key, list);
  }
  const arcs: { left: Span; right: Span; color: string }[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const ordered = [...list].sort((a, b) => a.start - b.start);
    for (let i = 0; i < ordered.length - 1; i++) {
      arcs.push({ left: ordered[i], right: ordered[i + 1], color: ordered[i].color });
    }
  }
  return arcs.sort((a, b) => a.left.start - b.left.start);
}
