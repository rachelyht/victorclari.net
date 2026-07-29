import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildSlidePlan, contentBox, reconcileSlidePlan, videoBox } from '../web/js/slide-plan.js'
import { splitSlide } from '../web/js/storyboard.js'

const portrait = { w: 1200, h: 1600 }

const project = () => ({
  excerpts: [
    {
      id: 'exc',
      title: 'Mahler 1',
      partScore: { pageCount: 1, pages: [portrait] },
      fullScore: { pageCount: 2, pages: [portrait, portrait] },
      video: { source: 'upload', startSec: 1, endSec: 4 },
    },
  ],
})

test('the score keeps the slide whichever corner the video is in', () => {
  for (const corner of ['bottom-left', 'top-left', 'bottom-right', 'top-right']) {
    const video = videoBox(0.18, corner)
    const box = contentBox(video)
    assert.ok(box.w > 0.5, `${corner}: content box keeps most of the width (${box.w})`)
    assert.ok(box.x >= 0 && box.x + box.w <= 1.0001, `${corner}: content box stays on the slide`)
    const overlap = Math.min(box.x + box.w, video.x + video.w) - Math.max(box.x, video.x)
    assert.ok(overlap <= 0.0001, `${corner}: content box clears the video (${overlap})`)
  }
})

test('one page per slide splits a 2-up slide and survives reconciliation', () => {
  const state = project()
  state.slidePlan = buildSlidePlan(state)
  const twoUp = state.slidePlan.findIndex((slide) => slide.images.length === 2)
  assert.notEqual(twoUp, -1)

  const plan = splitSlide(state, twoUp)
  assert.equal(plan.length, 3)
  assert.deepEqual(
    plan.map((slide) => slide.images.map((image) => image.page)),
    [[0], [0], [1]]
  )
  assert.match(plan[1].title, /p\. 1$/)
  assert.match(plan[2].title, /p\. 2$/)
  // Each page now gets the whole content box.
  assert.ok(plan[2].images[0].w > plan[1].images[0].w * 0.9)

  const reconciled = reconcileSlidePlan(state)
  assert.equal(reconciled.length, 3, 'the 2-up slide is not resurrected')
  assert.deepEqual(
    reconciled.map((slide) => slide.images.length),
    [1, 1, 1]
  )
})

test('splitting a single-page slide is a no-op', () => {
  const state = project()
  state.slidePlan = buildSlidePlan(state)
  const before = state.slidePlan.length
  assert.equal(splitSlide(state, 0).length, before)
})
