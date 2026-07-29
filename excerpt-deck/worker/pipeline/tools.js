import { spawn } from 'node:child_process'

export function run(command, args, { cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk
      if (stderr.length > 20000) stderr = stderr.slice(-20000)
    })
    child.on('error', (error) =>
      reject(new Error(`${command} could not be started: ${error.message}`))
    )
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}: ${stderr.trim().split('\n').pop()}`))
    )
  })
}

const VERSION_FLAGS = ['-version', '--version', '-v']

export async function hasTool(command) {
  for (const flag of VERSION_FLAGS) {
    try {
      await run(command, [flag])
      return true
    } catch {
      /* try the next flag — poppler tools only answer to -v */
    }
  }
  return false
}
