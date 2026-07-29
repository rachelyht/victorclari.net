import assert from 'node:assert/strict'
import { test } from 'node:test'

import JSZip from 'jszip'
import PptxGenJS from 'pptxgenjs'

import { composeDeck } from '../../web/js/deck-pptx.js'
import { SLIDE_H_IN, SLIDE_W_IN, buildSlidePlan } from '../../web/js/slide-plan.js'

const EMU_PER_INCH = 914400
// 1x1 white png
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII='

async function deckXml(plan, images) {
  const buffer = await composeDeck({
    PptxGenJS,
    plan,
    images,
    videos: new Map(),
    title: 'Geometry',
    output: 'nodebuffer',
  })
  const zip = await new JSZip().loadAsync(buffer)
  return {
    presentation: await zip.file('ppt/presentation.xml').async('string'),
    slides: await Promise.all(
      Object.keys(zip.files)
        .filter((name) => /ppt\/slides\/slide\d+\.xml$/.test(name))
        .sort()
        .map((name) => zip.file(name).async('string'))
    ),
  }
}

const excerpt = {
  id: 'exc',
  title: 'Mahler 1',
  partScore: { pageCount: 1, pages: [{ w: 1324, h: 808 }] },
  fullScore: { pageCount: 2, pages: [{ w: 1200, h: 1600 }, { w: 1200, h: 1600 }] },
  video: { source: 'upload', startSec: 43, endSec: 104 },
}

test('the deck is the same 16:9 slide the layout is computed against', async () => {
  const plan = buildSlidePlan({ excerpts: [excerpt] })
  const images = new Map(
    plan.flatMap((slide) => slide.images.map((image) => [`${slide.excerptId}:${image.source}:${image.page}`, PNG]))
  )
  const { presentation } = await deckXml(plan, images)
  const size = presentation.match(/<p:sldSz cx="(\d+)" cy="(\d+)"/)
  assert.ok(size, 'presentation.xml declares a slide size')
  assert.equal(Number(size[1]), Math.round(SLIDE_W_IN * EMU_PER_INCH))
  assert.equal(Number(size[2]), Math.round(SLIDE_H_IN * EMU_PER_INCH))
})

test('every shape stays inside the slide', async () => {
  const plan = buildSlidePlan({ excerpts: [excerpt] })
  const images = new Map(
    plan.flatMap((slide) => slide.images.map((image) => [`${slide.excerptId}:${image.source}:${image.page}`, PNG]))
  )
  const { slides } = await deckXml(plan, images)
  assert.equal(slides.length, plan.length)

  for (const [index, xml] of slides.entries()) {
    const boxes = [...xml.matchAll(/<a:off x="(-?\d+)" y="(-?\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"/g)]
      // The shape tree's own chOff/chExt is a 0x0 box, not content.
      .map((match) => match.slice(1, 5).map(Number))
      .filter(([, , cx, cy]) => cx > 0 && cy > 0)
    assert.ok(boxes.length >= 2, `slide ${index + 1} has a title and content`)
    for (const [x, y, cx, cy] of boxes) {
      assert.ok(x >= 0 && y >= 0, `slide ${index + 1} shape starts on the slide`)
      assert.ok(x + cx <= Math.round(SLIDE_W_IN * EMU_PER_INCH) + 1, `slide ${index + 1} shape fits horizontally`)
      assert.ok(y + cy <= Math.round(SLIDE_H_IN * EMU_PER_INCH) + 1, `slide ${index + 1} shape fits vertically`)
    }
  }
})
