# Project data mapping and real-world inspirations

Scope of this note: the **data model and user goals of this repository**, **encoding theory that should constrain every image mode**, and **precedents that already turn project-like data into a shareable image**. It does not catalog timeline/Gantt/cabling diagram types, creative visual metaphors, or generation-model / variant-grid UX architecture.

Domain correction up front: this is **not** live-event AV / lighting / touring production. It is **Audiotool**, a browser DAW. The document is a studio project (desktop graph + mixer + timeline + pattern banks). Live-show cousins (Drafty, Vectorworks ConnectCAD, RackTools, X32 planners) are useful only as *encoding* precedents — how a structured rack or plot becomes a picture — not as the product category.

---

## Project snapshot

**What it is.** `at-project-to-image` (see `package.json`, `BRIEFING.md`) turns an Audiotool studio document into an image that is recognizably *that* project. The picture must come from the document’s own entities — arrangement, desktop graph, mixer, patterns, waveshaper/Curve geometry — not from the audio waveform, not from a DAW screenshot, and not from one look stretched across every kind of document.

**Who it is for.** The working corpus is account `dquerg`: 112 projects in `dumps/projects-index.json`. The intended reader of the image is someone who already knows the project (the author, a collaborator, a remixer). Success criterion in `BRIEFING.md`: given Que pt2 and Designer Setup, the two images could not be swapped; Shots should look like grids, not like either of the first two.

**User goals (from briefing + metadata, not from UI copy — there is no app UI yet).**

1. **Identity, not atmosphere.** A viewer who knows the document should be able to name it. Mixer strip names (`Soft Kick`, `Arp 1`, `Bd-Sn`) and desktop device names (`Drums`, `_CHORDS`, `FX Breath`) are identity marks.
2. **Honesty about density.** A 3-device sketch stays sparse. Do not invent notes, cables, or arrangement mass.
3. **Kind-aware portrait.** The library is four kinds of document, not one song format. A single piano-roll renderer would lie about racks and pattern museums; a single patch-graph renderer would lie about finished songs.
4. **Cover-shaped deliverable.** Audiotool covers are `600x600.webp` (`project_pb.d.ts`). Official `snapshotUrl` (a DAW-configuration snapshot) was empty on all eight dumped originals. Published tracks sometimes get a snapshot; unpublished projects often have neither snapshot nor a cover that reflects the document. This tool is meant to fill that gap.
5. **Document over waveform.** ShaderNoice already proved arrangement import; this project is about the layers ShaderNoice does not draw (desktop, mixer, patterns, waveshapers).

**Current state (empirical).**

| Piece | Status |
| --- | --- |
| Briefing / goal | `BRIEFING.md` only — no README, no UI copy |
| Auth + dump | `scripts/dump-projects.ts` via `@audiotool/nexus` PAT → `listProjects` → `OpenSession` → regional `GetEntities` (avoids Nexus WASM consolidator, which crashes on large sample blobs) |
| Fingerprint | `scripts/fingerprints.ts` → `dumps/fingerprints.json` |
| Fixtures | 8 original documents under `dumps/<uuid>/` (`meta.json`, `summary.json`, `entities.json`) |
| Renderer | None. No SVG/canvas code, no classifier implementation, no image output |
| Local dumps | Analysis artifacts; stay out of git (`BRIEFING.md`) |

Proposed classifier thresholds in the briefing (not yet code): notes > 500 → arrangement painting; cables > 40 and notes < 200 → patch constellation; many pattern entities and no notes → pattern textile; else → sparse still-life. Optional later: an image-model style pass that keeps a deterministic drawing as the composition lock.

---

## Data inventory

Two layers: **project resource** (listing metadata) and **studio document** (typed entities from `GetEntities`). Schemas live in `node_modules/@audiotool/nexus/dist/gen/audiotool/`.

### Project resource (`audiotool.project.v1.Project`)

Fields observed in `dumps/projects-index.json` (112 rows) and `dumps/*/meta.json`:

| Field | Role | Density in the 112 |
| --- | --- | --- |
| `name` | `projects/<uuid>` | Always |
| `displayName` | Human title | Always |
| `creatorName` / `userNames` | Owner | Always (`users/dquerg`) |
| `createTime` / `updateTime` | ISO timestamps | Always |
| `bpm` | Listing BPM (also in document `config`) | Usually |
| `playDuration` | Published play length | **Unreliable.** `0s` on 32 listings, including finished songs Que pt2 and Wave the Shape. Non-zero mostly on remixes / published tracks |
| `coverUrl` | Existing 600² cover | 48 of 112 |
| `snapshotUrl` | Official DAW snapshot | **Absent** on all eight dumped originals; not present in the index dump |
| `genreName` | e.g. `genres/experimental` | 84 of 112 |
| `tags` | Free tags | 38 of 112 |
| `description` | Prose / lore | Sparse; Que-family lore is long, most sketches empty |
| `trackName` | Published track id | 19 of 112 |
| `remixOfTrackName` / `copyOfProjectName` | Provenance | 25 remixes — dump script skips these |
| `license` / `copyAllowed` / `downloadAllowed` | Rights | Present; not visual |

Dump script also skips `Curated:*`, “sample testing”, and kit-like titles (`Drums`, `Kicks`, …) unless they match a few allowlisted names (`Beast`, `Block`, `recabled`).

