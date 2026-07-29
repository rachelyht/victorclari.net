/**
 * Storyboard: renders the SlidePlan at true 16:9 proportions and lets the plan be adjusted
 * before export. Everything it edits is plain data on the slide objects, so what is previewed
 * here is exactly what deck-pptx.js lays out.
 */

import { imageKey } from './deck-pptx.js'
import { VIDEO_SIZES } from './model.js'
import { contentBox, fitContain, videoBox } from './slide-plan.js'
import { formatTime } from './util.js'

const TITLE = { x: 0.03, y: 0.015, w: 0.94, h: 0.075 }

function percent(value) {
  return `${value * 100}%`
}

function place(element, box) {
  element.style.left = percent(box.x)
  element.style.top = percent(box.y)
  element.style.width = percent(box.w)
  element.style.height = percent(box.h)
}

export function renderSlide(slide, ctx, { editable = false } = {}) {
  const root = document.createElement('div')
  root.className = editable ? 'slide editable' : 'slide'

  if (slide.showTitle !== false && slide.title) {
    const title = document.createElement('div')
    title.className = 'slide-title'
    title.textContent = slide.title
    place(title, TITLE)
    title.style.fontSize = 'clamp(6px, 2.2cqw, 18px)'
    root.appendChild(title)
  }

  for (const image of slide.images || []) {
    const data = ctx.images.get(imageKey(slide.excerptId, image.source, image.page))
    const element = document.createElement(data ? 'img' : 'div')
    element.className = 'score'
    if (data) element.src = data
    else element.style.background = 'repeating-linear-gradient(45deg,#eee,#eee 6px,#e0e0e0 6px,#e0e0e0 12px)'
    element.style.position = 'absolute'
    if (image.rotate) element.style.transform = `rotate(${image.rotate}deg)`
    place(element, image)
    root.appendChild(element)
  }

  if (slide.video) {
    const video = ctx.videos.get(slide.video.excerptId)
    const box = document.createElement('div')
    box.className = 'video-box'
    box.dataset.role = 'video'
    if (video?.poster) box.style.backgroundImage = `url(${video.poster})`
    place(box, slide.video)
    const label = document.createElement('span')
    label.textContent = video?.label || 'video'
    box.appendChild(label)
    if (editable) {
      const handle = document.createElement('div')
      handle.dataset.role = 'resize'
      handle.style.cssText =
        'position:absolute;right:-7px;bottom:-7px;width:18px;height:18px;border-radius:50%;background:var(--accent);cursor:nwse-resize;touch-action:none'
      box.appendChild(handle)
    }
    root.appendChild(box)
  }

  root.style.containerType = 'inline-size'
  return root
}

export function videoLabelFor(excerpt) {
  const { startSec, endSec } = excerpt.video
  if (startSec == null || endSec == null) return 'video'
  return `${formatTime(startSec)} – ${formatTime(endSec)}`
}

/** Re-fits the images of a slide after its video box or 2-up/1-up choice changed. */
export function relayoutImages(slide, excerpt) {
  const box = contentBox(slide.video)
  const refs = { partScore: excerpt.partScore, fullScore: excerpt.fullScore }
  const images = slide.images || []
  if (!images.length) return
  const count = images.length
  const gap = 0.015
  const cells =
    count === 1
      ? [box]
      : Array.from({ length: count }, (_, i) => {
          const w = (box.w - gap * (count - 1)) / count
          return { ...box, x: box.x + i * (w + gap), w }
        })
  slide.images = images.map((image, i) => {
    const ref = refs[image.source]
    const page = ref?.pages?.[image.page]
    const aspect = page?.w && page?.h ? page.w / page.h : 1 / Math.SQRT2
    const rotated = (image.rotate || 0) % 180 !== 0
    return { ...image, ...fitContain(cells[i], rotated ? 1 / aspect : aspect) }
  })
}

const pageTitle = (title, page) => `${(title || '').replace(/\s+—\s+full score\s+p\..*$/, '')} — full score p. ${page + 1}`

/**
 * Turns a 2-up slide into one slide per page. The first keeps the generated id (as an edit) and
 * the second becomes a manual slide, so `reconcileSlidePlan` does not resurrect the 2-up slide.
 */
