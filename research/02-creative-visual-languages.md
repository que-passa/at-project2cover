# Creative visual languages for Audiotool project portraits

Modes 3–10 only. Timeline / Gantt / swimlane pictures and rack / cable / stage-plot technical drawings are already covered elsewhere. Generation models, APIs, ControlNet, and the variant-picker product architecture are out of scope; a mode may ask for an engraved, photographic, or vector *look*, but this brief does not survey tools.

This is a research brief, not a build spec. The job is to name visual systems someone would save, print, or share — album-adjacent objects — that are still *driven by the document*.

---

## What the document actually contains

This repo is not a people / tasks / venues planner. It turns an Audiotool studio document into an image. The briefing’s “people, tasks, dates, gear, venues, relationships” map onto studio entities as follows:

| Prompt language | Real field in the dumps |
| --- | --- |
| People (the cast) | Device `displayName`, mixer `displayName` |
| Tasks (what happened) | `note` (pitch, velocity), `noteRegion` / `audioRegion`, pattern cells |
| Dates (when) | `config.durationTicks`, region placement in ticks, `tempoBpm`, time signature |
| Gear | Device `type` (`heisenberg`, `quantum`, `waveshaper`, `stompbox*`, `machiniste`…) plus `presetName`, `isActive` |
| Venues (where) | Desktop `positionX` / `positionY` and `bounds`; mixer groups / aux |
| Relationships | `desktopAudioCable` / `desktopNoteCable` (`from`, `to`, `colorIndex`); `mixerSideChainCable`; aux routes |

Eight original documents were dumped (account `dquerg`). They are four *kinds* of object, and any mode that cannot survive all four will produce interchangeable mush:

| Kind | Fixtures | What dominates |
| --- | --- | --- |
| Finished song | Que pt2 (2,046 notes, 21 named mixer strips), Wave the Shape (3,794 notes, 7 waveshapers / 37 anchors) | Arrangement + mixer palette |
| Rack / patch | Designer Setup (138 devices, 153 cables, 17 waveshapers), strange desktop patching (45 devices, 17 cable colors, almost no notes) | Desktop graph |
| Pattern museum | Shots (0 cables; full Beatbox / Tonematrix / Machiniste / Rasselbock / Bassline banks) | Pattern grids |
| Sketch | Beast Within (1 Pulverisateur, 72 notes, tags `rap` / `dark`), The Block (2 devices, 1 sample), Piano Grain (2 Centroids + Minimixer) | Sparseness is the fact |

Signature fields the briefing already flagged, and that creative modes should steal:

- Mixer strip names that are already poetry: `Softest Kick`, `Soft Kick`, `Rough Kick`, `Glowy B`, `Glow A`, `SK Signal`, `Bd-Sn`, `HH1`. Device names that are worse and better: `Softer Synth?`, `OTT 0 ATTACK, BUT ITS SHARP`, `for people who like clean hard but clean drum and bass for maybe`.
- `colorIndex` on mixer strips and cables. Que pt2’s cables are almost all index 40 (useless as a rainbow). strange desktop patching’s cables are a 17-color carnival. Palette must come from *whichever* layer is actually expressive.
- Waveshaper anchors and Curve device geometry — the one motif that cannot be mistaken for a generic MIDI visualizer.
- Desktop coordinates are real and huge (Que pt2 spans roughly −5400…3200 × −2200…5100). They are a map, not a doodle.

Classifier already implied in `BRIEFING.md`: notes > 500 → arrangement-led; cables > 40 and notes < 200 → patch-led; many pattern entities and no notes → textile-led; else → sparse still-life. Creative modes should *obey* that hunger, not invent density.

---

## Ranked candidates

**Recommended for slots 3–10** are the first eight. 11–12 are honorable mentions that are strong but either overlap a recommended mode or starve on half the library.

Readability vs souvenir is called on every card. “Readable” means a person who knows the project can point at the picture and name a strip, a device, or a structural fact. “Souvenir” means they would hang it; they might not be able to read it back.

---

### Mode 3 — Uranometria (patch constellation) — **SLOT 3**

**Pitch.** The desktop becomes a copperplate star atlas: devices are stars, cables are asterisms, mixer names are constellation titles.

**Visual references.** Johann Bayer, *Uranometria* (1603), plates engraved by Alexander Mair after Jacob de Gheyn — one constellation per plate, a degree grid you can actually read. Johannes Hevelius, *Firmamentum Sobiescianum* (1690) — figures drawn as if on a globe, from the outside looking in (a useful variant axis: geocentric vs external). Alexander Jamieson, *A Celestial Atlas* (1822). Modern: Nadieh Bremer’s constellation-like network plates; the IAU’s official constellation-boundary polygons (Delporte, 1930) as a *legend* language, not as astrology.

**Data encoding.**

