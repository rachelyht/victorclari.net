/**
 * Turns a project into an explicit SlidePlan: every image and video box is stored as
 * fractions of the slide, so the storyboard preview and the exported .pptx are laid out
 * from the exact same numbers. Pure module — no DOM, no IndexedDB (also run by node tests).
 */

export const SLIDE_W_IN = 13.333
export const SLIDE_H_IN = 7.5
export const SLIDE_ASPECT = SLIDE_W_IN / SLIDE_H_IN

const TITLE = { x: 0.03, y: 0.015, w: 0.94, h: 0.075 }
const MARGIN = 0.025
const GAP = 0.015
const DEFAULT_VIDEO_W = 0.18
const VIDEO_ASPECT = 16 / 9

/** Video box, bottom-left by default, keeping 16:9 in real (inch) proportions. */
export function videoBox(widthFraction = DEFAULT_VIDEO_W, corner = 'bottom-left') {
  const w = widthFraction
  const h = (w * SLIDE_ASPECT) / VIDEO_ASPECT
  const x = corner.endsWith('right') ? 1 - MARGIN - w : MARGIN
  const y = corner.startsWith('top') ? TITLE.y + TITLE.h + GAP : 1 - MARGIN - h
  return { x, y, w, h }
}

/** Region left for score images once title and video are accounted for. */
export function contentBox(video) {
  const top = TITLE.y + TITLE.h + GAP
  const box = { x: MARGIN, y: top, w: 1 - MARGIN * 2, h: 1 - top - MARGIN }
  if (!video) return box
  // Keep clear of whichever side the video sits on, otherwise a right-hand video pushes the
  // score off the slide.
  if (video.x + video.w / 2 > 0.5) {
    return { ...box, w: Math.max(0, video.x - GAP - MARGIN) }
  }
  const left = video.x + video.w + GAP
  return { x: left, y: top, w: Math.max(0, 1 - MARGIN - left), h: 1 - top - MARGIN }
}

/** Largest box with `aspect` (w/h in inches) that fits inside `box` (slide fractions). */
export function fitContain(box, aspect) {
  const boxW = box.w * SLIDE_W_IN
  const boxH = box.h * SLIDE_H_IN
  let w = boxW
  let h = w / aspect
  if (h > boxH) {
    h = boxH
    w = h * aspect
  }
  return {
    x: box.x + (boxW - w) / 2 / SLIDE_W_IN,
    y: box.y + (boxH - h) / 2 / SLIDE_H_IN,
    w: w / SLIDE_W_IN,
    h: h / SLIDE_H_IN,
  }
}

function splitColumns(box, count) {
  const gap = count > 1 ? GAP : 0
  const w = (box.w - gap * (count - 1)) / count
  return Array.from({ length: count }, (_, i) => ({ ...box, x: box.x + i * (w + gap), w }))
}

function splitGrid(box) {
  const cellH = (box.h - GAP) / 2
  return [0, 1].flatMap((row) =>
    splitColumns({ ...box, y: box.y + row * (cellH + GAP), h: cellH }, 2)
  )
}

function pageAspect(ref, pageIndex) {
  const page = ref?.pages?.[pageIndex]
  if (page?.w && page?.h) return page.w / page.h
  return 1 / Math.SQRT2 // A4 portrait
}

function isLandscape(ref, pageIndex) {
  return pageAspect(ref, pageIndex) > 1.05
}

function placeImages(ref, source, pageIndices, box) {
  const boxes =
    pageIndices.length <= 1
      ? [box]
      : pageIndices.length === 2
        ? splitColumns(box, 2)
        : splitGrid(box)
  return pageIndices.slice(0, boxes.length).map((page, i) => ({
    source,
    page,
    rotate: 0,
    ...fitContain(boxes[i], pageAspect(ref, page)),
  }))
}

function pageRangeLabel(pageIndices) {
  if (!pageIndices.length) return ''
  const first = pageIndices[0] + 1
  const last = pageIndices[pageIndices.length - 1] + 1
  return first === last ? `p. ${first}` : `p. ${first}–${last}`
}

/** Groups full-score pages into slides: 2-up for portrait pages, 1-up for landscape ones. */
export function groupFullScorePages(ref) {
  const total = ref?.pageCount || 0
  const groups = []
  let index = 0
  while (index < total) {
    if (isLandscape(ref, index) || index === total - 1) {
      groups.push([index])
      index += 1
    } else if (isLandscape(ref, index + 1)) {
      groups.push([index])
      index += 1
    } else {
      groups.push([index, index + 1])
      index += 2
    }
  }
  return groups
}

function excerptTitle(excerpt, index) {
  return excerpt.title?.trim() || `Excerpt ${index + 1}`
}

export function buildExcerptSlides(excerpt, index) {
  const video = videoBox(excerpt.videoWidth ?? DEFAULT_VIDEO_W, excerpt.videoCorner ?? 'bottom-left')
  const box = contentBox(video)
  const name = excerptTitle(excerpt, index)
  const slides = []

  const partPages = Array.from({ length: Math.min(excerpt.partScore?.pageCount || 1, 4) }, (_, i) => i)
  slides.push({
    id: `${excerpt.id}:part`,
    excerptId: excerpt.id,
    kind: 'part',
    title: name,
    showTitle: true,
    images: excerpt.partScore ? placeImages(excerpt.partScore, 'partScore', partPages, box) : [],
    video: { excerptId: excerpt.id, ...video },
  })

  for (const pages of groupFullScorePages(excerpt.fullScore)) {
    slides.push({
      id: `${excerpt.id}:full:${pages[0]}`,
      excerptId: excerpt.id,
      kind: 'full',
      title: `${name} — full score ${pageRangeLabel(pages)}`,
      showTitle: true,
      images: placeImages(excerpt.fullScore, 'fullScore', pages, box),
      video: { excerptId: excerpt.id, ...video },
    })
  }

  return slides
}

export function buildSlidePlan(project) {
  return project.excerpts.flatMap((excerpt, index) => buildExcerptSlides(excerpt, index))
}

/**
 * Rebuilds the plan from the rules while keeping manual tweaks for slides that still exist,
 * so adding an excerpt or swapping a PDF does not throw away storyboard edits.
 */
export function reconcileSlidePlan(project) {
  const generated = buildSlidePlan(project)
  const previous = new Map((project.slidePlan || []).map((slide) => [slide.id, slide]))
  const generatedIds = new Set(generated.map((slide) => slide.id))
  const merged = generated.map((slide) => {
    const old = previous.get(slide.id)
    if (!old?.edited) return slide
    return { ...slide, ...old, images: old.images ?? slide.images }
  })
  for (const slide of previous.values()) {
    if (slide.manual && !generatedIds.has(slide.id)) merged.push(slide)
  }
  const order = new Map((project.slidePlan || []).map((slide, i) => [slide.id, i]))
  if (project.planEditedAt) {
    merged.sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity))
  }
  return merged
}
