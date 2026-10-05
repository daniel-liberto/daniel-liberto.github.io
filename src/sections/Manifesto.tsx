import { Fragment, useMemo, useRef } from 'react'
import clsx from 'clsx'
import { DrawSVGPlugin, Flip, gsap, ScrollTrigger, useGSAP } from '@/lib/gsap'
import { useLang } from '@/lib/lang-context'
import { playPluck } from '@/lib/sound'
import FigmaCursor from '@/components/FigmaCursor'
import FigmaLogo from '@/components/FigmaLogo'

type Style = 'serif' | 'code' | 'mark' | 'chip' | 'pill'
type Tok = { text: string; style?: Style }

function parse(src: string): Tok[] {
  const out: Tok[] = []
  const re = /\[([^\]]+)\]\{(\w+)\}/g
  let last = 0
  let m: RegExpExecArray | null
  const plain = (s: string) => s.split(/\s+/).filter(Boolean).forEach((w) => out.push({ text: w }))
  while ((m = re.exec(src))) {
    plain(src.slice(last, m.index))
    out.push({ text: m[1], style: m[2] as Style })
    last = re.lastIndex
  }
  plain(src.slice(last))
  return out
}

/** What the "Daniel" cursor shows in the properties tag after styling a word. */
const STYLE_TAG: Record<Style, string> = {
  serif: 'Fraunces · Italic 340',
  code: 'Geist Mono · Code',
  mark: 'Stroke · Hand drawn',
  chip: 'Component · Logo',
  pill: 'Fill · #3DFF8B',
}