| Field | Visual variable |
| --- | --- |
| Device `positionX/Y` | Star position (normalize desktop bounds onto a labeled RA/Dec-style grid) |
| Device `type` | Spectral class / glyph (synth = diamond, FX = cross, drum machine = disk, utility = triangle) |
| Degree (cables in + out) or mixer `postGain` | Magnitude (dot size). Isolated devices stay faint. |
| `isActive` | Filled vs open star |
| Audio cable vs note cable | Solid vs dashed asterism line |
| Cable `colorIndex` | Line hue *only when the document actually used more than two colors*; otherwise ink the lines in one night-sky metal and put color on the constellation *figures* from mixer `colorIndex` |
| Mixer / device `displayName` | Constellation label in a period cartouche (`SOFT KICK`, `_CHORDS`, `GLOWY`) |
| `tempoBpm` | Grid density or the number on a small “epoch / epochal tempo” cartouche |
| `durationTicks` | Declination span of the plate (longer songs = taller sky) |

**Why it looks good.** Bayer plates are already posters: black field, cream paper, a figure that is slightly ridiculous, a grid that makes the joke scientific. The cultural read is “this session has a mythology,” which is exactly what a named mixer cast is. Distinct from the reserved cabling mode because the picture is a *sky*, not a patchbay — lines are asterisms, not signal flow you could rewire from.

**Failure modes.** Sketches (The Block, Piano Grain) become two lonely stars — honest, but the plate needs a large figure and empty sky, not a zoom that invents a cluster. Designer Setup’s 138 devices will blot out the constellation figure unless you magnitude-threshold (show the top N by degree, ghost the rest). AI-drawn mythological figures will grow extra limbs; lock the figure to a silhouette derived from the *convex hull of the named devices*, or drop the figure and keep only Bayer-style star glyphs plus labels. Do not sell this as a horoscope.

**Four-variant axes.** (1) Epoch: 1603 copperplate / 1820 hand-colored / 1970 NASA black-and-cyan / 19th-c. gilt planisphere. (2) Figure density: stars-only / faint outline / full allegorical body. (3) Projection: geocentric (Bayer) vs external-globe (Hevelius) vs polar planisphere. (4) Label language: mixer names / device types / Latinized type names (`Heisenbergius`, `Machinista`).

**Fit.** Best default for racks (Designer Setup, strange desktop patching). Songs still work if mixer-named devices become the named constellations and unnamed Curves collapse into the Milky Way. Shots has positions but no cables — treat pattern devices as a small asterism and fill the plate with a “southern sky” of pattern-bank stars. **Readable as information** if labels and the grid stay; **souvenir** if the figure dominates.

---

### Mode 4 — Session herbarium (specimen plate) — **SLOT 4**

**Pitch.** A natural-history museum plate of the session: each important device is a drawn specimen, captioned with a Latinized type and the user’s common name.

**Visual references.** Maria Sibylla Merian, *Metamorphosis insectorum Surinamensium* (1705) — life cycle as one plate. Pierre-Joseph Redouté’s roses (one species, three views). Ernst Haeckel, *Kunstformen der Natur* (1899–1904), especially the radiolaria and medusae plates — symmetry as taxonomy. Audubon double-elephant folio layout (specimen + tiny habitat). Modern herbarium vouchers: a pressed plant, a scale bar, a collection label with locality / date / collector. Irma Boom’s taxonomic book spreads; the caption language of a NHM specimen sheet, not a dashboard.

**Data encoding.**

| Field | Visual variable |
| --- | --- |
| Device `type` | Specimen morphology (Heisenberg = one leaf shape, Quantum = another, stompboxes = insects, waveshapers = shells whose lip follows the anchor polyline) |
| `displayName` | Common name on the ticket (`Softer Synth?`) |
| Type, Latinized | Binomial (`Quantum audiotoolensis`) |
| Mixer `colorIndex` / `postGain` | Wash color and saturation of that specimen |
| Mixer group / aux | Tray / column on the plate (“Group A”, “Reverb send”) |
| `isActive` / muted | Living wash vs graphite-only / greyed ticket |
| Waveshaper anchors, Curve geometry | Venation, shell ribs, insect wing veins — the anti-generic-MIDI mark |
| Note count or region count feeding that device | Scale of the drawing (or number of “fruits” on the stem) |
| `genreName`, tags, bpm | Collection label: locality, habitat, date-as-tempo |
| Desktop bounds | Tiny “habitat sketch” in a corner (not a second map) |

**Why it looks good.** Museum plates are already designed to be framed. Cream ground, one or two ink weights, a typed label block, generous margin. The cultural read is “this project was collected,” which flatters both a finished song and a weird rack. Que pt2’s mixer cast (`Softest Kick` / `Soft Kick` / `Rough Kick`) becomes a three-specimen series on one sheet — instantly that project.

**Failure modes.** Default names (`Heisenberg`, `Heisenberg (1)`) make a boring plate; fall back to type + a small desktop-coordinate “locality.” 138 devices cannot all be hero specimens — pick a *type series* (one of each type) plus the named mixer-facing devices. AI will invent fake Latin and extra petals; the binomial must be generated from `type`, not dreamed. Do not draw endangered-species or sacred-plant lookalikes as a joke.

