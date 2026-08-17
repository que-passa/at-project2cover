import { COVER, mix, wrapCover, type CoverGround } from "./cover.js";
import { deriveGround, type GroundRecipe } from "./ground.js";
import { clamp } from "./abstract.js";
import { contentEndTicks, formOf, placedNotes, type FormPrint } from "./fingerprint.js";
import type { VizProject } from "./types.js";

type Density = "band" | "stack" | "blanket" | "warp";

type PrintingSpec = {
  density: Density;
  recipe: GroundRecipe;
};

/** A spec with its ground resolved for one project. */
type Printing = {
  density: Density;
  ground: CoverGround;
};

type Cell = { col: number; row: number; dye: string; weight: number };

type Cloth = {
  cells: Cell[];
  cols: number;
  rows: number;
  yarns: string[];
  groups: { start: number; width: number; dye: string; weight: number }[];
  selvedge: { width: number; stripes: string[] };
  undulate: number;
  fill: number;
};

const PRINTINGS: Record<string, PrintingSpec> = {
  /** A saturated mid field, not a pale one — the card stock is the color. */
  punch: {
    density: "band",
    recipe: {
      paperL: 0.78,
      paperC: 0.105,
      inkL: 0.1,
      inkC: 0.03,
      flare: "counter",
      flareL: 0.5,
      flareC: 0.19,
      mist: 0.26,
      finish: { grain: 0.08, grainScale: 0.9, vignette: 0.06 },
    },
  },
  albers: {
    density: "stack",
    recipe: {
      paperL: 0.15,
      paperC: 0.062,
      inkL: 0.88,
      inkC: 0.06,
      flare: "warm",
      flareL: 0.72,
      flareC: 0.18,
      mist: 0.32,
      finish: { grain: 0.045, grainScale: 1.1, vignette: 0.12 },
    },
  },
  festival: {
    density: "blanket",
    recipe: {
      paperL: 0.9,
      paperC: 0.028,
      inkL: 0.14,
      inkC: 0.03,
      flare: "counter",
      flareL: 0.52,
      flareC: 0.19,
      mist: 0.34,
      finish: { grain: 0.09, grainScale: 0.7, vignette: 0.05 },
    },
  },
  stripe: {
    density: "warp",
    recipe: {
      paperL: 0.12,
      paperC: 0.055,
      hue: 26,
      inkL: 0.86,
      inkC: 0.07,
      flare: "complement",
      flareL: 0.66,
      flareC: 0.18,
      mist: 0.3,
      finish: { grain: 0.07, grainScale: 0.8, vignette: 0.14 },
    },
  },
};

export function renderJacquard(project: VizProject, variantId: string): string {
  const spec = PRINTINGS[variantId] ?? PRINTINGS.punch;
  const ground = deriveGround(project, spec.recipe, variantId);
  const printing: Printing = { density: spec.density, ground };
  const form = formOf(project);
  const cloth = planCloth(project, form, ground);

  let body = "";
  if (printing.density === "warp") body += warpField(cloth, ground);
  else if (printing.density === "stack") body += albersStack(cloth, ground);
  else if (printing.density === "band") body += punchCard(cloth, ground);
  else body += festivalBlanket(cloth, ground);

  body += selvedge(cloth, ground);
  return wrapCover(body, ground, { id: `jq-${variantId}`, state: clothState(form) });
}

function clothState(form: FormPrint): string {
  if (form.patternCells > 0 && form.notesPerBar > 4) return "pattern-onset";
  if (form.patternCells > 0) return "pattern";
  if (form.notesPerBar > 0) return "onset-belt";
  if (form.regions > 0) return "region-linen";
  return "open-linen";
}

function hueYarns(ground: CoverGround, n: number): string[] {
  const count = Math.max(3, n);
  return Array.from({ length: count }, (_, i) => {
    const t = count <= 1 ? 0.5 : i / (count - 1);
    return mix(ground.mist, ground.ink, 0.2 + t * 0.8);
  });
}

