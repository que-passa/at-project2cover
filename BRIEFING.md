# Project briefing — Audiotool project to image

## Goal

Turn an Audiotool studio project into an image that is recognizably *that* project — not a generic music visualization, not a screenshot of the DAW, and not one look stretched across every kind of document.

The image should be generated from the project’s own data: arrangement, desktop graph, mixer, and patterns. Someone who knows the project should be able to tell which one it is.

## Why this exists

Audiotool projects are already structured pictures. Devices have positions. Cables have colors. Mixer strips have names and colors. Notes have pitch, time, and velocity. Waveshapers have curves.

That data is unused for covers. Published tracks sometimes get an official DAW snapshot; unpublished projects often have neither a snapshot nor a cover that reflects the document. This project treats the document as the source of the image.

## What we learned from real projects

Account `dquerg`: 112 projects listed. Eight original documents dumped (remixes and curated kits skipped).

The library is not one kind of thing:

| Kind | Examples | What dominates |
| --- | --- | --- |
| Finished song | Que pt2, Wave the Shape | Thousands of notes, named mixer channels, a real desktop |
| Rack / patch | Designer Setup, strange desktop patching | 40–140 devices, 60–150 cables, almost no timeline |
| Pattern museum | Shots | Full Beatbox / Tonematrix / Machiniste banks, no cables |
| Sketch | Beast Within, Piano Grain, The Block | A handful of devices, a few notes or one sample |

A single piano-roll renderer would lie about half of these. A single patch-graph renderer would lie about the songs.

Useful extras that showed up in the dumps: mixer strip names (Soft Kick, Arp 1, Bd/Sn/HH), waveshaper anchors and Curve devices as geometric motifs, cable `colorIndex` (expressive in strange desktop patching, mostly uniform in Que pt2). Official `snapshotUrl` was empty on all eight.

## Approach

**Adaptive studio portrait, drawn from entities first.**

1. Load the project (auth → `listProjects` / pick a project → `OpenSession` → `GetEntities` on the regional document service). Do not use Nexus live `open()` + WASM for generation: large sample blobs crash the consolidator.
2. Fingerprint the document and classify it:
   - notes > 500 → arrangement painting
   - cables > 40 and notes < 200 → patch constellation
   - many pattern entities and no notes → pattern textile
   - else → sparse still-life
3. Render a deterministic 2D image (SVG/canvas → PNG) from that layer. Palette from mixer `colorIndex` and cable colors. Signature marks from waveshaper/Curve geometry so it cannot be mistaken for a generic MIDI visualizer.
4. Optional later: an image-model style pass that keeps the deterministic drawing as the composition lock.

Default song look (Que pt2 / Wave the Shape): arrangement as the body, mixer colors as the palette, a faint desktop graph in the margins.

Default rack look (Designer Setup): constellation only — no fake piano roll.

## Constraints

- The picture must come from the document, not from the audio waveform alone.
- Do not invent density. A 3-device sketch stays sparse.
- Auth is required (PAT or OAuth). Project documents are not public.
- Dumps under `dumps/` are local analysis artifacts and stay out of git.
- ShaderNoice already proved arrangement import; this project is about *image*, including the layers ShaderNoice does not draw (desktop, mixer, patterns, waveshapers).

## Success looks like

Given Que pt2 and Designer Setup, the generator produces two images that could not be swapped. A third image from Shots should look like grids, not like either of the first two.

## First build

Classifier + SVG renderer on two fixtures already dumped: **Que pt2** (song) and **Designer Setup** (rack).
