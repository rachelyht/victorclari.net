/** App shell: hash routing, forms, autosave. Views are re-rendered wholesale — small enough. */

import {
  deleteProject,
  estimateUsage,
  getBlob,
  getProject,
  getSetting,
  listProjects,
  putBlob,
  putProject,
  requestPersistence,
  setSetting,
} from './db.js'
import { canExportOffline, exportOffline } from './export-local.js'
import { checkWorker, exportViaWorker } from './export-worker.js'
import {
  VIDEO_SIZES,
  createExcerpt,
  createProject,
  excerptIssues,
  excerptLabel,
  fileRef,
  findExcerpt,
  parseYouTubeId,
  projectIssues,
  scoreFiles,
  scoreRef,
  youTubeThumbnail,
} from './model.js'
import { probeScore, probeVideo, rasterizeScore, thumbnail, videoPoster } from './pdf-preview.js'
import { buildExcerptSlides, reconcileSlidePlan } from './slide-plan.js'
import { mountSlideEditor, relayoutImages, renderSlide, videoLabelFor } from './storyboard.js'
import { debounce, formatBytes, formatTime, parseTime, uid } from './util.js'
import { mountLocalPlayer } from './video-local.js'
import { mountPlayer } from './youtube.js'

const view = document.getElementById('view')
const titleBar = document.getElementById('app-title')
const backButton = document.getElementById('back')
const saveState = document.getElementById('save-state')
const toastElement = document.getElementById('toast')
const PREVIEW_WIDTH = 700

const state = {
  project: null,
  players: [],
  assets: { images: new Map(), videos: new Map(), key: null },
  workerUrl: 'http://localhost:8787',
}

function toast(message, ms = 3200) {
  toastElement.textContent = message
  toastElement.hidden = false
  clearTimeout(toast.timer)
  toast.timer = setTimeout(() => {
    toastElement.hidden = true
  }, ms)
}

function markSaved() {
  saveState.textContent = `Saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

const persist = debounce(async () => {
  if (!state.project) return
  state.project.updatedAt = Date.now()
  await putProject(state.project)
  markSaved()
}, 400)

function save() {
  saveState.textContent = 'Saving…'
  persist()
}

function element(html) {
  const template = document.createElement('template')
  template.innerHTML = html.trim()
  return template.content.firstElementChild
}

function releasePlayers() {
  for (const player of state.players) {
    try {
      player.destroy()
    } catch {
      /* player already gone */
    }
  }
  state.players = []
}

function go(hash) {
  window.location.hash = hash
}

/* ---------------------------------------------------------------- assets */

function assetSignature(project) {
  return JSON.stringify(
    project.excerpts.map((excerpt) => [
      excerpt.id,
      scoreFiles(excerpt.partScore).map((file) => file.blobKey),
      scoreFiles(excerpt.fullScore).map((file) => file.blobKey),
      excerpt.video.file?.blobKey,
      excerpt.video.url,
      excerpt.video.startSec,
      excerpt.video.endSec,
    ])
  )
}

/** Preview-resolution renders of every score page plus a poster per excerpt, cached in memory. */
async function buildPreviewAssets(project) {
  const signature = assetSignature(project)
  if (state.assets.key === signature) return state.assets
  const images = new Map()
  const videos = new Map()
  for (const excerpt of project.excerpts) {
    for (const source of ['partScore', 'fullScore']) {
      let page = 0
      for (const file of scoreFiles(excerpt[source])) {
        const blob = await getBlob(file.blobKey)
        if (!blob) continue
        for (const dataUrl of await rasterizeScore(blob, { width: PREVIEW_WIDTH })) {
          images.set(`${excerpt.id}:${source}:${page}`, dataUrl)
          page += 1
        }
      }
    }
    const label = videoLabelFor(excerpt)
    if (excerpt.video.source === 'youtube') {
      videos.set(excerpt.id, { poster: youTubeThumbnail(excerpt.video.url), label })
    } else if (excerpt.video.file) {
      const blob = await getBlob(excerpt.video.file.blobKey)
      videos.set(excerpt.id, {
        poster: blob ? await videoPoster(blob, excerpt.video.startSec || 0) : null,
        label,
      })
    }
  }
  state.assets = { images, videos, key: signature }
  return state.assets
}

/* ---------------------------------------------------------------- projects */

async function renderProjects() {
  releasePlayers()
  titleBar.textContent = 'Excerpt Decks'
  backButton.hidden = true
  saveState.textContent = ''

  const projects = await listProjects()
  const usage = await estimateUsage()
  const root = element('<div></div>')

  root.appendChild(
    element(`
      <div class="row">
        <button class="primary" id="new-project">New deck</button>
        <span class="spacer"></span>
        <span class="badge">${projects.length} deck${projects.length === 1 ? '' : 's'}</span>
      </div>
      <p class="hint">Drafts stay on this device (IndexedDB). One deck = one project = many excerpts.</p>
    `)
  )

  if (!projects.length) {
    root.appendChild(element('<div class="empty">No decks yet. Create one to get started.</div>'))
  }

  for (const project of projects) {
    const issues = projectIssues(project)
    const card = element(`
      <div class="card">
        <h3></h3>
        <div class="meta"></div>
        <div class="row" style="margin-top:10px">
          <button class="small" data-open>Open</button>
          <button class="small danger" data-delete>Delete</button>
        </div>
      </div>
    `)
    card.querySelector('h3').textContent = project.title || 'Untitled deck'
    card.querySelector('.meta').textContent =
      `${project.excerpts.length} excerpt${project.excerpts.length === 1 ? '' : 's'} · ` +
      `${issues.length ? `${issues.length} thing${issues.length === 1 ? '' : 's'} to finish` : 'ready to export'} · ` +
      `edited ${new Date(project.updatedAt).toLocaleString()}`
    card.querySelector('[data-open]').onclick = () => go(`#/p/${project.id}`)
    card.querySelector('[data-delete]').onclick = async () => {
      if (!confirm(`Delete "${project.title}"? This cannot be undone.`)) return
      await deleteProject(project.id)
      renderProjects()
    }
    root.appendChild(card)
  }

  if (usage?.usage) {
    root.appendChild(
      element(`<p class="hint">Using ${formatBytes(usage.usage)} of local storage.</p>`)
    )
  }

  root.querySelector('#new-project').onclick = async () => {
    const project = createProject()
    await putProject(project)
    go(`#/p/${project.id}`)
  }

  view.replaceChildren(root)
}