**Four-variant axes.** (1) School: Merian narrative / Redouté luxury / Haeckel symmetry / modern voucher (photo-real pressed). (2) Density: holotype only (the master + one hero) / type series / full tray. (3) Caption: English common names / Latin only / bilingual with mixer notes. (4) Ground: cream laid paper / black museum case / wet specimen in alcohol (glass + label).

**Fit.** The most *readable* souvenir in the set. Works on sketches (The Block is a two-specimen plate and should look sparse). Shots becomes a tray of pattern-organisms. **Readable as information.**

---

### Mode 5 — Arc cathedral (shape of the arrangement) — **SLOT 5**

**Pitch.** Martin Wattenberg’s *The Shape of Song* turned into a rose window: repeated passages become stained-glass arches, mixer colors become the glass.

**Visual references.** Martin Wattenberg, *The Shape of Song* (2001) and the InfoVis 2002 paper “Arc Diagrams: Visualizing Structure in Strings” — translucent arcs joining repeated subsequences; already sold as prints at Bitforms. Gothic rose windows (Chartres, Sainte-Chapelle) and Tiffany stained glass for the *material*. Stephen Malinowski’s Music Animation Machine for the idea of pitch as a vertical stained-glass course — use sparingly; the picture must not become a piano roll (that is the reserved timeline lane). Oskar Fischinger’s studies as a mood, not a copy.

**Data encoding.**

| Field | Visual variable |
| --- | --- |
| Notes along `durationTicks` | The baseline of the cathedral (a single nave, not N swimlanes) |
| Repeated pitch-class / rhythm cells (or repeated `noteRegion` contents) | Arches joining those spans; thickness = how exact the repeat is |
| Mixer `colorIndex` of the track’s destination strip | Glass color of that arch family |
| Velocity mean / `postGain` | Luminance of the glass |
| Sidechain cables | Dark leading that pinches an arch (a visual “duck”) |
| `signatureNumerator/Denominator` | Tracery module (4/4 = quatrefoil) |
| Automation event density | Weathering / grime / extra leading in that bay |
| Waveshaper / Curve polylines | Tracery profiles in the rose (the signature mark) |
| Project title | Dedication carved on the west door, once |

**Why it looks good.** Wattenberg’s prints already look like objects you hang. Combining them with rose-window geometry gives a cultural read (“this song has architecture”) without drawing a Gantt. Que pt2 and Wave the Shape will look *unswappable* because their repeat structure and mixer palettes differ; that is the success test from the briefing.

**Failure modes.** Shots, Piano Grain, The Block, and strange desktop patching have ~0 notes — the nave is empty. Do **not** fake arches. Fall back to a small chapel: one rose built from pattern-bank repeats (Shots) or from automation-event spacing (Piano Grain’s two events), or refuse this mode for that document and let the classifier pick another. Too many notes (3,794) will make a brown smear unless you match at a *bar* or *region* granularity, not note-for-note. AI stained glass tends to mush into psychedelic goo; the leading (black stone) must stay a hard graph.

**Four-variant axes.** (1) Material: Chartres mineral glass / Tiffany opalescent / Wattenberg-on-white print / blueprint tracery. (2) Match rule: exact pitch sequence / pitch-class only / region-length repeats. (3) Orientation: nave left-to-right / vertical (Wattenberg’s later prints) / circular rose only. (4) Inscription: none / mixer names in the glass / tempo as a Roman dedication.

**Fit.** The song mode. **Readable as information** at region-scale (you can see verse/chorus architecture); **souvenir** at rose-only. Do not let it drift into a piano-roll poster.

---

### Mode 6 — Imaginary island (desktop as atlas plate) — **SLOT 6**

**Pitch.** The desktop bounds are an island; device clusters are towns; note density is relief; the mixer is the climate legend.

**Visual references.** Abraham Ortelius, *Theatrum Orbis Terrarum* (1570) — decorative cartouches, sea monsters in empty water. MacDonald Gill, *Wonderground Map* (1914) — a place that is also a joke. Stephen Walter, *The Island* (2008) — every annotation earned. Rebecca Solnit / Ben Pease, *Infinite City*. Imaginary-atlas tradition in Katharine Harmon, *You Are Here*. Geological cousin (do not make it the whole mode): William Smith’s 1815 geological map, for *strata as mixer groups* in a single inset. Weather cousin: Humboldt isotherms — use as a legend, not as a second picture.

**Data encoding.**

