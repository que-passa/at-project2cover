import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { isHiddenDump, sortVisibleDumps } from "$lib/server/catalog";
import { classifyKind, suggestedMode } from "$lib/viz/classify";
import { extractProject, type EntityDump } from "$lib/viz/extract";
import type { DumpListItem, VizProject } from "$lib/viz/types";

const DUMP_DIR = path.resolve(process.cwd(), "dumps");

type Fingerprint = {
  id: string;
  name: string;
  bpm: number;
  sig: string;
  durationTicks: number;
  devices: number;
  audioCables: number;
  noteCables: number;
  mixerNames: string[];
  timeline?: { notes?: { count?: number }; noteRegions?: number; audioRegions?: number };
  patterns?: Record<string, number>;
};

export async function listDumps(): Promise<DumpListItem[]> {
  try {
    const raw = JSON.parse(await readFile(path.join(DUMP_DIR, "fingerprints.json"), "utf8")) as Fingerprint[];
    return sortVisibleDumps(raw.map(fingerprintToItem).filter((item) => !isHiddenDump(item)));
  } catch {
    const dirs = (await readdir(DUMP_DIR, { withFileTypes: true })).filter((d) => d.isDirectory());
    const out: DumpListItem[] = [];
    for (const d of dirs) {
      try {
        const item = await listOne(d.name);
        if (!isHiddenDump(item)) out.push(item);
      } catch {
        // skip incomplete dump folders
      }
    }
    return sortVisibleDumps(out);
  }
}

function fingerprintToItem(row: Fingerprint): DumpListItem {
  const notes = row.timeline?.notes?.count ?? 0;
  const regions = (row.timeline?.noteRegions ?? 0) + (row.timeline?.audioRegions ?? 0);
  const filledGuess = Object.entries(row.patterns ?? {})
    .filter(([k]) => k.endsWith("Pattern"))
    .reduce((a, [, n]) => a + n, 0);
  const kind = classifyKind({
    noteCount: notes,
    cableCount: (row.audioCables ?? 0) + (row.noteCables ?? 0),
    regionCount: regions,
    filledPatternCells: filledGuess,
  });
  return {
    id: row.id,
    name: row.name,
    bpm: row.bpm ?? 120,
    sig: row.sig ?? "4/4",
    durationTicks: row.durationTicks ?? 0,
    kind,
    suggestedMode: suggestedMode(kind),
    devices: row.devices ?? 0,
    audioCables: row.audioCables ?? 0,
    noteCables: row.noteCables ?? 0,
    notes,
    regions,
    mixerNames: row.mixerNames ?? [],
  };
}

async function listOne(id: string): Promise<DumpListItem> {
  const project = await loadProject(id);
  return {
    id: project.id,
    name: project.name,
    bpm: project.bpm,
    sig: `${project.sigNum}/${project.sigDen}`,
    durationTicks: project.durationTicks,
    kind: project.kind,
    suggestedMode: project.suggestedMode,
    devices: project.facts.deviceCount,
    audioCables: project.facts.audioCables,
    noteCables: project.facts.noteCables,
    notes: project.facts.noteCount,
    regions: project.facts.regionCount,
    mixerNames: project.facts.mixerNames,
  };
}

export async function loadProject(id: string): Promise<VizProject> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("invalid project id");
  const dir = path.join(DUMP_DIR, id);
  const meta = JSON.parse(await readFile(path.join(dir, "meta.json"), "utf8")) as {
    displayName?: string;
    tags?: unknown;
    genreName?: string;
  };
  const entities = JSON.parse(await readFile(path.join(dir, "entities.json"), "utf8")) as EntityDump[];
  const tags = Array.isArray(meta.tags)
    ? meta.tags.filter((t): t is string => typeof t === "string")
    : [];
  return extractProject(id, meta.displayName || id, entities, {
    tags,
    genreName: typeof meta.genreName === "string" ? meta.genreName : undefined,
  });
}
