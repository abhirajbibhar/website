# Quartz ported for general markdown

Host your second brain and [digital garden](https://jzhao.xyz/posts/networked-thought) for free. Quartz features

1. Extremely fast full-text search by pressing `Ctrl` + `/`
2. Customizable and hackable design based on Hugo
3. Automatically generated backlinks, link previews, and local graph
4. Built-in CJK + Latex Support
5. Support for both Markdown Links and Wikilinks [^1]

> “[One] who works with the door open gets all kinds of interruptions, but [they] also occasionally gets clues as to what the world is and what might be important.” — Richard Hamming

🔗 Get Started with latest Quartz: https://quartz.jzhao.xyz/

## Self-hosted third-party JS

No third-party script, stylesheet, or font is loaded from a CDN. Everything lives flat in
`assets/vendor/` — one file per dependency, no package or version subdirectories — and is
resolved by a single registry partial, `layouts/partials/lib/vendor.html`, which the
layouts pull in with `partialCached "lib/vendor.html" .`. No template hardcodes a path,
so upgrading a package means replacing one file and updating one line in that partial.

| Package | Version | File(s) | Used by |
| --- | --- | --- | --- |
| [d3](https://d3js.org/) | 6.7.0 | `d3-subset.min.js` (generated subset — see [tools/d3-subset](tools/d3-subset)) | `layouts/partials/graph.html` → `assets/js/graph.js` |
| [@floating-ui/core](https://floating-ui.com/) | 0.7.3 | `floating-ui.core.umd.min.js` | `layouts/partials/head.html` → `assets/js/popover.js` |
| [@floating-ui/dom](https://floating-ui.com/) | 0.5.4 | `floating-ui.dom.umd.min.js` | `layouts/partials/head.html` → `assets/js/popover.js` |
| [katex](https://katex.org/) | 0.15.1 | **not vendored** — see [Restoring katex](#restoring-katex) | `layouts/partials/katex.html` |
| [flexsearch](https://github.com/nextapps-de/flexsearch) | 0.7.21 | `flexsearch.bundle.js` | `layouts/partials/search.html` → `assets/js/full-text-search.js` |
| [million](https://million.dev/) | 1.11.5 | `million-router.mjs`, `million-render.mjs`, `million-morph.mjs` | `assets/js/router.js` (SPA routing) |

What the registry does to that source:

- **Fingerprints** every script and stylesheet. This is not cosmetic here:
  `static/_headers` marks `/*.js` and `/*.css` immutable for a year, so any unhashed
  file would be cached in visitors' browsers until it is renamed.
- **Concatenates** floating-ui core + dom, and katex + auto-render, into one request
  each — both pairs are only ever loaded together.
- **Rewrites relative ESM imports** in million's router. Flattening would otherwise
  break it: the chunks import each other by relative path, so each file is rebuilt with
  its imports pointed at the fingerprinted URLs (`million-render.mjs` first, then
  `million-morph.mjs`, then `million-router.mjs`).
- **Publishes katex's fonts** alongside the fingerprinted stylesheet, because
  `katex.min.css` reaches them with relative `url(fonts/…)`. That is the one dependency
  whose files cannot sit directly in `vendor/` — they go in `vendor/fonts/`. Only
  `.woff2` ships; the `.woff`/`.ttf` fallbacks (pre-2016 browsers) are not included.
- **Leaves upstream code unminified** — every one of these files is already minified,
  with one exception: the d3 subset below is built from source.
- **Leaves katex out of the repo entirely.** `enableLatex` is `false` in
  `data/config.yaml` and this site writes no math, so rather than vendor 0.15 MB of JS
  and 0.3 MB of fonts that were never used, the files are absent. Nothing to process,
  nothing to publish. [Restore them](#restoring-katex) before turning the flag back on —
  the registry stops the build with a pointer here if you forget.

Floating UI's DOM bundle reads the `FloatingUICore` global, so core must be loaded
before dom. That order is baked into the concatenation in the registry.

### The d3 subset

`assets/vendor/d3-subset.min.js` is built locally, not downloaded: full d3 is 270 KB raw /
88 KB gzipped, while `assets/js/graph.js` only uses selection, transition, drag, zoom and
force. Trimming it to those modules costs **62 KB raw / 21 KB gzipped**.

The module versions installed match d3 6.7.0's own dependency ranges, so behaviour is
identical. `tools/d3-subset/` holds the recipe. To regenerate after editing `graph.js`:

```bash
cd tools/d3-subset
npm install --no-save d3-selection@2 d3-transition@2 d3-drag@2 d3-zoom@2 d3-force@2 esbuild jsdom
npx --no-install esbuild entry.js --bundle --minify --format=iife --global-name=d3 \
  --target=es2015 --outfile=../../assets/vendor/d3-subset.min.js
node test-graph.js          # runs graph.js against the bundle in a real DOM
```

If you add a d3 call to `graph.js`, add its module to `tools/d3-subset/entry.js` first,
otherwise the trimmed bundle will be missing it. `test-graph.js` catches that — it drives
`drawGraph()` in jsdom and asserts the nodes, links, labels and legend come out.

### Restoring katex

`enableLatex` is `false` in `data/config.yaml`, and the katex files are not in the repo:
0.15 MB of JS plus 0.3 MB of fonts that a site with no formulas never loaded. To bring
math back, restore the files first and then flip the flag:

```bash
cd assets/vendor
mkdir -p fonts
curl -fsSL -o katex.min.js       https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/katex.min.js
curl -fsSL -o auto-render.min.js https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/contrib/auto-render.min.js
curl -fsSL -o katex.min.css      https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/katex.min.css
curl -sSL "https://data.jsdelivr.com/v1/packages/npm/katex@0.15.1" \
  | grep -o '"name": "KaTeX_[A-Za-z0-9_.-]*\.woff2"' | sed 's/"name": "//;s/"$//' \
  | while read -r f; do
      curl -fsSL -o "fonts/$f" "https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/fonts/$f"
    done
```

Then set `enableLatex: true`. The registry picks the files up automatically. The three
files go directly in `vendor/`; the fonts go in `vendor/fonts/` because the stylesheet
reaches them with a relative `url(fonts/…)`, which is also why publishing them is what
keeps that working.

### Upgrading a package

Overwrite the file in place and point the registry at it:

```bash
curl -fsSL -o assets/vendor/flexsearch.bundle.js \
  https://cdn.jsdelivr.net/npm/flexsearch@0.7.43/dist/flexsearch.bundle.js
```

Two of these are deliberately held back from their latest release, because each needs
application changes to move:

- **flexsearch** — 0.8 reworked the configuration API that `assets/js/full-text-search.js`
  is written against; 0.7.43 is the latest on the current API.
- **million** — 3.x restructured routing, while `assets/js/router.js` targets the 1.x
  router; 1.12.5 is the latest on that API.

The d3 subset is generated rather than downloaded, so it is not part of a curl upgrade —
see [The d3 subset](#the-d3-subset) above.

[^1]: It depends on how hugo render it