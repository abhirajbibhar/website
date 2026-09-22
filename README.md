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
## Lighthouse audit & fixes (2026-09-22)

Run against a local production build (`hugo --gc --minify`) served through a small
Node server that replays `static/_headers` and gzip/brotli, approximating Cloudflare
Pages, using Lighthouse 12 / headless Chrome 141. Every fix below was re-verified with
another Lighthouse run after making it, plus a hand-built torture-test page (broken
links, wikilinks, page-bundle images, `mailto:`/`#anchor`/static-file links, 25+ paginated
posts) to catch issues real content wouldn't trigger.

### Scores, before → after

| Page | Mobile Perf | Mobile A11y | Best Practices | SEO |
| --- | --- | --- | --- | --- |
| `/` | 93 → 97 | 96 → 100 | 100 → 100 | 100 → 100 |
| `/about/` | 90 → 99 | 100 → 100 | 100 → 100 | 100 → 100 |
| `/posts/` | 96 → 97 | 93 → 100 | 100 → 100 | 100 → 100 |
| `/posts/demo-post/` | 93 → 99 | 93 → 100 | 100 → 100 | 100 → 100 |

Desktop was 100/100/100/100 both before and after. Mobile performance has a few points
of run-to-run noise in this sandbox (shared CPU); treat ±3 as within measurement error.
`/notes/` is new (100/100/100/100 mobile) — see "Placeholder content" below.

### Accessibility (color contrast, headings)

- **Dimmed text used `opacity`, not a color.** Dates, the home subtitle, and popover
  captions were `opacity: 0.5–0.7`, which blends the text into whatever sits behind it
  — 2.9:1 in light mode, below WCAG's 4.5:1. **Added a `--muted` CSS variable**
  (`#5f5f5f` light / `#9f9fa0` dark, ~6:1) in `assets/styles/base.scss` and in each of
  the four theme presets in `assets/styles/themes/`, and switched every dimmed-text rule
  to `color: var(--muted)`. A broken wikilink (`.broken`) also gets a dotted underline
  now, since it previously relied on faint color alone to signal "not a real link."
- **Syntax-highlighting colors failed contrast.** 8 of 12 light-theme token colors and
  3 of 12 dark-theme colors were below 4.5:1 against their code-block background
  (as low as 1.1:1 for pale yellow on `#f0f0f0`). Nudged each failing color's lightness
  in `assets/styles/_light_syntax.scss` / `_dark_syntax.scss` until it cleared 4.5:1,
  keeping the original hue.
- **Rose theme's dark mode had drifted** from the others and failed contrast; brought
  its `--secondary` and new `--muted` in line with the same ~5.5:1+ target as the other
  three presets.
- **Heading levels skipped from `<h1>` straight to `<h3>`** on the posts list, the tags
  index, and the footer's "Backlinks"/"Interactive Graph". Introduced a `level` argument
  to `partials/page-list.html` (2 when it sits under a page's own `<h1>`, 3 under an
  `<h2>`) and changed the taxonomy page and footer headings to `<h2>`. Sizes are pinned
  in CSS to what the old tag looked like, so nothing changed visually.
- **The copy-code button had no accessible name** — an icon with no `aria-label`.
  `assets/js/clipboard.js` now sets `aria-label`/`title`, updated to "Copied" /
  "Copy failed" as the button's state changes.
- **Pagination's current-page number was `opacity: 0.2`** (≈1.3:1 — effectively
  invisible). It's now the emphasized item: full-color text, underlined,
  `aria-current="page"` (already present) actually visible to sighted users, not just
  screen readers.
- **Images had no reserved `height`.** `width`/`height` attributes are now set from
  each image's real dimensions (or scaled to an explicit `|N` width) everywhere images
  are rendered, so the browser reserves the right box before the image loads. Caught a
  layout-shift bug this way — see "Bugs" below.
- **404 page dropped a duplicate legacy dark-mode toggle** that had `tabindex="-1"`
  (present but unreachable by keyboard) and no longer serves any purpose next to the
  nav bar's own theme switch.

### Performance