/* ---------------------------------------------------------------- project */

async function loadProject(id) {
  if (state.project?.id !== id) {
    state.project = await getProject(id)
    state.assets = { images: new Map(), videos: new Map(), key: null }
  }
  return state.project
}

async function renderProject(projectId) {
  releasePlayers()
  const project = await loadProject(projectId)
  if (!project) {
    go('#/')
    return
  }
  titleBar.textContent = project.title || 'Untitled deck'
  backButton.hidden = false
  backButton.onclick = () => go('#/')

  const root = element(`
    <div>
      <label for="deck-title">Deck title</label>
      <input id="deck-title" type="text" placeholder="e.g. Trumpet audition 2026" />
      <h2>Excerpts</h2>
      <div id="excerpts"></div>
      <div class="row" style="margin-top:12px">
        <button class="primary" id="add-excerpt">Add excerpt</button>
        <span class="spacer"></span>
        <button id="storyboard">Preview slides</button>
        <button id="export">Export</button>
      </div>
    </div>
  `)

  const titleInput = root.querySelector('#deck-title')
  titleInput.value = project.title || ''
  titleInput.oninput = () => {
    project.title = titleInput.value
    titleBar.textContent = project.title || 'Untitled deck'
    save()
  }

  const list = root.querySelector('#excerpts')
  if (!project.excerpts.length) {
    list.appendChild(element('<div class="empty">No excerpts yet.</div>'))
  }

  project.excerpts.forEach((excerpt, index) => {
    const issues = excerptIssues(excerpt)
    const slides = buildExcerptSlides(excerpt, index).length
    const card = element(`
      <div class="card">
        <div class="row">
          <h3 style="flex:1"></h3>
          <span class="badge"></span>
        </div>
        <div class="meta"></div>
        <ul class="issues" hidden></ul>
        <div class="row" style="margin-top:10px">
          <button class="small" data-edit>Edit</button>
          <button class="small" data-up>↑</button>
          <button class="small" data-down>↓</button>
          <span class="spacer"></span>
          <button class="small danger" data-delete>Delete</button>
        </div>
      </div>
    `)
    card.querySelector('h3').textContent = excerptLabel(excerpt, index)
    const badge = card.querySelector('.badge')
    badge.textContent = issues.length ? 'incomplete' : 'ready'
    badge.classList.add(issues.length ? 'warn' : 'ok')
    card.querySelector('.meta').textContent =
      `${excerpt.video.source === 'youtube' ? 'YouTube link' : 'Uploaded video'} · ` +
      `${excerpt.video.startSec != null && excerpt.video.endSec != null ? videoLabelFor(excerpt) : 'no timestamps'} · ` +
      `${slides} slide${slides === 1 ? '' : 's'}`
    if (issues.length) {
      const issueList = card.querySelector('.issues')
      issueList.hidden = false
      for (const issue of issues) {
        const item = document.createElement('li')
        item.textContent = issue
        issueList.appendChild(item)
      }
    }
    card.querySelector('[data-edit]').onclick = () => go(`#/p/${project.id}/e/${excerpt.id}`)
    card.querySelector('[data-up]').disabled = index === 0
    card.querySelector('[data-down]').disabled = index === project.excerpts.length - 1
    card.querySelector('[data-up]').onclick = () => moveExcerpt(index, -1)
    card.querySelector('[data-down]').onclick = () => moveExcerpt(index, 1)
    card.querySelector('[data-delete]').onclick = async () => {
      if (!confirm('Delete this excerpt?')) return
      project.excerpts.splice(index, 1)
      project.slidePlan = reconcileSlidePlan(project)
      save()
      renderProject(projectId)
    }
    list.appendChild(card)
  })

  function moveExcerpt(index, delta) {
    const target = index + delta
    if (target < 0 || target >= project.excerpts.length) return
    const [moved] = project.excerpts.splice(index, 1)
    project.excerpts.splice(target, 0, moved)
    project.slidePlan = reconcileSlidePlan(project)
    save()
    renderProject(projectId)
  }

  root.querySelector('#add-excerpt').onclick = () => {
    const excerpt = createExcerpt(project.defaultVideoSource || 'upload')
    project.excerpts.push(excerpt)
    save()
    go(`#/p/${project.id}/e/${excerpt.id}`)
  }
  root.querySelector('#storyboard').onclick = () => go(`#/p/${project.id}/storyboard`)
  root.querySelector('#export').onclick = () => go(`#/p/${project.id}/export`)

  view.replaceChildren(root)
}