export function splitSlide(project, index) {
  const plan = project.slidePlan || []
  const slide = plan[index]
  if ((slide?.images || []).length < 2) return plan
  const excerpt = project.excerpts.find((candidate) => candidate.id === slide.excerptId)

  const parts = slide.images.map((image, position) => {
    const part = {
      ...slide,
      id: position === 0 ? slide.id : `${slide.id}:p${image.page}`,
      title: slide.kind === 'full' ? pageTitle(slide.title, image.page) : slide.title,
      images: [{ ...image }],
      edited: true,
      manual: position > 0,
    }
    if (excerpt) relayoutImages(part, excerpt)
    return part
  })

  project.slidePlan = [...plan.slice(0, index), ...parts, ...plan.slice(index + 1)]
  project.planEditedAt = Date.now()
  return project.slidePlan
}

function clampBox(box) {
  const w = Math.min(0.6, Math.max(0.06, box.w))
  const h = (w / box.w) * box.h
  return {
    w,
    h,
    x: Math.min(Math.max(0, box.x), 1 - w),
    y: Math.min(Math.max(0, box.y), 1 - h),
  }
}

/** Pointer drag / resize of the video box, in slide fractions. */
function attachVideoGestures(slideElement, slide, onCommit) {
  const boxElement = slideElement.querySelector('[data-role="video"]')
  if (!boxElement) return
  let mode = null
  let origin = null

  const onDown = (event) => {
    mode = event.target.dataset.role === 'resize' ? 'resize' : 'move'
    origin = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      rect: slideElement.getBoundingClientRect(),
      box: { ...slide.video },
    }
    boxElement.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const onMove = (event) => {
    if (!mode) return
    const dx = (event.clientX - origin.pointerX) / origin.rect.width
    const dy = (event.clientY - origin.pointerY) / origin.rect.height
    const next =
      mode === 'move'
        ? clampBox({ ...origin.box, x: origin.box.x + dx, y: origin.box.y + dy })
        : clampBox({ ...origin.box, w: origin.box.w + dx, h: origin.box.h + dx * (origin.box.h / origin.box.w) })
    slide.video = { ...slide.video, ...next }
    place(boxElement, slide.video)
  }

  const onUp = () => {
    if (!mode) return
    mode = null
    slide.edited = true
    onCommit()
  }

  boxElement.addEventListener('pointerdown', onDown)
  boxElement.addEventListener('pointermove', onMove)
  boxElement.addEventListener('pointerup', onUp)
  boxElement.addEventListener('pointercancel', onUp)
}

export function mountSlideEditor(container, { slide, excerpt, ctx, onChange }) {
  const commit = () => {
    relayoutImages(slide, excerpt)
    onChange()
  }

  const draw = () => {
    const element = renderSlide(slide, ctx, { editable: true })
    attachVideoGestures(element, slide, () => {
      relayoutImages(slide, excerpt)
      onChange()
      draw()
    })
    container.replaceChildren(element)
  }

  const api = {
    setVideoSize(sizeKey) {
      const corner = slide.video?.corner || 'bottom-left'
      slide.video = { ...slide.video, ...videoBox(VIDEO_SIZES[sizeKey], corner), corner }
      slide.edited = true
      commit()
      draw()
    },
    setCorner(corner) {
      slide.video = { ...slide.video, ...videoBox(slide.video.w, corner), corner }
      slide.edited = true
      commit()
      draw()
    },
    toggleVideo() {
      slide.video = slide.video ? null : { excerptId: excerpt.id, ...videoBox() }
      slide.edited = true
      commit()
      draw()
    },
    toggleTitle() {
      slide.showTitle = slide.showTitle === false
      slide.edited = true
      onChange()
      draw()
    },
    setTitle(text) {
      slide.title = text
      slide.edited = true
      onChange()
      draw()
    },
    swapPages() {
      if ((slide.images || []).length !== 2) return
      const [a, b] = slide.images
      slide.images = [
        { ...b, x: a.x, y: a.y, w: a.w, h: a.h },
        { ...a, x: b.x, y: b.y, w: b.w, h: b.h },
      ]
      slide.edited = true
      commit()
      draw()
    },
    rotatePage(index) {
      const image = slide.images?.[index]
      if (!image) return
      image.rotate = ((image.rotate || 0) + 90) % 360
      slide.edited = true
      commit()
      draw()
    },
    redraw: draw,
  }

  draw()
  return api
}
