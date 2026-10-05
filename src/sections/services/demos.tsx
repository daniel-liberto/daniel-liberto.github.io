import { lazy, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { gsap } from '@/lib/gsap'
import { useLang } from '@/lib/lang-context'
import { useMedia } from '@/hooks/useMedia'
import { playPluck, playTick } from '@/lib/sound'
import SafeCanvas from '@/components/SafeCanvas'

const MotionMorph = lazy(() => import('@/three/MotionMorph'))

export type DemoProps = {
  active: boolean
  /** 0 → 1 while this card is on top of the deck (scroll-driven demos read it every frame). */
  progress: { current: number }
}

/** Builds a paused timeline and plays it with the card's scroll progress (smoothed), both ways. */
function useScrub(progress: { current: number }, build: (root: HTMLElement) => gsap.core.Timeline, deps: unknown[] = []) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let stop = () => {}
    const ctx = gsap.context(() => {
      const tl = build(ref.current!).pause()
      let shown = 0
      const tick = () => {
        shown += (progress.current - shown) * 0.12
        tl.progress(gsap.utils.clamp(0, 1, shown))
      }
      gsap.ticker.add(tick)
      stop = () => gsap.ticker.remove(tick)
    }, ref)
    return () => {
      stop()
      ctx.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, ...deps])
  return ref
}

/* ------------------------------------------------------------------------------------------------
 * 01 · Product design: a user flow walked through by the scroll
 * ---------------------------------------------------------------------------------------------- */
