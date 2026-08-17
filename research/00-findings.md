# Findings — Audiotool project to image

Decision brief. Depth lives in notes `01`–`04`; this file is the argument.

---

## 1. Project truth

This repo turns an **Audiotool studio document** (browser DAW) into a still image that is recognizably *that* project. The document is a flat bag of entities: desktop devices with real `positionX/Y`, audio/note cables (socket-to-socket, **no stored routes**), a mixer (names, `colorIndex`, strip order, groups, aux, sidechain), a musical timeline (tracks, regions, notes in **ticks**, automation), pattern-device banks, and waveshaper/Curve geometry. It is **not** a live-event show file, a construction schedule, or a people/rooms database. Eight dumped originals fall into four kinds — finished song (Que pt2, Wave the Shape), rack/patch (Designer Setup, strange desktop patching), pattern museum (Shots), sketch (Beast Within, The Block, Piano Grain) — and a single piano-roll or a single patch-graph would lie about half of them. Official `snapshotUrl` is empty on all eight; some have an uploaded `coverUrl` that is **not** document-derived. Success: Que pt2, Designer Setup, and Shots produce un-swappable pictures.

Time is **musical**: 3840 ticks/quarter, 15360 ticks/bar in 4/4 (`Ticks` in `@audiotool/nexus`). Convert ticks → bars/beats/seconds from `config.tempoBpm` + signature. Never use listing `playDuration` (often `0s` on finished unpublished songs). Note 01’s 960-PPQ guess is wrong; 245760 ticks is **16 bars**, not 64.

---

## 2. Design constraints (every mode)

**One primary plane.** Time×track (or time×pitch), or desktop X/Y, or a step matrix. A second plane is margin, watermark, or sparkline — not a second full map.

**Encode the dominant layer; refuse the missing one.** Classifier (from `BRIEFING.md`, with a data caveat): notes > 500 → arrangement; cables > 40 and notes < 200 → patch; many **filled** pattern cells and no notes → textile; else → sparse still-life. “Many pattern *entities*” is unsafe — factory banks are often empty `{}`.

**Facts are invariant across the four variants of a mode.** Same devices, cables, notes, names, counts, and density. No extra synths, people, rooms, or dates. If `Soft Kick` is a lane / star / specimen / town, it is that in all four. Semantic `colorIndex` (mixer, cable, region) is a **nominal key**, not a mood slider — same index, same hue, whenever the picture claims to show it. Null index = documented default gray.

**What may vary — concrete vs creative differ.**

| | Concrete (modes 1–2) | Creative (modes 3–10) |
| --- | --- | --- |
| Job | A knowledgeable user can check the picture against the document | Recognizably *that* project, allowed to be a souvenir |
| Variant meaning | Four **views** of the same sentence (layout, camera, LOD/grain, light paper) | Four **printings** of the same plate (era/register + density; material as a third) |
| Must not vary | Metaphor, entity inventory, mark positions (except a labeled solver), semantic colors | Metaphor, encoding (field → variable), inventory, semantic colors |
| Weak / last-resort | Palette “warmer”; seed jitter | Hue shift; four seeds of one prompt |

This reconciles the sibling notes: **04** is right that variants are not four new facts or four document-kinds (kinds are classifier/mode). **03** is right that creative slots may restyle a **shared skeleton**. **02** is right that a constellation that becomes a city is a different mode. So: *emphasis of which layer is hero* picks the **mode**; the 2×2 picker is four views/printings **inside** that mode — not four styles that rewrite the sentence, and not four seeds.

**Honesty rules the data already broke.**

- No cable Béziers or jack offsets — draw device-to-device (or socket-index) edges; inventing sag is a lie.
- No official `colorIndex` → RGB table. Use one fixed LUT in a sidecar until the studio palette is captured.
- Tracks have no `displayName`; label via player device, then mixer strip, then type.
- `patternTracks` / `patternRegions` are **zero** in this corpus. Patterns live on devices, not on the arrange.
- Desktop bounds can collapse (Beast Within is a point). Do not force-layout that into a fake city.
- Centroid internals and stripped sample blobs are noise. Audio regions are blocks, not waveforms.
- At 600², thousands of notes and 153 cables must aggregate. Same sentence, coarser resolution — not a busier drawing.