function planCloth(project: VizProject, form: FormPrint, ground: CoverGround): Cloth {
  const yarns = hueYarns(ground, 8);
  const yarn = yarns[Math.floor(yarns.length * 0.65)] ?? ground.ink;
  const fromPattern = patternCells(project, yarns, yarn);
  const fromNotes = noteCells(project, form, yarns, yarn);
  const fromRegions = regionCells(project, form, yarns, yarn);
  const fromDevices = deviceCells(project, form, yarns, yarn);

  let cells: Cell[] = [];
  let cols = 16;
  let rows = 8;
  if (fromPattern.cells.length) {
    cells = fromPattern.cells;
    cols = fromPattern.cols;
    rows = fromPattern.rows;
    if (fromNotes.cells.length && form.patternCells < 80) {
      cells = mergeCells(cells, fromNotes.cells, cols, rows);
      cols = Math.max(cols, fromNotes.cols);
      rows = Math.max(rows, fromNotes.rows);
    }
  } else if (fromNotes.cells.length) {
    cells = fromNotes.cells;
    cols = fromNotes.cols;
    rows = fromNotes.rows;
  } else if (fromRegions.cells.length) {
    cells = fromRegions.cells;
    cols = fromRegions.cols;
    rows = fromRegions.rows;
  } else {
    cells = fromDevices.cells;
    cols = fromDevices.cols;
    rows = fromDevices.rows;
  }

  if (form.patternBanks > 1 && form.patternCells === 0) {
    const bankRows = Math.min(12, form.patternBanks);
    for (let r = 0; r < bankRows; r++) {
      const col = (r * 3 + (form.patternBanks % 5)) % cols;
      cells.push({
        col,
        row: r % rows,
        dye: yarns[r % yarns.length] ?? yarn,
        weight: 0.35 + (r % 3) * 0.1,
      });
    }
  }

  const groups = warpGroups(cells, cols, yarns, yarn, form);
  const stripeN = clamp(form.cables || 2, 2, 8);
  const stripes = Array.from({ length: stripeN }, (_, i) =>
    i === stripeN - 1 ? ground.flare : yarns[i % yarns.length] ?? ground.ink
  );
  return {
    cells,
    cols,
    rows,
    yarns,
    groups,
    selvedge: {
      width: clamp(6 + form.cables * 0.55, 8, 52),
      stripes,
    },
    undulate: form.shaperWobble,
    fill: cells.length / Math.max(1, cols * rows),
  };
}

function patternCells(project: VizProject, yarns: string[], yarn: string): { cells: Cell[]; cols: number; rows: number } {
  const mine = project.patterns;
  if (!mine.length) return { cells: [], cols: 0, rows: 0 };
  const machines = [...new Set(mine.map((c) => c.machineId))];
  const maxCol = Math.max(8, ...mine.map((c) => c.col + 1));
  const maxRow = Math.max(1, ...mine.map((c) => c.row + 1));
  const slots = [...new Set(mine.map((c) => c.slot))];
  const useSlots = machines.length === 1 && slots.length > 1 && maxRow <= 4;
  const rows = useSlots ? Math.min(24, slots.length) : maxRow;
  const slotRank = new Map(slots.map((s, i) => [s, i]));
  const dens = new Map<string, number>();
  for (const c of mine) {
    const row = useSlots ? (slotRank.get(c.slot) ?? 0) % rows : c.row;
    const key = `${c.col}:${row}`;
    dens.set(key, (dens.get(key) ?? 0) + 1);
  }
  const maxD = Math.max(1, ...dens.values());
  const cells: Cell[] = [];
  for (const [key, n] of dens) {
    const [col, row] = key.split(":").map(Number);
    cells.push({
      col,
      row,
      dye: yarns[(row + col) % yarns.length] ?? yarn,
      weight: n / maxD,
    });
  }
  return { cells, cols: maxCol, rows };
}

