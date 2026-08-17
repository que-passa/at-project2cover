import { CONCRETE, wrapPlate } from "./svg.js";
import { modeById } from "./modes.js";
import type { ModeId, VizProject } from "./types.js";

export function renderComingSoon(project: VizProject, modeId: ModeId): string {
  const mode = modeById(modeId);
  const theme = CONCRETE;
  const bars = Math.max(4, Math.min(10, (mode?.number ?? 1) + (project.facts.deviceCount % 5)));
  let body = `<rect x="80" y="160" width="740" height="620" fill="${theme.wash}" stroke="${theme.rule}" stroke-dasharray="6 5"/>`;
  for (let i = 0; i < bars; i++) {
    const y = 220 + i * 52;
    const w = 160 + ((project.facts.noteCount + i * 41) % 460);
    const fill = i % 3 === 0 ? theme.accent : i % 3 === 1 ? theme.ink : theme.muted;
    body += `<rect x="140" y="${y}" width="${w}" height="28" fill="${fill}" opacity="${0.16 + (i % 4) * 0.12}"/>`;
  }
  return wrapPlate(body, theme);
}
