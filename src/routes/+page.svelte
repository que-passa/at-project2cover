<script lang="ts">
	import { onMount } from 'svelte';
	import PlateCard from '$lib/components/PlateCard.svelte';
	import { downloadPng, downloadSvg } from '$lib/viz/export';
	import { MODES } from '$lib/viz/modes';
	import { renderMode } from '$lib/viz/render';
	import { ticksToBars } from '$lib/viz/ticks';
	import type { DumpListItem, ModeId, RenderedPlate, VizProject } from '$lib/viz/types';

	let { data } = $props();

	let selectedId = $state<string | null>(null);
	let modeId = $state<ModeId>('timeline');
	let variantId = $state<string | null>(null);
	let project = $state.raw<VizProject | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let exporting = $state(false);

	const mode = $derived(MODES.find((m) => m.id === modeId) ?? MODES[0]);
	const plates = $derived.by(() => (project ? renderMode(project, modeId) : []));
	const selectedPlate = $derived(plates.find((p) => p.variantId === variantId) ?? plates[0] ?? null);
	const slots = $derived.by((): Array<RenderedPlate | null> => {
		return [0, 1, 2, 3].map((i) => plates[i] ?? null);
	});
	const canExport = $derived(Boolean(selectedPlate && mode.status === 'ready' && !loading));
	const statusLine = $derived.by(() => {
		if (error) return error;
		if (loading) return 'Reading dump entities…';
		if (!project) return 'Pick a dumped studio document.';
		if (mode.status === 'coming-soon') {
			return `${mode.title} is queued — placeholder colophon, not a fake picture.`;
		}
		if (selectedPlate) {
			return `${selectedPlate.label} — ${selectedPlate.axis}`;
		}
		return 'Same inventory and colors. Each tile is a full-bleed sleeve.';
	});

	async function loadProject(id: string, opts?: { applySuggestedMode?: boolean }) {
		selectedId = id;
		loading = true;
		error = null;
		try {
			const res = await fetch(`/api/projects/${id}`);
			if (!res.ok) throw new Error(await res.text());
			const loaded = (await res.json()) as VizProject;
			if (opts?.applySuggestedMode) {
				modeId = MODES.some((m) => m.id === loaded.suggestedMode)
					? loaded.suggestedMode
					: (MODES[0]?.id ?? 'timeline');
				variantId = null;
			}
			project = loaded;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load dump';
		} finally {
			loading = false;
		}
	}

	function pickProject(item: DumpListItem) {
		void loadProject(item.id);
	}

	function pickMode(id: ModeId) {
		modeId = id;
		variantId = null;
	}

	onMount(() => {
		const first = data.projects[0];
		if (first) void loadProject(first.id, { applySuggestedMode: true });
	});

	function fileBase(): string {
		const name = (project?.name ?? 'project').replace(/[^\w.-]+/g, '_');
		return `${name}-${modeId}-${selectedPlate?.variantId ?? 'plate'}`;
	}

	function exportSvg() {
		if (!selectedPlate || !canExport) return;
		downloadSvg(`${fileBase()}.svg`, selectedPlate.svg);
	}

	async function exportPng() {
		if (!selectedPlate || !canExport) return;
		exporting = true;
		try {
			await downloadPng(`${fileBase()}.png`, selectedPlate.svg);
		} finally {
			exporting = false;
		}
	}
</script>

