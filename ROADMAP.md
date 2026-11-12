# Future optical work

Recorded 11 November 2026. Deferred work; no physical-optics implementation is part of this update.

- [ ] Add an explicit index-of-refraction material parameter.
- [ ] Represent actual surface depth/thickness and define how it changes refraction.
- [ ] Develop the depth/refraction model in the WASM path, with a verifiable numerical reference.
- [ ] Preserve the independent material, renderer and compute fallbacks, bounded resources and legible controls.
- [ ] Establish visual references, numerical checks and device measurements before claiming physical fidelity or improved performance.

The current component approximates refraction with optical displacement maps. WASM generates maps; SVG/CSS compose the browser backdrop. Physical refraction is future work, separate from the completed reading example and from Felt account/onboarding work.
