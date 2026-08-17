import { wrapCover } from "./cover.js";
import { deriveGround, toneHex, type GroundRecipe } from "./ground.js";
import { withAlpha } from "./palette.js";
import { clamp, fmt, gravity, lerp } from "./abstract.js";
import { formOf, voicesOf, type Voice } from "./fingerprint.js";
import type { VizProject } from "./types.js";

type Plate = {
  blend: "multiply" | "screen" | "difference" | "normal";
  glow: boolean;
  offset: boolean;
  fillBands: boolean;
  ringScale: number;
  cap: number;
};

type PrintingSpec = Plate & { recipe: GroundRecipe };

/** A spec with its ink colors resolved for one project. */
type Printing = Plate & {
  paper: string;
  ink: string;
  flare: string;
  /** Third pass of a CMY misregister. */
  yellow: string;
};

const PRINTINGS: Record<string, PrintingSpec> = {
  lithograph: {
    blend: "multiply",
    glow: false,
    offset: false,
    fillBands: false,
    ringScale: 1,
    cap: 8,
    recipe: {
      paperL: 0.76,
      paperC: 0.06,
      inkL: 0.09,
      inkC: 0.03,
      flare: "counter",
      flareL: 0.52,
      flareC: 0.19,
      finish: { grain: 0.11, grainScale: 0.6, vignette: 0.07 },
    },
  },
  /** A CRT is green. Which green is the document's. */
  phosphor: {
    blend: "screen",
    glow: true,
    offset: false,
    fillBands: false,
    ringScale: 1.12,
    cap: 6,
    recipe: {
      paperL: 0.045,
      paperC: 0.02,
      inkL: 0.87,
      inkC: 0.2,
      inkBand: { center: 138, span: 46 },
      flare: "warm",
      flareL: 0.84,
      flareC: 0.18,
      finish: { grain: 0.025, grainScale: 1.35, vignette: 0.24 },
    },
  },
  /** Misregistered CMY: magenta plate, cyan plate, and the paper between. */
  offset: {
    blend: "screen",
    glow: false,
    offset: true,
    fillBands: false,
    ringScale: 0.92,
    cap: 5,
    recipe: {
      paperL: 0.055,
      paperC: 0.032,
      inkL: 0.62,
      inkC: 0.21,
      inkBand: { center: 8, span: 48 },
      flare: "cool",
      flareL: 0.79,
      flareC: 0.16,
      flareBand: { center: 205, span: 44 },
      finish: { grain: 0.05, grainScale: 1.15, vignette: 0.1 },
    },
  },
  /** Deep saturated field rather than another black, so the 2x2 separates. */
  solarized: {
    blend: "normal",
    glow: false,
    offset: false,
    fillBands: true,
    ringScale: 1.28,
    cap: 6,
    recipe: {
      paperL: 0.15,
      paperC: 0.085,
      inkL: 0.86,
      inkC: 0.19,
      flare: "complement",
      flareL: 0.64,
      flareC: 0.2,
      finish: { grain: 0.06, grainScale: 0.88, vignette: 0.16 },
    },
  },
};

export function renderBeatfield(project: VizProject, variantId: string): string {
  const spec = PRINTINGS[variantId] ?? PRINTINGS.phosphor;
  const g = deriveGround(project, spec.recipe, variantId);
  const printing: Printing = {
    ...spec,
    paper: g.paper,
    ink: g.ink,
    flare: g.flare,
    yellow: toneHex(project, 0.86, 0.18, { band: { center: 95, span: 40 } }),
  };
  const form = formOf(project);
  const voices = placeVoices(project, printing);
  const fid = `bf${variantId}`;

  let inner = "";
  const defs: string[] = [];
  if (printing.glow) {
    defs.push(`<filter id="${fid}-glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.1" result="b"/>
      <feMerge>
        <feMergeNode in="b"/>
        <feMergeNode in="b"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>`);
  }

  if (printing.offset) {
    for (const plate of offsetPlates(voices, printing)) {
      inner += `<g style="mix-blend-mode:${printing.blend}" transform="translate(${fmt(plate.dx)},${fmt(plate.dy)})">`;
      inner += drawVoices(plate.voices, printing);
      inner += `</g>`;
    }
  } else {
    const filter = printing.glow ? ` filter="url(#${fid}-glow)"` : "";
    inner += `<g style="mix-blend-mode:${printing.blend}"${filter}>`;
    inner += drawVoices(voices, printing);
    inner += `</g>`;
  }

  return wrapCover(inner, g, {
    id: fid,
    state: `${voices.length}v-${form.habit}`,
    defs: defs.join(""),
  });
}

