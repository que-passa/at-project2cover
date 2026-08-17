import { COVER, hash01, mix, wrapCover, type CoverGround } from "./cover.js";
import { deriveGround, type GroundRecipe } from "./ground.js";
import { clamp, fmt, lerp, rng, seedOf } from "./abstract.js";
import {
  bloomInks,
  contentEndTicks,
  formOf,
  placedNotes,
  voicesOf,
  type FormPrint,
  type PlacedNote,
  type Voice as FpVoice,
} from "./fingerprint.js";
import { colorForIndex, withAlpha } from "./palette.js";
import type { VizProject, VizRegion, VizShaper } from "./types.js";

type School = "mallarme" | "scher" | "saville" | "letterpress";
type Posture = "stone" | "clusters" | "curve" | "field";
type PrintingSpec = { id: School; recipe: GroundRecipe };

/** A spec with its ground resolved for one project. */
type Printing = { id: School; ground: CoverGround };

const PRINTINGS: Record<string, PrintingSpec> = {
  mallarme: {
    id: "mallarme",
    recipe: {
      paperL: 0.87,
      paperC: 0.038,
      inkL: 0.09,
      inkC: 0.025,
      flare: "counter",
      flareL: 0.52,
      flareC: 0.19,
      mist: 0.28,
      finish: { grain: 0.075, grainScale: 0.95, vignette: 0.06 },
    },
  },
  /**
   * Brat-class anti-cover: one saturated field from the document hue, one
   * oversized asemic word mass. Imperfect grain, no second picture.
   */
  scher: {
    id: "scher",
    recipe: {
      paperL: 0.72,
      paperC: 0.22,
      inkL: 0.1,
      inkC: 0.025,
      flare: "counter",
      flareL: 0.42,
      flareC: 0.16,
      mist: 0.18,
      finish: { grain: 0.055, grainScale: 0.72, vignette: 0.03 },
    },
  },
  saville: {
    id: "saville",
    recipe: {
      paperL: 0.06,
      paperC: 0.03,
      inkL: 0.94,
      inkC: 0.028,
      flare: "warm",
      flareL: 0.72,
      flareC: 0.18,
      mist: 0.18,
      finish: { grain: 0.05, grainScale: 1.05, vignette: 0.2 },
    },
  },
  letterpress: {
    id: "letterpress",
    recipe: {
      paperL: 0.91,
      paperC: 0.014,
      inkL: 0.15,
      inkC: 0.035,
      hue: 140,
      flare: "counter",
      flareL: 0.5,
      flareC: 0.16,
      mist: 0.3,
      finish: { grain: 0.1, grainScale: 0.62, vignette: 0.05 },
    },
  },
};

type NoteMark = { x: number; y: number; vel: number; color: string };
type RegionMark = { x: number; y: number; w: number; h: number; color: string; notes: number; audio: boolean };
type Page = {
  posture: Posture;
  form: FormPrint;
  voices: FpVoice[];
  notes: NoteMark[];
  regions: RegionMark[];
  yarns: string[];
  waves: VizShaper[];
};

export function renderCalligram(project: VizProject, variantId: string): string {
  const spec = PRINTINGS[variantId] ?? PRINTINGS.scher;
  const printing: Printing = { id: spec.id, ground: deriveGround(project, spec.recipe, variantId) };
  const raw = pageOf(project);
  const page: Page = {
    ...raw,
    yarns: [
      mix(printing.ground.mist, printing.ground.ink, 0.25),
      mix(printing.ground.mist, printing.ground.ink, 0.55),
      printing.ground.ink,
      printing.ground.flare,
    ],
  };
  const rand = rng(seedOf(project, 8 + variantId.length * 11 + page.posture.length * 19 + page.voices.length * 3));
  let art = "";
  if (printing.id === "saville") art += saville(page, printing.ground, rand);
  else if (printing.id === "scher") art += scher(page, printing.ground, rand);
  else if (printing.id === "letterpress") art += letterpress(page, printing.ground, rand);
  else art += mallarme(page, printing.ground, rand);
  return wrapCover(art, printing.ground, { id: `cg${variantId}`, state: page.posture });
}

