/**
 * Keynote output.
 *
 * Keynote's `.key` is an undocumented, protobuf-based package: nothing but Keynote itself can write
 * one. So the ".key" format ships the deck together with a double-clickable helper that asks the
 * Keynote on the user's Mac to open the deck and save it as a real `.key` — the conversion happens
 * in Keynote, which is also what keeps the media and the layout intact.
 */

const HELPER_NAME = 'Make Keynote.command'

const HELPER = `#!/bin/bash
# Double-click this file to turn the deck next to it into a Keynote (.key) document.
# It needs Keynote installed; nothing is uploaded anywhere.
set -euo pipefail
cd "$(dirname "$0")"

deck="$(ls -1 *.pptx 2>/dev/null | head -n 1 || true)"
if [ -z "$deck" ]; then
  echo "No .pptx found next to this script. Keep both files in the same folder."
  read -r -p "Press return to close." _
  exit 1
fi

out="\${deck%.pptx}.key"
echo "Converting $deck -> $out (Keynote will open for a moment)…"

if ! osascript <<APPLESCRIPT
set deckFile to POSIX file "$PWD/$deck"
set keyFile to POSIX file "$PWD/$out"
tell application "Keynote"
  activate
  set doc to open deckFile
  delay 1
  save doc in keyFile
  close doc saving no
end tell
APPLESCRIPT
then
  echo "Keynote could not be driven automatically (is it installed, and did you allow the"
  echo "automation prompt?). Open $deck in Keynote and use File > Save As instead."
  read -r -p "Press return to close." _
  exit 1
fi

echo "Done: $PWD/$out"
read -r -p "Press return to close." _
`

const README = `Keynote export
==============

1. Keep both files in the same folder.
2. Double-click "${HELPER_NAME}". macOS may refuse the first time — then right-click it and
   choose Open, or run  chmod +x "${HELPER_NAME}"  in Terminal first.
3. Keynote opens the deck, saves it as a .key next to it, and closes again.

Doing it by hand works just as well: open the .pptx in Keynote, then File > Save As.

Keynote re-encodes video on import, so play one slide before rehearsing with it. If a slide's video
covers the whole clip rather than the excerpt, the deck was built offline (the browser cannot trim);
build it again with the local worker running for an exactly trimmed clip.
`

/**
 * @param {object}  options
 * @param {typeof import('jszip')} options.JSZip
 * @param {Blob|Uint8Array} options.deck  the composed .pptx
 * @param {string}  options.name          file name stem, e.g. "nso-bass-cl-audition-2026"
 * @param {'blob'|'nodebuffer'} options.output
 */
export async function keynoteBundle({ JSZip, deck, name, output = 'blob' }) {
  const zip = new JSZip()
  zip.file(`${name}.pptx`, deck)
  // Executable bit so the helper is double-clickable straight out of the archive.
  zip.file(HELPER_NAME, HELPER, { unixPermissions: 0o755 })
  zip.file('README.txt', README)
  return zip.generateAsync({ type: output, platform: 'UNIX', compression: 'DEFLATE' })
}

export { HELPER_NAME }