export function FlowDemo({ progress }: DemoProps) {
  const { lang } = useLang()
  const wide = useMedia('(min-width: 768px)')
  const steps = lang === 'pt' ? ['Entrar', 'Carteira', 'Enviar', 'Valor + PIN', 'Pronto'] : ['Sign in', 'Wallet', 'Send', 'Amount + PIN', 'Done']
  const W = 150
  const H = 64
  const nodes = wide
    ? [
        { x: 40, y: 60 },
        { x: 250, y: 60 },
        { x: 460, y: 60 },
        { x: 250, y: 230 },
        { x: 460, y: 230 },
      ]
    : [0, 1, 2, 3, 4].map((i) => ({ x: i % 2 ? 150 : 30, y: 10 + i * 92 }))
  const links = wide
    ? [
        `M${40 + W},${60 + H / 2} L250,${60 + H / 2}`,
        `M${250 + W},${60 + H / 2} L460,${60 + H / 2}`,
        `M${460 + W / 2},${60 + H} C${460 + W / 2},170 ${250 + W / 2},150 ${250 + W / 2},230`,
        `M${250 + W},${230 + H / 2} L460,${230 + H / 2}`,
      ]
    : nodes.slice(0, -1).map((n, i) => {
        const m = nodes[i + 1]
        return `M${n.x + W / 2},${n.y + H} C${n.x + W / 2},${n.y + H + 20} ${m.x + W / 2},${m.y - 20} ${m.x + W / 2},${m.y}`
      })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current!
    let stop = () => {}
    const ctx = gsap.context(() => {
      const paths = Array.from(root.querySelectorAll<SVGPathElement>('[data-link]'))
      const boxes = Array.from(root.querySelectorAll<SVGGElement>('[data-node]'))
      const dot = root.querySelector<SVGCircleElement>('[data-dot]')!
      gsap.set(paths, { drawSVG: '0%' })
      gsap.set('[data-note]', { autoAlpha: 0, y: 8 })
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
      const light = (n: number) => boxes.forEach((b, k) => b.classList.toggle('is-on', k <= n))
      paths.forEach((p, i) => {
        const len = p.getTotalLength()
        const o = { d: 0 }
        const at = 0.1 + i
        tl.to(p, { drawSVG: '100%', duration: 0.8 }, at).to(
          o,
          {
            d: len,
            duration: 0.8,
            onUpdate: () => {
              const pt = p.getPointAtLength(o.d)
              dot.setAttribute('cx', String(pt.x))
              dot.setAttribute('cy', String(pt.y))
            },
          },
          at,
        )
      })
      tl.to('[data-note]', { autoAlpha: 1, y: 0, duration: 0.4 }, paths.length + 0.1).to({}, { duration: 0.5 })
      // the scroll drives the walk-through: no autoplay
      let shown = 0
      const tick = () => {
        shown += (progress.current - shown) * 0.12
        tl.progress(gsap.utils.clamp(0, 1, shown))
        const t = tl.time()
        light(Math.min(paths.length, Math.floor((t - 0.1) / 1 + 0.2)))
        dot.style.opacity = t > 0.12 && t < paths.length + 0.05 ? '1' : '0'
      }
      gsap.ticker.add(tick)
      stop = () => gsap.ticker.remove(tick)
    }, root)
    return () => {
      stop()
      ctx.revert()
    }
  }, [wide, lang, progress])

  return (
    <div ref={ref} className="relative h-full w-full">
      <svg viewBox={wide ? '0 0 650 340' : '0 0 330 470'} className="h-full w-full overflow-visible" aria-hidden>
        {links.map((d, i) => (
          <path key={`g${i}`} d={d} fill="none" stroke="rgba(238,235,228,0.14)" strokeWidth="2" strokeDasharray="5 6" />
        ))}
        {links.map((d, i) => (
          <path key={i} data-link d={d} fill="none" stroke="#3dff8b" strokeWidth="2.5" />
        ))}
        {nodes.map((n, i) => (
          <g key={i} data-node className="[&.is-on_rect]:fill-signal [&.is-on_rect]:stroke-signal [&.is-on_text]:fill-ink" transform={`translate(${n.x} ${n.y})`}>
            <rect width={W} height={H} rx="14" fill="#18181b" stroke="rgba(238,235,228,0.18)" className="transition-[fill,stroke] duration-300" />
            <text x="16" y="25" className="fill-paper/50 font-mono text-[11px] transition-[fill] duration-300">
              0{i + 1}
            </text>
            <text x="16" y="47" className="fill-paper text-[16px] font-semibold transition-[fill] duration-300">
              {steps[i]}
            </text>
          </g>
        ))}
        <circle data-dot r="7" fill="#3dff8b" stroke="#0a0a0b" strokeWidth="3" style={{ opacity: 0 }} />
      </svg>
      <p data-note className="hand absolute bottom-[4%] left-[2%] -rotate-3 rounded-lg bg-signal px-3 py-1.5 text-[clamp(1rem,1.6vw,1.5rem)] text-ink">
        {lang === 'pt' ? 'menos passos, menos abandono' : 'fewer steps, fewer drop-offs'}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------------------------------------
 * 02 · UI & design systems: variants on an 8pt grid, with redlines, and a theme that floods in
 * from the toggle like a growing sphere
 * ---------------------------------------------------------------------------------------------- */
type ThemeName = 'light' | 'dark'
const THEMES: Record<ThemeName, { bg: string; fg: string; primary: string; onPrimary: string; line: string; soft: string; grid: string }> = {
  light: { bg: '#ffffff', fg: '#0a0a0b', primary: '#0a0a0b', onPrimary: '#ffffff', line: 'rgba(10,10,11,0.14)', soft: '#efede7', grid: 'rgba(10,10,11,0.06)' },
  dark: { bg: '#0f0f11', fg: '#eeebe4', primary: '#3dff8b', onPrimary: '#0a0a0b', line: 'rgba(238,235,228,0.16)', soft: '#1d1d21', grid: 'rgba(238,235,228,0.06)' },
}
const SIZES = [
  { key: 'sm', h: 32, w: 84, text: 'text-[12px]' },
  { key: 'md', h: 40, w: 100, text: 'text-[13.5px]' },
  { key: 'lg', h: 48, w: 116, text: 'text-[15px]' },
]

function SystemPanel({ theme, label, pt }: { theme: ThemeName; label: string; pt: boolean }) {
  const T = THEMES[theme]
  return (
    <div
      className="absolute inset-0 flex flex-col gap-4 rounded-[20px] p-[5%]"
      style={{
        background: T.bg,
        color: T.fg,
        backgroundImage: `linear-gradient(${T.grid} 1px, transparent 1px), linear-gradient(90deg, ${T.grid} 1px, transparent 1px)`,
        backgroundSize: '16px 16px',
        boxShadow: `inset 0 0 0 1px ${T.line}`,
      }}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] opacity-60">Button · 8pt grid</p>
        <span data-toggle className="flex h-8 items-center gap-1 rounded-full p-1 text-[12px] font-semibold" style={{ boxShadow: `inset 0 0 0 1px ${T.line}`, background: T.bg }} aria-label={pt ? 'Tema' : 'Theme'}>
          {(['light', 'dark'] as const).map((k) => (
            <span key={k} className="flex h-6 items-center rounded-full px-2.5" style={{ background: theme === k ? T.primary : 'transparent', color: theme === k ? T.onPrimary : T.fg }}>
              {k === 'light' ? 'Light' : 'Dark'}
            </span>
          ))}
        </span>
      </div>
      <div className="grid flex-1 grid-cols-[44px_1fr_1fr] content-center items-center gap-x-3 gap-y-5 md:grid-cols-[44px_1fr_1fr_1fr]">
        <span />
        {['Primary', 'Secondary', 'Ghost'].map((v) => (
          <span key={v} className={clsx('text-center font-mono text-[10.5px] uppercase opacity-50', v === 'Ghost' && 'max-md:hidden')}>
            {v}
          </span>
        ))}
        {SIZES.map((s) => (
          <div key={s.key} className="contents">
            <span className="relative flex items-center justify-end gap-1.5 pr-1" style={{ height: s.h }}>
              <span className="font-mono text-[10px] text-you">{s.h}</span>
              <span className="relative h-full w-px bg-you">
                <i className="absolute -left-[3px] top-0 h-px w-[7px] bg-you" />
                <i className="absolute -left-[3px] bottom-0 h-px w-[7px] bg-you" />
              </span>
            </span>
            {(['primary', 'secondary', 'ghost'] as const).map((v) => (
              <span key={v} className={clsx('relative flex justify-center', v === 'ghost' && 'max-md:hidden')}>
                <span
                  className={clsx('flex items-center justify-center rounded-xl font-semibold', s.text)}
                  style={{
                    height: s.h,
                    width: s.w,
                    ...(v === 'primary' ? { background: T.primary, color: T.onPrimary } : v === 'secondary' ? { background: T.soft, color: T.fg } : { color: T.fg, boxShadow: `inset 0 0 0 1px ${T.line}` }),
                  }}
                >
                  {label}
                </span>
                {v === 'primary' && s.key === 'lg' && (
                  <span className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center" style={{ width: s.w }}>
                    <span className="relative h-px w-full bg-you">
                      <i className="absolute -top-[3px] left-0 h-[7px] w-px bg-you" />
                      <i className="absolute -top-[3px] right-0 h-[7px] w-px bg-you" />
                    </span>
                    <span className="mt-0.5 font-mono text-[10px] text-you">{s.w}</span>
                  </span>
                )}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 font-mono text-[11px]">
        {[
          ['--surface', T.bg],
          ['--primary', T.primary],
          ['--radius', '12'],
          ['--grid', '8 / 16'],
        ].map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5 rounded-md px-2 py-1" style={{ background: T.soft }}>
            {v.startsWith('#') && <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: v, boxShadow: `inset 0 0 0 1px ${T.line}` }} />}
            {k}: <span className="opacity-60">{v.toUpperCase()}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function SystemDemo({ progress }: DemoProps) {
  const { lang } = useLang()
  const pt = lang === 'pt'
  const box = useRef<HTMLDivElement>(null)
  const overlay = useRef<HTMLDivElement>(null)

  // the dark theme grows out of the toggle as a circle, scrubbed by the scroll (and back)
  useEffect(() => {
    let shown = 0
    let dark = false
    const tick = () => {
      const b = box.current
      const o = overlay.current
      if (!b || !o) return
      shown += (progress.current - shown) * 0.12
      const k = gsap.parseEase('power2.inOut')(gsap.utils.clamp(0, 1, (shown - 0.18) / 0.5))
      const br = b.getBoundingClientRect()
      const tg = b.querySelector('[data-toggle]')!.getBoundingClientRect()
      const x = tg.left - br.left + tg.width / 2
      const y = tg.top - br.top + tg.height / 2
      const r = Math.hypot(Math.max(x, br.width - x), Math.max(y, br.height - y)) * k
      o.style.clipPath = `circle(${r.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px)`
      if (k > 0.5 !== dark) {
        dark = k > 0.5
        playTick(dark ? 2 : 5)
      }
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [progress])

  const label = pt ? 'Enviar' : 'Send'
  return (
    <div ref={box} className="relative h-full w-full">
      <SystemPanel theme="light" label={label} pt={pt} />
      <div ref={overlay} className="absolute inset-0" style={{ clipPath: 'circle(0px at 90% 8%)' }}>
        <SystemPanel theme="dark" label={label} pt={pt} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------------------------------
 * 03 · Front-end engineering: a build, then four audits that land one by one on 100
 * ---------------------------------------------------------------------------------------------- */
export function BuildDemo({ progress }: DemoProps) {
  const { lang } = useLang()
  const pt = lang === 'pt'
  const metrics = pt ? ['Performance', 'Acessibilidade', 'Boas práticas', 'SEO'] : ['Performance', 'Accessibility', 'Best practices', 'SEO']
  const lines = ['$ npm run build', 'vite v8.3 building for production…', '✓ 312 modules transformed.', '✓ built in 1.21s', '$ npx lighthouse --preset=desktop']
  const C = 2 * Math.PI * 26
  const ref = useScrub(
    progress,
    (root) => {
      const rings = Array.from(root.querySelectorAll<SVGCircleElement>('[data-ring]'))
      const nums = Array.from(root.querySelectorAll<HTMLElement>('[data-num]'))
      const checks = Array.from(root.querySelectorAll<HTMLElement>('[data-check]'))
      const cells = Array.from(root.querySelectorAll<HTMLElement>('[data-cell]'))
      const ls = Array.from(root.querySelectorAll<HTMLElement>('[data-line]'))
      const banner = root.querySelector<HTMLElement>('[data-banner]')!
      gsap.set(checks, { autoAlpha: 0, scale: 0.4 })
      gsap.set(ls, { autoAlpha: 0 })
      gsap.set(banner, { autoAlpha: 0, y: 14 })
      const start = 0.05 + ls.length * 0.12 + 0.15
      const ends = rings.map((_, i) => start + i * 1.25 + 1.1)
      let done = 0
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        // the "finished" glow follows the playhead, so scrolling back un-finishes a ring
        onUpdate: () => {
          const now = tl.time()
          const n = ends.filter((e) => now >= e).length
          cells.forEach((c, i) => c.classList.toggle('is-done', i < n))
          if (n > done) playTick(n + 2)
          if (n === ends.length && done < n) playPluck()
          done = n
        },
      })
      ls.forEach((l, i) => tl.to(l, { autoAlpha: 1, duration: 0.05 }, 0.05 + i * 0.12))
      rings.forEach((r, i) => {
        const o = { v: 0 }
        const at = start + i * 1.25
        tl.fromTo(
          o,
          { v: 0 },
          {
            v: 100,
            duration: 1.1,
            ease: 'power2.out',
            onUpdate: () => {
              r.style.strokeDasharray = `${(o.v / 100) * C} ${C}`
              nums[i].textContent = String(Math.round(o.v))
            },
          },
          at,
        ).to(checks[i], { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(3)' }, at + 1.1)
      })
      tl.to(banner, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'back.out(2)' }, ends[ends.length - 1] + 0.2).to({}, { duration: 0.6 })
      return tl
    },
    [lang],
  )
  return (
    <div ref={ref} className="flex h-full w-full flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#0d0d0f]">
      <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
        <span className="flex gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <i className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <i className="h-2.5 w-2.5 rounded-full bg-white/15" />
        </span>
        <span className="flex-1 truncate rounded-md bg-white/6 px-3 py-1 text-center font-mono text-[11px] text-paper/60">{pt ? 'lighthouse · meta de cada entrega' : 'lighthouse · the target for every ship'}</span>
      </div>
      <div className="border-b border-white/8 px-5 py-4 font-mono text-[clamp(10.5px,0.95vw,13px)] leading-[1.8]">
        {lines.map((l) => (
          <p key={l} data-line className={l.startsWith('✓') ? 'text-signal' : l.startsWith('$') ? 'text-paper' : 'text-paper/50'}>
            {l}
          </p>
        ))}
      </div>
      <div className="relative grid flex-1 grid-cols-4 content-center gap-2 px-[4%] pb-[16%] pt-[4%]">
        {metrics.map((m) => (
          <div key={m} data-cell className="group/cell flex flex-col items-center gap-2 text-center">
            <div className="relative h-[clamp(56px,6.4vw,84px)] w-[clamp(56px,6.4vw,84px)] rounded-full transition-shadow duration-500 group-[.is-done]/cell:shadow-[0_0_34px_-4px_rgba(61,255,139,0.55)]">
              <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
                <circle cx="32" cy="32" r="26" fill="rgba(61,255,139,0.06)" stroke="rgba(61,255,139,0.14)" strokeWidth="5" />
                <circle data-ring cx="32" cy="32" r="26" fill="none" stroke="#3dff8b" strokeWidth="5" strokeLinecap="round" style={{ strokeDasharray: `0 ${C}` }} />
              </svg>
              <span data-num className="absolute inset-0 flex items-center justify-center font-mono text-[clamp(14px,1.4vw,20px)] font-semibold text-signal">
                0
              </span>
            </div>
            <span className="text-[clamp(10px,0.85vw,12.5px)] text-paper/60 transition-colors group-[.is-done]/cell:text-paper">{m}</span>
            <span data-check className="flex h-5 items-center gap-1 rounded-full bg-signal px-2 font-mono text-[10px] font-semibold text-ink opacity-0">
              ✓ OK
            </span>
          </div>
        ))}
        <div data-banner className="absolute inset-x-[4%] bottom-[6%] flex items-center justify-center gap-2 rounded-xl bg-signal py-2.5 font-mono text-[clamp(11px,1vw,13px)] font-semibold text-ink opacity-0">
          ✓ 4/4 · {pt ? 'pronto para produção' : 'ready for production'}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------------------------------
 * 04 · Motion: a bézier editor with this site's own curves (drag the handles)
 * ---------------------------------------------------------------------------------------------- */
const FORMS = [
  { pt: 'Esfera', en: 'Sphere', ease: 'silk', bez: '0.19, 1, 0.22, 1' },
  { pt: 'Nó toroidal', en: 'Torus knot', ease: 'silk', bez: '0.19, 1, 0.22, 1' },
  { pt: 'Onda', en: 'Wave', ease: 'curtain', bez: '0.76, 0, 0.24, 1' },
  { pt: 'Cubo', en: 'Cube', ease: 'snap', bez: '0.62, 0, 0, 1' },
]

/** 9,000 particles pouring from one formation into the next with this site's own eases. */
export function MotionDemo({ active, progress }: DemoProps) {
  const { lang } = useLang()
  const pt = lang === 'pt'
  const [form, setForm] = useState(0)
  useEffect(() => {
    let shown = 0
    let last = -1
    const tick = () => {
      shown += (progress.current - shown) * 0.12
      const f = Math.min(FORMS.length - 1, Math.round(shown * (FORMS.length - 1)))
      if (f !== last) {
        last = f
        setForm(f)
      }
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [progress])
  const f = FORMS[form]
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[20px] bg-[radial-gradient(60%_60%_at_50%_50%,rgba(61,255,139,0.12),transparent_70%)]">
      <SafeCanvas>
        <MotionMorph progress={progress} active={active} />
      </SafeCanvas>
      <div className="pointer-events-none absolute inset-x-4 top-4 flex items-start justify-between gap-4 font-mono text-[11px]">
        <span className="rounded-md bg-white/6 px-2 py-1 text-paper/70">
          9.000 {pt ? 'partículas' : 'particles'} · WebGL
        </span>
        <span className="rounded-md bg-signal px-2 py-1 text-ink">
          ease: {f.ease}
        </span>
      </div>
      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[clamp(1.3rem,2vw,2rem)] font-[700] tracking-[-0.03em] text-paper">{pt ? f.pt : f.en}</p>
          <p className="font-mono text-[11px] text-paper/50">cubic-bezier({f.bez})</p>
        </div>
        <div className="flex gap-1.5">
          {FORMS.map((x, i) => (
            <span key={x.en} className={clsx('h-1.5 rounded-full transition-all duration-500', i === form ? 'w-6 bg-signal' : 'w-1.5 bg-white/25')} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------------------------------
 * 05 · Apps & back-end: a BRL → USDT conversion in the app, with the API logs beside it
 * ---------------------------------------------------------------------------------------------- */

/** Digits roll like an odometer when the value changes. */
function Rolling({ value, className }: { value: string; className?: string }) {
  return (
    <span className={clsx('inline-flex tabular-nums', className)} aria-label={value}>
      {Array.from(value).map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} className="relative inline-block h-[1.15em] w-[0.62em] overflow-hidden" aria-hidden>
            <span className="absolute left-0 top-0 flex flex-col transition-transform duration-[900ms] ease-[cubic-bezier(0.19,1,0.22,1)]" style={{ transform: `translateY(${-Number(ch) * 1.15}em)`, transitionDelay: `${i * 45}ms` }}>
              {Array.from({ length: 10 }, (_, d) => (
                <span key={d} className="block h-[1.15em] leading-[1.15em]">
                  {d}
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span key={i} aria-hidden>
            {ch}
          </span>
        ),
      )}
    </span>
  )
}

const LOGS = [
  { at: 1, m: 'POST', p: '/v1/quotes', s: '201 · 41ms' },
  { at: 3, m: 'POST', p: '/v1/conversions', s: '202 · 38ms' },
  { at: 4, m: 'HOOK', p: 'pix.confirmed', s: 'ok · 4ms' },
  { at: 5, m: 'CHAIN', p: 'usdt.transfer · tron', s: 'confirmed' },
  { at: 6, m: 'PUSH', p: 'expo · ios + android', s: 'sent · 91ms' },
]

export function AppDemo({ progress }: DemoProps) {
  const { lang } = useLang()
  const pt = lang === 'pt'
  // 0 idle · 1 amount typed · 2 quote · 3 tap (quote locked) · 4 pix ok · 5 usdt sent · 6 success + push
  const [step, setStep] = useState(0)
  const phone = useRef<HTMLDivElement>(null)

  // the scroll walks the conversion: each slice of the card's progress is one step (and back)
  useEffect(() => {
    const at = [0, 0.08, 0.18, 0.3, 0.4, 0.5, 0.6]
    let shown = 0
    let last = -1
    const tick = () => {
      shown += (progress.current - shown) * 0.12
      let s = 0
      at.forEach((t, i) => {
        if (shown >= t) s = i
      })
      if (s !== last) {
        last = s
        setStep(s)
      }
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [progress])

  useEffect(() => {
    if (step === 3) playTick(4)
    if (step === 6) {
      playPluck()
      gsap.fromTo(phone.current!.querySelector('[data-okcheck]'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.7, delay: 0.15, ease: 'power2.out' })
    }
  }, [step])

  const send = step >= 1 ? (pt ? '5.000,00' : '5,000.00') : pt ? '0.000,00' : '0,000.00'
  const get = step >= 2 ? (pt ? '917,43' : '917.43') : pt ? '000,00' : '000.00'
  const processing = step >= 3 && step < 6
  const done = step === 6
  const rows = pt ? ['Cotação travada', 'Pix confirmado', 'USDT enviado'] : ['Quote locked', 'Pix confirmed', 'USDT sent']

  return (
    <div className="flex h-full w-full items-center justify-center gap-[5%] md:justify-start">
      <div ref={phone} className="relative aspect-[9/18.5] h-full max-h-[100%] shrink-0 overflow-hidden rounded-[34px] border-[6px] border-[#2a2a2e] bg-ink text-paper">
        <div className="absolute left-1/2 top-2 z-20 h-4 w-16 -translate-x-1/2 rounded-full bg-[#2a2a2e]" />
        <div className={clsx('absolute inset-x-2 top-7 z-30 flex items-center gap-2 rounded-2xl bg-paper/14 p-2.5 backdrop-blur-md transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]', done ? 'translate-y-0 opacity-100' : '-translate-y-[140%] opacity-0')}>
          <img src="/images/coins/usdt.svg" alt="" className="h-7 w-7 shrink-0" />
          <span className="min-w-0 text-[10.5px] leading-tight">
            <b className="block font-semibold">{pt ? 'USDT recebido' : 'USDT received'}</b>
            <span className="opacity-60">+917{pt ? ',' : '.'}43 USDT · {pt ? 'agora' : 'now'}</span>
          </span>
        </div>

        {/* screen: convert */}
        <div className={clsx('absolute inset-0 flex flex-col gap-2.5 px-3.5 pb-4 pt-12 transition-all duration-500', done ? '-translate-x-[30%] opacity-0' : 'translate-x-0 opacity-100')}>
          <p className="text-[13px] font-semibold">{pt ? 'Converter' : 'Convert'}</p>
          {[
            { label: pt ? 'Você envia' : 'You send', icon: '/images/coins/brl.svg', code: 'BRL', value: send, round: true },
            { label: pt ? 'Você recebe' : 'You get', icon: '/images/coins/usdt.svg', code: 'USDT', value: get, round: false },
          ].map((f, i) => (
            <div key={f.code} className="relative">
              <div className={clsx('rounded-2xl bg-white/[0.06] p-3 transition-shadow duration-500', step === i + 1 && 'shadow-[inset_0_0_0_1.5px_#3dff8b]')}>
                <p className="text-[9.5px] uppercase tracking-[0.08em] text-paper/45">{f.label}</p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-white/8 py-1 pl-1 pr-2 text-[11px] font-semibold">
                    <img src={f.icon} alt="" className={clsx('h-5 w-5 object-cover', f.round && 'rounded-full')} />
                    {f.code}
                  </span>
                  <Rolling value={f.value} className="text-[clamp(15px,1.45vw,20px)] font-bold tracking-[-0.03em]" />
                </div>
              </div>
              {i === 0 && (
                <span className="absolute -bottom-[15px] left-1/2 z-10 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border-4 border-ink bg-signal text-ink">
                  <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden>
                    <path d="M8 2v12M3 9l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.2" />
                  </svg>
                </span>
              )}
            </div>
          ))}
          <p className="mt-1 flex justify-between text-[9.5px] text-paper/50">
            <span>1 USDT = R$ 5,45</span>
            <span className="text-signal">{pt ? 'taxa 0%' : '0% fee'}</span>
          </p>

          <div className="mt-auto">
            {processing && (
              <ul className="mb-3 flex flex-col gap-1.5 text-[10.5px]">
                {rows.map((r, i) => {
                  const ok = step >= 3 + i
                  return (
                    <li key={r} className="flex items-center gap-2">
                      <span className={clsx('flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold transition-colors', ok ? 'bg-signal text-ink' : 'border border-white/25 text-transparent')}>✓</span>
                      <span className={ok ? 'text-paper' : 'text-paper/40'}>{r}</span>
                    </li>
                  )
                })}
              </ul>
            )}
            <span className={clsx('relative flex h-11 items-center justify-center gap-2 overflow-hidden rounded-2xl text-[13px] font-bold transition-colors duration-300', processing ? 'bg-white/10 text-paper' : 'bg-signal text-ink')}>
              {processing && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-paper/30 border-t-paper" />}
              {processing ? (pt ? 'Processando…' : 'Processing…') : pt ? 'Converter agora' : 'Convert now'}
              {step === 3 && <span className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-white/30" />}
            </span>
          </div>
        </div>

        {/* screen: success */}
        <div className={clsx('absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center transition-all duration-500', done ? 'translate-x-0 opacity-100' : 'translate-x-[30%] opacity-0')}>
          <svg viewBox="0 0 64 64" className="h-16 w-16" aria-hidden>
            <circle cx="32" cy="32" r="30" fill="rgba(61,255,139,0.14)" />
            <path data-okcheck d="M19 33l9 9 17-19" fill="none" stroke="#3dff8b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-[14px] font-bold">{pt ? 'Conversão concluída' : 'Conversion complete'}</p>
          <p className="text-[clamp(20px,2vw,26px)] font-bold tracking-[-0.03em] text-signal">+917{pt ? ',' : '.'}43 USDT</p>
          <div className="mt-2 w-full rounded-2xl bg-white/[0.06] p-3 text-left text-[10px]">
            {[
              [pt ? 'Enviado' : 'Sent', pt ? 'R$ 5.000,00' : 'R$ 5,000.00'],
              [pt ? 'Taxa' : 'Fee', '0,00%'],
              [pt ? 'Tempo total' : 'Total time', '38s'],
            ].map(([k, v]) => (
              <p key={k} className="flex justify-between py-0.5">
                <span className="text-paper/50">{k}</span>
                <span>{v}</span>
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden h-[86%] min-w-0 flex-1 overflow-hidden rounded-[18px] border border-white/10 bg-[#0d0d0f] p-4 font-mono text-[clamp(10px,0.9vw,12.5px)] leading-[1.9] md:block">
        <p className="mb-2 text-paper/40">node · api.server.ts</p>
        {LOGS.map((l) => (
          <p key={l.p} className={clsx('flex gap-2 whitespace-nowrap transition-all duration-500', step >= l.at ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0')}>
            <span className="w-[5em] shrink-0 text-signal">{l.m}</span>
            <span className="truncate text-paper/80">{l.p}</span>
            <span className="ml-auto shrink-0 text-paper/40">{l.s}</span>
          </p>
        ))}
        <p className={clsx('mt-3 text-paper/40 transition-opacity', step >= 6 ? 'opacity-100' : 'opacity-0')}>{pt ? '// do clique ao push em 38s' : '// from tap to push in 38s'}</p>
      </div>
    </div>
  )
}
