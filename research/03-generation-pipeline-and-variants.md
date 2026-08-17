# Generation pipeline and four-variant system

Research note on **how images get made** from Audiotool project data, and **how ~4 variants** of a visualization mode should be produced and chosen. Grounded in this repo’s dumps and briefing; methods drawn from 2025–2026 model docs, visualization papers, and product UX.

This is research only. No implementation.

## Scope

Covered: rendering families; getting structured data into a picture; typography and color fidelity; hybrid lock-then-style pipelines; four-variant diversity vs invariance; ranking and picker UX; cost/latency; when to refuse AI; practical 2026 stacks vs what this repo already has.

**Not covered (sibling lanes):**

- Catalog of concrete visual languages (Gantt, swimlanes, rack elevations, stage plots, and other timeline / cabling diagram types). Those appear here only as *constraint examples* (“a timeline needs accurate dates and readable type”).
- Catalog of creative metaphors (constellations, cities, organisms, and other modes 3–10). Those appear only as *looseness examples* (“a constellation can invent atmosphere if the graph topology stays true”).
- Auth, dump tooling, and Audiotool RPC beyond what the generation stack must consume.

---

## What the repo already has

There is **no generation stack yet**. No image API client, no SVG/canvas renderer, no prompt packer, no variant picker UI, no Svelte/React app. `package.json` is a Node dump tool: `@audiotool/nexus`, `tsx`, TypeScript. The first build named in `BRIEFING.md` is “classifier + SVG renderer” on two fixtures.

What *does* exist is a complete **data intake and fingerprint** path, which any pipeline should treat as the source of truth.

### Intake (do not regenerate from live Nexus)

`scripts/dump-projects.ts` already encodes the load path the briefing requires:

1. PAT auth (`AT_PAT`)
2. `listProjects` → pick originals (remixes / curated kits skipped)
3. `OpenSession` → regional `DocumentService/GetEntities`
4. Strip sample blobs (`state` / `data` / long audio strings)

The briefing is explicit: **do not use Nexus live `open()` + WASM for generation**. Large sample blobs crash the consolidator. Generation should read `dumps/<id>/{meta,summary,entities}.json` (or an equivalent GetEntities snapshot).

### Intermediate schema (the real “prompt”)

`summarize()` already compresses a document into the layers an image needs:

| Layer | Fields that survive into `summary.json` | Why they matter for pictures |
| --- | --- | --- |
| Config | `tempoBpm`, time signature, `durationTicks`, `baseFrequencyHz` | Tempo/length as scale; ticks are the time axis |
| Desktop | device `id`, `type`, `displayName`, `positionX/Y`, `presetName`, `isActive`; audio/note cables with `from`/`to`/`colorIndex`; bounding box | Graph geometry + cable identity |
| Mixer | channel `displayName`, `colorIndex`, `orderAmongStrips`, `postGain`, `panning`, mute/solo; group/aux counts | Named palette; strip order |
| Timeline | track/region counts; notes `{count, pitchMin, pitchMax, velocityMean}`; automation event count | Density and pitch range — not the notes themselves |
| Patterns | counts of Tonematrix / Beatbox / Bassline / Machiniste / Rasselbock devices and patterns | Grid/textile modes |
| Meta | `displayName`, `bpm`, `coverUrl`, `snapshotUrl`, tags, genre | Title; official cover is *not* the document |

`scripts/fingerprints.ts` rolls those into one row per project (device-type histogram, unique cable/mixer colors, named mixer list). That fingerprint is already enough to classify “song vs rack vs pattern museum vs sketch” as the briefing does.

### Entity fields the summary still hides

Full `entities.json` is required when the picture must be *faithful*, not just classified:

- **Notes:** `collection.entityId`, `positionTicks`, `durationTicks`, `pitch`, `velocity`. Wave the Shape has **3,794** notes; Que pt2 has **2,046**. A prompt cannot hold them. A renderer can.
- **Waveshaper anchors:** `{x, y, slope}` plus parent `waveshaper.entityId`. Wave the Shape has 37 anchors / 7 shapers; Designer Setup has 19 / 17. The briefing wants these as signature marks so the image is not a generic MIDI visualizer.
- **Curve devices:** EQ-like bands (`lowPass`, `highPass`, shelves, peaks with Hz / dB / Q) plus desktop position. Geometric motifs, not just boxes.
- **Pattern steps:** Tonematrix patterns are boolean grids (`steps[].notes[]`). Shots is a pattern museum with 0 cables and 0 notes — a piano-roll renderer would lie.
- **Mixer names:** Que pt2 actually has “Soft Kick”, “Arp 1”, “Glowy B”; many strips have `colorIndex` but no name. Designer Setup’s mixer names are empty. Do not invent labels the document does not have.
- **Official images:** `coverUrl` exists on some published tracks (CDN 600×600 webp). `snapshotUrl` is **null on all eight dumped originals**. Covers are not document-derived; this project exists because they are unused or missing.

### Document kinds already observed (pipeline implications, not a mode catalog)

