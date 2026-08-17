export type ProjectKind = "arrangement" | "patch" | "textile" | "sketch";

export type ModeId =
  | "timeline"
  | "setup"
  | "constellation"
  | "cathedral"
  | "island"
  | "jacquard"
  | "calligram"
  | "beatfield"
  | "skyline";

export type VariantKind = "view" | "printing";
export type ModeStatus = "ready" | "coming-soon";

export type VizDevice = {
  id: string;
  type: string;
  displayName?: string;
  x: number;
  y: number;
  isActive?: boolean;
};

export type VizCable = {
  id: string;
  from: string;
  to: string;
  colorIndex?: number | null;
  kind: "audio" | "note";
  fromPort?: number;
  toPort?: number;
};

export type VizTrack = {
  id: string;
  kind: "note" | "audio" | "automation";
  order: number;
  enabled: boolean;
  playerId?: string;
  label: string;
};

export type VizRegion = {
  id: string;
  trackId: string;
  kind: "note" | "audio" | "automation";
  positionTicks: number;
  durationTicks: number;
  loopDurationTicks?: number;
  enabled: boolean;
  colorIndex?: number | null;
  displayName?: string;
  collectionId?: string;
  noteCount: number;
  velocitySum: number;
};

export type VizNote = {
  collectionId: string;
  positionTicks: number;
  durationTicks: number;
  pitch: number;
  velocity: number;
};

export type VizMixerStrip = {
  id: string;
  kind: "channel" | "group" | "aux";
  displayName?: string;
  colorIndex?: number | null;
  order: number;
  postGain?: number;
  muted?: boolean;
  soloed?: boolean;
};

export type VizPatternCell = {
  machineId: string;
  machineType: string;
  slot: number;
  row: number;
  col: number;
};

export type VizShaper = {
  id: string;
  displayName?: string;
  kind?: "waveshaper" | "curve";
  x?: number;
  y?: number;
  anchors: { x: number; y: number }[];
};

export type VizProject = {
  id: string;
  name: string;
  bpm: number;
  sigNum: number;
  sigDen: number;
  durationTicks: number;
  kind: ProjectKind;
  suggestedMode: ModeId;
  devices: VizDevice[];
  cables: VizCable[];
  tracks: VizTrack[];
  regions: VizRegion[];
  notes: VizNote[];
  mixer: VizMixerStrip[];
  groupings: { childId: string; groupId: string }[];
  auxRoutes: { from: string; to: string; gain?: number }[];
  sidechains: { from: string; to: string }[];
  patterns: VizPatternCell[];
  shapers: VizShaper[];
  tags: string[];
  genreName?: string;
  facts: {
    deviceCount: number;
    namedDevices: number;
    audioCables: number;
    noteCables: number;
    noteCount: number;
    regionCount: number;
    filledPatternCells: number;
    patternBanks: number;
    mixerNames: string[];
  };
};

export type ModeDef = {
  id: ModeId;
  number: number;
  title: string;
  subtitle: string;
  status: ModeStatus;
  variantKind: VariantKind;
  variants: { id: string; label: string; axis: string }[];
};

export type RenderedPlate = {
  modeId: ModeId;
  variantId: string;
  label: string;
  axis: string;
  svg: string;
};

export type DumpListItem = {
  id: string;
  name: string;
  bpm: number;
  sig: string;
  durationTicks: number;
  kind: ProjectKind;
  suggestedMode: ModeId;
  devices: number;
  audioCables: number;
  noteCables: number;
  notes: number;
  regions: number;
  mixerNames: string[];
};
