# Concrete visualizations: timeline and setup / cabling

This note surveys **operational** image methods for two modes: (1) a project **timeline** as a still picture, and (2) a **setup / cabling / physical-layout** picture. It is grounded in the Audiotool document dumps already in this repo (eight originals under `dumps/`, summarized in `dumps/fingerprints.json` and `BRIEFING.md`). It does **not** catalog creative/metaphor modes, and it does **not** survey image-generation models, ControlNet, prompt pipelines, or variant-picker UX. Where a method’s readability depends on exact geometry and type, it notes that **SVG / code-rendered** output will beat a photoreal pass; that is a quality judgment for these two modes, not a model survey.

---

## Project data that actually exists for these two modes

This repository is not a construction-PM or live-tour database. There are **no people, rooms, venues, rack U-heights, cable lengths, connector types, RF assignments, or power/distro circuits**. The “project” is an Audiotool studio document. The useful mapping is:

| Operational analog | What the document actually has |
| --- | --- |
| Calendar / clock | Musical time: `config.tempoBpm`, `signatureNumerator` / `signatureDenominator`, `durationTicks`. Regions and notes use `positionTicks` + `durationTicks`. Project metadata also has `updateTime` / `playDuration`, but those are file timestamps, not arrangement time. |
| Tasks / scenes | `noteRegion`, `audioRegion`, `patternRegion`, `automationRegion` — each a `Region` with `displayName`, `colorIndex`, loop fields, `isEnabled`, plus a pointer to a collection and a track. |
| Workstreams / trades | `noteTrack`, `audioTrack`, `patternTrack`, `automationTrack` with `orderAmongTracks`, `isEnabled`, optional `groove`, and a `player` pointer to a desktop device. **Tracks have no display name**; the readable label is the player device’s `displayName` (e.g. “Drums”, “_CHORDS”, “Arp 1”). |
| People / roles | None. Closest stand-ins: mixer strip names (`Soft Kick`, `Bd-Sn`, `Glowy B`) and device `displayName`s. |
| Equipment | Desktop devices with `type`, `displayName`, `presetName`, `positionX` / `positionY`, `isActive`. Types include instruments (Heisenberg, Pulverisateur, Machiniste, Gakki, …), FX (stompboxes, Quasar, Gravity, Curve, Waveshaper), and graph utilities (audioSplitter / audioMerger, noteSplitter, Centroid, MiniMixer). |
| Cables | `desktopAudioCable` and `desktopNoteCable`: `fromSocket` / `toSocket` (`entityId` + `fieldIndex`), `colorIndex`. Mixer layer: `mixerSideChainCable`, `mixerAuxRoute` (gain + send/receive), `mixerStripGrouping` (tree into groups; ungrouped strips implicit to master). |
| Rooms / floor | Desktop canvas bounds only. Que pt2 spans roughly (−5399,−2182)→(3249,5129); Designer Setup (−4724,−580)→(2634,6908); “strange desktop patching” is even wider. There is no stage, no rack, no room polygon. |
| Power / RF / snake | Absent. Do not invent them. |

**Tick grain observed in dumps.** Many regions use `durationTicks` of 61440, 122880, or 245760 (the last also appears as default `config.durationTicks` on sketches). That is consistent with a 16-bar / 32-bar / 64-bar grid at a high PPQ (e.g. 960 ticks/quarter → 61440 ticks = 16 bars in 4/4). Que pt2’s `durationTicks` 1,950,720 at 131 BPM 4/4 is a long arrangement (~32× the 64-bar default if that mapping holds). Convert ticks → bars/beats/seconds before drawing any scale; never plot raw tick integers as axis labels.

**Library shapes that any timeline or cabling image must survive:**

| Kind | Examples | Timeline density | Cabling density |
| --- | --- | --- | --- |
| Finished song | Que pt2 (2,046 notes, 87 note regions, 18 note + 4 audio + 31 automation tracks, 78 audio cables, 21 mixer channels / 5 groups / 8 sidechains) | High | Medium, mostly one cable color (40) |
| Finished song | Wave the Shape (3,794 notes, 61 note + 7 audio regions, 62 cables, 14 channels) | Highest | Medium |
| Rack / patch | Designer Setup (138 devices, 153 audio cables, 2 note regions, 61 notes) | Almost empty — **do not fake a piano roll** | Highest |
| Rack / patch | strange desktop patching (45 devices, 62 audio + 4 note cables, **17 cable colors**, 0 notes, 0 regions) | Empty | High, color-expressive |
| Pattern museum | Shots (35 devices, **0 cables**, 0 notes, full Beatbox / Tonematrix / Machiniste / Rasselbock banks) | Empty | Empty — cabling mode must not invent wires |
| Sketch | Beast Within (1 device, 7 named-capable regions, 72 notes); The Block (1 audio region); Piano Grain (1 automation region) | Sparse | 1–3 cables |

**Region fields that drive a still timeline.** From `Region`: `positionTicks`, `durationTicks`, `collectionOffsetTicks`, `loopOffsetTicks`, `loopDurationTicks`, `isEnabled`, `colorIndex`, `displayName`. Que pt2 already names clips (`PT2`, `LONG 1st`, `PT3`). Notes add `pitch`, `velocity`, `doesSlide`. Audio regions add `gain`, fade in/out ticks + slope, `timestretchMode`, `pitchShiftSemitones`, sample pointer. Automation events are a third time series (Que pt2: 131; Wave the Shape: 299).

**Cabling fields that drive a still layout.** Device `positionX`/`positionY` is a real 2D floor. Cables are directed socket-to-socket, not just device-to-device — `fieldIndex` is the port. Mixer is a **second graph**: channel → (optional group tree) → master, plus aux sends and sidechain. Centroid devices expose many `centroidChannel` children (Designer Setup: 64; strange desktop: 33) — a patchbay-like fan-in sitting on the desktop.

