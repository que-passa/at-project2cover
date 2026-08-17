import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dump = "dumps";
const dirs = (await readdir(dump, { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const rows = [];
for (const id of dirs) {
  const meta = JSON.parse(await readFile(path.join(dump, id, "meta.json"), "utf8"));
  const s = JSON.parse(await readFile(path.join(dump, id, "summary.json"), "utf8"));
  const devices = s.desktop?.devices ?? [];
  const types: Record<string, number> = {};
  for (const d of devices) types[d.type] = (types[d.type] ?? 0) + 1;
  const namedDevices = devices.filter((d: { displayName?: string }) => d.displayName).length;
  rows.push({
    id,
    name: meta.displayName,
    bpm: s.config?.tempoBpm ?? meta.bpm,
    sig: `${s.config?.signatureNumerator}/${s.config?.signatureDenominator}`,
    durationTicks: s.config?.durationTicks,
    coverUrl: meta.coverUrl ?? null,
    snapshotUrl: meta.snapshotUrl ?? null,
    entities: Object.values(s.entityCounts ?? {}).reduce((a: number, b: number) => a + b, 0),
    devices: s.desktop?.deviceCount,
    namedDevices,
    audioCables: s.desktop?.audioCables?.length,
    noteCables: s.desktop?.noteCables?.length,
    cableColors: [...new Set((s.desktop?.audioCables ?? []).map((c: { colorIndex?: number }) => c.colorIndex))],
    bounds: s.desktop?.bounds,
    mixerChannels: s.mixer?.channelCount,
    mixerGroups: s.mixer?.groupCount,
    mixerAux: s.mixer?.auxCount,
    mixerColors: [...new Set((s.mixer?.channels ?? []).map((c: { colorIndex?: number }) => c.colorIndex))],
    mixerNames: (s.mixer?.channels ?? []).map((c: { displayName?: string }) => c.displayName).filter(Boolean),
    timeline: s.timeline,
    patterns: s.patterns,
    deviceTypes: types,
  });
}

await writeFile("dumps/fingerprints.json", JSON.stringify(rows, null, 2), "utf8");
console.log(JSON.stringify(rows, null, 2));
