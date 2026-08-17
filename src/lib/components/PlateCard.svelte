<script lang="ts">
	import type { RenderedPlate } from '$lib/viz/types';

	const EMPTY_SRC =
		'data:image/svg+xml;charset=utf-8,' +
		encodeURIComponent(
			'<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900"><rect width="900" height="900" fill="#000000"/></svg>'
		);

	let {
		plate,
		selected = false,
		onclick
	}: {
		plate: RenderedPlate | null;
		selected?: boolean;
		onclick?: () => void;
	} = $props();

	const src = $derived(
		plate ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(plate.svg)}` : EMPTY_SRC
	);
	const name = $derived(plate?.label ?? 'Empty cover slot');
</script>

<button
	class={['card', selected && 'selected', !plate && 'empty']}
	type="button"
	disabled={!plate}
	aria-pressed={plate ? selected : undefined}
	aria-label={name}
	onclick={plate ? onclick : undefined}
>
	<div class="frame">
		<img alt="" {src} width="900" height="900" decoding="async" />
	</div>
</button>

<style>
	.card {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		padding: 0;
		overflow: hidden;
		border: 1px solid var(--rule);
		background: var(--bg);
		color: var(--fg);
		text-align: left;
	}

	.card.selected {
		border-color: var(--ring);
		box-shadow: inset 0 0 0 1px var(--ring);
	}

	.card.empty {
		cursor: default;
		opacity: 1;
	}

	.frame {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: var(--bg);
	}

	.frame img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		object-position: center;
	}
</style>
