// MIT. Codex and areoform. Reading and basic surfaces do not depend on glass.js.
const article = document.querySelector('.essay');
const bar = document.querySelector('.reading-bar');
const smaller = document.querySelector('#smaller');
const larger = document.querySelector('#larger');
const surface = document.querySelector('#surface');
const progress = document.querySelector('#progress');
const status = document.querySelector('#reading-status');
const finish = document.querySelector('#finish-status');
const settings = document.querySelector('#glass-settings');
const inputs = Object.fromEntries(['bend','roughness','grain-size','blur','tint','etched'].map(id => [id,document.getElementById(id)]));
let size = 20, frame = 0, tuningFrame = 0, glass, observer, departed = false;

function resize(delta) {
  const y = Math.max(140, bar.getBoundingClientRect().bottom + 24);
  const anchor = document.elementFromPoint(innerWidth / 2, y)?.closest('.essay p, .essay h2');
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
  if (settings.open) fitPanel();
  const start = article.offsetTop, end = start + article.offsetHeight - innerHeight;
  const value = Math.round(Math.max(0, Math.min(1, (scrollY - start) / Math.max(1, end - start))) * 100);
  progress.textContent = value + '%';
  progress.setAttribute('aria-label', 'Reading progress: ' + value + ' percent');
}
function queueProgress() { if (!frame) frame = requestAnimationFrame(updateProgress); }
smaller.disabled = larger.disabled = false;
smaller.addEventListener('click', () => resize(-1));
larger.addEventListener('click', () => resize(1));
addEventListener('scroll', queueProgress, {passive:true});
addEventListener('resize', queueProgress);
updateProgress();

const supports = (p,v) => Boolean(window.CSS?.supports?.(p,v));
const canBlur = supports('backdrop-filter','blur(5px)') || supports('-webkit-backdrop-filter','blur(5px)');
const alpha = supports('background-color','rgba(255,255,255,.9)');
const media = ['(forced-colors:active)','(prefers-reduced-transparency:reduce)','(prefers-contrast:more)'].map(q => window.matchMedia?.(q));
function localMaterial() {
  if (media[0]?.matches || (surface.value === 'auto' && (media[1]?.matches || media[2]?.matches)) || surface.value === 'solid' || !alpha) return 'solid';
  return surface.value === 'translucent' || !canBlur ? 'translucent' : 'frosted';
}
function updateFinish() {
  const material = glass?.state.surfaces[0]?.material || localMaterial();
  const rich = glass?.state.surfaces[0]?.renderer === 'svg';
  const names = {refracted:'Liquid glass',frosted:rich?'Burred glass':'Frosted pane',translucent:'Translucent glass',solid:'Solid pane'};
  finish.textContent = names[material] + (glass ? '.' : ' · basic finish.');
  inputs.bend.disabled = !rich || material !== 'refracted';
  inputs.roughness.disabled = !rich;
  inputs['grain-size'].disabled = !glass || material !== 'frosted';
  inputs.blur.disabled = material === 'solid' || material === 'translucent';
}
function apply() {
  tuningFrame = 0;
  const value = id => Number(inputs[id].value);
  for (const id of ['bend','roughness','grain-size','blur','tint']) document.querySelector(`output[for="${id}"]`).textContent = inputs[id].value;
  bar.style.setProperty('--pane-tint', value('tint'));
  bar.style.setProperty('--local-blur', value('blur') * 4 + 'px');
  bar.querySelectorAll('.bar-navigation .reading-button').forEach(button => button.classList.toggle('fg-etch',inputs.etched.checked));
  if (glass) {
    const recipe = {bend:value('bend'),roughness:value('roughness'),grainSize:value('grain-size'),blur:value('blur'),fallbackBlur:value('blur')*4};
    glass.setRecipes({refracted:recipe,frosted:recipe});
    if (glass.state.requested !== surface.value) glass.setMaterial(surface.value);
  } else {
    bar.dataset.fallbackMaterial = localMaterial();
  }
  updateFinish();
}
function queueTuning() { if (!tuningFrame) tuningFrame = requestAnimationFrame(apply); }
// The native options declare each named finish and all of its starting values.
function chooseFinish() {
  const option = surface.selectedOptions[0];
  for (const [id,input] of Object.entries(inputs)) {
    const value = option.getAttribute('data-' + id);
    if (input.type === 'checkbox') input.checked = value === null ? input.defaultChecked : value === 'true';
    else input.value = value ?? input.defaultValue;
  }
  document.querySelector('#finish-name').textContent = option.textContent.trim();
  document.querySelector('#finish-description').textContent = option.dataset.description;
  apply();
}
surface.disabled = false;
surface.addEventListener('input',chooseFinish);
for (const input of Object.values(inputs)) { input.disabled = false; input.addEventListener('input',queueTuning); }
const reset = document.querySelector('#reset-glass');
reset.disabled = false;
reset.addEventListener('click',chooseFinish);
for (const setting of media) { if (setting?.addEventListener) setting.addEventListener('change',apply); else setting?.addListener?.(apply); }
function fitPanel() {
  const box = bar.getBoundingClientRect();
  const below = innerHeight - box.bottom - 24, above = box.top - 24;
  const useAbove = below < 260 && above > below;
  settings.dataset.placement = useAbove ? 'above' : 'below';
  settings.style.setProperty('--settings-height', Math.max(100,useAbove ? above : below) + 'px');
}
settings.addEventListener('toggle',fitPanel);
// Native details works without JS; Escape and outside click are conveniences.
document.addEventListener('keydown',event => { if (event.key === 'Escape' && settings.open) { settings.open = false; settings.querySelector('summary').focus(); } });
document.addEventListener('pointerdown',event => { if (settings.open && !settings.contains(event.target) && !event.target.closest?.('.finish-control')) settings.open = false; });
chooseFinish();

try {
  const {createGlass} = await import('../../glass.js');
  // A parsed effect is insufficient if the accompanying material styles never loaded.
  if (getComputedStyle(bar).getPropertyValue('--fg-css-ready').trim() === '1' && !departed) {
    glass = createGlass(bar, {material:surface.value});
    bar.dataset.glassReady = 'true';
    observer = new MutationObserver(updateFinish);
    observer.observe(bar,{attributes:true,attributeFilter:['data-fg-material','data-fg-renderer','data-fg-engine']});
    apply();
  }
} catch {
  // Local CSS and its own capability checks already provide a usable surface.
  updateFinish();
}
addEventListener('pagehide',event => {
  if (event.persisted) return;
  departed = true;
  observer?.disconnect();
  glass?.destroy();
  for (const setting of media) { if (setting?.removeEventListener) setting.removeEventListener('change',apply); else setting?.removeListener?.(apply); }
  if (frame) cancelAnimationFrame(frame);
  if (tuningFrame) cancelAnimationFrame(tuningFrame);
});
