# Modern cover style for a younger Audiotool audience

A research path, not a new mode catalog. Modes 3–10 already name *objects* (sky, cloth, type, glass). This note asks whether those objects currently *look like covers a younger producer would publish*, and what to restyle if they do not.

Sibling notes: `00` is the decision brief; `02` is the creative languages; `cover.ts` is the product substrate (square, full bleed, no colophon). This note is about **register** — the cultural clothes on a locked encoding.

---

## Thesis

The generator is already a cover machine. `cover.ts` forbids museum chrome: no titles, axes, legends, or mixer-name posters. The remaining mismatch is **taste**. Variant labels still say Mallarmé, Chartres, Ortelius, 1603 copper. Those are collector registers. Audiotool’s users mostly are not.

Younger electronic producers live in **feeds**, not print shops. The picture has about three seconds at thumbnail size. A cream copperplate that rewards a wall hanging will lose to a lime slab that reads at 64 px — unless the copperplate is restyled into something that also reads at 64 px.

Modern style, for this product, is **not** “add glassmorphism and AI surrealism.” Those are the 2026 trend-report defaults, and the second one is exactly the generic cover this repo exists to beat. Modern style here means: pick cover *dialects* that younger listeners already treat as music objects, then print the **same document inventory** in those dialects.

---

## 1. Where the picture lives

Design for the smallest honest surface first.

| Surface | Size that matters | What wins |
| --- | --- | --- |
| Audiotool feed / profile grid | Historically ~120 px; zoom historically **410 px**; CDN covers are **600×600 webp** (`coverUrl` on 48 of 112 listings) | High contrast, one figure, one hue family |
| Discord / share | 128–256 px embed | Same as feed; extra type dies |
| SoundCloud / Spotify / Apple Music | 64 px playlist thumb → 300–640 px now-playing | Silhouette + 1–3 colors. Type only if it *is* the picture |
| This app’s picker | 2×2 of 900² SVGs, shrunk | Four tiles must not look like four charts |

Audiotool community advice (board, “Getting your music noticed”): a unique alias, a **good cover that does not look like a 2006 YouTube video**, fonts that belong to the picture, an *aesthetic*. Users already treat the square as branding. Official `snapshotUrl` was empty on all eight dumped originals, so this generator is competing with uploaded covers, not with DAW screenshots.

**Probe A.** Export every current ready mode at 64 px and 410 px. Keep only variants whose figure still holds. That is the first empirical gate, before any new look.

---

## 2. Who is looking

Not inferred from code. Grounded in how Audiotool is used and what adjacent scenes look like.

- **Access model.** Browser DAW, no install, no paid plugin wall. Beginners and hobbyists worldwide; traffic peers include Soundation, Soundtrap, Beepbox. That is a **young, low-resource, online-native** cohort, not a vinyl-collector label.
- **Publish culture.** Remixes, contests (Beatbox, featured-artist compilations), Discord, tags. The cover is a **click target in a remix graph**, not a 12″ sleeve in a shop.
- **Genre diet on the platform.** Electronic first: house, dnb, rap/beat tags, experimental, pattern-box music. Adjacent listening (what this age actually posts covers *for*) is hyperpop, PC Music afterlife, breakcore, phonk-adjacent nightcore, bedroom pop, trap, jungle revival — not Factory Records as a default.
- **Fandom is real.** Board advice cites Overwatch, MLP, anime as viable Audiotool branding. That is user behavior. This generator must **not** draw copyrighted characters; it should leave a picture spare enough that a user can overlay their own scene identity.
- **Anti-polish is also real.** Gen Z reports digital fatigue; Brat-green, lo-fi grain, and “export error” blur beat Midjourney chrome in 2024–26. This product’s SVG grain is already closer to that instinct than a glassmorphism pass would be.

The knowing viewer in `BRIEFING.md` (the author who recognizes `Soft Kick`) is still the success test. The **stranger** who only sees a thumb in the Audiotool feed is the new test this note adds. Both must pass. Pretty-and-unreadable fails; readable-and-dated also fails.

---

## 3. Dialects circulating 2024–2026