function pageOf(project: VizProject): Page {
  const form = formOf(project);
  const posture = postureOf(project, form);
  const cap = posture === "stone" ? 4 : posture === "clusters" ? 8 : posture === "curve" ? 8 : 16;
  const voices = voicesOf(project, cap);
  const t1 = Math.max(1, contentEndTicks(project));
  const placed = placedNotes(project);
  const t0 = placed.length ? Math.min(...placed.map((n) => n.absTicks)) : 0;
  const noteCap = posture === "stone" ? 0 : posture === "clusters" ? 80 : posture === "curve" ? 160 : 240;
  return {
    posture,
    form,
    voices,
    notes: sampleNotes(project, form, placed, t0, t1, noteCap),
    regions: regionMarks(project, form, t1),
    yarns: form.yarns.length ? form.yarns : bloomInks(project, 5),
    waves: project.shapers.filter((s) => s.kind === "waveshaper" && s.anchors.length >= 2),
  };
}

function postureOf(project: VizProject, form: FormPrint): Posture {
  if (form.waveshapers >= 2 || (form.waveshapers >= 1 && form.notesPerBar > 8)) return "curve";
  if (project.notes.length === 0 && form.regions <= 2) return "stone";
  if (project.notes.length < 220 && form.noteTracks <= 2) return "clusters";
  return "field";
}

function sampleNotes(
  project: VizProject,
  form: FormPrint,
  notes: PlacedNote[],
  t0: number,
  t1: number,
  cap: number
): NoteMark[] {
  if (!notes.length || cap <= 0) return [];
  const step = Math.max(1, Math.ceil(notes.length / cap));
  const yarns = form.yarns.length ? form.yarns : bloomInks(project, 4);
  const regionByCol = new Map(project.regions.map((r) => [r.collectionId ?? "", r]));
  const out: NoteMark[] = [];
  for (let i = 0; i < notes.length; i += step) {
    const n = notes[i];
    const region = regionByCol.get(n.collectionId);
    const ink = colorForIndex(region?.colorIndex);
    out.push({
      x: lerp(40, 860, (n.absTicks - t0) / (t1 - t0 || 1)),
      y: pitchY(n.pitch, form),
      vel: n.velocity,
      color: ink === "#8a8680" ? yarns[out.length % yarns.length] ?? "#8a4030" : ink,
    });
  }
  return out;
}

function pitchY(pitch: number, form: FormPrint): number {
  const t = (pitch - form.pitchMin) / (form.pitchSpan || 1);
  if (form.pitchSpan > 0 && form.pitchSpan < 24) {
    const band = 0.2 + form.pitchSpan / 70;
    return lerp(COVER * (0.5 - band / 2), COVER * (0.5 + band / 2), 1 - t);
  }
  return lerp(80, 820, 1 - t);
}

function regionMarks(project: VizProject, form: FormPrint, t1: number): RegionMark[] {
  const tracks = [...project.tracks].sort((a, b) => a.order - b.order);
  const trackY = new Map(tracks.map((t, i) => [t.id, tracks.length < 2 ? 0.5 : i / (tracks.length - 1)]));
  const inks = bloomInks(project, 8);
  const take = [...form.playableRegions].sort((a, b) => a.positionTicks - b.positionTicks).slice(0, 24);
  return take.map((r, i) => regionMark(r, t1, trackY.get(r.trackId) ?? 0.5, inks[i % inks.length] ?? "#8a4030"));
}

function regionMark(r: VizRegion, t1: number, lane: number, fallback: string): RegionMark {
  const raw = colorForIndex(r.colorIndex);
  const audio = r.kind === "audio";
  return {
    x: lerp(36, 860, r.positionTicks / t1),
    w: Math.max(audio ? 160 : 28, (r.durationTicks / t1) * 828),
    y: lerp(110, 760, lane),
    h: audio ? 240 : Math.max(32, 24 + Math.min(90, r.noteCount * 2.2)),
    color: raw === "#8a8680" ? fallback : raw,
    notes: r.noteCount,
    audio,
  };
}

