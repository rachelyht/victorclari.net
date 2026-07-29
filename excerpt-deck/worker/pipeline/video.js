import { existsSync } from 'node:fs'
import path from 'node:path'

import { run } from './tools.js'

/** Downloads a YouTube video as mp4, reusing the file when several excerpts share a video. */
export async function downloadYouTube(url, cacheDir, videoId) {
  const output = path.join(cacheDir, `${videoId}.mp4`)
  if (existsSync(output)) return output
  await run('yt-dlp', [
    '--no-playlist',
    '--no-progress',
    '-f',
    'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    '--merge-output-format',
    'mp4',
    '-o',
    output,
    url,
  ])
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