Trend reports (Premade Pixels, BuyCoverArts, 2026 streaming-cover roundups) and scene objects (not reports) converge on a short list. Ranked for **this** audience and **this** encoder — not for pop marketing in general.

### Keep / steal as a register

| Dialect | Cultural object | Thumbnail | How it binds to the document | Verdict |
| --- | --- | --- | --- | --- |
| **Anti-cover / Brat slab** | Charli XCX *Brat* (Special Offer / Freaney, 2024): one field, one word, “death of the finished state,” even a low-res export kept | **Best** | Mixer `colorIndex` of the loudest strip = the field. Title or one strip name = the word. Density = blur / crop / overrun | First-class calligram printing. Already closer to Saville than to Mallarmé |
| **Browser-native brutalism** | PC Music logo as `#0000ff` hyperlink blue and HTML entities (A. G. Cook / Gleeson / Timothy Luke). Web as material | Excellent | Default-named racks become a type specimen of *device types*. Grid = desktop. Exposed structure is honest, not ugly | Best default for Designer Setup / Shots. Audiotool *is* a browser |
| **Product chrome / liquid object** | SOPHIE *Product*; Timothy Luke’s PC Music 3D goods; posthumous SOPHIE visualisers (latex, metal, ice, no bodies) | Strong if one object | Waveshaper / Curve polyline *is* the object. Mixer hues = material tint. One hero, not a shelf | Cymatic mode’s modern printing. Ban extra limbs and sacred geometry |
| **Phosphor / HUD / thermal** | Night-vision and thermal in street/trap; CRT and instrument-cluster in electronic | Strong | Energy heatmap, onset lines, beat-field moiré already exist. Recolor as FLIR / PNVG / scope, not as a new mode | Cheap restyle of timeline heatmap + beatfield + skyline |
| **Offset / misregister / glitch** | CMY shift, datamosh, 100 gecs maximalism *as print error*, not as collage dump | Medium | Beatfield already has an offset printing. Cable `colorIndex` carnival (strange desktop) is the honest glitch | Keep. Do not add JPEG artifacts that are not in the data |
| **Game-atlas / satellite** | Phone maps, GTA pause-map, USGS-as-skin, not Ortelius monsters | Medium | Island mode’s encoding is already a map. Era should be GPS / relief / night lights, not 1570 | Restyle island; keep the sea empty on sketches |
| **Cloth as merch** | Albers, festival blankets, football scarf, jacquard as a *drop*, not a museum textile | Strong on Shots | Pattern cells = knit. Mixer yarn stays | Jacquard is already the most youth-native object in the set |

### Use only as atmosphere, never as the picture

| Dialect | Why it is loud right now | Why it is dangerous here |
| --- | --- | --- |
| Y2K / Y3K iridescence, holographic chrome | Hyperpop, Gen Z nostalgia, 3D renders | Fastest path to “AI made this.” Jewelry traces in setup mode already cover *metal* without the Midjourney orb |
| Glassmorphism / frosted UI | 2026 trend lists for electronic | Looks like a settings panel. This is a sleeve, not a DAW chrome tribute |
| Maximalist digital collage | “More is more” covers | Invents inventory. Extra stickers = extra devices. Fail closed |
| Anime / fandom illustration | Real Audiotool branding tactic | Copyright + generic waifu. Leave negative space; do not generate the fandom |
| Dark academia / Hopper interiors | Night-interior mode’s references | Reads older; weakest thumbnail; easiest to fake. Keep as one printing, not the default |

### Refuse (same as `00` §6, restated for 2026 trend pressure)

- **AI-enhanced surreal landscapes.** Fastest-growing cover approach in 2026 reports. Also the thing `BRIEFING.md` forbids: a prompt that never saw the document. If Que pt2 and Designer Setup become the same dreamscape, the product failed.
- **Anadol / latent-fluid data art.** Screensaver of every project.
- **Neon-on-black cyberpunk pack.** The AI-slop fingerprint `frontend-design` already bans.
- **Flower-of-Life / sacred geometry** on curves.
- **Copied ceremonial textiles, invented tribes, faces, user likeness.**

Authenticity, for this cohort, is **document grain** (real names, real density, real emptiness) plus **imperfect print** (grain already in `wrapCover`) — not a photoreal studio or a generated planet.