function mallarme(page: Page, ground: CoverGround, rand: () => number): string {
  let out = "";
  if (page.posture === "field") {
    out += `<ellipse cx="${fmt(lerp(220, 680, page.form.pitchMean / 100))}" cy="${fmt(300)}" rx="420" ry="280" fill="${withAlpha(ground.mist, 0.28)}"/>`;
  }

  if (page.posture === "curve") {
    out += shaperInk(page, ground, 4.2, 0.88);
    const spine = mapShaper(page.waves[0]);
    page.voices.forEach((v, i) => {
      const p = alongSpine(spine, (i + 0.4) / Math.max(1, page.voices.length), 0);
      out += wordBlock(p.x - 36, p.y - 16, 80 + v.weight * 70, 24 + v.weight * 18, ground.ink, (hash01(v.id) - 0.5) * 8);
      out += stanza(p.x - 6, p.y + 18, v, ground.ink, 5 + (i % 3), rand);
    });
    page.notes.forEach((n, i) => {
      const p = alongSpine(spine, n.x / COVER, (n.y / COVER - 0.5) * 70);
      out += asemic(p.x, p.y, { weight: 0.2 + n.vel * 0.35, complexity: 3 + (i % 3), muted: false, seed: hash01(`n${i}`) }, ground.ink);
    });
    return out;
  }

  if (page.posture === "stone") {
    const slab = page.regions[0];
    const x = slab ? slab.x : 180;
    const y = slab ? slab.y - 40 : 320;
    const w = slab ? Math.min(640, slab.w) : 420;
    out += wordBlock(x, y, w, slab?.h ?? 180, ground.ink, -3);
    page.voices.forEach((v) => {
      out += asemic(v.cx, v.cy, { weight: 0.7, complexity: 5, muted: false, seed: hash01(v.id) }, mix(ground.ink, ground.flare, 0.2));
    });
    out += `<path d="M ${fmt(80)} ${fmt(760)} C ${fmt(240)} ${fmt(640)}, ${fmt(520)} ${fmt(700)}, ${fmt(820)} ${fmt(620)}" fill="none" stroke="${withAlpha(ground.ink, 0.18)}" stroke-width="1.2"/>`;
    return out;
  }

  if (page.posture === "clusters") {
    const islands = page.voices.length ? page.voices : page.regions.map((r, i) => voiceFromRegion(r, i));
    islands.forEach((v, i) => {
      out += inkMass(v.cx, v.cy, v, ground, 0.7 + (v.notes > 8 ? 0.25 : 0), rand);
      out += stanza(v.cx - 16, v.cy + 18, v, ground.ink, 3 + (i % 2), rand);
    });
    page.notes.forEach((n, i) => {
      out += asemic(n.x, n.y, { weight: 0.16 + n.vel * 0.2, complexity: 3, muted: false, seed: hash01(`b${i}`) }, ground.ink);
    });
    return out;
  }

  page.voices.forEach((v, i) => {
    const rot = -10 + hash01(v.id) * 16;
    out += wordBlock(v.cx - 30, v.cy - 22, 70 + v.weight * 140, 22 + v.weight * 36, i % 5 === 0 ? mix(ground.ink, ground.flare, 0.12) : ground.ink, rot);
    if (i < 8) out += inkMass(v.cx + 20, v.cy + 36, v, ground, 0.55 + (i === 0 ? 0.4 : 0), rand);
    out += stanza(v.cx - 8, v.cy + 28, v, ground.ink, 4 + Math.min(6, Math.round(v.notes / 80)), rand);
  });
  page.notes.forEach((n, i) => {
    out += asemic(n.x, n.y, { weight: 0.14 + n.vel * 0.28, complexity: 3 + (i % 4), muted: false, seed: hash01(`f${i}`) }, ground.ink);
  });
  if (page.form.cables > 8) {
    out += `<path d="M ${fmt(40)} ${fmt(860)} C ${fmt(260)} ${fmt(520)}, ${fmt(580)} ${fmt(180)}, ${fmt(880)} ${fmt(90)}" fill="none" stroke="${withAlpha(ground.ink, 0.18)}" stroke-width="1.3"/>`;
  }
  return out;
}