**What is missing and must not be hallucinated.** People, call times, rooms, U-space, connector gender, cable length/AWG, RF frequencies, IP addresses, phantom power, monitor mixes, audience orientation. A setup image can **analogize** mixer strips to a rack and desktop clusters to “zones,” but the source of truth is the document graph, not a venue.

---

## Timeline methods

A static timeline image has no hover, no zoom, no playhead scrub. Readability therefore comes from **lane discipline, type hierarchy, color with a job, and honest scale** (including scale breaks). Tufte’s relevant rules: high data-ink; layering and separation (gray context, bright data); micro/macro reading (whole song readable at arm’s length, clip names readable up close); smallest effective difference; **direct labels instead of a remote legend**; words on the plot. Photoreal “DAW screenshot” or painted Gantt usually fails these. **Prefer SVG/canvas → PNG** for this mode.

### Shared failure modes (all timeline methods)

- **Sparse dates / empty arrangement.** Designer Setup has 19 note tracks and 7 audio tracks but only 2 note regions. A Gantt of empty lanes is a lie. Collapse unused tracks, or refuse the timeline mode and point at cabling.
- **Overlapping events.** Multiple regions on one track; looped regions whose `loopDurationTicks` ≠ `durationTicks` (Que pt2 “LONG 1st”: duration 61440, loop 245760); notes that overlap with `doesSlide`. Need either stacking, a second micro-row, or a loop hatch.
- **Too many items.** Wave the Shape: 3,794 notes. Note-level drawing at poster size becomes noise unless aggregated (region bars + optional density fill).
- **Unnamed tracks.** Lane labels must join `track.player` → device `displayName`, then mixer strip name if the device hits a named channel. Fallback: device type.
- **Automation flood.** Que pt2’s 31 automation tracks will drown the arrangement if drawn at equal weight. Park them in a collapsed band or a sparkline gutter.
- **Default-length sketches.** Several projects sit at `durationTicks` 245760 with almost no regions. Drawing a full 64-bar ruler for one clip wastes the frame; crop to content + a small pad.

### 1. Classic Gantt (arrangement chart)

**What it is.** Henry Gantt’s bar chart: rows = workstreams, x = time, bar = interval. In a DAW this is the arrange view (Ableton Session/Arrangement, Pro Tools Edit, Logic Tracks). In PM tools: Microsoft Project, Primavera P6, GanttProject.

**When it shines.** Songs with real regions across several tracks (Que pt2, Wave the Shape, Beast Within). The question it answers: *what plays when, on which player.*

**Data needed.** Tracks (`orderAmongTracks`, `isEnabled`, `player`), regions (`positionTicks`, `durationTicks`, `colorIndex`, `displayName`, `isEnabled`, loop fields), `config` for the axis. Optional: note-count or velocity mean per region as bar fill; mixer `colorIndex` as lane tint.

**Strengths.** Instantly familiar; interval length is the data; overlaps are visible; four variants (density / grain / orientation / styling) are cheap because the geometry is the same.

**Weaknesses.** Empty tracks waste height; 50+ tracks (if automation is included) force unreadably thin rows; no dependency story; looped clips look like solid bars unless hatched.

**Four variants?** Yes — this is the **canonical** timeline mode. Variants should change density, grain, and orientation, not invent a new metaphor.

**Data → image.** Template: labeled swimlanes + time ruler in bars (and a secondary seconds scale from BPM). Place each region as a rounded bar; hatch if `loopDurationTicks < durationTicks` or if the collection is reused. Direct-label bars whose width exceeds a type threshold; omit labels on thin clips and keep a numbered callout strip. **Code-rendered.** A free-generated “Gantt-looking” image will misalign bars to the ruler.

### 2. PERT / network (precedence diagram)

**What it is.** Program Evaluation and Review Technique / CPM: nodes = activities or milestones, arrows = precedence, optional three-point time estimates and a critical path. Activity-on-node (AON) is the modern form (PMI / AACE).

**When it shines.** When the story is *order and dependence*, not clock time — e.g. “intro collection is reused in the drop,” or “this audio region’s sample is shared.” Poor as a default for musical time, because music is mostly parallel, not finish-to-start.

**Data needed.** Explicit predecessors **do not exist**. You can only *infer*: same-track sequence; shared `collection` / `sample` pointers; mixer sidechain (kick → compressor); desktop note-cable (arp → synth). Inventing a critical path would be dishonest.

**Strengths.** Makes reuse and routing causality visible; compact when few nodes.

**Weaknesses.** Drops duration; dense songs become hairballs; viewers expect a clock and do not get one.

**Four variants?** Weak. One inferred-dependency diagram is enough as an *inset* or as a cabling-mode cousin, not as four timeline looks.

**Data → image.** Template graph: region (or collection) nodes, edges for “next on track” and “shares collection.” Layer with Sugiyama (see cabling). **Code-rendered.** Do not free-generate node positions.

### 3. Swimlanes (grouped Gantt)

**What it is.** Gantt with super-rows: lanes grouped by organization (UX: swimlane diagrams; construction: trade lanes; film: department).

**When it shines.** Que pt2 / Wave the Shape, where mixer groups (`Arp`, drum buses) and device families already cluster the arrangement. Groups: note vs audio vs automation; or mixer group membership; or device type (drums / synth / FX / VST).

**Data needed.** Same as Gantt, plus `mixerStripGrouping`, mixer `displayName` / `colorIndex`, device `type`.

**Strengths.** Cuts track count without dropping data; color can mean *group* while bar chroma means *clip*.

**Weaknesses.** A device that feeds two groups (sidechain, aux) fights a single lane; grouping rules must be deterministic or the four variants will disagree about identity.

**Four variants?** Yes, as a **grouping axis** inside Gantt (by mixer group vs by track type vs by device family vs flat). That is a variant, not a new mode.

