/** Same interface as youtube.js, backed by a local <video> element for uploaded files. */

export function mountLocalPlayer(container, blob) {
  const url = URL.createObjectURL(blob)
  const video = document.createElement('video')
  video.src = url
  video.controls = true
  video.playsInline = true
  video.preload = 'metadata'
  container.replaceChildren(video)

  return {
    element: video,
    currentTime: () => video.currentTime,
    duration: () => (Number.isFinite(video.duration) ? video.duration : null),
    seekTo: (seconds) => {
      video.currentTime = seconds
    },
    destroy: () => {
      video.pause()
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(url)
    },
  }
}
