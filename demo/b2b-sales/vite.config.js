import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Serve static HTML files from public/ for specific paths,
// before Vite's SPA fallback returns the React index.html
function staticHtmlMiddleware() {
  return {
    name: 'static-html-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        const pathname = url.pathname.replace(/\/$/, '') // strip trailing slash

        const staticPaths = [
          '/salesapp/home',
          '/salesapp/cart',
          '/salesapp/explore',
          '/storefrontb2b/cart',
          '/storefrontb2b/checkout',
          '/storefrontb2b/account/quotes',
          '/storefrontb2b/order-confirmation',
          '/salesapp/order-summary',
          '/salesapp/order-confirmation',
        ]

        if (staticPaths.includes(pathname)) {
          const filePath = path.resolve(__dirname, 'public', pathname.slice(1), 'index.html')
          if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(fs.readFileSync(filePath, 'utf-8'))
            return
          }
        }
        next()
      })
    },
  }
}

export default defineConfig({
  base: '/assisted-b2b/demo/b2b-sales/dist/',
  plugins: [staticHtmlMiddleware(), react()],
})
