/** Offline export: rasterise, compose and download the .pptx entirely in the page. */

import { getBlob } from './db.js'
import { composeDeck, imageKey } from './deck-pptx.js'
import { rasterizeScore, videoPoster } from './pdf-preview.js'
import { dedupeMedia } from './pptx-dedupe.js'
import { blobToDataUrl, downloadBlob, slugify } from './util.js'

export function canExportOffline(project) {
  return project.excerpts.every((excerpt) => excerpt.video.source === 'upload' && excerpt.video.trim !== 'worker')
}

async function collectImages(project, report) {
  const images = new Map()
  for (const excerpt of project.excerpts) {
    for (const source of ['partScore', 'fullScore']) {
      const ref = excerpt[source]
      if (!ref) continue
      report(`Rendering ${source === 'partScore' ? 'part' : 'full'} score — ${excerpt.title || 'excerpt'}`)
      const blob = await getBlob(ref.blobKey)
      if (!blob) throw new Error(`Missing file for ${ref.name}`)
      const pages = await rasterizeScore(blob)
      pages.forEach((dataUrl, page) => images.set(imageKey(excerpt.id, source, page), dataUrl))
    }
  }
  return images
}

async function collectVideos(project, report) {
  const videos = new Map()
  for (const excerpt of project.excerpts) {
    const ref = excerpt.video.file
    if (!ref) continue
    report(`Preparing video — ${excerpt.title || 'excerpt'}`)
    const blob = await getBlob(ref.blobKey)
    if (!blob) throw new Error(`Missing video for ${ref.name}`)
    videos.set(excerpt.id, {
      dataUrl: await blobToDataUrl(blob),
      posterDataUrl: await videoPoster(blob, excerpt.video.startSec || 0),
      startSec: excerpt.video.startSec,
      endSec: excerpt.video.endSec,
      trimmed: false,
    })
  }
  return videos
}

export async function exportOffline(project, plan, { onProgress = () => {} } = {}) {
  const report = (message) => onProgress(message)
  const images = await collectImages(project, report)
  const videos = await collectVideos(project, report)
  report('Composing slides')
  const composed = await composeDeck({
    PptxGenJS: globalThis.PptxGenJS,
    plan,
    images,
    videos,
    title: project.title,
    output: 'blob',
  })
  report('Removing duplicated video copies')
  const { deck } = await dedupeMedia(composed, globalThis.JSZip, 'blob')
  report('Downloading')
  downloadBlob(deck, `${slugify(project.title)}.pptx`)
  return deck
}
