import { useRef } from 'react'
import clsx from 'clsx'
import { gsap, useGSAP } from '@/lib/gsap'
import { useLang } from '@/lib/lang-context'
import { useUI, type Theme } from '@/lib/store'
import { playPluck, playWhoosh } from '@/lib/sound'
import WalletCard from './process/WalletCard'
import { CARD, PARTS, type PartKey } from './process/card'
import Sketch from './process/Sketch'
import CodePanel from './process/CodePanel'

const STAGE_THEME: Theme[] = ['light', 'canvas', 'dark', 'dark']
const STAGE_BG = ['#eeebe4', '#1e1e1e', '#0a0a0b', '#0a0a0b']
/** Stage boundaries in timeline units. */
const BOUNDS = [0, 2.8, 5.55, 8.75, 12.2]

const REDLINES: { x: number; y1: number; y2: number; v: string }[] = [
  { x: 200, y1: 64, y2: 88, v: '24' },
  { x: 150, y1: 196, y2: 212, v: '16' },
  { x: 250, y1: 308, y2: 324, v: '16' },
  { x: 120, y1: 372, y2: 396, v: '24' },
]

export default function Process() {
  const { t, lang } = useLang()
  const root = useRef<HTMLElement>(null)
  const p = t.process

  useGSAP(
    () => {
      const box = root.current!.querySelector<HTMLElement>('[data-pin]')!
      const wrap = box.querySelector<HTMLElement>('[data-wrap]')!
      const zoom = box.querySelector<HTMLElement>('[data-zoom]')!
      const card = box.querySelector<HTMLElement>('[data-card]')!
      const code = box.querySelector<HTMLElement>('[data-code]')!
      const hl = box.querySelector<HTMLElement>('[data-hl]')!
      const lines = gsap.utils.toArray<HTMLElement>('[data-code-line]', box)
      const stageItems = gsap.utils.toArray<HTMLElement>('[data-stage-item]', box)
      const stageTexts = gsap.utils.toArray<HTMLElement>('[data-stage-text]', box)
      const bars = gsap.utils.toArray<HTMLElement>('[data-stage-bar]', box)
      const amountEl = card.querySelector<HTMLElement>('[data-amount]')!
      const roughPaths = gsap.utils.toArray<SVGPathElement>('[data-rough] path', box)
      const arrowPaths = gsap.utils.toArray<SVGPathElement>('[data-note-arrow] path', box)
      const bodyPaths = roughPaths.filter((pth) => !arrowPaths.includes(pth))
      const fmt = new Intl.NumberFormat(lang === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

      /* ------------------------------ layout ------------------------------ */
      const L = { s: 1, cx: 0, cy: 0, wide: true, design: 0, code: 0 }
      const measure = () => {
        const W = box.clientWidth
        const H = box.clientHeight
        const wide = W >= 1024
        L.wide = wide
        if (wide) {
          const left = W * 0.36
          const right = W - Math.max(16, Math.min(40, W * 0.024))
          L.s = Math.min(1.12, (H - 230) / CARD.h, ((right - left) * 0.48) / CARD.w)
          L.cx = (left + right) / 2
          L.cy = H / 2 + 34
          L.design = -Math.min(120, (right - left) * 0.12)
          L.code = Math.min(170, (right - left) * 0.2)
        } else {
          const top = Math.min(330, H * 0.4)
          L.s = Math.min(1, (H - top - 130) / CARD.h, (W - 32) / CARD.w)
          L.cx = W / 2
          L.cy = top + (H - top) / 2 + 40
          L.design = 0
          L.code = 0
        }
        // the scribble notes live outside the card: only where there is room for them
        gsap.set('[data-note], [data-note-arrow]', { display: wide ? '' : 'none' })
        gsap.set(wrap, { x: L.cx - (CARD.w * L.s) / 2, y: L.cy - (CARD.h * L.s) / 2, scale: L.s, transformOrigin: '0 0' })
        gsap.set(zoom, { transformOrigin: `${L.cx}px ${L.cy}px` })
        // the editor sits left of the card on desktop, on top of it on small screens
        const cw = 480
        if (wide) gsap.set(code, { width: cw, left: L.cx + L.code - (CARD.w * L.s) / 2 - cw + 70, top: L.cy - 210, scale: 1 })
        else {
          const k = Math.min(1, (W - 32) / cw)
          gsap.set(code, { width: cw, left: 16, top: L.cy - 190 * k, scale: k, transformOrigin: '0 0' })
        }
      }
      measure()

      /* ------------------------------ initial state ------------------------------ */
      gsap.set(box, { backgroundColor: STAGE_BG[0], color: '#0a0a0b' })
      gsap.set(bodyPaths, { drawSVG: '0%' })
      gsap.set(arrowPaths, { drawSVG: '0%' })
      gsap.set('[data-sketch-text] text, [data-note]', { autoAlpha: 0 })
      gsap.set(card, { autoAlpha: 0, scale: 0.96, transformOrigin: '50% 50%' })
      gsap.set('[data-d]', { autoAlpha: 0 })
      gsap.set('[data-inspect] [data-i]', { autoAlpha: 0, x: 12 })
      gsap.set(code, { autoAlpha: 0, y: 30 })
      gsap.set('[data-code-text]', { clipPath: 'inset(0 100% 0 0)' })
      gsap.set('[data-compiled]', { autoAlpha: 0 })
      gsap.set(hl, { autoAlpha: 0 })
      gsap.set('[data-notif]', { autoAlpha: 0, y: 24 })
      gsap.set('[data-pglow]', { autoAlpha: 0, scale: 0.6 })
      gsap.set(stageTexts, { autoAlpha: 0, y: 16 })
      gsap.set(stageTexts[0], { autoAlpha: 1, y: 0 })
      gsap.set(bars, { scaleX: 0, transformOrigin: '0 50%' })

      /* ------------------------------ live product loop ------------------------------ */
      const base = 48320.9
      const live = gsap
        .timeline({ paused: true })
        .to({ v: base }, { v: base + 1200, duration: 1.4, ease: 'power3.out', onUpdate() { amountEl.textContent = fmt.format(this.targets()[0].v) } }, 0.45)
        .fromTo('[data-spark-ping]', { attr: { r: 4.5 }, opacity: 0.9 }, { attr: { r: 18 }, opacity: 0, duration: 1.2, repeat: -1, ease: 'power2.out' }, 0.3)
      let liveOn = false
      const setLive = (on: boolean) => {
        if (on === liveOn) return
        liveOn = on
        // the notification belongs to the product stage only, so it is driven here and nowhere else
        const notif = box.querySelector('[data-notif]')
        if (on) {
          live.restart()
          gsap.fromTo(notif, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7, delay: 0.2, ease: 'back.out(1.6)', overwrite: true })
          playPluck()
        } else {
          live.pause(0)
          gsap.to(notif, { autoAlpha: 0, y: 24, duration: 0.25, overwrite: true })
          amountEl.textContent = p.card.amount
        }
      }

      /* ------------------------------ stage UI ------------------------------ */
      let stage = 0
      const setStage = (n: number) => {
        if (n === stage) return
        const prev = stage
        stage = n
        stageItems.forEach((el, i) => el.classList.toggle('is-active', i === n))
        gsap.to(stageTexts[prev], { autoAlpha: 0, y: -12, duration: 0.3, overwrite: true })
        gsap.fromTo(stageTexts[n], { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, delay: 0.15, ease: 'silk', overwrite: true })
        useUI.getState().set({ theme: STAGE_THEME[n] })
        setLive(n === 3)
        playWhoosh()
      }

      const partBox = (k: PartKey) => PARTS[k]
      let lastLine = -2

      /* ------------------------------ timeline ------------------------------ */
      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          id: 'process',
          refreshPriority: 80,
          trigger: box,
          start: 'top top',
          end: () => `+=${window.innerHeight * 4.8}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onRefreshInit: measure,
          onUpdate: (self) => {
            const time = self.progress * tl.duration()
            const n = BOUNDS.findIndex((b, i) => time >= b && time < BOUNDS[i + 1])
            setStage(n === -1 ? 3 : n)
            // code highlight follows the line being typed
            const ln = time < 5.9 || time > 8.6 ? -1 : Math.min(lines.length - 1, Math.floor(((time - 5.9) / 2.4) * lines.length))
            if (ln !== lastLine) {
              lastLine = ln
              const k = ln >= 0 ? (lines[ln].dataset.partRef as PartKey | '') : ''
              if (k) {
                const b = partBox(k)
                gsap.to(hl, { autoAlpha: 1, x: b.x - 6, y: b.y - 6, width: b.w + 12, height: b.h + 12, duration: 0.35, ease: 'power3.out', overwrite: true })
              } else gsap.to(hl, { autoAlpha: 0, duration: 0.25, overwrite: true })
            }
            if (self.isActive) {
              const s = useUI.getState()
              if (s.frame.index !== '03') s.set({ frame: { index: '03', name: t.process.label } })
            }
          },
        },
      })

      // stage progress bars
      bars.forEach((b, i) => tl.fromTo(b, { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: BOUNDS[i + 1] - BOUNDS[i] }, BOUNDS[i]))

      // 1. scribble
      tl.to(bodyPaths, { drawSVG: '100%', duration: 0.5, stagger: 0.06, ease: 'power1.inOut' }, 0.1)
        .to('[data-sketch-text] text', { autoAlpha: 1, duration: 0.2, stagger: 0.12 }, 0.9)
      for (let i = 0; i < 4; i++) {
        tl.to(`[data-note-arrow="${i}"] path`, { drawSVG: '100%', duration: 0.35, ease: 'power1.inOut' }, 1.3 + i * 0.25)
          .to(`[data-note="${i}"]`, { autoAlpha: 1, duration: 0.25 }, 1.4 + i * 0.25)
      }

      // 2. interface: paper → Figma canvas, scribble snaps into a clean component
      tl.to(box, { backgroundColor: STAGE_BG[1], color: '#eeebe4', duration: 0.7 }, 2.5)
        .to('[data-grid]', { autoAlpha: 0, duration: 0.5 }, 2.5)
        .to('[data-sketch]', { autoAlpha: 0, y: -10, duration: 0.5 }, 2.55)
        .to(card, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power3.out' }, 2.75)
        .to(wrap, { x: () => L.cx + L.design - (CARD.w * L.s) / 2, duration: 0.7 }, 2.7)
        .to('[data-d="sel"]', { autoAlpha: 1, duration: 0.3 }, 3.3)
        .to('[data-d="pad"]', { autoAlpha: 1, duration: 0.3, stagger: 0.1 }, 3.5)
        .to('[data-d="red"]', { autoAlpha: 1, duration: 0.25, stagger: 0.15 }, 3.9)
        .to('[data-d="inspect"]', { autoAlpha: 1, duration: 0.3 }, 3.6)
        .to('[data-inspect] [data-i]', { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.07, ease: 'power3.out' }, 3.7)

      // 3. code: canvas → ink, the editor slides in and types the component
      tl.to('[data-d]', { autoAlpha: 0, duration: 0.3 }, 5.2)
        .to(box, { backgroundColor: STAGE_BG[2], duration: 0.6 }, 5.25)
        .to(wrap, { x: () => L.cx + L.code - (CARD.w * L.s) / 2, duration: 0.7 }, 5.3)
        .to(card, { autoAlpha: () => (L.wide ? 1 : 0.18), duration: 0.4 }, 5.4)
        .to(code, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 5.5)
      lines.forEach((ln, i) => {
        tl.to(ln.querySelector('[data-code-text]'), { clipPath: 'inset(0 0% 0 0)', duration: 0.17, ease: 'steps(12)' }, 5.9 + (i * 2.4) / lines.length)
      })
      tl.to('[data-compiled]', { autoAlpha: 1, duration: 0.2 }, 8.35)

      // 4. product: the editor leaves, the card goes live
      tl.to(code, { autoAlpha: 0, y: -24, duration: 0.45 }, 8.6)
        .to(card, { autoAlpha: 1, duration: 0.3 }, 8.65)
        .to(wrap, { x: () => L.cx - (CARD.w * L.s) / 2, duration: 0.7 }, 8.6)
        .to('[data-pglow]', { autoAlpha: 1, scale: 1, duration: 0.8 }, 8.8)
        .to('[data-card-glow]', { opacity: 1, duration: 0.6 }, 8.9)
        .to({}, { duration: 1.2 }, 9.4)

      // 5. zoom-through: the card's surface becomes the next section
      tl.to('[data-notif-wrap], [data-pglow]', { autoAlpha: 0, duration: 0.3 }, 10.6)
        .to(card.children, { autoAlpha: 0, duration: 0.35, stagger: 0.02 }, 10.6)
        .to(card, { backgroundColor: '#0a0a0b', borderColor: 'rgba(255,255,255,0)', duration: 0.5 }, 10.8)
        .to(zoom, { scale: 12, duration: 1.3, ease: 'power3.in' }, 10.8)
        .to('[data-left]', { autoAlpha: 0, duration: 0.4 }, 10.7)

      return () => {
        live.kill()
      }
    },
    { scope: root, dependencies: [lang], revertOnUpdate: true },
  )

  return (
    <section ref={root} id="process" data-theme="light" data-frame={p.label} data-frame-index="03" className="relative z-10 text-ink" aria-labelledby="process-title">
      <div data-pin className="relative h-svh min-h-[620px] overflow-hidden">
        {/* notebook grid for the scribble stage */}
        <div
          data-grid
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(60,90,200,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(60,90,200,0.09) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* left column: title, stages, explanation */}
        <div data-left className="absolute inset-x-0 top-0 z-10 px-gutter pt-[calc(var(--header-h)+3vh)] lg:bottom-0 lg:right-auto lg:flex lg:w-[34vw] lg:flex-col lg:justify-between lg:pb-[5vh]">
          <div>
            <p className="label opacity-60">(03) {p.label}</p>
            <h2 id="process-title" className="mt-3 text-[clamp(2.2rem,4.6vw,5.4rem)] font-[700] leading-[0.92] tracking-[-0.05em]">
              {p.title}
              <br />
              <span className="serif font-normal">{p.titleB}</span>
            </h2>
          </div>
          <div className="mt-5 lg:mt-0">
            <ol className="grid grid-cols-4 gap-2 lg:grid-cols-1 lg:gap-0">
              {p.stages.map((s, i) => (
                <li key={s.name} data-stage-item className={clsx('group/stage relative lg:border-t lg:border-current/15 lg:py-3', i === 0 && 'is-active')}>
                  <div className="flex items-baseline gap-3 opacity-35 transition-opacity duration-500 group-[.is-active]/stage:opacity-100">
                    <span className="font-mono text-[0.68rem]">0{i + 1}</span>
                    <span className="text-[0.95rem] font-[620] tracking-[-0.01em] lg:text-[1.35rem]">{s.name}</span>
                  </div>
                  <div className="mt-2 h-px w-full bg-current/15 lg:absolute lg:-top-px lg:left-0 lg:mt-0">
                    <div data-stage-bar className="h-full w-full bg-current" />
                  </div>
                </li>
              ))}
            </ol>
            <div className="relative mt-4 h-[4.6rem] lg:mt-6 lg:h-[6.5rem]">
              {p.stages.map((s) => (
                <p key={s.name} data-stage-text className="absolute inset-0 max-w-[26rem] text-[0.95rem] leading-[1.45] opacity-80 lg:text-[1.05rem]">
                  {s.text}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* the stage */}
        <div data-zoom className="absolute inset-0">
          <div data-pglow aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(40% 50% at 62% 55%, rgba(61,255,139,0.16), transparent 70%)' }} />
          <div data-wrap className="absolute left-0 top-0" style={{ width: CARD.w, height: CARD.h, perspective: 1200 }}>
            <Sketch notes={p.card.notes} amount={p.card.amount.replace(/[.,]\d{2}$/, '')} send={p.card.send} receive={p.card.receive} currency={p.card.currency} />

            {/* live notification */}
            <div data-notif-wrap className="absolute inset-x-0 top-0">
            <div data-notif className="absolute left-0 flex w-full items-center gap-3 rounded-[18px] border border-white/10 bg-ink-3/90 px-4 py-3 text-paper shadow-2xl backdrop-blur" style={{ top: -84 }}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-signal text-ink">
                <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
                  <path d="M8 2v12M3 9l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-[650]">{p.card.notif}</span>
                <span className="block text-[12px] text-paper/55">{p.card.notifValue}</span>
              </span>
            </div>
            </div>

            <WalletCard copy={p.card} />

            {/* code highlight */}
            <div data-hl aria-hidden className="pointer-events-none absolute left-0 top-0 rounded-[10px] border border-signal bg-signal/8" />

            {/* Figma overlays */}
            <div data-d="sel" aria-hidden className="pointer-events-none absolute -inset-px">
              <div className="absolute inset-0 rounded-[28px] border-[1.5px] border-signal" />
              {['-left-[4px] -top-[4px]', '-right-[4px] -top-[4px]', '-left-[4px] -bottom-[4px]', '-right-[4px] -bottom-[4px]'].map((c) => (
                <span key={c} className={clsx('absolute h-[8px] w-[8px] border border-signal bg-paper', c)} />
              ))}
              <span className="absolute -top-7 left-0 flex items-center gap-1.5 font-mono text-[11px] text-signal">
                <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                  <path d="M6 .8 8 2.8 6 4.8 4 2.8zM6 7.2l2 2-2 2-2-2zM2.8 4 4.8 6 2.8 8 .8 6zM9.2 4l2 2-2 2-2-2z" fill="currentColor" />
                </svg>
                WalletCard
              </span>
              <span className="absolute -bottom-8 left-1/2 flex w-0 justify-center">
                <span className="whitespace-nowrap rounded-[4px] bg-signal px-1.5 py-0.5 font-mono text-[11px] text-ink">
                  {CARD.w} × {CARD.h}
                </span>
              </span>
            </div>
            {[
              { l: 0, t: 0, w: 24, h: CARD.h },
              { l: CARD.w - 24, t: 0, w: 24, h: CARD.h },
              { l: 24, t: 0, w: CARD.w - 48, h: 24 },
              { l: 24, t: CARD.h - 24, w: CARD.w - 48, h: 24 },
            ].map((b, i) => (
              <div
                key={i}
                data-d="pad"
                aria-hidden
                className="pointer-events-none absolute"
                style={{
                  left: b.l,
                  top: b.t,
                  width: b.w,
                  height: b.h,
                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,90,44,0.28) 0 1px, transparent 1px 6px)',
                  backgroundColor: 'rgba(255,90,44,0.08)',
                  borderRadius: i === 0 ? '28px 0 0 28px' : i === 1 ? '0 28px 28px 0' : 0,
                }}
              />
            ))}
            {REDLINES.map((r, i) => (
              <div key={i} data-d="red" aria-hidden className="pointer-events-none absolute" style={{ left: r.x, top: r.y1, height: r.y2 - r.y1 }}>
                <div className="absolute inset-y-0 left-0 w-px bg-you" />
                <div className="absolute -left-[4px] top-0 h-px w-[9px] bg-you" />
                <div className="absolute -left-[4px] bottom-0 h-px w-[9px] bg-you" />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 rounded-[3px] bg-you px-1 font-mono text-[10px] leading-[15px] text-white">{r.v}</span>
              </div>
            ))}
            <div data-d="inspect" data-inspect aria-hidden className="pointer-events-none absolute hidden w-[210px] rounded-2xl border border-white/10 bg-[#2c2c2c] p-4 font-mono text-[11px] text-paper/80 shadow-2xl lg:block" style={{ left: CARD.w + 40, top: 30 }}>
              <p data-i className="mb-3 text-[10px] uppercase tracking-[0.1em] text-paper/45">Design tokens</p>
              <p data-i className="mb-2 text-paper/45">{p.design.colors}</p>
              {[
                ['ink-2', '#111113'],
                ['paper', '#EEEBE4'],
                ['signal', '#3DFF8B'],
              ].map(([n, c]) => (
                <p key={n} data-i className="mb-1.5 flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-[4px] border border-white/15" style={{ background: c }} />
                  <span className="flex-1">{n}</span>
                  <span className="text-paper/45">{c}</span>
                </p>
              ))}
              <p data-i className="mb-2 mt-3 text-paper/45">{p.design.type}</p>
              <p data-i className="mb-1 flex justify-between">
                <span>Display</span>
                <span className="text-paper/45">40 / 680</span>
              </p>
              <p data-i className="mb-1 flex justify-between">
                <span>Body</span>
                <span className="text-paper/45">13 / 450</span>
              </p>
              <p data-i className="mb-2 mt-3 text-paper/45">{p.design.spacing}</p>
              <p data-i className="flex gap-1.5">
                {[8, 12, 16, 24].map((v) => (
                  <span key={v} className="rounded-[4px] bg-white/8 px-1.5 py-0.5">
                    {v}
                  </span>
                ))}
              </p>
            </div>


          </div>
          <CodePanel copy={p.card} file={p.code.file} compiled={p.code.compiled} />
        </div>
      </div>
    </section>
  )
}
