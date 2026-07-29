/** Thin wrapper over the YouTube IFrame API so timestamps can be grabbed from the player. */

import { parseYouTubeId } from './model.js'

let apiPromise = null

function loadApi() {
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    if (globalThis.YT?.Player) {
      resolve(globalThis.YT)
      return
    }
    const previous = globalThis.onYouTubeIframeAPIReady
    globalThis.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(globalThis.YT)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.onerror = () => reject(new Error('Could not load the YouTube player'))
    document.head.appendChild(script)
  })
  return apiPromise
}

/** Mounts a player into `container` and resolves with { currentTime, duration, seekTo, destroy }. */
export async function mountPlayer(container, url) {
  const videoId = parseYouTubeId(url)
  if (!videoId) throw new Error('Unrecognised YouTube link')
  const YT = await loadApi()
  const host = document.createElement('div')
  container.replaceChildren(host)

  const player = await new Promise((resolve) => {
    const instance = new YT.Player(host, {
      videoId,
      playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
      events: { onReady: () => resolve(instance) },
    })
  })

  return {
    currentTime: () => player.getCurrentTime?.() ?? null,
    duration: () => player.getDuration?.() ?? null,
    seekTo: (seconds) => player.seekTo?.(seconds, true),
    destroy: () => player.destroy?.(),
  }
}