**Cover-shaped.** Square or portrait plate first. A colophon/legend is part of the object. Load-bearing type is always code.

---

## 3. Modes 1–2 — concrete

“Cabling” here means the **DAW desktop + mixer + cables**, not a venue snake or 19″ tour rack. Steal discipline from AV paperwork (named strips, bundled fan-out, layered signal-flow). Do not steal stages, mics, RF, power, or U-heights.

### Mode 1 — Timeline (arrangement still)

**Shows.** What plays when, on which player. X (or a vertical spine) = musical time in bars; rows = tracks joined to device/mixer names; marks = regions, optional note density, a thin automation gutter. Crop default 16-bar empty tails. Hide empty/disabled lanes unless emptiness *is* the point.

**Refuse or degrade when** `noteRegions + audioRegions < 3` and notes are few (Designer Setup, Shots, Piano Grain). Do not emit a blank heatmap. Automation-heavy songs get one ribbon, not 31 lanes.

**Four variants** (same lane order and, if used, the same section cuts):

| # | View | What changes |
| --- | --- | --- |
| T1 | **Arrange Gantt** | Horizontal region bars; mixer/region color; direct labels; loop hatch |
| T2 | **Section chronicle** | Vertical spine / stripboard of inferred sections + named clips |
| T3 | **Energy heatmap** | Bar × lane occupancy or velocity sum; single-hue; peak labels only |
| T4 | **Look-ahead / small multiple** | Same marks as T1, cropped or paneled (8-/16-bar windows, shared y) |

PERT, subway maps, and “festival rundowns” are not variants. PERT has no predecessors in the data (keep as an optional reuse inset). A tube look is a *skin* of T1 with x still = time.

**Render.** SVG/canvas → PNG. Templates + labels. A model must not place bars on a ruler. Optional later: paper texture on a label-stripped skeleton; composite type back.

### Mode 2 — Desktop / mixer / cables

**Shows.** The studio graph: devices as typed tokens on real XY **or** a labeled solved layout; cables as inferred edges; mixer as a second layer (strip order, groups, aux, sidechain). Color by **signal class** (audio / note / sidechain / aux) unless `colorIndex` entropy is high (strange desktop). Normalize to content bbox.

**Refuse wires when cables = 0 (Shots).** Gear plot or typed inventory — not a fake SBD. Do not invent U-space or blank panels.

**Four variants** (C1 and C2 share device IDs and relative positions; C4 may move nodes but must keep edge identity):

| # | View | Geometry | Notes |
| --- | --- | --- | --- |
| C1 | **Desktop plan** | Top-down, real `positionX/Y` | Orthogonal + bundle high fan-out; organic only if cables ≲ 8; numbered tokens + mixer list if names exist |
| C2 | **Iso plot** | Axonometric of **the same** coordinates | Camera variant, not a relayout; abstract blocks, no furniture |
| C3 | **Mixer elevation** | Strips in `orderAmongStrips` | Logical “rack”: name, color, mute/solo, group brackets, aux/sidechain jumpers. Not EIA-310 chrome |
| C4 | **Signal flow** | Sugiyama / ELK, XY discarded | Port-aware if `fieldIndex` is known; audio and/or note; mixer tree as a second column |

Layer filters (audio / note / mixer) are sub-options, not a fifth variant. Exploded chains are insets.

**Render.** Code-first (SVG + elkjs/bundling). Photoreal “studio floor with XLRs” will ignore XY and invent connectors. 3D iso is a programmatic camera, not a NeRF.

---

## 4. Modes 3–10 — creative (ranked from note 02)