/* ---------------------------------------------------------------- excerpt editor */

async function renderExcerpt(projectId, excerptId) {
  releasePlayers()
  const project = await loadProject(projectId)
  const excerpt = project && findExcerpt(project, excerptId)
  if (!excerpt) {
    go(`#/p/${projectId}`)
    return
  }
  const index = project.excerpts.indexOf(excerpt)
  titleBar.textContent = excerptLabel(excerpt, index)
  backButton.hidden = false
  backButton.onclick = () => go(`#/p/${project.id}`)

  const root = element(`
    <div>
      <label for="exc-title">Excerpt title</label>
      <input id="exc-title" type="text" placeholder="e.g. Mahler 5, mvt III, reh. 12" />

      <h2>Video</h2>
      <div class="seg" role="group" aria-label="Video source">
        <button data-source="upload">Upload video</button>
        <button data-source="youtube">YouTube link</button>
      </div>
      <div id="video-source"></div>
      <div class="player" id="player"></div>
      <div class="row" style="margin-top:8px">
        <div class="field">
          <label for="start">Start</label>
          <div class="time-fields">
            <input id="start" type="text" inputmode="numeric" placeholder="0:42" />
            <button class="small" data-set="start">Set from player</button>
          </div>
        </div>
        <div class="field">
          <label for="end">End</label>
          <div class="time-fields">
            <input id="end" type="text" inputmode="numeric" placeholder="1:15" />
            <button class="small" data-set="end">Set from player</button>
          </div>
        </div>
      </div>
      <p class="hint" id="clip-hint"></p>

      <h2>Part score</h2>
      <p class="hint">PDF or photos — add as many files as you need. Always placed on one slide.</p>
      <input type="file" id="part" accept="application/pdf,image/*" multiple />
      <div class="file-list" id="part-files"></div>

      <h2>Full score</h2>
      <p class="hint">The excerpt only. Add several files if the score is one per page — pages follow the order below. Two portrait pages per slide.</p>
      <input type="file" id="full" accept="application/pdf,image/*" multiple />
      <div class="file-list" id="full-files"></div>

      <div class="row" style="margin-top:20px">
        <button class="primary" id="done">Done</button>
        <span class="spacer"></span>
        <span class="badge" id="slide-count"></span>
      </div>
    </div>
  `)

  const titleInput = root.querySelector('#exc-title')
  titleInput.value = excerpt.title || ''
  titleInput.oninput = () => {
    excerpt.title = titleInput.value
    titleBar.textContent = excerptLabel(excerpt, index)
    project.slidePlan = reconcileSlidePlan(project)
    save()
  }

  const sourceButtons = root.querySelectorAll('[data-source]')
  const sourceArea = root.querySelector('#video-source')
  const playerArea = root.querySelector('#player')
  const startInput = root.querySelector('#start')
  const endInput = root.querySelector('#end')
  const clipHint = root.querySelector('#clip-hint')
  let player = null

  function refreshClipHint() {
    const { startSec, endSec } = excerpt.video
    const issues = excerptIssues(excerpt)
    const length = startSec != null && endSec != null && endSec > startSec ? endSec - startSec : null
    clipHint.textContent = length
      ? `Clip length ${formatTime(length)}. Offline export embeds the whole file with this window labelled on every slide; the local worker can trim it exactly.`
      : issues.find((issue) => issue.includes('timestamp')) || 'Set the excerpt start and end.'
  }

  function syncTimeInputs() {
    startInput.value = excerpt.video.startSec != null ? formatTime(excerpt.video.startSec) : ''
    endInput.value = excerpt.video.endSec != null ? formatTime(excerpt.video.endSec) : ''
    refreshClipHint()
  }

  function bindTimeInput(input, field) {
    input.onchange = () => {
      const seconds = parseTime(input.value)
      if (input.value.trim() && seconds == null) {
        toast('Use m:ss or h:mm:ss')
        syncTimeInputs()
        return
      }
      excerpt.video[field] = input.value.trim() ? seconds : null
      project.slidePlan = reconcileSlidePlan(project)
      save()
      syncTimeInputs()
    }
  }
  bindTimeInput(startInput, 'startSec')
  bindTimeInput(endInput, 'endSec')

  for (const button of root.querySelectorAll('[data-set]')) {
    button.onclick = () => {
      if (!player) {
        toast('Load a video first')
        return
      }
      const seconds = player.currentTime()
      if (seconds == null) return
      excerpt.video[button.dataset.set === 'start' ? 'startSec' : 'endSec'] = Math.round(seconds * 10) / 10
      save()
      syncTimeInputs()
    }
  }

  async function renderVideoSource() {
    for (const button of sourceButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.source === excerpt.video.source))
      button.onclick = () => {
        excerpt.video.source = button.dataset.source
        project.defaultVideoSource = button.dataset.source
        save()
        renderVideoSource()
      }
    }

    releasePlayers()
    player = null

    if (excerpt.video.source === 'youtube') {
      const field = element(`
        <div>
          <label for="yt">YouTube URL</label>
          <input id="yt" type="url" placeholder="https://www.youtube.com/watch?v=…" />
          <p class="hint">Needs the local worker at export time (yt-dlp downloads and ffmpeg trims the clip).</p>
        </div>
      `)
      const input = field.querySelector('#yt')
      input.value = excerpt.video.url || ''
      input.onchange = async () => {
        excerpt.video.url = input.value.trim()
        save()
        if (parseYouTubeId(excerpt.video.url)) await mountYouTube()
        else toast('That does not look like a YouTube link')
      }
      sourceArea.replaceChildren(field)
      if (parseYouTubeId(excerpt.video.url)) await mountYouTube()
      else playerArea.replaceChildren()
      return
    }

    const field = element(`
      <div>
        <label for="video-file">Video file</label>
        <input type="file" id="video-file" accept="video/*" />
        <p class="hint">Exports fully offline — no worker needed.</p>
        <div class="meta" id="video-meta"></div>
      </div>
    `)
    const meta = field.querySelector('#video-meta')
    if (excerpt.video.file) {
      meta.textContent = `${excerpt.video.file.name} · ${formatBytes(excerpt.video.file.size)}${
        excerpt.video.file.durationSec ? ` · ${formatTime(excerpt.video.file.durationSec)}` : ''
      }`
    }
    field.querySelector('#video-file').onchange = async (event) => {
      const file = event.target.files?.[0]
      if (!file) return
      toast('Reading video…')
      const probe = await probeVideo(file).catch(() => ({ durationSec: null }))
      const blobKey = await putBlob(file)
      excerpt.video.file = fileRef({
        blobKey,
        name: file.name,
        mime: file.type || 'video/mp4',
        size: file.size,
        durationSec: probe.durationSec,
      })
      if (excerpt.video.endSec == null && probe.durationSec) excerpt.video.endSec = Math.round(probe.durationSec)
      if (excerpt.video.startSec == null) excerpt.video.startSec = 0
      save()
      await renderVideoSource()
      syncTimeInputs()
    }
    sourceArea.replaceChildren(field)

    if (excerpt.video.file) {
      const blob = await getBlob(excerpt.video.file.blobKey)
      if (blob) {
        player = mountLocalPlayer(playerArea, blob)
        state.players.push(player)
      }
    } else {
      playerArea.replaceChildren()
    }
  }

  async function mountYouTube() {
    try {
      player = await mountPlayer(playerArea, excerpt.video.url)
      state.players.push(player)
    } catch (error) {
      toast(error.message)
    }
  }

  function updateSlideCount() {
    const count = buildExcerptSlides(excerpt, index).length
    root.querySelector('#slide-count').textContent = `${count} slide${count === 1 ? '' : 's'}`
  }

  async function attachScoreInput(inputId, listId, field) {
    const input = root.querySelector(`#${inputId}`)
    const list = root.querySelector(`#${listId}`)

    function commit(files) {
      excerpt[field] = scoreRef(files)
      project.slidePlan = reconcileSlidePlan(project)
      state.assets.key = null
      save()
      updateSlideCount()
      return draw()
    }

    async function draw() {
      const files = scoreFiles(excerpt[field])
      list.replaceChildren()
      for (const [position, file] of files.entries()) {
        const row = element(`
          <div class="file-row">
            <img alt="" />
            <div class="file-meta">
              <strong></strong>
              <span class="meta"></span>
            </div>
            <button class="icon" data-move="-1" aria-label="Move earlier" title="Move earlier">↑</button>
            <button class="icon" data-move="1" aria-label="Move later" title="Move later">↓</button>
            <button class="icon danger" data-remove aria-label="Remove file" title="Remove">×</button>
          </div>
        `)
        row.querySelector('strong').textContent = file.name
        const pageLabel = `${file.pageCount} page${file.pageCount === 1 ? '' : 's'}`
        const first = files.slice(0, position).reduce((total, earlier) => total + (earlier.pageCount || 1), 1)
        row.querySelector('.meta').textContent = `${pageLabel} · ${formatBytes(file.size)} · p. ${first}–${
          first + (file.pageCount || 1) - 1
        } of the score`
        const blob = await getBlob(file.blobKey)
        if (blob) row.querySelector('img').src = await thumbnail(blob)

        row.querySelector('[data-move="-1"]').disabled = position === 0
        row.querySelector('[data-move="1"]').disabled = position === files.length - 1
        for (const button of row.querySelectorAll('[data-move]')) {
          button.onclick = () => {
            const target = position + Number(button.dataset.move)
            const reordered = [...files]
            ;[reordered[position], reordered[target]] = [reordered[target], reordered[position]]
            commit(reordered)
          }
        }
        row.querySelector('[data-remove]').onclick = () =>
          commit(files.filter((_, other) => other !== position))
        list.appendChild(row)
      }
      if (files.length > 1) {
        const total = excerpt[field].pageCount
        list.appendChild(element(`<p class="hint">${files.length} files · ${total} pages in total.</p>`))
      }
    }

    input.onchange = async (event) => {
      const picked = [...(event.target.files || [])]
      if (!picked.length) return
      toast(picked.length > 1 ? `Reading ${picked.length} files…` : 'Reading score…')
      const added = []
      for (const file of picked) {
        const probe = await probeScore(file).catch(() => ({ pageCount: 1, pages: [] }))
        added.push(
          fileRef({
            blobKey: await putBlob(file),
            name: file.name,
            mime: file.type || 'application/pdf',
            size: file.size,
            pageCount: probe.pageCount,
            pages: probe.pages,
          })
        )
      }
      input.value = ''
      await commit([...scoreFiles(excerpt[field]), ...added])
    }

    await draw()
  }

  root.querySelector('#done').onclick = () => go(`#/p/${project.id}`)

  view.replaceChildren(root)
  await renderVideoSource()
  syncTimeInputs()
  await attachScoreInput('part', 'part-files', 'partScore')
  await attachScoreInput('full', 'full-files', 'fullScore')
  updateSlideCount()
}

