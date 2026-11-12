# Future optical work

Started 11 November 2026; updated 12 November 2026.

- [x] Add an explicit index-of-refraction material parameter.
- [x] Represent actual surface depth/thickness for an explicit rounded-cap geometry.
- [ ] Develop the depth/refraction model in the WASM path, with a verifiable numerical reference.
- [ ] Preserve the independent material, renderer and compute fallbacks, bounded resources and legible controls.
- [ ] Establish visual references, numerical checks and device measurements before claiming physical fidelity or improved performance.

The opt-in [Snell/Fresnel core](OPTICS.md) now generates direct transmission for user-defined indices. It uses cooperative JavaScript; the original artistic WASM/WebGPU maps remain independent. SVG/CSS compose the browser backdrop. The scalar-index model does not infer dispersion or roughness.

- [ ] Model correlated surface grains and unresolved rough transmission separately.
- [ ] Add a matched WASM/GPU implementation after measuring the new baker and compositor separately.
- [ ] Extend geometry adapters and spectral/material definitions without changing the interface-law core.

## First reference study · 12 November 2026

A [sessile water-drop study](experiments/sessile-drop/MODEL.md) now defines a volume/contact-angle spherical cap, full overhang geometry, analytic refracting interfaces, wavelength-dependent water index and a separate rainbow-path diagnostic. [Open the standalone study](experiments/sessile-drop/standalone.html) locally or serve the experiment directory.

The droplet remains an independent numerical reference. Gravity-aware liquid shapes, measured calibration and a shared Snell-law WASM implementation remain future work. The component now has a separate opt-in manufactured-pane adapter; no liquid equilibrium is assumed for that shape.
