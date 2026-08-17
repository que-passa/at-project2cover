import { colorForIndex } from "./palette.js";
import { cropDurationTicks, ticksPerBar, ticksToBars } from "./ticks.js";
import type { VizNote, VizProject, VizRegion, VizTrack } from "./types.js";

export type PlacedNote = VizNote & { absTicks: number };

export type Habit = "tree" | "vine" | "succulent" | "orb";

export type Voice = {
  id: string;
  cx: number;
  cy: number;
  spacing: number;
  color: string;
  weight: number;
  rings: number;
  notes: number;
};

export type FormPrint = {
  bars: number;
  notesPerBar: number;
  pitchMin: number;
  pitchMax: number;
  pitchSpan: number;
  pitchMean: number;
  timeBins: number[];
  pitchBins: number[];
  tracks: number;
  noteTracks: number;
  devices: number;
  cables: number;
  maxDegree: number;
  yarns: string[];
  regions: number;
  playableRegions: VizRegion[];
  shapers: number;
  waveshapers: number;
  shaperWobble: number;
  patternCells: number;
  patternBanks: number;
  patternMachines: number;
  patternCols: number;
  patternRows: number;
  fillRatio: number;
  habit: Habit;
};

const TIME_BINS = 16;
const PITCH_BINS = 8;

export function placedNotes(project: VizProject): PlacedNote[] {
  const regionByCol = new Map(project.regions.map((r) => [r.collectionId ?? "", r]));
  return project.notes.map((n) => {
    const region = regionByCol.get(n.collectionId);
    return { ...n, absTicks: (region?.positionTicks ?? 0) + n.positionTicks };
  });
}

export function formOf(project: VizProject): FormPrint {
  const tpb = ticksPerBar(project.sigNum, project.sigDen);
  const notes = placedNotes(project);
  const contentEnd = contentEndTicks(project);
  const bars = Math.max(1, ticksToBars(contentEnd, project.sigNum, project.sigDen));
  const pitches = notes.map((n) => n.pitch);
  const pitchMin = pitches.length ? Math.min(...pitches) : 60;
  const pitchMax = pitches.length ? Math.max(...pitches) : 60;
  const pitchSpan = Math.max(0, pitchMax - pitchMin);
  const pitchMean = pitches.length ? pitches.reduce((a, b) => a + b, 0) / pitches.length : 60;

  const t0 = notes.length ? Math.min(...notes.map((n) => n.absTicks)) : 0;
  const t1 = Math.max(contentEnd, t0 + tpb);
  const timeBins = new Array(TIME_BINS).fill(0);
  const pitchBins = new Array(PITCH_BINS).fill(0);
  for (const n of notes) {
    const ti = Math.min(TIME_BINS - 1, Math.floor(((n.absTicks - t0) / (t1 - t0 || 1)) * TIME_BINS));
    const pi = Math.min(PITCH_BINS - 1, Math.floor(((n.pitch - pitchMin) / (pitchSpan || 1)) * PITCH_BINS));
    timeBins[ti] += 1;
    pitchBins[pi] += 1;
  }
  const tmax = Math.max(1, ...timeBins);
  const pmax = Math.max(1, ...pitchBins);

  const deg = new Map<string, number>();
  for (const c of project.cables) {
    deg.set(c.from, (deg.get(c.from) ?? 0) + 1);
    deg.set(c.to, (deg.get(c.to) ?? 0) + 1);
  }

  const yarns = mixerYarns(project);
  const playable = project.regions.filter((r) => r.kind !== "automation" && r.enabled);
  const waves = project.shapers.filter((s) => s.kind === "waveshaper" && s.anchors.length >= 2);
  const shaperWobble = wobbleOf(waves[0] ?? project.shapers.find((s) => s.anchors.length >= 2));

  const machines = new Set(project.patterns.map((c) => c.machineId));
  const patternCols = project.patterns.length ? Math.max(...project.patterns.map((c) => c.col + 1)) : 0;
  const patternRows = project.patterns.length ? Math.max(...project.patterns.map((c) => c.row + 1)) : 0;
  const fillRatio =
    patternCols * patternRows > 0 ? project.patterns.length / (patternCols * patternRows * Math.max(1, machines.size)) : 0;

  const print: Omit<FormPrint, "habit"> = {
    bars,
    notesPerBar: notes.length / bars,
    pitchMin,
    pitchMax,
    pitchSpan,
    pitchMean,
    timeBins: timeBins.map((n) => n / tmax),
    pitchBins: pitchBins.map((n) => n / pmax),
    tracks: project.tracks.length,
    noteTracks: project.tracks.filter((t) => t.kind === "note").length,
    devices: project.devices.length,
    cables: project.cables.length,
    maxDegree: deg.size ? Math.max(...deg.values()) : 0,
    yarns,
    regions: playable.length,
    playableRegions: playable,
    shapers: project.shapers.filter((s) => s.anchors.length >= 2).length,
    waveshapers: waves.length,
    shaperWobble,
    patternCells: project.patterns.length,
    patternBanks: project.facts.patternBanks ?? 0,
    patternMachines: machines.size,
    patternCols,
    patternRows,
    fillRatio,
  };
  return { ...print, habit: habitOf(print, project) };
}