---

## 4. Fit against this repo

Encoding stays locked. Only register and density may move. That rule from `00` / `02` still holds. What changes is **which register is the default**, and **what the picker calls it**.

| Current mode | Current printings | Younger default | Keep the old printing? |
| --- | --- | --- | --- |
| Timeline | Stripe / section / energy / crop | Energy field as thermal or phosphor; stripes as color-field painting (already) | Gantt-as-Gantt is a report. Keep the painting, drop the chart read |
| Setup | Circuit jewelry, iso sculpture, color columns, cascade | Jewelry and sculpture are already modern | Do not add rack chrome or XLRs |
| Uranometria | 1603 / 1820 / deep field / gilt | **Deep field** (instrument rings, NASA cyan) as default | Copper/gilt as optional “print” not the first tile |
| Cathedral | Jewel / warm glass / white leading / Prussian | Jewel and Prussian already thumbnail. Chartres-as-church is the dated name, not the geometry | Rename; keep hard leading |
| Island | Parchment / pictorial / relief / dense | Relief + dense as satellite / night map | Ortelius parchment last |
| Jacquard | Punch / stacked / blanket / warp | All four are already merch-native | Punch-card is a plus (digital textile) |
| Calligram | Mallarmé / Scher / Saville / letterpress | **Saville groove + Brat slab** as the two youth tiles | Mallarmé is a spread, not a cover; keep only if type still reads at 64 px |
| Beatfield | Lithograph / phosphor / offset / solarized | Phosphor + offset are already 2026 | Lithograph can stay as the quiet tile |
| Onset lines | Contour / lamps / etch / polar | Lamps + polar as HUD | Etch is print-shop; keep as one |

Herbarium, night interior, and cymatic were in `02` but are not all in `modes.ts` yet. If they ship:

- Herbarium → **modern voucher** (photo-pressed, black case) over Merian/Redouté. Youth read is “lab sample / Pokémon card / freeze-dry,” not “18th-c. folio.”
- Cymatic → **one liquid/metal object** (SOPHIE), not 1787 engraving as default.
- Night interior → Saul Bass graphic still over Crewdson. Photographic interiors lose at thumbnail and invite fake furniture.

**Uniqueness test, restated.** If brutalist type, Brat slab, and Saville groove all collapse to “big word on a field,” the picker failed. Bind them differently: slab = one mixer hue + one word; brutalism = device-type grid; Saville = radial/vinyl geometry from duration and BPM (already in the groove variant).

---

## 5. What “modern” means in marks (for a later restyle pass)

Not a shader list. Constraints a restyle must obey so it still looks like 2026 *and* like this document.

1. **One figure, full bleed.** Already in `cover.ts`. Enforce it in every new printing.
2. **Two-distance read.** 64 px: silhouette + dominant hue. 900 px: inventory (named towns, yarn bands, cable carnival) for the owner.
3. **Limited palette.** 1–3 families. Mixer `colorIndex` is the palette; do not add trend neons on top. A Brat slab that ignores strip color is a lie.
4. **Type is a mark, not a caption.** If type appears, it is the composition (calligram). Otherwise none. No “Que pt2 — 131 BPM” colophon on a sleeve.
5. **Material from the document.** Grain, misregister, phosphor bloom, cloth sett, metal from jewelry traces — all can be code. Iridescent film and frosted glass usually cannot, and they age fastest.
6. **Emptiness is a flex.** Sketches stay sparse. Hopper and Finlay already said this; Brat and brutalism say it louder to this age.
7. **No second picture.** A desktop watermark behind a rose is a report. One plane.

---

## 6. Research path (work order)

Do these in order. Later stages depend on earlier evidence.

### Stage A — Thumbnail autopsy (no new looks)

Export the current 2×2 for Que pt2, Designer Setup, Shots, and The Block at 64² and 410².

Record, per variant: figure holds / mud / reads as a chart. This is the only quantitative step. Expected: jewelry, jewel rose, punch field, Saville groove, phosphor, energy field survive; parchment island, Mallarmé spread, 1603 copper, Gantt-as-bars fail.

### Stage B — Name audit