### Document config (`entity.config.v1.Config`)

At most one per project. Fields: `tempoBpm`, `baseFrequencyHz` (A4; 440 on all eight), `signatureNumerator` / `signatureDenominator` (4/4 on all eight), `durationTicks`, `defaultGroove` pointer.

**Tick system** (`@audiotool/nexus/dist/utils/ticks.d.ts`): 1 quarter note = 3840 ticks; 1 bar of 4/4 = 15360 ticks (`SemiBreve`). Independent of tempo. Convert with `ticksToSeconds(ticks, bpm)`. Groove proto comment: 1920 ticks = 1/8 bar.

Default `durationTicks` on four of eight dumps is **245760 = 16 bars**. Finished songs are longer: Que pt2 1950720 ≈ **127 bars** (~3:52 at 131 BPM); Wave the Shape 1674240 ≈ **109 bars** (~3:24 at 128 BPM).

### Entity families and relationships

The document is a flat bag of typed entities linked by `Pointer` (`entityId` + optional `fieldIndex` into a socket/slot). There is no separate “scene graph” file.

```
Project resource ──1:1── Config
                         │
Desktop devices ──cables──► other devices / mixer channel inputs
     │
     ├── NoteTrack.player ──► device
     │         └── NoteRegion ──► NoteCollection ──► Note
     ├── AudioTrack ──► AudioRegion ──► Sample
     ├── PatternTrack / PatternRegion (schema exists; count = 0 in all eight dumps)
     └── AutomationTrack ──► AutomationRegion ──► AutomationCollection ──► AutomationEvent
                         │
MixerChannel / MixerGroup / MixerAux / MixerMaster
     ├── MixerStripGrouping (tree: child → group; ungrouped → master)
     ├── MixerAuxRoute, MixerSideChainCable
     └── displayParameters + faderParameters
                         │
Pattern devices ──patternSlots──► Beatbox8/9Pattern, TonematrixPattern,
                                  BasslinePattern, MachinistePattern, RasselbockPattern
                         │
Waveshaper ──► WaveshaperAnchor (x, y, slope)
Curve (7-band EQ geometry on the device itself)
```

**Desktop devices** (`DESKTOP_TYPES` in `scripts/dump-projects.ts`): instruments (Heisenberg, Pulverisateur, Quantum, Quasar, Pulsar, Gakki, Gravity, Helmholtz, Bassline, Machiniste, Rasselbock, Beatbox8/9, Tonematrix, …), FX (stompboxes, Waveshaper, Curve, Space, Exciter, …), utilities (Centroid, AudioSplitter/Merger, NoteSplitter, MiniMixer, Crossfader, Panorama, TinyGain), and hosts (`audioDevice`, `genericVst3PluginBeta`, `spitfireLabsVst3Plugin`). Shared visual fields: `displayName`, `positionX`, `positionY`, `presetName`, `isActive`.

**Cables.** `DesktopAudioCable` / `DesktopNoteCable`: `fromSocket`, `toSocket`, `colorIndex`. Sockets are pointers into a device field (jack), not world coordinates. **No cable path, bezier, or waypoint is stored.** Geometry must be inferred from device `positionX/Y` plus (unknown) jack offsets.

**Mixer.** `MixerChannel.displayParameters`: `orderAmongStrips`, `displayName`, `colorIndex`. `faderParameters`: `panning` (−1…1), `postGain`, `isMuted`, `isSoloed`. Also pre-gain, trim filter, compressor, 4-band EQ, aux sends. Grouping is an explicit tree (`MixerStripGrouping`).

**Notes.** `positionTicks`, `durationTicks`, `pitch` (MIDI; 60 = C4), `velocity` (0–1), `doesSlide`, `collection` pointer. Regions add timeline placement, loop window, `colorIndex`, `displayName` (e.g. Que pt2 regions `"PT2"`, `"LONG 1st"`).

**Patterns.** Tonematrix: 16×16 boolean grid, pentatonic from C4. Beatbox / Machiniste / Rasselbock / Bassline: step banks with `length`, `stepScaleIndex`, per-channel `isOn` (and Machiniste effect patterns). Factory banks are large (28–32 slots) and often empty.

**Signature geometry.** Waveshaper anchors: `(x, y, slope)` on the unit square, plus implicit `(0,0)` and `(1, finalY)`. Curve: seven filter bands (`lowPass`, `highPass`, shelves, three peaks) with Hz / dB / Q — a drawable EQ silhouette.

**Automation.** Events: `positionTicks`, `value`, `slope`, `interpolation` (stepped / sloped). Dense on finished songs (Wave the Shape: 299 events; Que pt2: 131).

### Sample density — eight originals

From `dumps/fingerprints.json` and `dumps/overview.json`. Kinds match `BRIEFING.md`.

