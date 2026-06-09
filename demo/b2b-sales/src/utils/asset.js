/**
 * Prepends Vite's BASE_URL to asset paths so images work both
 * on GitHub Pages (/assisted-b2b/demo/b2b-sales/dist/) and locally.
 * Usage: asset('/hero-s23.png') → '/assisted-b2b/demo/b2b-sales/dist/hero-s23.png'
 */
export function asset(path) {
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}
