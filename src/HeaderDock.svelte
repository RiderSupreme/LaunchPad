<script>
  import { Home, PencilLine, TvMinimalPlay } from 'lucide-svelte';

  const items = [
    { label: 'Home', href: 'index.html', icon: Home },
    { label: 'Profile', href: 'profile.html', icon: PencilLine },
    { label: 'LaunchPad', href: 'launchpad.html', icon: TvMinimalPlay },
    { label: 'Skill Link', href: 'skill-link.html', icon: PencilLine },
    { label: 'About', href: 'about.html', icon: TvMinimalPlay }
  ];

  let mouseX = 0;
  let bounds;

  function onMouseMove(event) {
    const rect = bounds?.getBoundingClientRect();
    mouseX = rect ? event.clientX - rect.left : 0;
  }

  function magnify(index, x) {
    const center = index * 54 + 27; // approximate center per item
    const dist = Math.abs(center - x);
    const influence = Math.max(0, 1 - dist / 120);
    return 1 + influence * 0.6; // scale 1..1.6
  }
</script>

<div class="dock-wrap" bind:this={bounds} on:mousemove={onMouseMove} role="group" aria-label="Primary navigation">
  {#each items as item, i}
    <a
      class="dock-item"
      href={item.href}
      aria-label={item.label}
      title={item.label}
      style={`transform: translateZ(0) scale(${magnify(i, mouseX)});`}
    >
      <span class="sr-only">{item.label}</span>
      <svelte:component this={item.icon} size={20} strokeWidth={1.6} />
    </a>
  {/each}
</div>

<style>
  .dock-wrap { display: flex; align-items: center; gap: 8px; }
  .dock-item { display: inline-flex; align-items: center; justify-content: center; padding: 10px 14px; border-radius: 999px; text-decoration: none; color: inherit; border: 1px solid transparent; transition: transform 180ms ease; }
</style>


