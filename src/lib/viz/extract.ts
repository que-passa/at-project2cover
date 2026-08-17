import { classifyKind, suggestedMode } from "./classify.js";
import type {
  VizCable,
  VizDevice,
  VizMixerStrip,
  VizNote,
  VizPatternCell,
  VizProject,
  VizRegion,
  VizShaper,
  VizTrack,
} from "./types.js";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type JsonObject = { [k: string]: Json };

export type EntityDump = {
  id: string;
  type: string;
  fields: JsonObject;
};

const DESKTOP_TYPES = new Set([
  "audioDevice",
  "audioMerger",
  "audioSplitter",
  "autoFilter",
  "bandSplitter",
  "bassline",
  "beatbox8",
  "beatbox9",
  "centroid",
  "crossfader",
  "curve",
  "exciter",
  "gakki",
  "genericVst3PluginBeta",
  "graphicalEQ",
  "gravity",
  "heisenberg",
  "helmholtz",
  "kobolt",
  "machiniste",
  "matrixArpeggiator",
  "minimixer",
  "noteSplitter",
  "panorama",
  "pulsar",
  "pulverisateur",
  "quantum",
  "quasar",
  "rasselbock",
  "ringModulator",
  "space",
  "spitfireLabsVst3Plugin",
  "stereoEnhancer",
  "stompboxChorus",
  "stompboxCompressor",
  "stompboxCrusher",
  "stompboxDelay",
  "stompboxFlanger",
  "stompboxGate",
  "stompboxParametricEqualizer",
  "stompboxPhaser",
  "stompboxPitchDelay",
  "stompboxReverb",
  "stompboxSlope",
  "stompboxStereoDetune",
  "stompboxTube",
  "tinyGain",
  "tonematrix",
  "waveshaper",
]);

function asObject(value: Json | undefined): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function str(value: Json | undefined): string {
  return typeof value === "string" ? value : "";
}

