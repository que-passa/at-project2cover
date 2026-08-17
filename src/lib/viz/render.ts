import { renderBeatfield } from "./beatfield.js";
import { renderCalligram } from "./calligram.js";
import { renderCathedral } from "./cathedral.js";
import { renderComingSoon } from "./coming-soon.js";
import { renderConstellation } from "./constellation.js";
import { renderSkyline } from "./skyline.js";
import { renderIsland } from "./island.js";
import { renderJacquard } from "./jacquard.js";
import { modeById } from "./modes.js";
import { renderSetup } from "./setup.js";
import { renderTimeline } from "./timeline.js";
import type { ModeId, RenderedPlate, VizProject } from "./types.js";

export function renderVariant(project: VizProject, modeId: ModeId, variantId: string): string {
  if (modeId === "timeline") return renderTimeline(project, variantId);
  if (modeId === "setup") return renderSetup(project, variantId);
  if (modeId === "constellation") return renderConstellation(project, variantId);
  if (modeId === "cathedral") return renderCathedral(project, variantId);
  if (modeId === "island") return renderIsland(project, variantId);
  if (modeId === "jacquard") return renderJacquard(project, variantId);
  if (modeId === "calligram") return renderCalligram(project, variantId);
  if (modeId === "beatfield") return renderBeatfield(project, variantId);
  if (modeId === "skyline") return renderSkyline(project, variantId);
  return renderComingSoon(project, modeId);
}

export function renderMode(project: VizProject, modeId: ModeId): RenderedPlate[] {
  const mode = modeById(modeId);
  if (!mode) return [];
  if (mode.status === "coming-soon") {
    return [
      {
        modeId,
        variantId: "soon",
        label: "Coming soon",
        axis: "Placeholder colophon",
        svg: renderComingSoon(project, modeId),
      },
    ];
  }
  return mode.variants.map((v) => ({
    modeId,
    variantId: v.id,
    label: v.label,
    axis: v.axis,
    svg: renderVariant(project, modeId, v.id),
  }));
}