**Data → image.** Same Gantt template with band headers and hairline separators. Gray the group band; keep clip colors. **Code-rendered.**

### 4. Calendar heatmap (bar × lane matrix)

**What it is.** GitHub contribution calendar, calendar heatmaps in *The New York Times* graphics, Minard-like small multiples of intensity. Cells, not bars.

**When it shines.** High note counts where individual clips are less interesting than *where energy sits*: Wave the Shape, Que pt2. Also the only honest “timeline” for a pattern museum if you treat pattern steps as a grid (Shots) — but that borders on a different mode; for *this* mode, heatmap = notes or region occupancy per bar × track.

**Data needed.** Notes (`positionTicks`, `durationTicks`, `velocity`) or region occupancy; track order; bar size from time signature.

**Strengths.** Survives thousands of notes; shows drops/breaks as white space; small-multiple friendly (one heatmap per section).

**Weaknesses.** Loses clip names and exact in/out; sequential color maps lie if used as rainbow; empty projects look like blank graph paper.

**Four variants?** Yes as a **density/grain** variant of Gantt (occupancy vs velocity-sum vs unique-pitch count), not as four separate metaphors.

**Data → image.** Bin ticks to bars (or 8ths). Sequential single-hue scale from mixer/region color. Direct-label only the hottest cells or section headers. **Code-rendered** — heatmaps from image models smear bins.

### 5. Vertical chronicle (annotated column)

**What it is.** Museum wall timelines (Smithsonian, British Museum “History of the World in 100 Objects” style), newspaper chronology columns, Tufte’s “narratives of space and time.” Time runs **down**; events are callouts left/right of a spine.

**When it shines.** Sparse, named structure: Beast Within (7 regions, 72 notes, one player); a song whose regions are already titled (`PT2`, `LONG 1st`). Also a good **poster crop** of a dense song if you first collapse to sections (contiguous bars where the set of active players changes).

**Data needed.** A short list of dated events: section boundaries (inferred from region on/off), named regions, tempo (single value today — no tempo map in the dumps except a `tempoAutomationTrack` type existing in the schema).

**Strengths.** Best typography vehicle; readable as a cover-sized still; does not require 20 lanes.

**Weaknesses.** Inventing “chapters” on a through-composed track is editorial; dense polyphony has no single spine.

**Four variants?** Yes as an **orientation** variant (vertical vs horizontal Gantt) and as a **grain** variant (section chronicle vs clip chronicle).

**Data → image.** Detect sections → spine + alternating labels + optional miniature Gantt thumbnail. **Code-rendered** for alignment; a photoreal “museum plaque” pass would destroy measurable time.

### 6. Subway-map timeline (Beck / MetroViz)

**What it is.** Harry Beck’s 1931 London Underground map: lines = workstreams, stations = milestones, transfers = shared events. Modern tools: MetroViz, many “roadmap as tube map” posters. Octilinear routing (0°/45°/90°).

**When it shines.** A handful of long-lived players that appear, drop out, and re-enter (Que pt2’s named mixer channels). Transfers = a region collection reused across tracks, or a sidechain meeting.

**Data needed.** Tracks as lines; section or named-region starts as stations; optional transfer edges from shared collections / sidechains.

**Strengths.** Memorable; good at “who is playing together”; four color lines map cleanly onto mixer `colorIndex`.

**Weaknesses.** Octilinear routing **moves stations off true time** unless a time axis is forced (MetroViz keeps x = time). Without that, it becomes a metaphor map — out of scope if it stops being a clock. Too many lines (31 automation tracks) is unreadable.

**Four variants?** One or two (time-aligned tube vs purely topological). Not four. Keep it as a **styling** variant of swimlanes, with x still = time.

**Data → image.** Assign each active player a line color from mixer/device; stations at section changes; octilinear polylines with x locked to bars. **Code-rendered** (octilinear routers exist; free generation will miss stations).

### 7. Cinematic storyboard / film strip

**What it is.** Storyboard panels (one keyframe per beat of the story) or a contact sheet / filmstrip of frames. Related but different: the **production stripboard** (below).

**When it shines.** When you can emit a **small multiple of arrangement thumbnails** — e.g. one panel per 8 or 16 bars, each a mini piano-roll or region stack. Que pt2’s named parts (`PT2`, `PT3`) are natural panel titles.

**Data needed.** Same as Gantt, sliced by bar ranges; optional note thumbnails in each panel.

**Strengths.** Matches “~4 variants” culture (four frames of the *same* song at different grains); readable on a square cover if limited to 4–12 panels.

**Weaknesses.** Not a single clock; comparison across panels needs a shared y-scale (same tracks in the same order — Tufte small multiples).

**Four variants?** The strip *is* a small-multiple layout. Changing panel grain (4 vs 16 bars) is a variant axis, not a new mode.

**Data → image.** Shared lane template, repeated; title each panel with bar range + dominant region name. **Code-rendered.**

### 8. Annotated chronology poster (infographic timeline)

**What it is.** Landscape posters: axis, milestone ticks, short paragraphs, sometimes a second quantitative track (Nigel Holmes; *National Geographic* timelines; Tufte’s integration of words and numbers).

**When it shines.** One hero song you would hang: title, BPM, key-ish range (`pitchMin`–`pitchMax`), duration, then 6–12 annotated moments (first audio region, first time all drum channels fire, named clip, automation burst).

**Data needed.** Config + a **ranked** event list (do not annotate every region). Ranking: named regions first, then occupancy jumps, then automation-event density peaks.

**Strengths.** Highest verbal information; good cover.

**Weaknesses.** Editorial ranking; fails on Designer Setup / Shots (nothing to chronicle).

**Four variants?** Typography/density variants only.

**Data → image.** Template poster grid: header stats, main Gantt or spine, numbered callouts. **Code-rendered** type; do not let a model place the numbers.

