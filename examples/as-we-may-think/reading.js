// MIT. Codex and areoform. Reading controls work without the glass enhancement.
const article = document.querySelector('.essay');
const bar = document.querySelector('.reading-bar');
const smaller = document.querySelector('#smaller');
const larger = document.querySelector('#larger');
const surface = document.querySelector('#surface');
const progress = document.querySelector('#progress');
const status = document.querySelector('#reading-status');
let size = 20;
let frame = 0;
let glass;

function resize(delta) {
  // Keep the paragraph beneath the toolbar in place when lines reflow.
  const y = Math.max(140, bar.getBoundingClientRect().bottom + 24);
  const anchor = document.elementFromPoint(innerWidth / 2, y)
    ?.closest('.essay p, .essay h2');
  const before = anchor?.getBoundingClientRect().top;
  size = Math.max(17, Math.min(26, size + delta));
  document.documentElement.style.setProperty('--reading-size', size + 'px');
  smaller.disabled = size === 17;
  larger.disabled = size === 26;
  if (anchor) scrollBy(0, anchor.getBoundingClientRect().top - before);
  status.textContent = 'Text size ' + size + ' pixels.';
  updateProgress();
}

function updateProgress() {
  frame = 0;
  const start = article.offsetTop;
  const end = start + article.offsetHeight - innerHeight;
  const value = Math.round(Math.max(0, Math.min(1,
    (scrollY - start) / Math.max(1, end - start))) * 100);
  progress.textContent = value + '%';
  progress.setAttribute('aria-label', 'Reading progress: ' + value + ' percent');
}

// Coalesce scroll events, rather than running a continuous animation loop.
function queueProgress() {
  if (!frame) frame = requestAnimationFrame(updateProgress);
}
smaller.disabled = larger.disabled = false;
smaller.addEventListener('click', () => resize(-1));
larger.addEventListener('click', () => resize(1));
addEventListener('scroll', queueProgress, {passive: true});
addEventListener('resize', queueProgress);
updateProgress();

try {
  const {createGlass} = await import('../../glass.js');
  glass = createGlass(bar, {
    material: surface.value,
    recipes: {refracted: {blur: .35}}
  });
  surface.disabled = false;
  surface.addEventListener('change', () => glass.setMaterial(surface.value));
} catch {
  status.textContent = 'The reading page is using its CSS glass finish.';
}

addEventListener('pagehide', event => {
  if (event.persisted) return; // Keep pages restored from the back/forward cache usable.
  glass?.destroy();
  if (frame) cancelAnimationFrame(frame);
});