| Field | Visual variable |
| --- | --- |
| Desktop `bounds` + device positions | Coastline = convex hull (or alpha shape) of devices; interior hills = device clusters |
| Device `displayName` | Place names (`Alarm`, `WashAway`, `Donner`) |
| Device `type` | Land-use tint or building mark (port, mill, chapel) |
| Cables | Roads (audio) and ferries / dotted sea lanes (note cables). Aesthetic routes, not a patch schedule. |
| Cable `colorIndex` diversity | Whether roads are colored or just engraved |
| Note density along time, *folded onto space* via the device that owns the notes | Contour interval / hachures (high = the drum town) |
| Mixer groups | Provinces with a wash from `colorIndex` |
| `postGain`, mute, solo | Capital size; mute = ruined name; solo = underlined |
| `tempoBpm` | Compass rose number / magnetic declination gag |
| Tags / `genreName` | Climate cartouche (`habitats: experimental, atmospheric`) |
| `durationTicks` | Scale bar (“1 league = N bars”) |

**Why it looks good.** Atlas plates are already wall objects: a sea, a legend, a title in a cartouche, monsters in the *empty* water (use emptiness; do not fill it). The cultural read is “this session is a place you could visit.” Que pt2’s named towns (`_CHORDS`, `FX Breath`, `Arp 1`) will not look like Designer Setup’s industrial sprawl.

**Failure modes.** Two-device sketches become a rock with one hut — correct; give them a large sea and a serious cartouche, not a zoom. 138 towns need hierarchy (capitals = named + high degree). Folding time onto space can lie; the legend must say “relief = activity at this device,” not “north is later.” AI maps invent rivers that are not cables and cities that are not devices — every toponym must be a real `displayName` or a type.

**Four-variant axes.** (1) Era: 1570 Ortelius / 1914 Gill pictorial / 1970s USGS topo / modern fantasy-atlas (Walter). (2) Projection: north = desktop +Y / north = “toward master out” / polar (master at the pole). (3) Empty-sea treatment: monsters / rhumb lines / fog. (4) Legend: climate-from-tags / geology-from-mixer-groups / no legend (purist).

**Fit.** Universal: every dump has desktop coordinates. **Spatial.** **Readable** if names and the legend stay; **souvenir** as a fantasy map. Keep roads from becoming the reserved cabling diagram — no socket dots, no signal-flow arrows.

---

### Mode 7 — Pattern jacquard (the session as cloth) — **SLOT 7**

**Pitch.** Step-pattern banks are woven. Warp is time-in-the-pattern; weft is instrument/row; mixer colors are yarn.

**Visual references.** Jacquard loom punch cards — the original digital textile, and already music-adjacent (the card *is* a score). Anni Albers, *On Weaving*, and her pictorial weavings. Beryl Korot, *Text and Commentary* (1976–77) — loom, video, and coded pattern as one work. The 1951 Festival Pattern Group (X-ray crystallography → furnishing fabrics) — scientific data as cloth, which is the whole point. Sheila Hicks for volume and yarn weight. William Morris only as a warning: do not drown the data in foliage.

**Data encoding.**

| Field | Visual variable |
| --- | --- |
| Tonematrix / Beatbox / Machiniste / Rasselbock / Bassline pattern cells | Warp/weft hits (filled cell = a weft pick) |
| Which machine | Stripe or border (Shots has six machines — six bands, like a trade blanket) |
| Mixer `colorIndex` of the destination | Yarn color |
| Velocity / accent if present | Yarn thickness or a second twist |
| Unused pattern slots | Ground cloth (honest empty weave, not invented ornaments) |
| Cables (if any) | A thin contrasting “selvedge thread” that binds two bands — not a second picture |
| `tempoBpm` | Sett (threads per inch) |
| Title, bpm, signature | Woven or embroidered ticket on the selvedge |
| Waveshaper curve | A brocaded motif in the border, only if the document has one |

**Why it looks good.** Cloth is the one picture-type people already photograph, fold, and hang. A jacquard has rhythm you can feel at a glance. Shots — the briefing’s “must look like grids” fixture — finally looks like *itself* instead of a fake song. Que pt2’s 32 Machiniste patterns become a single drum border around a quieter field.

**Failure modes.** Songs with one Machiniste pattern (Wave the Shape) must not pretend to be a museum of cloth; they get a narrow belt plus a large field woven from *note onsets quantized to the grid* (still a textile, not a piano roll: no pitch axis). Racks with no patterns (strange desktop patching has Beatbox banks — good) or Piano Grain (none) need a stated fallback: weave the automation/centroid channel activity as a very open linen, or mark this mode as pattern-hungry. AI “fabric” looks like plastic; specify a *flat* weave diagram or a photographed textile with visible interlacing, not a fuzzy sweater.

**Four-variant axes.** (1) Tradition: punch-card / Anni Albers pictorial / Festival Pattern Group scientific / photographed Navajo-style chief-blanket *structure* (do not copy sacred designs; copy the *stripe logic* only). (2) Density: selvedge ticket + one band / full blanket. (3) Color: mixer yarn / natural undyed + one accent / two-color ikat from the two dominant `colorIndex` values. (4) Finish: flat diagram / drape photograph / museum mount with a pin and label.

