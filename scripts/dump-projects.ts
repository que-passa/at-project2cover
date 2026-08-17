/**
 * Dump Audiotool project metadata + document summaries.
 *
 * Uses ProjectService.listProjects for metadata and DocumentService.GetEntities
 * for the studio document (avoids Nexus WASM consolidator limits on large sample blobs).
 *
 * Auth: AT_PAT in env or .env — https://developer.audiotool.com/personal-access-tokens
 *
 * Usage:
 *   npx tsx scripts/dump-projects.ts
 *   npx tsx scripts/dump-projects.ts --limit 5
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAudiotoolClient, createPATAuth, type AudiotoolClient } from "@audiotool/nexus";
import { createDiskWasmLoader, createNodeTransport } from "@audiotool/nexus/node";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DUMP_DIR = path.join(ROOT, "dumps");
const RPC_BASE = "https://rpc.audiotool.com";
const GET_ENTITIES_URL = `${RPC_BASE}/audiotool.document.v1.DocumentService/GetEntities`;
const DEFAULT_LIMIT = 5;

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type JsonObject = { [k: string]: Json };

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

async function loadDotEnv(): Promise<void> {
  try {
    const text = await readFile(path.join(ROOT, ".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      if (trimmed.startsWith("at_pat_") && !("AT_PAT" in process.env)) {
        process.env.AT_PAT = trimmed;
        continue;
      }
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // no .env file
  }
}

function parseArgs(argv: string[]): { limit: number } {
  const limitIdx = argv.indexOf("--limit");
  const raw = limitIdx >= 0 ? argv[limitIdx + 1] : undefined;
  const limit = raw !== undefined ? Number.parseInt(raw, 10) : DEFAULT_LIMIT;
  return { limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT };
}

function unwrap<T>(value: T | Error, label: string): T {
  if (value instanceof Error) {
    throw new Error(`${label}: ${value.message}`, { cause: value });
  }
  return value;
}

function protoToJson(value: unknown): Json {
  if (value === null || value === undefined) return null;
  if (typeof value === "function") return null;
  if (typeof value !== "object") {
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
      return value;
    }
    return String(value);
  }
  if (value instanceof Uint8Array) {
    return { byteLength: value.byteLength };
  }
  const maybe = value as { toJson?: () => unknown };
  if (typeof maybe.toJson === "function") {
    return protoToJson(maybe.toJson());
  }
  if (Array.isArray(value)) return value.map(protoToJson);
  const out: JsonObject = {};
  for (const [k, v] of Object.entries(value)) {
    if (k.startsWith("$") || k.startsWith("_")) continue;
    if (typeof v === "function") continue;
    out[k] = protoToJson(v);
  }
  return out;
}

function asObject(value: Json): JsonObject {
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
  const obj = value === undefined ? {} : asObject(value);
  return typeof obj.entityId === "string" && obj.entityId.length > 0 ? obj.entityId : undefined;
}

function typeUrlToKey(typeUrl: string): string {
  const last = typeUrl.split(".").pop() ?? typeUrl;
  return last.length === 0 ? typeUrl : last.charAt(0).toLowerCase() + last.slice(1);
}

function stripHeavyFields(value: Json): Json {
  if (Array.isArray(value)) return value.map(stripHeavyFields);
  if (value === null || typeof value !== "object") {
    if (typeof value === "string" && value.length > 8_000) {
      return { truncatedStringChars: value.length };
    }
    return value;
  }
  const out: JsonObject = {};
  for (const [k, v] of Object.entries(value)) {
    if (k === "state" || k === "data" || /bytes|wav|audio/i.test(k) && typeof v === "string" && v.length > 400) {
      out[k] = { omitted: true, chars: typeof v === "string" ? v.length : null };
      continue;
    }
    out[k] = stripHeavyFields(v);
  }
  return out;
}

type EntityDump = {
  id: string;
  type: string;
  typeUrl: string;
  fields: JsonObject;
};

function entitiesFromGetEntitiesResponse(body: JsonObject): EntityDump[] {
  const raw = Array.isArray(body.entities) ? body.entities : [];
  const out: EntityDump[] = [];
  for (const item of raw) {
    const obj = asObject(item);
    const typeUrl = str(obj["@type"]);
    const { ["@type"]: _t, id, ...fields } = obj;
    out.push({
      id: str(id),
      type: typeUrlToKey(typeUrl),
      typeUrl,
      fields,
    });
  }
  return out;
}

function countByType(entities: EntityDump[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of entities) counts[e.type] = (counts[e.type] ?? 0) + 1;
  return Object.fromEntries(
    Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  );
}

function summarize(entities: EntityDump[]): Json {
  const byType = new Map<string, EntityDump[]>();
  for (const e of entities) {
    const list = byType.get(e.type) ?? [];
    list.push(e);
    byType.set(e.type, list);
  }

  const config = byType.get("config")?.[0]?.fields ?? {};

  const devices = entities
    .filter((e) => DESKTOP_TYPES.has(e.type))
    .map((e) => ({
      id: e.id,
      type: e.type,
      displayName: str(e.fields.displayName) || undefined,
      positionX: num(e.fields.positionX),
      positionY: num(e.fields.positionY),
      presetName: str(e.fields.presetName) || undefined,
      isActive: bool(e.fields.isActive),
    }));

  const cables = (type: "desktopAudioCable" | "desktopNoteCable") =>
    (byType.get(type) ?? []).map((e) => ({
      id: e.id,
      from: locId(e.fields.fromSocket),
      to: locId(e.fields.toSocket),
      colorIndex: num(e.fields.colorIndex),
    }));

  const mixerChannels = (byType.get("mixerChannel") ?? []).map((e) => {
    const display = asObject(e.fields.displayParameters);
    const fader = asObject(e.fields.faderParameters);
    return {
      id: e.id,
      displayName: str(display.displayName) || undefined,
      colorIndex: num(display.colorIndex),
      orderAmongStrips: num(display.orderAmongStrips),
      postGain: num(fader.postGain),
      panning: num(fader.panning),
      isMuted: bool(fader.isMuted),
      isSoloed: bool(fader.isSoloed),
    };
  });

  const notes = byType.get("note") ?? [];
  const pitches = notes.map((n) => num(n.fields.pitch)).filter((p): p is number => p !== undefined);
  const velocities = notes.map((n) => num(n.fields.velocity)).filter((v): v is number => v !== undefined);

  const xs = devices.map((d) => d.positionX).filter((v): v is number => v !== undefined);
  const ys = devices.map((d) => d.positionY).filter((v): v is number => v !== undefined);

  return {
    config: {
      tempoBpm: num(config.tempoBpm),
      signatureNumerator: num(config.signatureNumerator),
      signatureDenominator: num(config.signatureDenominator),
      durationTicks: num(config.durationTicks),
      baseFrequencyHz: num(config.baseFrequencyHz),
    },
    entityCounts: countByType(entities),
    desktop: {
      deviceCount: devices.length,
      bounds:
        xs.length && ys.length
          ? {
              minX: Math.min(...xs),
              maxX: Math.max(...xs),
              minY: Math.min(...ys),
              maxY: Math.max(...ys),
            }
          : null,
      devices,
      audioCables: cables("desktopAudioCable"),
      noteCables: cables("desktopNoteCable"),
    },
    mixer: {
      channelCount: mixerChannels.length,
      channels: mixerChannels,
      groupCount: byType.get("mixerGroup")?.length ?? 0,
      auxCount: byType.get("mixerAux")?.length ?? 0,
    },
    timeline: {
      noteTracks: byType.get("noteTrack")?.length ?? 0,
      audioTracks: byType.get("audioTrack")?.length ?? 0,
      patternTracks: byType.get("patternTrack")?.length ?? 0,
      automationTracks: byType.get("automationTrack")?.length ?? 0,
      noteRegions: byType.get("noteRegion")?.length ?? 0,
      audioRegions: byType.get("audioRegion")?.length ?? 0,
      patternRegions: byType.get("patternRegion")?.length ?? 0,
      automationRegions: byType.get("automationRegion")?.length ?? 0,
      notes: {
        count: notes.length,
        pitchMin: pitches.length ? Math.min(...pitches) : undefined,
        pitchMax: pitches.length ? Math.max(...pitches) : undefined,
        velocityMean:
          velocities.length === 0
            ? undefined
            : Math.round((velocities.reduce((a, b) => a + b, 0) / velocities.length) * 1000) / 1000,
      },
      automationEvents: byType.get("automationEvent")?.length ?? 0,
    },
    patterns: {
      tonematrix: byType.get("tonematrix")?.length ?? 0,
      tonematrixPattern: byType.get("tonematrixPattern")?.length ?? 0,
      beatbox8: byType.get("beatbox8")?.length ?? 0,
      beatbox8Pattern: byType.get("beatbox8Pattern")?.length ?? 0,
      beatbox9: byType.get("beatbox9")?.length ?? 0,
      beatbox9Pattern: byType.get("beatbox9Pattern")?.length ?? 0,
      bassline: byType.get("bassline")?.length ?? 0,
      basslinePattern: byType.get("basslinePattern")?.length ?? 0,
      machiniste: byType.get("machiniste")?.length ?? 0,
      machinistePattern: byType.get("machinistePattern")?.length ?? 0,
      rasselbock: byType.get("rasselbock")?.length ?? 0,
      rasselbockPattern: byType.get("rasselbockPattern")?.length ?? 0,
    },
  };
}

function projectId(name: string): string {
  const match = name.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match?.[0] ?? name.replace(/[^\w.-]+/g, "_");
}

function updateTimeMs(project: JsonObject): number {
  const raw = project.updateTime ?? project.update_time;
  if (typeof raw === "string") {
    const t = Date.parse(raw);
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

function isLibraryOrRemix(project: JsonObject): boolean {
  const display = str(project.displayName);
  if (str(project.remixOfTrackName)) return true;
  if (/^Curated:/i.test(display)) return true;
  if (/sample testing/i.test(display)) return true;
  if (/\b(Drums|Percussion|Kicks|Kit)\b/i.test(display) && !/recabled|Beast|Block/i.test(display)) {
    return true;
  }
  return false;
}

async function listAllProjects(client: AudiotoolClient): Promise<JsonObject[]> {
  const out: JsonObject[] = [];
  let pageToken = "";
  for (let page = 0; page < 20; page++) {
    const response = unwrap(
      await client.projects.listProjects({
        pageSize: 50,
        pageToken,
        orderBy: "project.update_time desc",
      }),
      "listProjects"
    );
    const rec = asObject(protoToJson(response));
    const projects = Array.isArray(rec.projects) ? rec.projects : [];
    for (const p of projects) {
      if (p !== null && typeof p === "object" && !Array.isArray(p)) out.push(p);
    }
    const next = str(rec.nextPageToken);
    if (!next) break;
    pageToken = next;
  }
  return out;
}

async function getEntities(client: AudiotoolClient, projectName: string): Promise<EntityDump[]> {
  const sessionRes = unwrap(await client.projects.openSession({ projectName }), "openSession");
  const sessionJson = asObject(protoToJson(sessionRes));
  const session = asObject(sessionJson.session);
  const base = str(session.documentServiceUrl).replace(/\/$/, "");
  if (!base) throw new Error("openSession returned no documentServiceUrl");
  const url = `${base}/audiotool.document.v1.DocumentService/GetEntities`;
  console.log(`  document service ${base}`);

  const pat = process.env.AT_PAT?.trim() ?? "";
  const res = unwrap(
    await client.authorizedFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Connect-Protocol-Version": "1",
        "Connect-Timeout-Ms": "120000",
        Authorization: pat.startsWith("Bearer ") ? pat : `Bearer ${pat}`,
      },
      body: JSON.stringify({
        projectName,
        filter: "",
        commitIndex: "0",
      }),
    }),
    "GetEntities fetch"
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GetEntities ${res.status}: ${text.slice(0, 500)}`);
  }
  let body: JsonObject;
  try {
    body = JSON.parse(text) as JsonObject;
  } catch {
    throw new Error(`GetEntities invalid JSON: ${text.slice(0, 200)}`);
  }
  if (typeof body.code === "string") {
    throw new Error(`GetEntities ${body.code}: ${str(body.message)}`);
  }
  return entitiesFromGetEntitiesResponse(body);
}

function pickProjects(projects: JsonObject[], limit: number): JsonObject[] {
  const originals = projects.filter((p) => !isLibraryOrRemix(p));
  const preferredNames = [
    "strange desktop patching",
    "Designer Setup",
    "Beast Within",
    "Wave the Shape",
    "The Block",
    "Que pt2",
    "Piano Grain",
    "Shots",
  ];
  const chosen: JsonObject[] = [];
  const used = new Set<string>();
  for (const want of preferredNames) {
    const hit = originals.find((p) => str(p.displayName) === want);
    if (hit && !used.has(str(hit.name))) {
      chosen.push(hit);
      used.add(str(hit.name));
    }
    if (chosen.length >= limit) return chosen;
  }
  for (const p of originals) {
    const name = str(p.name);
    if (!name || used.has(name)) continue;
    chosen.push(p);
    used.add(name);
    if (chosen.length >= limit) break;
  }
  return chosen;
}

async function main(): Promise<void> {
  await loadDotEnv();
  const { limit } = parseArgs(process.argv.slice(2));
  const pat = process.env.AT_PAT?.trim();
  if (!pat) {
    console.error("Missing AT_PAT. Create a token at https://developer.audiotool.com/personal-access-tokens");
    process.exit(1);
  }

  await mkdir(DUMP_DIR, { recursive: true });

  console.log("Creating Audiotool client…");
  const client = await createAudiotoolClient({
    auth: createPATAuth(pat),
    transport: createNodeTransport(),
    wasm: createDiskWasmLoader(),
  });

  console.log("Listing projects…");
  const projects = await listAllProjects(client);
  projects.sort((a, b) => updateTimeMs(b) - updateTimeMs(a));
  await writeFile(path.join(DUMP_DIR, "projects-index.json"), JSON.stringify(projects, null, 2), "utf8");
  console.log(`Wrote ${projects.length} project(s) to dumps/projects-index.json`);

  const chosen = pickProjects(projects, limit);
  const overview: Json[] = [];

  for (const project of chosen) {
    const name = str(project.name);
    const displayName = str(project.displayName) || name;
    if (!name) continue;
    const id = projectId(name);
    const dir = path.join(DUMP_DIR, id);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "meta.json"), JSON.stringify(project, null, 2), "utf8");

    console.log(`GetEntities ${displayName} (${name})…`);
    try {
      const entities = await getEntities(client, name);
      const types = countByType(entities);
      const summary = summarize(entities);
      await writeFile(path.join(dir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
      await writeFile(
        path.join(dir, "entities.json"),
        JSON.stringify(
          entities.map((e) => ({
            id: e.id,
            type: e.type,
            fields: stripHeavyFields(e.fields),
          })),
          null,
          2
        ),
        "utf8"
      );
      overview.push({
        name,
        displayName,
        bpm: project.bpm,
        playDuration: project.playDuration,
        genreName: project.genreName,
        tags: project.tags,
        coverUrl: project.coverUrl,
        snapshotUrl: project.snapshotUrl,
        entityCount: entities.length,
        entityCounts: types,
      });
      console.log(
        `  ${entities.length} entities — top: ${Object.entries(types)
          .slice(0, 8)
          .map(([t, n]) => `${t}:${n}`)
          .join(", ")}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  failed: ${message}`);
      overview.push({ name, displayName, error: message });
    }
  }

  await writeFile(path.join(DUMP_DIR, "overview.json"), JSON.stringify(overview, null, 2), "utf8");
  console.log("Wrote dumps/overview.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
