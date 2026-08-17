<script lang="ts">
	import { onMount } from 'svelte';

	onMount(() => {
		location.replace('/');
	});
</script>

<style>
	:global(html) {
		background: #000;
	}
</style>
