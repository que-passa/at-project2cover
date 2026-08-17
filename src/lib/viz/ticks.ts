/** Audiotool Nexus: 3840 ticks per quarter note. In 4/4 that is 15360 ticks/bar. */
export const TICKS_PER_QUARTER = 3840;

export function ticksPerBar(sigNum = 4, sigDen = 4): number {
  return TICKS_PER_QUARTER * 4 * (sigNum / sigDen);
}

export function ticksToBars(ticks: number, sigNum = 4, sigDen = 4): number {
  return ticks / ticksPerBar(sigNum, sigDen);
}

export function ticksToBeats(ticks: number): number {
  return ticks / TICKS_PER_QUARTER;
}

export function formatBarBeat(ticks: number, sigNum = 4, sigDen = 4): string {
  const tpb = ticksPerBar(sigNum, sigDen);
  const bar = Math.floor(ticks / tpb) + 1;
  const beat = Math.floor((ticks % tpb) / TICKS_PER_QUARTER) + 1;
  return `${bar}.${beat}`;
}

/** Crop a 16-bar empty tail. Never use listing playDuration. */
export function cropDurationTicks(
  durationTicks: number,
  contentEndTicks: number,
  sigNum = 4,
  sigDen = 4
): number {
  const bar = ticksPerBar(sigNum, sigDen);
  const pad = bar;
  const content = Math.max(contentEndTicks + pad, bar);
  const emptyTail = 16 * bar;
  if (durationTicks - content >= emptyTail) return content;
  return Math.max(durationTicks, content);
}
