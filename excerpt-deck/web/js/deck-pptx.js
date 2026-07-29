/**
 * Composes the .pptx from a SlidePlan. Runs unchanged in the browser (offline export) and in
 * the worker (YouTube export) — the PptxGenJS constructor and the assets are injected, so this
 * module has no imports of its own.
 *
 * The plan stores boxes as fractions of the slide; pptxgenjs wants inches.
 */

import { SLIDE_H_IN, SLIDE_W_IN } from './slide-plan.js'

const TITLE_BOX = { x: 0.03, y: 0.015, w: 0.94, h: 0.075 }

function toInches(box) {
  return {
    x: box.x * SLIDE_W_IN,
    y: box.y * SLIDE_H_IN,
    w: box.w * SLIDE_W_IN,
    h: box.h * SLIDE_H_IN,
  }
}

export function imageKey(excerptId, source, page) {
  return `${excerptId}:${source}:${page}`
}

function timeLabel(seconds) {
  if (seconds == null) return ''
  const total = Math.max(0, Math.round(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/**
 * @param {object} options
 * @param {Function} options.PptxGenJS constructor (browser global or node import)
 * @param {Array}    options.plan SlidePlan
 * @param {Map<string,string>} options.images imageKey() -> data URL
 * @param {Map<string,object>} options.videos excerptId -> { dataUrl, posterDataUrl, startSec, endSec, trimmed }
 * @param {string}   options.title deck title
 * @param {'blob'|'nodebuffer'} options.output
 */
export async function composeDeck({ PptxGenJS, plan, images, videos, title = 'Excerpt deck', output = 'blob' }) {
  const pptx = new PptxGenJS()
  // Boxes are laid out in inches of a SLIDE_W_IN x SLIDE_H_IN slide, so the deck must use exactly
  // that; the built-in LAYOUT_16x9 is 10 x 5.625in and would push every shape off the slide.
  pptx.defineLayout({ name: 'EXCERPT_16x9', width: SLIDE_W_IN, height: SLIDE_H_IN })
  pptx.layout = 'EXCERPT_16x9'
  pptx.title = title

  for (const slide of plan) {
    const page = pptx.addSlide()
    page.background = { color: 'FFFFFF' }

    if (slide.showTitle !== false && slide.title) {
      page.addText(slide.title, {
        ...toInches(TITLE_BOX),
        fontSize: 18,
        bold: true,
        color: '222222',
        valign: 'middle',
      })
    }

    for (const image of slide.images || []) {
      const data = images.get(imageKey(slide.excerptId, image.source, image.page))
      if (!data) continue
      page.addImage({ data, ...toInches(image), rotate: image.rotate || 0 })
    }

    const video = slide.video && videos.get(slide.video.excerptId)
    if (!video) continue
    const box = toInches(slide.video)
    page.addMedia({
      type: 'video',
      data: video.dataUrl,
      ...box,
      ...(video.posterDataUrl ? { cover: video.posterDataUrl } : {}),
    })
    if (!video.trimmed && video.startSec != null && video.endSec != null) {
      // Keynote's pptx importer ignores trim marks, so the window is also written on the slide.
      page.addText(`${timeLabel(video.startSec)} – ${timeLabel(video.endSec)}`, {
        x: box.x,
        y: Math.min(box.y + box.h + 0.05, SLIDE_H_IN - 0.35),
        w: box.w,
        h: 0.3,
        fontSize: 11,
        align: 'center',
        color: '555555',
      })
    }
  }

  return pptx.write({ outputType: output })
}
