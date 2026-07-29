# Excerpt Deck Builder

Collect orchestral excerpt material on a phone or tablet and turn each project into one slide deck
that opens in Keynote — every slide of an excerpt carries the video, the first slide shows the part
score, the following slides show the full score two pages at a time.

Self-contained subproject: plain HTML/CSS/vanilla JS front end (`web/`), optional Node worker
(`worker/`). Nothing here touches the rest of the site.

## Two ways to run it

| Excerpt video source | What you need | Trim |
| --- | --- | --- |
| **Uploaded video** (Photos / Files / camera) | just `web/` — the deck is built in the browser | clip window shown on the slide, poster frame at the start time |
| **YouTube link** | `web/` **and** the local worker (`yt-dlp`, `ffmpeg`, `poppler`) | exact, re-encoded by ffmpeg |

A project may mix both; the worker is only contacted when an excerpt needs it. Uploaded-video
projects work with no network at all once the page has loaded.

Output is `.pptx`, which Keynote opens directly (`File ▸ Open`, then `Save As` if you want a `.key`).
Native `.key` export is not implemented — the format is closed — so the export screen lists it as
coming soon; it would be added as an asset bundle plus an AppleScript that drives Keynote on a Mac.

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
npm install
npm start                       # http://localhost:8787
```

The worker URL is set on the export screen (default `http://localhost:8787`) and remembered.
Downloading from YouTube is against YouTube's terms of service; run it locally on material you have
the rights to.

## Tests

```bash
cd excerpt-deck/worker
npm install
npm test
```

Covers the layout rules (slide counts, 2-up grouping, landscape pages, aspect-preserving fit, plan
reconciliation) and an end-to-end worker run on a generated 3-page PDF and a 6-second clip,
asserting the composed `.pptx` has one slide per planned slide and consistent media relationships.
The end-to-end test skips itself when `ffmpeg`/`pdftoppm` are missing.

## How it works

1. **Excerpt editor** — video source, start/end timestamps (typed or grabbed from the player), part
   score and full score. `pdf.js` reads page count and page sizes as soon as a file is picked.
2. **`slide-plan.js`** turns the project into an explicit `SlidePlan`: every image and video box is
   stored as a fraction of the slide. Rules: one slide for the part score (multi-page PDFs are tiled
   onto it), then the full score two portrait pages per slide (landscape pages get their own slide),
   with the video as a small box at the bottom-left of every slide of that excerpt.
3. **Storyboard** renders the plan at true 16:9 and lets it be adjusted — drag/resize the video box,
   apply that box to the excerpt or the whole deck, edit or hide titles, swap/rotate pages, split a
   2-up slide, reorder, duplicate, delete, or regenerate from the rules. Edits are autosaved and
   survive adding excerpts or replacing PDFs.
4. **Export** runs `deck-pptx.js` — the same module in the browser and in the worker — over that
   plan, so the deck matches the preview. `pptx-dedupe.js` then collapses the repeated video copies
   pptxgenjs writes per slide into one, which is what keeps deck size sane.

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
  export-local.js  offline export path
  export-worker.js worker export path
worker
  server.js        POST /jobs, GET /jobs/:id, GET /jobs/:id/download, GET /health
  pipeline/        yt-dlp download, ffmpeg trim, pdftoppm rasterise
```

## Known limits

- Offline export cannot trim: the browser has no ffmpeg, so the uploaded file is embedded whole and
  the clip window is printed under the video. Use the worker (or trim before uploading) when the
  deck must contain only the excerpt. Exact in-browser trimming via WebCodecs is the obvious next
  step.
- Keynote re-encodes media on import; check the deck once before rehearsal.
- Everything is device-local — there is no sync between your phone and your Mac yet.
