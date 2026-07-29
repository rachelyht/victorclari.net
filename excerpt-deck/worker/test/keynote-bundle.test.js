import assert from 'node:assert/strict'
import { test } from 'node:test'

import JSZip from 'jszip'

import { HELPER_NAME, keynoteBundle } from '../../web/js/keynote-bundle.js'

const deck = Buffer.from('pretend .pptx')

test('the bundle carries the deck, a double-clickable helper and instructions', async () => {
  const bundle = await keynoteBundle({ JSZip, deck, name: 'nso-audition', output: 'nodebuffer' })
  const zip = await new JSZip().loadAsync(bundle)

  assert.deepEqual(Object.keys(zip.files).sort(), ['Make Keynote.command', 'README.txt', 'nso-audition.pptx'])
  assert.equal(await zip.file('nso-audition.pptx').async('string'), 'pretend .pptx')
  // 0o755 lands in the high bits of the zip's external attributes.
  assert.equal(zip.file(HELPER_NAME).unixPermissions & 0o777, 0o755)
})

test('the helper converts the neighbouring .pptx through Keynote itself', async () => {
  const bundle = await keynoteBundle({ JSZip, deck, name: 'deck', output: 'nodebuffer' })
  const zip = await new JSZip().loadAsync(bundle)
  const helper = await zip.file(HELPER_NAME).async('string')

  assert.match(helper, /^#!\/bin\/bash/)
  assert.match(helper, /cd "\$\(dirname "\$0"\)"/)
  assert.match(helper, /ls -1 \*\.pptx/)
  assert.match(helper, /\$\{deck%\.pptx\}\.key/)
  assert.match(helper, /tell application "Keynote"/)
  assert.match(helper, /save doc in keyFile/)
  // No unexpanded placeholders: only the shell's own variables may survive.
  assert.equal(helper.includes('${name}'), false)

  const readme = await zip.file('README.txt').async('string')
  assert.match(readme, /Save As/)
  assert.match(readme, /chmod \+x/)
})