/**
 * Anti-cover slab: the field *is* the picture. Inventory shows as one word
 * mass (and at most a few secondary ticks) so the 64 px thumb stays one hue.
 */
function scher(page: Page, ground: CoverGround, rand: () => number): string {
  let out = `<rect width="${COVER}" height="${COVER}" fill="${ground.paper}"/>`;
  const hero =
    page.voices.reduce((h, v) => (v.weight > h.weight ? v : h), page.voices[0]) ??
    (page.regions[0] ? voiceFromRegion(page.regions[0], 0) : null);

  if (page.posture === "stone") {
    const slab = page.regions[0];
    const x = slab ? clamp(slab.x, 60, 280) : 120;
    const y = slab?.y ?? 280;
    const w = slab ? Math.min(660, Math.max(420, slab.w)) : 560;
    const h = slab ? Math.min(420, Math.max(200, slab.h)) : 280;
    out += `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="${ground.ink}"/>`;
    if (hero) {
      out += wordBlock(x + 36, y + h * 0.38, Math.min(420, w * 0.72), 48 + hero.weight * 36, ground.paper, -2 + rand() * 4);
    }
    return out;
  }

  if (page.posture === "clusters") {
    const islands = (page.voices.length ? page.voices : page.regions.map((r, i) => voiceFromRegion(r, i))).slice(0, 3);
    islands.forEach((v, i) => {
      const w = 160 + v.weight * 120;
      const h = 110 + v.weight * 90;
      const fill = i === 0 ? ground.ink : mix(ground.ink, ground.paper, 0.12);
      out += `<rect x="${fmt(v.cx - w / 2)}" y="${fmt(v.cy - h / 2)}" width="${fmt(w)}" height="${fmt(h)}" fill="${fill}"/>`;
      if (i === 0) {
        out += wordBlock(v.cx - w * 0.35, v.cy - 10, w * 0.7, 36 + v.weight * 28, ground.paper, (hash01(v.id) - 0.5) * 6);
      }
    });
    return out;
  }

  if (page.posture === "curve") {
    out += shaperRivers(page, 22, ground);
    if (hero) {
      out += wordBlock(
        lerp(80, 220, hero.weight),
        lerp(320, 480, page.form.pitchMean / 100),
        320 + hero.weight * 160,
        56 + hero.weight * 40,
        ground.ink,
        -4 + rand() * 6
      );
    }
    return out;
  }

  // field — Brat default: full-bleed hue, one overrun word, optional soft crop
  const overrun = 40 + page.form.fillRatio * 80;
  out += `<rect x="${fmt(-overrun * 0.4)}" y="${fmt(COVER * 0.62)}" width="${fmt(COVER + overrun)}" height="${fmt(COVER * 0.5)}" fill="${withAlpha(ground.ink, 0.14)}"/>`;
  if (hero) {
    const w = 380 + hero.weight * 220 + Math.min(120, hero.notes / 6);
    const h = 72 + hero.weight * 56;
    const x = lerp(48, 160, 1 - hero.weight);
    const y = lerp(340, 520, page.form.pitchMean / 100);
    out += wordBlock(x, y, w, h, ground.ink, -3 + (hash01(hero.id) - 0.5) * 8);
  } else {
    out += wordBlock(120, 400, 480, 90, ground.ink, -2);
  }
  if (page.form.notesPerBar > 4) {
    out += `<rect x="${fmt(lerp(40, 200, page.form.fillRatio))}" y="${fmt(COVER - 56)}" width="${fmt(140 + page.form.notesPerBar * 3)}" height="18" fill="${withAlpha(ground.ink, 0.55)}"/>`;
  }
  return out;
}

