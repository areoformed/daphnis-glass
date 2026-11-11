# Validation · 11 November 2026

The 0.1.0 candidate passed:

- **5 unit groups:** SSR-safe import; JavaScript/WASM equivalence for frost, refraction and mixed parameters; allocation bounds and rejected invalid values; deterministic seed behavior; explicit MIT and contribution credits.
- **31 browser checks** on **Chrome 156.0.8078.80 on macOS**, using a separate profile and a local-only demo. Actual WebGPU rendering ran. Both materials recovered through WASM and JavaScript; a hung GPU request hit its deadline. The tests also covered SVG/CSS/solid fallbacks, outline color, the localized etched control footprint, pointer activation, retained focus, independent controllers, rejected duplicate ownership, validation before mutation, destroy/restore behavior, reduced transparency, forced colors, and a 390 px viewport.
- **Visual inspection:** desktop liquid and burred finishes, the roughened inset rim around each control, and a narrow-screen view at Retina density.

Source/export membership, public-content checks, npm tarball membership and SHA-256 integrity are verified by `scripts/release.py`. Registry publication is not part of preparation.

This is a small initial release candidate. Native Safari, Firefox, physical touch devices and Shadow DOM have not been certified. Capability-failure simulations in Chrome establish fallback logic, not rendering equivalence in other browsers. CSS remains the baseline. Performance, battery use and thermal behavior have not been benchmarked; no frame-rate claim is made.

The demo and component contain no private review documents, authentication logic, downloaded fonts, product icon files or third-party images. The only embedded data are the original procedural grain and the compiled no-import optical-map module.