| Fixture | Dominant fact | What a generator must not do |
| --- | --- | --- |
| Que pt2 / Wave the Shape | Thousands of notes, named mixer, real desktop | Drop the arrangement or fake a sparse patch |
| Designer Setup / strange desktop patching | 40–138 devices, 62–153 cables, few notes | Draw a fake piano roll |
| Shots | Full pattern banks, **zero cables** | Draw a constellation of wires |
| Beast Within / The Block / Piano Grain | 1–3 devices, handful of notes or one sample | Invent density |

Classifier thresholds already written in the briefing: notes > 500 → arrangement painting; cables > 40 and notes < 200 → patch constellation; many pattern entities and no notes → pattern textile; else → sparse still-life.

### Stated rendering intent (treat as the current product decision)

`BRIEFING.md` already picks a family, then a later hybrid:

1. Fingerprint and classify.
2. **Deterministic 2D** (SVG/canvas → PNG) from the winning layer. Palette from mixer `colorIndex` and cable colors. Signature marks from waveshaper/Curve geometry.
3. **Optional later:** an image-model style pass that keeps the deterministic drawing as the **composition lock**.

Default song look: arrangement as body, mixer colors as palette, faint desktop graph in the margins. Default rack look: constellation only.

There is **no UI for modes or variants**. The “~4 variants per mode” product idea is not in the repo yet; this note designs it against the data that is.

### Missing pieces the pipeline will hit immediately

- **No `colorIndex` → RGB table** in `@audiotool/nexus` types or dumps. Indices observed: mixer mostly `1–12` plus `36`; cables `1–41` plus `null`. Faithful color encoding requires a studio palette lookup (or a photographed swatch map). Until that exists, any AI “palette from the project” is a guess.
- **No Socket → device join in the summary.** Cables store `from`/`to` as socket entity ids. A graph renderer must resolve sockets to devices from `entities.json`.
- **No notes-in-summary.** Timeline stats are aggregates. Arrangement painting needs the note list (or a downsampled occupancy grid).
- **No image libraries.** Adding `satori` / `@resvg/resvg-js` / `playwright` / a hosted image SDK is greenfield.

---

## Rendering family comparison

Do not pick one family for the whole product. Concrete modes and creative modes fail in opposite ways. Compare, then split (see recommendation below).

### 1. Programmatic / deterministic

Code lays out geometry from data; rasterize last.

| Tool | What it is good at | Failure mode on *this* data |
| --- | --- | --- |
| **SVG** (hand-built or D3) | Crisp type, exact colors, infinite zoom, easy overlay of labels after an AI pass | 3,794 note rects is fine; 153 cables with labels gets messy. DOM-heavy if interactive. |
| **Canvas 2D** (`@napi-rs/canvas`, `skia-canvas`, browser) | Dense note fields, heatmaps, cheap PNG | Type is bitmap; hit-testing and “edit this label” are harder. |
| **HTML → image** (Playwright / Puppeteer screenshot) | Full CSS, webfonts, poster layouts, existing design systems | 2–5 s and ~200 MB Chromium; non-deterministic font hinting; bad on edge functions. |
| **Satori + resvg** (Vercel `next/og`) | Flexbox posters in 20–100 ms, deterministic PNG, no browser | No CSS Grid, weak transforms/filters; not a graph or piano-roll engine. Excellent for *chrome* (title, BPM, legend) around a separately drawn body. |
| **Graphviz** (`dot` / `neato` / `fdp`) | Directed patch graphs when you *recompute* layout | Throws away Audiotool `positionX/Y`. Use only as a **variant axis** (“solved layout” vs “studio positions”), never as the only truth. |
| **elkjs** (Eclipse Layout Kernel) | Layered Sugiyama layouts with **ports** — the right abstraction for device sockets | Same: solved layout ≠ studio desktop. Flagship for “readable rack” variants. `elkjs-svg` / `elk-svg` export SVG. Related: `netlistsvg` for electronics-like schematics. |
| **d3-force / cola.js** | Organic graphs; good “constellation” energy | Non-deterministic unless you seed and tick a fixed number of steps. Overlap and hairballs at 138 nodes. |
| **Treemaps** (Bruls et al. squarified; `squarify` npm) | Mixer strip areas, pattern-bank area, device-type histograms | Encodes *magnitude*, not topology. Wrong as a cabling picture; right as a mixer/pattern variant. |
| **CAD-like solvers** (ELK layered + orthogonal edges, dagre, WebCola constraints) | Orthogonal cables, port snapping, reduced crossings | Looks like a schematic, not a studio. Appropriate when the mode’s job is *read the patch*, not *feel the desktop*. |

**Strengths:** facts survive; typography is real; colors are hex; a human can diff the PNG against `summary.json`; four variants can be four *algorithms*, not four seeds. Latency is milliseconds to a couple of seconds. Cost is compute you already have.

**Limits:** atmosphere is thin unless a designer writes it. Dense graphs need real layout research (crossing minimization, bundling, level-of-detail). A single piano-roll or a single force graph will lie about half the library — the briefing already proved this.

**Fit here:** the briefing’s first build, and every mode where a knowledgeable user must say “that is Que pt2, not Designer Setup.”