| Project | Kind | Entities | Devices | Audio cables (colors) | Mixer ch / named | Notes (pitch) | Pattern banks | Desktop bounds |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Que pt2** | Finished song | 2779 | 68 | 78 (all `40`) | 21 / 9 names | 2046 (21–102) | Machiniste 32 | 8.6k × 7.3k |
| **Wave the Shape** | Finished song | 4564 | 54 | 62 (`40`, null) | 14 / 6 names | 3794 (2–108) | Machiniste 1 | 9.4k × 5.4k |
| **Designer Setup** | Rack / patch | 522 | 138 | 153 (7 colors) | 3 / 0 names | 61 (36–68) | token banks | 7.4k × 7.5k |
| **strange desktop patching** | Rack / patch | 222 | 45 | 62 + 4 note (17 colors) | 1 / default | 0 | Beatbox 28+28 | 14.1k × 9.6k |
| **Shots** | Pattern museum | 235 | 35 | **0** | 9 / 0 names | 0 | Full TM/BB/BL/M/R banks | 3.9k × 3.5k |
| **Beast Within** | Sketch | 96 | 1 | 1 | 1 / default | 72 (52–66) | none | point |
| **Piano Grain** | Sketch | 49 | 3 | 3 | 1 / unnamed | 0 | none | 0.8k × 0.5k |
| **The Block** | Sketch | 31 | 2 | 2 | 1 / default | 0 + 1 audio region | none | 0.2k × 0 |

Additional observed facts:

- **Device names are almost always present** (`namedDevices` equals `devices` on every dump). Mixer names are the scarce, high-value labels.
- **Cable color is expressive only on patch documents.** Songs default to index `40`. Strange desktop patching uses 17 distinct indices including `null`.
- **Mixer color is expressive on songs and on Shots** (8–11 hues). Default-only on sketches and on strange desktop patching.
- **Pattern entity count ≠ filled pattern.** Shots and strange desktop patching include many empty `{}` steps. Count of `isOn: true` (or Tonematrix `true` cells) is the real signal. Que pt2’s 32 Machiniste patterns sit *inside* a song that is otherwise note-driven.
- **`patternTracks` / `patternRegions` are zero everywhere.** Pattern devices exist; they are not arranged on the timeline in this corpus.
- **Centroid internals are noisy.** Designer Setup has 64 `centroidChannel` entities; Piano Grain 32; The Block 16. These inflate entity counts without adding desktop marks.
- **Spatial desktop is real.** Positions are large signed integers (thousands of units). Songs and racks occupy a wide plane; sketches collapse to a point or a short line. This is the opposite of “missing spatial coords” — **device positions exist**; **cable routes and jack-local offsets do not**.
- **Existing covers are not document-derived.** Four of eight have `coverUrl`; none have `snapshotUrl`. The cover is an uploaded image, not a rendering of entities.

### Existing visualization ideas (in-repo only)

All from `BRIEFING.md` and the dump summarizer — nothing is drawn yet.

- Palette from mixer `colorIndex` and cable colors.
- Signature marks from waveshaper / Curve geometry so the image cannot be mistaken for a generic MIDI visualizer.
- Default song look: arrangement as the body, mixer colors as the palette, faint desktop graph in the margins.
- Default rack look: constellation only — no fake piano roll.
- Adaptive portrait drawn from entities first; optional later style pass locked to that composition.

---

## Visual encoding principles for a single shareable image

The deliverable is **one still image** (cover / poster / recap card), not a dashboard. Interaction, hover, and linked highlighting are unavailable. That changes which theory applies.

### Munzner: what / why / how

- **What.** Four data types in one document: *tables* (notes, steps, mixer strips), *networks* (desktop + mixer grouping), *fields* (waveshaper/Curve geometry; automation as 1-D fields), *geometry* (desktop positions). Attributes are quantitative (ticks, pitch, velocity, gain, Hz), ordinal (track/strip order, pattern index), and categorical (device type, colorIndex, mute).
- **Why (task).** Not *explore* or *query*. The task is **identify / recognize** (“which project is this?”) and secondarily **characterize** (song vs rack vs textile vs sketch). Munzner’s “search” here is *lookup* by a viewer who already has the target in mind. Consume, not produce.
- **How.** Encode the **dominant layer of that document** with the most accurate channels; demote the rest to retinal / marginal marks. Do not express facts the document does not contain (Mackinlay expressiveness).

### Bertin: visual variables, used as a budget

Bertin’s seven variables — **position, size, value (lightness), texture, color, orientation, shape** — are a budget of seven channels for one picture. A cover that spends all seven on decoration has none left for identity.

| Variable | Best use on this data | Failure mode on a still |
| --- | --- | --- |
| Position | Time × pitch for notes; desktop X/Y for devices; strip order | Two positional frames in one image fight (arrangement *and* desktop both as full-bleed maps) |
| Size | Note duration, velocity, fader gain, cable count | Area is a weak quantitative channel; fat notes look “important” even when they are pads |
| Value | Density, mute/bypass, empty vs filled pattern cells | Low contrast at 600² kills the signal |
| Texture | Pattern grids, hatch for automation vs notes | Texture-as-style (Anadol-like noise) erases structure |
| Color | Mixer / cable / region `colorIndex`; device family | ColorIndex is a **nominal index**, not a perceptually ordered scale; many values are `null` or a single default |
| Orientation | Cable direction, EQ slope, slide notes | Easy to over-aestheticize |
| Shape | Device-class mark, waveshaper silhouette | Too many shapes → clip-art legend nobody reads |

### Mackinlay: expressiveness and effectiveness

