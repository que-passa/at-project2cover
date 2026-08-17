/**
 * Sidecar LUT for mixer/cable/region colorIndex.
 *
 * Official Audiotool RGB is unpublished. The contract is that a given index
 * always maps to the same hue, so `strange desktop patching`'s 17-color
 * carnival stays a carnival and Que pt2's single index stays single.
 *
 * `SEED_HUES` below is the hue identity — index 0 is red-orange, 8 is blue,
 * 40 is violet, and that never moves. What the seed table was bad at is
 * *separation*: every entry sat in one narrow chroma and lightness band, so
 * five mixer strips on one cover turned to mush at any size. So hue is taken
 * from the seed and lightness/chroma are rebuilt per tier:
 *
 * - 0–15  deep register  (dark ground jewels)
 * - 16–31 mid register
 * - 32–41 light register
 *
 * Earth entries (brown, khaki, sage — 14/15, 29–31) keep their low chroma on
 * purpose; that muted quality is their identity, not a defect.
 */
import { hexToOklch, oklchToHex } from "./oklch.js";

/**
 * Hue identity per index. Do not reorder — this is the semantic key.
 * Exported so the color audit can compare the seed band against the built LUT.
 */
export const SEED_HUES: readonly string[] = [
  "#c45c4a",
  "#d4783a",
  "#e0a030",
  "#c9b44a",
  "#7a9a3c",
  "#3d8a5a",
  "#2f8a7a",
  "#2f7a8a",
  "#3a6ea8",
  "#4a58b0",
  "#6a4aa8",
  "#8a3a90",
  "#b03a6a",
  "#c44858",
  "#a86a48",
  "#8a7050",
  "#e07050",
  "#e89840",
  "#d4c060",
  "#88b050",
  "#48a070",
  "#38a090",
  "#3898a8",
  "#5080c0",
  "#6868c0",
  "#8858b8",
  "#a84898",
  "#c05078",
  "#d06060",
  "#b87848",
  "#988058",
  "#708070",
  "#f0a070",
  "#f0c070",
  "#e8d888",
  "#a8c878",
  "#70c0a0",
  "#60c0c8",
  "#70a8e0",
  "#8890e0",
  "#b080d8",
  "#d070b0",
];

const TIER_BOUNDS = [16, 32, SEED_HUES.length] as const;
/** Register centers in OKLab L. Wide enough that a tier reads as a tier. */
const TIER_L = [0.505, 0.665, 0.825] as const;
/** Chroma floor per tier so no saturated entry stays washed out. */
const TIER_C_FLOOR = [0.112, 0.126, 0.102] as const;
const CHROMA_GAIN = 1.9;
const EARTH_GAIN = 1.32;
const CHROMA_CAP = 0.195;
/** How much of a hue's natural lightness survives the tier flattening. */
const L_KEEP = 0.42;
/**
 * Neighbouring hues on a smooth wheel are only ~0.057 apart in OKLab, which is
 * barely a step. Alternating lightness inside a tier guarantees separation
 * between consecutive indices no matter how close their hues are.
 */
const L_ZIGZAG = 0.045;

function tierOf(index: number): 0 | 1 | 2 {
  if (index < TIER_BOUNDS[0]) return 0;
  if (index < TIER_BOUNDS[1]) return 1;
  return 2;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const LUT: readonly string[] = (() => {
  const seeds = SEED_HUES.map((hex) => hexToOklch(hex));
  const tiers = SEED_HUES.map((_, i) => tierOf(i));
  const stats = [0, 1, 2].map((t) => {
    const inTier = seeds.filter((_, i) => tiers[i] === t);
    return {
      meanL: inTier.reduce((s, x) => s + x.l, 0) / Math.max(1, inTier.length),
      medianC: median(inTier.map((x) => x.c)),
    };
  });
  return seeds.map((seed, i) => {
    const t = tiers[i];
    const { meanL, medianC } = stats[t];
    const earth = seed.c < medianC * 0.82;
    const zig = (i % 2 === 0 ? 1 : -1) * L_ZIGZAG;
    const l = TIER_L[t] + (seed.l - meanL) * L_KEEP + zig;
    const boosted = seed.c * (earth ? EARTH_GAIN : CHROMA_GAIN);
    const c = earth
      ? Math.min(boosted, CHROMA_CAP * 0.7)
      : Math.min(Math.max(boosted, TIER_C_FLOOR[t]), CHROMA_CAP);
    return oklchToHex(Math.max(0.08, Math.min(0.94, l)), c, seed.h);
  });
})();

/** Documented default for a null / missing index. Neutral on purpose. */
export const DEFAULT_GRAY = "#8a8680";

export function colorForIndex(index: number | null | undefined): string {
  if (index === null || index === undefined || !Number.isFinite(index)) return DEFAULT_GRAY;
  const i = Math.trunc(index);
  if (i < 0) return DEFAULT_GRAY;
  return LUT[i % LUT.length] ?? DEFAULT_GRAY;
}

/** Hue angle for an index, for tinting a ground without faking a swatch. */
export function hueForIndex(index: number | null | undefined): number | null {
  if (index === null || index === undefined || !Number.isFinite(index)) return null;
  const i = Math.trunc(index);
  if (i < 0) return null;
  const hex = LUT[i % LUT.length];
  return hex ? hexToOklch(hex).h : null;
}

export function paletteSize(): number {
  return LUT.length;
}

/** The built swatches, for audits and self-tests. */
export function paletteEntries(): readonly string[] {
  return LUT;
}

export function withAlpha(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  const n = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