### 2. Template + data merge

A designed poster / card / lookbook frame with slots: title, BPM, palette chips, a plot region, a legend.

- **Satori templates** for OG-like covers (1200×1200 or 1600×1600).
- **HTML posters** (Playwright) when the body needs CSS Grid, variable fonts, or a D3 island.
- **Parameterized layouts:** “arrangement body + mixer rail + desktop watermark” is already the briefing’s default song look. Four variants = four templates, same data.
- **Observable Plot / Vega-Lite / Plotly** for the plot island, then composite.

This is how LIDA (Dibia, 2023) and Infogen (ACL 2025) stay faithful: LLM or code emits a **spec**, a grammar executes it, an optional IGM restyles the *pixels* at low strength.

**Strengths:** art direction without hallucination; cheap variants; brand-consistent chrome.

**Limits:** templates do not invent a visual language. A rack forced into a song poster still lies. Need a template *per mode class*, not one master.

### 3. AI raster generation (diffusion, AR, hosted)

Text (and maybe a reference image) → pixels. 2026 field, named:

| Model / product | Architecture-ish | Diagrams / labels | Atmosphere / cover art | Notes for this repo |
| --- | --- | --- | --- | --- |
| **OpenAI GPT Image 2** (Apr 2026; successor to gpt-image-1 / 1.5) | LLM plans, then renders; native ~2K; edit + gen in one model | Best-in-class among hosted: multi-line copy, diagrams, label placement. Still not a typesetting engine. | Weaker photoreal skin than Flux; ~$0.10–0.21/image | Only serious “ask the model to draw a labeled mixer” option. Still will invent strips. |
| **Google Imagen 4 / Imagen 4 Ultra** | Hosted diffusion | Strong short text; Ultra better on complex scenes; paragraphs still semi-legible in third-party tests | Excellent variety and photography | Good creative restyle; do not trust for cable IDs |
| **Gemini 2.5 Flash Image / 3 Pro Image** (“Nano Banana” family in benches) | Cheap img2img | IGENBENCH (ACL 2026) names **Nanobanana-Pro** as the infographic leader (Q-ACC ~0.90) — and even that only **0.49 I-ACC** (all constraints at once) | Fast restyles; interior-design apps already use it for “same room, new mood” | Best *cheap restyle* candidate for four moods |
| **FLUX.2 Pro / Dev / Schnell** (Black Forest Labs; fal.ai / Replicate) | Rectified-flow / DiT family | Short headlines OK; long labels collapse. Schnell is cheap and sloppy. | Pro wins photoreal. Dev is the local/API workhorse. | Use for atmosphere on a locked skeleton, not for “Soft Kick” lettering |
| **FLUX.2-dev-Fun-Controlnet-Union** (alibaba-pai, 2026) | Union ControlNet on 4 double blocks: Canny, HED, Depth, Pose, MLSD, Scribble, Gray; inpaint | Structure lock, not text lock | High | The hybrid piece: feed a canny/depth of the SVG |
| **SDXL / SD 3.5 Large** | UNet / MMDiT | Weak text. Huge ControlNet + LoRA ecosystem | Fine for style exploration | Local prototype only; frontier quality gap is real in 2026 |
| **Qwen-Image 2512** + **InstantX Qwen-Image-ControlNet-Union** | Open; union Canny/soft-edge/depth/pose | Leading *open* text-in-image in community benches; still fails long blocks | Strong | Best open hybrid if you will not pay OpenAI |
| **Ideogram 3.0** | Design-first raster | ~90–95% short-copy accuracy; posters/signage | Graphic, not photographic | Title cards, not 21 mixer strips |
| **Recraft V3** | Design model; **native SVG** (not a trace) | Long-form text better than most diffusion; vector mode text is weaker than Ideogram raster | Flat/line/3D design looks | Interesting for *vector+AI* if you then overlay real type |
| **Midjourney v7** | Closed aesthetic model | Unreliable type | Best “make it a record cover” look | `--chaos` for 2×2 diversity; no real inpaint; hard to lock composition |
| **DALL·E 3** | Older OpenAI | Superseded for text by GPT Image | Accessible, less controllable | Do not start a new stack here |

**IGENBENCH (ACL 2026)** is the important negative result: across 10 T2I models, **data completeness / encoding / ordering** are the worst axes (averages ~0.21–0.27). Models draw pretty chart chrome and then **drop or reorder values**. That is this product’s failure mode if a creative mode is asked to “show the arrangement.”

**STRICT** (Fallah et al., 2025) and **ArtChart** (2026) say the same for text-in-charts: geometry, spelling, and label-binding fail together. GPT-4o / GPT Image raised the floor; they did not make “render 2,046 notes as a faithful piano roll” a generative task.

**Strengths:** atmosphere, era, lighting, paper texture, “this looks like a cover.” Fast exploration of moods.

**Limits:** structure dies in the latent. Counts, dates, cable endpoints, device types, and spelling are probabilistic. Seed variation produces near-duplicates unless you change a *semantic* axis.

