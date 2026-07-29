/**
 * pptxgenjs writes a fresh copy of the video into ppt/media for every slide that shows it, so a
 * 40 MB clip on five slides makes a 200 MB deck. Media is only referenced from the .rels parts
 * (and [Content_Types].xml maps by extension), so identical files can be collapsed into one and
 * the relationship targets repointed. Runs in the browser and in the worker.
 */

const MEDIA_PREFIX = 'ppt/media/'

function checksum(bytes) {
  let hash = 2166136261
  for (let i = 0; i < bytes.length; i += 1) {
    hash ^= bytes[i]
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

function escapeForRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * @param {Blob|ArrayBuffer|Uint8Array} deck as produced by composeDeck
 * @param {Function} JSZip constructor
 * @param {'blob'|'nodebuffer'} outputType
 * @returns {Promise<{deck: Blob|Buffer, removed: number}>}
 */
export async function dedupeMedia(deck, JSZip, outputType = 'blob') {
  const zip = await new JSZip().loadAsync(deck)
  const mediaNames = Object.keys(zip.files).filter(
    (name) => name.startsWith(MEDIA_PREFIX) && !zip.files[name].dir
  )

  const canonicalByHash = new Map()
  const replacements = new Map()
  for (const name of mediaNames) {
    const bytes = await zip.file(name).async('uint8array')
    const key = `${bytes.length}:${checksum(bytes)}:${name.split('.').pop()}`
    const canonical = canonicalByHash.get(key)
    if (!canonical) canonicalByHash.set(key, name)
    else if (canonical !== name) replacements.set(name, canonical)
  }

  if (replacements.size) {
    for (const name of Object.keys(zip.files).filter((file) => file.endsWith('.rels'))) {
      let xml = await zip.file(name).async('string')
      for (const [duplicate, canonical] of replacements) {
        xml = xml.replace(
          new RegExp(escapeForRegExp(duplicate.slice(MEDIA_PREFIX.length)), 'g'),
          canonical.slice(MEDIA_PREFIX.length)
        )
      }
      zip.file(name, xml)
    }
    for (const duplicate of replacements.keys()) zip.remove(duplicate)
  }

  const compression = { type: outputType, compression: 'DEFLATE', compressionOptions: { level: 3 } }
  return { deck: await zip.generateAsync(compression), removed: replacements.size }
}