### 9. Information-design sources applied to *this* data

**Tufte.** *The Visual Display of Quantitative Information* (data-ink, lie factor, words on graphics); *Envisioning Information* (layering/separation, small multiples, micro/macro, smallest effective difference); *Visual Explanations* (confections — but keep this mode operational). Practical consequences: mute the grid; do not use a 20-color legend; put “Soft Kick · bar 17” on the bar; show a sparkline of note density *in the same frame* as the Gantt.

**Museum exhibition timelines.** Spine + objects. Here the “objects” are named devices or mixer strips, not artifacts. Use only when the event list is short.

**Film production stripboard (Movie Magic Scheduling, StudioBinder, Scenechronize).** One **colored strip per scene**, fields: scene number, INT/EXT, D/N, page eighths, cast, location; black day-break strips. **Map:** one strip per region (or per section), color = `region.colorIndex` or mixer color, “cast” = player device name, “location” = mixer group, “pages” = duration in bars, day-break = inferred section boundary. This is the best **vertical, high-type** still when region names exist. It is *not* a storyboard of pictures.

**Construction look-ahead (2–6 week lookahead, Last Planner / P6 fragment).** A zoomed window of a master Gantt with readiness flags. **Map:** a “look-ahead” is a **time-grain variant** — e.g. only the chorus window, or only bars where occupancy ≥ N players. Constraint columns (permits, material) have **no analog**; do not draw red flags you cannot source. The useful idea is **crop + detail**, not construction chrome.

**Festival / broadcast rundown (show flow, cue sheet).** Rows = cues in clock order; columns = time, item, who, notes. Used by stage managers and A-1s. **Map:** flatten all enabled regions to a single chronological table (start bar, end bar, player, name, color swatch). Best as a **companion strip under** a Gantt, or as the vertical variant when track count is 1–3 (Beast Within, The Block).

### How a *static* timeline stays readable

- **Typography.** One grotesque for labels (lane names, bar numbers), tabular lining figures for the ruler. Size ladder: title > lane > clip > ruler. No script faces. If a clip is narrower than its name, use a leader line to a quiet callout rail, not stacked 6 pt type on the bar.
- **Lanes.** Fixed row height from a budget: `usableHeight / max(activeTracks, 1)`. If rows drop below ~8–10 px, aggregate (heatmap) or paginate into small multiples. Hide disabled tracks (`isEnabled=false`) and empty tracks unless the emptiness *is* the point (a sketch).
- **Color.** One job per channel: (a) mixer/region `colorIndex` for identity, or (b) track *type* (note/audio/automation) as a second, quieter encoding (outline or left-edge pip). Never both as full-fill rainbow. Gray for automation and grid.
- **Scale breaks.** If a song has a long empty tail (default 64 bars with content in the first 16), **crop** and mark “axis continues” rather than a pictorial break that distorts bar length (Tufte lie factor). If you must show two grains (whole song + chorus), use a **small multiple**, not a broken axis.
- **Layering.** Background: pale bar lines every 4 or 8 bars. Mid: region bars. Front: labels and a single section spine. Automation as a thin ribbon under the arrangement, not interleaved lane-by-lane unless the variant is “automation-forward.”

### Conceptual pipeline (timeline)

1. Join tracks → players → mixer strips; drop empty/disabled per rules.  
2. Convert ticks → bars/beats/seconds.  
3. Choose grain: section / region / bar-bin / note.  
4. Choose layout: horizontal Gantt, vertical chronicle/stripboard, or heatmap.  
5. Place marks from data; label from `displayName`s.  
6. Export SVG/PNG. Optional later style pass may re-skin *without moving marks*.

---

## Cabling / setup methods

The document already *is* a floor plot (desktop XY) plus a routing graph (cables + mixer). Live-sound and datacenter drawing practice is useful as **discipline**, not as a license to invent a venue. Photoreal “studio photo with cables” will miss sockets and invent IEC leads. **Signal-flow, rack elevations, and labeled plots should be code-rendered.** A mild isometric projection of the *same* coordinates is still geometry, not art.

### Shared failure modes

- **No cables.** Shots: 35 devices, 0 cables. A loom drawing that adds wires is a lie. Show a **gear plot** (positions + types) or refuse the cabling-as-wires variant.
- **Hairball.** Designer Setup: 153 cables on 138 devices; strange desktop: 62 cables with 17 colors. Organic Béziers (DAW look) become unreadable at poster size. Need bundling, orthogonal routing, or layer filters.
- **Socket vs device.** Cables attach to `fieldIndex` ports. A device-level graph collapses splitters/mergers incorrectly. Keep ports if the variant is “patchbay / signal flow”; collapse only for a distant floor plot.
- **Two graphs.** Desktop audio/note vs mixer grouping/aux/sidechain. Drawing both at full weight is two diagrams in one. Layer or split variants.
- **Uniform color.** Que pt2 cables are almost all `colorIndex` 40 — color-by-cable-index does nothing. Recolor by **signal class** (audio / note / sidechain / aux) or by **source device family**.
- **Huge canvas, tiny clusters.** Desktop bounds are thousands of units. Normalize to content bbox + margin; do not preserve empty ocean.
- **Name collisions.** Multiple “Quasar (3)” on Que pt2. Disambiguate with type + short id or mixer destination.

### 1. Rack elevation

**What it is.** Front view of a 19" rack in **U** (1.75"). IT: Visio Rack Diagram, netBox / Device42 / RackTables, EIA-310. AV: USITT/TSDCA rack drawings and custom panel details (2022 recommended practice, updating USITT 2008).

