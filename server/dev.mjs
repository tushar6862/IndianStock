import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { startServer } from './index.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
startServer()

const viteBin = join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const child = spawn(process.execPath, [viteBin], { cwd: root, stdio: 'inherit' })

function stop() {
  child.kill()
  process.exit(0)
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
child.on('exit', (code) => process.exit(code ?? 0))
