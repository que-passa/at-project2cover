import type { ModeDef } from "./types.js";

/**
 * Mode catalog for the picker.
 *
 * Variant order is product order: youth-facing register first, museum/print
 * last. Labels are cover language (what a producer picks), not research names.
 * Encoding and variant ids stay locked to the renderers.
 */
export const MODES: ModeDef[] = [
  {
    id: "timeline",
    number: 1,
    title: "Timeline",
    subtitle: "Arrangement as a color field",
    status: "ready",
    variantKind: "view",
    variants: [
      { id: "heatmap", label: "Thermal", axis: "Energy as a single-hue field" },
      { id: "gantt", label: "Stripes", axis: "Time as stacked color bars" },
      { id: "lookahead", label: "Crop", axis: "Densest 16 bars as a radial score" },
      { id: "chronicle", label: "Sections", axis: "Inferred cuts as color masses" },
    ],
  },
  {
    id: "setup",
    number: 2,
    title: "Setup / cabling",
    subtitle: "Patch as jewelry and sculpture",
    status: "ready",
    variantKind: "view",
    variants: [
      { id: "plan", label: "Jewelry", axis: "Traces, stones, hull, columns" },
      { id: "iso", label: "Sculpture", axis: "Same coordinates, one object" },
      { id: "mixer", label: "Columns", axis: "Strips as a color-field painting" },
      { id: "flow", label: "Cascade", axis: "Layered signal as jewelry" },
    ],
  },
  {
    id: "constellation",
    number: 3,
    title: "Uranometria",
    subtitle: "Desktop as a night sky",
    status: "ready",
    variantKind: "printing",
    variants: [
      { id: "nasa", label: "Instrument sky", axis: "Rings · deep field" },
      { id: "1820", label: "Ink sky", axis: "Outline · bright figure" },
      { id: "1603", label: "Copper sky", axis: "Stars · metal ink" },
      { id: "gilt", label: "Velvet sky", axis: "Dense figure · gilt" },
    ],
  },
  {
    id: "cathedral",
    number: 5,
    title: "Arc cathedral",
    subtitle: "Repeats as a rose filling the sleeve",
    status: "ready",
    variantKind: "printing",
    variants: [
      { id: "chartres", label: "Jewel", axis: "Exact repeats · dark glass" },
      { id: "blueprint", label: "Prussian", axis: "Rose only · blue field" },
      { id: "tiffany", label: "Warm glass", axis: "Pitch-class · light stone" },
      { id: "print", label: "White leading", axis: "Region-length · paper" },
    ],
  },
  {
    id: "island",
    number: 6,
    title: "Imaginary island",
    subtitle: "Desktop as a landmass in a sea",
    status: "ready",
    variantKind: "printing",
    variants: [
      { id: "usgs", label: "Relief", axis: "Activity contours · satellite" },
      { id: "walter", label: "Night map", axis: "Towns + roads · dense land" },
      { id: "gill", label: "Roads", axis: "Audio roads · note ferries" },
      { id: "ortelius", label: "Coast", axis: "Coast + towns · quiet sea" },
    ],
  },
  {
    id: "jacquard",
    number: 7,
    title: "Pattern jacquard",
    subtitle: "Filled cells as a textile sleeve",
    status: "ready",
    variantKind: "printing",
    variants: [
      { id: "punch", label: "Punch", axis: "One band · digital textile" },
      { id: "albers", label: "Stacked", axis: "Nested fields" },
      { id: "festival", label: "Blanket", axis: "Every machine" },
      { id: "stripe", label: "Warp", axis: "Vertical sett" },
    ],
  },
  {
    id: "calligram",
    number: 8,
    title: "Calligram cover",
    subtitle: "Field, groove, and voice marks",
    status: "ready",
    variantKind: "printing",
    variants: [
      { id: "scher", label: "Slab", axis: "Hero hue · one word mass" },
      { id: "saville", label: "Groove", axis: "Vinyl geometry · duration" },
      { id: "letterpress", label: "Stamp", axis: "Impressed slabs" },
      { id: "mallarme", label: "Breath", axis: "Ink and open field" },
    ],
  },
  {
    id: "beatfield",
    number: 11,
    title: "Beat field",
    subtitle: "Moiré from overlapping voices",
    status: "ready",
    variantKind: "printing",
    variants: [
      { id: "phosphor", label: "Phosphor", axis: "CRT bloom · instrument green" },
      { id: "offset", label: "Offset", axis: "CMY misregister" },
      { id: "solarized", label: "Solarized", axis: "Photogram bands" },
      { id: "lithograph", label: "Lithograph", axis: "Quiet engraved rings" },
    ],
  },
  {
    id: "skyline",
    number: 12,
    title: "Onset lines",
    subtitle: "Plotter strokes from the piano roll",
    status: "ready",
    variantKind: "printing",
    variants: [
      { id: "lamps", label: "Lamps", axis: "Parallel strokes · night sheet" },
      { id: "overcast", label: "Polar", axis: "Radial plot · HUD" },
      { id: "dawn", label: "Contour", axis: "Voice outlines" },
      { id: "etch", label: "Etch", axis: "Engraved hatch" },
    ],
  },
];

export function modeById(id: string): ModeDef | undefined {
  return MODES.find((m) => m.id === id);
}
