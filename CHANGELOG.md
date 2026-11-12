# Changelog

## 0.2.0

- The material demo and As We May Think reader now use index-driven optics by default for their clear finish. Refractive index and thickness are adjustable behind the reader's existing gear; textured and simpler finishes retain their own paths.

- Added an opt-in, index-driven Snell/Fresnel core, a rounded-cap direct-transmission adapter, documented precision/resource fallbacks, and a custom-index demo control. Scalar materials do not infer dispersion or grain.
- Retain unchanged surface maps across refresh/visibility changes, independently of shared cache eviction. No scroll-time optical generation.

- Gave the finish chevron a consistent visible size and inset, with text clearance and a native forced-color fallback.

- Promoted Finish to the reading bar, named and declared finish recipes in HTML, and kept only fine adjustments behind the gear. Reset now restores the currently selected finish.
- Added a standalone As We May Think reading example with section links, text-size controls and a glass reading bar. Essay attribution and rights are documented separately from the MIT-licensed demo code.
- Reworked the reader into a continuous bar with a discreet settings panel, three presets and independent optical/tint/etching controls.
- Added an independent solid and CSS surface path when shared glass files fail to load, with stylesheet readiness checked before activating optics.
- Added an allowlisted static-site exporter for Pages, Workers Static Assets and ordinary file hosting, including root and 404 pages.

## 0.1.0

First standalone release candidate extracted from the Felt prototype.

- Refracted, frosted/burred, translucent and solid surfaces, with automatic accessibility defaults.
- Shared parameter-driven optical maps: WebGPU → WASM → JavaScript.
- Independent backdrop rendering: SVG optics → CSS frost → translucency → solid.
- Etched control footprints, with a roughened rim and inset light/shadow cues.
- Thin teal outline, configurable through CSS.
- Local state, isolated filter IDs, independent instances and explicit cleanup.
- No runtime dependencies or network requests; MIT licensed.