function saville(page: Page, ground: CoverGround, rand: () => number): string {
  const cx = page.posture === "clusters" ? 320 : page.posture === "stone" ? 450 : 470;
  const cy = page.posture === "clusters" ? 480 : 450;
  const radius = page.posture === "stone" ? 300 : page.posture === "clusters" ? 250 : page.posture === "curve" ? 500 : 530;
  const disc = mix(ground.paper, ground.mist, page.posture === "stone" ? 0.35 : 0.7);
  let out = `<rect width="${COVER}" height="${COVER}" fill="${ground.paper}"/>`;
  out += `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(radius)}" fill="${disc}"/>`;

  const rings =
    page.posture === "stone"
      ? 4
      : page.posture === "clusters"
        ? 8 + page.regions.length
        : page.posture === "curve"
          ? 12 + Math.round(page.form.bars / 12)
          : 16 + Math.round(page.form.bars / 8);
  for (let i = 0; i < rings; i++) {
    const r = 50 + i * ((radius - 60) / Math.max(1, rings));
    const heavy = i % (page.posture === "field" ? 6 : 8) === 0;
    out += `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="none" stroke="${heavy ? ground.flare : ground.ink}" stroke-width="${heavy ? 3.2 : 0.9}" opacity="${heavy ? 0.92 : 0.38}"/>`;
  }

  if (page.posture !== "stone") {
    const use = page.voices.filter((v) => v.notes > 0);
    const wedges = use.length ? use : page.voices;
    const total = wedges.reduce((s, v) => s + v.weight, 0) || 1;
    let a0 = -Math.PI / 2;
    const hero = wedges.reduce((h, v) => (v.weight > h.weight ? v : h), wedges[0] ?? { weight: 0 });
    wedges.forEach((v) => {
      const sweep = (v.weight / total) * Math.PI * (page.posture === "clusters" ? 0.9 : 1.65);
      if (sweep < 0.04) return;
      const fill = v === hero ? ground.flare : mix(ground.ink, ground.paper, 0.08);
      out += `<path d="${annulus(cx, cy, 70, page.posture === "clusters" ? 150 : 210, a0, a0 + sweep)}" fill="${fill}"/>`;
      a0 += sweep;
    });
  }

  out += `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="70" fill="${ground.paper}"/>`;
  out += `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="20" fill="${ground.mist}"/>`;

  if (page.posture === "curve" && page.waves[0]) {
    page.waves.slice(0, 3).forEach((sh, i) => {
      out += `<path d="${polarShaper(cx, cy, 200, radius - 20, sh)}" fill="none" stroke="${i === 0 ? ground.flare : ground.ink}" stroke-width="${fmt(2.6 - i * 0.4)}" opacity="${i === 0 ? 0.9 : 0.55}"/>`;
    });
  } else if (page.posture === "field") {
    out += `<path d="${noteSpiral(cx, cy, 200, radius - 16, page, 2.2 + page.form.notesPerBar / 16)}" fill="none" stroke="${ground.ink}" stroke-width="1.8" opacity="0.55"/>`;
  } else if (page.posture === "clusters") {
    page.voices.forEach((v, i) => {
      const base = ((v.cx / COVER) * Math.PI * 1.4) - Math.PI / 2;
      const n = Math.max(3, Math.min(7, Math.round(v.notes / 8)));
      for (let k = 0; k < n; k++) {
        const ang = base + (k - n / 2) * 0.08;
        const r = 155 + (k % 3) * 18;
        out += `<circle cx="${fmt(cx + Math.cos(ang) * r)}" cy="${fmt(cy + Math.sin(ang) * r)}" r="${fmt(2.4 + v.weight)}" fill="${i === 0 ? ground.flare : ground.ink}"/>`;
      }
    });
  }

  if (page.posture === "field") {
    out += `<rect x="0" y="${fmt(lerp(120, 240, page.form.pitchMean / 100))}" width="${COVER}" height="${fmt(22 + page.voices[0]?.weight * 16)}" fill="${ground.flare}"/>`;
  }
  if (page.posture === "stone") {
    const slab = page.regions[0];
    if (slab) out += `<rect x="${fmt(slab.x)}" y="${fmt(cy + 80)}" width="${fmt(Math.min(420, slab.w * 0.5))}" height="18" fill="${ground.flare}"/>`;
  }
  if (rand() > 0.85 && page.posture === "field") {
    out += `<rect x="${fmt(cx + 180)}" y="${fmt(cy - 260)}" width="200" height="80" fill="${withAlpha(ground.ink, 0.12)}"/>`;
  }
  return out;
}

