// GitHub Pages serves 404.html for unknown paths: shipping the SPA shell there makes deep links like /work/tcr load.
import { copyFileSync } from 'node:fs'
copyFileSync('dist/index.html', 'dist/404.html')
console.log('spa fallback: dist/404.html')