Rewrite picker copy as **cover language**, not print-shop language. The encoding does not change.

Examples, not a final copy deck:

| Now | Candidate |
| --- | --- |
| 1603 copper | Night sky |
| Deep field | Instrument sky |
| Chartres / Jewel rose | Jewel |
| Ortelius / Parchment coast | Coast |
| USGS / Relief mass | Relief |
| Mallarmé | Breath (or drop) |
| Saville groove | Groove |
| Letterpress | Stamp |
| Phosphor | Phosphor |

If a 19-year-old has to know Bayer or Wattenberg to pick a tile, the label failed. Wattenberg can stay in the research notes.

### Stage C — One youth printing per mode

Add or retarget **one** register per ready mode, still the same inventory:

- Calligram: a Brat-class slab (field = hero strip color, word = title or `Soft Kick`).
- Uranometria: deep-field default (already exists — promote tile 3 to tile 1).
- Island: relief/satellite default.
- Cathedral: jewel or Prussian default (already strong).
- Beatfield: phosphor default.
- Setup: leave jewelry first.

Do not add a new mode called “Y2K” or “hyperpop.” Those are palettes, not objects.

### Stage D — Real-cover survey (the missing corpus)

48 of 112 listings already have `coverUrl`. Sample them (do not commit binaries). Tag each: type-slab, photo, anime/fandom, abstract generative, DAW screenshot, meme, default/empty.

That distribution is the **actual** Audiotool taste, stronger than any 2026 trend list. Hypothesis: many will be photos, anime, and generic abstracts — which is why a document-derived picture that looks like a *release* (slab, jewelry, cloth, phosphor) is a product, and a herbarium plate is a niche.

### Stage E — Decide the museum remainder

After A–D, keep at most **one** historical printing per mode (gilt, parchment, lithograph) as a deliberate “print” tile. If Stage A showed they fail at 64 px, drop them. Do not carry eight 17th-century defaults out of loyalty to note `02`.

### Stage F — Optional later: motion

Spotify Canvas / looping cover is a 2026 industry topic. Out of scope until stills pass A. If it happens: grain and phosphor already animate cheaply; do not invent a second composition.

---

## 7. Success

A younger user publishes the image beside a track without cropping off a legend (already true) **and** without feeling they uploaded a museum worksheet.

Que pt2, Designer Setup, and Shots remain un-swappable. The Block remains empty. The 64 px thumb of each is still *that* project’s silhouette. None of the four could be mistaken for a Midjourney “electronic album cover” prompt.

---

## Sources

**In-repo.** `BRIEFING.md`; `src/lib/viz/cover.ts` (sleeve contract); `src/lib/viz/modes.ts` (current printings); `research/00-findings.md`; `research/02-creative-visual-languages.md`; `research/04-project-data-and-inspirations.md` (`coverUrl` 48/112, 600² webp).

**Audiotool.** Board: “Getting your music noticed” (cover quality, alias, aesthetic, fandom examples); “Cover Size” (410 px zoom historically; avatars circle, covers stay square); publish dialog + `UploadCover` (JPEG/PNG/WEBP). Traffic/context: browser DAW, Soundation/Soundtrap/Beepbox adjacency.

**Scene objects.** Charli XCX *Brat* (Freaney / Special Offer / Imogene Strauss; Grammy package; “death of the finished state”). SOPHIE *Product* (Lÿno type; object-as-packaging). PC Music visual system (Timothy Luke; logo as browser default `#0000ff`, HTML shapes). Posthumous SOPHIE visualisers (Raksha: metal / latex / ice, no bodies). Factory / Saville remains valid as a *cover* ancestor, not as the youth default.

**Trend lists (use as weather, not as spec).** Premade Pixels “Album Cover Art Trends of 2026” (type, Y2K, glassmorphism, AI surrealism; thumbnail-first advice). BuyCoverArts 2026 (maximalist illustration, brutalist type, retro grain, genre micro-trends; electronic → abstract/generative). Streaming-era square roundups (neo-brutalism, lo-fi grain, Y3K iridescence, thermal/night-vision). Treat AI-surrealism growth as **competitive pressure**, not a feature to add.
