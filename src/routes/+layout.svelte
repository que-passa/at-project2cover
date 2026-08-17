<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Audiotool · project to image</title>
</svelte:head>

{@render children()}