**Fit.** Mandatory for Shots. Supporting motif for songs. **Pattern-based.** **Readable** as a drum/pattern map; **souvenir** as a blanket.

---

### Mode 8 — Calligram cover (concrete poetry of the desk) — **SLOT 8**

**Pitch.** The project’s own words are the picture: mixer strips, device names, tags, and the title set as a poster that could only be this document.

**Visual references.** Guillaume Apollinaire, *Calligrammes* (1918). Stéphane Mallarmé, *Un coup de dés jamais n’abolira le hasard*. Eugen Gomringer and Mary Ellen Solt (*Concrete Poetry: A World View*). Ian Hamilton Finlay’s garden inscriptions — one word, placed. Paula Scher’s typographic maps (type *is* the geography). Karel Martens’ letterpress overprints. Wolfgang Weingart for controlled chaos. Peter Saville’s Factory covers (Unknown Pleasures is a trap — that is a pulsar plot, not this mode — but Saville’s *type-as-object* is the bar). Avoid David Carson as a default; illegibility is not a variant, it is a failure.

**Data encoding.**

| Field | Visual variable |
| --- | --- |
| `displayName` (mixer first, then devices) | The words |
| Mixer `postGain` or note-count feeding that strip | Type size |
| Mixer `colorIndex` | Ink color |
| `orderAmongStrips` or desktop X | Horizontal position |
| Desktop Y or pitch-centroid of that strip’s notes | Vertical position |
| `isMuted` / inactive | Struck through or outlined |
| Tags, `genreName` | A smaller running footer (`rap · dark · beat`) |
| `tempoBpm`, signature, `durationTicks` | A typeset colophon, once, like a record’s center label |
| Long comic names | Allowed to run as a single banner (Que pt2’s drum-and-bass sentence is a gift) |
| Cables | Hairline rules joining two words (optional; three rules max or it becomes a graph) |

**Why it looks good.** Factory Records and 4AD already proved that a music object can be type. The cultural read is “cover art,” which is the product this repo is implicitly competing with. Que pt2 cannot be swapped with Wave the Shape because the *words* differ (`Softest Kick` vs `Bd-Sn` / `HH1`). Beast Within has almost no names but has tags (`dark`, `rap`) and a title — a Finlay stone, not a Scher explosion.

**Failure modes.** Shots and Designer Setup are full of default device names (`Tube`, `Slope`, `Quantum (22)`). Collapse defaults into a small type specimen of *types*, and let any real name shout. AI typography misspells, kerns like a ransom note, and invents extra words — the string set must be closed. Do not set slurs, slurs-as-jokes, or user names that read as slurs; display names are user-authored and need a denylist pass.

**Four-variant axes.** (1) School: Mallarmé spread / Scher map / Saville center-label / letterpress poster. (2) Language mix: names only / names + colophon / names + three cable rules. (3) Case: all small caps / as-authored (keep `Softer Synth?`) / Latinized. (4) Ground: cream / black / mixer-wash duotone.

**Fit.** **Typographic.** Hungry for names; the dumps have them on the songs and on strange desktop patching. **Readable as information** (it *is* the names). **Souvenir** when it looks like a cover.

---

### Mode 9 — Cymatic plate (curves made visible) — **SLOT 9**

**Pitch.** The document’s actual wave-geometry — waveshaper anchors, Curve devices — drives a Chladni / cymatic figure, with mixer colors as the sand.

**Visual references.** Ernst Chladni, *Entdeckungen über die Theorie des Klanges* (1787) — 166 figures of sand on bowed plates. Hans Jenny, *Cymatics* (1967/1972). Lichtenberg figures (electrical dust figures) as a cousin for “automation as spark.” Karl Blossfeldt, *Urformen der Kunst* (1928) — photographed form, not illustration. The Festival Pattern Group again (crystal → textile), but here the crystal *is* the Curve. Do not use a spectrogram of the bounce; the briefing forbids waveform-as-source.

**Data encoding.**

| Field | Visual variable |
| --- | --- |
| Waveshaper anchor polylines, Curve device shapes | The nodal set — these *are* the figure, not decoration on a generic mandala |
| Number of waveshapers / curves | Number of plates on the sheet, or number of rings |
| `tempoBpm` + time signature | Driving “frequency” (higher bpm → more nodal diameters), stated on a caption |
| Mixer `colorIndex` | Sand / powder color; muted strips = grey dust |
| Note pitch range (`pitchMin`–`pitchMax`) | Plate aspect (wide range → wider rectangle) |
| Velocity mean | How far the sand has gathered (contrast) |
| Desktop positions of the Curve/waveshaper devices | Where each small plate sits on the sheet (a real layout, not a grid of clones) |
| Title + device names of those units | Engraved caption under each figure (`Curve (19)`, `SKEQ`) |

