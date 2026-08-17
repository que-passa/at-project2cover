/**
 * Onset lines — the piano roll as plotter strokes.
 *
 * Same inventory in four registers: contour, parallel (Lamps), hatch (Etch),
 * polar. Notes are segments (time → x, pitch → y, duration → length),
 * voices are layers, waveshaper/Curve anchors are polylines. No city, sky,
 * ground plane, or window-as-mass.
 */
import { mix, wrapCover } from "./cover.js";
import { deriveGround, type GroundRecipe } from "./ground.js";
import { DEFAULT_GRAY, colorForIndex, withAlpha } from "./palette.js";
import { COVER, clamp, fmt, inks, lerp, rng, seedOf } from "./abstract.js";
import { bloomInks, contentEndTicks, formOf } from "./fingerprint.js";
import { ticksPerBar } from "./ticks.js";
import type { VizProject, VizRegion, VizShaper } from "./types.js";

type Kind = "contour" | "parallel" | "hatch" | "polar";

type Plate = {
  kind: Kind;
  /** True when the ink is lighter than the paper. */
  light: boolean;
  /** How far a stroke pulls toward its own semantic color. */
  tint: number;
};

type PrintingSpec = Plate & { recipe: GroundRecipe };

/** A spec with its ink colors resolved for one project. */
type Printing = Plate & {
  paper: string;
  ink: string;
  accent: string;
};

const PRINTINGS: Record<string, PrintingSpec> = {
  dawn: {
    kind: "contour",
    light: false,
    tint: 0.18,
    recipe: {
      paperL: 0.9,
      paperC: 0.04,
      inkL: 0.16,
      inkC: 0.035,
      flare: "counter",
      flareL: 0.46,
      flareC: 0.16,
      finish: { grain: 0.06, grainScale: 1.1, vignette: 0.06 },
    },
  },
  /** Lamps are warm light on a night sheet, whatever the document's hue. */
  lamps: {
    kind: "parallel",
    light: true,
    tint: 0.32,
    recipe: {
      paperL: 0.13,
      paperC: 0.045,
      inkL: 0.83,
      inkC: 0.11,
      inkBand: { center: 72, span: 46 },
      flare: "counter",
      flareL: 0.72,
      flareC: 0.15,
      finish: { grain: 0.05, grainScale: 0.95, vignette: 0.18 },
    },
  },
  etch: {
    kind: "hatch",
    light: false,
    tint: 0.1,
    recipe: {
      paperL: 0.83,
      paperC: 0.055,
      hue: 22,
      inkL: 0.14,
      inkC: 0.03,
      flare: "complement",
      flareL: 0.44,
      flareC: 0.15,
      finish: { grain: 0.11, grainScale: 0.58, vignette: 0.05 },
    },
  },
  overcast: {
    kind: "polar",
    light: true,
    tint: 0.22,
    recipe: {
      paperL: 0.2,
      paperC: 0.022,
      inkL: 0.88,
      inkC: 0.02,
      hue: -40,
      flare: "cool",
      flareL: 0.68,
      flareC: 0.1,
      finish: { grain: 0.035, grainScale: 1.25, vignette: 0.12 },
    },
  },
};

type Stroke = {
  t0: number;
  t1: number;
  pitch: number;
  vel: number;
  voice: number;
  color: string;
};

type Curve = { pts: { x: number; y: number }[]; weight: number };

type Plane = { x0: number; y0: number; w: number; h: number };

type Inventory = {
  strokes: Stroke[];
  curves: Curve[];
  t0: number;
  t1: number;
  p0: number;
  p1: number;
  voices: number;
  bar: number;
  state: string;
  plane: Plane;
};

const TAU = Math.PI * 2;
const STROKE_CAP = 5200;

export function renderSkyline(project: VizProject, variantId: string): string {
  const spec = PRINTINGS[variantId] ?? PRINTINGS.lamps;
  const g = deriveGround(project, spec.recipe, variantId);
  const inv = inventory(project);
  const fid = `onl${variantId}`;
  const paper = mix(g.paper, inv.strokes[0]?.color ?? g.paper, spec.light ? 0.04 : 0.03);
  const printing: Printing = { ...spec, paper, ink: g.ink, accent: g.flare };

  let inner = "";
  if (printing.kind === "polar") inner += drawPolar(inv, printing);
  else if (printing.kind === "contour") inner += drawContour(inv, printing);
  else if (printing.kind === "hatch") inner += drawHatch(inv, printing, seedOf(project, 12 + variantId.length * 13));
  else inner += drawParallel(inv, printing);
  inner += drawCurves(inv, printing);

  return wrapCover(inner, { ...g, paper }, {
    id: fid,
    state: inv.state,
  });
}