### 4. Hybrid: code skeleton → img2img / ControlNet / layout-to-image

This is the briefing’s “optional later” and the only way to get both faithfulness and atmosphere.

Canonical pattern (LIDA Infographer; interior “same room, four moods”; ArtChart grayscale-layout condition):

1. **Render a skeleton** programmatically: high-contrast geometry, correct colors or a grayscale occupancy map, little or no decorative type.
2. **Condition** a generator:
   - **img2img** at low strength (LIDA found **0.25–0.45** kept chart structure).
   - **ControlNet Canny / HED / MLSD** for line lock (cables, note bars, device boxes).
   - **ControlNet Depth** if the skeleton is isometric or layered.
   - **IP-Adapter / style reference** for “make it look like this print” without moving furniture.
   - **Regional prompts / cross-attention control** (e.g. CA-Redist on ControlNet, arXiv:2402.13404) so “mixer rail” and “arrangement body” do not concept-bleed.
3. **Composite real type back on top** (see vector+AI). Optionally inpaint only texture regions, never label regions.

**ControlNet (Zhang et al., 2023)** gives layout; it does **not** bind phrases to regions. Plain ControlNet will put the kick drum texture on the arp if the prompt is sloppy. Localized descriptions or masks are required for multi-panel portraits.

**InstructPix2Pix** and Gemini image-edit are the “restyle this PNG” APIs. Interior products (MoodCanvas, AI Room Styler) already treat this as: **one geometry, N moods**. That maps 1:1 onto four variants of a locked studio portrait.

**Strengths:** composition lock; cheap extra variants; matches the briefing.

**Limits:** high strength dissolves facts (extra devices, melted cables, invented people). Text in the skeleton will be *destroyed* by img2img unless masked out. Color lock is weaker than edge lock — a canny pass keeps shapes, not `colorIndex` 40 vs 5.

### 5. Vector + AI

Generate or restyle the *composition*, then overlay **real typography and accurate color chips** in SVG/HTML.

- Recraft V3 can emit SVG *atmosphere* (ornament, paper, icons). Still overlay mixer names in code.
- AI raster as `<image>` under an SVG label layer; export via resvg.
- Inpaint-only texture: mask the plot, generate grain/lighting, keep vector strokes.

This is the professional answer to the notorious text failure (UX Collective “Lost for Words”; STRICT; TextPixs/GCDA). Designers already do “generate text-free, typeset in Figma.” Do that automatically.

### 6. 3D / NeRF

**Not needed** for the first product. NeRFs reconstruct radiance from photos; there are no photos of the document.

A **shallow 3D** pass can still be useful later for *concrete cabling*: Three.js isometric or orthographic boxes, cables as tubes, **CSS2D / SVG labels** on top. That is a programmatic renderer with a camera, not a generative 3D model. Useful variant axis: top-down desktop vs 3/4 isometric. Do not confuse it with generative 3D.

---

## Data-to-image strategies

The document does not fit in a prompt. Que pt2 is 2,779 entities; Wave the Shape is 4,564. CLIP-class encoders still choke at **77 tokens**; even T5-XXL / LLM-planned image models cannot be given 3,794 note tuples.

### Three channels (use more than one)

**1. Prompt packing (lossy, for atmosphere only)**

Pack a *fingerprint*, not the document. The repo already has this shape:

```
title, bpm, sig, duration
class: song | rack | pattern-museum | sketch
counts: notes, devices, cables, mixer strips
palette: unique mixer colorIndex + cable colorIndex
named strips: ["Soft Kick", "Arp 1", …]   // omit if empty
signature: "27 Curve devices, 7 waveshapers"
forbidden: "do not add a piano roll" | "do not add cables"
```

That is enough for a style model to avoid the wrong genre of picture. It is **not** enough to draw the picture. Packed prompts will still drop ordering (IGENBENCH) and invent a “lead vocal” strip that is not in the mixer.

**2. Sidecar JSON (source of truth, not pixels)**

Keep `summary.json` + a **render brief** next to the PNG:

- classification, chosen layer, template id, variant axes
- exact label list that appears in the image
- color map (`colorIndex` → hex) used
- counts the viewer should be able to verify
- seed / model / strength if a style pass ran

This is how you evaluate (“can a human verify?”) and how you refuse a bad AI pass. Infogen’s metadata stage is the same idea: structure first, pixels second.

**3. Rendered legend (pixels that are still code)**

A chip rail or footer drawn in Satori/SVG: BPM, note count, device count, named strips, color swatches. Even if the body is atmospheric, the legend stays checkable. Creative modes should still carry a small legend unless the user hides it.

### How much structure survives a generative model

Empirically, in 2026:

| Survives well | Survives poorly | Almost never survives |
| --- | --- | --- |
| Global mood, era, lighting | Exact counts (“21 strips”) | Per-note pitches and ticks |
| Rough composition if ControlNet-locked | Binding of name → object | Socket-accurate cables |
| Short title text on GPT Image / Ideogram / Recraft | Paragraphs, small type, numbers | Novel device types not in the prompt |
| Palette *vibe* | Palette *identity* (`colorIndex` 40 vs 5) | “No cables” when the training prior is “synths have cables” |

