import { existsSync } from 'node:fs'
import path from 'node:path'

import { run } from './tools.js'

/**
 * YouTube answers some requests with "Sign in to confirm you're not a bot"; passing the cookies of
 * a signed-in browser is the documented way through, so both forms are configurable.
 *   YTDLP_COOKIES_FROM_BROWSER=safari|chrome|firefox   YTDLP_COOKIES=/path/to/cookies.txt
 */
function cookieArgs() {
  const browser = process.env.YTDLP_COOKIES_FROM_BROWSER
  if (browser) return ['--cookies-from-browser', browser]
  const file = process.env.YTDLP_COOKIES
  return file ? ['--cookies', file] : []
}

/** Downloads a YouTube video as mp4, reusing the file when several excerpts share a video. */
export async function downloadYouTube(url, cacheDir, videoId) {
  const output = path.join(cacheDir, `${videoId}.mp4`)
  if (existsSync(output)) return output
  try {
    await run('yt-dlp', [
      '--no-playlist',
      '--no-progress',
      ...cookieArgs(),
      '-f',
      'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format',
      'mp4',
      '-o',
      output,
      url,
    ])
  } catch (error) {
    if (/not a bot|Sign in to confirm/i.test(error.message) && !cookieArgs().length) {
      throw new Error(
        'YouTube asked yt-dlp to sign in. Restart the worker with ' +
          'YTDLP_COOKIES_FROM_BROWSER=safari (or chrome/firefox) so it can use your browser session.'
      )
    }
    throw error
  }
  return output
}

/** Exact, keyframe-independent trim (re-encodes) so the clip starts precisely on the timestamp. */
export async function trim(input, output, startSec, endSec) {
  await run('ffmpeg', [
    '-y',
    '-ss',
    String(startSec),
    '-to',
    String(endSec),
    '-i',
    input,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-movflags',
    '+faststart',
    output,
  ])
  return output
}

export async function poster(input, output, atSec = 0) {
  await run('ffmpeg', ['-y', '-ss', String(atSec), '-i', input, '-frames:v', '1', output])
  return output
}
