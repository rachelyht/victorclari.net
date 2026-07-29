/**
 * End-to-end check of the worker pipeline on synthetic assets: a 3-page PDF and a short MP4.
 * Skipped automatically when ffmpeg / poppler are unavailable.
 * Run with: npm test  (from excerpt-deck/worker, after npm install)
 */

import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { composeDeck, imageKey } from '../../web/js/deck-pptx.js'
import { dedupeMedia } from '../../web/js/pptx-dedupe.js'
import { buildSlidePlan } from '../../web/js/slide-plan.js'
import { rasterizeScore } from '../pipeline/pdf.js'
import { hasTool, run } from '../pipeline/tools.js'
import { poster, trim } from '../pipeline/video.js'

const A4_PAGE_PDF = (pageCount) => {
  const pages = Array.from({ length: pageCount }, (_, i) => i)
  const objects = []
  objects.push('1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj')
  objects.push(
    `2 0 obj<</Type/Pages/Count ${pageCount}/Kids[${pages.map((i) => `${3 + i * 2} 0 R`).join(' ')}]>>endobj`
  )
  for (const i of pages) {
    const content = `BT /F1 24 Tf 72 700 Td (Page ${i + 1}) Tj ET`
    objects.push(
      `${3 + i * 2} 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents ${4 + i * 2} 0 R` +
        `/Resources<</Font<</F1 <</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>>>endobj`
    )
    objects.push(`${4 + i * 2} 0 obj<</Length ${content.length}>>stream\n${content}\nendstream endobj`)
  }

  let pdf = '%PDF-1.4\n'
  const offsets = []
  for (const object of objects) {
    offsets.push(pdf.length)
    pdf += `${object}\n`
  }
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  pdf += `trailer<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(pdf, 'latin1')
}

const available = (await hasTool('ffmpeg')) && (await hasTool('pdftoppm'))

test('worker builds a deck whose slides match the submitted plan', { skip: !available }, async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'excerpt-deck-test-'))
  try {
    const pdfPath = path.join(dir, 'full.pdf')
    await writeFile(pdfPath, A4_PAGE_PDF(3))
    const partPath = path.join(dir, 'part.pdf')
    await writeFile(partPath, A4_PAGE_PDF(1))

    const sourceVideo = path.join(dir, 'source.mp4')
    await run('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=15:duration=6',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=6',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', sourceVideo,
    ])

    const fullPages = await rasterizeScore(pdfPath, dir, 'full')
    const partPages = await rasterizeScore(partPath, dir, 'part')
    assert.equal(fullPages.length, 3)

    const clip = path.join(dir, 'clip.mp4')
    await trim(sourceVideo, clip, 1, 3)
    const cover = path.join(dir, 'poster.png')
    await poster(clip, cover, 0)

    const excerpt = {
      id: 'exc1',
      title: 'Test excerpt',
      partScore: { pageCount: 1, pages: [{ w: 595, h: 842 }] },
      fullScore: { pageCount: 3, pages: Array.from({ length: 3 }, () => ({ w: 595, h: 842 })) },
      video: { source: 'upload', startSec: 1, endSec: 3 },
    }
    const plan = buildSlidePlan({ excerpts: [excerpt] })
    assert.equal(plan.length, 3)

    const images = new Map()
    for (const [page, file] of partPages.entries()) {
      images.set(imageKey('exc1', 'partScore', page), `data:image/png;base64,${(await readFile(file)).toString('base64')}`)
    }
    for (const [page, file] of fullPages.entries()) {
      images.set(imageKey('exc1', 'fullScore', page), `data:image/png;base64,${(await readFile(file)).toString('base64')}`)
    }
    const videos = new Map([
      [
        'exc1',
        {
          dataUrl: `data:video/mp4;base64,${(await readFile(clip)).toString('base64')}`,
          posterDataUrl: `data:image/png;base64,${(await readFile(cover)).toString('base64')}`,
          startSec: 1,
          endSec: 3,
          trimmed: true,
        },
      ],
    ])

    const { default: PptxGenJS } = await import('pptxgenjs')
    const composed = await composeDeck({
      PptxGenJS,
      plan,
      images,
      videos,
      title: 'Test deck',
      output: 'nodebuffer',
    })
    const { default: JSZip } = await import('jszip')
    const { deck, removed } = await dedupeMedia(composed, JSZip, 'nodebuffer')
    // The clip and its poster are re-embedded per slide: 2 duplicate clips + 3 duplicate posters.
    assert.equal(removed, 5, 'repeated media collapses to one copy each')
    const deckPath = path.join(dir, 'deck.pptx')
    await writeFile(deckPath, deck)

    await run('unzip', ['-o', deckPath, '-d', path.join(dir, 'unzipped')])
    const slides = await readdir(path.join(dir, 'unzipped', 'ppt', 'slides'))
    assert.equal(slides.filter((name) => name.endsWith('.xml')).length, 3, 'one xml per planned slide')

    const media = await readdir(path.join(dir, 'unzipped', 'ppt', 'media'))
    assert.equal(media.filter((name) => name.endsWith('.mp4')).length, 1, 'one shared video file')
    assert.ok(media.filter((name) => name.endsWith('.png')).length >= 4, 'score pages are embedded')

    for (const slide of [1, 2, 3]) {
      const rels = await readFile(
        path.join(dir, 'unzipped', 'ppt', 'slides', '_rels', `slide${slide}.xml.rels`),
        'utf8'
      )
      for (const target of rels.matchAll(/Target="\.\.\/media\/([^"]+)"/g)) {
        assert.ok(media.includes(target[1]), `slide ${slide} points at an existing media file`)
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
