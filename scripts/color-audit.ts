/**
 * Measures color variation across the rendered set.
 *
 * Two numbers matter and both used to be near zero:
 *
 * - "across projects": for one mode+variant, how far apart are four different
 *   documents? Grounds used to be hex constants keyed only by variant, so this
 *   was exactly 0 for the field color.
 * - "within 2x2": for one project, how far apart are a mode's four tiles?
 *   Setup's four printings were four dark browns in a 3-point luminance band.
 *
 * Distances are OKLab; ~0.02 is a just-noticeable step, 0.10 is obvious,
 * 0.25+ reads as a different color world.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractProject, type EntityDump } from "../src/lib/viz/extract.ts";
import { MODES } from "../src/lib/viz/modes.ts";
import { renderMode } from "../src/lib/viz/render.ts";
import { colorDistance, hexToOklch, hueDistance } from "../src/lib/viz/oklch.ts";
import { SEED_HUES, paletteEntries } from "../src/lib/viz/palette.ts";
import type { VizProject } from "../src/lib/viz/types.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const FIXTURES = [
  { id: "404f019d-6d9f-41ec-bd04-dd0ce4243dbb", label: "Que pt2" },
  { id: "40508dda-e844-48fd-be82-fd08ab78a5ad", label: "Wave the Shape" },
  { id: "1f958234-d3ab-5fb9-a023-808389406bcd", label: "Beast Within" },
  { id: "1eeb0954-d4f3-5288-8c3c-6c7786445808", label: "The Block" },
];

async function load(id: string): Promise<VizProject> {
  const meta = JSON.parse(await readFile(path.join(root, "dumps", id, "meta.json"), "utf8")) as {
    displayName: string;
    tags?: string[];
    genreName?: string;
  };
  const entities = JSON.parse(
    await readFile(path.join(root, "dumps", id, "entities.json"), "utf8")
  ) as EntityDump[];
  return extractProject(id, meta.displayName, entities, {
    tags: meta.tags,
    genreName: meta.genreName,
  });
}

/** The full-bleed background rect is always the first 900x900 fill. */
function paperOf(svg: string): string {
  const m = svg.match(/<rect width="900" height="900" fill="(#[0-9a-fA-F]{3,8})"/);
  return m?.[1] ?? "#000000";
}

function colorsOf(svg: string): string[] {
  const out = new Set<string>();
  for (const m of svg.matchAll(/(?:fill|stroke|stop-color)="(#[0-9a-fA-F]{6})"/g)) {
    out.add(m[1].toLowerCase());
  }
  for (const m of svg.matchAll(/rgba\((\d+),(\d+),(\d+),/g)) {
    const hex = `#${[m[1], m[2], m[3]]
      .map((v) => Number(v).toString(16).padStart(2, "0"))
      .join("")}`;
    out.add(hex);
  }
  return [...out];
}

function meanPairwise(colors: string[]): number {
  if (colors.length < 2) return 0;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      sum += colorDistance(colors[i], colors[j]);
      n += 1;
    }
  }
  return n ? sum / n : 0;
}

/** Distinct hue families with enough chroma to actually read as a color. */
function hueFamilies(colors: string[]): number {
  const hues = colors
    .map((c) => hexToOklch(c))
    .filter((t) => t.c > 0.035 && t.l > 0.06 && t.l < 0.97)
    .map((t) => t.h);
  const picked: number[] = [];
  for (const h of hues) {
    if (!picked.some((p) => hueDistance(p, h) < 26)) picked.push(h);
  }
  return picked.length;
}

function lightnessRange(colors: string[]): number {
  const ls = colors.map((c) => hexToOklch(c).l);
  if (ls.length === 0) return 0;
  return Math.max(...ls) - Math.min(...ls);
}

const projects = await Promise.all(FIXTURES.map((f) => load(f.id)));

type Row = {
  mode: string;
  acrossProjects: number;
  within2x2: number;
  papers: number;
  hues: number;
  lRange: number;
};

const rows: Row[] = [];
let worstAcross = { mode: "", variant: "", value: Number.POSITIVE_INFINITY };
let worstWithin = { mode: "", project: "", value: Number.POSITIVE_INFINITY };

