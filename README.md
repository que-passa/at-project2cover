# AT project → cover

Turn an [Audiotool](https://www.audiotool.com/) studio project into cover art generated from the document itself — arrangement, desktop graph, mixer, and patterns — not from a generic waveform or DAW screenshot.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The app reads project dumps from `dumps/` on disk.

## Dumping projects

Project documents require authentication. Create a personal access token at [developer.audiotool.com/personal-access-tokens](https://developer.audiotool.com/personal-access-tokens), then:

```bash
cp .env.example .env
# edit .env and set AT_PAT=your_token

npm run dump
```

This writes `dumps/<project-id>/{meta,summary,entities}.json`. Dumps stay local (gitignored) because they may contain unpublished studio documents.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the SvelteKit dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run dump` | Fetch projects from Audiotool into `dumps/` |
| `npm test` | Run renderer self-tests against local dumps |
| `npm run check` | Type-check Svelte/TS |

## Preview covers

Generated SVG previews for sample projects live in [`.preview-covers/`](.preview-covers/). These are committed as reference output; the interactive app renders live from dump data instead.

## Architecture

- **SvelteKit** app with server routes that load dumps from the filesystem
- **Classifier** picks a visual mode from project density (arrangement, patch graph, pattern grid, sparse sketch)
- **SVG renderers** produce deterministic cover plates with project-specific palettes from mixer and cable colors

See [`BRIEFING.md`](BRIEFING.md) for goals and constraints, and [`research/`](research/) for design notes.

## Deployment note

This is a server-rendered app (not a static site). To deploy publicly you need a Node/serverless host plus either bundled sample dumps or a data source on the server. The dump script token is only required locally — visitors of the web UI do not need `AT_PAT`.