<div class="app">
	<header class="mast">
		<div class="brand">
			<p class="kicker">Audiotool document → cover art</p>
			<h1>Project to image</h1>
		</div>
		<p class="lede" title="Pick a dumped studio document, a mode, then one of four covers. Each plate is the square published beside the track.">
			Covers stay on a fixed stage. Rails scroll; the 2×2 does not move.
		</p>
		<div class="exports">
			<button type="button" class="exp" onclick={exportSvg} disabled={!canExport}>
				Download SVG
			</button>
			<button
				type="button"
				class="exp"
				onclick={() => void exportPng()}
				disabled={!canExport || exporting}
			>
				{exporting ? 'Encoding…' : 'Download PNG'}
			</button>
		</div>
	</header>

	<aside class="projects">
		<h2>Dumped projects</h2>
		<ul>
			{#each data.projects as item (item.id)}
				<li>
					<button
						class={['proj', selectedId === item.id && 'on']}
						type="button"
						onclick={() => pickProject(item)}
					>
						<span class="name">{item.name}</span>
						<span class="facts mono">
							{item.kind} · {item.bpm} BPM · {ticksToBars(item.durationTicks).toFixed(0)} bars
						</span>
						<span class="facts mono">
							{item.notes} notes · {item.audioCables + item.noteCables} cables · {item.devices} devices
						</span>
					</button>
				</li>
			{/each}
		</ul>
	</aside>

	<aside class="modes">
		<h2>Mode</h2>
		<div class="mode-list">
			{#each MODES as m (m.id)}
				<button
					class={[
						'mode',
						modeId === m.id && 'on',
						m.status === 'coming-soon' && 'soon',
						project?.suggestedMode === m.id && 'suggest'
					]}
					type="button"
					onclick={() => pickMode(m.id)}
				>
					<span class="num mono">{String(m.number).padStart(2, '0')}</span>
					<span class="mtitle">{m.title}</span>
					<span class="msub">{m.subtitle}</span>
					{#if m.status === 'coming-soon'}
						<span class="badge">Soon</span>
					{:else}
						<span class="badge ready">4</span>
					{/if}
				</button>
			{/each}
		</div>
	</aside>

	<section class="stage-col">
		<div class="stage">
			<div class={['veil', loading && 'on']} aria-hidden="true"></div>
			<div class="quad" aria-label="Cover stage">
				{#each slots as plate, i (i)}
					<PlateCard
						{plate}
						selected={plate != null && selectedPlate?.variantId === plate.variantId}
						onclick={plate ? () => (variantId = plate.variantId) : undefined}
					/>
				{/each}
			</div>
		</div>
		<footer class={['meta', error && 'err']}>
			<p class="status mono">{statusLine}</p>
		</footer>
	</section>
</div>

<style>
	.app {
		--rail-projects: 15.75rem;
		--rail-modes: 13.5rem;
		--mast-h: 3.15rem;
		--meta-h: 2.5rem;
		--stage-pad: 0.7rem;
		--quad-gap: 0.4rem;
		--avail-w: calc(100vw - var(--rail-projects) - var(--rail-modes) - 2 * var(--stage-pad));
		--avail-h: calc(100dvh - var(--mast-h) - var(--meta-h) - 2 * var(--stage-pad));
		--quad: min(var(--avail-w), var(--avail-h));

		display: grid;
		grid-template-columns: var(--rail-projects) var(--rail-modes) minmax(0, 1fr);
		grid-template-rows: var(--mast-h) minmax(0, 1fr);
		grid-template-areas:
			'mast mast mast'
			'projects modes stage';
		width: 100vw;
		height: 100dvh;
		overflow: hidden;
		background: var(--bg);
		color: var(--fg);
	}

	.mast {
		grid-area: mast;
		display: grid;
		grid-template-columns: minmax(0, 18rem) minmax(0, 1fr) auto;
		align-items: center;
		gap: 1rem;
		height: var(--mast-h);
		padding: 0 0.85rem 0 1rem;
		overflow: hidden;
		border-bottom: 1px solid var(--rule);
	}

	.brand,
	.lede {
		min-width: 0;
		overflow: hidden;
	}

	.kicker,
	h1,
	.lede {
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.kicker {
		color: var(--muted);
		font-size: 0.62rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	h1,
	h2 {
		font-weight: 600;
	}

	h1 {
		font-size: 1.05rem;
		letter-spacing: -0.03em;
	}

	h2 {
		margin: 0;
		height: 2.4rem;
		padding: 0.75rem 0.75rem 0;
		overflow: hidden;
		color: var(--fg-dim);
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.lede {
		color: var(--fg-dim);
		font-size: 0.82rem;
	}

	.exports {
		display: flex;
		flex-shrink: 0;
		gap: 0.4rem;
	}

	.projects {
		grid-area: projects;
		border-right: 1px solid var(--rule);
	}

	.modes {
		grid-area: modes;
		border-right: 1px solid var(--rule);
	}

	.projects,
	.modes {
		display: grid;
		grid-template-rows: 2.4rem minmax(0, 1fr);
		min-height: 0;
		overflow: hidden;
		background: var(--bg-elev);
	}

	.projects ul,
	.mode-list {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-height: 0;
		margin: 0;
		padding: 0.15rem 0.65rem 0.85rem;
		overflow: auto;
		scrollbar-gutter: stable;
	}

	.projects ul {
		list-style: none;
	}

	.proj,
	.mode,
	.exp {
		border: 1px solid var(--rule);
		background: var(--bg-btn);
		color: var(--fg);
	}

	.proj {
		display: flex;
		flex-direction: column;
		gap: 0.12rem;
		width: 100%;
		height: 4.15rem;
		padding: 0.45rem 0.55rem;
		overflow: hidden;
		text-align: left;
	}

	.proj.on,
	.mode.on {
		border-color: var(--ring);
		background: var(--bg-on);
	}

	.name,
	.facts {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.name {
		font-size: 0.95rem;
	}

	.facts {
		color: var(--muted);
		font-size: 0.65rem;
	}

	.mode {
		display: grid;
		grid-template-columns: 1.55rem minmax(0, 1fr) auto;
		grid-template-rows: 1.05rem 1.05rem;
		align-items: center;
		width: 100%;
		height: 3.35rem;
		padding: 0.32rem 0.4rem;
		overflow: hidden;
		text-align: left;
	}

	.mode.soon {
		opacity: 0.72;
	}

	.mode.suggest:not(.on) {
		box-shadow: inset 0 0 0 1px var(--rule);
	}

	.num {
		grid-row: 1 / -1;
		color: var(--muted);
		font-size: 0.62rem;
	}

	.mtitle,
	.msub {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mtitle {
		font-size: 0.86rem;
	}

	.msub {
		grid-column: 2;
		color: var(--muted);
		font-size: 0.68rem;
	}

	.badge {
		grid-row: 1 / -1;
		grid-column: 3;
		font-size: 0.58rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--soon);
	}

	.badge.ready {
		color: var(--ready);
	}

	.exp {
		height: 2rem;
		padding: 0 0.7rem;
		font-size: 0.72rem;
		white-space: nowrap;
	}

	.exp:hover:not(:disabled) {
		border-color: var(--ring);
	}

	.exp:disabled {
		cursor: default;
		opacity: 0.45;
	}

	.stage-col {
		grid-area: stage;
		display: grid;
		grid-template-rows: minmax(0, 1fr) var(--meta-h);
		min-width: 0;
		min-height: 0;
		overflow: hidden;
	}

	.stage {
		position: relative;
		display: grid;
		place-items: center;
		min-width: 0;
		min-height: 0;
		padding: var(--stage-pad);
		overflow: hidden;
	}

	.quad {
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr 1fr;
		gap: var(--quad-gap);
		width: var(--quad);
		height: var(--quad);
	}

	.veil {
		position: absolute;
		inset: 0;
		z-index: 2;
		background: rgb(0 0 0 / 0.4);
		opacity: 0;
		pointer-events: none;
	}

	.veil.on {
		opacity: 1;
	}

	.meta {
		display: grid;
		align-items: center;
		height: var(--meta-h);
		padding: 0 0.85rem;
		overflow: hidden;
		border-top: 1px solid var(--rule);
	}

	.status {
		margin: 0;
		overflow: hidden;
		color: var(--fg-dim);
		font-size: 0.75rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.err .status {
		color: var(--err);
	}

	@media (max-width: 1100px) {
		.app {
			--rail-projects: 12.75rem;
			--rail-modes: 11.25rem;
		}
	}
</style>
