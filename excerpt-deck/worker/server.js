/**
 * Local job runner for excerpts that the browser cannot handle on its own: YouTube downloads
 * (yt-dlp) and exact trims (ffmpeg). Deck composition is the same module the browser uses.
 */

import { randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import express from 'express'
import JSZip from 'jszip'
import multer from 'multer'
import PptxGenJS from 'pptxgenjs'

import { composeDeck, imageKey } from '../web/js/deck-pptx.js'
import { dedupeMedia } from '../web/js/pptx-dedupe.js'
import { rasterizeScore } from './pipeline/pdf.js'
import { hasTool } from './pipeline/tools.js'
import { downloadYouTube, poster, trim } from './pipeline/video.js'

const PORT = Number(process.env.PORT || 8787)
const ROOT = process.env.WORK_DIR || path.join(os.tmpdir(), 'excerpt-deck-jobs')
const CACHE = path.join(ROOT, 'cache')
const JOB_TTL_MS = 6 * 60 * 60 * 1000

const jobs = new Map()
const app = express()
const upload = multer({ dest: path.join(ROOT, 'uploads'), limits: { fileSize: 2 * 1024 * 1024 * 1024 } })

app.use((request, response, next) => {
  response.set('Access-Control-Allow-Origin', '*')
  response.set('Access-Control-Allow-Headers', 'Content-Type')
  if (request.method === 'OPTIONS') {
    response.sendStatus(204)
    return
  }
  next()
})

app.get('/health', async (_request, response) => {
  response.json({
    ok: true,
    ytdlp: await hasTool('yt-dlp'),
    ffmpeg: await hasTool('ffmpeg'),
    pdftoppm: await hasTool('pdftoppm'),
  })
})

app.post('/jobs', upload.array('files'), async (request, response) => {
  let manifest
  try {
    manifest = JSON.parse(request.body.manifest)
  } catch {
    response.status(400).json({ error: 'manifest is not valid JSON' })
    return
  }
  const jobId = randomUUID()
  const files = new Map((request.files || []).map((file) => [file.originalname, file.path]))
  const job = { id: jobId, state: 'running', message: 'Queued', createdAt: Date.now() }
  jobs.set(jobId, job)
  response.json({ jobId })
  processJob(job, manifest, files).catch((error) => {
    job.state = 'failed'
    job.error = error.message
  })
})

app.get('/jobs/:id', (request, response) => {
  const job = jobs.get(request.params.id)
  if (!job) {
    response.status(404).json({ error: 'unknown job' })
    return
  }
  response.json({ state: job.state, message: job.message, error: job.error })
})

app.get('/jobs/:id/download', (request, response) => {
  const job = jobs.get(request.params.id)
  if (!job || job.state !== 'done') {
    response.status(404).json({ error: 'deck is not ready' })
    return
  }
  response.set('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
  response.set('Content-Disposition', 'attachment; filename="deck.pptx"')
  createReadStream(job.deckPath).pipe(response)
})

async function dataUrl(file, mime) {
  return `data:${mime};base64,${(await readFile(file)).toString('base64')}`
}

async function processJob(job, manifest, files) {
  const workDir = path.join(ROOT, job.id)
  await mkdir(workDir, { recursive: true })
  await mkdir(CACHE, { recursive: true })

  const images = new Map()
  const videos = new Map()

  for (const excerpt of manifest.excerpts) {
    const name = excerpt.title || excerpt.id
    for (const source of ['partScore', 'fullScore']) {
      const entry = excerpt[source]
      if (!entry) continue
      job.message = `Rendering ${source === 'partScore' ? 'part' : 'full'} score — ${name}`
      // A score can be split over several files; pages are numbered across them in order.
      let page = 0
      for (const [index, part] of (entry.files ?? [entry]).entries()) {
        const uploaded = files.get(part.field)
        if (!uploaded) throw new Error(`missing upload for ${part.field}`)
        const suffix = path.extname(part.name).toLowerCase() || '.png'
        const scorePath = path.join(workDir, `${source}_${excerpt.id}_${index}${suffix}`)
        await writeFile(scorePath, await readFile(uploaded))
        const rendered = await rasterizeScore(scorePath, workDir, `${source}_${excerpt.id}_${index}`)
        for (const file of rendered) {
          const mime = file.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
          images.set(imageKey(excerpt.id, source, page), await dataUrl(file, mime))
          page += 1
        }
      }
    }

    const { video } = excerpt
    let sourceVideo
    if (video.source === 'youtube') {
      job.message = `Downloading video — ${name}`
      const videoId = video.url.match(/[\w-]{11}/)?.[0] || excerpt.id
      sourceVideo = await downloadYouTube(video.url, CACHE, videoId)
    } else {
      const uploaded = files.get(video.file?.field)
      if (!uploaded) throw new Error(`missing video upload for ${name}`)
      sourceVideo = path.join(workDir, `${excerpt.id}-source.mp4`)
      await writeFile(sourceVideo, await readFile(uploaded))
    }

    job.message = `Trimming video — ${name}`
    const clip = path.join(workDir, `${excerpt.id}-clip.mp4`)
    await trim(sourceVideo, clip, video.startSec ?? 0, video.endSec ?? 0)
    const cover = path.join(workDir, `${excerpt.id}-poster.png`)
    await poster(clip, cover, 0).catch(() => null)

    videos.set(excerpt.id, {
      dataUrl: await dataUrl(clip, 'video/mp4'),
      posterDataUrl: await dataUrl(cover, 'image/png').catch(() => null),
      startSec: video.startSec,
      endSec: video.endSec,
      trimmed: true,
    })
  }

  job.message = 'Composing slides'
  const composed = await composeDeck({
    PptxGenJS,
    plan: manifest.plan,
    images,
    videos,
    title: manifest.title,
    output: 'nodebuffer',
  })
  job.message = 'Removing duplicated video copies'
  const { deck } = await dedupeMedia(composed, JSZip, 'nodebuffer')
  job.deckPath = path.join(workDir, 'deck.pptx')
  await writeFile(job.deckPath, deck)
  job.state = 'done'
  job.message = 'Deck ready'
}

setInterval(() => {
  for (const [id, job] of jobs) {
    if (Date.now() - job.createdAt < JOB_TTL_MS) continue
    jobs.delete(id)
    rm(path.join(ROOT, id), { recursive: true, force: true }).catch(() => {})
  }
}, 15 * 60 * 1000).unref()

app.listen(PORT, () => {
  process.stdout.write(`excerpt-deck worker listening on http://localhost:${PORT}\n`)
})
