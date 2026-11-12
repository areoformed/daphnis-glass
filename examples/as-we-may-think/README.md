# As We May Think · reading example

A buildless static reading page using Daphnis Glass. It imports `../../glass.js` and `../../glass.css` directly. Serve the repository as static files, or run `npm run demo` from the repository root and open `/examples/as-we-may-think/`.

The example has a single text column, native section links and a continuous sticky reading bar. A gear opens a native details panel with Clear lens, Burred and Quiet presets, material selection, refraction, grain, grain size, blur, tint and etched controls. Unsupported optical controls are disabled; supported choices remain usable. The panel fits the available viewport, closes with Escape and returns keyboard focus to its toggle.

The bar's solid foundation lives in `reading.css`, independently of the shared glass stylesheet and module. Basic surface selection checks transparency and backdrop-blur support; richer optics only activate when the shared stylesheet's CSS marker and module are both available. Missing assets, failed initialization, unsupported effects, reduced-transparency preferences and forced colors all preserve a visible surface. This is progressive enhancement, not a pixel-level rendering test: a browser can accept a filter without painting it correctly. No automatic frame-rate or battery benchmark is performed.

It has no annotation system, iframe, application server, user account, analytics, external fonts or runtime dependencies. The essay remains readable if JavaScript or the glass enhancement is unavailable. Reading controls do not depend on the glass import succeeding.

## Static hosting

Run `npm run build:site` from the repository root. Deploy the **whole generated `site/` directory**, keeping its paths intact. It contains the essay, its two local files, shared component files, the material playground, attribution documents, a root entry page and a real 404 page. Uploading only this example directory omits the shared files referenced two levels above it.

For Cloudflare Pages, use no framework preset, build command `npm run build:site` and output directory `site`. For Workers Static Assets, build first, then configure `assets.directory` to `./site` or deploy with `npx wrangler deploy --assets ./site --name YOUR_WORKER_NAME`. The exporter performs no deployment. See [Pages build settings](https://developers.cloudflare.com/pages/configuration/build-configuration/) and [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/).

The exporter only overwrites its own marked output directory and rejects unknown files or symbolic links there. For source-release validation, keep generated output outside the checkout: `node scripts/build-site.mjs /tmp/daphnis-site`. Generated `site/` is deliberately outside the public source release map.

## Content and attribution

Vannevar Bush, “As We May Think,” *The Atlantic Monthly*, volume 176, number 1, July 1945, pp. 101–108.

The essay's 73 paragraphs and eight numbered sections were transcribed from the scan supplied by areoform. Scan line wrapping and obvious OCR errors were corrected for reading. The publisher's editorial introduction is omitted. This is a reading sample, not a critical edition.

- [Original publication](https://www.theatlantic.com/magazine/archive/1945/07/as-we-may-think/303881/)
- [Original scan](https://web.archive.org/web/20240726075337/https://cdn.theatlantic.com/media/archives/1945/07/176-1/132407932.pdf)

The demo code is covered by the repository's MIT license. The essay is separate content: this example does not claim authorship of it, grant an MIT license to it, or assert that its copyright has expired. Government-work and renewal status have not been established by this project. Attribution records the source; it is not a replacement for any permission required for redistribution.

Public-domain status for a U.S. government work depends on authorship as part of official duties, rather than the author's job title alone. A 1945 publication's date alone also does not establish expiration. See [17 U.S.C. §105](https://www.govinfo.gov/content/pkg/USCODE-2021-title17/html/USCODE-2021-title17-chap1-sec105.htm) and the [Copyright Office's duration circular](https://www.copyright.gov/circs/circ15a.pdf).
