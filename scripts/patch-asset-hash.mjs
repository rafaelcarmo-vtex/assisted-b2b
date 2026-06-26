// Runs after vite build to sync the JS bundle hash across all static HTML files
// (public/, dist/, and hierarchical-approval/) that hardcode the asset path.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_ASSETS = path.resolve(__dirname, '../demo/b2b-sales/dist/assets')

const jsFile = fs.readdirSync(DIST_ASSETS).find(f => f.startsWith('index-') && f.endsWith('.js'))
if (!jsFile) { console.error('No index-*.js found in dist/assets'); process.exit(1) }
const cssFile = fs.readdirSync(DIST_ASSETS).find(f => f.startsWith('index-') && f.endsWith('.css'))
if (!cssFile) { console.error('No index-*.css found in dist/assets'); process.exit(1) }

const searchDirs = [
  path.resolve(__dirname, '../demo/b2b-sales/public'),
  path.resolve(__dirname, '../demo/b2b-sales/dist'),
  path.resolve(__dirname, '../demo/hierarchical-approval'),
]

const JS_RE  = /index-[A-Za-z0-9_\-]+\.js/g
const CSS_RE = /index-[A-Za-z0-9_\-]+\.css/g
let patched = 0

function patchDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) { patchDir(full); continue }
    if (!entry.name.endsWith('.html')) continue
    const src = fs.readFileSync(full, 'utf8')
    const out = src.replace(JS_RE, jsFile).replace(CSS_RE, cssFile)
    if (out !== src) { fs.writeFileSync(full, out); patched++ }
  }
}

searchDirs.forEach(patchDir)
console.log(`patch-asset-hash: set ${jsFile} + ${cssFile} in ${patched} file(s)`)