function placeVoices(project: VizProject, printing: Printing): Voice[] {
  const raw = voicesOf(project, printing.cap);
  const g = gravity(project);
  const voices = raw.map((v, i) => ({
    ...v,
    spacing: v.spacing * printing.ringScale,
    color: variantColor(printing, i),
    rings: Math.round(v.rings * (printing.fillBands ? 0.55 : 1)),
  }));

  if (voices.length === 0) {
    return [
      {
        id: "empty",
        cx: lerp(280, 420, g.x),
        cy: lerp(300, 480, g.y),
        spacing: 72 * printing.ringScale,
        color: printing.ink,
        weight: 0.8,
        rings: 8,
        notes: 0,
      },
    ];
  }

  return voices.map((v) => ({
    ...v,
    cx: clamp(v.cx, 50, 850),
    cy: clamp(v.cy, 50, 850),
  }));
}

function variantColor(printing: Printing, i: number): string {
  if (printing.glow) return i % 2 === 0 ? printing.ink : printing.flare;
  if (printing.fillBands) return i === 0 ? printing.ink : printing.flare;
  if (i === 1) return printing.flare;
  return printing.ink;
}

function offsetPlates(voices: Voice[], printing: Printing): { dx: number; dy: number; voices: Voice[] }[] {
  const cmy = [printing.ink, printing.flare, printing.yellow];
  const shifts = [
    { dx: -16, dy: -10 },
    { dx: 18, dy: 6 },
    { dx: -6, dy: 16 },
  ];
  return cmy.map((color, i) => ({
    ...shifts[i],
    voices: voices.map((v, vi) => ({
      ...v,
      color,
      spacing: v.spacing * (1 + (i - 1) * 0.045),
      cx: v.cx + (vi % 2 === 0 ? i : -i),
    })),
  }));
}

function drawVoices(voices: Voice[], printing: Printing): string {
  let out = "";
  for (const v of voices) {
    out += printing.fillBands ? bandVoice(v) : strokeVoice(v, printing);
  }
  return out;
}

function strokeVoice(v: Voice, printing: Printing): string {
  let out = "";
  for (let i = 1; i <= v.rings; i++) {
    const r = i * v.spacing;
    const fade = 1 - i / (v.rings + 2);
    const sw = clamp(v.weight * (printing.glow ? 3.1 : printing.offset ? 2.4 : 2.2) * (0.9 + fade * 0.7), 1.6, 6.2);
    const op = printing.glow ? 0.62 + fade * 0.38 : printing.offset ? 0.55 + fade * 0.4 : 0.72 + fade * 0.28;
    const stroke = i === v.rings && !printing.offset ? printing.flare : v.color;
    out += `<circle cx="${fmt(v.cx)}" cy="${fmt(v.cy)}" r="${fmt(r)}" fill="none" stroke="${stroke}" stroke-width="${fmt(sw)}" opacity="${op.toFixed(3)}"/>`;
  }
  return out;
}

function bandVoice(v: Voice): string {
  let out = "";
  for (let i = 0; i < v.rings; i++) {
    if (i % 2 === 1) continue;
    const r0 = i * v.spacing;
    const r1 = (i + 1) * v.spacing;
    const op = 0.72 + (1 - i / v.rings) * 0.28;
    out += annulus(v.cx, v.cy, r0, r1, withAlpha(v.color, op));
  }
  return out;
}

function annulus(cx: number, cy: number, r0: number, r1: number, fill: string): string {
  const R = Math.max(r1, r0 + 0.8);
  const r = Math.max(0.2, Math.min(r0, R - 0.8));
  return `<path fill="${fill}" fill-rule="evenodd" d="M ${fmt(cx - R)} ${fmt(cy)} a ${fmt(R)} ${fmt(R)} 0 1 0 ${fmt(R * 2)} 0 a ${fmt(R)} ${fmt(R)} 0 1 0 ${fmt(-R * 2)} 0 M ${fmt(cx - r)} ${fmt(cy)} a ${fmt(r)} ${fmt(r)} 0 1 1 ${fmt(r * 2)} 0 a ${fmt(r)} ${fmt(r)} 0 1 1 ${fmt(-r * 2)} 0"/>`;
}
