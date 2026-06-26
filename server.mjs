import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PORT = process.env.PORT || 3000

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  let pathname = decodeURIComponent(url.pathname)

  // Redirect root to /assisted-b2b/ via JS so browser URL stays correct for React Router
  if (pathname === '/' || pathname === '') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<html><head><script>window.location="/assisted-b2b/"</script></head></html>')
    return
  }

  // Clean URL routes
  const CLEAN_ROUTES = {
    '/demo/B2B-Sales-App':         '/assisted-b2b/demo/b2b-sales/dist/',
    '/demo/Midea':                  '/assisted-b2b/demo/b2b-sales/dist/salesapp/midea/',
    '/demo/Hierarchical-Approval':  '/assisted-b2b/demo/hierarchical-approval/salesapp/home/',
    '/handoff/Quotes-Buyer-Phase-1':    '/assisted-b2b/handoffs/quotes-buyer-phase-1/dist/',
    '/handoff/Storefront-Order-Buyer':  '/assisted-b2b/handoffs/storefront-order-buyer-prototype-main/dist/',
    '/handoff/Sales-Rep-Phase-1':       '/assisted-b2b/handoffs/sales-rep-phase-1/dist/',
  }
  if (CLEAN_ROUTES[pathname]) {
    res.writeHead(302, { Location: CLEAN_ROUTES[pathname] })
    res.end()
    return
  }

  // Remap app sub-paths to their dist folder
  if (pathname.startsWith('/salesapp/') || pathname.startsWith('/storefrontb2b/')) {
    pathname = '/assisted-b2b/demo/b2b-sales/dist' + pathname
  }

  // Strip /index.html so React Router sees the directory path (e.g. /dist/ not /dist/index.html)
  if (pathname.endsWith('/index.html')) {
    const dir = pathname.slice(0, -'index.html'.length)
    res.writeHead(302, { Location: dir })
    res.end()
    return
  }

  let filePath = path.join(ROOT, pathname)

  // Try index.html for directories
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html')
  }

  // Fallback: asset referenced with absolute path (e.g. /avatar.png) — search in dist folders
  if (!fs.existsSync(filePath)) {
    const distFolders = [
      'assisted-b2b/demo/b2b-sales/dist',
      'assisted-b2b/demo/hierarchical-approval',
      'assisted-b2b/handoffs/quotes-buyer-phase-1/dist',
      'assisted-b2b/handoffs/sales-rep-phase-1/dist',
      'assisted-b2b/handoffs/storefront-order-buyer-prototype-main/dist',
    ]
    const filename = pathname.replace(/^\//, '')
    let found = false
    for (const folder of distFolders) {
      const candidate = path.join(ROOT, folder, filename)
      if (fs.existsSync(candidate)) {
        filePath = candidate
        found = true
        break
      }
    }
    if (!found) {
      res.writeHead(404)
      res.end('Not found')
      return
    }
  }

  const ext = path.extname(filePath).toLowerCase()
  const mime = MIME[ext] || 'application/octet-stream'

  // Inject global "I → index" shortcut into every HTML response
  if (ext === '.html') {
    let html = fs.readFileSync(filePath, 'utf8')
    const snippet = `<script>
(function(){
  var _ik = function(e){
    var t = document.activeElement && document.activeElement.tagName;
    if((e.key==='i'||e.key==='I')&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&t!=='INPUT'&&t!=='TEXTAREA'&&t!=='SELECT'){
      window.location.href='/assisted-b2b/';
    }
  };
  // Avoid duplicate listeners if page already has one
  if(!window.__I_KEY_REGISTERED__){window.__I_KEY_REGISTERED__=true;document.addEventListener('keydown',_ik);}
})();
</script>`
    html = html.replace('</body>', snippet + '\n</body>')
    if (!html.includes('</body>')) html += snippet
    res.writeHead(200, { 'Content-Type': mime })
    res.end(html)
    return
  }

  res.writeHead(200, { 'Content-Type': mime })
  fs.createReadStream(filePath).pipe(res)
})

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/assisted-b2b/`)
})
