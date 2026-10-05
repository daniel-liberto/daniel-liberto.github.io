import { useEffect, useRef, useState } from 'react'
import { gsap } from '@/lib/gsap'
import { useLang } from '@/lib/lang-context'
import { heroGate, useUI } from '@/lib/store'
import { lockScroll } from '@/lib/lenis'
import { preloadImages } from '@/content/projects'
import FrameIcon from './FrameIcon'

const MIN_TIME = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.6 : 3.4

/** Wireframe of the hero, drawn inside the frame as loading advances (percentages of the frame). */
const WIRE = [
  { at: 0.06, l: 3, t: 4, w: 16, h: 2.4, tag: 'Logo' },
  { at: 0.12, l: 60, t: 4, w: 37, h: 2.4, tag: 'Nav' },
  { at: 0.22, l: 40, t: 0, w: 60, h: 100, tag: 'Image · daniel-studio.webp', img: true },
  { at: 0.36, l: 7, t: 13, w: 46, h: 19, tag: 'Text · Daniel' },
  { at: 0.5, l: 15, t: 50, w: 42, h: 16, tag: 'Text · Liberto.' },
  { at: 0.64, l: 3, t: 72, w: 28, h: 2, tag: '' },
  { at: 0.7, l: 3, t: 76.5, w: 22, h: 2, tag: '' },
  { at: 0.78, l: 81, t: 86, w: 15, h: 4.5, tag: 'Button' },
]

/** What the loader reports, in order. */
const LOG = [
  { at: 0.04, text: 'fonts · Mona Sans, Fraunces, Geist Mono' },
  { at: 0.26, text: 'images · daniel-studio.webp, 3 covers' },
  { at: 0.48, text: 'webgl · hero layers compiled' },
  { at: 0.7, text: 'gsap · scroll scenes registered' },
  { at: 0.9, text: 'lenis · smooth scroll ready' },
]

function loadImage(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => (img.decode ? img.decode().catch(() => {}).then(() => resolve()) : resolve())
    img.onerror = () => resolve()
    img.src = src
  })
}

/**
 * The page loads as a Figma frame being dragged out: its live W × H label is the progress bar.
 * When everything is ready the frame fills with the site (a curtain rising inside it) and then
 * the frame grows past the edges of the screen.
 */