So: **structure in code, vibe in the model.** The briefing’s composition lock is not optional for concrete modes.

### Typography / label fidelity

Notorious failure, still not solved for production diagrams.

**Why it fails:** diffusion treats letters as texture; errors lock in early denoising (UX Collective). VQ tokenizers in AR image models prioritize global structure over glyphs (“Beyond Words,” 2025). Context windows make long copy worse.

**What improved:** GPT Image 2, Imagen 4, Ideogram 3, Recraft V3, Qwen-Image 2512, glyph-conditioned methods (TextPixs/GCDA; OCR-in-the-loop). **STRICT** still finds most open diffusion models jumble, misspell, or fragment.

**Strategies, in order of reliability for this repo:**

1. **Render all load-bearing text in code** (SVG/Satori). Names, BPM, counts, “Que pt2”.
2. **Mask labels during img2img**; generate only the field.
3. **Inpaint texture, not glyphs.**
4. Use a text-strong model **only** for decorative words (a single title) and OCR-check it (Tesseract / a VLM). Fail closed: if OCR ≠ sidecar, discard or overlay.
5. Never ask a model to spell 21 mixer names.

Device names in the dumps are often factory defaults (“Heisenberg (3)”, “Curve (9)”). Showing all of them is noise. Show **user-meaningful** names (mixer strips, renamed devices like “Drums”, “_CHORDS”, “Gun Distortion”) and let the rest be shapes.

### Color encoding: accurate vs aesthetic

Two palettes, do not mix their jobs.

**Semantic (must stay accurate when the mode claims to encode them):**

- Cable `colorIndex` — in “strange desktop patching” this is expressive (17 distinct indices). In Que pt2 it is almost uniform (`40`). A style pass that recolors cables for prettiness **destroys** the one project where color is a fact.
- Mixer `colorIndex` — the briefing’s song palette. Same index must mean the same hue across variants if strips are visible.
- Status if ever shown (mute/solo, `isActive`) — reserved hues, not mood hues.

Until the official Audiotool LUT exists, pick a **fixed table** and persist it in the sidecar. Do not let the model “interpret” index 40.

**Aesthetic (may vary across the four variants):**

- Paper, lighting, background, grain, era filter.
- A *derived* harmony that **includes** the semantic swatches (e.g. background complementary to the mixer set) without remapping them.
- Creative modes may remap *non-semantic* tones freely.

Null `colorIndex` is common (default strips, some cables). Treat null as a documented default gray, not as “pick a pretty color.”

---

## Four-variant design

Goal: **four options that are meaningfully different, not four near-duplicates**, while remaining **on-mode** and **fact-true**.

### What must stay invariant (facts)

Regardless of mode class:

- Document identity: someone who knows the project can tell which one it is (briefing success test: Que pt2 ↛ Designer Setup ↛ Shots).
- Classification: do not draw a timeline body for a rack, or cables for Shots.
- Density: a 3-device sketch stays sparse.
- Counts and names **if they appear**: no extra devices, no extra strips, no invented people, no fake dates.
- Semantic colors (see above).
- Geometry that the mode claims to show: studio positions *or* a clearly labeled “solved layout,” never a silent rewrite of the patch.

### What should vary (diversity axes)

Assign **one primary axis per slot** so the 2×2 is a comparison, not a noise cloud. Secondary axes can tick slightly.

| Axis | Concrete-class use | Creative-class use | Risk |
| --- | --- | --- | --- |
| **Layout algorithm** | Studio positions vs ELK layered vs force vs treemap-of-mixer | Same skeleton, different crop | Solved layout can look like a different patch — label it |
| **Camera / composition** | Full desktop vs “arrangement body + margin graph”; isometric vs flat | Wide vs tight; poster vs square | Crop must not hide the class-defining layer |
| **Density / LOD** | Show all cables vs bundle by color vs devices-only; note heatmap vs every note | Sparse ornament vs busy | LOD that drops all cables on a rack lies |
| **Palette treatment** | Same semantic swatches, different paper/ground | Full restyle | Recoloring cables/strips |
| **Era / style** | Light style pass only (blueprint / print / night studio) | Primary axis (four moods) | High strength → hallucinated gear |
| **Seed** | Last resort | Last resort | Near-duplicates (the failure to avoid) |

**Do not** ship four seeds of the same prompt. Midjourney’s default 2×2 is often that; their `--chaos` / `--weird` exist because seed noise is not conceptual diversity. The Pubroot “prompt decomposition” note is right: parametric jitter ≠ four directions.

A practical **on-mode** quartet:

1. **Literal** — programmatic, studio positions or true time axis, max label honesty.
2. **Readable** — same facts, different layout algorithm or LOD (ELK / bundled cables / heatmap).
3. **Poster** — template chrome + same body; or low-strength style on the literal skeleton.
4. **Mood** — stronger restyle *or* a second template (night / print / grain), labels still composited.

For creative-class modes, replace 1–2 with two metaphor executions that share a **fact overlay** (legend + locked graph silhouette).

