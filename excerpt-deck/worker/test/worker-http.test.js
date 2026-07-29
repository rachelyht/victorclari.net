/**
 * Drives the worker over HTTP the way the browser does, with a full score split across three
 * separate image files, and checks the returned deck. Skipped when ffmpeg is unavailable.
 */

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { buildSlidePlan } from '../../web/js/slide-plan.js'
import { hasTool, run } from '../pipeline/tools.js'

const PORT = 8899
const SERVER = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server.js')

async function waitForHealth(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(`${url}/health`)
      if (response.ok) return response.json()
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('worker did not become healthy')
}

test('worker builds a deck from a score split over several files', { skip: !(await hasTool('ffmpeg')) }, async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'excerpt-deck-http-'))
  const base = `http://127.0.0.1:${PORT}`
  const worker = spawn(process.execPath, [SERVER], {
    env: { ...process.env, PORT: String(PORT), WORK_DIR: path.join(dir, 'jobs') },
    stdio: 'ignore',
  })

  try {
    await waitForHealth(base)

    const page = async (name, text) => {
      const file = path.join(dir, name)
      await run('ffmpeg', [
        '-y', '-f', 'lavfi', '-i', 'color=c=white:s=595x842',
        '-vf', `drawtext=text='${text}':fontcolor=black:fontsize=48:x=40:y=60`,
        '-frames:v', '1', file,
      ])
      return file
    }
    const clip = path.join(dir, 'clip.mp4')
    await run('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=15:duration=8',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', clip,
    ])

    const partFile = await page('part.png', 'Part')
    const fullFiles = [await page('f1.png', 'Full 1'), await page('f2.png', 'Full 2'), await page('f3.png', 'Full 3')]

    const excerptId = 'exc1'
    const pages = (count) => Array.from({ length: count }, () => ({ w: 595, h: 842 }))
    const plan = buildSlidePlan({
      excerpts: [
        {
          id: excerptId,
          title: 'Mahler 1',
          partScore: { pageCount: 1, pages: pages(1) },
          fullScore: { pageCount: 3, pages: pages(3) },
          video: { source: 'upload', startSec: 2, endSec: 5 },
        },
      ],
    })
    assert.equal(plan.length, 3, 'part slide + two full-score slides')

    const manifest = {
      title: 'NSO audition',
      plan,
      excerpts: [
        {
          id: excerptId,
          title: 'Mahler 1',
          video: { source: 'upload', startSec: 2, endSec: 5, file: { field: `video:${excerptId}`, name: 'clip.mp4' } },
          partScore: { files: [{ field: `partScore:${excerptId}:0`, name: 'part.png' }] },
          fullScore: {
            files: fullFiles.map((file, index) => ({
              field: `fullScore:${excerptId}:${index}`,
              name: path.basename(file),
            })),
          },
        },
      ],
    }

    const form = new FormData()
    form.append('manifest', JSON.stringify(manifest))
    const attach = async (field, file, type) =>
      form.append('files', new Blob([await readFile(file)], { type }), field)
    await attach(`partScore:${excerptId}:0`, partFile, 'image/png')
    for (const [index, file] of fullFiles.entries()) {
      await attach(`fullScore:${excerptId}:${index}`, file, 'image/png')
    }
    await attach(`video:${excerptId}`, clip, 'video/mp4')

    const created = await fetch(`${base}/jobs`, { method: 'POST', body: form })
    assert.equal(created.status, 200)
    const { jobId } = await created.json()

    let job
    for (let i = 0; i < 120; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      job = await (await fetch(`${base}/jobs/${jobId}`)).json()
      if (job.state !== 'running') break
    }
    assert.equal(job.state, 'done', `job failed: ${job.error || job.message}`)

    const download = await fetch(`${base}/jobs/${jobId}/download`)
    assert.equal(download.status, 200)
    const deckPath = path.join(dir, 'deck.pptx')
    await writeFile(deckPath, Buffer.from(await download.arrayBuffer()))

    await run('unzip', ['-o', deckPath, '-d', path.join(dir, 'un')])
    const slides = (await readdir(path.join(dir, 'un', 'ppt', 'slides'))).filter((name) => name.endsWith('.xml'))
    assert.equal(slides.length, 3)
    const media = await readdir(path.join(dir, 'un', 'ppt', 'media'))
    assert.equal(media.filter((name) => name.endsWith('.mp4')).length, 1, 'trimmed clip embedded once')
    // part page + three distinct full pages + poster, each stored once
    assert.equal(media.filter((name) => name.endsWith('.png')).length, 5)
  } finally {
    worker.kill()
    await rm(dir, { recursive: true, force: true })
  }
})
