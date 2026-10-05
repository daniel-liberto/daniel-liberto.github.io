/**
 * Captures the frames shown in the Figma-file finale: each section of the running site,
 * at desktop (1440×900) and phone (390×844) sizes, saved as WebP in public/canvas.
 *
 *   npm run dev            # in another terminal
 *   node scripts/capture-frames.mjs [http://localhost:5174]
 *
 * Needs Google Chrome installed (CHROME_PATH overrides the location) and `cwebp` on PATH.
 */
import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const base = process.argv[2] ?? 'http://localhost:5174'
const chrome = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const out = new URL('../public/canvas/', import.meta.url).pathname
const tmp = join(tmpdir(), 'dl-frames')
mkdirSync(out, { recursive: true })
mkdirSync(tmp, { recursive: true })

/** Where each frame is captured: a ScrollTrigger id + progress, or an element offset. */
const FRAMES = [
  { id: 'hero', at: { y: 0 } },
  { id: 'manifesto', at: { st: 'manifesto', p: 0.95 } },
  { id: 'process', at: { st: 'process', p: 0.36 } },
  { id: 'work', at: { st: 'work', p: 0.3 } },
  { id: 'services', at: { st: 'services', p: 0.5 } },
  { id: 'toolbox', at: { st: 'toolbox', p: 0 } },
  { id: 'changelog', at: { el: '#journey', offset: 0.55 } },
]

const SIZES = [
  { key: 'd', width: 1440, height: 900, scale: 1, resize: [1440, 0] },
  { key: 'm', width: 390, height: 844, scale: 2, resize: [585, 0] },
]

const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] })
for (const size of SIZES) {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: size.scale,
    locale: 'pt-BR',
    isMobile: size.key === 'm',
    hasTouch: size.key === 'm',
  })
  const page = await ctx.newPage()
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(7500)
  for (const f of FRAMES) {
    await page.evaluate((at) => {
      const lenis = window.__lenis
      let y = 0
      if ('st' in at) {
        const s = window.__gsap.ScrollTrigger.getById(at.st)
        y = s.start + (s.end - s.start) * at.p
      } else if ('el' in at) {
        const el = document.querySelector(at.el)
        y = el.getBoundingClientRect().top + window.scrollY + window.innerHeight * at.offset
      } else y = at.y
      lenis.scrollTo(y, { immediate: true, force: true })
    }, f.at)
    await page.waitForTimeout(2600)
    const png = join(tmp, `${size.key}-${f.id}.png`)
    await page.screenshot({ path: png })
    execFileSync('cwebp', ['-quiet', '-q', '72', '-m', '6', '-resize', String(size.resize[0]), String(size.resize[1]), png, '-o', join(out, `${size.key}-${f.id}.webp`)])
    console.log('captured', size.key, f.id)
  }
  await ctx.close()
}
await browser.close()
rmSync(tmp, { recursive: true, force: true })