function letterpress(page: Page, ground: CoverGround, rand: () => number): string {
  let out = `<rect width="${COVER}" height="${COVER}" fill="${ground.paper}"/>`;

  if (page.posture === "stone") {
    const slab = page.regions[0];
    const w = slab ? Math.min(620, slab.w) : 480;
    const h = slab?.h ?? 260;
    const x = slab?.x ?? 160;
    const y = slab?.y ?? 280;
    out += `<rect x="${fmt(x + 14)}" y="${fmt(y + 16)}" width="${fmt(w)}" height="${fmt(h)}" fill="${ground.flare}"/>`;
    out += `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="${ground.ink}"/>`;
    page.voices.forEach((v) => {
      out += stanza(v.cx, v.cy, { ...v, weight: 0.35, color: ground.paper }, ground.paper, 3, rand);
    });
    return out;
  }

  if (page.posture === "clusters") {
    const islands = page.voices.length ? page.voices : page.regions.map((r, i) => voiceFromRegion(r, i));
    islands.forEach((v, i) => {
      const w = 100 + v.weight * 80;
      const h = 70 + v.weight * 50;
      const dye = i === 0 ? mix(ground.ink, ground.flare, 0.2) : ground.ink;
      out += `<rect x="${fmt(v.cx - w / 2 + 8)}" y="${fmt(v.cy - h / 2 + 8)}" width="${fmt(w)}" height="${fmt(h)}" fill="${ground.flare}"/>`;
      out += `<rect x="${fmt(v.cx - w / 2)}" y="${fmt(v.cy - h / 2)}" width="${fmt(w)}" height="${fmt(h)}" fill="${dye}"/>`;
      out += stanza(v.cx - w * 0.3, v.cy - 4, { ...v, weight: 0.22, color: ground.paper }, ground.paper, 3, rand);
    });
    return out;
  }

  if (page.posture === "curve") {
    out += shaperInk(page, ground, 5, 0.85);
    const spine = mapShaper(page.waves[0]);
    page.voices.forEach((v, i) => {
      const p = alongSpine(spine, (i + 0.35) / Math.max(1, page.voices.length), (i % 2 === 0 ? -1 : 1) * 18);
      const w = 160 + v.weight * 90;
      const h = 70 + v.weight * 40;
      const dye = i === 0 ? mix(ground.ink, ground.flare, 0.18) : ground.ink;
      out += `<g transform="rotate(${fmt((hash01(v.id) - 0.5) * 8)} ${fmt(p.x)} ${fmt(p.y)})">
        <rect x="${fmt(p.x - w / 2)}" y="${fmt(p.y - h / 2)}" width="${fmt(w)}" height="${fmt(h)}" fill="${dye}"/>
      </g>`;
      out += stanza(p.x - 40, p.y, { ...v, weight: 0.25, color: ground.paper }, ground.paper, 5, rand);
    });
    return out;
  }

  page.voices.forEach((v, i) => {
    const w = 200 + v.weight * 180 + Math.min(120, v.notes / 6);
    const h = 90 + v.weight * 100;
    const x = clamp(v.cx - w * 0.35, -40, 620);
    const y = clamp(v.cy - h * 0.4, -20, 700);
    const rot = (hash01(`o${v.id}`) * 11) - 5.5;
    const dye = i === 0 ? mix(ground.ink, ground.flare, 0.22) : ground.ink;
    out += `<g transform="rotate(${fmt(rot)} ${fmt(x + w / 2)} ${fmt(y + h / 2)})">
      <rect x="${fmt(x + 12)}" y="${fmt(y + 14)}" width="${fmt(w)}" height="${fmt(h)}" fill="${ground.flare}"/>
      <rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="${dye}"/>
    </g>`;
    out += stanza(x + 24, y + h * 0.34, { ...v, weight: 0.28, color: ground.paper }, ground.paper, 6 + (i % 4), rand);
  });
  page.form.timeBins.forEach((amp, i) => {
    if (amp < 0.4) return;
    out += `<line x1="0" y1="${fmt(lerp(80, 820, i / page.form.timeBins.length))}" x2="${COVER}" y2="${fmt(lerp(100, 840, i / page.form.timeBins.length))}" stroke="${withAlpha(ground.ink, 0.45)}" stroke-width="2"/>`;
  });
  return out;
}

