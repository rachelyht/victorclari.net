import { readdir } from 'node:fs/promises'
import path from 'node:path'

import { run } from './tools.js'

const RASTER_DPI = 150

/** Rasterises a score to PNGs in page order. Images are returned untouched. */
export async function rasterizeScore(file, outputDir, prefix) {
  if (!file.toLowerCase().endsWith('.pdf')) return [file]
  await run('pdftoppm', ['-r', String(RASTER_DPI), '-png', file, path.join(outputDir, prefix)])
  const names = (await readdir(outputDir)).filter((name) => name.startsWith(`${prefix}-`))
  return names
    .sort((a, b) => Number(a.match(/-(\d+)\.png$/)?.[1] || 0) - Number(b.match(/-(\d+)\.png$/)?.[1] || 0))
    .map((name) => path.join(outputDir, name))
}
