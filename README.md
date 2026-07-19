# jonathanhe008.github.io

Personal site for Jonathan He. Jekyll + GitHub Pages, custom domain `hejonathan.com`.

Design register: **deep navy + warm gold** — private-club × library × luxury-hotel.
Structural pattern-language borrowed from Brittany Chiang's v4 (numbered
sections, fixed side rails, tabbed jobs, alternating projects, first-visit
loader). Identity — palette, typography, portrait, signature, and the
security-themed micro-interaction system (padlock unlock, seal break, scanner
reticle, signature stroke-draw) — is jhez's own.

## Local preview

Local Ruby needs to be recent enough for the pinned Jekyll (Ruby ≥ 2.7).

```bash
bundle install
bundle exec jekyll serve --livereload
# http://localhost:4000
```

## Editing content

Content lives in a small number of predictable places. Everything else is
frame and interactions.

| What to change | Where |
|---|---|
| Bio / About paragraphs | `_layouts/home.html`, §01 |
| Job bullets, dates, titles | `_layouts/home.html`, §02 (three `include job-tab.html` blocks) |
| Blog posts | `_posts/*.md` (one file per post) |
| GPA / honors / school meta | `_layouts/home.html`, §04 |
| Contact copy | `_layouts/home.html`, §05 |

## Pushing to production

```bash
cd site/
git status
git log -1
git remote add production git@github.com:jonathanhe008/jonathanhe008.github.io.git   # once
git push production HEAD:main
```

GitHub Pages rebuilds within ~60s.

## What jhez fills in later

Two human-in-the-loop items:

1. **Selected Work projects.** Uncomment the §03 block in `_layouts/home.html`
   and populate the two `include project-card.html` calls with real titles,
   descriptions, tech, and links. Drop images into `assets/img/`.
2. **Second (and beyond) blog posts.** Drop into `_posts/YYYY-MM-DD-slug.md`.
   Front-matter needs `title` and `date` at minimum; `description` powers the
   post-card excerpt and the writing archive.

Amazon and UIUC render as the real brand PNGs at `assets/amazon.png` and
`assets/uiuc.png`, tinted to warm cream via `filter: brightness(0) invert(1)`
so they sit on the navy palette cleanly. Swap the source files if you want a
different mark; keep the transparent-PNG format and the filter will handle
the recoloring.

## Fonts

Three self-hosted variable fonts under `assets/fonts/` (Latin subset only,
`unicode-range: U+0000-024F, U+2010-2027`). No runtime CDN, no Google-Fonts
hotlink. Full stack has system fallbacks (Iowan Old Style / -apple-system /
SF Mono) so a missing woff2 degrades to a readable state. The handwritten
"Jonathan" signature is a scanned GIF at `assets/signature.gif`, not a font.

To re-fetch (Google returns TTF unless the User-Agent looks like a modern
browser — the Chrome UA below gets you woff2):

```bash
mkdir -p site/assets/fonts
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Newsreader (variable, opsz + wght)
curl -sL -A "$UA" \
  "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,200..800&display=swap" \
  | grep -oE "https://[^)]*\.woff2" | head -1 \
  | xargs -I {} curl -sL {} -o site/assets/fonts/Newsreader.woff2

# Inter
curl -sL -A "$UA" \
  "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" \
  | grep -oE "https://[^)]*\.woff2" | head -1 \
  | xargs -I {} curl -sL {} -o site/assets/fonts/Inter.woff2

# JetBrains Mono
curl -sL -A "$UA" \
  "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" \
  | grep -oE "https://[^)]*\.woff2" | head -1 \
  | xargs -I {} curl -sL {} -o site/assets/fonts/JetBrainsMono.woff2
```

## Micro-interaction system

Every animated interaction in the site draws from one vocabulary:

| Verb | Motif | Where it appears |
|---|---|---|
| **Unlock** | Padlock shackle lifts + rotates | Section-heading numbers, post cards, §07 CTA, topnav Résumé |
| **Seal** | Wax-seal ring embosses / cracks | Loader, project cards, education |
| **Sign** | Hairline stroke draws itself in | Monogram, section-heading underline |
| **Verify** | Hairline ring pulses outward | Sidebar icons (scan-line sweep on the portraits) |
| **Grant** | Content resolves cleanly | GPA count-up on Education, tab panel cross-fade |

Locked constants: curve `cubic-bezier(0.16, 1, 0.3, 1)`, timings ∈ {200, 400,
500, 800}ms, stroke 1.5px warm gold `#D4A857`. Every interaction respects
`prefers-reduced-motion: reduce` and touch (`(pointer: coarse)`).

## Credits

Structural inspiration — the numbered sections with trailing rules, fixed
vertical side rails with terminating hairlines, tabbed job history,
alternating featured-project layout, and the first-visit loader animation —
comes from Brittany Chiang's v4 portfolio (<https://github.com/bchiang7/v4>,
MIT-licensed). No CSS or HTML was copied; all implementation is original
Jekyll + vanilla ES + custom SCSS.

The palette (navy + warm gold), typography (Newsreader, Inter, JetBrains
Mono), hero composition (headshot + handwritten signature), and the
security-themed interaction vocabulary are Jonathan He's own.

<details>
<summary>bchiang7/v4 MIT notice</summary>

```
MIT License

Copyright (c) 2018 Brittany Chiang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
</details>

## Build environment notes

- Jekyll uses its built-in Sass; `assets/css/main.scss` is the compiled entry.
- If you need to smoke-test SCSS locally without Jekyll:
  `npx sass@1.77.8 --load-path=_sass main-copy-with-frontmatter-stripped.scss out.css`.
- ImageMagick v6 uses `convert` (not `magick`) if you're regenerating raster
  assets.