function inventory(project: VizProject): Inventory {
  const colors = inks(project, 6);
  const yarns = bloomInks(project, 8);
  const form = formOf(project);
  const bar = ticksPerBar(project.sigNum, project.sigDen);
  const strokes = collectStrokes(project, colors, yarns);
  const t0 = strokes.reduce((m, s) => Math.min(m, s.t0), Infinity);
  const t1 = strokes.reduce((m, s) => Math.max(m, s.t1), 0);
  const start = Number.isFinite(t0) ? t0 : 0;
  const stop = Math.max(start + 1, Number.isFinite(t1) ? t1 : contentEndTicks(project));
  const pitches = strokes.map((s) => s.pitch);
  const p0 = pitches.length ? Math.min(...pitches) : form.pitchMin;
  const p1 = pitches.length ? Math.max(...pitches) : form.pitchMax;
  const voices = 1 + strokes.reduce((m, s) => Math.max(m, s.voice), 0);
  return {
    strokes,
    curves: pickCurves(project.shapers),
    t0: start,
    t1: stop,
    p0,
    p1: p1 <= p0 ? p0 + 1 : p1,
    voices,
    bar,
    state: stateOf(strokes.length, p1 - p0),
    plane: planeOf(stop - start, p1 - p0, bar),
  };
}

function stateOf(n: number, span: number): string {
  if (n <= 4) return "rule";
  if (n < 200 && span < 24) return "cluster";
  if (n >= 400) return "field";
  return "thread";
}

function planeOf(tickSpan: number, pitchSpan: number, bar: number): Plane {
  const pad = 44;
  const max = COVER - pad * 2;
  const bars = tickSpan / bar;
  const w = max * clamp(bars / 56, 0.2, 1);
  const h = max * clamp(pitchSpan / 70, 0.14, 1);
  return { x0: (COVER - w) / 2, y0: (COVER - h) / 2, w, h };
}

function collectStrokes(project: VizProject, colors: string[], yarns: string[]): Stroke[] {
  const homes = new Map<string, VizRegion[]>();
  for (const r of project.regions) {
    if (r.kind !== "note" || !r.enabled || !r.collectionId) continue;
    const list = homes.get(r.collectionId) ?? [];
    list.push(r);
    homes.set(r.collectionId, list);
  }
  const voiceOf = new Map<string, number>();
  const takeVoice = (key: string) => {
    const found = voiceOf.get(key);
    if (found !== undefined) return found;
    const next = voiceOf.size;
    const voice = next < 14 ? next : next % 14;
    voiceOf.set(key, voice);
    return voice;
  };

  const out: Stroke[] = [];
  for (const n of project.notes) {
    const placed = homes.get(n.collectionId);
    const raw = colorForIndex(placed?.[0]?.colorIndex);
    const paint = raw === DEFAULT_GRAY ? colors[0] ?? yarns[0] ?? "#8a4a28" : raw;
    if (!placed || placed.length === 0) {
      if (n.positionTicks < 0) continue;
      out.push({
        t0: n.positionTicks,
        t1: n.positionTicks + Math.max(1, n.durationTicks),
        pitch: n.pitch,
        vel: n.velocity,
        voice: takeVoice(`c:${n.collectionId || "loose"}`),
        color: paint,
      });
      if (out.length >= STROKE_CAP) return out;
      continue;
    }
    for (const r of placed) {
      const loop = r.loopDurationTicks && r.loopDurationTicks > 0 ? r.loopDurationTicks : r.durationTicks;
      if (n.positionTicks < 0 || n.positionTicks >= loop) continue;
      let t = r.positionTicks + n.positionTicks;
      const end = r.positionTicks + r.durationTicks;
      const stepped = Boolean(r.loopDurationTicks && r.loopDurationTicks > 0 && r.durationTicks > r.loopDurationTicks);
      const key = r.trackId ? `t:${r.trackId}` : `c:${r.collectionId || n.collectionId}`;
      const hex = colorForIndex(r.colorIndex) === DEFAULT_GRAY ? paint : colorForIndex(r.colorIndex);
      do {
        out.push({
          t0: t,
          t1: t + Math.max(1, n.durationTicks),
          pitch: n.pitch,
          vel: n.velocity,
          voice: takeVoice(key),
          color: hex,
        });
        t += loop;
      } while (stepped && t < end && out.length < STROKE_CAP);
      if (out.length >= STROKE_CAP) return out;
    }
  }

  if (out.length > 0) return out;

  const audio = project.regions.filter((r) => r.kind === "audio" && r.enabled);
  for (const r of audio) {
    const hex = colorForIndex(r.colorIndex);
    const paint = hex === DEFAULT_GRAY ? colors[0] ?? "#6a4a32" : hex;
    out.push({
      t0: r.positionTicks,
      t1: r.positionTicks + Math.max(1, r.durationTicks),
      pitch: 60,
      vel: 0.62,
      voice: takeVoice(`a:${r.id}`),
      color: paint,
    });
  }
  if (out.length > 0) return out;

  if (project.devices.length > 0) {
    const xs = project.devices.map((d) => d.x);
    const minX = Math.min(...xs);
    const span = Math.max(1, Math.max(...xs) - minX);
    for (const [i, d] of project.devices.slice(0, 6).entries()) {
      const t = (d.x - minX) / span;
      out.push({
        t0: t,
        t1: t + 0.08,
        pitch: 60 - i * 2,
        vel: 0.5,
        voice: i,
        color: colors[i % colors.length] ?? "#6a4a32",
      });
    }
  }
  return out;
}

