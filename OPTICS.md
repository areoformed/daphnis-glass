# Optical materials

Supply a refractive index and the component generates a Snell-law displacement map and Fresnel transmission mask. Materials are data, not a hardcoded list of substances. Existing artistic recipes remain available when `optics` is omitted.

```js
import {createGlass} from './glass.js';

const myMaterial = {refractiveIndex: 1.52};
const glass = createGlass('.pane', {
  material: 'refracted', // Existing finish selector, independent of optical material.
  optics: myMaterial
});

glass.setOptics({refractiveIndex: 1.333});
glass.setOptics({thickness: 10, gap: 2}); // Patch the current optical configuration.
glass.setOptics(null); // Restore artistic recipes.
```

## What an index determines

The smooth-interface solver accepts incident direction, normal, and the refractive indices on both sides. It calculates a transmitted direction with Snell's law, reflected direction, s/p Fresnel reflectance, and total internal reflection. Equal indices give the identity, including grazing incidence. Vectors are normalized; the normal must face the incident medium. Indices must be finite and positive and their ratio numerically representable.

```js
import {interfaceRay} from '@areoform/felt-glass/optics';
const ray = interfaceRay([0.6, 0, -0.8], [0, 0, 1], 1, 1.52);
// ray.transmitted is null under total internal reflection.
```

A single real index describes a smooth, isotropic, nonabsorbing dielectric at one wavelength. It does not determine color, dispersion, absorption, roughness, surface shape, or lighting. These are not guessed from the number. Metals, anisotropic media and diffraction need other models. See [PBRT's derivation of Snell's law and Fresnel reflection](https://pbr-book.org/4ed/Reflection_Models/Specular_Reflection_and_Transmission).

## Default pane geometry

Browser rendering needs a geometry in addition to the material. The default is an orthographic view of a manufactured **rounded cap with a planar underside**, not a wetting-equilibrium droplet or an arbitrarily stretched sphere.

`optics` accepts:

| Field | Default | Meaning |
|---|---|---|
| `refractiveIndex` | `1.52` | Pane's absolute real refractive index. |
| `surroundingIndex` | `1` | Medium above and below the pane. |
| `thickness` | `6` | Height at the centre, in CSS pixels; > 0 and <= 512. |
| `gap` | `0` | Distance from the underside to the document plane, in CSS pixels; 0–4096. |

Width, height and a single circular corner radius come from the element. Percent radii, unequal corner radii, elliptical radii and transformed geometry are not faithfully modeled; use a uniform pixel radius and an untransformed pane. Call `refresh()` after a CSS radius change that does not change size. Device pixel ratio does not change this model's CSS-pixel coordinate system.

For half-widths `a = w/2-r`, `b = h/2-r`, let `qx = max(abs(x)-a,0)/r`, `qy = max(abs(y)-b,0)/r`. The top is `z = thickness * sqrt(1-qx²-qy²)`. It is flat over the central rectangle, elliptical over the edge bands and ellipsoidal at corners. A zero radius is a flat rectangular slab. The exact top normal drives refraction; thickness is not another bend-strength multiplier.

Each camera ray enters the cap, travels to the underside and refracts toward the document plane. The cap is convex, so a segment ending within the underside remains inside. A ray that leaves elsewhere, reflects internally or cannot reach that plane contributes zero direct transmission. We do not silently send it to an invented source coordinate. The direct branch's transmitted s/p powers are tracked separately and averaged. The matching exterior media make the radiance-index factors cancel along this complete path.

The optional optical map is shared between refracted and frosted finishes. In this mode, recipe `bend`, `rim`, `displacement` and refractive `roughness` do not alter physical rays. Recipe blur, saturation, CSS grain and etched footprints remain independent appearance approximations. An index does not select a frost treatment. A correlated rough-surface scattering model is future work.

## Generate once, reuse while the surface is unchanged

No scroll handler or animation loop generates maps. The key includes map dimensions, radius and the normalized optical configuration. Each live surface retains its latest map even when the controller's four-entry shared cache evicts it. Explicit refresh, visibility recovery and finish-only changes reuse identical maps. Resize and optical changes generate a new map; changing back can reuse a cached map. Destroy releases the controller's map references. Reloading creates a new controller; cross-session disk caching is not implemented.

The optical baker currently uses cooperative JavaScript batches. It does not pretend the existing artistic WASM/WebGPU programs implement Snell's law. Their independent implementations still serve artistic recipes. A matched numerical WASM/GPU implementation can be added without changing the material API. At most two jobs run and 32 wait per controller; all maps remain bounded to 300,000 pixels and 4096 pixels per dimension. The float scratch map uses 12 bytes per pixel and the encoded image 4, before browser encoding/compositing overhead. Device performance and battery use have not been benchmarked.

## Browser adapter and graceful fallback

R/G encode inverse source displacement; B encodes direct transmission. An SVG filter displaces the live backdrop, extracts B into an alpha mask and applies transmission using linear-light compositing. This does not render Fresnel-reflected scene images; reflected/TIR energy is absent from the direct branch and the host's CSS surface remains beneath it. Controls remain real, undistorted HTML.

The 8-bit adapter chooses its displacement scale automatically and reports a rounding-error bound. It refuses displacements above 127.5 CSS pixels per axis, guaranteeing at most 0.5 CSS pixel rounding error before browser interpolation. Such a failure retains CSS frost rather than clipping a ray or allocating an unbounded filter. `state.surfaces[i].opticsError` explains the failure; changing optical inputs retries. `state.surfaces[i].optics` reports ray counts, displacement and quantization error for a successfully displayed map. The transmission mask has 8-bit precision too.

This is direct geometric transmission through one smooth cap. It omits internal bounce images, external environmental reflection, spatially varying rough scattering, diffraction, spectral splitting and caustic illumination of surrounding objects. The default zero source gap avoids a large magnifying separation. Physical parameters remain distinct from the renderer's documented approximations.

SVG failure retains CSS frost, then translucency, then solid surfaces as capabilities require. Forced colors and automatic reduced-transparency behavior still apply. A non-Snell fallback is reported as CSS; it is not advertised as equivalent physics.

## Validation

`npm test` covers the existing backends plus analytic Snell/Fresnel limits, reciprocity, an independent reference sweep, matched-media identity, flat-slab identity, rounded-cap symmetry, map decoding error, resource bounds, cooperative equivalence and cancellation. `npm run test:optics` runs browser integration with the same isolated CDP setup as the existing browser suites. See [VALIDATION.md](VALIDATION.md) for actually run checks and platform limits.