### How to prompt / seed so variants are diverse but on-mode

- **Decompose, then generate.** An LLM may propose four *descriptors* (layout, camera, density, era). **Farthest-first** on those descriptors (Jaccard on tokens, or embedding distance) so you do not get “dark / darker / noir / night.” Then generate.
- **Lock a negative list from the classifier:** “no piano roll”, “no cables”, “no crowd of extra synths”, “sparse, 3 objects.”
- **Share one skeleton** for slots 3–4; only change style reference / IP-Adapter / era token.
- **Fix the seed across style slots** if the API allows, so differences are style, not composition drift.
- **Midjourney-shaped parameters** if you ever use that aesthetic model: `--chaos` for diversity, `--sref` to stay on-mode, never four raw seeds.

### Ranking and selection

Generate **more than four**, show four.

1. **Hard filters (fail closed):** OCR of title/names vs sidecar; count of connected components vs fingerprint; “cables present?” vs class; CLIP/VLM QA against a question list (IGENBENCH-style: “how many named kick strips?”).
2. **Diversity sample:** embed survivors (CLIP or DINOv2). **Farthest-point / greedy farthest-first**, or a **DPP** as in DiverXplorer (CyberAgent, 2026) — they found CLIP embeddings matched designer notions of diversity better than DINOv2/ConvNeXt for *graphic* images.
3. **Soft rank (do not let this pick alone):** PickScore (Kirstain et al., Pick-a-Pic), ImageReward (Xu / THUDM), HPSv2 / HPSv3, LAION aesthetic. These optimize *pretty*, not *true*. A high aesthetic score on a rack that grew extra modules is a bug.
4. **User pick** is the product. Automatic rank only orders the grid and flags rejects.

Critic models (VLM: “does this image match the sidecar?”) are more useful than aesthetic scores for this repo. Aesthetic scores are a **tie-break among faithful candidates**.

### Product UX patterns

| Pattern | How it works | Steal | Avoid |
| --- | --- | --- | --- |
| **Midjourney 2×2** | One prompt → four tiles; upsample / vary strong vs subtle | Instant comparison; vary-from-one | Unlabeled seed noise; no fact chips |
| **Interior “4 moods”** | Same room photo, four styles; geometry prompt-locked; A/B on favorites (MoodCanvas: gallery → A/B → hero) | **This is the hybrid variant UX** | Letting mood restyle move walls (= move devices) |
| **Fashion lookbook** | Same garment, four lightings/crops | Camera/era axis | Using it as the only control for facts |
| **Map style picker** (Mapbox / Google) | Same geometry, four renderers | Concrete-class variants | — |
| **Canva / Recraft brand kit** | Locked colors + type, vary layout | Semantic palette lock | — |

Recommended picker:

- 2×2 grid, each tile tagged with its **axis** (“Readable layout”, “Night print”), not “Variant B.”
- Fact chips under the grid (from sidecar): notes, devices, cables, named strips.
- Actions: **Use**, **Restyle this** (keep skeleton), **More like this** (nudge one axis), **Show literal** (always available for concrete class).
- Optional legend toggle. Default on for concrete; default on-but-quiet for creative.
- Do not auto-publish. The user picks. Official `coverUrl` is a separate object.

### Cost and latency

Order-of-magnitude, mid-2026 public prices (fal.ai / OpenAI / Gemini; they move):

| Path | Latency | $ for 4 images | When |
| --- | --- | --- | --- |
| 4× programmatic SVG/canvas + resvg | 50–500 ms (seconds if Playwright) | ~$0 | Default concrete; always available offline |
| 1× skeleton + 3× cheap restyle (Flux Schnell / SDXL / Gemini Flash Image, ~$0.003–0.02) | 2–8 s parallel | ~$0.01–0.06 | Creative moods; concrete “poster/mood” slots |
| 4× Flux Dev (~$0.012–0.025) | 4–12 s | ~$0.05–0.10 | If you truly need four full gens |
| 4× Flux Pro / Imagen 4 | 8–20 s | ~$0.16–0.22 | Atmosphere hero after the user picked |
| 4× GPT Image 2 | slower; reasoning pass | ~$0.40–0.84 | Almost never as the grid. Maybe one labeled poster if you insist on baked type |
| Local ComfyUI (Flux Dev + ControlNet) | depends on GPU | electricity | ControlNet-heavy, privacy (documents are not public) |

**Prefer 1 gen + 3 cheap restyles** (or 1 skeleton + 3 restyles) over 4 full frontier gens. Interior-design apps already parallelize a pool of 5. Generate 6–8, filter, DPP-pick 4.

Documents are **auth-gated and not public**. Sending `entities.json` to a hosted image API is a privacy bug. Send **skeletons and packed fingerprints**, or run local. Never upload sample audio.

---

## Split recommendation by mode class

Do not run one pipeline for every mode. The briefing’s adaptive portrait is a **classifier → layer**, then a **renderer family** that depends on whether the mode is *concrete* or *creative*. This section names classes only.

### Concrete class (timeline-like, cabling-like, anything a tech would verify)

