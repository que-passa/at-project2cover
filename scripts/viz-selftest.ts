/**
 * Checks tick math and that renderers read durationTicks, not playDuration.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HIDDEN_DUMP_NAMES, isHiddenDump, sortVisibleDumps } from "../src/lib/server/catalog.ts";
import { skyFigure } from "../src/lib/viz/constellation.ts";
import { extractProject, type EntityDump } from "../src/lib/viz/extract.ts";
import { MODES } from "../src/lib/viz/modes.ts";
import { colorDistance, hexToOklch, hueDistance, lightness } from "../src/lib/viz/oklch.ts";
import { SEED_HUES, paletteEntries } from "../src/lib/viz/palette.ts";
import { renderMode } from "../src/lib/viz/render.ts";
import { TICKS_PER_QUARTER, ticksPerBar, ticksToBars } from "../src/lib/viz/ticks.ts";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

const bar = ticksPerBar(4, 4);
assert(TICKS_PER_QUARTER === 3840, "quarter tick grain");
assert(bar === 15360, "4/4 bar is 15360 ticks");
assert(ticksToBars(245760, 4, 4) === 16, "245760 ticks is 16 bars, not 64");

const queId = "404f019d-6d9f-41ec-bd04-dd0ce4243dbb";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const queMeta = JSON.parse(await readFile(path.join(root, "dumps", queId, "meta.json"), "utf8")) as {
  displayName: string;
  playDuration: string;
};
const queEntities = JSON.parse(
  await readFile(path.join(root, "dumps", queId, "entities.json"), "utf8")
) as EntityDump[];
const que = extractProject(queId, queMeta.displayName, queEntities);

assert(queMeta.playDuration === "0s", "fixture still has lying playDuration");
assert(que.durationTicks === 1950720, "Que pt2 uses config.durationTicks");
assert(que.kind === "arrangement", "Que pt2 classifies as arrangement");
assert(que.facts.noteCount > 500, "notes extracted");
assert(que.regions.some((r) => r.displayName === "PT2"), "named regions present");

const gantt = renderMode(que, "timeline").find((p) => p.variantId === "gantt");
assert(gantt, "gantt view");
assert(!gantt.svg.includes("playDuration"), "timeline SVG must not mention playDuration");
assert(gantt.svg.includes('viewBox="0 0 900 900"'), "timeline is a square cover");
assert(!gantt.svg.includes("font-family"), "timeline cover has no readable chrome");
assert(gantt.svg.includes("<rect"), "timeline binds regions as color bars");

const fingerprints = JSON.parse(
  await readFile(path.join(root, "dumps", "fingerprints.json"), "utf8")
) as { id: string; name: string }[];
const catalog = sortVisibleDumps(fingerprints.filter((item) => !isHiddenDump(item)));
assert(
  catalog.every((item) => !HIDDEN_DUMP_NAMES.has(item.name)),
  "picker catalog hides Designer Setup, Shots, strange desktop patching, Piano Grain"
);
assert(
  catalog.map((item) => item.name).join(",") === "Que pt2,Wave the Shape,Beast Within,The Block",
  "remaining dumps stay in preferred order"
);

assert(MODES.length === 9, "rejected modes removed; remaining numbers kept");
assert(
  MODES.map((m) => m.number).join(",") === "1,2,3,5,6,7,8,11,12",
  "mode numbers stay 01–03, 05–08, 11–12"
);
assert(
  !MODES.some((m) => ["herbarium", "cymatic", "night", "umbra"].includes(m.id)),
  "herbarium, cymatic, night, umbra not in picker"
);
assert(
  MODES.every((m) => m.status === "ready" && m.variants.length === 4),
  "all modes live with four variants"
);
assert(
  ["beatfield", "skyline"].every((id) => MODES.some((m) => m.id === id)),
  "beatfield and skyline registered"
);

const cathedral = renderMode(que, "cathedral");
assert(cathedral.length === 4, "cathedral four printings");
assert(cathedral.every((p) => !p.svg.includes("playDuration")), "cathedral ignores playDuration");
assert(cathedral.every((p) => !p.svg.includes("font-family")), "cathedral cover has no readable chrome");
assert(cathedral.every((p) => p.svg.includes("<path")), "cathedral binds glass as paths");

const blockId = "1eeb0954-d4f3-5288-8c3c-6c7786445808";
const blockMeta = JSON.parse(await readFile(path.join(root, "dumps", blockId, "meta.json"), "utf8")) as {
  displayName: string;
};
const block = extractProject(
  blockId,
  blockMeta.displayName,
  JSON.parse(await readFile(path.join(root, "dumps", blockId, "entities.json"), "utf8")) as EntityDump[]
);
const island = renderMode(block, "island");
assert(island.length === 4, "island four printings");
assert(
  island.every((p) => p.svg.includes("<path") && !p.svg.includes('data-cover-state="open-water"')),
  "sparse island is a coast, not an empty sea"
);
assert(island.every((p) => !p.svg.includes("playDuration")), "island ignores playDuration");
assert(island.every((p) => !p.svg.includes("font-family")), "island cover has no readable chrome");

const plan = renderMode(block, "setup").find((p) => p.variantId === "plan");
assert(plan, "desktop plan");
assert(!plan.svg.includes("font-family"), "setup cover has no readable chrome");
assert(
  renderMode(block, "setup").every((p) => p.svg.includes('data-cover-state="sparse-jewel"')),
  "sparse setup uses inventory jewelry, not an empty rack"
);
assert(
  renderMode(block, "constellation").every((p) => p.svg.includes('data-cover-state="note-sky"')),
  "sparse uranometria is a night sky, not two dust specks"
);
assert(
  renderMode(que, "constellation").every((p) => !p.svg.includes("<ellipse")),
  "uranometria has no background ellipses"
);
assert(
  renderMode(block, "setup").find((p) => p.variantId === "plan")?.svg.includes("<rect"),
  "setup plan is a board of pads and columns, not a star field"
);
assert(
  renderMode(block, "cathedral").every((p) => p.svg.includes("<path") && !p.svg.includes("<text")),
  "sparse cathedral is still a rose"
);
const cloth = renderMode(que, "jacquard");
assert(cloth.length === 4, "jacquard has four printings");
const blockChapel = renderMode(block, "cathedral");
assert(blockChapel.length === 4, "block cathedral four printings");
assert(blockChapel.every((p) => !p.svg.includes("playDuration")), "block cathedral ignores playDuration");
assert(blockChapel.every((p) => !p.svg.includes("font-family")), "block cathedral has no readable chrome");

const calligram = renderMode(que, "calligram");
assert(calligram.length === 4, "calligram four printings");
assert(calligram.every((p) => !p.svg.includes("<text")), "calligram has no readable text");
assert(calligram.every((p) => !p.svg.includes("Soft Kick")), "calligram hides mixer names");
assert(calligram.every((p) => !p.svg.includes(que.name)), "calligram hides the title");
assert(calligram.every((p) => !p.svg.includes("Coming soon")), "calligram is a real plate");
assert(
  calligram.every((p) => p.svg.includes('data-cover-state="field"')),
  "Que calligram is a dense field"
);

const waveId = "40508dda-e844-48fd-be82-fd08ab78a5ad";
const waveMeta = JSON.parse(await readFile(path.join(root, "dumps", waveId, "meta.json"), "utf8")) as {
  displayName: string;
  tags?: string[];
};
const wave = extractProject(
  waveId,
  waveMeta.displayName,
  JSON.parse(await readFile(path.join(root, "dumps", waveId, "entities.json"), "utf8")) as EntityDump[],
  { tags: waveMeta.tags }
);
assert(wave.shapers.some((s) => s.kind === "waveshaper" && s.anchors.length >= 2), "Wave has waveshaper anchors");
const waveCalligram = renderMode(wave, "calligram");
assert(
  waveCalligram.every((p) => p.svg.includes('data-cover-state="curve"') && !p.svg.includes("<text")),
  "Wave calligram follows shaper curves"
);

const beastId = "1f958234-d3ab-5fb9-a023-808389406bcd";
const beastMeta = JSON.parse(await readFile(path.join(root, "dumps", beastId, "meta.json"), "utf8")) as {
  displayName: string;
  tags?: string[];
  genreName?: string;
};
const beast = extractProject(
  beastId,
  beastMeta.displayName,
  JSON.parse(await readFile(path.join(root, "dumps", beastId, "entities.json"), "utf8")) as EntityDump[],
  { tags: beastMeta.tags, genreName: beastMeta.genreName }
);
const beastCalligram = renderMode(beast, "calligram");
assert(
  beastCalligram.every((p) => p.svg.includes('data-cover-state="clusters"') && !p.svg.includes("<text")),
  "Beast calligram is sparse clusters"
);
const blockCalligram = renderMode(block, "calligram");
assert(
  blockCalligram.every((p) => p.svg.includes('data-cover-state="stone"') && !p.svg.includes("<text")),
  "Block calligram is a single stone"
);
const tagCount = (svg: string, tag: string) => (svg.match(new RegExp(`<${tag}\\b`, "g")) ?? []).length;
const queBreath = calligram.find((p) => p.variantId === "mallarme");
const blockBreath = blockCalligram.find((p) => p.variantId === "mallarme");
const beastBreath = beastCalligram.find((p) => p.variantId === "mallarme");
const queSlab = calligram.find((p) => p.variantId === "scher");
assert(queBreath && blockBreath && beastBreath && queSlab, "breath and slab printings present");
assert(
  tagCount(blockBreath.svg, "path") < tagCount(queBreath.svg, "path") * 0.35,
  "Block breath is much emptier than Que"
);
assert(
  tagCount(beastBreath.svg, "path") < tagCount(queBreath.svg, "path") * 0.55,
  "Beast breath is sparser than Que"
);
assert(queSlab.svg.includes("<rect"), "slab is a field of solid marks");
assert(!queSlab.svg.includes("<text"), "slab stays asemic");
assert(skyFigure(que) === "device-graph", "Que sky is the device graph");
assert(skyFigure(wave) === "note-cloud", "Wave sky is the note cloud");
assert(skyFigure(beast) === "region-hull", "Beast sky is the region hull");
assert(skyFigure(block) === "duration-ring", "Block sky is the duration ring");
assert(
  new Set([skyFigure(que), skyFigure(wave), skyFigure(beast), skyFigure(block)]).size === 4,
  "four dumps use four sky silhouettes"
);

const coverModes = ["timeline", "setup", "constellation", "cathedral", "island", "jacquard"];
for (const mode of MODES) {
  const plates = renderMode(que, mode.id);
  assert(plates.length === 4, `${mode.id} has four plates`);
  assert(plates.every((p) => p.svg.includes("<svg")), `${mode.id} emits SVG`);
  if (coverModes.includes(mode.id)) {
    assert(plates.every((p) => p.svg.includes('data-cover="1"')), `${mode.id} uses the cover substrate`);
    assert(plates.every((p) => !p.svg.includes("font-family")), `${mode.id} cover has no readable type`);
  }
}

for (const id of ["beatfield", "skyline"] as const) {
  const plates = renderMode(que, id);
  assert(plates.every((p) => !p.svg.includes("<text")), `${id} cover has no text`);
  assert(plates.every((p) => !p.svg.includes("Coming soon")), `${id} is a real plate`);
  const sparse = renderMode(block, id);
  assert(sparse.length === 4, `${id} sparse still has four printings`);
  assert(sparse.every((p) => p.svg.includes("<svg") && !p.svg.includes("<text")), `${id} sparse is still a cover`);
}

const skyline = renderMode(que, "skyline");
assert(skyline.length === 4, "skyline four printings");
assert(
  skyline.map((p) => p.variantId).join(",") === "lamps,overcast,dawn,etch",
  "skyline 2×2 leads with lamps / polar (youth HUD)"
);
assert(
  renderMode(que, "timeline").map((p) => p.variantId).join(",") === "heatmap,gantt,lookahead,chronicle",
  "timeline leads with thermal"
);
assert(
  renderMode(que, "constellation").map((p) => p.variantId).join(",") === "nasa,1820,1603,gilt",
  "uranometria leads with instrument sky"
);
assert(
  renderMode(que, "island").map((p) => p.variantId).join(",") === "usgs,walter,gill,ortelius",
  "island leads with relief / night map"
);
assert(
  renderMode(que, "calligram").map((p) => p.variantId).join(",") === "scher,saville,letterpress,mallarme",
  "calligram leads with slab / groove"
);
assert(
  renderMode(que, "beatfield").map((p) => p.variantId).join(",") === "phosphor,offset,solarized,lithograph",
  "beatfield leads with phosphor"
);
assert(
  renderMode(que, "cathedral").map((p) => p.variantId).join(",") === "chartres,blueprint,tiffany,print",
  "cathedral leads with jewel / prussian"
);
assert(skyline.every((p) => p.svg.includes("<path") && !p.svg.includes("<text")), "skyline is linework");
assert(skyline.every((p) => !p.svg.includes("font-family")), "skyline has no type");
assert(
  skyline.every((p) => p.svg.includes('data-cover-state="field"')),
  "Que onset lines is a dense field"
);
const blockSky = renderMode(block, "skyline");
assert(
  blockSky.every((p) => p.svg.includes('data-cover-state="rule"')),
  "Block onset lines is a sparse rule"
);
const beastSky = renderMode(beast, "skyline");
assert(
  beastSky.every((p) => p.svg.includes('data-cover-state="cluster"')),
  "Beast onset lines is a narrow cluster"
);
const waveSky = renderMode(wave, "skyline");
assert(
  waveSky.every((p) => p.svg.includes('data-cover-state="field"')),
  "Wave onset lines is a dense field"
);
assert(
  tagCount(blockSky[2].svg, "path") < tagCount(skyline[2].svg, "path") ||
    (blockSky[2].svg.match(/ M /g)?.length ?? 0) < (skyline[2].svg.match(/ M /g)?.length ?? 0) * 0.2,
  "Block etch is much emptier than Que etch"
);
assert(
  (waveSky[0].svg.match(/ L /g)?.length ?? 0) > (beastSky[0].svg.match(/ L /g)?.length ?? 0),
  "Wave contour is busier than Beast"
);

/**
 * Color contract. Grounds used to be hex constants keyed only by variant, so
 * every project rendered in a given printing got byte-identical paper, and
 * setup's four printings were four dark browns inside a 3-point luminance band.
 * These assertions keep both failures from coming back.
 *
 * Distances are OKLab: ~0.02 is a just-noticeable step at cover size.
 */