- **Fonts are now WOFF2, not WOFF**, generated from the existing files with `fonttools`
  (`static/et-book/*.woff2`, ~18% smaller; the `.woff` files stay as a fallback for
  ancient browsers via a two-source `src:` list). In an isolated before/after build,
  removing the font preloads alone cut mobile LCP from ~3.0s to ~1.3s — fonts were the
  single largest cost on every page (76% of the home page's weight).
- **Fira Code (36 KB) no longer loads on every page.** It was only used for the "Ctrl /"
  hint inside the closed nav search panel; switched that hint to the system monospace
  stack.
- **The search index build moved out of the critical path.** It used to run for every
  visitor on page load; now it builds lazily, the first time the search box is focused,
  yielding every 25 documents so it can't block input on a large site either.
- **The JSON indices fetch (for search/backlinks/popovers) and the graph's force
  simulation now wait for the page to finish loading** (`requestIdleCallback`, with a
  timeout fallback), instead of starting immediately and competing with fonts, scripts
  and the LCP element for bandwidth and main-thread time.
- **The SPA router's module chain now preloads in parallel.** `router.js` imports
  million's router, which imports two more modules; added `<link rel="modulepreload">`
  for the whole chain instead of letting the browser discover it one hop at a time.
- **The About page portrait** was a single 1088×1446px / 98 KB JPEG shown at
  180–280px. It's now processed into two WebP sizes (`.Fill "360x432"` / `"560x672"`,
  ~8–17 KB) with `srcset`/`sizes`, explicit `width`/`height`, and `fetchpriority="high"`
  since it's the page's LCP element. Source lives at `assets/img/profile.jpeg` (copied
  from the original in `static/img/`, which is left in place since `og:image` and any
  external links point at it).
- The first image render-hook change below (real `width`/`height` everywhere) also
  helps CLS/LCP indirectly, since the browser no longer has to wait for the image to
  arrive to know how much space to reserve.

### Bugs (not Lighthouse-visible, found by hand-testing every link/image path)

- **`mailto:`, `#anchor`, and static-file links (`/img/x.png`, `/files/x.pdf`) rendered
  as `<a>` with no `href` at all** — the old render hook treated anything without an
  `http` prefix as a page reference and looked it up with `GetPage`, which returned
  nothing for these, silently dropping the href (and failing Lighthouse's "links are
  crawlable" audit wherever it happened to trip the check). Rewrote
  `layouts/_default/_markup/render-link.html` to recognize any URL scheme, `#fragment`,
  and non-page file paths as their own cases.
- **`.md` and `%20` handling broke real external links.** The old hook stripped `.md`
  and rewrote `%20`→`-` for *every* link, external or not, so
  `github.com/.../README.md` lost its extension and `.../my%20file.pdf` pointed at a
  file that doesn't exist. External links now pass through untouched.
- **Markdown images got a doubled slash, a stray `width="auto"`, and no alt text.**
  `<img>` src was built as `BaseURL + "/" + path`, producing `.../pages.dev//img/x.png`
  in production; the width fallback wrote the literal invalid value `width="auto"`; and
  `.Text` (which Hugo strips to plain text for `alt`, but the old hook used the raw
  `.Text` which can include markup) was reused for both `alt` and the `|width` split, so
  `![photo|300](x.jpg)` put `"300"` in the alt attribute. Rewrote
  `render-image.html`: alt/width are parsed separately, width is only emitted when
  numeric, and the src resolves relative to the current host (`relURL`) or, for images
  inside a page bundle, via `Page.Resources`.
- **Wikilink images (`![[img.png|300]]`) had the same missing-alt-text problem**, and a
  missing target now becomes a plain unstyled `<span>` (not an `<a>` with no `href`) so
  Lighthouse's "links are crawlable" audit and keyboard/focus behavior both stay
  correct; the build now also logs a `warnf` for each unresolved reference so broken
  links show up while running `hugo`, not after deploying.
- **An explicit `|N` width with no computed height still shifted the layout** on first
  pass at this fix — found by the torture-test page, not Lighthouse's per-page score
  (Lighthouse doesn't run against a page that doesn't exist yet). Both image render
  paths now scale the file's real height to match the requested width.
- **Heading anchor links used `arialabel`** (not a real HTML/ARIA attribute — silently
  ignored by every browser and screen reader) instead of `aria-label`; changed to
  `aria-hidden="true"` instead, since the `#` mark is decorative and the heading text
  itself is already the link's label.
- **List and tag links used `.Permalink`**, which is always the configured production
  `baseURL`. Following a post link on `localhost` or a Cloudflare preview deploy jumped
  you to the live production site. Switched every list/tag/wikilink link to
  `.RelPermalink`.
- **The nav's "Notes" link (`/notes`) 404'd**, and `.gitignore` ignored *any* path named
  `notes` (so `content/notes/` could never be committed even after adding content) while
  its `content\notes` line (Windows-style backslash) matched nothing on a case-sensitive
  filesystem. Both are fixed — see "Placeholder content."
- **The About page's "Writings" link pointed at `/posts/demo-post.md`** (a single post,
  with a literal `.md` in the URL) instead of the writings section; changed to `/posts`.
