export const PREFERRED_DUMPS = ["Que pt2", "Wave the Shape", "Beast Within", "The Block"];

export const HIDDEN_DUMP_NAMES = new Set([
  "Designer Setup",
  "Shots",
  "strange desktop patching",
  "Piano Grain",
]);

export const HIDDEN_DUMP_IDS = new Set([
  "414300fb-be3e-48e1-9fea-7e68fb874170",
  "cb950c16-5c62-4270-9458-30daa5b8d259",
  "3dca6878-3a4d-5f0f-bd79-7dd5efd70049",
  "ffb64e0d-53aa-4dc7-a1b5-4c1989607a49",
]);

export function isHiddenDump(item: { id: string; name: string }): boolean {
  return HIDDEN_DUMP_IDS.has(item.id) || HIDDEN_DUMP_NAMES.has(item.name);
}

export function sortVisibleDumps<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ia = PREFERRED_DUMPS.indexOf(a.name);
    const ib = PREFERRED_DUMPS.indexOf(b.name);
    if (ia === -1 && ib === -1) return a.name.localeCompare(b.name);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}
