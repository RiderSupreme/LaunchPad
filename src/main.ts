import HeaderDock from './HeaderDock.svelte';

function mountDock() {
  const mountTargets = Array.from(document.querySelectorAll('#headerDock')) as HTMLElement[];
  if (!mountTargets.length) return;
  mountTargets.forEach((target) => {
    // Clear existing HTML so SPA dock replaces old markup
    target.innerHTML = '';
    new HeaderDock({ target });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountDock, { once: true } as AddEventListenerOptions);
} else {
  mountDock();
}