function habitOf(f: Omit<FormPrint, "habit">, project: VizProject): Habit {
  const orbs = project.devices.filter((d) => /centroid|minimixer|tinyGain|panorama|audioDevice/.test(d.type)).length;
  const vine = f.waveshapers * 4 + (f.shapers > 6 ? 3 : 0) + (f.shaperWobble > 0.35 ? 1 : 0);
  const tree = (f.devices > 20 ? 5 : 0) + (f.notesPerBar > 8 ? 4 : 0) + (f.noteTracks > 8 ? 3 : 0) + (f.cables > 24 ? 2 : 0);
  const succulent =
    (f.devices <= 3 && project.notes.length > 0 ? 6 : 0) +
    (project.notes.length > 0 && project.notes.length < 220 ? 3 : 0) +
    (f.pitchSpan > 0 && f.pitchSpan < 24 ? 3 : 0);
  const orb = (project.notes.length === 0 ? 6 : 0) + (f.devices <= 3 ? 2 : 0) + (orbs >= 1 && f.devices <= 4 ? 3 : 0);
  const scores: [Habit, number][] = [
    ["vine", vine],
    ["tree", tree],
    ["succulent", succulent],
    ["orb", orb],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  return scores[0][1] > 0 ? scores[0][0] : f.devices > 8 ? "tree" : "orb";
}

export function mixerYarns(project: VizProject): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const ranked = [...project.mixer].sort((a, b) => (b.postGain ?? 0) - (a.postGain ?? 0) || a.order - b.order);
  for (const strip of ranked) {
    if (strip.muted) continue;
    const hex = colorForIndex(strip.colorIndex);
    if (hex === "#8a8680") continue;
    if (seen.has(hex)) continue;
    seen.add(hex);
    out.push(hex);
  }
  if (out.length === 0) {
    for (const c of project.cables) {
      const hex = colorForIndex(c.colorIndex);
      if (hex === "#8a8680" || seen.has(hex)) continue;
      seen.add(hex);
      out.push(hex);
    }
  }
  return out;
}

export function contentEndTicks(project: VizProject): number {
  let content = 0;
  for (const n of placedNotes(project)) content = Math.max(content, n.absTicks + n.durationTicks);
  for (const r of project.regions) content = Math.max(content, r.positionTicks + r.durationTicks);
  for (const c of project.patterns) content = Math.max(content, (c.col + 1) * (ticksPerBar(project.sigNum, project.sigDen) / 4));
  return cropDurationTicks(project.durationTicks || content, content, project.sigNum, project.sigDen);
}

function wobbleOf(shaper: VizProject["shapers"][number] | undefined): number {
  if (!shaper || shaper.anchors.length < 2) return 0;
  const ys = shaper.anchors.map((a) => a.y);
  const span = Math.max(...ys) - Math.min(...ys);
  const mid = shaper.anchors[Math.floor(shaper.anchors.length / 2)];
  const first = shaper.anchors[0];
  return Math.max(-1, Math.min(1, (mid.y - first.y) / 80 + span / 120));
}

export function notesByTrack(project: VizProject): Map<string, PlacedNote[]> {
  const regionByCol = new Map(project.regions.map((r) => [r.collectionId ?? "", r]));
  const out = new Map<string, PlacedNote[]>();
  for (const n of placedNotes(project)) {
    const region = regionByCol.get(n.collectionId);
    const tid = region?.trackId;
    if (!tid) continue;
    const list = out.get(tid) ?? [];
    list.push(n);
    out.set(tid, list);
  }
  return out;
}

export function trackInk(project: VizProject, track: VizTrack): string {
  const mix = project.mixer.find((m) => m.displayName && m.displayName === track.label);
  const hex = colorForIndex(mix?.colorIndex);
  if (hex !== "#8a8680") return hex;
  const region = project.regions.find((r) => r.trackId === track.id && r.colorIndex != null);
  return colorForIndex(region?.colorIndex);
}

export function bloomInks(project: VizProject, need: number): string[] {
  const yarns = mixerYarns(project);
  const regionHues = project.regions
    .map((r) => colorForIndex(r.colorIndex))
    .filter((h) => h !== "#8a8680");
  const cableHues = project.cables
    .map((c) => colorForIndex(c.colorIndex))
    .filter((h) => h !== "#8a8680");
  const fallback =
    project.kind === "arrangement"
      ? ["#c45c28", "#e0a030", "#3d8a5a", "#2f7a8a"]
      : project.kind === "sketch"
        ? ["#8a3a40", "#c4783a", "#3a2418", "#6a4a32"]
        : ["#2f6a6a", "#c4783a", "#1a2420", "#8a7050"];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const hex of [...yarns, ...regionHues, ...cableHues, ...fallback]) {
    if (seen.has(hex)) continue;
    seen.add(hex);
    out.push(hex);
    if (out.length >= need) break;
  }
  while (out.length < need) out.push(fallback[out.length % fallback.length] ?? "#8a4030");
  return out;
}

