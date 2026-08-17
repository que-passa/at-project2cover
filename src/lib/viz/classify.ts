import type { ModeId, ProjectKind, VizProject } from "./types.js";

export function classifyKind(input: {
  noteCount: number;
  cableCount: number;
  regionCount: number;
  filledPatternCells: number;
}): ProjectKind {
  if (input.noteCount > 500) return "arrangement";
  if (input.cableCount > 40 && input.noteCount < 200) return "patch";
  if (input.filledPatternCells > 40 && input.noteCount < 50 && input.regionCount < 3) {
    return "textile";
  }
  return "sketch";
}

export function suggestedMode(kind: ProjectKind): ModeId {
  if (kind === "arrangement") return "timeline";
  if (kind === "patch") return "setup";
  if (kind === "textile") return "jacquard";
  return "constellation";
}

export function classifyFromProject(project: Pick<VizProject, "facts">): {
  kind: ProjectKind;
  suggestedMode: ModeId;
} {
  const kind = classifyKind({
    noteCount: project.facts.noteCount,
    cableCount: project.facts.audioCables + project.facts.noteCables,
    regionCount: project.facts.regionCount,
    filledPatternCells: project.facts.filledPatternCells,
  });
  return { kind, suggestedMode: suggestedMode(kind) };
}