**Why it looks good.** Chladni’s book plates are already beautiful and already about sound. This is the only mode that *must* use the geometry the briefing called out as the anti-generic signature. Wave the Shape (7 waveshapers, 37 anchors, 18 Curves) and Designer Setup (17 waveshapers, 19 anchors) become un-swappable scientific plates. The cultural read is “acoustics textbook / cabinet of figures,” which people already collect as prints.

**Failure modes.** Most sketches have zero waveshapers (Beast Within, The Block, Piano Grain, Shots has one of each as a museum of *devices*, not of curves). Fallback: one plate driven by the *pitch-class histogram* or by a single automation polyline — and the caption must say so — or this mode yields to herbarium. Generic “sacred geometry” mandalas with no relationship to anchors are a hard fail. AI loves fake Flower-of-Life overlays; ban them.

**Four-variant axes.** (1) Material: 1787 engraved plate / Jenny color film still / black sand on brass (photograph) / white cyanotype. (2) How many figures: holotype (one combined curve) / type series (every waveshaper) / a single large plate. (3) Symmetry: honor the actual (asymmetric) polyline vs fold it into a dihedral for the souvenir. (4) Caption: silent / Chladni-style figure numbers / device names.

**Fit.** The scientific-illustration slot. **Abstract-but-legible** if captions stay. Best on Wave the Shape and Designer Setup. **Souvenir** as a print series.

---

### Mode 10 — Night interior (cinematic key still) — **SLOT 10**

**Pitch.** One film still of a room that could only belong to this project: light, props, and palette from the document; no DAW chrome.

**Visual references.** Gregory Crewdson’s constructed interiors. Todd Hido’s night windows. Wong Kar-wai / Christopher Doyle palettes (*In the Mood for Love*). Hipgnosis album interiors (a room with one wrong object). Vaughan Oliver / v23 (4AD) for the out-of-focus souvenir. Edward Hopper for sketches (one lamp, one piano). James Turrell and Olafur Eliasson for light-as-subject (the mixer *is* the lighting plot, but the picture is a still, not a plot — plots are reserved). Saul Bass key art for the variant that goes graphic instead of photographic.

**Data encoding.**

| Field | Visual variable |
| --- | --- |
| Mixer `colorIndex` + `postGain` | Practical lights in the room (gel color, brightness). Mute = a dark lamp. Solo = the only lamp. |
| Device types (named, high-degree) | Props: a drum machine on the table if `machiniste` exists; glassware if `waveshaper`; a cheap keyboard if `gakki` |
| Device `displayName` | Words on objects (a tape spine `SOFT KICK`, a neon `_CHORDS`) — max 3 so it does not become a calligram |
| Desktop spatial layout | Furniture gravity (left-heavy desk if devices are left-heavy) |
| Note density / `durationTicks` | How “lived-in” the room is (ash, cables-as-cables in the *set*, sheet music) |
| Tags / genre | Architecture (Beast Within `dark`/`rap` → a small night room; Que pt2’s glow names → a backlit corridor) |
| Cable color carnival vs uniform | Whether the floor is a tangle or a single colored lead |
| `tempoBpm` | Flicker / ceiling-fan rhythm in the still (subtle) |

**Why it looks good.** People already save film stills and album interiors. The cultural read is “the cover we never uploaded” — official `snapshotUrl` was empty on all eight dumps; `coverUrl` exists on some and is generic. This mode competes with that cover. Sparse projects become Hopper and should look expensive in their emptiness.

**Failure modes.** Highest risk of decorative nonsense: a pretty room with no binding. Require a visible encoding checklist (at least: palette from mixer, one named prop, spatial gravity from desktop). AI interiors add extra furniture, extra windows, extra hands. Do not depict real people, faces, or the user’s likeness. Do not turn “dark” tags into racist or trauma kitsch. Designer Setup will want a warehouse; do not fill it with 138 props — pick the type histogram’s top three.

**Four-variant axes.** (1) Register: Hopper daylight / Crewdson night / Wong Kar-wai wet neon / Saul Bass graphic still. (2) Prop density: one object / table still-life / wide interior. (3) Text: no words / one tape spine / title as neon. (4) Aspect: 1:1 cover / 16:9 still / portrait poster.

**Fit.** **Narrative / cinematic.** Works on every kind if sparseness is allowed to show. **Evocative souvenir**, weakly readable (a knowing listener gets the joke; a stranger just wants the picture).

---

### Mode 11 — Exploded instrument city — honorable mention

**Pitch.** Mixer groups are city blocks; devices are building types; height is activity; the picture is an architectural exploded axonometric, not a skyline photograph.

**Visual references.** Atelier Bow-Wow, *Graphic Anatomy*. Archigram cutaways. Metabolist capsules (Kisho Kurokawa) for “device as unit.” IKEA-style exploded axonometrics. OfficeUS / Dogma drawing language. Superstudio’s *Continuous Monument* as a warning: one joke, not a city.

