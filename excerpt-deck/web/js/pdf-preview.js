import * as pdfjs from '../vendor/pdf.mjs'
import { blobToDataUrl } from './util.js'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdf.worker.mjs', import.meta.url).href

const EXPORT_WIDTH = 1600
const THUMB_WIDTH = 240

async function loadDocument(blob) {
  const data = new Uint8Array(await blob.arrayBuffer())
  return pdfjs.getDocument({ data }).promise
}

function renderToCanvas(page, targetWidth) {
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: targetWidth / base.width })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  const context = canvas.getContext('2d')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  return page.render({ canvasContext: context, viewport }).promise.then(() => canvas)
}

/** Page dimensions in PDF points, used by slide-plan to decide portrait/landscape and fit. */
export async function probePdf(blob) {
  const doc = await loadDocument(blob)
  const pageCount = doc.numPages
  const pages = []
  for (let number = 1; number <= pageCount; number += 1) {
    const viewport = (await doc.getPage(number)).getViewport({ scale: 1 })
    pages.push({ w: viewport.width, h: viewport.height })
  }
  await doc.destroy()
  return { pageCount, pages }
}

export async function probeImage(blob) {
  const url = URL.createObjectURL(blob)
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('Could not read image'))
      element.src = url
    })
    return { pageCount: 1, pages: [{ w: image.naturalWidth, h: image.naturalHeight }] }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function probeScore(blob) {
  return blob.type === 'application/pdf' ? probePdf(blob) : probeImage(blob)
}

export async function probeVideo(blob) {
  const url = URL.createObjectURL(blob)
  try {
    return await new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () =>
        resolve({ durationSec: video.duration, w: video.videoWidth, h: video.videoHeight })
      video.onerror = () => reject(new Error('Could not read video'))
      video.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Renders every page of a score (PDF or image) to PNG data URLs, indexed by page. */
export async function rasterizeScore(blob, { width = EXPORT_WIDTH } = {}) {
  if (blob.type !== 'application/pdf') return [await blobToDataUrl(blob)]
  const doc = await loadDocument(blob)
  const pageCount = doc.numPages
  const pages = []
  for (let number = 1; number <= pageCount; number += 1) {
    const canvas = await renderToCanvas(await doc.getPage(number), width)
    pages.push(canvas.toDataURL('image/png'))
  }
  await doc.destroy()
  return pages
}

export async function thumbnail(blob) {
  if (blob.type !== 'application/pdf') return URL.createObjectURL(blob)
  const doc = await loadDocument(blob)
  const canvas = await renderToCanvas(await doc.getPage(1), THUMB_WIDTH)
  await doc.destroy()
  return canvas.toDataURL('image/png')
}

/** Frame grabbed at `atSec`, used as the slide's video poster. */
export async function videoPoster(blob, atSec = 0) {
  const url = URL.createObjectURL(blob)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  try {
    await new Promise((resolve, reject) => {
      video.onloadeddata = resolve
      video.onerror = () => reject(new Error('Could not read video'))
      video.src = url
    })
    await new Promise((resolve) => {
      video.onseeked = resolve
      video.currentTime = Math.min(atSec, Math.max(0, (video.duration || 1) - 0.1))
      setTimeout(resolve, 3000)
    })
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}
