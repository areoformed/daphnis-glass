# Validation · 11 November 2026

The 0.1.0 candidate passed:

- **5 unit groups:** SSR-safe import; JavaScript/WASM equivalence for frost, refraction and mixed parameters; allocation bounds and rejected invalid values; deterministic seed behavior; explicit MIT and contribution credits.
- **31 browser checks** on **Chrome 156.0.8078.80 on macOS**, using a separate profile and a local-only demo. Actual WebGPU rendering ran. Both materials recovered through WASM and JavaScript; a hung GPU request hit its deadline. The tests also covered SVG/CSS/solid fallbacks, outline color, the localized etched control footprint, pointer activation, retained focus, independent controllers, rejected duplicate ownership, validation before mutation, destroy/restore behavior, reduced transparency, forced colors, and a 390 px viewport.
- **Visual inspection:** desktop liquid and burred finishes, the roughened inset rim around each control, and a narrow-screen view at Retina density.

Source/export membership, public-content checks, npm tarball membership and SHA-256 integrity are verified by `scripts/release.py`. Registry publication is not part of preparation.

The revised standalone `examples/as-we-may-think/` addition passed **31 reading-bar browser checks** in the same Chrome version, against a generated static-site export. They cover the complete essay structure, continuous bar, a directly accessible named Finish selector, declarative finish recipes and custom combinations, resetting the selected finish, settings placement and Escape/focus behavior, text sizing, section links, 390/360/320 px layouts, reduced transparency, forced colors, missing shared stylesheet, missing stylesheet plus module, unavailable SVG/blur/transparency, and no JavaScript with the shared stylesheet also missing. The existing 31 component browser checks and five unit groups also passed after the change. Desktop, glass-over-text, settings and missing-CSS screenshots were visually inspected. The eight numbered sections and all 73 paragraph texts still match the supplied transcription. The essay is separately attributed content, not part of the MIT license grant; see the example's content note.

The reported Arc/hosted failure could not be inspected directly because the public endpoint returned HTTP 403 to these checks. A user-provided Console report confirmed a stylesheet load failure. Local missing-asset simulations establish the revised fallback behavior; they do not establish that the currently hosted copy has been redeployed or verified in Arc.

This is a small initial release candidate. Native Safari, Firefox, physical touch devices and Shadow DOM have not been certified. Capability-failure simulations in Chrome establish fallback logic, not rendering equivalence in other browsers. CSS remains the baseline. Performance, battery use and thermal behavior have not been benchmarked; no frame-rate claim is made.

The demo and component contain no private review documents, authentication logic, downloaded fonts, product icon files or third-party images. The only embedded data are the original procedural grain and the compiled no-import optical-map module.