**Encoding (short).** Mixer `orderAmongStrips` → street index. `colorIndex` → facade material. Device type → building type (Quantum = tower, stompbox = shed, splitter/merger = interchange). Note/region count → height. Aux / sidechain → bridges. Master → civic building. Desktop X/Z → lot position so the city is still *that* desktop.

**Why not a slot.** It is a real visual system and would look excellent for Que pt2 (21 strips, 5 groups) and Designer Setup (a megacity of 138). It is also the easiest mode to accidentally become a dashboard or a second cabling diagram. Keep it as a variant *look* for the island (mode 6) or as a later extra.

**Four-variant axes.** Edo woodblock / 1960s Archigram / 1990s axon pastel / night isometric (SimCity souvenir).

**Readability:** high if labeled. **Souvenir:** medium (architects will love it; civilians may say “is this a game?”).

---

### Mode 12 — Mycelium / Haeckel organism — honorable mention

**Pitch.** Signal grows from the master output backward: devices are fruiting bodies, cables are hyphae, mixer groups are colonies.

**Visual references.** Haeckel’s medusae and siphonophores. Contemporary mycelium photography (not as “wellness”). Nervous System studio’s hyphal growth algorithms (Jessica Rosenkrantz / Jesse Louis-Rosenberg). Merian again, for a life-cycle plate that is not a map.

**Encoding (short).** Master = primary fruit. Degree = cap size. Cable `colorIndex` = hyphal pigmentation (carnival on strange desktop patching; one pigment on Que pt2). Pattern banks = spore prints (Shots). Waveshaper polylines = gill geometry.

**Why not a slot.** Too easy to become Uranometria in brown, or a second cable drawing with organic stroke. Strongest as a *variant epoch* of mode 3 (biological atlas instead of celestial) or a Haeckel treatment of mode 4.

**Failure modes.** Disease / infection metaphors; “the mix is rotting.” Keep it as a botanical plate, not a lesion.

---

## Comparison

| Mode | Slot | Family | Readability | Beauty-as-object | Data-hungriness | Uniqueness vs siblings | Best fixtures | Starves on |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Uranometria | **3** | Abstract + spatial | High with labels | High (atlas plate) | Medium (needs devices) | High if it stays a sky | Designer Setup, strange patching | 1–2 device sketches (still honest) |
| Herbarium | **4** | Editorial / museum | **Highest** | High (frameable plate) | Low–medium | High | All eight, especially named songs | Default-named racks (still a type series) |
| Arc cathedral | **5** | Abstract / music-native | Medium–high | Very high | **High** (needs repeats) | High if not a piano roll | Que pt2, Wave the Shape | Shots, Piano Grain, The Block |
| Imaginary island | **6** | Spatial / cartographic | High with toponyms | High | Medium | High | Any with a real desktop | None, if the sea is allowed to be empty |
| Pattern jacquard | **7** | Pattern / textile | High for patterns | High (cloth) | **High** for the hero look | Highest on Shots | Shots; Que pt2 as border | Piano Grain, The Block |
| Calligram | **8** | Typographic | **Highest** | High (cover) | Medium (needs words) | High | Que pt2, Wave the Shape, Beast Within | Default-name museums |
| Cymatic plate | **9** | Scientific illustration | Medium | Very high | High for the hero look | Highest on Wave the Shape | Wave the Shape, Designer Setup | Sketches with no curves |
| Night interior | **10** | Narrative / cinematic | **Low** | **Highest** | Low (must still bind) | High | All, if sparse is allowed | None — but easiest to fake |
| Instrument city | HM | Spatial / architecture | High | Medium–high | Medium–high | Medium (risk: game map) | Que pt2, Designer Setup | Sketches |
| Mycelium | HM | Organism | Medium | High | Medium | Low (overlaps 3 + 4) | strange patching | Sketches |

If only four creative slots existed, keep **4, 5, 7, 8** (herbarium, cathedral, jacquard, calligram): they maximize un-swappable fixtures. Slots 3, 6, 9, 10 earn their place by being *different objects* (sky, map, scientific plate, film still), not recolors.

---

## Variant philosophy (the four picks)

Variants are four *printings of the same plate*, not four different modes and not four hue shifts.

**Lock.** The encoding (what field → what variable) and the inventory (which devices, which names, which curves) stay identical. If `Soft Kick` is a town, it is a town in all four.

**Change one cultural register and one density knob.**

- *Register / epoch* is the primary axis: copperplate, modernist, photographic, graphic. This is how a user feels a real difference without losing the project.
- *Density* is the secondary axis: holotype vs type series; stars-only vs full figure; one rose vs full nave; one interior lamp vs wide shot.
- *Projection / material* is a useful third: Bayer vs Hevelius; drape vs flat weave; cream vs black ground.
- *Palette* is a weak fourth. Do not spend a variant on “warmer.” Mixer `colorIndex` already *is* the palette; a variant may *reinterpret* it (inks vs gels vs yarn) but must not replace it with a tasteful beige.