**When it shines.** As an analog of the **mixer** (strips as slots) or of a **vertical stack of device families** (all stompboxes, all Quantums). Designer Setup’s 22 Quantums + 17 waveshapers *look* like a rack if you invent U-heights — but those U-heights are **not in the data**. Honest version: each mixer strip is one “U” (Que pt2: 21 channels + 5 groups + auxes + master), labeled with `displayName`, `colorIndex`, fader `postGain`, mute/solo, group membership.

**Data needed (honest).** Mixer channels/groups/aux/master, `orderAmongStrips`, grouping tree, aux routes, sidechains. Optional: device list as a *second* unlabeled inventory column (count by type), not fake U.

**Strengths.** Instantly readable; good still; four variants can change grouping and annotation density.

**Weaknesses.** Not a physical rack; implying screws and blank panels overclaims. Desktop FX chains are left-to-right, not 12U.

**Four variants?** Yes as the **rack-only** axis of the setup mode (mixer elevation vs device-type inventory vs combined).

**Data → image.** Template: numbered slots, color pip, name, group bracket, sidechain arrows as thin jumpers. **Code-rendered.** Visio-style photoreal rack photos add lie, not data.

### 2. Patchbay / matrix map

**What it is.** Two rows of jacks (outs over ins), normals (full / half / un-normalled), patch cords as verticals. Studio practice (SSL / Harrison color conventions: e.g. white mics, green tape returns, yellow busses, pink inserts — shop-specific, not an AES law). IT: patch-panel / ODF matrix layouts (AssetGen Matrix Layout in Visio). Digital analog: routing tables in USITT/TSDCA.

**When it shines.** Mixer aux routes + sidechains + strip groupings are already a **sparse matrix**. Desktop splitters/mergers/centroids are a second matrix (many-to-one). Strange desktop’s 17 cable colors are a natural jack-color legend.

**Data needed.** For mixer: every `mixerAuxRoute` (gain), `mixerSideChainCable`, `mixerStripGrouping`. For desktop: cables with socket `fieldIndex`; device type to name the port if the schema’s field index can be mapped (otherwise label “out 9 → in 5”).

**Strengths.** Highest routing truth per pixel; no geography required; works when XY is a mess.

**Weaknesses.** 153 desktop cables as a full matrix is a spreadsheet, not a picture — need to filter (only note cables; only into mixer; only colored cables).

**Four variants?** A **density** variant (mixer-only matrix vs full desktop incidence vs “exceptions only” — non-default routes).

**Data → image.** Rows = sources, columns = destinations, mark = cable (color = class or `colorIndex`). Or classic TT-bay: top row sources, bottom destinations, cords as polylines. **Code-rendered.**

### 3. Cable-run overlay on a “floor plan”

**What it is.** Construction/AV: cable paths drawn on an architectural plan (USITT plan view; BICSI pathways). Live: snake runs stage → FOH drawn on a venue plot.

**When it shines.** When **desktop XY is treated as the plan**. This is the most literal setup image for Designer Setup and strange desktop patching. Overlay cables on the existing positions.

**Data needed.** `positionX`/`positionY`, cables, display names. No walls — draw a light bounding frame and optional **cluster hulls** (e.g. k-means or connected-component blobs) as “zones,” labeled by dominant device type.

**Strengths.** Recognizable as *that* desktop; matches the briefing’s “devices have positions.”

**Weaknesses.** Organic DAW curves do not scale; long-haul cables cross everything; labels collide in tight clusters (Que pt2 Quasar pile-up).

**Routing.** Prefer **orthogonal (Manhattan) or bundled** runs: gather edges that share a corridor (edge bundling: Holten 2006 hierarchical edge bundles; or simple channel routing). Organic splines only at low cable count (Piano Grain: 3). Color by signal class; **layer** note vs audio vs mixer.

**Four variants?** This *is* the **top-down** variant. Sub-variants: organic vs orthogonal vs bundled; labels on vs numbered callouts.

**Data → image.** Normalize bbox → page; draw devices as typed tokens; route cables; legend for 2–4 signal classes. **Code-rendered.** A photoreal “cables on a studio floor” will ignore XY and invent XLR.

### 4. Isometric studio / stage plot

**What it is.** 2.5D axonometric of a room: desks, racks, speakers. Live **stage plots** are usually **orthographic bird’s-eye**, not iso (StagePlotPro, Soft Plot, current Stageplot Pro apps): audience at the bottom, wedges numbered, input list under the plot. USITT: plan + elevation as separate sheets.

**When it shines.** Communication to a human who wants “a setup,” not a graph. Only honest if the isometric is a **projection of real desktop coordinates** (or of mixer-as-console + devices-as-blocks on a dummy rectangle). Fake sofas and vocal mics are out of scope.

**Data needed.** Same as floor overlay. Optional: mixer as a “FOH” block at the centroid of channels; master as the sink.

**Strengths.** Depth separates overlapping devices; four-variant axis is exactly “iso vs top-down.”

**Weaknesses.** Iso **hurts** measurement and label placement; 138 boxes in iso is a pile of rhombi. Stage-plot chrome (audience, upstage curtain) is decoration unless labeled as non-data.

**Four variants?** Yes — **isometric** is one of the four setup variants. Keep tokens abstract (blocks + ports), not product photography.

**Data → image.** Project (x,y) → iso; same routing in the plane before projection, or route after. **Code-rendered.** Photoreal iso rooms will invent architecture.

### 5. Signal-flow block diagram (system block diagram)

**What it is.** USITT/TSDCA **System Block Diagram**: left-to-right (or top-to-bottom) devices as labeled blocks, connections as lines, optional power. Studio: “input → pre → EQ → comp → DAW → monitors.” Graph drawing: **Sugiyama / layered layout** (Sugiyama et al. 1981): cycle removal, layering, crossing reduction, coordinate assignment, orthogonal or spline routing. Kieler/ELK and Microsoft GLEE are practical engines; Schulze et al. extend this for **dataflow with ports**.