const fixtures = [
  { label: "Que pt2", project: que },
  { label: "Wave the Shape", project: wave },
  { label: "Beast Within", project: beast },
  { label: "The Block", project: block },
];

function paperOf(svg: string): string {
  const m = svg.match(/<rect width="900" height="900" fill="(#[0-9a-fA-F]{6})"/);
  assert(m, "every cover opens with a full-bleed paper rect");
  return m[1];
}

/** Every paint in a cover, whether written as hex or rgba(). */
function paintsOf(svg: string): string[] {
  const out = new Set<string>();
  for (const m of svg.matchAll(/(?:fill|stroke|stop-color)="(#[0-9a-fA-F]{6})"/g)) {
    out.add(m[1].toLowerCase());
  }
  for (const m of svg.matchAll(/rgba\((\d+),(\d+),(\d+),/g)) {
    out.add(
      `#${[m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, "0")).join("")}`
    );
  }
  return [...out];
}

function meanPairwise(colors: string[]): number {
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

for (const mode of MODES) {
  const sets = fixtures.map((f) => renderMode(f.project, mode.id));
  for (const [vi, variant] of sets[0].entries()) {
    const papers = sets.map((set) => paperOf(set[vi].svg));
    assert(
      new Set(papers).size === fixtures.length,
      `${mode.id}/${variant.variantId} gives each project its own ground`
    );
    assert(
      meanPairwise(papers) >= 0.02,
      `${mode.id}/${variant.variantId} grounds differ visibly across projects, not just numerically`
    );
  }
  for (const [pi, set] of sets.entries()) {
    assert(
      meanPairwise(set.map((v) => paperOf(v.svg))) >= 0.05,
      `${mode.id} 2x2 on ${fixtures[pi].label} is four covers, not one paper four times`
    );
  }
}

for (const { label, project } of fixtures) {
  for (const mode of MODES) {
    for (const plate of renderMode(project, mode.id)) {
      assert(
        !/NaN|undefined|#[0-9a-fA-F]{0,5}"/.test(plate.svg),
        `${mode.id}/${plate.variantId} on ${label} emits only valid colors`
      );
      const tones = paintsOf(plate.svg).map(lightness);
      assert(
        tones.length > 0 && Math.max(...tones) - Math.min(...tones) >= 0.3,
        `${mode.id}/${plate.variantId} on ${label} holds real figure-ground contrast`
      );
    }
  }
}

const lut = paletteEntries();
const adjacent = lut.slice(1).map((hex, i) => colorDistance(lut[i], hex));
assert(
  Math.min(...adjacent) >= 0.06,
  "neighbouring colorIndex swatches stay tellable apart, so five mixer strips do not mush"
);
assert(
  adjacent.reduce((s, d) => s + d, 0) / adjacent.length >= 0.11,
  "colorIndex swatches keep a wide separation on average"
);
const lutTones = lut.map((hex) => hexToOklch(hex));
assert(
  lutTones.reduce((s, t) => s + t.c, 0) / lutTones.length >= 0.13,
  "colorIndex swatches are saturated enough to survive a 22% wash into a ground"
);
assert(
  Math.max(...lutTones.map((t) => t.l)) - Math.min(...lutTones.map((t) => t.l)) >= 0.4,
  "colorIndex swatches span three lightness registers, not one band"
);
for (const [i, hex] of lut.entries()) {
  const seedHue = hexToOklch(SEED_HUES[i]).h;
  assert(
    hueDistance(hexToOklch(hex).h, seedHue) <= 3,
    `colorIndex ${i} keeps its seed hue — the index is a semantic key, not decoration`
  );
}

console.log("viz-selftest ok");
console.log(
  `  Que pt2: ${que.durationTicks} ticks = ${ticksToBars(que.durationTicks).toFixed(1)} bars, playDuration=${queMeta.playDuration}`
);
console.log(`  Catalog: ${catalog.map((item) => item.name).join(", ")}`);
console.log(`  Modes live: ${MODES.map((m) => m.id).join(", ")}`);