**Job:** a knowledgeable user can check the image against the document. Example constraint: a timeline needs accurate time and readable type; a patch diagram needs real endpoints and cable colors.

**Pipeline:**

1. Fingerprint + classify (already specified).
2. **Programmatic body** (SVG or Canvas). Use studio positions *or* a labeled solver (elkjs) as a *variant*, not a silent default.
3. **Satori/SVG chrome:** title, BPM, legend, semantic swatches.
4. Rasterize with resvg (or Canvas PNG). Playwright only if the template truly needs full CSS.
5. Variants = **algorithm / camera / LOD / paper**, all code-first.
6. Optional hybrid: low-strength img2img or Flux/Qwen ControlNet Canny on a **label-stripped** skeleton; **composite labels back**.
7. **Refuse a pure T2I path.** If the user wants “just Flux it,” still generate the skeleton and lock it. IGENBENCH data-encoding failure is the reason.

**When to force programmatic and skip AI entirely:**

- Cable identity or mixer names are visible and load-bearing.
- Note occupancy is the body (2k–4k notes).
- The image could be mistaken for a wiring instruction or a session report.
- OCR/critic fail on a style pass.

3D isometric is an optional *programmatic* camera, not a NeRF.

### Creative class (metaphorical covers, souvenirs, atmosphere)

**Job:** recognizably *that* project, but allowed to be a poster. Example constraint: a constellation can be looser about node shape if the graph’s sparsity and palette stay true.

**Pipeline:**

1. Same fingerprint. **Still forbid the wrong layer** (no fake piano roll on a rack; no invented density).
2. Build a **silhouette skeleton** (graph, occupancy, palette field, waveshaper marks) — may be abstract.
3. Four moods via **style descriptors + img2img/IP-Adapter**, shared skeleton, farthest-first on descriptors.
4. Legend optional but recommended (small, honest).
5. Hosted Flux / Imagen / Gemini Flash for restyle; Recraft if you want vector ornament; Midjourney only if you accept weak locks.
6. GPT Image / Ideogram only for a *title treatment*, then overlay or OCR-check.

**When to refuse AI even in creative class:**

- The user enabled “show my mixer names” or “show cable colors as in the studio.”
- Critic says device count drifted.
- Sketch-class projects: a heavy generative prior will “fill in” a studio that is not there. Prefer programmatic still-life + light paper texture.

### Shared backbone (both classes)

```
GetEntities snapshot
    → summary + fingerprint + render brief (sidecar)
    → classify mode class + layer
    → programmatic skeleton (+ chrome)
    → [optional] style passes for slots 3–4
    → hard filters + diversity pick → 2×2
    → user chooses
```

This matches the briefing (entities first, deterministic draw, optional style lock) and extends it with a variant system the repo does not have yet.

---

## Risks and open questions

**Hallucination.** Extra modules, extra people, extra dates, a vocal booth that is not in the project, cables on Shots, a full arrangement on Designer Setup. Mitigate with classifier negatives, skeleton lock, and fail-closed critics. Do not use aesthetic scores as a safety net.

**Color LUT missing.** Without an official `colorIndex` map, “faithful palette” is aspirational. Reverse-engineer from the studio or a screenshot before claiming semantic color.

**Socket resolution.** Summary cables are not device–device until sockets are joined. A pretty graph of raw socket ids will be wrong.

**LOD honesty.** Bundling 153 cables is necessary; it must be disclosed (“cables bundled by color”) so it is not read as a different patch.

**Style-pass color drift.** Canny locks edges, not hues. Semantic colors need a reserved layer or a post-pass remap.

**Privacy.** Hosted APIs see whatever you send. Packed fingerprints + skeleton PNGs only.

**Cover vs portrait.** Some projects already have `coverUrl`. Decide whether variants replace, sit beside, or ignore official covers. `snapshotUrl` being empty means there is no official DAW still to compete with.

**Evaluation protocol (proposed, not built):**

- Swap test from the briefing (three fixtures, three un-swappable images).
- Human checklist against sidecar: counts, names, class, density.
- OCR on every visible string.
- VLM question set (IGENBENCH-style) for creative slots.
- Store failed AI passes; they are the fine-tune / prompt-regression set.

**Open questions**

- Exact Audiotool color table and default-null color.
- Whether desktop coordinates need a y-flip / zoom to match the studio camera.
- How to downsample 3,794 notes (occupancy grid vs velocity-weighted heatmap vs region boxes only).
- Whether four variants are per mode, or four modes-as-variants (product confusion).
- Local ComfyUI vs fal.ai for the first hybrid prototype (privacy vs speed).
- Recraft SVG ornament vs all-code SVG for creative chrome.
- Whether a critic VLM is worth the extra call on every grid.

---

## Sources

### This repo

