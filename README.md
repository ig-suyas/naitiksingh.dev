# naitiksingh.dev

Single-page portfolio and landing site for Naitik Singh, freelance backend and full-stack developer.

Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies. Terminal-style look: near-black with a phosphor-green accent, monospace headings, and an animated hex/binary glyph field in the hero that reacts to the cursor. Dark theme by default with a light-mode toggle, fade-in on scroll, and support for `prefers-reduced-motion`.

## Structure

```
index.html            Page markup, meta tags, Open Graph / Twitter cards, JSON-LD
assets/styles.css     All styles (design tokens at the top, light theme overrides below)
assets/main.js        Theme toggle, scroll reveal, copy-email button, hover scramble, hero glyph canvas
favicon.svg / .ico    ">_" terminal prompt mark
apple-touch-icon.png  180x180 home screen icon
og-image.png          1200x630 social preview image
robots.txt            Crawler rules + sitemap location
sitemap.xml           Sitemap
vercel.json           Clean URLs, security headers, asset caching
```

## Run locally

Any static file server works. Serve the project root (root-relative paths like `/assets/...` need a server, so opening `index.html` directly from disk won't load the styles).

```bash
npx serve .
```

or, with Python:

```bash
python -m http.server 4173
```

Then open http://localhost:3000 (serve) or http://localhost:4173 (Python).

## Deploy to Vercel

**From the dashboard**

1. Push this repo to GitHub.
2. In Vercel, click **Add New > Project** and import the repo.
3. Framework preset: **Other**. Leave the build command and output directory empty.
4. Click **Deploy**.

**From the CLI**

```bash
npm i -g vercel
vercel        # preview deployment
vercel --prod # production deployment
```

### Custom domain

The canonical URL, Open Graph URLs, `robots.txt` and `sitemap.xml` all assume the site lives at `https://naitiksingh.dev`. If you deploy to a different domain, search and replace `https://naitiksingh.dev` across `index.html`, `robots.txt` and `sitemap.xml`.

## Editing

- **Colors:** change the tokens at the top of `assets/styles.css` (`:root` for dark, `:root[data-theme="light"]` for light). There is one accent color, `--accent`. The hero canvas reads `--glyph` and `--glyph-hot`.
- **Fonts:** JetBrains Mono (headings, UI) and Geist (body), loaded from Google Fonts in `index.html`. If you change fonts, update the metric-matched fallbacks (`Mono Fallback`, `Geist Fallback`) at the top of the stylesheet, or just remove them.
- **Projects:** add another `<li class="work__item">` in the Selected work section.
- **Social image:** `og-image.png` is a static image. Replace it with any 1200x630 PNG.