/* ---------------------------------------------------------------- storyboard */

async function renderStoryboard(projectId) {
  releasePlayers()
  const project = await loadProject(projectId)
  if (!project) {
    go('#/')
    return
  }
  titleBar.textContent = 'Preview slides'
  backButton.hidden = false
  backButton.onclick = () => go(`#/p/${project.id}`)

  view.replaceChildren(element('<div class="empty">Rendering preview…</div>'))
  project.slidePlan = reconcileSlidePlan(project)
  const ctx = await buildPreviewAssets(project)

  const root = element(`
    <div>
      <div class="row">
        <span class="badge" id="count"></span>
        <span class="spacer"></span>
        <button class="small" id="regenerate">Regenerate from rules</button>
        <button class="small primary" id="to-export">Export</button>
      </div>
      <p class="hint">Tap a slide to adjust it. The exported deck matches this preview, except the video plays for real.</p>
      <div class="slide-grid" id="grid"></div>
    </div>
  `)
  root.querySelector('#count').textContent = `${project.slidePlan.length} slides`
  root.querySelector('#to-export').onclick = () => go(`#/p/${project.id}/export`)
  root.querySelector('#regenerate').onclick = () => {
    if (!confirm('Rebuild every slide from the layout rules? Manual adjustments are lost.')) return
    project.slidePlan = null
    project.planEditedAt = null
    project.slidePlan = reconcileSlidePlan(project)
    save()
    renderStoryboard(projectId)
  }

  const grid = root.querySelector('#grid')
  if (!project.slidePlan.length) {
    grid.appendChild(element('<div class="empty">Nothing to preview yet — add scores to an excerpt.</div>'))
  }

  project.slidePlan.forEach((slide, index) => {
    const cell = element('<figure class="slide-cell" style="margin:0"><figcaption></figcaption></figure>')
    cell.prepend(renderSlide(slide, ctx))
    cell.querySelector('figcaption').textContent = `${index + 1}. ${slide.kind === 'part' ? 'Part' : 'Full'} score${
      slide.edited ? ' · adjusted' : ''
    }`
    cell.onclick = () => go(`#/p/${project.id}/slide/${index}`)
    grid.appendChild(cell)
  })

  view.replaceChildren(root)
}