function noteCells(project: VizProject, form: FormPrint, yarns: string[], yarn: string): { cells: Cell[]; cols: number; rows: number } {
  const notes = placedNotes(project);
  if (!notes.length) return { cells: [], cols: 0, rows: 0 };
  const cols = clamp(Math.round(form.bars / (form.notesPerBar > 20 ? 2 : form.bars > 80 ? 3 : 2)), 16, 56);
  const rows = clamp(form.pitchSpan > 0 ? Math.round(form.pitchSpan / 5) : 8, 6, 20);
  const t0 = Math.min(...notes.map((n) => n.absTicks));
  const t1 = contentEndTicks(project);
  const dens = new Map<string, number>();
  for (const n of notes) {
    const col = Math.min(cols - 1, Math.floor(((n.absTicks - t0) / (t1 - t0 || 1)) * cols));
    const row = Math.min(rows - 1, Math.floor(((n.pitch - form.pitchMin) / (form.pitchSpan || 1)) * rows));
    const key = `${col}:${row}`;
    dens.set(key, (dens.get(key) ?? 0) + 1);
  }
  const maxD = Math.max(1, ...dens.values());
  const cells: Cell[] = [];
  for (const [key, n] of dens) {
    const [col, row] = key.split(":").map(Number);
    cells.push({
      col,
      row,
      dye: yarns[row % yarns.length] ?? yarn,
      weight: Math.min(1, n / maxD),
    });
  }
  return { cells, cols, rows };
}

function regionCells(project: VizProject, form: FormPrint, yarns: string[], yarn: string): { cells: Cell[]; cols: number; rows: number } {
  const regions = form.playableRegions;
  if (!regions.length) return { cells: [], cols: 0, rows: 0 };
  const cols = clamp(Math.round(form.bars / 4), 8, 32);
  const rows = clamp(project.tracks.length || regions.length, 2, 10);
  const t0 = Math.min(...regions.map((r) => r.positionTicks));
  const t1 = contentEndTicks(project);
  const trackIdx = new Map(project.tracks.map((t, i) => [t.id, i % rows]));
  const cells: Cell[] = [];
  regions.forEach((r, i) => {
    const c0 = Math.min(cols - 1, Math.floor(((r.positionTicks - t0) / (t1 - t0 || 1)) * cols));
    const c1 = Math.min(cols, Math.ceil(((r.positionTicks + r.durationTicks - t0) / (t1 - t0 || 1)) * cols));
    const row = trackIdx.get(r.trackId) ?? i % rows;
    const dye = yarns[i % yarns.length] ?? yarn;
    for (let col = c0; col < Math.max(c0 + 1, c1); col++) {
      cells.push({ col, row, dye, weight: 0.7 });
    }
  });
  return { cells, cols, rows };
}

function deviceCells(project: VizProject, form: FormPrint, yarns: string[], yarn: string): { cells: Cell[]; cols: number; rows: number } {
  const cols = clamp(6 + form.cables, 8, 16);
  const rows = clamp(form.devices + 1, 2, 6);
  const cells: Cell[] = [];
  project.devices.forEach((d, i) => {
    const col = Math.round((i / Math.max(1, project.devices.length - 1)) * (cols - 3)) + 1;
    cells.push({ col, row: i % rows, dye: yarns[i % yarns.length] ?? yarn, weight: 0.85 });
    cells.push({ col: (col + 2) % cols, row: (i + 1) % rows, dye: yarns[(i + 1) % yarns.length] ?? yarn, weight: 0.4 });
  });
  if (!cells.length) {
    for (let c = 0; c < cols; c += 3) cells.push({ col: c, row: 0, dye: yarn, weight: 0.25 });
  }
  return { cells, cols, rows };
}