function voiceFromRegion(r: RegionMark, i: number): FpVoice {
  return {
    id: `r${i}`,
    cx: r.x + r.w * 0.4,
    cy: r.y,
    spacing: 40,
    color: r.color,
    weight: 0.7 + Math.min(0.6, r.notes / 40),
    rings: 6,
    notes: r.notes,
  };
}

function mapShaper(sh: VizShaper | undefined): { x: number; y: number }[] {
  if (!sh || sh.anchors.length < 2) return [];
  const xs = sh.anchors.map((a) => a.x);
  const ys = sh.anchors.map((a) => a.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return sh.anchors.map((a) => ({
    x: lerp(50, 850, (a.x - minX) / (maxX - minX || 1)),
    y: lerp(80, 820, 1 - (a.y - minY) / (maxY - minY || 1)),
  }));
}

function alongSpine(spine: { x: number; y: number }[], t: number, offset: number): { x: number; y: number } {
  if (spine.length < 2) return spine[0] ?? { x: 450, y: 450 };
  const f = clamp(t, 0, 1) * (spine.length - 1);
  const i = Math.min(spine.length - 2, Math.floor(f));
  const u = f - i;
  const a = spine[i];
  const b = spine[i + 1];
  const x = lerp(a.x, b.x, u);
  const y = lerp(a.y, b.y, u);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: x - (dy / len) * offset, y: y + (dx / len) * offset };
}