export default function Manifesto() {
  const { t, lang } = useLang()
  const root = useRef<HTMLElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const toks = useMemo(() => parse(t.manifesto.text), [t.manifesto.text])

  useGSAP(
    () => {
      const container = root.current!.querySelector<HTMLElement>('[data-pin]')!
      const words = gsap.utils.toArray<HTMLElement>('[data-w]', container)
      const styled = words.filter((w) => w.dataset.style)
      const cursor = cursorRef.current!
      const sel = container.querySelector<HTMLElement>('[data-dsel]')!
      const tag = container.querySelector<HTMLElement>('[data-dtag]')!
      const xTo = gsap.quickTo(cursor, 'x', { duration: 0.7, ease: 'power3.out' })
      const yTo = gsap.quickTo(cursor, 'y', { duration: 0.7, ease: 'power3.out' })
      const N = words.length
      const idx = (el: HTMLElement) => words.indexOf(el)
      const fillEnd = 0.78
      // a styled word is edited a little after the reading fill reaches it
      const thresholds = styled.map((w) => ((idx(w) + 1.6) / N) * fillEnd)
      const applied = styled.map(() => false)
      let active = -1
      let selFor: HTMLElement | null = null

      gsap.set(words, { opacity: 0.12 })
      gsap.set(cursor, { x: container.clientWidth * 0.8, y: container.clientHeight * 0.9, autoAlpha: 0 })
      gsap.set(sel, { autoAlpha: 0 })
      gsap.set('[data-mark-path]', { drawSVG: '0%' })
      gsap.set('[data-stat]', { autoAlpha: 0, y: 30 })

      const setStyled = (i: number, on: boolean) => {
        if (applied[i] === on) return
        applied[i] = on
        const w = styled[i]
        const state = Flip.getState(words)
        w.classList.toggle('is-styled', on)
        Flip.from(state, { duration: 0.65, ease: 'power3.inOut', simple: true })
        const path = w.querySelector('[data-mark-path]')
        if (path) gsap.to(path, { drawSVG: on ? '100%' : '0%', duration: on ? 0.7 : 0.3, ease: 'power2.inOut' })
        if (on) {
          playPluck()
          gsap.fromTo(w, { scale: 1.08 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' })
        }
      }

      const statsShown = { v: false }
      const st = ScrollTrigger.create({
        id: 'manifesto',
        refreshPriority: 90,
        trigger: container,
        start: 'top top',
        end: () => `+=${window.innerHeight * 2.2}`,
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress
          // reading fill
          const f = Math.min(p / fillEnd, 1) * N
          words.forEach((w, i) => (w.style.opacity = String(gsap.utils.clamp(0.12, 1, 0.12 + (f - i) * 0.9))))
          // edits
          thresholds.forEach((th, i) => setStyled(i, p >= th))
          // the cursor travels to each word a moment before editing it
          let current = 0
          thresholds.forEach((th, i) => {
            if (p >= th - 0.07) current = i
          })
          active = p < 0.03 || p > 0.95 ? -1 : current
          gsap.to(cursor, { autoAlpha: active === -1 ? 0 : 1, duration: 0.3, overwrite: 'auto' })
          const showSel = active !== -1 && applied[active]
          if (showSel && selFor !== styled[active]) {
            selFor = styled[active]
            tag.textContent = STYLE_TAG[selFor.dataset.style as Style]
          }
          gsap.to(sel, { autoAlpha: showSel ? 1 : 0, duration: 0.25, overwrite: 'auto' })
          if (p > 0.84 && !statsShown.v) {
            statsShown.v = true
            gsap.to('[data-stat]', { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08, ease: 'silk' })
            gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
              const v = +el.dataset.count!
              gsap.fromTo(
                el,
                { textContent: 0 },
                { textContent: v, duration: 1.6, ease: 'power3.out', snap: { textContent: 1 }, onUpdate: () => (el.textContent = Number(el.textContent).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')) },
              )
            })
          } else if (p < 0.8 && statsShown.v) {
            statsShown.v = false
            gsap.to('[data-stat]', { autoAlpha: 0, y: 30, duration: 0.4, stagger: 0.04 })
          }
        },
      })

      const tick = () => {
        if (active === -1) return
        const w = styled[active]
        const c = container.getBoundingClientRect()
        const r = w.getBoundingClientRect()
        xTo(r.right - c.left - 6)
        yTo(r.bottom - c.top - 8)
        if (selFor) {
          const s = selFor.getBoundingClientRect()
          sel.style.transform = `translate3d(${s.left - c.left - 6}px, ${s.top - c.top - 2}px, 0)`
          sel.style.width = `${s.width + 12}px`
          sel.style.height = `${s.height + 4}px`
        }
      }
      gsap.ticker.add(tick)
      return () => {
        gsap.ticker.remove(tick)
        st.kill()
      }
    },
    { scope: root, dependencies: [lang], revertOnUpdate: true },
  )

  return (
    <section
      ref={root}
      id="manifesto"
      data-theme="light"
      data-frame="Manifesto"
      data-frame-index="02"
      className="relative z-10 -mt-[100svh] rounded-t-[28px] bg-paper text-ink"
      aria-labelledby="manifesto-label"
    >
      <div data-pin className="relative flex h-svh min-h-[600px] flex-col justify-between overflow-hidden px-gutter pb-[5vh] pt-[calc(var(--header-h)+4vh)]">
        <div className="flex items-start justify-between">
          <p id="manifesto-label" className="label text-ink/60">
            (02) {t.manifesto.label}
          </p>
          <p className="label hidden text-ink/40 sm:block">Text · Mona Sans 560 · {lang.toUpperCase()}</p>
        </div>

        <p
          key={lang}
          className="relative max-w-[94rem] text-[8.4vw] font-[560] leading-[1.04] tracking-[-0.04em] md:text-[5.3vw] md:leading-[1.02]"
          style={{ fontStretch: '100%' }}
        >
          {toks.map((tk, i) => (
            <Fragment key={i}>
              <span
                data-w
                data-style={tk.style}
                className={clsx(
                  'manifesto-word relative inline-block whitespace-nowrap',
                  tk.style === 'chip' && 'items-center',
                )}
              >
                {tk.style === 'chip' && (
                  <span className="chip-logo inline-block overflow-hidden align-middle">
                    <FigmaLogo className="h-[0.62em] w-auto" />
                  </span>
                )}
                {tk.text}
                {tk.style === 'mark' && (
                  <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="pointer-events-none absolute -bottom-[0.12em] left-0 h-[0.28em] w-full overflow-visible" aria-hidden>
                    <path data-mark-path d="M2 13C38 5 78 4 118 8s58 6 80 1" fill="none" stroke="#0b7a3e" strokeWidth="4.5" strokeLinecap="round" />
                  </svg>
                )}
              </span>{' '}
            </Fragment>
          ))}
        </p>

        <div className="grid grid-cols-2 gap-x-6 gap-y-6 border-t border-ink/15 pt-5 md:grid-cols-4">
          {t.manifesto.stats.map((s) => (
            <div key={s.label} data-stat>
              <p className="text-[clamp(2.2rem,4.4vw,4.4rem)] font-[680] leading-none tracking-[-0.05em]">
                <span data-count={s.value}>0</span>
                <span className="text-signal-deep">{s.suffix}</span>
              </p>
              <p className="mt-2 max-w-[16rem] text-[0.88rem] leading-snug text-ink/60">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Daniel's selection + properties tag */}
        <div data-dsel aria-hidden className="pointer-events-none absolute left-0 top-0 z-10 rounded-[3px] border-[1.5px] border-signal-deep" style={{ willChange: 'transform' }}>
          {['-left-[4px] -top-[4px]', '-right-[4px] -top-[4px]', '-left-[4px] -bottom-[4px]', '-right-[4px] -bottom-[4px]'].map((p) => (
            <span key={p} className={clsx('absolute h-[7px] w-[7px] border border-signal-deep bg-paper', p)} />
          ))}
          <span data-dtag className="absolute -top-7 left-0 whitespace-nowrap rounded-[4px] bg-signal-deep px-1.5 py-0.5 font-mono text-[0.66rem] text-paper" />
        </div>
        <FigmaCursor ref={cursorRef} name={t.manifesto.cursor} />
      </div>
    </section>
  )
}

// keep the plugin referenced so tree-shaking never drops its registration
void DrawSVGPlugin