function mergeCells(a: Cell[], b: Cell[], cols: number, rows: number): Cell[] {
  const map = new Map<string, Cell>();
  for (const c of a) map.set(`${c.col}:${c.row}`, c);
  for (const c of b) {
    const key = `${c.col % cols}:${c.row % rows}`;
    if (!map.has(key)) map.set(key, { ...c, col: c.col % cols, row: c.row % rows, weight: c.weight * 0.7 });
  }
  return [...map.values()];
}

function warpGroups(cells: Cell[], cols: number, yarns: string[], yarn: string, form: FormPrint): Cloth["groups"] {
  const n = clamp(form.yarns.length || Math.round(form.pitchSpan / 8) || form.devices, 4, 14);
  const gw = cols / n;
  const groups: Cloth["groups"] = [];
  for (let g = 0; g < n; g++) {
    const c0 = Math.floor(g * gw);
    const c1 = Math.floor((g + 1) * gw);
    const mine = cells.filter((c) => c.col >= c0 && c.col < c1);
    const weight = mine.reduce((s, c) => s + c.weight, 0) / Math.max(1, c1 - c0);
    groups.push({
      start: g,
      width: n,
      dye: yarns[g % yarns.length] ?? yarn,
      weight: weight + form.timeBins[g % form.timeBins.length] * 0.35,
    });
  }
  return groups;
}

function punchCard(cloth: Cloth, ground: CoverGround): string {
  let out = `<rect width="${COVER}" height="${COVER}" fill="${ground.paper}"/>`;
  if (cloth.rows <= 2 && cloth.fill >= 0.35) {
    out += `<rect x="${cloth.selvedge.width}" y="${COVER * 0.22}" width="${COVER - cloth.selvedge.width * 2}" height="${COVER * 0.38}" fill="${ground.ink}"/>`;
    out += `<rect x="${COVER * 0.22}" y="0" width="28" height="${COVER}" fill="${ground.flare}"/>`;
    return out;
  }
  const inset = cloth.cols >= 24 ? 3 : 8;
  const cw = COVER / cloth.cols;
  const rh = COVER / cloth.rows;
  const grid = new Map(cloth.cells.map((c) => [`${c.col}:${c.row}`, c]));
  const hero = cloth.cells.reduce((h, c) => (c.weight > h.weight ? c : h), cloth.cells[0] ?? { col: 0, row: 0, dye: ground.ink, weight: 0 });
  for (let r = 0; r < cloth.rows; r++) {
    for (let c = 0; c < cloth.cols; c++) {
      const cell = grid.get(`${c}:${r}`);
      if (!cell) continue;
      const pad = inset * (1.15 - cell.weight * 0.5);
      const dye = cell.col === hero.col && cell.row === hero.row ? ground.flare : mix(ground.mist, ground.ink, 0.35 + cell.weight * 0.65);
      out += `<rect x="${c * cw + pad}" y="${r * rh + pad}" width="${Math.max(2, cw - pad * 2)}" height="${Math.max(2, rh - pad * 2)}" rx="${cloth.rows < 10 ? 5 : 2}" fill="${dye}"/>`;
    }
  }
  return out;
}

function festivalBlanket(cloth: Cloth, ground: CoverGround): string {
  const bandH = COVER / Math.max(1, cloth.rows);
  const cw = COVER / cloth.cols;
  const grid = new Map(cloth.cells.map((c) => [`${c.col}:${c.row}`, c]));
  const hero = cloth.cells.reduce((h, c) => (c.weight > h.weight ? c : h), cloth.cells[0] ?? { col: 0, row: 0, dye: ground.ink, weight: 0 });
  let out = "";
  for (let r = 0; r < cloth.rows; r++) {
    const t = cloth.rows <= 1 ? 0.4 : r / (cloth.rows - 1);
    out += `<rect x="0" y="${r * bandH}" width="${COVER}" height="${bandH + 0.6}" fill="${mix(ground.paper, ground.mist, 0.25 + t * 0.45)}"/>`;
    for (let c = 0; c < cloth.cols; c++) {
      const cell = grid.get(`${c}:${r}`);
      if (!cell) continue;
      const dye = cell.col === hero.col && cell.row === hero.row ? ground.flare : mix(ground.mist, ground.ink, 0.4 + cell.weight * 0.6);
      out += `<rect x="${c * cw}" y="${r * bandH}" width="${cw + 0.4}" height="${bandH + 0.4}" fill="${dye}"/>`;
    }
  }
  return out;
}

