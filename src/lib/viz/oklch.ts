/**
 * Perceptual color math (OKLab / OKLCH), dependency-free.
 *
 * Covers need controllable lightness and chroma: "make this ground darker but
 * keep the hue" and "separate these two swatches" are impossible to hold
 * steady in sRGB hex. Every palette decision in this repo goes through here.
 *
 * Gamut mapping reduces chroma until the color fits sRGB, so a requested
 * (L, C, H) never silently clips to a different hue.
 */

export type Oklch = { l: number; c: number; h: number };

const EPS = 1e-6;

function srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(v: number): number {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
}

function parseHex(hex: string): [number, number, number] {
  const raw = hex.replace("#", "").trim();
  const n = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  return [
    (Number.parseInt(n.slice(0, 2), 16) || 0) / 255,
    (Number.parseInt(n.slice(2, 4), 16) || 0) / 255,
    (Number.parseInt(n.slice(4, 6), 16) || 0) / 255,
  ];
}

function toHex(r: number, g: number, b: number): string {
  const ch = (v: number) => {
    const n = Math.max(0, Math.min(255, Math.round(v * 255)));
    return n.toString(16).padStart(2, "0");
  };
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}

/** Linear sRGB → OKLab. */
function linearToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

/** OKLab → linear sRGB. May land outside [0,1]; caller decides. */
function oklabToLinear(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function hexToOklab(hex: string): [number, number, number] {
  const [r, g, b] = parseHex(hex);
  return linearToOklab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));
}

export function hexToOklch(hex: string): Oklch {
  const [L, a, b] = hexToOklab(hex);
  const c = Math.hypot(a, b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

function inGamut(rgb: [number, number, number]): boolean {
  return rgb.every((v) => v >= -0.0008 && v <= 1.0008);
}

function oklabHexRaw(L: number, a: number, b: number): string {
  const [lr, lg, lb] = oklabToLinear(L, a, b);
  return toHex(linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb));
}

/**
 * OKLCH → hex, holding hue and lightness and giving up chroma when the
 * request leaves sRGB. Binary search keeps the result on the gamut boundary
 * instead of clipping channels (which shifts hue).
 */
export function oklchToHex(l: number, c: number, h: number): string {
  const L = Math.max(0, Math.min(1, l));
  const rad = (h * Math.PI) / 180;
  const ax = Math.cos(rad);
  const ay = Math.sin(rad);
  const at = (chroma: number) => oklabToLinear(L, ax * chroma, ay * chroma);
  if (inGamut(at(c))) return oklabHexRaw(L, ax * c, ay * c);
  let lo = 0;
  let hi = Math.max(c, EPS);
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(at(mid))) lo = mid;
    else hi = mid;
  }
  return oklabHexRaw(L, ax * lo, ay * lo);
}

export function oklch({ l, c, h }: Oklch): string {
  return oklchToHex(l, c, h);
}

/** Perceptual lightness 0..1. Cheaper to read than sRGB luma. */
export function lightness(hex: string): number {
  return hexToOklch(hex).l;
}

export function chroma(hex: string): number {
  return hexToOklch(hex).c;
}

export function hue(hex: string): number {
  return hexToOklch(hex).h;
}

/** Interpolate in OKLab so midpoints stay colorful instead of going muddy. */
export function mixOk(a: string, b: string, t: number): string {
  const k = Math.max(0, Math.min(1, t));
  const [al, aa, ab] = hexToOklab(a);
  const [bl, ba, bb] = hexToOklab(b);
  return oklabHexRaw(al + (bl - al) * k, aa + (ba - aa) * k, ab + (bb - ab) * k);
}

/** Move a color to a target lightness, keeping hue and chroma intent. */
export function withLightness(hex: string, l: number): string {
  const t = hexToOklch(hex);
  return oklchToHex(l, t.c, t.h);
}

export function withChroma(hex: string, c: number): string {
  const t = hexToOklch(hex);
  return oklchToHex(t.l, Math.max(0, c), t.h);
}

export function scaleChroma(hex: string, factor: number): string {
  const t = hexToOklch(hex);
  return oklchToHex(t.l, Math.max(0, t.c * factor), t.h);
}

export function rotateHue(hex: string, degrees: number): string {
  const t = hexToOklch(hex);
  return oklchToHex(t.l, t.c, norm360(t.h + degrees));
}

export function norm360(h: number): number {
  const x = h % 360;
  return x < 0 ? x + 360 : x;
}

/** Shortest angular distance between two hues, 0..180. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(norm360(a) - norm360(b)) % 360;
  return d > 180 ? 360 - d : d;
}

/** Circular mean of weighted hues. Returns null when weights vanish. */
export function meanHue(entries: { h: number; w: number }[]): number | null {
  let x = 0;
  let y = 0;
  for (const e of entries) {
    const rad = (e.h * Math.PI) / 180;
    x += Math.cos(rad) * e.w;
    y += Math.sin(rad) * e.w;
  }
  if (Math.hypot(x, y) < EPS) return null;
  return norm360((Math.atan2(y, x) * 180) / Math.PI);
}

/**
 * 0 when every hue agrees, 1 when they are spread around the wheel.
 * Tells a renderer whether the document is monochrome or a carnival.
 */
export function hueSpread(entries: { h: number; w: number }[]): number {
  let x = 0;
  let y = 0;
  let total = 0;
  for (const e of entries) {
    const rad = (e.h * Math.PI) / 180;
    x += Math.cos(rad) * e.w;
    y += Math.sin(rad) * e.w;
    total += e.w;
  }
  if (total < EPS) return 0;
  return Math.max(0, Math.min(1, 1 - Math.hypot(x, y) / total));
}

/** Perceptual distance in OKLab. ~0.02 is a just-noticeable step at cover size. */
export function colorDistance(a: string, b: string): number {
  const [al, aa, ab] = hexToOklab(a);
  const [bl, ba, bb] = hexToOklab(b);
  return Math.hypot(al - bl, aa - ba, ab - bb);
}

/**
 * Push `hex` away from `ground` until it clears `minDelta` lightness, moving
 * whichever direction has room. Keeps a swatch legible on any paper.
 */
export function separate(hex: string, ground: string, minDelta: number): string {
  const t = hexToOklch(hex);
  const g = lightness(ground);
  if (Math.abs(t.l - g) >= minDelta) return oklchToHex(t.l, t.c, t.h);
  const up = g + minDelta;
  const down = g - minDelta;
  const target = up <= 0.97 && (t.l >= g || down < 0.03) ? up : down;
  return oklchToHex(Math.max(0.02, Math.min(0.98, target)), t.c, t.h);
}
