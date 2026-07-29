/** Worker export: used when an excerpt needs yt-dlp (YouTube) or an exact ffmpeg trim. */

import { getBlob } from './db.js'
import { downloadBlob, slugify } from './util.js'

const POLL_MS = 1500

function manifestFor(project, plan) {
  return {
    title: project.title,
    plan,
    excerpts: project.excerpts.map((excerpt) => ({
      id: excerpt.id,
      title: excerpt.title,
      video: {
        source: excerpt.video.source,
        url: excerpt.video.url || null,
        startSec: excerpt.video.startSec,
        endSec: excerpt.video.endSec,
        file: excerpt.video.file ? { field: `video:${excerpt.id}`, name: excerpt.video.file.name } : null,
      },
      partScore: excerpt.partScore ? { field: `partScore:${excerpt.id}`, name: excerpt.partScore.name } : null,
      fullScore: excerpt.fullScore ? { field: `fullScore:${excerpt.id}`, name: excerpt.fullScore.name } : null,
    })),
  }
}

async function buildFormData(project, plan) {
  const form = new FormData()
  form.append('manifest', JSON.stringify(manifestFor(project, plan)))
  for (const excerpt of project.excerpts) {
    const entries = [
      ['partScore', excerpt.partScore],
      ['fullScore', excerpt.fullScore],
      ['video', excerpt.video.file],
    ]
    for (const [field, ref] of entries) {
      if (!ref?.blobKey) continue
      const blob = await getBlob(ref.blobKey)
      if (!blob) throw new Error(`Missing file for ${ref.name}`)
      form.append('files', blob, `${field}:${excerpt.id}`)
    }
  }
  return form
}

export async function checkWorker(baseUrl) {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/health`, { cache: 'no-store' })
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` }
    return { ok: true, ...(await response.json()) }
  } catch (error) {
    return { ok: false, error: error.message }
  }
}

export async function exportViaWorker(project, plan, { baseUrl, onProgress = () => {}, signal } = {}) {
  const root = baseUrl.replace(/\/$/, '')
  onProgress('Uploading project to the worker')
  const created = await fetch(`${root}/jobs`, {
    method: 'POST',
    body: await buildFormData(project, plan),
    signal,
  })
  if (!created.ok) throw new Error(`Worker rejected the job (HTTP ${created.status})`)
  const { jobId } = await created.json()

  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
    const response = await fetch(`${root}/jobs/${jobId}`, { cache: 'no-store', signal })
    if (!response.ok) throw new Error(`Lost the job (HTTP ${response.status})`)
    const job = await response.json()
    if (job.message) onProgress(job.message)
    if (job.state === 'failed') throw new Error(job.error || 'Worker failed')
    if (job.state === 'done') break
  }

  onProgress('Downloading deck')
  const download = await fetch(`${root}/jobs/${jobId}/download`, { signal })
  if (!download.ok) throw new Error(`Download failed (HTTP ${download.status})`)
  const blob = await download.blob()
  downloadBlob(blob, `${slugify(project.title)}.pptx`)
  return blob
}
