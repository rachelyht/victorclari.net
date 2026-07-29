import { uid } from './util.js'

export const VIDEO_SOURCES = ['upload', 'youtube']
/**
 * 'badge'  - offline: embed the file whole, poster frame at the start time, and print the
 *            window on the slide. Keynote ignores pptx trim marks, so nothing is faked here.
 * 'worker' - exact ffmpeg trim, needs the local worker running.
 */
export const TRIM_MODES = ['badge', 'worker']
export const VIDEO_SIZES = { S: 0.12, M: 0.18, L: 0.26 }

export function createProject(title = 'Untitled deck') {
  return {
    id: uid('proj'),
    title,
    updatedAt: Date.now(),
    defaultVideoSource: 'upload',
    excerpts: [],
    slidePlan: null,
    planEditedAt: null,
  }
}

export function createExcerpt(source = 'upload') {
  return {
    id: uid('exc'),
    title: '',
    video: { source, url: '', file: null, startSec: null, endSec: null, trim: 'badge' },
    partScore: null,
    fullScore: null,
  }
}

export function fileRef({ blobKey, name, mime, size, pageCount = 1, pages = [], durationSec = null }) {
  return { blobKey, name, mime, size, pageCount, pages, durationSec }
}

export function findExcerpt(project, excerptId) {
  return project.excerpts.find((excerpt) => excerpt.id === excerptId) || null
}

export function excerptLabel(excerpt, index) {
  return excerpt.title?.trim() || `Excerpt ${index + 1}`
}

/** Everything stopping an excerpt from being exportable, as user-facing strings. */
export function excerptIssues(excerpt) {
  const issues = []
  const { video } = excerpt
  if (video.source === 'youtube' && !parseYouTubeId(video.url)) issues.push('YouTube link missing or unrecognised')
  if (video.source === 'upload' && !video.file) issues.push('Video not uploaded')
  if (video.startSec == null || video.endSec == null) issues.push('Start/end timestamp missing')
  else if (video.endSec <= video.startSec) issues.push('End timestamp must be after start')
  if (!excerpt.partScore) issues.push('Part score missing')
  if (!excerpt.fullScore) issues.push('Full score missing')
  return issues
}

export function projectIssues(project) {
  if (!project.excerpts.length) return ['Add at least one excerpt']
  return project.excerpts.flatMap((excerpt, index) =>
    excerptIssues(excerpt).map((issue) => `${excerptLabel(excerpt, index)}: ${issue}`)
  )
}

export function needsWorker(project) {
  return project.excerpts.some(
    (excerpt) => excerpt.video.source === 'youtube' || excerpt.video.trim === 'worker'
  )
}

export function parseYouTubeId(url) {
  if (!url) return null
  const match = String(url)
    .trim()
    .match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)
  return match ? match[1] : null
}

export function youTubeThumbnail(url) {
  const id = parseYouTubeId(url)
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null
}

/** Blob keys still referenced by a project — anything else in the blob store is garbage. */
export function referencedBlobKeys(project) {
  const keys = []
  for (const excerpt of project.excerpts) {
    for (const ref of [excerpt.partScore, excerpt.fullScore, excerpt.video.file]) {
      if (ref?.blobKey) keys.push(ref.blobKey)
    }
    if (excerpt.video.posterBlobKey) keys.push(excerpt.video.posterBlobKey)
  }
  return keys
}
