/**
 * Ground recipes — where per-project color enters the cover.
 *
 * A printing used to be four hex literals, so every project rendered in
 * "Jewel rose" or "Stripe field" got byte-identical paper, ink, and accent.
 * The document only reached the marks, never the field they sit on.
 *
 * Now a printing declares a *register* — how dark, how much contrast, how
 * saturated, warm or cool figure, what finish — and the project supplies the
 * hue. Jewel stays Jewel across every document; Que pt2's Jewel and The
 * Block's Jewel are different colors.
 *
 * What still may not move: semantic `colorIndex` swatches. Those come from the
 * LUT and are only ever nudged in lightness (never hue) when they would
 * otherwise vanish into the paper.
 */
import type { CoverGround, Finish } from "./cover.js";
import { colorForIndex, hueForIndex } from "./palette.js";
import {
  hue,
  hueDistance,
  hueSpread,
  meanHue,
  mixOk,
  norm360,
  oklchToHex,
  separate,
} from "./oklch.js";
import type { VizProject } from "./types.js";

/** Where a printing's accent hue comes from, relative to the project anchor. */
export type FlareRule = "counter" | "complement" | "anchor" | "warm" | "cool";

/**
 * For printings whose identity *is* a temperature — Prussian blue, phosphor
 * green, CMY magenta. The hue stays inside the band, but where inside it lands
 * is driven by the project, so two documents get two different Prussians.
 */
export type HueBand = { center: number; span: number };

export type GroundRecipe = {
  /** Ground lightness in OKLab L. Below ~0.35 is a dark printing. */
  paperL: number;
  /** How strongly the project hue tints the ground. 0 is neutral. */
  paperC: number;
  /** Figure lightness. The gap to paperL is the printing's contrast. */
  inkL: number;
  inkC?: number;
  /** Degrees added to the project anchor for this printing. */
  hue?: number;
  /** Extra rotation for the ink only — e.g. a cool figure on warm paper. */
  inkHue?: number;
  /** Pin paper and ink to a named hue family. */
  band?: HueBand;
  /** Pin only the ink (phosphor green on black, gold on night). */
  inkBand?: HueBand;
  flare?: FlareRule;
  flareL?: number;
  flareC?: number;
  /** Pin only the accent (the cyan plate of a CMY misregister). */
  flareBand?: HueBand;
  /** Mist position between paper and ink, 0..1. */
  mist?: number;
  /** Pull the mist toward the accent, 0..1. */
  mistFlare?: number;
  finish?: Partial<Finish>;
};

export type ProjectTone = {
  /** Dominant hue in degrees. Drives paper and ink. */
  anchor: number;
  /** Most distant hue actually present, or a constructed opposite. */
  counter: number;
  /** 0 when the document is monochrome, 1 when it is a carnival. */
  spread: number;
  /** Genre/tag chroma multiplier. Dark tags mute, club tags push. */
  mood: number;
  /** True when the document really has colorIndex to draw from. */
  semantic: boolean;
};

export const DEFAULT_FINISH: Finish = { grain: 0.07, grainScale: 0.78, vignette: 0.12 };

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

type HueWeight = { h: number; w: number };

/**
 * Hues the document actually declares, weighted by how much of the picture
 * each one is responsible for. Mixer strips outrank regions outrank cables.
 */
function semanticHues(project: VizProject): HueWeight[] {
  const out: HueWeight[] = [];
  for (const strip of project.mixer) {
    if (strip.muted) continue;
    const h = hueForIndex(strip.colorIndex);
    if (h === null) continue;
    out.push({ h, w: 1.4 + clamp(strip.postGain ?? 1, 0, 2) + (strip.soloed ? 1 : 0) });
  }
  for (const region of project.regions) {
    if (!region.enabled || region.kind === "automation") continue;
    const h = hueForIndex(region.colorIndex);
    if (h === null) continue;
    out.push({ h, w: 0.5 + Math.min(2.5, region.noteCount / 70) });
  }
  for (const cable of project.cables) {
    const h = hueForIndex(cable.colorIndex);
    if (h === null) continue;
    out.push({ h, w: 0.3 });
  }
  return out;
}

