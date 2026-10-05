import { lazy, useRef, useState } from 'react'
import clsx from 'clsx'
import { gsap, SplitText, useGSAP } from '@/lib/gsap'
import { useLang } from '@/lib/lang-context'
import { heroState, portraitState, useUI } from '@/lib/store'
import { texToScreen } from '@/lib/portraitMap'
import { useActiveSection } from '@/hooks/useActiveSection'
import { useMedia } from '@/hooks/useMedia'
import { useTransition } from '@/components/transition-context'
import { projects } from '@/content/projects'
import type { AnatomyKey } from '@/content/types'
import SafeCanvas from '@/components/SafeCanvas'

/** Renders **word** as an emphasized word. */
function Emph({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((part, i) =>
        i % 2 ? (
          <strong key={i} className="font-[720] text-paper">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  )
}

/** Covers that flip inside the title card, like a studio logo reel. */
const REEL = [...projects.map((p) => p.cover), ...projects.flatMap((p) => p.gallery.slice(0, 2)), '/images/me/daniel.webp']

const AnatomyScene = lazy(() => import('@/three/AnatomyScene'))

type Feature = {
  /** Feature position in the portrait (uv, top-left origin). */
  x: number
  y: number
  zoom: number
  side: 'l' | 'r'
  /** Label row, as a fraction of the stage height. */
  row: number
  pixel?: boolean
  spotlightBg?: boolean
}

const FEATURES: Record<AnatomyKey, Feature> = {
  brow: { x: 0.402, y: 0.334, zoom: 2.5, side: 'l', row: 0.27 },
  lens: { x: 0.548, y: 0.405, zoom: 7.5, side: 'r', row: 0.3, pixel: true },
  brain: { x: 0.5, y: 0.19, zoom: 1.9, side: 'l', row: 0.0 },
  beard: { x: 0.47, y: 0.56, zoom: 2.2, side: 'r', row: 0.6 },
  jacket: { x: 0.27, y: 0.77, zoom: 1.8, side: 'l', row: 0.66 },
  env: { x: 0.8, y: 0.15, zoom: 1.4, side: 'r', row: 0.0, spotlightBg: true },
}

type Layout = {
  W: number
  H: number
  wide: boolean
  stage: { l: number; t: number; s: number }
  labels: { x: number; y: number; w: number; ax: number; ay: number }[]
}

/**
 * The post-credits scene: after the Figma file, a closed curtain asks you to keep scrolling, and
 * behind it the anatomy of a designer who codes (the humorous self-portrait) plays as an extra.
 */
export default function PostCredits() {
  const { t, lang } = useLang()
  const { jump } = useTransition()
  const root = useRef<HTMLElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const pill = useRef<HTMLSpanElement>(null)
  const pillM = useRef<HTMLSpanElement>(null)
  const anchor = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const layout = useRef<Layout | null>(null)
  const [active, setActive] = useState(true)
  const [glOk, setGlOk] = useState(true)
  const wide = useMedia('(min-width: 900px)')
  const items = t.anatomy.items

  // pause WebGL when the hero is far away
  useActiveSection(root, setActive)

  useGSAP(
    () => {
      const container = pin.current!
      const a = anchor.current!
      const labels = gsap.utils.toArray<HTMLElement>('[data-co]', container)
      const lines = gsap.utils.toArray<SVGLineElement>('[data-line]', svg.current!)
      const marks = gsap.utils.toArray<SVGGElement>('[data-mark]', svg.current!)
      const dims = container.querySelector<HTMLElement>('[data-dims]')!
      const zoomEl = container.querySelector<HTMLElement>('[data-zoom]')!
      const rulerX = container.querySelector<HTMLElement>('[data-ruler-x]')
      const rulerY = container.querySelector<HTMLElement>('[data-ruler-y]')
      const co = items.map(() => ({ draw: 0, line: 0, mark: 0 }))

      /* ------------------------------ layout ------------------------------ */
      const measure = () => {
        const W = container.clientWidth
        const H = container.clientHeight
        const isWide = W >= 900
        const headerH = W < 768 ? 64 : 76
        let s: number
        let l: number
        let tp: number
        if (isWide) {
          s = Math.min(H * 0.64, W * 0.34)
          l = (W - s) / 2
          tp = Math.max(headerH + 70, (H - s) / 2 + 30)
        } else {
          s = Math.min(W - 32, H * 0.5)
          l = (W - s) / 2
          tp = headerH + Math.min(130, H * 0.16)
        }
        const gap = 56
        const lw = isWide ? Math.min(300, l - gap - 28) : s
        const keys = items.map((i) => i.key)
        const labelsL = keys.map((k) => {
          const f = FEATURES[k]
          if (!isWide) return { x: l, y: tp + s + 22, w: s, ax: 0, ay: 0 }
          const y = tp + f.row * s
          if (f.side === 'l') {
            const x = l - gap - lw
            return { x, y, w: lw, ax: l - gap + 16, ay: y + 26 }
          }
          const x = l + s + gap
          return { x, y, w: lw, ax: x - 16, ay: y + 26 }
        })
        layout.current = { W, H, wide: isWide, stage: { l, t: tp, s }, labels: labelsL }
        labels.forEach((el, i) => {
          const L = labelsL[i]
          el.style.left = `${L.x}px`
          el.style.top = `${L.y}px`
          el.style.width = `${L.w}px`
        })
        return layout.current
      }
      measure()

      const pillRect = () => {
        const c = container.getBoundingClientRect()
        // phones get a bigger photo card above the name, larger screens the inline pill
        const el = pillM.current && pillM.current.offsetParent ? pillM.current : pill.current!
        const r = el.getBoundingClientRect()
        return { left: r.left - c.left, top: r.top - c.top, width: r.width, height: r.height }
      }
      const placeAtPill = () => {
        const r = pillRect()
        gsap.set(a, { left: r.left, top: r.top, width: r.width, height: r.height })
      }
      placeAtPill()

      /* ------------------------------ split ------------------------------ */
      const nameSplit = SplitText.create('[data-split]', { type: 'chars', mask: 'chars' })

      /* ------------------------------ intro (plays when the curtain opens) ------------------------------ */
      gsap.set(nameSplit.chars, { yPercent: 115 })
      gsap.set('[data-hero-ui]', { yPercent: 110 })
      gsap.set('[data-sel]', { autoAlpha: 0 })
      portraitState.reveal = 0
      heroState.dots = 0
      const intro = gsap
        .timeline({ paused: true })
        .to(heroState, { dots: 1, duration: 2.6, ease: 'power2.inOut' }, 0)
        .to(nameSplit.chars, { yPercent: 0, duration: 1.4, stagger: 0.05, ease: 'silk' }, 0.15)
        .to('[data-sel]', { autoAlpha: 1, duration: 0.01, stagger: 0.06 }, 0.55)
        .fromTo('[data-sel-box]', { scale: 0.6 }, { scale: 1, duration: 0.7, ease: 'back.out(2)' }, 0.55)
        .to(portraitState, { reveal: 1, duration: 1.5, ease: 'power1.in' }, 0.75)
        .to('[data-hero-ui]', { yPercent: 0, duration: 1.2, stagger: 0.05, ease: 'silk' }, 0.9)

      /* ------------------------------ anatomy ------------------------------ */
      gsap.set('[data-anat]', { autoAlpha: 0 })
      gsap.set(labels, { autoAlpha: 0, y: 18 })
      const anatomyLen = () => window.innerHeight * (layout.current!.wide ? 5 : 4.6)
      // credits roll, frozen disclaimer and title card, all measured once at build time
      const H = window.innerHeight
      const W = window.innerWidth
      const list = container.querySelector<HTMLElement>('[data-roll]')!
      const freeze = container.querySelector<HTMLElement>('[data-freeze]')!
      const title = container.querySelector<HTMLElement>('[data-reel]')!
      const R = 4.4
      const travel = H + list.offsetHeight
      // the disclaimer rides right below the list and stops dead at the center of the screen
      const freezeY = H / 2 - freeze.offsetHeight / 2
      const tc = (R * (travel - freezeY)) / travel
      const F = tc + 1.6
      const tr = title.getBoundingClientRect()
      const grow = Math.min((W * 0.86) / tr.width, (H * 0.8) / tr.height)
      const K = F + 4.3 // where the anatomy scene begins
      // hold on the name + photo before the anatomy starts
      const C = K + 1.6

      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          id: 'post',
          refreshPriority: 20,
          trigger: container,
          start: 'top top',
          end: () => `+=${anatomyLen() + window.innerHeight * 7.6}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onRefreshInit: () => {
            measure()
          },
          onLeave: () => useUI.getState().set({ cinema: false }),
          onLeaveBack: () => useUI.getState().set({ cinema: false }),
          onUpdate: (self) => {
            const cinema = self.isActive && self.progress * tl.duration() < K - 0.2
            if (useUI.getState().cinema !== cinema) useUI.getState().set({ cinema })
            if (!self.isActive) return
            const s = useUI.getState()
            if (s.frame.index !== '08') s.set({ frame: { index: '08', name: t.postCredits.label }, theme: 'dark' })
          },
        },
      })

      // a. cinema credits roll on pure black
      const reel = { i: 0 }
      const setReel = () => (title.style.backgroundImage = `url(${REEL[Math.round(reel.i) % REEL.length]})`)
      setReel()
      tl.fromTo(list, { y: H }, { y: -list.offsetHeight, duration: R, ease: 'none' }, 0)
        .fromTo(freeze, { y: travel }, { y: freezeY, duration: tc, ease: 'none' }, 0)
        // b. the last line freezes in the middle of the screen and grows
        .fromTo(freeze, { scale: 1 }, { scale: W < 768 ? 1.08 : 1.6, duration: 1.1, ease: 'power2.out' }, tc)
        .to(freeze, { autoAlpha: 0, duration: 0.3 }, tc + 1.3)
        // c. black beat, then the title card grows until it almost fills the screen while the work flips inside it
        .fromTo('[data-card]', { autoAlpha: 0, scale: grow * 0.42 }, { autoAlpha: 1, duration: 0.4, ease: 'power2.out' }, F + 0.1)
        .to('[data-card]', { scale: grow, duration: 3, ease: 'power1.inOut' }, F + 0.1)
        .fromTo(reel, { i: 0 }, { i: REEL.length * 4 - 1, duration: 3.2, ease: 'none', onUpdate: setReel }, F + 0.1)
        .to('[data-presents]', { autoAlpha: 0, duration: 0.3 }, F + 2.2)
        // d. zoom through the letters straight into the post-credits scene
        .to('[data-card]', { scale: grow * 9, duration: 0.9, ease: 'power3.in' }, F + 3.35)
        .to('[data-credits]', { autoAlpha: 0, duration: 0.45, ease: 'power1.in' }, F + 3.8)
        .call(() => {
          if (intro.progress() === 0) intro.play()
        }, [], F + 3.75)

      const inner = gsap.timeline({ defaults: { ease: 'power2.inOut' } })

      // 1. the pill grows into the inspection stage, the name opens like a curtain
      inner.to('[data-move="a"]', { xPercent: -120, duration: 1.2 }, 0)
        .to('[data-move="b"]', { xPercent: 120, duration: 1.2 }, 0)
        .to('[data-move="ui"]', { autoAlpha: 0, y: -30, duration: 0.6, stagger: 0.05 }, 0)
        .fromTo(
          a,
          { left: () => pillRect().left, top: () => pillRect().top, width: () => pillRect().width, height: () => pillRect().height },
          {
            left: () => layout.current!.stage.l,
            top: () => layout.current!.stage.t,
            width: () => layout.current!.stage.s,
            height: () => layout.current!.stage.s,
            duration: 1.3,
            ease: 'power3.inOut',
          },
          0.1,
        )
        .to(portraitState, { radius: 6, dim: 0.35, duration: 1.2 }, 0.1)
        .to(heroState, { grid: 1, duration: 1 }, 0.2)
        .to('[data-anat]', { autoAlpha: 1, duration: 0.6, stagger: 0.05 }, 0.7)
        .fromTo('[data-anat-title] .split-line', { yPercent: 110 }, { yPercent: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 0.75)

      // 2. one feature at a time
      const slot = 1.25
      items.forEach((it, i) => {
        const f = FEATURES[it.key]
        const s = 1.6 + i * slot
        inner.to(
          portraitState,
          {
            zoom: f.zoom,
            fx: f.x,
            fy: f.y,
            pixel: f.pixel ? 1 : 0,
            dim: f.spotlightBg ? 0 : 0.78,
            dimP: f.spotlightBg ? 0.75 : 0,
                        duration: 0.55,
          } as gsap.TweenVars,
          s,
        )
          .to(labels[i], { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power3.out' }, s + 0.3)
          .to(co[i], { draw: 1, line: 1, mark: 1, duration: 0.4, ease: 'power2.out' }, s + 0.3)
          .to(labels[i], { autoAlpha: 0, y: -14, duration: 0.25, ease: 'power2.in' }, s + slot - 0.22)
          .to(co[i], { draw: 0, line: 0, mark: 0, duration: 0.22, ease: 'power2.in' }, s + slot - 0.22)
      })

      // 3. overview: the whole spec sheet at once
      const ov = 1.6 + items.length * slot + 0.1
      inner.to(portraitState, { zoom: 1, fx: 0.5, fy: 0.5, pixel: 0, dim: 0.45, dimP: 0, duration: 0.6 }, ov)
      if (layout.current!.wide) {
        inner.to(labels, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.04, ease: 'power3.out' }, ov + 0.35)
          .to(co, { draw: 1, line: 0.55, mark: 1, duration: 0.5, stagger: 0.04 }, ov + 0.35)
      } else {
        inner.to(co, { mark: 1, duration: 0.4, stagger: 0.04 }, ov + 0.35)
      }
      inner.fromTo('[data-anat-foot]', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.4 }, ov + 0.6)
      inner.to({}, { duration: 0.6 }, ov + 0.9)

      tl.add(inner, C)

      /* ------------------------------ per frame ------------------------------ */
      const tick = () => {
        const L = layout.current
        if (!L) return
        const c = container.getBoundingClientRect()
        const ar = a.getBoundingClientRect()
        const rel = { left: ar.left - c.left, top: ar.top - c.top, width: ar.width, height: ar.height }
        dims.textContent = `${Math.round(ar.width)} × ${Math.round(ar.height)}`
        zoomEl.textContent = `${Math.round(portraitState.zoom * 100)}%`
        items.forEach((it, i) => {
          const f = FEATURES[it.key]
          const fp = texToScreen(f.x, f.y, rel)
          const line = lines[i]
          const mark = marks[i]
          const lp = L.labels[i]
          if (L.wide && line) {
            line.setAttribute('x1', fp.x.toFixed(1))
            line.setAttribute('y1', fp.y.toFixed(1))
            line.setAttribute('x2', lp.ax.toFixed(1))
            line.setAttribute('y2', lp.ay.toFixed(1))
            const len = Math.hypot(lp.ax - fp.x, lp.ay - fp.y)
            line.style.strokeDasharray = `${len * co[i].draw} ${len + 10}`
            line.style.opacity = String(co[i].line)
          }
          if (mark) {
            mark.setAttribute('transform', `translate(${fp.x.toFixed(1)} ${fp.y.toFixed(1)})`)
            mark.style.opacity = String(co[i].mark)
          }
        })
        if (rulerX && rulerY) {
          rulerX.style.transform = `translateX(${rel.left}px) scaleX(${rel.width / 100})`
          rulerY.style.transform = `translateY(${rel.top}px) scaleY(${rel.height / 100})`
        }
      }
      gsap.ticker.add(tick)

      const onResize = () => {
        if (intro.progress() === 0) placeAtPill()
      }
      window.addEventListener('resize', onResize)

      return () => {
        gsap.ticker.remove(tick)
        window.removeEventListener('resize', onResize)
        nameSplit.revert()
      }
    },
    { scope: root, dependencies: [lang, wide], revertOnUpdate: true },
  )

  return (
    <section ref={root} id="post-credits" data-theme="dark" data-frame={t.postCredits.label} data-frame-index="08" className="relative z-20 bg-ink text-paper" aria-label={t.postCredits.label}>
      <div ref={pin} className="relative h-svh min-h-[560px] overflow-hidden">
        <div data-stage className="absolute inset-0">
          {/* WebGL: dot canvas + portrait */}
          <div className="absolute inset-0">
            <SafeCanvas onFail={() => setGlOk(false)}>
              <AnatomyScene anchor={anchor} active={active} />
            </SafeCanvas>
          </div>

          {/* rulers (anatomy) */}
          <div data-anat aria-hidden className="pointer-events-none absolute inset-x-0 top-[var(--header-h)] hidden h-5 border-b border-white/10 bg-ink/80 md:block">
            <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(to right, rgba(238,235,228,.35) 0 1px, transparent 1px 10px)', backgroundSize: '100% 4px', backgroundRepeat: 'repeat-x', backgroundPosition: 'bottom' }} />
            <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(to right, rgba(238,235,228,.5) 0 1px, transparent 1px 100px)', backgroundSize: '100% 9px', backgroundRepeat: 'repeat-x', backgroundPosition: 'bottom' }} />
            <div data-ruler-x className="absolute bottom-0 left-0 h-full w-[100px] origin-left bg-signal/25" />
          </div>
          <div data-anat aria-hidden className="pointer-events-none absolute bottom-0 left-0 top-[var(--header-h)] hidden w-5 border-r border-white/10 bg-ink/80 md:block">
            <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, rgba(238,235,228,.35) 0 1px, transparent 1px 10px)', backgroundSize: '4px 100%', backgroundRepeat: 'repeat-y', backgroundPosition: 'right' }} />
            <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, rgba(238,235,228,.5) 0 1px, transparent 1px 100px)', backgroundSize: '9px 100%', backgroundRepeat: 'repeat-y', backgroundPosition: 'right' }} />
            <div data-ruler-y className="absolute left-0 top-0 h-[100px] w-full origin-top bg-signal/25" style={{ marginTop: 'calc(-1 * var(--header-h))' }} />
          </div>

          {/* headline */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between px-gutter pb-[3.2vh] pt-[calc(var(--header-h)+3vh)]">
            <span />

            <div className="flex flex-col">
            <span ref={pillM} aria-hidden className="mb-[5vh] block aspect-[16/11] w-[64vw] self-start md:hidden" />
            <h1 className="relative font-display text-paper" aria-label="Daniel Liberto">
              <span className="flex items-end">
                <span data-move="a" data-split className="block text-[17vw] font-[790] leading-[0.8] tracking-[-0.055em] md:text-[15.5vw]" style={{ fontStretch: '100%' }}>
                  Daniel
                </span>
                <span ref={pill} aria-hidden className="mb-[0.06em] ml-[0.08em] hidden h-[0.66em] w-[1em] shrink-0 text-[17vw] md:inline-block md:text-[15.5vw]" />
                <span data-move="ui" className="mb-[1.4vw] ml-[2.2vw] hidden overflow-clip lg:block">
                  <span data-hero-ui className="label block leading-relaxed text-paper/70">
                    {t.hero.role}
                    <br />
                    {t.hero.roleB}
                  </span>
                </span>
              </span>
              <span data-move="b" className="block pl-[13vw] md:pl-[21vw]">
                <span data-split className="serif block text-[17vw] leading-[0.86] md:text-[15.5vw]">
                  Liberto<span className="text-signal">.</span>
                </span>
              </span>
            </h1>
            </div>

            <span />
          </div>

          {/* anatomy title + footnote + zoom */}
          <div data-anat className="pointer-events-none absolute left-[calc(var(--gutter)+20px)] top-[calc(var(--header-h)+44px)] max-w-[30rem] max-md:left-[var(--gutter)] max-md:top-[calc(var(--header-h)+12px)]">
            <p className="label text-signal">(08) {t.anatomy.label}</p>
            <h2 data-anat-title className="mt-3 text-[clamp(1.6rem,2.6vw,2.6rem)] font-[680] leading-[0.98] tracking-[-0.035em]">
              <span className="split-mask block">
                <span className="split-line block">{t.anatomy.title}</span>
              </span>
              <span className="split-mask block">
                <span className="split-line serif block font-normal">{t.anatomy.titleB}</span>
              </span>
            </h2>
          </div>
          <p data-anat-foot className="label pointer-events-none absolute bottom-[3.2vh] left-[calc(var(--gutter)+20px)] text-paper/45 opacity-0 max-md:left-[var(--gutter)]">
            * {t.anatomy.outro}
          </p>
          <div data-anat className="label pointer-events-none absolute bottom-[3.2vh] right-[var(--gutter)] flex items-center gap-2 text-paper/70">
            <span>{t.anatomy.zoom}</span>
            <span data-zoom className="min-w-[4.5ch] rounded-[4px] bg-ink-4 px-1.5 py-0.5 text-right tabular-nums text-paper">
              100%
            </span>
          </div>

          {/* callout lines + markers */}
          <svg ref={svg} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
            {items.map((it) => (
              <line key={`l-${it.key}`} data-line x1="0" y1="0" x2="0" y2="0" stroke="#3dff8b" strokeWidth="1" style={{ opacity: 0 }} />
            ))}
            {items.map((it, i) => (
              <g key={`m-${it.key}`} data-mark style={{ opacity: 0 }}>
                <circle r="11" fill="rgba(10,10,11,0.55)" stroke="#3dff8b" strokeWidth="1.2" />
                <text textAnchor="middle" dy="3.6" className="fill-signal font-mono text-[9.5px]">
                  {String(i + 1).padStart(2, '0')}
                </text>
              </g>
            ))}
          </svg>

          {/* the portrait layer (WebGL draws into this box) */}
          <div
            ref={anchor}
            className="absolute left-0 top-0"
            role="img"
            aria-label={lang === 'pt' ? 'Daniel Liberto, selfie com óculos de armação preta e jaqueta escura' : 'Daniel Liberto, a selfie with black-framed glasses and a dark jacket'}
          >
            {!glOk && <img src="/images/me/daniel-640.webp" alt="" className="absolute inset-0 h-full w-full rounded-[inherit] object-cover" />}
            <div data-sel className="pointer-events-none absolute -inset-px">
              <div data-sel-box className="absolute inset-0 border border-signal" />
              {['-left-[4px] -top-[4px]', '-right-[4px] -top-[4px]', '-left-[4px] -bottom-[4px]', '-right-[4px] -bottom-[4px]'].map((p) => (
                <span key={p} className={clsx('absolute h-[8px] w-[8px] border border-signal bg-paper', p)} />
              ))}
              <span className="absolute -top-6 left-0 flex items-center gap-1 whitespace-nowrap font-mono text-[0.68rem] text-signal">
                <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                  <rect x="1" y="1" width="10" height="10" rx="1.5" fill="none" stroke="currentColor" />
                  <path d="m2 9 3-3 2 2 1.5-1.5L10 8" fill="none" stroke="currentColor" />
                </svg>
                {t.anatomy.file}
              </span>
              <span className="absolute -bottom-7 left-1/2 flex w-0 justify-center">
                <span data-dims className="whitespace-nowrap rounded-[4px] bg-signal px-1.5 py-0.5 font-mono text-[0.66rem] font-medium tabular-nums text-ink">
                  0 × 0
                </span>
              </span>
            </div>
          </div>

          {/* callout labels */}
          {items.map((it, i) => (
            <div
              key={it.key}
              data-co
              className={clsx(
                'pointer-events-none absolute left-0 top-0',
                wide && FEATURES[it.key].side === 'l' ? 'text-right' : 'text-left',
                !wide && 'text-center',
              )}
            >
              <p className="label text-signal">
                {String(i + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
              </p>
              <h3 className="mt-2 text-[1.3rem] font-[650] leading-[1.05] tracking-[-0.02em] md:text-[1.5rem]">{it.title}</h3>
              <p className="mt-2 text-[0.92rem] leading-[1.4] text-paper/65 md:text-[0.98rem]"><Emph text={it.text} /></p>
            </div>
          ))}
        </div>

        {/* the end credits, on pure black */}
        <div data-credits className="pointer-events-none absolute inset-0 z-50 overflow-hidden bg-black text-paper">
          <div data-roll className="absolute inset-x-0 top-0 flex flex-col items-center px-gutter pb-[48vh]">
            <p className="serif mb-14 text-[clamp(1.6rem,3vw,2.6rem)] text-paper/80">{t.postCredits.creditsTitle}</p>
            <dl className="grid w-full max-w-[46rem] grid-cols-[1fr_1fr] items-baseline gap-x-8 gap-y-5">
              {t.postCredits.credits.slice(0, -1).map((c) => (
                <div key={c.role} className="contents">
                  <dt className="-mr-[0.12em] text-right font-mono text-[0.72rem] uppercase leading-none tracking-[0.12em] text-paper/45 md:text-[0.8rem]">{c.role}</dt>
                  <dd className="text-[0.95rem] font-[560] leading-none tracking-[-0.01em] md:text-[1.1rem]">{c.name}</dd>
                </div>
              ))}
            </dl>
            {(() => {
              const c = t.postCredits.credits[t.postCredits.credits.length - 1]
              return (
                <div className="mt-24 flex flex-col items-center text-center">
                  <p className="-mr-[0.12em] font-mono text-[0.78rem] uppercase tracking-[0.12em] text-signal md:text-[0.9rem]">{c.role}</p>
                  <p className="mt-4 max-w-[18ch] text-[1.6rem] font-[720] leading-[1.05] tracking-[-0.03em] text-signal md:text-[2.6rem]">{c.name}</p>
                </div>
              )
            })()}
          </div>
          <div data-freeze className="absolute inset-x-0 top-0 flex flex-col items-center px-gutter text-center">
            <p className="max-w-[24ch] font-display text-[clamp(1.4rem,2.4vw,2.2rem)] font-[720] italic leading-[1.15] tracking-[-0.02em] text-paper">
              “{t.postCredits.disclaimer}”
            </p>
            <p className="label mt-5 text-paper/45">Daniel Liberto © 2026</p>
          </div>
          <div data-card className="absolute inset-0 flex flex-col items-center justify-center opacity-0">
            <p
              data-reel
              className="bg-cover bg-center bg-clip-text px-4 text-center font-display text-[17vw] font-[850] uppercase leading-[0.82] tracking-[-0.055em] text-transparent md:text-[12vw]"
              style={{ WebkitBackgroundClip: 'text' }}
            >
              Daniel
              <br />
              Liberto
            </p>
            <div data-presents className="mt-6 flex flex-col items-center gap-3">
              <p className="label tracking-[0.5em] text-paper/60">{t.postCredits.presents}</p>
              <p className="font-mono text-[clamp(0.9rem,1.4vw,1.25rem)] font-[500] uppercase tracking-[0.42em] text-signal">{t.postCredits.presentsTitle}</p>
            </div>
          </div>
        </div>

      </div>

      {/* the real end */}
      <div className="relative flex min-h-[60svh] flex-col items-center justify-center gap-8 border-t border-white/8 px-gutter py-[12vh] text-center">
        <p className="serif text-[clamp(2.6rem,7vw,7rem)] leading-[0.95]">{t.postCredits.end}</p>
        <p className="max-w-[34rem] text-[1.02rem] leading-[1.55] text-paper/65">{t.postCredits.thanks}</p>
        <button type="button" onClick={() => jump(0, t.nav.home)} className="rounded-full bg-signal px-6 py-4 text-sm font-semibold text-ink">
          ↑ {t.postCredits.top}
        </button>
        <p className="label text-paper/40">© 2026 Daniel Liberto de Almeida · {t.footer.rights}</p>
      </div>
    </section>
  )
}