- `BRIEFING.md` — adaptive studio portrait; SVG/canvas first; optional composition-locked style pass; classifier thresholds; success test.
- `scripts/dump-projects.ts` — GetEntities intake, `summarize()` schema, desktop type set, blob stripping.
- `scripts/fingerprints.ts` — per-project row used as a natural prompt-pack / classifier input.
- `dumps/fingerprints.json`, `dumps/overview.json`, per-project `summary.json` / `entities.json` / `meta.json` — eight originals (Que pt2, Wave the Shape, Designer Setup, strange desktop patching, Shots, Beast Within, The Block, Piano Grain).

### Papers and benchmarks

- Rombach et al., *High-Resolution Image Synthesis with Latent Diffusion Models* (CVPR 2022) — SD / img2img strength.
- Zhang et al., *Adding Conditional Control to Text-to-Image Diffusion Models* (ControlNet, 2023).
- Binyamin et al., *Layout-to-Image Generation with Localized Descriptions using ControlNet with Cross-Attention Control* (arXiv:2402.13404) — ControlNet does not bind phrases to regions; concept bleed.
- Ye et al., *IP-Adapter* (2023) — style/content split used in restyle variants.
- Brooks et al., *InstructPix2Pix* (2023) — instruction restyle.
- Dibia, *LIDA* (ACL demo 2023; arXiv:2303.02927) — summarize → spec → execute → **img2img 0.25–0.45** infographics.
- Infogen (ACL 2025; arXiv:2507.20046) — metadata then code (Plotly/Plotnine); iterative coder/feedback.
- IGENBENCH (ACL 2026) — T2I infographics; data completeness/encoding/ordering collapse; even the best model ~0.49 full-constraint accuracy.
- ArtChart (2026) — grayscale chart layout as condition; OCR + layout + aesthetic rewards; T2I fails math+text together.
- STRICT (arXiv:2505.18985) — stress test of text-in-image; GPT-4o-class models raise the floor, diffusion still fragments glyphs.
- Chen et al. / “Beyond Words” (arXiv:2503.20198) — AR + VQ limits on long text; TextBinarizer.
- TextPixs / GCDA (arXiv:2507.06033) — glyph conditioning + OCR supervision.
- Kirstain et al., *Pick-a-Pic* / PickScore (arXiv:2305.01569).
- Xu et al., *ImageReward* (NeurIPS 2023).
- Wu et al., HPSv2; HPSv3 (arXiv:2508.03789).
- Schuhmann et al., LAION aesthetic predictor.
- DiverXplorer (arXiv:2603.08584; CyberAgentAILab) — DPP diversity on CLIP embeddings; 4×4 graphic-design grids.
- Bruls, Huizing, van Wijk, *Squarified Treemaps*.
- Sugiyama et al. layered graph drawing — ELK’s flagship algorithm.
- Radford et al., CLIP (2021) — embedding space for diversity and (weak) prompt adherence.

### Models, products, tooling

- Black Forest Labs FLUX.1 / FLUX.2 (Pro, Dev, Schnell); fal.ai and Replicate hosted pricing (~$0.003 Schnell to ~$0.05 Pro per image, mid-2026).
- alibaba-pai `FLUX.2-dev-Fun-Controlnet-Union` (Canny/HED/Depth/Pose/MLSD/Scribble/Gray; recommended scale 0.65–0.80).
- Qwen-Image 2512; InstantX `Qwen-Image-ControlNet-Union`.
- OpenAI GPT Image 1 / 1.5 / 2; DALL·E 3 (legacy).
- Google Imagen 4 / 4 Ultra; Gemini 2.5 Flash Image / 3 Pro Image.
- Ideogram 3.0; Recraft V3 (native SVG).
- Midjourney v7 — 2×2 grid, `--chaos`, `--weird`, `--sref`; weak text and lock.
- Stability SDXL / SD 3.5 + ControlNet ecosystem; ComfyUI local vs API cost reports (2026).
- Vercel Satori + resvg / `next/og`; Playwright/Puppeteer HTML-to-image.
- Graphviz; kieler/elkjs; elkjs-svg; d3; Observable Plot; Vega-Lite; `squarify`.
- netlistsvg / d3-hwschematic — schematic-like SVG from graphs (analogy for patch variants).
- MoodCanvas and AI interior restylers — “same geometry, N moods,” parallel pool, A/B on favorites.
- Mapbox / Google map styles — same geometry, multiple renderers (concrete-class UX analog).

### Known failure modes (named)

- **Text as texture:** misspellings, melted glyphs, decorative pseudo-text (pre-2024 default; still common on Flux/MJ/SDXL for long copy).
- **IGENBENCH data axes:** pretty infographic, wrong numbers, dropped marks, reordered categories.
- **ControlNet region-free assignment:** right silhouette, wrong object in the slot.
- **img2img over-strength:** extra objects, density inflation (fatal for sketches).
- **Aesthetic-score Goodharting:** PickScore/HPS prefer glossy covers that are not the project.
- **Seed-only 2×2:** four near-duplicates; users think the product “doesn’t do variants.”
- **Prompt-packed documents:** 77-token / context collapse; the model fills priors (cables, people, gear).
- **Semantic recolor:** style models “improve” cable/mixer colors and erase the only distinctive fact in a patch.
- **Hosted-API leakage:** sending full entities or samples of a private studio document.