**When it shines.** The default **readable** picture of Designer Setup and strange desktop. Ignores messy XY; shows that audio splitters and mergers *are* the structure. Mixer grouping is already a tree into master — a second SBD.

**Data needed.** Directed edges from cables (and optional mixer routes). Node labels: `displayName` + type. Ports if `fieldIndex` is shown. Cycles: feedback-ish desktop graphs need the cycle-break step (reverse a few edges, draw them dashed).

**Strengths.** Best “I can trace the kick” diagram; scales with crossing minimization; natural **layering** of note graph vs audio graph vs mixer.

**Weaknesses.** Loses the author’s spatial composition (the desktop *look*); layered layout can get very wide (compaction papers exist for a reason).

**Four variants?** This *is* the **signal-flow** variant. Sub-options: LR vs TB; audio-only vs audio+note vs +mixer; orthogonal vs polylines.

**Data → image.** Build digraph → Sugiyama → draw blocks + ports + legend. **Strongly code-rendered.** Free generation cannot keep port identity.

### 6. Loom / bundle / snake drawing

**What it is.** Multipair snake: trunk + fanouts + stagebox (Pro Co RoadMASTER-style: numbered XLRs, color shrink on tails). Pedalboard looms: calculated breakout lengths, labeled heat-shrink (Rattlesnake and shop drawings). Live: main snake + subsnakes (ProSoundWeb “Analog Organization”).

**When it shines.** When many cables share a source or destination — e.g. eight `audioSplitter` outs on strange desktop, or 64 `centroidChannel` fans. Bundle those as a **trunk** with numbered tails instead of 64 independent curves.

**Data needed.** Cables + a bundling key: same source device, or same colorIndex, or same signal class. No real lengths — breakout length can be **proportional to desktop distance** or uniform. Do not print fake meters.

**Strengths.** The only way 153 cables stay calm; matches how techs actually look at a stage.

**Weaknesses.** Bundling hides pairwise detail (keep a matrix inset or numbered tails).

**Four variants?** A **routing style** inside top-down or signal-flow (bundled vs unbundled), not its own mode.

**Data → image.** Detect high-fanout nodes → draw a thick trunk → fanout with numbers matching a side table (input-list analog). **Code-rendered.**

### 7. Labeled bird’s-eye stage plot + input list

**What it is.** One page: plot on top, **input list** below (ch, source, mic/DI, stand, phantom, notes). StagePlotPro popularized “the plot that looks like the band + the list on the same page.” Monitor mixes numbered on wedges. Convention: landscape, audience down, do not cram the list onto the plot.

**When it shines.** As a **template for mixer + desktop sources**. Input list rows = mixer channels in `orderAmongStrips` (Que pt2: Softest Kick, Soft Kick, Arp 1, …). Plot tokens = devices that feed those channels (via cables to the stagebox/mixer input). Sketches with one “Stereo Output Box” get a one-line list — still honest.

**Data needed.** Mixer display names, colors, order, mute/solo, group; devices; cables into mixer/centroids. **No** mic types, phantom, or wedge mixes in the document — leave those columns out rather than filling “SM57.”

**Strengths.** The most “operational still” for a *song* project; names are the identity the briefing cares about.

**Weaknesses.** Designer Setup has empty mixer names and 3 channels — the list is thin; the plot must carry the device graph instead.

**Four variants?** This is a **presentation** of top-down, not a fourth geometry. Use it as the annotation style for the top-down variant.

**Data → image.** Two-band template: plot + table. Number tokens on the plot to match channel numbers. **Code-rendered.**

### 8. Exploded isometric gear diagram

**What it is.** Technical illustration: assemblies pulled apart along an axis, leader lines to parts (aircraft manuals; Tufte “confections” when mixed with callouts).

**When it shines.** A **single chain** (sketch: Pulverisateur → cable → output) or a mixer strip’s internal order (documented in-schema: pre gain → trim → compressor → EQ → aux → sidechain → fader). Que pt2’s named groups (`Arp`) could explode into member channels.

**Data needed.** A small tree or chain. Fails on 138-device graphs unless you explode **one** selected bus.

**Strengths.** Excellent pedagogy; good as a callout inset.

**Weaknesses.** Not a whole-project default; iso explosion is easy to over-decorate.

**Four variants?** No — inset technique.

**Data → image.** Pick a root (master, or a named group) → offset children along one axis → leaders. **Code-rendered.**

### 9. AV / live-sound practice (what to steal vs skip)

| Artifact | Steal | Skip / do not invent |
| --- | --- | --- |
| **Input list** | Channel #, name, color, group, dest | Mic, stand, phantom, 48V |
| **Stage plot** | Bird’s-eye tokens, audience-down *only if* you declare a dummy “front” (e.g. mixer at bottom) | Risers, drums kit, vocalist |
| **RF plot / schedule** | — | No wireless entities |
| **Power / distro** | — | No circuits; USITT says power is optional on SBDs anyway |
| **Snake / loom** | Bundle high-fanout; number tails | Lengths, multipin part numbers |
| **SBD** | Layered blocks, neatness first (USITT/TSDCA) | Power inlets on every block |
| **Hookup / routing table** | Aux matrix, sidechain list | DSP plugin internal routing unless you have it |
| **Cable labels** | `colorIndex` + class + from/to names | Printed heat-shrink catalogs |

**Color-by-signal-type (recommended encoding).** Audio desktop = one hue; note desktop = second; sidechain = third; aux = fourth. If `colorIndex` is diverse (strange desktop), *then* use document colors and put the class in line weight or dash. Line weight: trunk > single; dash: note or disabled. **Layering:** user-facing stills should be able to show audio-only, note-only, mixer-only — that is a variant axis, not extra modes.

**Orthogonal vs organic.** Organic = few edges, preserve DAW feel. Orthogonal / octilinear = many edges, patchbay and SBD. Bundled = extreme fanout. Never mix all three in one still.