Same classifier hunger: songs want architecture and names; racks want sky/map; Shots wants cloth; sketches stay empty. Each mode is a **different object**. If constellation, island, and “organism” all collapse to a network blob, the picker failed.

**Shared variant rule.** Lock encoding + inventory. Change **era/register** and **density**. Reinterpret semantic swatches as ink / yarn / gel — do not replace them. Do not change the metaphor.

### Mode 3 — Uranometria (patch constellation)

**Pitch.** Desktop as a copperplate star atlas: devices are stars, cables are asterisms, mixer names are constellation titles.

**Encoding.** XY → star position on a readable grid; type → glyph; degree/`postGain` → magnitude; audio vs note → solid/dashed; names → cartouches; BPM/duration → epoch/span. Cable hue only if the document used many colors.

**Four axes.** Epoch (1603 / 1820 / NASA cyan / gilt planisphere) × figure density (stars-only / outline / allegorical) — projection and label language as extras. Figure silhouette from the hull of **named** devices, or drop the figure.

**Render.** Code skeleton (positions, edges, labels) → engraved/illustrative restyle. Best on racks. Sketches = two stars and a large empty sky.

### Mode 4 — Session herbarium (specimen plate)

**Pitch.** Natural-history plate: important devices as specimens, Latinized type + the user’s common name.

**Encoding.** Type → morphology (waveshaper anchors = venation); `displayName` → common name; mixer color/gain → wash; group → tray; activity → scale. Binomials from `type`, not dreamed Latin.

**Four axes.** School (Merian / Redouté / Haeckel / modern voucher) × density (holotype / type series / full tray).

**Render.** Code layout + caption tickets; scientific-illustration pass. **Most readable souvenir.** Works on sketches (two specimens, large margin). 138 devices → type series + named mixer-facing units only.

### Mode 5 — Arc cathedral (shape of the arrangement)

**Pitch.** Wattenberg arcs as a rose window: repeats become arches, mixer colors become glass.

**Encoding.** Time on one nave (not N swimlanes); repeated regions/cells → arches; strip color → glass; sidechain → pinched leading; signature → tracery module; Curve/waveshaper → rose profiles.

**Four axes.** Material (Chartres / Tiffany / white print / blueprint) × match rule (exact / pitch-class / region-length).

**Render.** **Hard vector leading in code** (the graph is the data); glass as texture. Song mode. **Refuse fake arches** on Shots / empty racks; fallback = pattern-bank rose or skip. Must not become a piano-roll poster.

### Mode 6 — Imaginary island (desktop as atlas)

**Pitch.** Desktop bounds are an island; clusters are towns; note density is relief; mixer is climate.

**Encoding.** Hull of devices → coast; names → toponyms; type → land-use; audio cables → roads, note cables → ferries (**aesthetic routes, no sockets**); mixer groups → provinces; mute → ruined name. Legend must say relief = activity at that device, not “north is later.”

**Four axes.** Era (Ortelius / Gill / USGS / Walter) × projection (desktop +Y / toward master / polar).

**Render.** Code map (coast, towns, roads, cartouche) → printed-atlas restyle. Universal if the sea may be empty. Every toponym is a real `displayName` or a type.

### Mode 7 — Pattern jacquard (session as cloth)

**Pitch.** Step banks woven: warp = pattern time, weft = row/machine, mixer colors = yarn.

**Encoding.** Filled cells only; machine → stripe/band; unused slots → ground cloth; BPM → sett; cables → a thin selvedge thread, not a second picture. Songs with one pattern get a belt plus a field from **quantized note onsets** (no pitch axis).

**Four axes.** Tradition (punch-card / Albers / Festival Pattern Group / stripe-logic blanket — **not** a sacred design) × density (one band / full blanket).

**Render.** Code-first weave diagram (grids are facts); optional photographed-textile restyle with visible interlacing. **Mandatory for Shots.** Starves on Piano Grain / The Block — skip or weave a very open linen from automation and say so.

