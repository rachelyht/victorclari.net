import assert from 'node:assert/strict'
import test from 'node:test'

import {
  SLIDE_ASPECT,
  buildExcerptSlides,
  buildSlidePlan,
  contentBox,
  fitContain,
  groupFullScorePages,
  reconcileSlidePlan,
  videoBox,
} from '../web/js/slide-plan.js'

const A4 = { w: 595, h: 842 }
const A4_LANDSCAPE = { w: 842, h: 595 }

function score(pageCount, page = A4) {
  return { blobKey: 'k', name: 'score.pdf', pageCount, pages: Array.from({ length: pageCount }, () => page) }
}

function excerpt(overrides = {}) {
  return {
    id: 'exc1',
    title: 'Mahler 5',
    video: { source: 'upload', startSec: 10, endSec: 40, trim: 'badge' },
    partScore: score(1),
    fullScore: score(3),
    ...overrides,
  }
}

test('video box keeps 16:9 in real proportions and sits bottom-left', () => {
  const box = videoBox(0.18)
  assert.ok(Math.abs((box.w * SLIDE_ASPECT) / (box.h * 1) - 16 / 9) < 1e-9)
  assert.ok(box.x < 0.1)
  assert.ok(box.y + box.h <= 1)
})

test('content box never overlaps the video box', () => {
  const video = videoBox(0.26)
  const box = contentBox(video)
  assert.ok(box.x >= video.x + video.w)
  assert.ok(box.x + box.w <= 1)
})

test('fitContain preserves aspect and stays inside the box', () => {
  const box = { x: 0.2, y: 0.1, w: 0.7, h: 0.8 }
  const fitted = fitContain(box, A4.w / A4.h)
  const aspect = (fitted.w * SLIDE_ASPECT) / fitted.h
  assert.ok(Math.abs(aspect - A4.w / A4.h) < 1e-6)
  assert.ok(fitted.x >= box.x - 1e-9 && fitted.x + fitted.w <= box.x + box.w + 1e-9)
  assert.ok(fitted.y >= box.y - 1e-9 && fitted.y + fitted.h <= box.y + box.h + 1e-9)
})

test('portrait full scores are grouped two pages per slide', () => {
  assert.deepEqual(groupFullScorePages(score(1)), [[0]])
  assert.deepEqual(groupFullScorePages(score(2)), [[0, 1]])
  assert.deepEqual(groupFullScorePages(score(3)), [[0, 1], [2]])
  assert.deepEqual(groupFullScorePages(score(5)), [[0, 1], [2, 3], [4]])
})

test('landscape pages get a slide of their own', () => {
  assert.deepEqual(groupFullScorePages(score(4, A4_LANDSCAPE)), [[0], [1], [2], [3]])
  const mixed = { pageCount: 3, pages: [A4, A4_LANDSCAPE, A4] }
  assert.deepEqual(groupFullScorePages(mixed), [[0], [1], [2]])
})

test('an excerpt yields one part slide followed by the full score slides', () => {
  const slides = buildExcerptSlides(excerpt(), 0)
  assert.equal(slides.length, 3)
  assert.equal(slides[0].kind, 'part')
  assert.equal(slides[0].images.length, 1)
  assert.deepEqual(
    slides.slice(1).map((slide) => slide.images.map((image) => image.page)),
    [[0, 1], [2]]
  )
  assert.ok(slides.every((slide) => slide.video.excerptId === 'exc1'))
})

test('a multi-page part score is tiled onto its single slide', () => {
  const [part] = buildExcerptSlides(excerpt({ partScore: score(4) }), 0)
  assert.equal(part.images.length, 4)
  const rows = new Set(part.images.map((image) => Math.round(image.y * 1000)))
  assert.equal(rows.size, 2, 'four pages should form two rows')
})

test('slide plan concatenates excerpts in order', () => {
  const project = {
    excerpts: [
      excerpt({ id: 'a', fullScore: score(1) }),
      excerpt({ id: 'b', fullScore: score(2) }),
    ],
  }
  const plan = buildSlidePlan(project)
  assert.deepEqual(
    plan.map((slide) => `${slide.excerptId}:${slide.kind}`),
    ['a:part', 'a:full', 'b:part', 'b:full']
  )
})

test('reconcile keeps manual tweaks and picks up new pages', () => {
  const project = { excerpts: [excerpt({ fullScore: score(2) })], slidePlan: null, planEditedAt: null }
  project.slidePlan = buildSlidePlan(project)
  project.slidePlan[0].title = 'Custom title'
  project.slidePlan[0].edited = true
  project.planEditedAt = Date.now()

  project.excerpts[0].fullScore = score(4)
  const reconciled = reconcileSlidePlan(project)
  assert.equal(reconciled[0].title, 'Custom title')
  assert.equal(reconciled.length, 3, 'four pages now need two full-score slides')
})

test('duplicated slides survive reconciliation', () => {
  const project = { excerpts: [excerpt({ fullScore: score(1) })], slidePlan: null, planEditedAt: Date.now() }
  project.slidePlan = buildSlidePlan(project)
  project.slidePlan.push({ ...project.slidePlan[0], id: 'manual1', manual: true, edited: true })
  const reconciled = reconcileSlidePlan(project)
  assert.ok(reconciled.some((slide) => slide.id === 'manual1'))
})