- **Pressing Enter in an empty search box threw an uncaught error** (it read `.id` off
  a result card that didn't exist yet, sometimes the "No results" card which has no
  `id`). `assets/js/util.js` now checks the card exists and has an `id` first. In the
  same function, a stray `let term` shadowed the module-level `term` that
  `full-text-search.js` sets from the input event, so Enter always navigated to
  `#:~:text=undefined`; removed the shadowing declaration.
- **The posts list paginated before sorting**, so with more than 10 posts the "newest
  first" order was only correct on page 1. `layouts/_default/section.html` now sorts
  first (`.Pages.ByLastmod.Reverse`) and paginates the sorted result.
- **The all-tags page (`/tags/`) looked up each tag's page a second time by title**
  (`GetPage(printf "/tags/%s" .Page.Title)`), which fails for any tag whose display
  title differs from its URL slug — e.g. a "Machine Learning" tag lives at
  `/tags/machine-learning/`, so that lookup returned nothing and the tag's posts were
  silently omitted. `.Page` inside a taxonomy-page loop already *is* that term page, so
  the redundant (and broken) lookup was removed.
- **`localStorage` calls in `darkmode.js` were unguarded.** Some browsers/privacy modes
  throw on both read and write; a throw here broke the theme switch entirely instead of
  just falling back to the OS preference for that page load.
- **A missing link entry in `popover.js`'s contextual-backlink branch threw and aborted
  every other popover on the page** (one bad link took down the rest); added a null
  check, and the whole `initPopover` promise chain now has a `.catch(() => {})` so a
  failed index fetch degrades to "no previews" instead of a page-wide script error.
- `hugo.toml` used the deprecated top-level `paginate = 10` key; moved to
  `[pagination] pagerSize = 10` (Hugo warns but still honors the old key, so this
  wasn't user-visible, just due for cleanup while everything else was being touched).

### Color scheme / CSS variable changes — summary

| Variable | Where | Old | New | Why |
| --- | --- | --- | --- | --- |
| `--muted` (new) | `base.scss` + all 4 theme presets | *(didn't exist — dimming was `opacity`)* | `#5f5f5f` light / `#9f9fa0` dark (± per preset) | Real color for de-emphasised text at ≥4.5:1, replacing opacity-based dimming |
| `--secondary` (dark) | `themes/_scheme-rose.scss` | `#6b879a` | `#8fb3c9` | Failed contrast in the rose preset's dark mode |
| `color-scheme` (new) | `base.scss` `:root` and `[saved-theme="dark"]` | *(unset)* | `light` / `dark` | Lets the browser theme native UI (scrollbars, form controls) to match the site's own toggle |
| Syntax token colors | `_light_syntax.scss` (8 colors), `_dark_syntax.scss` (3 colors) | assorted, several under 2:1 | lightness nudged to clear 4.5:1, same hue | Contrast |

### Top margin unified across pages (2026-09-22)

Every page's first heading now sits the same distance from the top as the home
page's (`index.html`) — 2.5em (`.singlePage`'s padding) + 1em, 63px total at the
default 18px root font-size, measured at both desktop and mobile widths.

Previously this wasn't consistent: the home page and About page are `<header>`
elements and picked up an extra `margin-top: 1em` from a generic `header { }`
rule in `base.scss` written for a legacy, currently-unused component
(`layouts/partials/header.html`, superseded by the nav dock) — while single
posts, the posts list, and the tags pages had no `<header>` wrapper and instead
got `margin-top: 2em` from `article > h1`, a different, unrelated value. The
two only agreed by coincidence at certain widths.

Fixed in `assets/styles/base.scss` and `assets/styles/custom.scss`:
`.home-header` and `.about-hero` now declare `margin: 1em 0 ...` explicitly
(rather than silently inheriting it from that legacy `header` rule), and
`article > h1` — which sets its own `font-size: 2em` — now uses
`margin-top: 1rem` rather than `2em`. That last part matters and is worth
calling out: `1em` was tried first and produced *exactly* the old, wrong 36px
value again, because `em` resolves against the element's own font-size (2em
here), not its parent's; `1rem` always resolves against the root, so it's the
same physical distance as `.home-header`'s `1em` regardless of the h1's own
font-size.

### Placeholder content

- **`content/notes/_index.md`** and **`content/notes/demo-note.md`** — the nav already
  linked to `/notes`, which had no content behind it. Added a short section index and
  one placeholder note explaining it's a placeholder, so the link resolves instead of
  404ing. Replace or delete these along with the `Notes` entry in `hugo.toml`'s
  `[[menu.main]]` list if you don't want the section.
- **`data/config.yaml`: `description`** was still Quartz's own boilerplate ("Host your
  second brain and digital garden for free...") — this is what shows up in search
  results and social-card previews. Replaced with a short description of the actual
  site.