function num(value: Json | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function bool(value: Json | undefined): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function locId(value: Json | undefined): string | undefined {
  const id = str(asObject(value).entityId);
  return id || undefined;
}

function lastPort(value: Json | undefined): number | undefined {
  const idx = asObject(value).fieldIndex;
  if (!Array.isArray(idx) || idx.length === 0) return undefined;
  const last = idx[idx.length - 1];
  return typeof last === "number" ? last : undefined;
}

function humanType(type: string): string {
  return type.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export type ExtractListing = {
  tags?: string[];
  genreName?: string;
};

export function extractProject(
  id: string,
  name: string,
  entities: EntityDump[],
  listing?: ExtractListing
): VizProject {
  const byType = new Map<string, EntityDump[]>();
  const byId = new Map<string, EntityDump>();
  for (const e of entities) {
    byId.set(e.id, e);
    const list = byType.get(e.type) ?? [];
    list.push(e);
    byType.set(e.type, list);
  }

  const config = byType.get("config")?.[0]?.fields ?? {};
  const devices: VizDevice[] = entities
    .filter((e) => DESKTOP_TYPES.has(e.type))
    .map((e) => ({
      id: e.id,
      type: e.type,
      displayName: str(e.fields.displayName) || undefined,
      x: num(e.fields.positionX) ?? 0,
      y: num(e.fields.positionY) ?? 0,
      isActive: bool(e.fields.isActive),
    }));

  const deviceById = new Map(devices.map((d) => [d.id, d]));

  const cables: VizCable[] = [
    ...(byType.get("desktopAudioCable") ?? []).map((e) => ({
      id: e.id,
      from: locId(e.fields.fromSocket) ?? "",
      to: locId(e.fields.toSocket) ?? "",
      colorIndex: num(e.fields.colorIndex) ?? null,
      kind: "audio" as const,
      fromPort: lastPort(e.fields.fromSocket),
      toPort: lastPort(e.fields.toSocket),
    })),
    ...(byType.get("desktopNoteCable") ?? []).map((e) => ({
      id: e.id,
      from: locId(e.fields.fromSocket) ?? "",
      to: locId(e.fields.toSocket) ?? "",
      colorIndex: num(e.fields.colorIndex) ?? null,
      kind: "note" as const,
      fromPort: lastPort(e.fields.fromSocket),
      toPort: lastPort(e.fields.toSocket),
    })),
  ].filter((c) => c.from && c.to);

  const mixer: VizMixerStrip[] = [
    ...(byType.get("mixerChannel") ?? []).map((e) => stripFrom(e, "channel")),
    ...(byType.get("mixerGroup") ?? []).map((e) => stripFrom(e, "group")),
    ...(byType.get("mixerAux") ?? []).map((e) => stripFrom(e, "aux")),
    ...(byType.get("mixerDelayAux") ?? []).map((e) => stripFrom(e, "aux")),
    ...(byType.get("mixerReverbAux") ?? []).map((e) => stripFrom(e, "aux")),
  ];

  const mixerById = new Map(mixer.map((m) => [m.id, m]));

  const tracks: VizTrack[] = [
    ...(byType.get("noteTrack") ?? []).map((e) => trackFrom(e, "note", deviceById, mixerById)),
    ...(byType.get("audioTrack") ?? []).map((e) => trackFrom(e, "audio", deviceById, mixerById)),
    ...(byType.get("automationTrack") ?? []).map((e) =>
      trackFrom(e, "automation", deviceById, mixerById)
    ),
  ].sort((a, b) => a.order - b.order);

  const notes: VizNote[] = (byType.get("note") ?? []).map((e) => ({
    collectionId: locId(e.fields.collection) ?? "",
    positionTicks: num(e.fields.positionTicks) ?? 0,
    durationTicks: num(e.fields.durationTicks) ?? 0,
    pitch: num(e.fields.pitch) ?? 0,
    velocity: num(e.fields.velocity) ?? 0,
  }));

  const noteStats = new Map<string, { count: number; velocitySum: number }>();
  for (const n of notes) {
    const cur = noteStats.get(n.collectionId) ?? { count: 0, velocitySum: 0 };
    cur.count += 1;
    cur.velocitySum += n.velocity;
    noteStats.set(n.collectionId, cur);
  }

  const regions: VizRegion[] = [
    ...(byType.get("noteRegion") ?? []).map((e) =>
      regionFrom(e, "note", noteStats)
    ),
    ...(byType.get("audioRegion") ?? []).map((e) =>
      regionFrom(e, "audio", noteStats)
    ),
    ...(byType.get("automationRegion") ?? []).map((e) =>
      regionFrom(e, "automation", noteStats)
    ),
  ];

  const groupings = (byType.get("mixerStripGrouping") ?? [])
    .map((e) => ({
      childId: locId(e.fields.childStrip) ?? "",
      groupId: locId(e.fields.groupStrip) ?? "",
    }))
    .filter((g) => g.childId && g.groupId);

  const auxRoutes = (byType.get("mixerAuxRoute") ?? [])
    .map((e) => ({
      from: locId(e.fields.auxSend) ?? "",
      to: locId(e.fields.auxReceive) ?? "",
      gain: num(e.fields.gain),
    }))
    .filter((r) => r.from && r.to);

  const sidechains = (byType.get("mixerSideChainCable") ?? [])
    .map((e) => ({
      from: locId(e.fields.from) ?? "",
      to: locId(e.fields.to) ?? "",
    }))
    .filter((r) => r.from && r.to);

  const patterns = extractPatterns(byType, deviceById);
  const shapers = extractShapers(byType, deviceById);
  const patternBanks = [
    "tonematrixPattern",
    "beatbox8Pattern",
    "beatbox9Pattern",
    "basslinePattern",
    "rasselbockPattern",
    "machinistePattern",
  ].reduce((n, t) => n + (byType.get(t)?.length ?? 0), 0);

  const playableRegions = regions.filter((r) => r.kind !== "automation");
  const facts = {
    deviceCount: devices.length,
    namedDevices: devices.filter((d) => d.displayName).length,
    audioCables: cables.filter((c) => c.kind === "audio").length,
    noteCables: cables.filter((c) => c.kind === "note").length,
    noteCount: notes.length,
    regionCount: playableRegions.length,
    filledPatternCells: patterns.length,
    patternBanks,
    mixerNames: mixer.map((m) => m.displayName).filter((n): n is string => Boolean(n)),
  };
  const kind = classifyKind({
    noteCount: facts.noteCount,
    cableCount: facts.audioCables + facts.noteCables,
    regionCount: facts.regionCount,
    filledPatternCells: facts.filledPatternCells,
  });

  return {
    id,
    name,
    bpm: num(config.tempoBpm) ?? 120,
    sigNum: num(config.signatureNumerator) ?? 4,
    sigDen: num(config.signatureDenominator) ?? 4,
    durationTicks: num(config.durationTicks) ?? 0,
    kind,
    suggestedMode: suggestedMode(kind),
    devices,
    cables,
    tracks,
    regions,
    notes,
    mixer,
    groupings,
    auxRoutes,
    sidechains,
    patterns,
    shapers,
    tags: (listing?.tags ?? []).filter((t) => t.trim().length > 0),
    genreName: listing?.genreName,
    facts,
  };
}

function stripFrom(e: EntityDump, kind: VizMixerStrip["kind"]): VizMixerStrip {
  const display = asObject(e.fields.displayParameters);
  const fader = asObject(e.fields.faderParameters);
  return {
    id: e.id,
    kind,
    displayName: str(display.displayName) || undefined,
    colorIndex: num(display.colorIndex) ?? null,
    order: num(display.orderAmongStrips) ?? 0,
    postGain: num(fader.postGain),
    muted: bool(fader.isMuted),
    soloed: bool(fader.isSoloed),
  };
}

function trackFrom(
  e: EntityDump,
  kind: VizTrack["kind"],
  devices: Map<string, VizDevice>,
  mixer: Map<string, VizMixerStrip>
): VizTrack {
  const playerId = locId(e.fields.player);
  const device = playerId ? devices.get(playerId) : undefined;
  const mix = playerId ? mixer.get(playerId) : undefined;
  const label =
    device?.displayName ||
    mix?.displayName ||
    (device ? humanType(device.type) : undefined) ||
    humanType(kind + " track");
  return {
    id: e.id,
    kind,
    order: num(e.fields.orderAmongTracks) ?? 0,
    enabled: bool(e.fields.isEnabled) !== false,
    playerId,
    label,
  };
}

function regionFrom(
  e: EntityDump,
  kind: VizRegion["kind"],
  noteStats: Map<string, { count: number; velocitySum: number }>
): VizRegion {
  const region = asObject(e.fields.region);
  const collectionId = locId(e.fields.collection);
  const stats = collectionId ? noteStats.get(collectionId) : undefined;
  return {
    id: e.id,
    trackId: locId(e.fields.track) ?? "",
    kind,
    positionTicks: num(region.positionTicks) ?? 0,
    durationTicks: num(region.durationTicks) ?? 0,
    loopDurationTicks: num(region.loopDurationTicks),
    enabled: bool(region.isEnabled) !== false,
    colorIndex: num(region.colorIndex) ?? null,
    displayName: str(region.displayName) || undefined,
    collectionId,
    noteCount: stats?.count ?? 0,
    velocitySum: stats?.velocitySum ?? 0,
  };
}

function extractPatterns(
  byType: Map<string, EntityDump[]>,
  devices: Map<string, VizDevice>
): VizPatternCell[] {
  const out: VizPatternCell[] = [];
  const cap = 4000;

  const push = (cell: VizPatternCell) => {
    if (out.length < cap) out.push(cell);
  };

  for (const e of byType.get("tonematrixPattern") ?? []) {
    const machineId = locId(e.fields.slot) ?? "";
    const slot = lastPort(e.fields.slot) ?? 0;
    const machineType = devices.get(machineId)?.type ?? "tonematrix";
    const steps = Array.isArray(e.fields.steps) ? e.fields.steps : [];
    steps.forEach((step, col) => {
      const notes = asObject(step).notes;
      if (!Array.isArray(notes)) return;
      notes.forEach((on, row) => {
        if (on === true) push({ machineId, machineType, slot, row, col });
      });
    });
  }

  for (const type of ["beatbox8Pattern", "beatbox9Pattern", "basslinePattern", "rasselbockPattern"]) {
    for (const e of byType.get(type) ?? []) {
      const machineId = locId(e.fields.slot) ?? "";
      const slot = lastPort(e.fields.slot) ?? 0;
      const machineType = devices.get(machineId)?.type ?? type.replace(/Pattern$/, "");
      const steps = Array.isArray(e.fields.steps) ? e.fields.steps : [];
      steps.forEach((step, col) => {
        if (stepFilled(step)) {
          push({ machineId, machineType, slot, row: 0, col });
        }
      });
    }
  }

  for (const e of byType.get("machinistePattern") ?? []) {
    const machineId = locId(e.fields.slot) ?? "";
    const slot = lastPort(e.fields.slot) ?? 0;
    const machineType = devices.get(machineId)?.type ?? "machiniste";
    const channels = Array.isArray(e.fields.channelPatterns) ? e.fields.channelPatterns : [];
    channels.forEach((ch, row) => {
      const steps = Array.isArray(asObject(ch).steps) ? (asObject(ch).steps as Json[]) : [];
      steps.forEach((step, col) => {
        if (asObject(step).isActive === true) {
          push({ machineId, machineType, slot, row, col });
        }
      });
    });
  }

  return out;
}

function stepFilled(step: Json): boolean {
  if (step === null || typeof step !== "object" || Array.isArray(step)) return false;
  if (step.isActive === true) return true;
  if (step.isActive === false) return false;
  return Object.keys(step).length > 0;
}

function extractShapers(
  byType: Map<string, EntityDump[]>,
  devices: Map<string, VizDevice>
): VizShaper[] {
  const anchorsByShaper = new Map<string, { x: number; y: number }[]>();
  for (const e of byType.get("waveshaperAnchor") ?? []) {
    const sid = locId(e.fields.waveshaper);
    if (!sid) continue;
    const list = anchorsByShaper.get(sid) ?? [];
    list.push({ x: num(e.fields.x) ?? 0, y: num(e.fields.y) ?? 0 });
    anchorsByShaper.set(sid, list);
  }
  const waveshapers = (byType.get("waveshaper") ?? []).map((e) => {
    const device = devices.get(e.id);
    const anchors = (anchorsByShaper.get(e.id) ?? []).sort((a, b) => a.x - b.x);
    return {
      id: e.id,
      displayName: device?.displayName || str(e.fields.displayName) || undefined,
      kind: "waveshaper" as const,
      x: device?.x,
      y: device?.y,
      anchors,
    };
  });

  const curves = (byType.get("curve") ?? []).map((e) => {
    const device = devices.get(e.id);
    return {
      id: e.id,
      displayName: device?.displayName || str(e.fields.displayName) || undefined,
      kind: "curve" as const,
      x: device?.x ?? num(e.fields.positionX),
      y: device?.y ?? num(e.fields.positionY),
      anchors: eqAnchors(e.fields),
    };
  });

  return [...waveshapers, ...curves];
}

function eqAnchors(fields: JsonObject): { x: number; y: number }[] {
  const pts: { f: number; g: number }[] = [];
  const take = (band: Json | undefined, fallbackF: number) => {
    const o = asObject(band);
    const f = num(o.cutoffFrequencyHz) ?? num(o.centerFrequencyHz) ?? fallbackF;
    pts.push({ f, g: num(o.gainDb) ?? 0 });
  };
  take(fields.highPass, 40);
  take(fields.lowShelf, 80);
  take(fields.peak1, 240);
  take(fields.peak2, 1000);
  take(fields.peak3, 4000);
  take(fields.highShelf, 10000);
  take(fields.lowPass, 18000);
  pts.sort((a, b) => a.f - b.f);
  const logF = (f: number) => Math.log10(Math.max(20, f));
  const minL = logF(20);
  const maxL = logF(20000);
  return pts.map((p) => ({
    x: (logF(p.f) - minL) / (maxL - minL || 1),
    y: Math.max(0, Math.min(1, 0.5 + p.g / 48)),
  }));
}
