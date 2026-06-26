// One-shot: rewrite root-absolute refs in hierarchical-approval HTML so they
// work on GitHub Pages (served under /assisted-b2b/) as well as the local server.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../demo/hierarchical-approval')
const PREFIX = '/assisted-b2b/demo/hierarchical-approval'

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, acc)
    else if (e.name.endsWith('.html')) acc.push(full)
  }
  return acc
}

let totalFiles = 0, totalRepls = 0
for (const file of walk(ROOT)) {
  let src = fs.readFileSync(file, 'utf8')
  let n = 0
  const before = src

  // 1) HTML attributes: src/href/data-img/poster="/..."  (skip /assisted-b2b and protocol/anchor)
  src = src.replace(/(\b(?:src|href|data-img|poster)=")(\/[^"]*)"/g, (m, attr, url) => {
    if (url.startsWith('/assisted-b2b')) return m
    n++
    if (url === '/') return `${attr}/assisted-b2b/"`
    return `${attr}${PREFIX}${url}"`
  })

  // 2) JS string asset paths for known asset roots: '/items/...', '/product-...', '/avatar-...',
  //    '/logo-...', '/check.svg', '/Illustration...', '/Payment%20methods/...'
  src = src.replace(
    /(['"])\/(items\/|product-|avatar-|logo-|check\.svg|Illustration|Payment%20methods\/|favicon\.svg)/g,
    (m, q, rest) => { n++; return `${q}${PREFIX}/${rest}` }
  )

  if (src !== before) {
    fs.writeFileSync(file, src)
    totalFiles++
    totalRepls += n
    console.log(`  ${path.relative(ROOT, file)} — ${n} repls`)
  }
}
console.log(`fix-ha-paths: ${totalRepls} replacements across ${totalFiles} file(s)`)