function pickCurves(shapers: VizShaper[]): Curve[] {
  const usable = shapers
    .filter((s) => s.anchors.length >= 2)
    .map((s) => {
      const ys = s.anchors.map((a) => a.y);
      return { s, wobble: Math.max(...ys) - Math.min(...ys), wave: s.kind === "waveshaper" };
    })
    .sort((a, b) => Number(b.wave) - Number(a.wave) || b.wobble - a.wobble)
    .slice(0, 6);
  return usable.map((u, i) => ({
    pts: normAnchors(u.s.anchors),
    weight: u.wave ? 1.35 - i * 0.12 : 0.85 - i * 0.08,
  }));
}

function normAnchors(anchors: { x: number; y: number }[]): { x: number; y: number }[] {
  const xs = anchors.map((a) => a.x);
  const ys = anchors.map((a) => a.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return anchors.map((a) => ({
    x: (a.x - minX) / (maxX - minX || 1),
    y: (a.y - minY) / (maxY - minY || 1),
  }));
}

function mapX(inv: Inventory, t: number): number {
  return inv.plane.x0 + ((t - inv.t0) / (inv.t1 - inv.t0 || 1)) * inv.plane.w;
}

function mapY(inv: Inventory, pitch: number): number {
  return inv.plane.y0 + (1 - (pitch - inv.p0) / (inv.p1 - inv.p0 || 1)) * inv.plane.h;
}

function spanX(inv: Inventory, s: Stroke): { x0: number; x1: number; y: number } {
  const x0 = mapX(inv, s.t0);
  const raw = mapX(inv, s.t1);
  const min = inv.strokes.length > 2000 ? 3.4 : inv.strokes.length > 200 ? 6.5 : 12;
  return { x0, x1: Math.max(x0 + min, raw), y: mapY(inv, s.pitch) };
}

function inkOf(s: Stroke, printing: Printing): string {
  return mix(printing.ink, s.color, printing.tint);
}

function weightScale(n: number): number {
  if (n > 2800) return 0.62;
  if (n > 900) return 0.78;
  if (n > 200) return 1;
  return 1.35;
}

function drawContour(inv: Inventory, printing: Printing): string {
  const byVoice = groupVoices(inv.strokes);
  const scale = weightScale(inv.strokes.length);
  let out = "";
  for (const [voice, list] of byVoice) {
    const sorted = [...list].sort((a, b) => a.t0 - b.t0 || a.pitch - b.pitch);
    const hex = inkOf(sorted[0], printing);
    const contours: string[] = [];
    let d = "";
    let prev: Stroke | null = null;
    for (const s of sorted) {
      const x = mapX(inv, (s.t0 + s.t1) / 2);
      const y = mapY(inv, s.pitch);
      if (!prev || s.t0 - prev.t1 > inv.bar * 2) {
        if (d) contours.push(d);
        d = `M ${fmt(x)} ${fmt(y)}`;
      } else {
        d += ` L ${fmt(x)} ${fmt(y)}`;
      }
      prev = s;
    }
    if (d) contours.push(d);
    const cw = clamp(1.15 * scale * (voice === 0 ? 1.25 : 0.85), 0.7, 2.4);
    out += strokePath(contours, withAlpha(hex, 0.42 + (voice === 0 ? 0.2 : 0)), cw);
    const ticks: string[] = [];
    for (const s of sorted) {
      const { x0, x1, y } = spanX(inv, s);
      ticks.push(`M ${fmt(x0)} ${fmt(y)} L ${fmt(x1)} ${fmt(y)}`);
    }
    const tw = clamp(0.9 * scale * (0.7 + sorted[0].vel) * (inv.strokes.length <= 4 ? 2.2 : 1), 0.55, 2.6);
    out += strokePath(ticks, hex, tw, 0.88);
  }
  return out;
}

function drawParallel(inv: Inventory, printing: Printing): string {
  const byVoice = groupVoices(inv.strokes);
  const scale = weightScale(inv.strokes.length);
  const hairs = inv.strokes.length > 900 ? 1 : inv.strokes.length > 80 ? 2 : 3;
  let out = "";
  for (const [voice, list] of byVoice) {
    const hex = inkOf(list[0], printing);
    const shear = ((voice % 5) - 2) * 0.038;
    const cmds: string[] = [];
    for (const s of list) {
      const { x0, x1, y } = spanX(inv, s);
      const dy = (x1 - x0) * shear;
      for (let h = 0; h < hairs; h++) {
        const o = (h - (hairs - 1) / 2) * 1.15;
        cmds.push(`M ${fmt(x0)} ${fmt(y + o)} L ${fmt(x1)} ${fmt(y + o + dy)}`);
      }
    }
    const sw = clamp(
      scale * (printing.light ? 1.05 : 0.9) * (0.65 + list[0].vel * 0.7) * (inv.strokes.length <= 4 ? 2.4 : 1),
      0.5,
      2.8
    );
    out += strokePath(cmds, hex, sw, printing.light ? 0.78 : 0.86);
  }
  return out;
}

function drawHatch(inv: Inventory, printing: Printing, seed: number): string {
  const byVoice = groupVoices(inv.strokes);
  const scale = weightScale(inv.strokes.length);
  const rand = rng(seed);
  const budget = 16000;
  const per = clamp(Math.floor(budget / Math.max(1, inv.strokes.length)), 2, 9);
  let out = "";
  for (const [voice, list] of byVoice) {
    const hex = inkOf(list[0], printing);
    const ang = (28 + voice * 17) * (Math.PI / 180);
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const cmds: string[] = [];
    const bases: string[] = [];
    for (const s of list) {
      const { x0, x1, y } = spanX(inv, s);
      const n = clamp(Math.round(((x1 - x0) / 6) * (0.7 + s.vel)), 2, per);
      const reach = lerp(3.2, 7.4, s.vel) * scale;
      bases.push(`M ${fmt(x0)} ${fmt(y)} L ${fmt(x1)} ${fmt(y)}`);
      for (let i = 0; i < n; i++) {
        const u = n === 1 ? 0.5 : i / (n - 1);
        const cx = lerp(x0, x1, u);
        const j = (rand() - 0.5) * 0.35;
        cmds.push(
          `M ${fmt(cx - dx * reach + j)} ${fmt(y - dy * reach)} L ${fmt(cx + dx * reach + j)} ${fmt(y + dy * reach)}`
        );
      }
    }
    const fat = inv.strokes.length <= 4 ? 2.1 : 1;
    out += strokePath(bases, withAlpha(hex, 0.55), clamp(0.55 * scale * fat, 0.4, 2.2));
    out += strokePath(cmds, hex, clamp(0.7 * scale * fat, 0.45, 2.4), 0.9);
  }
  return out;
}

function drawPolar(inv: Inventory, printing: Printing): string {
  const cx = COVER / 2;
  const cy = COVER / 2;
  const r0 = 28;
  const r1 = 428;
  const span = inv.t1 - inv.t0 || 1;
  const pspan = inv.p1 - inv.p0 || 1;
  const occupied = clamp(pspan / 70, 0.12, 1);
  const band0 = r0 + (1 - occupied) * (r1 - r0) * 0.42;
  const band1 = r1;
  const scale = weightScale(inv.strokes.length);
  const plate = withAlpha(printing.ink, printing.light ? 0.14 : 0.1);
  let out = `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(band1)}" fill="none" stroke="${plate}" stroke-width="0.7"/>`;
  if (occupied < 0.85) {
    out += `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(band0)}" fill="none" stroke="${plate}" stroke-width="0.55"/>`;
  }

  const byVoice = groupVoices(inv.strokes);
  for (const [voice, list] of byVoice) {
    const hex = inkOf(list[0], printing);
    const cmds: string[] = [];
    const bias = ((voice % 5) - 2) * 1.6;
    for (const s of list) {
      const a0 = -Math.PI / 2 + ((s.t0 - inv.t0) / span) * TAU;
      const sweep = Math.max(0.012, ((s.t1 - s.t0) / span) * TAU);
      const a1 = a0 + sweep;
      const r = clamp(band0 + ((s.pitch - inv.p0) / pspan) * (band1 - band0) + bias, r0 + 4, r1);
      if (sweep < 0.035) {
        const rr = r + lerp(inv.strokes.length < 200 ? 8 : 3.2, inv.strokes.length < 200 ? 16 : 8, s.vel);
        cmds.push(
          `M ${fmt(cx + Math.cos(a0) * r)} ${fmt(cy + Math.sin(a0) * r)} L ${fmt(cx + Math.cos(a0) * rr)} ${fmt(cy + Math.sin(a0) * rr)}`
        );
      } else if (sweep >= TAU * 0.98) {
        cmds.push(
          `M ${fmt(cx + r)} ${fmt(cy)} A ${fmt(r)} ${fmt(r)} 0 1 1 ${fmt(cx - r)} ${fmt(cy)} A ${fmt(r)} ${fmt(r)} 0 1 1 ${fmt(cx + r)} ${fmt(cy)}`
        );
      } else {
        cmds.push(arcCmd(cx, cy, r, a0, a1));
      }
    }
    const sw = clamp(
      scale * (0.7 + list[0].vel * 0.55) * (inv.strokes.length <= 4 ? 2.6 : 1),
      0.5,
      2.8
    );
    out += strokePath(cmds, hex, sw, printing.light ? 0.8 : 0.88);
  }
  return out;
}

function drawCurves(inv: Inventory, printing: Printing): string {
  if (inv.curves.length === 0) return "";
  let out = "";
  for (const [i, curve] of inv.curves.entries()) {
    const hex = mix(printing.accent, printing.ink, i === 0 ? 0.15 : 0.45);
    const cmds: string[] = [];
    if (printing.kind === "polar") {
      const cx = COVER / 2;
      const cy = COVER / 2;
      const r0 = 70;
      const r1 = 400;
      cmds.push(
        poly(
          curve.pts.map((p) => ({
            x: cx + Math.cos(-Math.PI / 2 + p.x * TAU) * (r0 + p.y * (r1 - r0)),
            y: cy + Math.sin(-Math.PI / 2 + p.x * TAU) * (r0 + p.y * (r1 - r0)),
          }))
        )
      );
    } else {
      const pts = curve.pts.map((p) => ({
        x: inv.plane.x0 + p.x * inv.plane.w,
        y: inv.plane.y0 + (1 - p.y) * inv.plane.h,
      }));
      cmds.push(poly(pts));
    }
    out += strokePath(cmds, withAlpha(hex, 0.55 + (i === 0 ? 0.2 : 0)), clamp(curve.weight * (printing.light ? 1.5 : 1.25), 0.8, 2.4));
  }
  return out;
}

function groupVoices(strokes: Stroke[]): [number, Stroke[]][] {
  const map = new Map<number, Stroke[]>();
  for (const s of strokes) {
    const list = map.get(s.voice) ?? [];
    list.push(s);
    map.set(s.voice, list);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

function strokePath(cmds: string[], stroke: string, width: number, opacity = 1): string {
  if (cmds.length === 0) return "";
  const chunks: string[] = [];
  const step = 900;
  for (let i = 0; i < cmds.length; i += step) {
    chunks.push(cmds.slice(i, i + step).join(" "));
  }
  const op = opacity < 1 ? ` opacity="${opacity.toFixed(3)}"` : "";
  return chunks
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${fmt(width)}" stroke-linecap="butt" stroke-linejoin="miter"${op}/>`
    )
    .join("");
}

function poly(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  let d = `M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${fmt(pts[i].x)} ${fmt(pts[i].y)}`;
  return d;
}

function arcCmd(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const x0 = cx + Math.cos(a0) * r;
  const y0 = cy + Math.sin(a0) * r;
  const x1 = cx + Math.cos(a1) * r;
  const y1 = cy + Math.sin(a1) * r;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${fmt(x0)} ${fmt(y0)} A ${fmt(r)} ${fmt(r)} 0 ${large} 1 ${fmt(x1)} ${fmt(y1)}`;
}
