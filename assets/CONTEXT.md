# assets — source artwork (factory)

One job: hold the source art the site is built from. Committed, never
deployed. The site never reads from here directly.

## Contents

- `pixel_wink_24x24.svg` — Madrid's pixel-art wink (inlined into both
  pages' taglines).
- `thumbnails/` — grayscale product illustrations (PNG masters + web-ready
  WebP + README).
- `favicon/` — favicon concept files; the final `favicon.ico` ships in
  `../public/`.

## Pipeline

Art source → web-ready copy → deployed location:

- `thumbnails/*.webp` → `../public/thumbs/`
- `pixel_wink_24x24.svg` → inlined in `../public/index.html` +
  `../public/checkout.html` taglines
- `favicon/favicon.ico` (final) → `../public/favicon.ico` + `<link>` tags
  in the pages

## Human check

After replacing art: re-copy to the deployed location and reload the page.