async function renderSlideEditorView(projectId, slideIndex) {
  releasePlayers()
  const project = await loadProject(projectId)
  if (!project) {
    go('#/')
    return
  }
  project.slidePlan = reconcileSlidePlan(project)
  const index = Number(slideIndex)
  const slide = project.slidePlan[index]
  if (!slide) {
    go(`#/p/${projectId}/storyboard`)
    return
  }
  const excerpt = findExcerpt(project, slide.excerptId) || { id: slide.excerptId }
  titleBar.textContent = `Slide ${index + 1}`
  backButton.hidden = false
  backButton.onclick = () => go(`#/p/${project.id}/storyboard`)

  const ctx = await buildPreviewAssets(project)
  const root = element(`
    <div class="slide-editor">
      <div id="canvas"></div>
      <div class="row" style="margin-top:12px">
        <button class="small" data-prev>‹ Previous</button>
        <button class="small" data-next>Next ›</button>
        <span class="spacer"></span>
        <button class="small" data-move-up>Move up</button>
        <button class="small" data-move-down>Move down</button>
      </div>

      <h2>Video</h2>
      <div class="row">
        <div class="seg" id="sizes" role="group" aria-label="Video size"></div>
        <select id="corner" aria-label="Video corner">
          <option value="bottom-left">Bottom left</option>
          <option value="top-left">Top left</option>
          <option value="bottom-right">Bottom right</option>
          <option value="top-right">Top right</option>
        </select>
        <button class="small" id="toggle-video"></button>
      </div>
      <p class="hint">Drag the video box on the slide, or drag its handle to resize.</p>
      <div class="row">
        <button class="small" id="apply-excerpt">Apply video box to this excerpt</button>
        <button class="small" id="apply-deck">Apply to whole deck</button>
      </div>

      <h2>Title</h2>
      <input id="slide-title" type="text" />
      <div class="row" style="margin-top:8px">
        <button class="small" id="toggle-title"></button>
      </div>

      <h2>Pages</h2>
      <div class="row" id="page-tools"></div>

      <div class="row" style="margin-top:20px">
        <button class="small danger" id="delete-slide">Delete slide</button>
        <button class="small" id="duplicate-slide">Duplicate</button>
        <button class="small" id="reset-slide">Reset to default</button>
      </div>
    </div>
  `)

  const commit = () => {
    project.planEditedAt = Date.now()
    save()
  }

  const editor = mountSlideEditor(root.querySelector('#canvas'), {
    slide,
    excerpt,
    ctx,
    onChange: commit,
  })

  const sizes = root.querySelector('#sizes')
  for (const key of Object.keys(VIDEO_SIZES)) {
    const button = document.createElement('button')
    button.textContent = key
    button.setAttribute('aria-pressed', String(Math.abs((slide.video?.w ?? 0) - VIDEO_SIZES[key]) < 0.005))
    button.onclick = () => {
      editor.setVideoSize(key)
      renderSlideEditorView(projectId, slideIndex)
    }
    sizes.appendChild(button)
  }

  const corner = root.querySelector('#corner')
  corner.value = slide.video?.corner || 'bottom-left'
  corner.onchange = () => editor.setCorner(corner.value)
  corner.disabled = !slide.video

  const toggleVideo = root.querySelector('#toggle-video')
  toggleVideo.textContent = slide.video ? 'Hide video here' : 'Show video here'
  toggleVideo.onclick = () => {
    editor.toggleVideo()
    renderSlideEditorView(projectId, slideIndex)
  }

  root.querySelector('#apply-excerpt').onclick = () => {
    applyVideoBox(project, slide, (other) => other.excerptId === slide.excerptId)
    commit()
    toast('Applied to this excerpt')
  }
  root.querySelector('#apply-deck').onclick = () => {
    applyVideoBox(project, slide, () => true)
    commit()
    toast('Applied to the whole deck')
  }

  const titleInput = root.querySelector('#slide-title')
  titleInput.value = slide.title || ''
  titleInput.oninput = () => {
    slide.title = titleInput.value
    slide.edited = true
    commit()
  }
  const toggleTitle = root.querySelector('#toggle-title')
  toggleTitle.textContent = slide.showTitle === false ? 'Show title' : 'Hide title'
  toggleTitle.onclick = () => {
    editor.toggleTitle()
    renderSlideEditorView(projectId, slideIndex)
  }

  const pageTools = root.querySelector('#page-tools')
  if ((slide.images || []).length === 2) {
    const swap = element('<button class="small">Swap pages</button>')
    swap.onclick = () => editor.swapPages()
    pageTools.appendChild(swap)
    const single = element('<button class="small">One page per slide</button>')
    single.onclick = () => {
      splitSlide(project, index)
      commit()
      go(`#/p/${project.id}/storyboard`)
    }
    pageTools.appendChild(single)
  }
  ;(slide.images || []).forEach((image, imageIndex) => {
    const rotate = element(`<button class="small">Rotate page ${image.page + 1}</button>`)
    rotate.onclick = () => editor.rotatePage(imageIndex)
    pageTools.appendChild(rotate)
  })
  if (!(slide.images || []).length) pageTools.appendChild(element('<span class="meta">No score pages on this slide.</span>'))

  const navigate = (delta) => {
    const target = index + delta
    if (target < 0 || target >= project.slidePlan.length) return
    go(`#/p/${project.id}/slide/${target}`)
  }
  root.querySelector('[data-prev]').onclick = () => navigate(-1)
  root.querySelector('[data-next]').onclick = () => navigate(1)
  root.querySelector('[data-prev]').disabled = index === 0
  root.querySelector('[data-next]').disabled = index === project.slidePlan.length - 1

  const moveSlide = (delta) => {
    const target = index + delta
    if (target < 0 || target >= project.slidePlan.length) return
    const [moved] = project.slidePlan.splice(index, 1)
    project.slidePlan.splice(target, 0, moved)
    commit()
    go(`#/p/${project.id}/slide/${target}`)
  }
  root.querySelector('[data-move-up]').onclick = () => moveSlide(-1)
  root.querySelector('[data-move-down]').onclick = () => moveSlide(1)

  root.querySelector('#delete-slide').onclick = () => {
    project.slidePlan.splice(index, 1)
    commit()
    go(`#/p/${project.id}/storyboard`)
  }
  root.querySelector('#duplicate-slide').onclick = () => {
    project.slidePlan.splice(index + 1, 0, {
      ...structuredClone(slide),
      id: uid('slide'),
      manual: true,
      edited: true,
    })
    commit()
    go(`#/p/${project.id}/storyboard`)
  }
  root.querySelector('#reset-slide').onclick = () => {
    delete slide.edited
    project.slidePlan[index] = reconcileSlidePlan({ ...project, slidePlan: null }).find(
      (candidate) => candidate.id === slide.id
    ) || slide
    commit()
    renderSlideEditorView(projectId, slideIndex)
  }

  view.replaceChildren(root)
}

