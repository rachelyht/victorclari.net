# Excerpt Deck Builder

Collect orchestral excerpt material on a phone or tablet and turn each project into one slide deck
that opens in Keynote — every slide of an excerpt carries the video, the first slide shows the part
score, the following slides show the full score two pages at a time.

Self-contained subproject: plain HTML/CSS/vanilla JS front end (`web/`), optional Python worker
(`worker/`, FastAPI). Nothing here touches the rest of the site.

## Two ways to run it

| Excerpt video source | What you need | Trim |
| --- | --- | --- |
| **Uploaded video** (Photos / Files / camera) | just `web/` — the deck is built in the browser | clip window shown on the slide, poster frame at the start time |
| **YouTube link** | `web/` **and** the local worker (`yt-dlp`, `ffmpeg`, `poppler`) | exact, re-encoded by ffmpeg |

A project may mix both; the worker is only contacted when an excerpt needs it. Uploaded-video
projects work with no network at all once the page has loaded.

## Export formats

- **`.pptx`** — a 13.333 × 7.5in (16:9) deck; Keynote opens it directly with `File ▸ Open`.
- **`.key`** — a zip holding that deck plus `Make Keynote.command`. Only Keynote can write the
  `.key` package (undocumented protobuf format), so the helper drives the Keynote on your Mac over
  AppleScript: it opens the deck and saves the `.key` beside it, and falls back to telling you to
  use `File ▸ Save As` if automation is refused. Nothing leaves the machine.

## Run the front end

```bash
cd excerpt-deck/web
python3 -m http.server 8123     # any static server; ES modules need http://, not file://
```

Open `http://localhost:8123`, or put `web/` on any static host. Drafts (including the PDFs and
videos) live in IndexedDB on the device and are autosaved as you type.

## Run the worker (only for YouTube excerpts)

```bash
cd excerpt-deck
docker compose up worker        # ffmpeg + yt-dlp + poppler-utils baked in
```

or natively, with `ffmpeg`, `yt-dlp` and `pdftoppm` on `PATH`:

```bash
cd excerpt-deck/worker
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8787
```

The worker URL is set on the export screen (default `http://localhost:8787`) and remembered.
Downloading from YouTube is against YouTube's terms of service; run it locally on material you have
the rights to.

YouTube answers some requests with “Sign in to confirm you're not a bot”. Point yt-dlp at a
signed-in browser session when that happens:

```bash
YTDLP_COOKIES_FROM_BROWSER=safari uvicorn app.main:app --port 8787   # or chrome / firefox, or YTDLP_COOKIES=cookies.txt
```

## Tests

Browser modules (Node's test runner):

```bash
cd excerpt-deck
npm install
npm test
```

Covers the layout rules (slide counts, 2-up grouping, landscape pages, aspect-preserving fit, plan
reconciliation, splitting a 2-up slide), multi-file scores (page flattening, order, garbage sweep),
the offline deck's geometry (slide size, every shape inside the slide) and the Keynote helper bundle.

Worker (pytest):

```bash
cd excerpt-deck/worker
pip install -r requirements.txt
pytest
```

Covers the composed deck (slide size, shapes inside the slide, the clip stored once for the whole
excerpt, titles and pages on the right slides), rasterising a 12-page PDF in page order, the exact
ffmpeg trim length, the yt-dlp cookie/sign-in handling and download cache, and the job API over
HTTP with a full score split across three image files. Tests needing `ffmpeg`/`pdftoppm` skip
themselves when those are missing.

## How it works

1. **Excerpt editor** — video source, start/end timestamps (typed or grabbed from the player), part
   score and full score. Each score takes **one or more files** (a PDF, or a photo/scan per page):
   files are appended in the order added, can be reordered or removed, and their pages are
   flattened into one page sequence, so the 2-pages-per-slide rule spans files. `pdf.js` reads page
   count and page sizes as soon as a file is picked.
2. **`slide-plan.js`** turns the project into an explicit `SlidePlan`: every image and video box is
   stored as a fraction of the slide. Rules: one slide for the part score (multi-page PDFs are tiled
   onto it), then the full score two portrait pages per slide (landscape pages get their own slide),
   with the video as a small box at the bottom-left of every slide of that excerpt.
3. **Storyboard** renders the plan at true 16:9 and lets it be adjusted — drag/resize the video box,
   apply that box to the excerpt or the whole deck, edit or hide titles, swap/rotate pages, split a
   2-up slide, reorder, duplicate, delete, or regenerate from the rules. Edits are autosaved and
   survive adding excerpts or replacing PDFs.
4. **Export** walks that plan, so the deck matches the preview: in the browser `deck-pptx.js`
   (pptxgenjs) plus `pptx-dedupe.js`, which collapses the video copy pptxgenjs writes per slide;
   in the worker `app/deck.py` (python-pptx), which already stores identical media once.

```
web/js
  db.js            IndexedDB: projects, file blobs, settings
  model.js         project/excerpt schema, validation, YouTube URL parsing
  ui.js            hash routing, views, autosave
  pdf-preview.js   pdf.js rasterising, probing, video poster frames
  slide-plan.js    layout rules -> SlidePlan (pure, unit-tested)
  storyboard.js    slide rendering + per-slide editing gestures
  deck-pptx.js     SlidePlan -> .pptx (shared with the worker)
  pptx-dedupe.js   collapse duplicated media in the finished .pptx
  keynote-bundle.js  .key output: deck + AppleScript helper for Keynote
  export-local.js  offline export path
  export-worker.js worker export path
worker/app
  main.py          FastAPI: GET /health, POST /jobs, GET /jobs/{id}, GET /jobs/{id}/download
  jobs.py          job registry + manifest -> deck pipeline
  media.py         yt-dlp download, ffmpeg trim/poster, pdftoppm rasterise
  deck.py          SlidePlan -> .pptx (python-pptx)
  tools.py         subprocess wrapper, tool detection
```

## Known limits

- Offline export cannot trim: the browser has no ffmpeg, so the uploaded file is embedded whole and
  the clip window is printed under the video. Use the worker (or trim before uploading) when the
  deck must contain only the excerpt. Exact in-browser trimming via WebCodecs is the obvious next
  step.
- Keynote re-encodes media on import; check the deck once before rehearsal. The `.key` helper and
  the deck itself have not been run against a real Keynote from CI — the geometry is verified by
  rendering the exported `.pptx`, the rest needs a Mac.
- Everything is device-local — there is no sync between your phone and your Mac yet.
- iPhone photos taken as HEIC only render in browsers that can decode HEIC (Safari does, desktop
  Chrome does not). Export as JPEG, or use the PDF route, if a page comes out blank.