**Do not vary the metaphor.** A constellation that becomes a city in pick 3 is a different mode. The picker is choosing a printing, not a product line.

**Look, not toolchain.** Uranometria wants engraved/illustrative. Herbarium wants scientific illustration. Cathedral wants hard vector leading. Island wants a printed map. Jacquard wants interlaced cloth. Calligram wants set type. Cymatic wants a plate or a photograph of powder. Interior wants a cinematic still. How those looks are produced is someone else’s brief.

---

## Risks

**Decorative nonsense.** The night interior and the mycelium will happily ignore the document. Mitigation: every mode has a closed inventory (names, positions, curves). If a mark cannot be traced to a field, it is not in the picture. Empty documents stay empty.

**Identical outputs.** If constellation, island, city, and mycelium are all “nodes and colored edges,” the user will think they picked a theme pack. Force the *object type* to differ: a sky plate, a map with a sea, a woven rectangle, a typeset poster, a glass rose, a sand figure, a room. Ban a shared “network blob” template.

**Offensive or lazy metaphors.** No horoscopes. No disease / infection / “cancerous mix.” No sacred textile copies (use stripe logic, not a specific nation’s ceremonial blanket). No “primitive tribe” island decoration. No invented people. User `displayName` strings can be ugly or worse — filter before typesetting. Haeckel is a formal reference; do not import his racial-theory context.

**Lying about kind.** A piano-roll cathedral on Shots, a dense city on The Block, a rainbow cable sky on Que pt2 (one `colorIndex`) are all lies. Obey the classifier; obey which layer is actually expressive.

**AI-shaped wounds.** Extra limbs on Bayer figures, extra windows in interiors, extra words in calligrams, Flower-of-Life stickers on cymatic plates, rivers that are not cables. Prefer compositions that are still themselves if the style pass is weak: labeled plates, hard leading, closed word lists.

**Print vs feed.** These are covers and plates. Design for a square or a portrait poster first, not a 16:9 dashboard. A legend or colophon is part of the object (Ortelius cartouche, herbarium ticket, record center label), not a UI chrome overlay.

---

## Sources

**In-repo.** `BRIEFING.md`; `scripts/dump-projects.ts` (entity types and summary schema); `scripts/fingerprints.ts`; `dumps/fingerprints.json` and `dumps/overview.json` (eight fixtures: strange desktop patching, Designer Setup, Beast Within, Wave the Shape, The Block, Que pt2, Piano Grain, Shots). Dumps themselves stay local artifacts.

**Celestial / cartographic.** Johann Bayer, *Uranometria* (1603); Johannes Hevelius, *Firmamentum Sobiescianum* (1690); Alexander Jamieson, *A Celestial Atlas* (1822); Eugène Delporte / IAU constellation boundaries (1930); Abraham Ortelius, *Theatrum Orbis Terrarum* (1570); MacDonald Gill, *Wonderground Map* (1914); Stephen Walter, *The Island* (2008); Katharine Harmon, *You Are Here*; Rebecca Solnit, *Infinite City*; William Smith, *A Delineation of the Strata of England and Wales* (1815); Linda Hall Library, “Out of This World” (Bayer / Hevelius essays).

**Museum / scientific illustration.** Maria Sibylla Merian, *Metamorphosis insectorum Surinamensium* (1705); Pierre-Joseph Redouté; John James Audubon, *Birds of America*; Ernst Haeckel, *Kunstformen der Natur* (1899–1904); Karl Blossfeldt, *Urformen der Kunst* (1928); David S. Goodsell, *The Machinery of Life* and PDB-101 Molecule of the Month (watercolor mesoscale; useful if mycelium/city is ever built); Ernst Chladni, *Entdeckungen über die Theorie des Klanges* (1787); Hans Jenny, *Cymatics* (1967/1972).

**Music-as-image (not a timeline).** Martin Wattenberg, *The Shape of Song* (2001); Wattenberg, “Arc Diagrams: Visualizing Structure in Strings,” InfoVis 2002; Stephen Malinowski, Music Animation Machine; Oskar Fischinger; Iannis Xenakis / UPIC (score-as-drawing, only as a cousin).

**Type / cover.** Apollinaire, *Calligrammes*; Mallarmé, *Un coup de dés*; Mary Ellen Solt, *Concrete Poetry: A World View*; Paula Scher typographic maps; Karel Martens; Peter Saville / Factory Records; Vaughan Oliver / v23.

**Textile.** Anni Albers, *On Weaving*; Beryl Korot, *Text and Commentary*; Festival Pattern Group (1951); Jacquard punch-card tradition; Sheila Hicks.

**Architecture / cinema (honorable or slot 10).** Atelier Bow-Wow, *Graphic Anatomy*; Archigram; Gregory Crewdson; Todd Hido; Hipgnosis; Saul Bass.

**What this brief did not use on purpose.** Gantt / swimlane catalogs; rack elevations and cable schedules; any model or API survey.