function applyVideoBox(project, source, matches) {
  const box = source.video
  for (const slide of project.slidePlan) {
    if (slide === source || !matches(slide)) continue
    slide.video = box ? { ...slide.video, ...box, excerptId: slide.excerptId } : null
    slide.edited = true
    const excerpt = findExcerpt(project, slide.excerptId)
    if (excerpt) relayoutImages(slide, excerpt)
  }
}

/* ---------------------------------------------------------------- export */

async function renderExport(projectId) {
  releasePlayers()
  const project = await loadProject(projectId)
  if (!project) {
    go('#/')
    return
  }
  titleBar.textContent = 'Export'
  backButton.hidden = false
  backButton.onclick = () => go(`#/p/${project.id}`)
  project.slidePlan = reconcileSlidePlan(project)

  const offline = canExportOffline(project)
  const issues = projectIssues(project)
  const root = element(`
    <div>
      <div class="card">
        <h3>${offline ? 'This deck exports offline' : 'This deck needs the local worker'}</h3>
        <div class="meta">${
          offline
            ? 'Uploaded videos only — scores are rendered and the .pptx is built right here in the browser.'
            : 'A YouTube excerpt (or an exact trim) needs yt-dlp and ffmpeg, so the worker has to be running.'
        }</div>
      </div>

      <label for="format">Format</label>
      <select id="format">
        <option value="pptx">PowerPoint .pptx — opens in Keynote</option>
        <option value="key">Keynote .key — zip with a Mac helper</option>
      </select>
      <div class="hint" id="format-hint"></div>

      <div id="worker-config" ${offline ? 'hidden' : ''}>
        <label for="worker-url">Worker URL</label>
        <input id="worker-url" type="url" />
        <div class="row" style="margin-top:8px">
          <button class="small" id="check-worker">Check worker</button>
          <span class="meta" id="worker-status"></span>
        </div>
      </div>

      <ul class="issues" id="issues" ${issues.length ? '' : 'hidden'}></ul>

      <div class="row" style="margin-top:16px">
        <button class="primary" id="run" ${issues.length ? 'disabled' : ''}>Build deck</button>
        <span class="spacer"></span>
        <span class="badge">${project.slidePlan.length} slides</span>
      </div>
      <div class="progress-log" id="log" hidden></div>
    </div>
  `)

  const issueList = root.querySelector('#issues')
  for (const issue of issues) {
    const item = document.createElement('li')
    item.textContent = issue
    issueList.appendChild(item)
  }

  const workerInput = root.querySelector('#worker-url')
  workerInput.value = state.workerUrl
  workerInput.onchange = async () => {
    state.workerUrl = workerInput.value.trim()
    await setSetting('workerUrl', state.workerUrl)
  }
  root.querySelector('#check-worker').onclick = async () => {
    const status = root.querySelector('#worker-status')
    status.textContent = 'Checking…'
    const result = await checkWorker(state.workerUrl)
    status.textContent = result.ok
      ? `Worker ready (yt-dlp ${result.ytdlp ? 'ok' : 'missing'}, ffmpeg ${result.ffmpeg ? 'ok' : 'missing'})`
      : `Not reachable: ${result.error}`
  }

  const formatSelect = root.querySelector('#format')
  const formatHint = root.querySelector('#format-hint')
  const describeFormat = () => {
    formatHint.textContent =
      formatSelect.value === 'key'
        ? 'Only Keynote can write .key, so you get a zip: the deck plus a “Make Keynote.command” to double-click on your Mac. It saves the .key next to the deck.'
        : 'Keynote opens .pptx directly (File ▸ Open) and edits it like any other deck.'
  }
  formatSelect.onchange = describeFormat
  describeFormat()

  const log = root.querySelector('#log')
  const append = (message) => {
    log.hidden = false
    const line = document.createElement('div')
    line.textContent = message
    log.appendChild(line)
    log.scrollTop = log.scrollHeight
  }

  root.querySelector('#run').onclick = async (event) => {
    const button = event.currentTarget
    button.disabled = true
    log.replaceChildren()
    try {
      const format = formatSelect.value
      if (offline) await exportOffline(project, project.slidePlan, { onProgress: append, format })
      else
        await exportViaWorker(project, project.slidePlan, {
          baseUrl: state.workerUrl,
          onProgress: append,
          format,
        })
      append('Done — check your downloads.')
      toast('Deck exported')
    } catch (error) {
      append(`Failed: ${error.message}`)
      toast(error.message, 6000)
    } finally {
      button.disabled = false
    }
  }

  view.replaceChildren(root)
}

/* ---------------------------------------------------------------- routing */

async function route() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  const parts = hash.split('/').filter(Boolean)
  try {
    if (parts[0] !== 'p') {
      await renderProjects()
      return
    }
    const projectId = parts[1]
    if (parts[2] === 'e') await renderExcerpt(projectId, parts[3])
    else if (parts[2] === 'storyboard') await renderStoryboard(projectId)
    else if (parts[2] === 'slide') await renderSlideEditorView(projectId, parts[3])
    else if (parts[2] === 'export') await renderExport(projectId)
    else await renderProject(projectId)
  } catch (error) {
    view.replaceChildren(element('<div class="empty"></div>'))
    view.firstElementChild.textContent = `Something went wrong: ${error.message}`
  }
}

window.addEventListener('hashchange', route)
window.addEventListener('beforeunload', () => {
  if (state.project) putProject(state.project)
})

state.workerUrl = (await getSetting('workerUrl')) || state.workerUrl
await requestPersistence()
await route()