function pathOf(pts: { x: number; y: number }[]): string {
  return pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${fmt(p.x)} ${fmt(p.y)}`)
    .join(" ");
}

function shaperInk(page: Page, ground: CoverGround, width: number, alpha: number): string {
  let out = "";
  page.waves.slice(0, 4).forEach((sh, i) => {
    const pts = mapShaper(sh);
    if (pts.length < 2) return;
    out += `<path d="${pathOf(pts)}" fill="none" stroke="${withAlpha(i === 0 ? ground.flare : ground.ink, alpha - i * 0.08)}" stroke-width="${fmt(width - i * 0.7)}" stroke-linecap="round"/>`;
  });
  return out;
}

function shaperRivers(page: Page, width: number, ground: CoverGround): string {
  let out = "";
  page.waves.slice(0, 5).forEach((sh, i) => {
    const pts = mapShaper(sh);
    if (pts.length < 2) return;
    const dye = i === 0 ? ground.flare : ground.ink;
    out += `<path d="${pathOf(pts)}" fill="none" stroke="${dye}" stroke-width="${fmt(width - i * 3)}" stroke-linecap="round" opacity="0.92"/>`;
  });
  return out;
}

function polarShaper(cx: number, cy: number, r0: number, r1: number, sh: VizShaper): string {
  const xs = sh.anchors.map((a) => a.x);
  const ys = sh.anchors.map((a) => a.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return sh.anchors
    .map((a, i) => {
      const t = (a.x - minX) / (maxX - minX || 1);
      const u = (a.y - minY) / (maxY - minY || 1);
      const ang = -Math.PI / 2 + t * Math.PI * 2.35;
      const r = lerp(r0, r1, u);
      const x = cx + Math.cos(ang) * r;
      const y = cy + Math.sin(ang) * r;
      return `${i === 0 ? "M" : "L"} ${fmt(x)} ${fmt(y)}`;
    })
    .join(" ");
}

function noteSpiral(cx: number, cy: number, r0: number, r1: number, page: Page, turns: number): string {
  if (!page.notes.length) return "";
  return page.notes
    .map((n, i) => {
      const t = i / Math.max(1, page.notes.length - 1);
      const ang = t * Math.PI * 2 * turns;
      const r = lerp(r0, r1, t);
      const x = cx + Math.cos(ang) * r;
      const y = cy + Math.sin(ang) * r;
      return `${i === 0 ? "M" : "L"} ${fmt(x)} ${fmt(y)}`;
    })
    .join(" ");
}

function wordBlock(x: number, y: number, w: number, h: number, fill: string, rot: number): string {
  return `<g transform="rotate(${fmt(rot)} ${fmt(x + w / 2)} ${fmt(y + h / 2)})">
    <rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" rx="${fmt(h * 0.18)}" fill="${fill}"/>
  </g>`;
}

function inkMass(x: number, y: number, v: FpVoice, ground: CoverGround, scale: number, rand: () => number): string {
  const rx = (70 + v.weight * 110) * scale;
  const ry = (20 + v.weight * 34) * scale;
  const rot = (hash01(`b${v.id}`) * 52) - 26;
  let out = `<ellipse cx="${fmt(x)}" cy="${fmt(y)}" rx="${fmt(rx)}" ry="${fmt(ry)}" transform="rotate(${fmt(rot)} ${fmt(x)} ${fmt(y)})" fill="${ground.ink}"/>`;
  out += `<path d="M ${fmt(x - rx)} ${fmt(y)} C ${fmt(x - rx * 0.1)} ${fmt(y - ry * 3.1)}, ${fmt(x + rx * 0.32)} ${fmt(y + ry * 2.4)}, ${fmt(x + rx * 1.25)} ${fmt(y + (rand() - 0.5) * 20)}" fill="none" stroke="${ground.ink}" stroke-width="${fmt(1.8 + v.weight)}"/>`;
  return out;
}

function stanza(x: number, y: number, v: FpVoice, ink: string, words: number, rand: () => number): string {
  let out = "";
  let px = x;
  let py = y;
  for (let w = 0; w < words; w++) {
    out += asemic(px, py + (rand() - 0.5) * 8, { weight: v.weight * (0.7 + (w % 3) * 0.15), complexity: 3 + (w % 4), muted: false, seed: hash01(`${v.id}${w}`) }, ink);
    px += 28 + v.weight * 18 + rand() * 16;
    if (px > x + 280) {
      px = x + rand() * 20;
      py += 16 + v.weight * 8;
    }
  }
  return out;
}

function asemic(
  x: number,
  y: number,
  v: { weight: number; complexity: number; muted: boolean; seed: number },
  ink: string
): string {
  const local = rng(v.seed || 0.3);
  let d = `M ${fmt(x)} ${fmt(y)}`;
  let px = x;
  let py = y;
  for (let i = 0; i < v.complexity; i++) {
    const nx = px + (0.35 + local() * 0.5) * (18 + v.weight * 22);
    const ny = py + (local() - 0.5) * 16;
    d += ` Q ${fmt(px + (local() - 0.2) * 12)} ${fmt(py - 8 - local() * 14)}, ${fmt(nx)} ${fmt(ny)}`;
    px = nx;
    py = ny;
  }
  return `<path d="${d}" fill="none" stroke="${withAlpha(ink, v.muted ? 0.4 : 0.92)}" stroke-width="${fmt(1.2 + v.weight * 1.25)}" stroke-linecap="round"/>`;
}

function annulus(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const p = (r: number, a: number) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  const [x0, y0] = p(r1, a0);
  const [x1, y1] = p(r1, a1);
  const [x2, y2] = p(r0, a1);
  const [x3, y3] = p(r0, a0);
  return `M ${fmt(x0)} ${fmt(y0)} A ${r1} ${r1} 0 ${large} 1 ${fmt(x1)} ${fmt(y1)} L ${fmt(x2)} ${fmt(y2)} A ${r0} ${r0} 0 ${large} 0 ${fmt(x3)} ${fmt(y3)} Z`;
}