export function voicesOf(project: VizProject, cap: number): Voice[] {
  const form = formOf(project);
  const byTrack = notesByTrack(project);
  const tracks = project.tracks
    .map((t) => ({ track: t, notes: byTrack.get(t.id) ?? [] }))
    .filter((t) => t.notes.length > 0)
    .sort((a, b) => b.notes.length - a.notes.length);

  const placed = placedNotes(project);
  const t0 = placed.length ? Math.min(...placed.map((n) => n.absTicks)) : 0;
  const t1 = contentEndTicks(project);
  const p0 = form.pitchMin;
  const p1 = form.pitchMax;
  const spacing = ringSpacing(form, form.notesPerBar, project.bpm);

  if (tracks.length === 1 && form.playableRegions.length >= 4) {
    return regionVoices(project, form, cap);
  }

  if (tracks.length >= 1) {
    const take = tracks.slice(0, Math.max(1, Math.min(cap, tracks.length)));
    return take.map((item, i) => {
      const xs = item.notes.map((n) => n.absTicks);
      const ys = item.notes.map((n) => n.pitch);
      const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
      const my = ys.reduce((a, b) => a + b, 0) / ys.length;
      const ink = trackInk(project, item.track);
      return {
        id: item.track.id,
        cx: 70 + ((mx - t0) / (t1 - t0 || 1)) * 760,
        cy: 80 + (1 - (my - p0) / (p1 - p0 || 1)) * 740,
        spacing: spacing * (0.82 + (i % 3) * 0.12),
        color: ink === "#8a8680" ? bloomInks(project, cap)[i] : ink,
        weight: 0.7 + Math.min(1.1, item.notes.length / 400),
        rings: ringCount(form, spacing),
        notes: item.notes.length,
      };
    });
  }

  if (project.devices.length) {
    const xs = project.devices.map((d) => d.x);
    const ys = project.devices.map((d) => d.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const inks = bloomInks(project, cap);
    const spacing = ringSpacing(form, 0, project.bpm);
    return project.devices.slice(0, Math.max(1, Math.min(cap, project.devices.length))).map((d, i) => ({
      id: d.id,
      cx: 120 + ((d.x - minX) / (maxX - minX || 1)) * 660,
      cy: 180 + ((d.y - minY) / (maxY - minY || 1)) * 520,
      spacing,
      color: inks[i % inks.length] ?? "#8a4030",
      weight: 1.1,
      rings: Math.max(6, Math.round(ringCount(form, spacing) * 0.55)),
      notes: 0,
    }));
  }

  return [];
}

function regionVoices(project: VizProject, form: FormPrint, cap: number): Voice[] {
  const regions = [...form.playableRegions].sort((a, b) => a.positionTicks - b.positionTicks);
  const take = regions.slice(0, Math.max(2, Math.min(cap, regions.length)));
  const t0 = Math.min(...take.map((r) => r.positionTicks));
  const t1 = Math.max(...take.map((r) => r.positionTicks + r.durationTicks), t0 + 1);
  const inks = bloomInks(project, take.length);
  const spacing = ringSpacing(form, form.notesPerBar, project.bpm);
  return take.map((r, i) => ({
    id: r.id,
    cx: 90 + ((r.positionTicks - t0) / (t1 - t0 || 1)) * 720,
    cy: 340 + (i % 2) * 70,
    spacing: spacing * (0.9 + (r.noteCount / Math.max(1, Math.max(...take.map((x) => x.noteCount)))) * 0.2),
    color: colorForIndex(r.colorIndex) === "#8a8680" ? inks[i % inks.length] : colorForIndex(r.colorIndex),
    weight: 0.65 + Math.min(0.8, r.noteCount / 40),
    rings: Math.max(5, Math.round(ringCount(form, spacing) * 0.55)),
    notes: r.noteCount,
  }));
}

export function ringSpacing(form: FormPrint, localNpb: number, bpm: number): number {
  const dens = localNpb > 0 ? localNpb : form.notesPerBar;
  const raw = 420 / (dens + 2) * (120 / Math.max(60, bpm));
  return Math.max(7, Math.min(118, raw));
}

export function ringCount(form: FormPrint, spacing: number): number {
  const reach = 280 + Math.min(220, form.bars * 1.6);
  return Math.max(6, Math.min(28, Math.round(reach / spacing)));
}
