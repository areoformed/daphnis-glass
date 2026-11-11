# Felt Glass

**Developed by Codex in collaboration with areoform. MIT licensed.**

A small, dependency-free JavaScript/CSS component for liquid glass and deliberately roughened glass. Its controls can have an **etched footprint**: a roughened rim and inset light/shadow cues make the icon feel cut into the surrounding pane.

[Contribution credits](AUTHORS.md) · [License](LICENSE) · [Validation](VALIDATION.md)

## Try it

From the source ZIP, with Node installed:

```sh
npm run demo
```

Open the local address printed by the server. The demo uses ordinary HTML controls and placeholder glyphs. Choose Liquid glass or Burred glass, toggle Etched controls, and vary the roughened rim. “Burred” describes the local roughening treatment used in this material study.

The server binds only to loopback and serves an explicit list of demo/component files. It is a development convenience, not a hosting server.

## Use it

Copy `glass.js`, `maps.js`, and `glass.css` together, or install the prepared local tarball:

```sh
npm install ./areoform-felt-glass-0.1.0.tgz
```

```html
<link rel="stylesheet" href="./glass.css">
<div class="fg-glass" id="toolbar">
  <button class="fg-etch" type="button" aria-label="Highlight">✎</button>
</div>
<script type="module">
  import {createGlass} from './glass.js';
  const glass = createGlass('#toolbar', {material: 'refracted'});
  // glass.setMaterial('frosted');
  // glass.destroy();
</script>
```

With a package-aware bundler, import `createGlass` from `@areoform/felt-glass` and the stylesheet from `@areoform/felt-glass/glass.css`. The package is prepared locally; registry publication and access to that scope are separate steps.

The component decorates existing HTML elements. It does not replace, wrap or re-create their contents. Your buttons retain their event handlers, labels, native focus and form behavior. Apply `fg-etch` to individual controls; the roughened band follows the control footprint, independently of the surface's rendering engine.

## API

`createGlass(targets, options)` accepts a selector, one element, or an iterable of distinct HTML elements in the current document's light DOM. It returns a controller:

| Method | Behavior |
|---|---|
| `setMaterial(name)` | Select `auto`, `refracted`, `frosted`, `translucent`, or `solid`. |
| `setRecipes(patch)` | Update validated numeric parameters for either rich material. |
| `refresh()` | Re-evaluate capabilities and geometry, useful after revealing a hidden element. |
| `state` | Read the requested material and each element's actual material, renderer and engine. |
| `destroy()` | Disconnect observers/listeners, cancel owned map work, remove owned SVG filters, and restore the element attributes/styles/classes taken over by the controller. Repeated calls are safe. |

Elements can belong to only one controller at a time. Controllers use separate IDs, recipes, caches and choices. Importing the module is safe during server-side rendering; call `createGlass` only in a browser, after the elements exist. Shadow DOM, cross-document targets and arbitrary SVG shapes are not part of this initial release.

```js
const glass = createGlass(document.querySelectorAll('.pane'), {
  material: 'frosted',
  recipes: {frosted: {roughness: .7, blur: 2, displacement: 4, grainSize: 176}}
});
glass.setMaterial('refracted');
```

Recipe fields are `bend` and `roughness` (0–1), `rim` (0.5–64 px), `blur` (0–32 px), `displacement` (0–64 px), `saturation` (0–2), `fallbackBlur` (0–40 px), `grainSize` (32–512 CSS px), and an unsigned 32-bit `seed`. Invalid values fail before changing the current configuration. Curvature follows the element's CSS border radius; the optical shape is a rounded rectangle.

## Appearance

```css
.pane {
  --fg-radius: 32px;
  --fg-border: #24a68e; /* same teal as the demo's confirmation button */
  --fg-color: #223a33;
}
.icon-button {
  --fg-etch-radius: 14px;
  --fg-etch-width: 3px;
}
```

The grain is static and embedded. It varies in size, strength and dispersal; there is no animated noise shader or frame loop. The etched ring uses a masked grain band where supported, with an inset border/shadow fallback. All decoration leaves pointer events and foreground content alone. Focus styling remains the host application's responsibility; the demo includes it.

## Fallbacks within fallbacks

- **Material:** refracted → frosted → translucent → solid.
- **Backdrop renderer:** SVG optics → CSS frost/blur → simpler CSS surfaces.
- **Map generation:** WebGPU → bundled WASM → JavaScript, using the same parameters for both rich materials.
- **Etching:** masked roughened rim → inset CSS edge. Forced colors remove the decorative layers.

A failed map engine does not require a different supported material. A renderer failure does not disable the contents. Parsing an SVG filter URL does not establish that a browser paints it; this release enables that enhancement only in the tested Chromium family. Other engines retain CSS surfaces.

`auto` honors reduced transparency and increased contrast. An explicit material can override those surface defaults; forced colors always win. The component introduces no motion, persistence, telemetry, cookies, authentication or network requests. It does not alter document source or process user data.

Maps are limited to 300,000 pixels and 4,096 pixels per dimension. WASM memory is fixed at 1.5 MiB. Per controller, work is limited to two active and 32 queued jobs, with four cached images. Setup and decoding have deadlines. GPU resources are released after generation. A richer backend is not a performance guarantee; device performance has not been benchmarked.

The host must serve the modules and CSS. Optional maps/grain need `img-src data:` under a strict CSP. The WASM backend can use the narrowly scoped `script-src 'wasm-unsafe-eval'` permission; if it is blocked, JavaScript generation remains available. JavaScript `unsafe-eval` is not required. Do not weaken an untrusted document sandbox just to enable this decorative effect.

Technical references: [backdrop filtering](https://drafts.csswg.org/filter-effects-2/), [WebGPU](https://www.w3.org/TR/webgpu/), [WASM-specific CSP permission](https://www.w3.org/TR/CSP3/). WebGPU/WASM generate maps; SVG/CSS compose the browser's actual backdrop.

## Development and release

`npm test` checks backend equivalence, bounds, SSR-safe imports and credits. Browser checks use an isolated Chrome debugging port:

```sh
FELT_TEST_CDP_PORT=9222 npm run test:browser
```

Start the demo first. The tests create/close their own tab and deliberately simulate failures. Use a disposable Chrome profile, never your regular browser profile. See `VALIDATION.md` for the actual tested platform and limits.

`scripts/glass-map.c` reproduces the embedded no-import WASM module; its build command is in the source. `scripts/glass-grain.py` generates the original static texture using Python's standard library.

```sh
python3 scripts/release.py --check
python3 scripts/release.py --output /tmp/felt-glass-release
```

The exporter accepts only the explicit release file map, rejects unknown files and links, scans for private material, runs unit checks, checks the npm package membership, and creates checksummed source ZIP and npm tarball archives. It performs no publishing or remote writes.