for (const mode of MODES) {
  const plates = projects.map((p) => renderMode(p, mode.id));
  const variantIds = plates[0].map((v) => v.variantId);

  const acrossPerVariant = variantIds.map((variantId, vi) => {
    const papers = plates.map((set) => paperOf(set[vi].svg));
    const full = plates.map((set) => colorsOf(set[vi].svg));
    const paperSpread = meanPairwise(papers);
    // Compare whole palettes too, not just the field.
    const paletteSpread = meanPairwise(full.map((c) => dominant(c)));
    const value = (paperSpread + paletteSpread) / 2;
    if (value < worstAcross.value) worstAcross = { mode: mode.id, variant: variantId, value };
    return value;
  });

  const withinPerProject = plates.map((set, pi) => {
    const papers = set.map((v) => paperOf(v.svg));
    const value = meanPairwise(papers);
    if (value < worstWithin.value) {
      worstWithin = { mode: mode.id, project: FIXTURES[pi].label, value };
    }
    return value;
  });

  const allColors = plates.flat().map((v) => colorsOf(v.svg));
  const distinctPapers = new Set(plates.flat().map((v) => paperOf(v.svg))).size;

  rows.push({
    mode: mode.id,
    acrossProjects: avg(acrossPerVariant),
    within2x2: avg(withinPerProject),
    papers: distinctPapers,
    hues: avg(allColors.map(hueFamilies)),
    lRange: avg(allColors.map(lightnessRange)),
  });
}

/** Most saturated color in a cover — the one a viewer reads as "the color". */
function dominant(colors: string[]): string {
  let best = colors[0] ?? "#000000";
  let bestC = -1;
  for (const c of colors) {
    const t = hexToOklch(c);
    const score = t.c * (t.l > 0.08 && t.l < 0.96 ? 1 : 0.3);
    if (score > bestC) {
      bestC = score;
      best = c;
    }
  }
  return best;
}

function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

function num(v: number, n = 3): string {
  return v.toFixed(n).padStart(6);
}

console.log("");
console.log(`${pad("mode", 14)} across  within  papers  hues  Lrange`);
console.log("-".repeat(52));
for (const r of rows) {
  console.log(
    `${pad(r.mode, 14)}${num(r.acrossProjects)}  ${num(r.within2x2)}  ${String(r.papers).padStart(6)}  ${r.hues.toFixed(1).padStart(4)}  ${num(r.lRange)}`
  );
}
console.log("-".repeat(52));
console.log(
  `${pad("mean", 14)}${num(avg(rows.map((r) => r.acrossProjects)))}  ${num(avg(rows.map((r) => r.within2x2)))}  ${String(
    new Set(
      projects.flatMap((p) => MODES.flatMap((m) => renderMode(p, m.id).map((v) => paperOf(v.svg))))
    ).size
  ).padStart(6)}  ${avg(rows.map((r) => r.hues)).toFixed(1).padStart(4)}  ${num(avg(rows.map((r) => r.lRange)))}`
);
console.log("");
console.log(
  `weakest across-project: ${worstAcross.mode}/${worstAcross.variant} = ${worstAcross.value.toFixed(4)}`
);
console.log(
  `weakest within-2x2:     ${worstWithin.mode} on ${worstWithin.project} = ${worstWithin.value.toFixed(4)}`
);

/**
 * The other half of the problem: swatches inside one cover. Five mixer strips
 * have to stay telling apart, which needs neighbouring LUT entries to be
 * further than a just-noticeable step from each other.
 */
function lutReport(label: string, table: readonly string[]): void {
  const adjacent: number[] = [];
  for (let i = 1; i < table.length; i++) adjacent.push(colorDistance(table[i - 1], table[i]));
  const tones = table.map((hex) => hexToOklch(hex));
  const ls = tones.map((t) => t.l);
  const cs = tones.map((t) => t.c);
  const mushy = adjacent.filter((d) => d < 0.06).length;
  console.log(
    `${pad(label, 10)} neighbour Δ min ${Math.min(...adjacent).toFixed(3)} mean ${avg(adjacent).toFixed(3)}` +
      `  chroma ${avg(cs).toFixed(3)}  L ${Math.min(...ls).toFixed(2)}–${Math.max(...ls).toFixed(2)}` +
      `  pairs under 0.06: ${mushy}`
  );
}

console.log("");
console.log("colorIndex LUT separation");
lutReport("seed", SEED_HUES);
lutReport("built", paletteEntries());
console.log("");
