/**
 * Exposes the vendored browser bundles to Node so the tests need no npm install (and exercise
 * exactly the builds the app ships). They are plain <script> bundles that declare globals, so they
 * are evaluated in a vm context with `window`/`self` pointing at it; pptxgen.bundle.js inlines the
 * same JSZip 3.10.1 the page loads separately.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const bundle = join(dirname(fileURLToPath(import.meta.url)), 'web', 'vendor', 'pptxgen.bundle.js')
const context = vm.createContext({ Buffer, TextDecoder, TextEncoder, URL, console, setTimeout, clearTimeout })
context.window = context
context.self = context
context.global = context
vm.runInContext(readFileSync(bundle, 'utf8'), context, { filename: 'pptxgen.bundle.js' })

export const { JSZip, PptxGenJS } = context