### Mode 8 — Calligram cover (concrete poetry of the desk)

**Pitch.** The project’s own words *are* the picture: mixer names, device names, tags, title.

**Encoding.** Words = names (mixer first); size = `postGain` or note-count; color = strip `colorIndex`; position from strip order / desktop / pitch-centroid; mute = struck; BPM/sig as a colophon. Closed string set. Denylist user-authored slurs.

**Four axes.** School (Mallarmé / Scher / Saville center-label / letterpress) × language mix (names / + colophon / + ≤3 hairline cable rules).

**Render.** **Set type in code.** Paper/ink restyle only. Default names (`Quantum (22)`) collapse to a type specimen; real names shout. Highest identity on songs.

### Mode 9 — Cymatic plate (curves made visible)

**Pitch.** Waveshaper anchors and Curve geometry drive a Chladni figure; mixer colors are the sand.

**Encoding.** Actual polylines **are** the nodal set — not decoration on a mandala. Shaper count → number of plates; BPM → stated “frequency”; desktop positions of those units → plate placement; caption = device name.

**Four axes.** Material (1787 engraving / Jenny film / black sand / cyanotype) × how many figures (holotype / every shaper / one large plate).

**Render.** Code the curves; plate/photo restyle. Best on Wave the Shape and Designer Setup. No shapers → one plate from a pitch-class histogram **and say so**, or yield to herbarium. Ban Flower-of-Life overlays.

### Mode 10 — Night interior (cinematic key still)

**Pitch.** One film still of a room that could only belong to this project: light, props, and gravity from the document; no DAW chrome.

**Encoding (minimum checklist).** Mixer colors/`postGain` → practical lights; top device types → ≤3 props; ≤3 real names on objects; desktop mass → furniture gravity; tags → architecture, not trauma kitsch. No faces, no user likeness.

**Four axes.** Register (Hopper / Crewdson / Wong Kar-wai / Saul Bass) × prop density (one object / table / wide).

**Render.** Most generative, **weakest readability.** Skeleton = lighting plot + prop list + spatial bias, then cinematic restyle at low enough strength that walls (= devices) do not move. Easiest mode to fake — fail closed if the checklist is not visible.

If the product can only ship four creative slots, keep **4, 5, 7, 8** (herbarium, cathedral, jacquard, calligram). 3, 6, 9, 10 earn their place by being different *objects* (sky, map, scientific plate, film still). Instrument-city and mycelium stay honorable mentions — they collapse into island or herbarium.

---

## 5. Pipeline recommendation

There is **no renderer yet**. Intake already exists: PAT → GetEntities snapshot → `dumps/<id>/{meta,summary,entities}.json`. Generation reads dumps, not live Nexus WASM.

```
snapshot → fingerprint + render brief (sidecar)
        → classify kind + choose mode
        → programmatic skeleton + chrome (SVG/canvas; Satori for title/legend)
        → concrete: stop (or paper-only restyle, labels composited back)
        → creative: 1 skeleton + N cheap restyles (shared lock; farthest-first descriptors)
        → hard filters (OCR, class, counts) + diversity pick → 2×2
        → user chooses
```

- **Concrete:** code is the picture. Variants = algorithm / camera / LOD / paper. Refuse pure text-to-image. IGENBENCH: models draw chart chrome and drop the data.
- **Creative:** code is the silhouette (graph, occupancy, palette field, waveshaper marks, closed word list). Atmosphere via img2img / ControlNet Canny / IP-Adapter at low strength. GPT Image / Ideogram only for a title treatment, then OCR or overlay.
- **Never four seeds of the same prompt.** Seed jitter is not a variant. Label tiles by axis (“Readable layout”, “1820 plate”), not “Variant B.”
- **Type and semantic color stay in code.** Mask labels during any style pass. Canny locks edges, not hues — remap swatches after if needed.
- **Prompt packing is atmosphere only** (title, class, counts, named strips, forbidden layers). 3,794 notes do not fit in a prompt; a renderer can hold them.
- **Cost default:** 4× SVG is free. Creative grid = 1 skeleton + 3 cheap restyles, generate 6–8, filter, show 4. Hosted APIs get **skeletons and fingerprints**, never `entities.json` or sample audio.