**Callouts and legend.** Numbered markers + a single legend for signal class. Direct-label devices whose degree ≥ 3 or that have a user `displayName`. Mute the desktop grid.

### 10. IT / datacenter practice (what to steal)

- **Rack diagrams** (Visio, netBox): slot order, face labels, not pretty metal. Map to mixer strips.  
- **Cable management**: dress by destination, not spaghetti — same as bundling.  
- **Patch panels**: port index = `fieldIndex`.  
- **Floor tiles / cabinet rows**: only if you cluster desktop XY into “rows”; do not draw a hot aisle.

### Conceptual pipeline (cabling / setup)

1. Classify document: cable count, device count, mixer richness, XY spread.  
2. Build three layers: desktop audio, desktop note, mixer (group/aux/sidechain).  
3. Choose geometry: preserve XY (top-down / iso) **or** re-layout (Sugiyama SBD) **or** ignore XY (rack / matrix).  
4. Route: organic / orthogonal / bundled.  
5. Label from device and strip names; number to a list if mixer exists.  
6. SVG/PNG. Optional style pass must not move ports or edges.

---

## Recommended 4-variant schemes

Variants are **the same mode**, different axes. They must remain interchangeable: same project, same entities, recognizable as the same document.

### Mode 1 — Timeline (arrangement still)

**Primary axes:** density, orientation, time grain, metaphor-lite styling (operational, not artistic).

| # | Name | Density | Orientation | Grain | Styling | Use on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | **Arrange Gantt** | Region bars; notes as optional fill | Horizontal; tracks as lanes | Bar ruler; clip-accurate in/out | Quiet DAW: gray grid, mixer colors, direct labels | Que pt2, Wave the Shape |
| T2 | **Section chronicle** | One row of sections + callouts | Vertical spine (or stripboard stack) | Sections inferred from occupancy / named clips | Poster/museum type; rundown table optional | Beast Within; named-part songs |
| T3 | **Energy heatmap** | Bar × lane occupancy or velocity sum | Horizontal (same lane order as T1) | 1-bar or 1-beat bins | Single-hue sequential; no clip names except peaks | Wave the Shape, Que pt2 |
| T4 | **Look-ahead / small multiple** | Same marks as T1, cropped or paneled | Horizontal panels (storyboard strip of the Gantt) | 8- or 16-bar windows | Shared y-scale; panel titles = bar range + region name | Long songs; also the “zoom” of T1 |

**Rules.** T1 and T3 must share **lane order** (player name). T2 and T4 must share **section cuts** if both are shown. If `noteRegions + audioRegions < 3` and notes < 50, **do not emit T3** (blank heatmap); prefer T2 or refuse timeline. If automation tracks > arrangement tracks, T1 may add a single automation ribbon, not 31 lanes. **All four are templates + labels**, not free generation.

**What was considered and demoted.** PERT as a fourth look: keep as an optional inset when shared collections are interesting, not as T4. Subway map: allowed as a *styling skin* of T1 (x still = time), not a separate variant, so we do not burn a slot on octilinear decoration.

### Mode 2 — Setup / cabling / layout

**Primary axes (as specified):** top-down vs isometric vs rack-only vs signal-flow. Secondary knobs (not extra modes): routing style, layer set, annotation (plot-only vs plot+input list).

| # | Name | Geometry | Routing | Layers shown | Annotation | Use on |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | **Desktop plan** | Top-down, real `positionX/Y` | Orthogonal + bundle high fanout; organic if cables ≤ ~8 | Audio + note; mixer as color on sink nodes | Numbered tokens + input list if mixer names exist | Designer Setup, strange desktop, Que pt2 |
| C2 | **Iso plot** | Axonometric of the **same** coordinates as C1 | Same as C1, projected | Same as C1 | Fewer labels; rely on numbers | Same as C1 when clusters overlap in 2D |
| C3 | **Mixer rack** | Elevation of strips (`orderAmongStrips`) | Group brackets; sidechain/aux as jumpers | Mixer only | Strip names, color, mute/solo, group | Que pt2, Wave the Shape; thin on Designer Setup |
| C4 | **Signal flow** | Sugiyama layers; XY discarded | Orthogonal, port-aware | Audio and/or note; optional mixer tree as a second column | Block titles = displayName + type | Designer Setup, strange desktop; also songs as a “how it’s patched” still |

**Rules.** C1 and C2 must place the **same device IDs** in corresponding relative positions (iso is a projection, not a relayout). C4 may move devices but must keep **edge identity**. C3 must not invent U-heights or blank panels beyond empty *documented* strips. If cables = 0 (Shots), C1/C2 become a **gear plot** (no wires) and C4 is a disconnected node list — prefer showing devices as a typed inventory grid rather than a fake SBD. Color: class-based unless `colorIndex` entropy is high (strange desktop). **All four are templates + labels.**

**Layering as a sub-option, not a fifth variant.** Each of C1–C4 can filter to audio / note / mixer. If the product needs four *images*, pick the four geometries above, not four filters of one geometry.

---

## Open questions / risks

