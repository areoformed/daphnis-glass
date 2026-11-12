# A sessile water drop as the first optical model

12 November 2026. Research and numerical reference for Daphnis Glass. The production component still uses its existing maps; this study is a separate experiment.

Open **standalone.html** directly in a browser. It contains its own generated script and needs no server or dependency. `index.html` plus the two `.mjs` files can instead be served as ordinary static files. Rebuild the standalone with `python3 build.py`; verify the reference with `node verify.mjs`.

## Physical setup

Start with an isolated, resting, axisymmetric drop on a flat, smooth, transparent support. Specify liquid volume V and the contact angle θ measured through the water. The first geometry ignores gravity in the shape solution, while reporting dimensionless gravity diagnostics. It includes the full overhanging interface for θ > 90°.

The optical stack is observer/air → water where present → transparent support → air gap → a planar pattern. Default support index 1.52 and thickness 0.2 mm are chosen experimental parameters, not a measured coating. The contact angle describes wetting; it does not replace the material's optical refractive index. A hydrophobic coating can be optically thin; its thickness/scattering are not modeled.

The default study uses V=0.5 µL, θ=110°, support thickness 0.2 mm and pattern gap 0.2 mm. It uses a normal orthographic observer, monochromatic geometry at the chosen wavelength, and an infinite tiled pattern. Changing volume changes real geometry rather than merely scaling a CSS mask. The transmitted preview has a fixed declared physical-to-display scale; the explanatory cross-section is auto-fitted.

## Shape

Young's relation on an ideal smooth, homogeneous surface is

    γ_SV − γ_SL = γ_LV cos θ

Young–Laplace relates the pressure jump to the principal curvatures:

    Δp(z) = γ_LV (1/R₁ + 1/R₂), with hydrostatic pressure varying with height.