---

## 6. What we should not do

- **Hallucinate cables, notes, rooms, people, mics, RF, power, cable lengths, or 19″ U-heights.** Shots has zero cables. Designer Setup is not a song. The Block is two devices and a sea of negative space.
- **Treat this as live-sound or a calendar of people.** No stage plots with an audience, no Gantt of call times, no invented critical path.
- **Use `playDuration` or empty pattern-entity counts as magnitude.** Both lie.
- **Draw organic cable art as if routes were stored.** They are not.
- **Recolor `colorIndex` for prettiness** — that erases the one fact that makes strange desktop patching itself.
- **Anadol / latent-fluid “data art.”** If Que pt2 and Designer Setup become the same screensaver, expressiveness failed. Style is texture on a locked composition.
- **Generic AI album covers from a prompt** that never saw the document.
- **Four near-duplicate seeds**, or four metaphors inside one mode.
- **Piano-roll chrome on a rack; constellation-of-wires on Shots; rainbow cables on Que pt2** (one index).
- **Waveform-as-picture.** Samples are stripped; the briefing forbids it.
- **Unread type from a model.** Twenty-one mixer names are not a diffusion job.
- **Horoscopes, infection/rot metaphors, copied sacred textiles, invented tribes, extra limbs, extra windows, extra words.**
- **Aesthetic scores as a safety net.** Pretty-and-wrong is a bug. User pick is the product.

---

## 7. Open questions

1. **Official Audiotool color LUT** and the default for `null`. Until then, “faithful palette” is aspirational.
2. **Desktop camera:** y-flip, zoom, and jack offsets vs device centers — does C1 match the studio the owner remembers?
3. **Note aggregation at cover size** — region bars vs occupancy grid vs velocity heatmap — and a deterministic **section-cut** rule so T2/T4 agree.
4. **`fieldIndex` → port name** per device type. Without it, C4/patchbay labels stay numeric.
5. **Classifier threshold** “many pattern entities” needs a filled-cell rewrite before it ships.
6. **Product:** four variants *per mode* (this brief’s answer) vs four modes-as-variants — do not confuse the picker.
7. **First hybrid:** local ComfyUI (privacy; documents are auth-gated) vs a hosted restyle that only sees a skeleton PNG.
8. **Relationship to existing `coverUrl`** — replace, sit beside, or ignore. There is no official snapshot to compete with.

---

## 8. Pointers

| Note | Use it for |
| --- | --- |
| [01 — Concrete timeline and cabling](01-concrete-timeline-and-cabling.md) | Arrange/Gantt/heatmap/chronicle methods; desktop vs mixer vs signal-flow geometries; T1–T4 and C1–C4 tables; what to steal from AV/IT drawing **as discipline only**; static-readability rules |
| [02 — Creative visual languages](02-creative-visual-languages.md) | Full encoding tables and references for modes 3–10; honorable mentions (instrument city, mycelium); per-mode failure modes and “readable vs souvenir” |
| [03 — Generation pipeline and variants](03-generation-pipeline-and-variants.md) | Renderer families, ControlNet/img2img strengths, typography strategy, picker UX, cost, privacy, evaluation protocol |
| [04 — Project data and inspirations](04-project-data-and-inspirations.md) | Entity inventory, tick math, gap list, Bertin/Mackinlay/Tufte constraints, precedent survey (Shape of Song, ModularGrid, Wrapped, Dear Data — and why Anadol is a caution) |

In-repo ground truth: `BRIEFING.md`, `scripts/dump-projects.ts`, `scripts/fingerprints.ts`, `dumps/fingerprints.json`, Nexus `Ticks` (3840/beat, 15360/bar in 4/4).