1. **Ticks per quarter** is not documented in the dump summaries. Region lengths cluster on 61440 / 122880 / 245760; the bar math above assumes a conventional PPQ. Confirm before printing “Bar 17.”  
2. **Track names** are indirect. Wrong joins (player pointer stale, multiple tracks per device) will mislabel lanes.  
3. **Section inference** for T2/T4 is editorial. Need a deterministic rule (e.g. change in the set of active players, or named-region starts) or variants will disagree.  
4. **Socket `fieldIndex` → port name** may require per-device schema knowledge. Without it, patchbay labels stay numeric.  
5. **Centroid / MiniMixer / stagebox** semantics: mixer comments say channel inputs are “visible on the stagebox,” but dumps do not include a separate room. Treat mixer as logical FOH, not a drawn stage box, until that entity is explicit.  
6. **Feedback and cycles** on the desktop will break naive layering; dashed back-edges need a rule.  
7. **Identity vs beauty.** A style pass that reroutes cables or rescales bars breaks recognizability (Que pt2 vs Designer Setup must not be swappable). Lock mark positions.  
8. **Empty-mode honesty.** Timeline on a rack document, or cabling on Shots, should look *empty* or switch emphasis — not hallucinate a full festival rundown or a snake.  
9. **Automation and patterns.** Pattern banks (Shots) and automation-heavy songs can hijack a timeline if given equal ink. Keep them as a gutter or exclude from this mode (another workstream owns pattern textiles).  
10. **People/rooms gap.** If the product later ingests real show files (input lists, RF, power), C1–C3 can grow columns. Until then, extra columns are fiction.  
11. **Scale and collision.** 3,794 notes and 153 cables exceed a 1024² cover without aggregation. Variants exist specifically to degrade gracefully; do not “solve” it with a busier drawing.  
12. **Color index collisions.** Null `colorIndex` on many mixer strips; duplicate device names. Need a stable fallback palette keyed by id, not by name.

---

## Sources and references

### Information design and timeline form

- Edward R. Tufte, *The Visual Display of Quantitative Information* (1983/2001) — data-ink, lie factor, words on graphics.  
- Edward R. Tufte, *Envisioning Information* (1990) — layering/separation, micro/macro, small multiples, smallest effective difference.  
- Edward R. Tufte, *Visual Explanations* (1997) — confections (use sparingly here).  
- Harry Beck, London Underground map (1931) — octilinear “tube” timelines.  
- MetroViz (rstockm/fkoehne) — time-aligned metro roadmaps, SVG/PNG export.  
- NN/g, “Designing Effective Infographics” — static vs interactive; type hierarchy.  
- GitHub contribution calendar / calendar heatmaps — occupancy matrices.  
- Museum wall chronologies (e.g. British Museum / Smithsonian exhibition timelines) — vertical spine + objects.

### Project-scheduling artifacts

- Henry L. Gantt, bar charts (1910s); Microsoft Project, Primavera P6, GanttProject — arrange-like stills.  
- PERT (US Navy Polaris, 1958) and CPM (DuPont/Remington Rand) — precedence networks; AON form in PMI/AACE practice.  
- Construction **look-ahead** / short-interval schedules (2–6 week; Last Planner System) — crop + detail, not extra chrome.  
- Film **stripboard** / production board — Movie Magic Scheduling, StudioBinder, Scenechronize, SetHero one-liners; color by INT/EXT/D/N.  
- Broadcast / festival **rundown** / show flow / cue sheet — clock-order tables.

### Live sound, AV, and studio paperwork

- USITT / TSDCA, *Sound Documentation Recommended Practice* (April 2022; updates USITT 2008) — system block diagram, plan/elevation, hookups, routing tables, RF/IP schedules, rack drawings, com, power, cable labels.  
- StagePlotPro (Chip Wallance) and later stage-plot apps — bird’s-eye plot + input list + numbered monitor mixes; audience-down convention.  
- Soft Plot (and similar plot software) — scaled stage plots for touring.  
- ProSoundWeb, “Analog Organization: The ‘Little Things’ Count With Cabling” — length color-codes, subsnakes, labeled trunks.  
- Pro Co RoadMASTER multipair snakes — numbered stagebox + color-shrink fanouts.  
- Shop patchbay color conventions (e.g. SSL-inspired: mics white, tape green, busses yellow, inserts pink) — local, not AES-mandated.  
- AES59 (DB25 / Tascam-style analog pinout) — relevant only if multipin breakouts are ever real; they are not in this document.  
- Pedalboard loom shop drawings (e.g. Rattlesnake Cable Company) — breakout math and tail IDs.

### IT / datacenter drawing

- EIA-310 rack unit; Microsoft Visio Rack Diagram template.  
- netBox, Device42, RackTables — source-of-truth rack elevations.  
- Square Mile Systems AssetGen (Visio) — cabinet/floor layout, patch-panel matrix layout, cable IDs as data graphics.

### Graph drawing (signal flow and cable routing)

- K. Sugiyama, S. Tagawa, M. Toda, “Methods for Visual Understanding of Hierarchical System Structures,” *IEEE Trans. SMC*, 1981.  
- C. D. Schulze, M. Spönemann, R. von Hanxleden — layered layout for **dataflow with ports** and orthogonal edges (Kieler/ELK).  
- Ulf Rüegg, *Sugiyama Layouts for Prescribed Drawing Areas* (Kiel Computer Science Series, 2018) — compaction, wrapping, practical SBDs.  
- Lev Nachmanson, *Notes on an implementation of Sugiyama’s scheme* (Microsoft Research, GLEE), 2006.  
- Danny Holten, “Hierarchical Edge Bundles,” *IEEE InfoVis*, 2006 — cable bundling.  
- Orthogonal / channel routing (VLSI and diagram editors) — Manhattan cable runs on a floor plot.

### This repository (data, not methods)

- `BRIEFING.md` — adaptive studio portrait; song vs rack vs pattern vs sketch.  
- `scripts/dump-projects.ts` / `scripts/fingerprints.ts` — entity inventory.  
- `dumps/fingerprints.json` and per-project `summary.json` / `entities.json` — eight originals (Que pt2, Wave the Shape, Designer Setup, strange desktop patching, Shots, Beast Within, The Block, Piano Grain).  
- Audiotool document schema (`@audiotool/nexus` protobufs): `Region`, `Note`, `NoteTrack`, `AudioTrack`, `AudioRegion`, `DesktopAudioCable`, `DesktopNoteCable`, `MixerChannel`, `MixerStripGrouping`, `MixerAuxRoute`, `MixerSideChainCable`.
