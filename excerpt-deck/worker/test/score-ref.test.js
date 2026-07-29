import assert from 'node:assert/strict'
import test from 'node:test'

import { fileRef, referencedBlobKeys, scoreFiles, scorePageSources, scoreRef } from '../../web/js/model.js'
import { buildExcerptSlides, groupFullScorePages } from '../../web/js/slide-plan.js'

const A4 = { w: 595, h: 842 }
const LANDSCAPE = { w: 842, h: 595 }

const png = (name, page = A4) =>
  fileRef({ blobKey: `blob_${name}`, name, mime: 'image/png', size: 100, pageCount: 1, pages: [page] })

const pdf = (name, pageCount) =>
  fileRef({
    blobKey: `blob_${name}`,
    name,
    mime: 'application/pdf',
    size: 200,
    pageCount,
    pages: Array.from({ length: pageCount }, () => A4),
  })

test('several files become one page sequence in the order given', () => {
  const score = scoreRef([png('p1.png'), pdf('mid.pdf', 2), png('p4.png')])
  assert.equal(score.pageCount, 4)
  assert.equal(score.pages.length, 4)
  assert.equal(score.name, '3 files')
  assert.deepEqual(
    scorePageSources(score).map(({ file, page }) => `${file.name}#${page}`),
    ['p1.png#0', 'mid.pdf#0', 'mid.pdf#1', 'p4.png#0']
  )
})

test('a single file still reads as a score, and legacy single refs keep working', () => {
  const score = scoreRef([pdf('full.pdf', 3)])
  assert.equal(score.name, 'full.pdf')
  assert.equal(score.pageCount, 3)
  assert.equal(scoreFiles(score).length, 1)
  assert.equal(scoreFiles(pdf('legacy.pdf', 2))[0].name, 'legacy.pdf', 'a bare fileRef is a one-file score')
  assert.deepEqual(scoreFiles(null), [])
  assert.equal(scoreRef([]), null)
})

test('2-up grouping spans file boundaries and still respects landscape pages', () => {
  const portraitFiles = scoreRef([png('a.png'), png('b.png'), png('c.png')])
  assert.deepEqual(groupFullScorePages(portraitFiles), [[0, 1], [2]])

  const withLandscape = scoreRef([png('a.png'), png('wide.png', LANDSCAPE), png('c.png')])
  assert.deepEqual(groupFullScorePages(withLandscape), [[0], [1], [2]])
})

test('one file per page produces the same slides as one multi-page PDF', () => {
  const excerpt = (fullScore) => ({
    id: 'exc1',
    title: 'Mahler 1',
    video: { source: 'upload', startSec: 43, endSec: 104 },
    partScore: scoreRef([png('part.png')]),
    fullScore,
  })
  const asPdf = buildExcerptSlides(excerpt(scoreRef([pdf('full.pdf', 3)])), 0)
  const asImages = buildExcerptSlides(excerpt(scoreRef([png('1.png'), png('2.png'), png('3.png')])), 0)
  assert.deepEqual(
    asImages.map((slide) => slide.images.map((image) => `${image.source}:${image.page}`)),
    asPdf.map((slide) => slide.images.map((image) => `${image.source}:${image.page}`))
  )
})

test('every file of every score is kept out of the garbage sweep', () => {
  const project = {
    excerpts: [
      {
        id: 'exc1',
        video: { source: 'upload', file: fileRef({ blobKey: 'blob_video', name: 'clip.mp4' }) },
        partScore: scoreRef([png('part.png')]),
        fullScore: scoreRef([png('f1.png'), png('f2.png')]),
      },
    ],
  }
  assert.deepEqual(referencedBlobKeys(project).sort(), [
    'blob_f1.png',
    'blob_f2.png',
    'blob_part.png',
    'blob_video',
  ])
})