export default function Preloader() {
  const { t } = useLang()
  const set = useUI((s) => s.set)
  const [done, setDone] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const veil = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const dims = useRef<HTMLSpanElement>(null)
  const pill = useRef<HTMLDivElement>(null)
  const pct = useRef<HTMLSpanElement>(null)
  const status = useRef<HTMLSpanElement>(null)
  const cross = useRef<HTMLDivElement>(null)
  const count = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    lockScroll(true)
    const W = () => window.innerWidth
    const H = () => window.innerHeight
    const g = () => Math.max(16, Math.min(40, W() * 0.024))
    const top = () => (W() < 768 ? 64 : 76)

    let loaded = 0
    const tasks: Promise<void>[] = preloadImages.map((src) => loadImage(src).then(() => void loaded++))
    const fonts = Promise.all([
      document.fonts.load('760 1em "Mona Sans Variable"'),
      document.fonts.load('italic 340 1em "Fraunces Variable"'),
      document.fonts.load('400 1em "Geist Mono Variable"'),
      document.fonts.load('500 1em "Caveat Variable"'),
    ])
      .catch(() => {})
      .then(() => void loaded++)
    tasks.push(fonts)
    const total = tasks.length + 1
    const gate = window.location.pathname === '/' ? Promise.race([heroGate.promise, new Promise<void>((r) => setTimeout(r, 6000))]) : Promise.resolve()
    gate.then(() => void loaded++)

    const wires = Array.from(root.current!.querySelectorAll<HTMLElement>('[data-wire]'))
    const logs = Array.from(root.current!.querySelectorAll<HTMLElement>('[data-log]'))
    gsap.set(logs, { autoAlpha: 0, x: -8 })
    const start = performance.now()
    const state = { p: 0, hy: 1, open: 0 }
    let finished = false

    const draw = () => {
      const x0 = g()
      const y0 = top()
      const x1 = W() - g()
      const y1 = H() - g()
      // the drag path leans: x leads, y follows a little behind, like a real hand
      const px = gsap.parseEase('power2.out')(state.p)
      const py = gsap.parseEase('power1.inOut')(state.p)
      const w = (x1 - x0) * px
      const h = (y1 - y0) * py
      const ex = state.open
      const fx0 = x0 - x0 * ex
      const fy0 = y0 - y0 * ex
      const fw = w + (W() - w) * ex
      const fh = h + (H() - h) * ex
      frame.current!.style.transform = `translate3d(${fx0}px, ${fy0}px, 0)`
      frame.current!.style.width = `${fw}px`
      frame.current!.style.height = `${fh}px`
      cross.current!.style.transform = `translate3d(${x0 + w}px, ${y0 + h}px, 0)`
      dims.current!.textContent = `${Math.round(fw)} × ${Math.round(fh)}`
      pct.current!.textContent = `${Math.round(state.p * 100)}%`
      count.current!.textContent = String(Math.round(state.p * 100)).padStart(3, '0')
      // the counter only shows once the frame is big enough to hold it
      if (!finished) count.current!.parentElement!.style.opacity = String(gsap.utils.clamp(0, 1, (Math.min(w / (x1 - x0), h / (y1 - y0)) - 0.35) / 0.15))
      // wireframe and log follow the progress
      wires.forEach((el, i) => {
        const k = gsap.utils.clamp(0, 1, (state.p - WIRE[i].at) / 0.09)
        el.style.opacity = String(k)
        el.style.transform = WIRE[i].img ? `scaleY(${0.2 + k * 0.8})` : `scaleX(${k})`
      })
      logs.forEach((el, i) => {
        const on = state.p >= LOG[i].at
        if (el.dataset.on !== String(on)) {
          el.dataset.on = String(on)
          gsap.to(el, { autoAlpha: on ? 1 : 0, x: on ? 0 : -8, duration: 0.35, ease: 'power2.out' })
        }
      })
      // hole inside the veil: grows from the bottom of the frame (curtain) then to the whole screen
      const hx0 = fx0
      const hx1 = fx0 + fw
      const hy1 = fy0 + fh
      const hy0 = hy1 - fh * (1 - state.hy)
      veil.current!.style.clipPath =
        state.hy >= 1
          ? 'none'
          : `path(evenodd, 'M0 0H${W()}V${H()}H0Z M${hx0} ${hy0}H${hx1}V${hy1}H${hx0}Z')`
    }

    const tick = () => {
      if (finished) return
      const elapsed = (performance.now() - start) / 1000
      const target = Math.min(loaded / total, elapsed / MIN_TIME)
      state.p += (target - state.p) * 0.08
      if (target >= 1 && state.p > 0.995) {
        state.p = 1
        finished = true
        finish()
      }
      draw()
    }

    const finish = () => {
      draw()
      const tl = gsap.timeline({ onUpdate: draw })
      // the wireframe "renders": every placeholder flashes green, then the real page takes its place
      tl.to(wires, { backgroundColor: 'rgba(61,255,139,0.22)', borderColor: 'rgba(61,255,139,0.9)', duration: 0.2, stagger: 0.03 }, 0)
        .to(wires, { autoAlpha: 0, duration: 0.3, stagger: 0.02 }, 0.35)
        .to('[data-count-wrap]', { yPercent: -30, autoAlpha: 0, duration: 0.5, ease: 'power2.in' }, 0.3)
      tl.to(status.current, { duration: 0.5, scrambleText: { text: t.preloader.ready, chars: '01#*+/' } }, 0)
        .to(pill.current, { backgroundColor: '#ffffff', duration: 0.3 }, 0)
        .to(cross.current, { autoAlpha: 0, duration: 0.3 }, 0.1)
        .add(() => {
          set({ ready: true })
          document.documentElement.classList.remove('is-loading')
        }, 0.75)
        .to(state, { hy: 0, duration: 1.15, ease: 'curtain' }, 0.7)
        .to('[data-pl-ui]', { autoAlpha: 0, duration: 0.4 }, 1.2)
        .to(state, { open: 1, duration: 1.1, ease: 'curtain' }, 1.55)
        .to(frame.current, { autoAlpha: 0, duration: 0.5 }, 2.05)
        .add(() => {
          lockScroll(false)
          setDone(true)
        })
    }

    gsap.ticker.add(tick)
    window.addEventListener('resize', draw)
    return () => {
      gsap.ticker.remove(tick)
      window.removeEventListener('resize', draw)
    }
    // runs once: the preloader never restarts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (done) return null

  return (
    <div ref={root} className="fixed inset-0 z-[80]" aria-live="polite" aria-label={t.preloader.compiling}>
      <div
        ref={veil}
        className="absolute inset-0 bg-ink"
        style={{
          backgroundImage: 'radial-gradient(rgba(238,235,228,0.16) 1px, transparent 1.4px)',
          backgroundSize: '22px 22px',
        }}
      />

      {/* the frame being drawn */}
      <div ref={frame} className="absolute left-0 top-0 border border-signal" style={{ width: 0, height: 0 }}>
        <div data-pl-ui className="absolute inset-0 overflow-hidden">
          {WIRE.map((w, i) => (
            <div
              key={i}
              data-wire
              className="absolute border border-dashed border-signal/35 bg-paper/[0.035]"
              style={{ left: `${w.l}%`, top: `${w.t}%`, width: `${w.w}%`, height: `${w.h}%`, opacity: 0, transformOrigin: w.img ? '50% 0%' : '0% 50%' }}
            >
              {w.img && (
                <svg className="absolute inset-0 h-full w-full" aria-hidden>
                  <line x1="0" y1="0" x2="100%" y2="100%" stroke="rgba(61,255,139,0.18)" />
                  <line x1="100%" y1="0" x2="0" y2="100%" stroke="rgba(61,255,139,0.18)" />
                </svg>
              )}
              {w.tag && <span className="absolute left-1.5 top-1 whitespace-nowrap font-mono text-[10px] text-signal/70">{w.tag}</span>}
            </div>
          ))}
        </div>
        <div data-pl-ui data-count-wrap className="pointer-events-none absolute bottom-3 right-4 overflow-hidden">
          <span ref={count} className="block font-display text-[clamp(4rem,13vw,12rem)] font-[800] leading-[0.8] tracking-[-0.06em] text-paper tabular-nums">
            000
          </span>
        </div>
        <div data-pl-ui className="absolute -top-6 left-0 flex items-center gap-1.5 whitespace-nowrap font-mono text-[0.7rem] text-signal">
          <FrameIcon className="h-3 w-3" />
          {t.preloader.file}
        </div>
        {(['-left-[4px] -top-[4px]', '-right-[4px] -top-[4px]', '-left-[4px] -bottom-[4px]', '-right-[4px] -bottom-[4px]'] as const).map((c) => (
          <span key={c} data-pl-ui className={`absolute h-[7px] w-[7px] border border-signal bg-ink ${c}`} />
        ))}
        <div data-pl-ui className="absolute -bottom-9 left-1/2 flex -translate-x-1/2 justify-center">
          <div ref={pill} className="whitespace-nowrap rounded-[4px] bg-signal px-1.5 py-0.5 font-mono text-[0.68rem] font-medium tabular-nums text-ink">
            <span ref={dims}>0 × 0</span>
          </div>
        </div>
      </div>

      {/* frame tool crosshair, glued to the dragged corner */}
      <div ref={cross} className="pointer-events-none absolute left-0 top-0">
        <svg width="22" height="22" viewBox="0 0 22 22" className="-ml-[11px] -mt-[11px]" aria-hidden>
          <path d="M11 1v20M1 11h20" stroke="#fff" strokeWidth="3" />
          <path d="M11 1v20M1 11h20" stroke="#0a0a0b" strokeWidth="1.2" />
        </svg>
      </div>

      <div data-pl-ui className="absolute bottom-[calc(var(--gutter)+40px)] left-[calc(var(--gutter)+14px)] flex flex-col gap-1 font-mono text-[0.68rem] text-paper/50">
        {LOG.map((l) => (
          <span key={l.text} data-log className="flex items-center gap-2">
            <span className="text-signal">✓</span>
            {l.text}
          </span>
        ))}
      </div>
      <div data-pl-ui className="absolute bottom-[calc(var(--gutter)+12px)] left-[calc(var(--gutter)+14px)] flex items-center gap-3 font-mono text-[0.72rem] text-paper/70">
        <span ref={status}>{t.preloader.compiling}</span>
        <span ref={pct} className="tabular-nums text-signal">
          0%
        </span>
      </div>
    </div>
  )
}