- **Expressiveness.** A visual language must say *all and only* the intended facts. Drawing a piano roll for Designer Setup (61 notes, 153 cables) expresses a song that is not there. Drawing a dense constellation for Beast Within (1 device) expresses a rack that is not there.
- **Effectiveness ranking (quantitative):** position ≫ length ≫ angle/slope ≫ area ≫ volume ≫ color/density. So: **put time and pitch on position**; put velocity on length or value, not on hue; put `colorIndex` on hue only as a *category* key.
- **Importance ordering.** The most important attribute of *this* document gets the most accurate channel. For Que pt2 that is note time×pitch; for Designer Setup it is device position + cable incidence; for Shots it is filled step cells. Variants (below) are permitted re-orderings of importance, not new facts.

### Tufte, applied to a cover

- **Do not invent density.** Empty pattern slots and unity-gain mixer strips are not “visual opportunities.”
- **Data-ink.** Chrome (fake bezels, fake wood, fake lens flare) is not identity.
- **Small multiples** are how you get four variants: same encoding grammar, different emphasis — not four unrelated styles.
- **Lie factor.** Mapping `playDuration: "0s"` to a short bar, or mapping 32 empty Machiniste slots to a full textile, is a lie.

### Semiology of graphics → one image as a *sentence*

Bertin treats a graphic as a sentence: marks are words, the plane is syntax. A shareable image has to be a **sentence the owner can reread**, not a mood board.

Implications that should constrain *all* modes:

1. **One primary plane.** Either time×pitch, or desktop X/Y, or a step matrix. A second plane may exist only as a margin, watermark, or collapsed sparkline.
2. **Categories need a key or a familiar convention.** Mixer colors only identify if the viewer already knows Audiotool’s palette *or* if names are lettered. Dear Data always printed a key on the back; a 600² cover rarely can. Prefer encodings that survive without a legend (position of named strips, unique silhouette of *this* graph).
3. **Nominal color is not a scale.** `colorIndex` 1, 2, 36 are labels. Do not interpolate them.
4. **Recognition beats beauty.** If two projects can be swapped after a style pass, the style pass failed expressiveness.
5. **Sparse documents stay sparse.** Negative space is a fact about The Block and Piano Grain.
6. **Geometry that is already in the file is a signature, not decoration.** Waveshaper polylines and Curve EQ shapes are unique to the document and are not MIDI-generic.
7. **Still-image compression.** At cover size, thousands of notes must aggregate (regions, pitch-class density, track bands). At poster size, individual notes can remain. Design the encoding so both sizes are the same sentence at different resolutions — not two different lies.

---

## Precedent survey

Focus: how each work **encodes project-like data into a picture**, what to steal, what to avoid. Not how to draw a Gantt or a rack.

### Music documents → still images