function moodChroma(project: VizProject): number {
  const text = `${project.tags.join(" ")} ${project.genreName ?? ""}`.toLowerCase();
  let m = 1;
  if (/dark|night|drone|ambient|doom|sad|melanchol|grief|cold/.test(text)) m *= 0.82;
  if (/rap|trap|phonk|hard|dnb|drum|bass|acid|hyper|rave|house|techno|club|dance/.test(text)) {
    m *= 1.18;
  }
  if (/experimental|glitch|noise|idm/.test(text)) m *= 1.06;
  if (project.kind === "sketch") m *= 0.94;
  return clamp(m, 0.7, 1.32);
}

export function projectTone(project: VizProject): ProjectTone {
  const entries = semanticHues(project);
  const jitter = (hash01(`${project.id}|tone`) - 0.5) * 32;
  const mood = moodChroma(project);

  if (entries.length === 0) {
    const base = norm360(hash01(`${project.id}|${project.name}`) * 360);
    return {
      anchor: base,
      counter: norm360(base + 148 + jitter),
      spread: 0,
      mood,
      semantic: false,
    };
  }

  const buckets = new Map<number, number>();
  for (const e of entries) {
    const key = Math.round(norm360(e.h) / 6);
    buckets.set(key, (buckets.get(key) ?? 0) + e.w);
  }
  let topKey = 0;
  let topWeight = -1;
  for (const [key, weight] of buckets) {
    if (weight > topWeight) {
      topWeight = weight;
      topKey = key;
    }
  }
  const dominant = norm360(topKey * 6);
  const anchor = norm360(dominant + jitter * 0.5);

  let counter = norm360(anchor + 150);
  let best = -1;
  for (const e of entries) {
    const d = hueDistance(e.h, anchor);
    if (d > best && d >= 45) {
      best = d;
      counter = norm360(e.h);
    }
  }
  if (best < 0) {
    const mean = meanHue(entries.filter((e) => hueDistance(e.h, anchor) >= 20));
    counter = norm360((mean ?? anchor + 150) + (mean === null ? jitter : 0));
  }

  return { anchor, counter, spread: hueSpread(entries), mood, semantic: true };
}

function flareHue(rule: FlareRule, tone: ProjectTone, base: number): number {
  if (rule === "counter") return tone.counter;
  if (rule === "complement") return norm360(base + 180);
  if (rule === "warm") return norm360(40 + (hueDistance(base, 40) < 40 ? 26 : 0));
  if (rule === "cool") return norm360(228 - (hueDistance(base, 228) < 40 ? 30 : 0));
  return base;
}

/**
 * Fold a hue into a band. The project's distance from the band center decides
 * where inside the band it lands, so the family is fixed but the color is not.
 */
function inBand(hue: number, band: HueBand | undefined): number {
  if (!band) return hue;
  let delta = norm360(hue) - norm360(band.center);
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return norm360(band.center + (delta / 180) * (band.span / 2));
}

/**
 * Build a printing's ground for one project. Same recipe + same project always
 * yields the same colors; the same recipe across projects yields the same
 * register in a different hue.
 */