function warpField(cloth: Cloth, ground: CoverGround): string {
  const groups = cloth.groups;
  const gw = COVER / Math.max(1, groups.length);
  let out = `<rect width="${COVER}" height="${COVER}" fill="${ground.paper}"/>`;
  let hero = 0;
  let heroN = -1;
  groups.forEach((g, i) => {
    if (g.weight > heroN) {
      heroN = g.weight;
      hero = i;
    }
  });
  groups.forEach((g, i) => {
    const wave = cloth.undulate !== 0 ? Math.sin(i * 0.9 + cloth.undulate) * 18 : 0;
    const w = i === hero ? gw * 1.45 : g.weight > 0.15 ? gw * (0.45 + Math.min(0.7, g.weight)) : gw * 0.16;
    const x = i * gw + (gw - Math.min(w, gw)) / 2;
    const t = groups.length <= 1 ? 0.5 : i / (groups.length - 1);
    const dye = i === hero ? ground.flare : mix(ground.mist, ground.ink, 0.25 + t * 0.75);
    out += `<rect x="${x}" y="${wave}" width="${Math.min(w, gw + 10)}" height="${COVER}" fill="${g.weight > 0.05 || i === hero ? dye : ground.mist}"/>`;
  });
  return out;
}

function albersStack(cloth: Cloth, ground: CoverGround): string {
  let out = `<rect width="${COVER}" height="${COVER}" fill="${ground.paper}"/>`;
  const n = Math.max(3, Math.min(6, cloth.rows || cloth.yarns.length));
  for (let i = 0; i < n; i++) {
    const inset = 22 + i * Math.min(58, 340 / n);
    const t = n <= 1 ? 0.5 : i / (n - 1);
    const dye = i === n - 1 ? ground.flare : mix(ground.mist, ground.ink, 0.15 + t * 0.7);
    const bias = Math.round((cloth.fill * 40 + cloth.groups[i % cloth.groups.length]?.weight * 18) % 28);
    const h = COVER - inset * 2;
    out += `<rect x="${inset + bias}" y="${inset}" width="${COVER - inset * 2 - bias}" height="${h}" fill="${dye}"/>`;
  }
  const inner = cloth.cells.slice(0, 80);
  if (inner.length && n >= 1) {
    const box = 22 + (n - 1) * Math.min(58, 340 / n) + 16;
    const cols = Math.min(cloth.cols, 16);
    const rows = Math.min(cloth.rows, 12);
    const cw = (COVER - box * 2) / cols;
    const rh = (COVER - box * 2) / rows;
    for (const c of inner) {
      if (c.col >= cols || c.row >= rows) continue;
      out += `<rect x="${box + c.col * cw}" y="${box + c.row * rh}" width="${cw}" height="${rh}" fill="${mix(ground.paper, ground.ink, 0.55 + c.weight * 0.35)}" opacity="0.55"/>`;
    }
  }
  return out;
}

function selvedge(cloth: Cloth, ground: CoverGround): string {
  const w = cloth.selvedge.width;
  const stripes = cloth.selvedge.stripes;
  const sw = w / Math.max(1, stripes.length);
  let out = "";
  stripes.forEach((dye, i) => {
    out += `<rect x="${i * sw}" y="0" width="${sw + 0.4}" height="${COVER}" fill="${dye}"/>`;
    out += `<rect x="${COVER - w + i * sw}" y="0" width="${sw + 0.4}" height="${COVER}" fill="${dye}"/>`;
  });
  out += `<rect x="0" y="${COVER - 6}" width="${COVER}" height="6" fill="${ground.flare}"/>`;
  return out;
}