For the small-drop, gravity-free limit, curvature is constant and the axisymmetric solution is a spherical cap. A useful early treatment handles angles on either side of 90°: [O'Brien and van den Brule (1991)](https://doi.org/10.1039/FT9918701579). [van der Heijden et al. (2018)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6193248/) supplies a later volume/contact-angle treatment with relaxation and pinning; those dynamics are beyond this first static study.

Choose support at z=0 and water above it. Let c=cos θ:

    R = [3V / (π(2 − 3c + c³))]^(1/3)
    h = R(1 − c)
    a = R sin θ
    z_c = −R cos θ

    water = {(x,y,z): x²+y²+(z−z_c)² ≤ R² and z ≥ 0}

Here R is curvature radius, h is apex height, a is the contact radius, and z_c is the sphere center. All code lengths are millimetres; one µL is one mm³. The meridional interface is conveniently parameterized as x=R sin u, z=z_c+R cos u, for −θ ≤ u ≤ θ.

For θ>90° the projected radius is R, larger than a. Modeling only a dome z=f(x,y) clipped to r≤a would erase the overhang. The ray tracer instead intersects the clipped sphere and its base explicitly. It can encounter the curved underside, not just the upper branch.

Capillary length is ℓ_c=sqrt(γ/(Δρg)). Nominal near-room-temperature values γ=0.0728 N/m and Δρ≈998.207 kg/m³ give ℓ_c≈2.727 mm. The [IAPWS surface-tension release](https://iapws.org/technical-guidance/release/Surf-H2O) is the authoritative formulation; the current program uses the stated approximate constant, not a full temperature solver. We report Bo_a=(a/ℓ_c)² and Bo_h=(h/ℓ_c)². An orange caution when either exceeds 0.1 is an engineering marker, not a derived error bound. The shape is not secretly changed to an ellipsoid. A gravity-aware Young–Laplace boundary-value solver is the next geometry tier.

## Refraction, reflection and dispersion

The drop and support are intersected analytically. Backward rays start vertically above the droplet. At each boundary apply vector Snell refraction. With unit incident direction I and unit normal N pointing into the incident medium:

    η = n₁/n₂
    c_i = −I·N
    k = 1 − η²(1−c_i²)
    T = ηI + (ηc_i − sqrt(k))N

If k<0, no propagating transmitted ray exists: reflect the ray with I−2(I·N)N and retain its medium. Otherwise use T and enter the new medium. Trace the nearest valid curved/planar event until the source is reached, the ray escapes, or the event budget is exhausted.

Fresnel s/p power coefficients weight each interface separately. The dominant transmitted path is composited; TIR is followed. Meridional s and p powers remain separate across the stack so polarization is not incorrectly reset to unpolarized at every boundary. Start and source media are air, so radiance-index factors telescope away for completed paths. The preview excludes partial-reflection environment branches; hatched pixels flag paths without a source sample rather than inventing a page coordinate.

Water dispersion is computed from **IAPWS R9-97 Eq.1 / Table1**, at fixed 293.15 K and nominal density 998.207 kg/m³. Wavelength is variable. The code implements the release's Lorentz–Lorenz expression and constants, with attribution to [IAPWS](https://iapws.org/technical-guidance/release/Rindex). [Harvey/NIST (2024)](https://www.nist.gov/publications/index-refraction-liquid-water) describes refractive-index tabulation from that formulation. Air is approximated as n=1, and substrate dispersion is omitted. The colored rainbow paths identify three wavelengths rather than reproduce human spectral colorimetry.

## A bridge to the droplet-lens literature

[Kilbride, Fagg, Ouali and Fairhurst (2023), Physical Review Applied 19, 044030](https://doi.org/10.1103/PhysRevApplied.19.044030), develops and experimentally tests a pattern-distortion method linking droplet shape and magnification through the full air/substrate/liquid stack. [Author postprint](https://irep.ntu.ac.uk/id/eprint/48753/1/1750800_Fairhurst.pdf). This is the closest match to our page-under-a-drop question. Their paraxial transfer-matrix approach provides a useful limiting check; it does not supply a complete sharp-edge raster renderer.

For our orthographic backward map and air on both ends, a small radial camera coordinate r maps to source coordinate q≈Jr:

    J = 1 − (n_w−1)/R · (h/n_w + t_s/n_s + d)
    local signed magnification = 1/J

Here t_s and n_s are support thickness and index, and d is the air gap below it. This is our derived central-ray limit, consistent with the transfer-matrix result after curvature-sign conventions are matched. It is checked against independently traced rays. The full nonlinear mapping is used away from the center; no thin-lens formula is imposed on the rim. A zero J is a geometrical singularity, not infinite physical resolving power.

A later, supplementary [2025 preprint on droplet magnification and angular resolution](https://arxiv.org/abs/2502.13237) also combines shape calculations and ray tracing. Its optical approximations are not adopted as the numerical authority here.

## The supplied images and the rainbow check

The PTFE collage is useful qualitative evidence of differing wetting shapes. Its publication provenance, volumes and contact angles were not supplied. The scale bars and drop sizes vary. The preset angle buttons therefore do not claim to reproduce particular panels or convert PTFE percentage into contact angle. Rough/textured substrates may involve Cassie–Baxter or Wenzel states, hysteresis and pinning, which a single ideal contact angle does not resolve. The numerical study takes the specified apparent angle as a boundary input.

The other two images depict the one-internal-reflection family for a free spherical drop. They are a valuable diagnostic of the shared optical machinery. For external incidence i and internal refraction r:

    sin i = n sin r          (air index approximated as 1)
    D = π + 2i − 4r          (deflection from incident direction)
    φ = π − D = 4r − 2i      (angle from the backward direction)

Thus the user's φ expression and the usual deviation expression describe different angle conventions, not conflicting physics. The study traces entry → one partial internal reflection → exit and numerically verifies the relation. A stationary rainbow has sin²i=(4−n²)/3. For n=4/3 this produces φ≈42.029°. At that ray, internal r is below the critical angle; this reflection is **partial**, not total internal reflection. [Simon Fraser University's physical demonstration](https://www.sfu.ca/physics/demos/demos-experiments/rainbow-burnaby.html) shows the one-reflection branch and leakage at reflection; the equations and stationary-angle check are derived here from Snell and reflection geometry.

The rainbow diagnostic is explicitly a free sphere. A supported sessile drop can intercept that path at its base. We do not paste a free-drop rainbow onto every UI lens or assume all colors reach every observer. Reflection lighting needs an environment, illumination and viewing geometry; transmitted chromatic aberration and a primary rainbow are distinct ray families.

## Verification and next steps

`verify.mjs` tests independent cap-volume reconstruction, a known hemisphere, overhang geometry, IAPWS reference values/limits, Snell conservation, Fresnel normal incidence, TIR, equal-index identity, symmetric rays, finite paths, central ray-map vs paraxial limits, and the traced rainbow relation/stationary angle. These are numerical/physical checks, not experimental validation or rendering performance claims.

The browser study uses a bounded 1,025-ray radial lookup because the reference geometry is axisymmetric. A radial lookup cannot be stretched into a physically correct rounded toolbar. The next work is a gravity-aware or footprint-pinned capillary shape, then a chosen noncircular boundary problem, followed by a shared WASM implementation checked against this reference. Partial-reflection branches, finite pupil/blur, spectral image formation, wave effects near caustics, roughness/frost and measured visual calibration are separate additions.

Code is an original implementation under the repository's MIT license. Papers, reference images and standards retain their own rights; no supplied images or paper figures are redistributed in this directory.