**Martin Wattenberg, *The Shape of Song* (2001)** — [bewitched.com/song.html](https://www.bewitched.com/song.html); paper *Arc Diagrams: Visualizing Structure in Strings* (InfoVis 2002). MIDI is parsed as a string; repeated passages become translucent arcs. Time is the baseline; identity is *form* (Bach vs Glass vs Madonna), not timbre. Steal: one structural fact (repetition) on the strongest channel; prints as souvenirs. Avoid: analyzing audio; requiring interaction. Directly applicable to note collections and region names (`PT2` repeating).

**Stephen Malinowski, Music Animation Machine** — [musanim.com](https://www.musanim.com/). Graphical scores: pitch×time bars, color = voice/instrument. Mostly *animated*, but the stills are readable sentences. Steal: pitch on position, voice on hue. Avoid: treating animation as required for identity.

**kosua20 MIDIVisualizer** — [github.com/kosua20/MIDIVisualizer](https://github.com/kosua20/MIDIVisualizer). OpenGL piano-roll performance videos from MIDI. Steal: note table → picture with export. Avoid: rhythm-game glow as the only look; it would make Que pt2 and Wave the Shape interchangeable.

**Audiotool’s own `snapshotUrl` / community “look at the snapshot” culture.** Published tracks sometimes ship a 640×480 DAW snapshot (legacy CDN paths appear in track comments). The API field exists (`project_pb.d.ts` field 15) and is empty on this corpus. Steal: the *job* (document portrait as cover). Avoid: literal UI chrome (playheads, inspectors, unread labels at 600²). This project is the snapshot the platform did not generate.

**Ableton / Bitwig / Reason screenshot-as-cover.** Informal culture: arrangement view or rack as album art. Encodes the *tool’s pixels*, not a chosen subset of facts. Steal: the social proof that a document picture can be a cover. Avoid: screenshot fidelity (BRIEFING forbids this).

**ShaderNoice** (named in `BRIEFING.md` and on an Audiotool track description). Arrangement import already works. Gap this repo exists to fill: desktop, mixer, patterns, waveshapers.

### Patch / rack documents → shareable images

**ModularGrid** — [modulargrid.net](https://modulargrid.net/). User racks become CDN JPEGs (`cdn.modulargrid.net/img/racks/modulargrid_<id>.jpg`) used as forum images and printed posters. Encoding: HP × row position, panel art as texture, optional cables. Steal: the rack *is* the image; spatial layout is the identity. Avoid: photographic panel art we do not have (Audiotool devices are typed, not textured); stale screenshot cache as a product lesson.

**Patch & Tweak notation / scribbletune `patch-notation-tool`.** Standardized symbols + cable-type colors (audio / CV / gate / clock / pitch) exported to SVG/PNG. Steal: **signal type on hue**, not decoration on hue; export a diagram, not a screenshot. Avoid: requiring a learned symbol font without a key at cover size.

**Patchmatic** (macOS). Physics-cabled Eurorack documentation, PDF export. Steal: cables as first-class documented objects with color. Avoid: inventing cable sag that implies waypoints we do not store.

**Reason rack / Bitwig Grid / VCV Rack.** The patch *is* the public image of the instrument. Same lesson as Designer Setup: constellation, not piano roll.

### Data souvenirs (year-in-review / recap cards)

**Spotify Wrapped** (Year in Review 2013 → Wrapped 2016–). Listening tables → a *sequence* of shareable cards. Encoding is rhetorical: one statistic per frame, bold type, a yearly visual system (2022: 16×16 “monograms” holding album art; later years collage/mixtape). Steal: **one fact per frame**; identity via the user’s own names and counts; social 9:16 crop. Avoid: invented “listening personality” labels that are not in the document; a style so loud that two different libraries look like the same campaign.

**Apple Music Replay.** Same data class, calmer encoding, year-round rather than a stunt. Steal: typographic hierarchy over decoration. Avoid: nothing — useful as the quiet variant.

**GitHub contribution graph + GitHub Skyline** ([github/gh-skyline](https://github.com/github/gh-skyline)). Day × week grid; value = contribution count; Skyline extrudes value into height for a 3D-printable STL. Steal: a **calendar already in the data** becomes a recognizable silhouette; ASCII preview proves the encoding before the pretty pass; physical souvenir. Avoid: extruding a third dimension when the 2-D sentence was already enough; contribution graphs look similar across users except at the extremes.

**Last.fm collages** (Tapmusic, Lastcollage, SongStitch). Scrobbles → album-art grid. Encoding: rank → cell, cover image as the mark. Steal: grid as souvenir. Avoid: we do not have album art per device; substituting generic device icons would be clip-art.

**Nicholas Felton, Feltron Annual Reports (2005–2014).** Personal year → printed report / poster. Steal: many attributes, disciplined small multiples, a designed *system* rather than one chart. Avoid: dashboard-on-a-poster (unreadable at cover size).

**Strava “Year in Sport” posters** (e.g. Lisa-Ho’s Streamlit app). GPS + activity tables → one poster. Steal: traces as identity (routes are unique). Closest analogue here: desktop bounds + cable graph, or note-cloud silhouette.

**Festival lineup poster generators** (festivalpostergenerator.com; Orshot templates; Concerts Remembered recap posters). A list + hierarchy (headliner size) → one image. Steal: **name hierarchy on size** (mixer names, device names). Avoid: applying lineup typography to a document that has no “headliner” field — you would be inventing rank from `postGain` or note count.

### Software-project tools (Linear / Notion / Height)

**Linear** exports CSV and live Notion previews (title, status, assignee) — not a souvenir image. Third parties (Cadence for Linear, Linage) turn cycles into **prose reports / PDFs**, not pictures. **Notion** and **Height** similarly: databases, not posters.

**Steal the negative lesson:** knowledge-work tools are bad at “one image of the project.” Music and modular communities already expect a picture. Do not copy Linear’s export culture; copy Wrapped / ModularGrid / Shape of Song.

### Hand-drawn data pictures (semiology, slow)

**Giorgia Lupi & Stefanie Posavec, *Dear Data* (2014–15; book 2016).** Weekly personal tables → postcard front + **key on the back**. Steal: a custom visual language per dataset; the key as part of the deliverable when the encoding is novel; “personal documentary” not quantified-self efficiency. Avoid: an encoding so private that only the authors can read it — unless a key is printed.

**Stefanie Posavec, *Writing Without Words* (2006) and *(En)tangled Word Bank* (with Greg McInerny).** Kerouac / Darwin as hierarchical organisms: part → chapter → paragraph → sentence on position; theme or survival on color. Steal: **document structure as a plant/tree** — Audiotool’s mixer grouping tree and note-region hierarchy are the same shape of data. Avoid: hand-count aesthetics as an excuse for inaccurate aggregation.

### Architecture: BIM → axonometric poster

**Revit / BIM exploded axons** (Displace Elements; then Illustrator color overlays). The model already has coordinates; the poster is a **view** (section box, hidden categories, one projection) plus a legend. Steal: **same model, different views** = variants; hide categories rather than invent geometry; color as overlay on a truthful line drawing. Avoid: photoreal stills that hide the data (Enscape-as-cover).

### Live-production cousins (encoding only)

These are not this product’s domain. They matter because they already solve “structured studio/show data → a sheet people tape to a case.”

| Product | Data → image | Steal | Avoid |
| --- | --- | --- | --- |
| **Drafty** (drafty-app.com) | Rack units + USITT symbols → PDF plate; auto-updating key | Plate + key as a pair; scale-accurate export | Importing photos of faces as if we had device art |
| **Vectorworks Spotlight + ConnectCAD** | Equipment + rack U + schematics → image/PDF | Hybrid 2-D/3-D from one model; error-checked connections | Full CAD UI as the picture |
| **Vectorworks Vision / Capture / Depence** | Plot + fixture data → rendered stage | Only if you have spatial stage data (we do not) | Fake lighting plots from a DAW |
| **ShowXpress / Cadence (lighting)** | Fixture schedule → pixel preview | Channel index → pixel is a clean encoding | Confusing lighting “Cadence” with Linear-report “Cadence” |
| **RackTools / X32 rack planners** | Mixer channel + rack U → elevation | Channel names + colors as the identity strip | Assuming rack-U positions (Audiotool mixer has `orderAmongStrips`, not U) |
| **StagePlotPro / input lists** | Inputs, names, colors → one page | Name + color + order as a readable strip | Stage geometry we do not have |

### Caution: unreadability dressed as data

**Refik Anadol, *Machine Hallucinations* / *Unsupervised* (MoMA 2022).** Large image corpora → flowing latent fields. Critics (Jerry Saltz; Eryk Salvaggio; e-flux) describe screensaver awe: the source records are not recoverable from the picture. Steal: nothing for a *recognizability* product. Avoid: style-pass that turns Que pt2 and Designer Setup into the same fluid. If a later image model is used, it must remain a **texture on a locked composition**, as `BRIEFING.md` already says.

**Generic “AI album cover from prompt.”** Encodes the prompt, not the document. Out of scope.

---

## Data → image opportunity matrix

Generic field × visual variable × caveat. Not a mode list.

| Field / derived | Type | Strongest channel | Weaker / noisy use | Caveat |
| --- | --- | --- | --- | --- |
| Note `positionTicks` | Q, time | Position (x) | Color “heatmap of time” | Must convert via 3840 ticks/beat + `tempoBpm`; `playDuration` is not a substitute |
| Note `pitch` | Q | Position (y) | Hue as rainbow pitch | Range varies wildly (Wave 2–108 vs Beast 52–66); fix scale per project or notes become a smear |
| Note `durationTicks` | Q | Length | Area | Long held notes dominate ink |
| Note `velocity` | Q 0–1 | Value or length | Hue | Mean ~0.7–0.8 in songs; low dynamic range |
| Note `doesSlide` | binary | Orientation / connector | Extra color | Rare; only encode if present |
| NoteRegion `displayName` / `colorIndex` | N | Label; hue as category | Using region color as the whole palette | Names like `PT2` are identity; many regions unnamed |
| NoteRegion span | Q | Position band (arrangement blocks) | 3-D extrusion | Best aggregation at 600² |
| Device `positionX/Y` | Q, space | Position (desktop plane) | Jittered “constellation” that ignores coords | Coords exist; do not replace with force-layout unless bounds collapse (Beast Within) |
| Device `type` | N | Shape or small-set hue | 40+ unique icons | Group: instrument / FX / utility / host |
| Device `displayName` | N | Type (few labels) | Labeling all 138 devices | Label named instruments only (`Drums`, `_CHORDS`) |
| Device `isActive` | binary | Value (ghost) | Drop from image | Almost always true in this corpus |
| Cable from/to | network | Position (inferred edges) | Edge bundling that hides hubs | **No path geometry**; straight or simple route only |
| Cable `colorIndex` | N | Hue | Hue on songs (constant 40) | Use only when cardinality > ~3 (strange desktop, Designer Setup) |
| Note vs audio cable | N | Texture or hue family | Same style | Note cables are rare (4 + 1 + 0…) |
| Mixer `orderAmongStrips` | O | Position | Arbitrary circle | True left-to-right of the desk |
| Mixer `displayName` | N | Type | Decorative word cloud | Highest-value identity field on songs; often empty on racks |
| Mixer `colorIndex` | N | Hue (palette) | Interpolated gradient | `null` = default; do not treat as 0 |
| Mixer `panning` | Q −1…1 | Position (x offset) or orientation | Subtle to vanish | Que `RL`/`RR` are a real stereo fact |
| Mixer `postGain` / mute / solo | Q / B | Length / value | Neon “solo” | Mostly unity gain; mute is rare (`SK Signal`) |
| Mixer grouping tree | tree | Containment / connection | Second full graph | Songs only (Que 5 groups; Wave 2) |
| Pattern step `isOn` / Tonematrix bools | B grid | Position + value | Counting empty slots as pattern | **Filter empty banks** |
| Pattern `stepScaleIndex` / `length` | N / Q | Column count | Ignored | Changes grid aspect |
| Waveshaper anchors + `finalY`/`finalSlope` | geometry | Position + orientation | Thumbnail too small to read | Signature mark; unique vs generic MIDI art |
| Curve EQ bands | geometry | Position (Hz) × length (dB) | One more line in a busy song | 27 Curves on Que, 18 on Wave — aggregate or pick named ones |
| Automation events | Q series | Position + value (sparkline) | Full 31-track overlay | Dense (299 on Wave); margin only unless it *is* the document |
| `tempoBpm` | Q | Type, or pulse spacing | Color temperature | Weak identity (120 default on half the dumps) |
| `durationTicks` | Q | Width of time axis | Mapping `playDuration` | Use ticks; 16-bar default vs 100+ bar songs |
| `baseFrequencyHz` | Q | — | Tuning color | 440 everywhere; skip |
| Time signature | N | Grid modulus | Fake odd-meter art | 4/4 everywhere here |
| Project `displayName` | N | Type | Hidden in a texture | Should remain readable on at least one variant |
| `tags` / `genreName` | N | — | Mood palette | Sparse; not in the document body |
| `coverUrl` | image | — | Style-transfer source | Existing cover is *not* ground truth |
| `snapshotUrl` | image | — | Fallback | Missing |
| Sample waveform | field | — | Background waveform | Blobs omitted from dumps; briefing forbids waveform-as-picture |
| `centroidChannel` / VST internals | — | — | Node spam | Noise |
| Groove `impact` | Q | Micro-offset of steps | Visible swing drawing | Subtle; optional |

---

## Gaps the data model should flag

Gaps that would block a *good* image, or that would make a renderer lie.

1. **No official color LUT.** `colorIndex` is “implementation-specific” (`desktop_audio_cable_pb.d.ts`, `region_pb.d.ts`). The SDK dump has no RGB table. Without a captured Audiotool palette, mixer/cable/region colors will not match the DAW the owner remembers — a recognition failure.
2. **No cable geometry.** Devices have `positionX/Y`; cables have sockets only. Jack-local offsets (where on the device the wire lands) are not in the entity. Any organic cable drawing is invented. Honest encoding: device-to-device edges.
3. **`playDuration` is not duration.** Finished unpublished songs show `0s`. Always prefer `config.durationTicks` + BPM. Even then, duration is *timeline length*, not “how much music exists” (16-bar default on empty racks).
4. **Empty pattern banks look full in counts.** Fingerprints report `beatbox8Pattern: 28` etc. Many steps are `{}`. Images must use filled-cell counts, not entity counts. Classifier threshold “many pattern entities” in `BRIEFING.md` is therefore slightly unsafe.
5. **Pattern timeline is unused.** `patternTracks` / `patternRegions` are specified in protos and are zero in the corpus. Do not assume patterns appear on the arrangement.
6. **Mixer names are optional.** Designer Setup and Shots have colors (or channels) without names. Songs have names without complete colors. A “named strip legend” variant will be empty on racks.
7. **Default cable color collapses the channel.** Que pt2’s 78 cables are one hue. Cable color cannot be the palette for songs.
8. **No snapshot, weak cover provenance.** Cannot compare a generated image to an official document portrait. Covers that exist are uploaded art, not encodings.
9. **No audio-derived features in-scope.** Briefing forbids waveform-as-source. There is also no key/scale, no chord label, no loudness, no section annotation except region names. Harmonic “mood” would be inferred, not read.
10. **Tick-to-bar needs signature.** Corpus is 4/4; the API allows other signatures. Hard-coding 15360 ticks/bar would break a 3/4 project (`Ticks.Bars` already handles this).
11. **Desktop bounds can be degenerate.** Beast Within is a single point; The Block is a horizontal pair. Force-directed or “constellation” layouts must detect collapsed bounds or they will invent space.
12. **Heavy fields are stripped.** Samples and large blobs are omitted (`stripHeavyFields`). You cannot honestly draw a sample’s waveform from these dumps. Audio regions can be drawn as *blocks* (span + track), not as waveforms.
13. **Pointer `fieldIndex` is opaque without schemas.** Cable endpoints name a jack only if the renderer knows each device’s field numbers. Today’s summarizer already reduces this to `from`/`to` entity ids — topology yes, jack identity no.
14. **Auth-walled documents.** Pictures cannot be generated from public track pages alone. Remixes were excluded from dumps; a remix’s image would need a policy (show delta vs parent?).
15. **Genre/tags/description are listing-layer.** They will not distinguish two instrumentals in `genres/other`. Do not build the portrait on metadata the document does not contain.
16. **Automation target is indirect.** Events live in collections pointed at by regions/tracks; the *parameter* being automated is another pointer. Easy to draw “automation mass,” hard to draw “filter cutoff of Quasar 3” without more joins.

---

## Implications for “~4 variants” at the data level

Variants are **the same facts, different importance order** (Mackinlay), not four styles and not the four document *kinds* (those are modes / classifiers).

A useful test: if you hide the title, a knowledgeable viewer can still match all four images to the same project; if you swap two projects’ variants, none of the eight images should still match.

Suggested emphasis axes (data-level, mode-agnostic):

| Variant emphasis | Figure (accurate channels) | Ground (retinal / margin) | Who it serves | Empty-document risk |
| --- | --- | --- | --- | --- |
| **A. Arrangement / time** | Notes + regions on time×pitch or time×track | Mixer hues as track color; faint desktop | Songs (Que, Wave); Beast Within still works (72 notes) | Designer Setup / Shots / Piano Grain look falsely empty or need to refuse this emphasis |
| **B. Graph / studio** | Device positions + cables | Mixer as a strip along an edge | Racks; songs as “margin graph” | Shots has **zero cables** — graph variant must fall back to device positions only |
| **C. Mixer / names** | Strip order × color × labels; grouping tree | Arrangement sparkline | Songs with named channels | Designer Setup (0 names), sketches (1 default strip) |
| **D. Signature geometry / banks** | Waveshaper+Curve silhouettes and/or filled pattern grids | Everything else collapsed | Wave the Shape (7 shapers), Designer Setup (17+19 anchors), Shots (grids) | Beast Within / The Block have almost none |

Rules that keep variants honest:

1. **Do not fabricate the missing layer.** If emphasis D has no anchors and no filled steps, do not generate a textile. Skip or substitute C/A.
2. **Keep one shared identity mark across the set** — project title, or the mixer-name set, or the desktop bounding silhouette — so the four images are a *small multiple*.
3. **Reassign channels; do not resample facts.** Same note list, same cable list. Changing aggregation (notes vs regions) is allowed; adding noise or a style-only palette is not.
4. **Wrapped-style “one statistic” cards are a fifth product**, not a variant of a portrait. They encode counts (`3794 notes`) that any project could share. Use them as captions, not as the picture.
5. **Skyline-style extrusion** (value → height) is a variant of *value encoding*, not new data. It helps GitHub because the 2-D grid is already famous. It helps here only if the 2-D sentence is already recognizable (contribution graph : GitHub :: piano roll : this DAW).
6. **BIM lesson:** variants are *views* (hide categories, change the section box), not remakes. “Hide notes / hide cables / hide devices / hide empty patterns” is the cheapest correct implementation of four variants.

---

## Sources

### This repository (empirical)

- `BRIEFING.md` — goals, kinds, classifier sketch, success test, ShaderNoice note
- `package.json` — `@audiotool/nexus` ^0.0.17
- `scripts/dump-projects.ts` — entity families, summarizer, remix/kit filters, GetEntities path
- `scripts/fingerprints.ts` — per-project visual-driver extract
- `dumps/projects-index.json` — 112 project resources
- `dumps/overview.json`, `dumps/fingerprints.json` — eight-document density
- `dumps/<uuid>/{meta,summary,entities}.json` — field-level evidence (notes, cables, mixer, patterns, waveshaper anchors)
- Nexus protos under `node_modules/@audiotool/nexus/dist/gen/audiotool/document/v1/entity/` and `.../project/v1/project_pb.d.ts`
- `node_modules/@audiotool/nexus/dist/utils/ticks.d.ts` — 3840 ticks/beat, 15360 ticks/bar

### Encoding theory

- Jacques Bertin, *Sémiologie graphique* (1967); English *Semiology of Graphics* (1983)
- Jock Mackinlay, “Automating the Design of Graphical Presentations of Relational Information,” *ACM TOG* 5(2), 1986; APT expressiveness / effectiveness rankings
- William Cleveland & Robert McGill, “Graphical Perception,” *JASA* 1984 (empirical ranking Mackinlay extends)
- Tamara Munzner, *Visualization Analysis and Design* (2014) — what/why/how; channel types
- Edward Tufte, *The Visual Display of Quantitative Information* (1983) — data-ink, lie factor, small multiples
- InfoVis:Wiki, “Visual Variables” — Bertin → Mackinlay transmission

### Precedents

- Martin Wattenberg, *The Shape of Song* (2001), https://www.bewitched.com/song.html ; *Arc Diagrams*, InfoVis 2002, http://hint.fm/papers/arc-diagrams.pdf
- Stephen Malinowski, Music Animation Machine, https://www.musanim.com/
- kosua20, MIDIVisualizer, https://github.com/kosua20/MIDIVisualizer
- Spotify Wrapped design: It’s Nice That on 2022 monograms; Spotify News “Designing 2025 Wrapped”; Spotify Engineering “Inside the Archive” (2026)
- Apple Music Replay — annual recap; quieter encoding, year-round stats
- GitHub Skyline: https://github.com/github/gh-skyline ; Codegram case study on the original 3-D trophy
- Tapmusic / Lastcollage / SongStitch — Last.fm collage generators
- Nicholas Felton, Feltron Annual Reports 2005–2014, http://feltron.com/
- Giorgia Lupi & Stefanie Posavec, *Dear Data*, http://www.dear-data.com/ ; Princeton Architectural Press, 2016
- Stefanie Posavec, *Writing Without Words*; Posavec & McInerny, *(En)tangled Word Bank*
- ModularGrid rack snapshots, https://modulargrid.net/ ; forum threads on poster-resolution exports
- Patch & Tweak symbol language; scribbletune/patch-notation-tool
- Patchmatic, https://github.com/pkyme/patchmatic
- Drafty, https://www.drafty-app.com/ ; Vectorworks ConnectCAD, https://www.vectorworks.net/en-US/connectcad
- Festival poster generators: https://festivalpostergenerator.com/ ; Concerts Remembered festival recap posters; Orshot lineup templates
- Lisa-Ho, *My Year in Sports* (Strava → poster), https://year-in-sports.streamlit.app/
- Refik Anadol, *Unsupervised — Machine Hallucinations* (MoMA 2022). Critiques: Jerry Saltz, *Vulture*; Eryk Salvaggio, *Cybernetic Forests*; Loosin, e-flux (March 2023)
- Linear export docs, https://linear.app/docs/exporting-data ; Cadence for Linear / Linage (cycle *text*, not images)
- Audiotool project/cover/snapshot fields: Nexus `project_pb.d.ts`; community snapshot comments on audiotool.com tracks