export function deriveGround(
  project: VizProject,
  recipe: GroundRecipe,
  salt = ""
): CoverGround {
  const tone = projectTone(project);
  const base = inBand(norm360(tone.anchor + (recipe.hue ?? 0)), recipe.band);
  const inkHue = inBand(norm360(base + (recipe.inkHue ?? 0)), recipe.inkBand);
  const mood = tone.mood;

  // A banded printing barely moves on hue alone, so the project also gets a
  // small say in how deep and how saturated its own ground sits.
  const lNudge = (hash01(`${project.id}|paperL`) - 0.5) * 0.05;
  const cNudge = 1 + (hash01(`${project.id}|paperC`) - 0.5) * 0.24;

  const paper = oklchToHex(
    clamp(recipe.paperL + lNudge, 0.035, 0.965),
    clamp(recipe.paperC * mood * cNudge, 0, 0.2),
    base
  );
  const ink = oklchToHex(
    clamp(recipe.inkL, 0.03, 0.98),
    clamp((recipe.inkC ?? 0.03) * mood, 0, 0.2),
    inkHue
  );
  const fRule = recipe.flare ?? "counter";
  const flare = oklchToHex(
    clamp(recipe.flareL ?? (recipe.paperL < 0.4 ? 0.66 : 0.55), 0.05, 0.95),
    clamp((recipe.flareC ?? 0.15) * mood, 0, 0.21),
    inBand(flareHue(fRule, tone, base), recipe.flareBand)
  );
  const rawMist = mixOk(paper, ink, clamp(recipe.mist ?? 0.34, 0, 1));
  const mist = recipe.mistFlare ? mixOk(rawMist, flare, clamp(recipe.mistFlare, 0, 1)) : rawMist;

  return {
    paper,
    ink,
    mist,
    flare,
    finish: { ...DEFAULT_FINISH, ...recipe.finish },
    seed: hash01(`${project.id}|${salt}|${project.facts.noteCount}`),
  };
}

/**
 * One color at a chosen lightness and chroma, in this project's hue. For the
 * extra fields a printing needs beside paper/ink/mist/flare — a map's land, a
 * plate's second pass — so those track the document too.
 */
export function toneHex(
  project: VizProject,
  l: number,
  c: number,
  opts: { hue?: number; band?: HueBand; source?: "anchor" | "counter" } = {}
): string {
  const tone = projectTone(project);
  const base = opts.source === "counter" ? tone.counter : tone.anchor;
  return oklchToHex(
    clamp(l, 0.02, 0.98),
    clamp(c * tone.mood, 0, 0.21),
    inBand(norm360(base + (opts.hue ?? 0)), opts.band)
  );
}

/**
 * Semantic swatches for this project, kept in LUT hue but guaranteed to clear
 * the paper in lightness. Order is document order (mixer, then regions), so a
 * renderer indexing into this list still points at real strips.
 */
export function groundInks(
  project: VizProject,
  ground: CoverGround,
  minDelta = 0.16
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (hex: string | null) => {
    if (!hex) return;
    const safe = separate(hex, ground.paper, minDelta);
    if (seen.has(safe)) return;
    seen.add(safe);
    out.push(safe);
  };
  const strips = [...project.mixer].sort(
    (a, b) => (b.postGain ?? 0) - (a.postGain ?? 0) || a.order - b.order
  );
  for (const strip of strips) {
    if (strip.muted) continue;
    push(swatch(strip.colorIndex));
  }
  for (const region of project.regions) {
    if (!region.enabled || region.kind === "automation") continue;
    push(swatch(region.colorIndex));
  }
  return out;
}

/** The real LUT swatch, or null when the document declared no index. */
function swatch(index: number | null | undefined): string | null {
  return hueForIndex(index) === null ? null : colorForIndex(index);
}

/**
 * A hero/counter pair with real separation, for renderers that need one focal
 * color plus one that reads against it. Falls back to the ground's own accent.
 */
export function accentPair(
  project: VizProject,
  ground: CoverGround
): { hero: string; counter: string } {
  const inks = groundInks(project, ground, 0.18);
  const hero = inks[0] ?? ground.flare;
  let counter = ground.flare;
  let best = -1;
  for (const ink of inks.slice(1)) {
    const d = hueDistance(hue(ink), hue(hero));
    if (d > best) {
      best = d;
      counter = ink;
    }
  }
  if (best < 30) counter = ground.flare;
  return { hero, counter };
}
