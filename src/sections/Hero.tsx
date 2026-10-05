import { useEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger, SplitText, useGSAP } from '@/lib/gsap'
import { useLang } from '@/lib/lang-context'
import { heroGate, pointer, useUI } from '@/lib/store'
import { scrollToTarget } from '@/lib/lenis'
import { useClock } from '@/hooks/useClock'
import { useActiveSection } from '@/hooks/useActiveSection'
import { createStudioLayer, faceCenter, photoRect, STUDIO, type StudioState } from '@/three/studio'

type Layer = Awaited<ReturnType<typeof createStudioLayer>>

/** Depth of each plane in the exploded view (px at 1440 wide). */
const DEPTH = [0, 150, 300, 450]

/**
 * The hero is built like a Figma file: the room, the word "Daniel", Daniel himself (cut out with
 * a Vision person mask) and "Liberto" + UI on top. The pointer gives the planes real parallax,
 * and scrolling explodes them into an isometric layer view before the manifesto slides in.
 */
export default function Hero() {
  const { t, lang } = useLang()
  const ready = useUI((s) => s.ready)
  const root = useRef<HTMLElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const bgHost = useRef<HTMLDivElement>(null)
  const personHost = useRef<HTMLDivElement>(null)
  const layers = useRef<{ bg?: Layer; person?: Layer }>({})
  const visible = useRef(true)
  const [glFailed, setGlFailed] = useState(false)
  const clock = useClock()
  const state = useRef({ ex: 0, orbit: 0, sel: -1, card: 0, paper: 0, reveal: 0, dim: 0, zoom: 1.04, mx: 0, my: 0 })

  // WebGL layers
  useEffect(() => {
    let cancelled = false
    Promise.all([createStudioLayer(bgHost.current!, 'bg'), createStudioLayer(personHost.current!, 'person')])
      .then(([bg, person]) => {
        if (cancelled) {
          bg.dispose()
          person.dispose()
          return
        }
        layers.current = { bg, person }
        requestAnimationFrame(() => requestAnimationFrame(() => heroGate.resolve()))
      })
      .catch((e) => {
        console.warn('[webgl] hero layers disabled:', e)
        setGlFailed(true)
        heroGate.resolve()
      })
    return () => {
      cancelled = true
      layers.current.bg?.dispose()
      layers.current.person?.dispose()
      layers.current = {}
    }
  }, [])

  useActiveSection(root, (on) => (visible.current = on), 100)

  // per-frame: parallax, exploded view, shaders
  useEffect(() => {
    const p = pin.current!
    const stack = p.querySelector<HTMLElement>('[data-stack]')!
    const planes = Array.from(p.querySelectorAll<HTMLElement>('[data-plane]'))
    const tags = Array.from(p.querySelectorAll<HTMLElement>('[data-tag]'))
    const outlines = Array.from(p.querySelectorAll<HTMLElement>('[data-outline]'))
    const cardsel = p.querySelector<HTMLElement>('[data-cardsel]')!
    const paper = p.querySelector<HTMLElement>('[data-paper]')!
    const dimsEl = p.querySelector<HTMLElement>('[data-carddims]')!
    const s = state.current
    const start = performance.now()
    const tick = () => {
      if (!visible.current) return
      const W = p.clientWidth
      const H = p.clientHeight
      const r = p.getBoundingClientRect()
      const inside = pointer.active && pointer.y > r.top && pointer.y < r.bottom
      const tx = inside ? (pointer.x / W) * 2 - 1 : 0
      const ty = inside ? ((pointer.y - r.top) / H) * 2 - 1 : 0
      s.mx += (tx - s.mx) * 0.06
      s.my += (ty - s.my) * 0.06
      const ex = s.ex
      const k = W / 1440
      const o = s.orbit
      const sc = (1 - ex * 0.46 - o * 0.14) * (1 - s.card * 0.6)
      stack.style.transform = `translate3d(0, ${ex * 5 + o * 22}vh, 0) rotateX(${ex * 54 - o * 8}deg) rotateZ(${-ex * 34 + o * 30}deg) scale(${sc})`
      // the composition, flattened, becomes a selected frame of the file
      if (s.card > 0.001) {
        const w = W * sc
        const h = H * sc
        cardsel.style.width = `${w}px`
        cardsel.style.height = `${h}px`
        cardsel.style.transform = `translate3d(${(W - w) / 2}px, ${(H - h) / 2}px, 0)`
        dimsEl.textContent = `${W} × ${H}`
      }
      paper.style.clipPath = `circle(${(s.paper * Math.hypot(W, H) * 0.52).toFixed(1)}px at 50% 50%)`
      // planes drift by depth (the person moves the other way, which sells the separation)
      const par = [
        [-s.mx * 6, -s.my * 4],
        [-s.mx * 16, -s.my * 9],
        [s.mx * 10, s.my * 6],
        [s.mx * 4, s.my * 2],
      ]
      // layer selection: the selected plane lifts out of the stack and its outline turns green
      const lift = planes.map((_, i) => Math.max(0, 1 - Math.abs(s.sel - i) * 1.4))
      planes.forEach((el, i) => {
        const dom = i === 1 || i === 3
        const z = DEPTH[i] * k * ex * (1 + o * 0.45) + lift[i] * 110 * k * ex
        el.style.transform = `translate3d(${dom ? par[i][0] : 0}px, ${dom ? par[i][1] : 0}px, ${z}px)`
      })
      const tagA = gsap.utils.clamp(0, 1, (ex - 0.35) / 0.4)
      tags.forEach((el, i) => {
        el.style.opacity = String(tagA * (s.sel < -0.5 ? 1 : 0.45 + lift[i] * 0.55))
        el.style.transform = `scale(${1 + lift[i] * 0.3})`
      })
      outlines.forEach((el, i) => {
        el.style.opacity = String(gsap.utils.clamp(0, 1, ex * 2))
        el.style.borderColor = lift[i] > 0.05 ? `rgba(61,255,139,${0.25 + lift[i] * 0.75})` : ''
        el.style.borderWidth = lift[i] > 0.05 ? '2px' : ''
      })

      const L = layers.current
      if (!L.bg || !L.person) return
      const { rect, focus, fadeL } = photoRect(W, H)
      const face = faceCenter(rect, focus, s.zoom)
      const lx = pointer.x - face.x
      const ly = pointer.y - r.top - face.y
      const len = Math.hypot(lx, ly) || 1
      const st: StudioState = {
        rect,
        focus,
        zoom: s.zoom,
        reveal: s.reveal,
        fadeL,
        light: inside ? [lx / len, ly / len] : [Math.cos(performance.now() / 2400), -0.4],
        rim: 0.75,
        dim: s.dim,
      }
      const time = (performance.now() - start) / 1000
      L.bg.render(st, [par[0][0], par[0][1]], time)
      L.person.render(st, [par[2][0], par[2][1]], time)
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  // intro + scroll choreography
  useGSAP(
    () => {
      const s = state.current
      const split = SplitText.create('[data-split]', { type: 'chars', mask: 'chars' })
      const played = useUI.getState().introPlayed
      if (!ready) {
        gsap.set(split.chars, { yPercent: 115 })
        gsap.set('[data-hero-ui]', { yPercent: 110 })
        s.reveal = 0
      } else if (played) {
        s.reveal = 1
      } else {
        gsap.set(split.chars, { yPercent: 115 })
        gsap.set('[data-hero-ui]', { yPercent: 110 })
        gsap
          .timeline({ delay: 0.25, onComplete: () => useUI.getState().set({ introPlayed: true }) })
          .to(s, { reveal: 1, duration: 2.4, ease: 'power2.inOut' }, 0)
          .to(split.chars, { yPercent: 0, duration: 1.4, stagger: 0.045, ease: 'silk' }, 0.6)
          .to('[data-hero-ui]', { yPercent: 0, duration: 1.2, stagger: 0.05, ease: 'silk' }, 1.1)
      }

      const unit = () => window.innerHeight * 1.2
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          id: 'hero',
          refreshPriority: 100,
          trigger: pin.current,
          start: 'top top',
          end: () => `+=${unit() * 4.9 + window.innerHeight}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (!self.isActive) return
            const theme = s.paper > 0.6 ? 'light' : 'dark'
            if (useUI.getState().theme !== theme) useUI.getState().set({ theme })
          },
        },
      })
      // 1. the composition explodes into its layers
      tl.to(s, { ex: 1, duration: 1, ease: 'power2.inOut' }, 0)
        .to('[data-hero-fade]', { autoAlpha: 0, duration: 0.35 }, 0)
        .to(s, { zoom: 1.0, duration: 1 }, 0)
        // 2. the stack orbits while each layer gets selected, bottom to top
        .to(s, { orbit: 1, duration: 1.9, ease: 'sine.inOut' }, 1)
        .fromTo(s, { sel: -0.8 }, { sel: 3.7, duration: 1.9 }, 1)
        // 3. everything flattens back and shrinks into a selected frame of the file
        .to(s, { ex: 0, orbit: 0, duration: 0.9, ease: 'power2.inOut' }, 3)
        .to(s, { card: 1, duration: 0.9, ease: 'power3.inOut' }, 3.25)
        .fromTo('[data-cardsel]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 3.6)
        // 4. pre-manifesto: paper floods out of the frame, the next section arrives on the same paper
        .to(s, { paper: 1, duration: 0.8, ease: 'power2.in' }, 4.1)
        .fromTo('[data-next]', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.25 }, 4.65)
        .to({}, { duration: 0.1 }, 4.8)
      const exit = window.innerHeight / unit()
      tl.to({}, { duration: exit }, 4.9)
      return () => split.revert()
    },
    { scope: root, dependencies: [ready, lang], revertOnUpdate: true },
  )

  useEffect(() => {
    if (!ready) return
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 400)
    return () => window.clearTimeout(id)
  }, [ready])

  const tag = (i: number) => (
    <span data-tag className="pointer-events-none absolute left-6 top-6 z-10 flex items-center gap-2 rounded-lg bg-signal px-3 py-1.5 font-mono text-[clamp(14px,1.7vw,24px)] font-medium text-ink opacity-0 shadow-lg">
      <span className="tabular-nums opacity-60">{String(i + 1).padStart(2, '0')}</span>
      {t.hero.layers[i]}
    </span>
  )
  const outline = (fill: string) => <span data-outline aria-hidden className="pointer-events-none absolute inset-0 border border-paper/25 opacity-0" style={{ background: fill }} />

  return (
    <section ref={root} id="top" data-theme="dark" data-frame="Hero" data-frame-index="01" className="relative z-0 bg-ink text-paper" aria-label="Daniel Liberto">
      <div ref={pin} className="relative h-svh min-h-[560px] overflow-hidden" style={{ perspective: '2400px', perspectiveOrigin: '50% 40%' }}>
        <div data-stack className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          {/* 01 · the room */}
          <div data-plane className="absolute inset-0">
            {outline('#0d0d0f')}
            <div ref={bgHost} className="absolute inset-0" />
            {glFailed && (
              <img src={STUDIO.src} alt="" className="absolute right-0 top-0 h-full w-full object-cover object-[60%_20%] md:w-[60%]" style={{ maskImage: 'linear-gradient(90deg, transparent, #000 35%)' }} />
            )}
            {tag(0)}
          </div>

          {/* 02 · "Daniel", behind his head */}
          <div data-plane className="pointer-events-none absolute inset-0">
            {outline('rgba(255,255,255,0.02)')}
            <div className="absolute left-1/2 top-[calc(var(--header-h)+1.5vh)] -translate-x-1/2 md:left-[9vw] md:top-[12vh] md:translate-x-0">
              <p data-split aria-hidden className="whitespace-nowrap font-display text-[25vw] font-[800] leading-[0.8] tracking-[-0.055em] md:text-[18.5vw]">
                Daniel
              </p>
            </div>
            {tag(1)}
          </div>

          {/* 03 · Daniel, cut out */}
          <div data-plane className="pointer-events-none absolute inset-0">
            {outline('rgba(255,255,255,0.015)')}
            <div
              ref={personHost}
              className="absolute inset-0"
              role="img"
              aria-label={lang === 'pt' ? 'Daniel Liberto, de óculos e camiseta preta, numa sala com luz quente' : 'Daniel Liberto, wearing glasses and a black t-shirt, in a warmly lit room'}
            />
            {tag(2)}
          </div>

          {/* 04 · "Liberto." in front + interface */}
          <div data-plane className="pointer-events-none absolute inset-0">
            {outline('rgba(255,255,255,0.02)')}
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-ink via-ink/70 to-transparent md:hidden" />
            <h1 className="sr-only">
              Daniel Liberto · {t.hero.role} {t.hero.roleB}
            </h1>
            <div className="absolute bottom-[19vh] left-1/2 -translate-x-1/2 md:bottom-auto md:left-[17vw] md:top-[49vh] md:translate-x-0">
              <p data-split aria-hidden className="serif whitespace-nowrap text-[23vw] leading-[0.86] md:text-[15.5vw]">
                Liberto<span className="text-signal">.</span>
              </p>
            </div>

            <div data-hero-fade className="absolute inset-0 flex flex-col justify-between px-gutter pb-[3.2vh] pt-[calc(var(--header-h)+3vh)]">
              <div className="label flex items-start justify-between gap-6 text-paper/60 max-md:invisible">
                <div className="overflow-clip">
                  <p data-hero-ui>({t.hero.edition})</p>
                </div>
                <div className="overflow-clip text-right">
                  <p data-hero-ui className="tabular-nums">
                    {t.hero.location} · {clock}
                  </p>
                </div>
              </div>

              <div className="flex items-end justify-between gap-6">
                <div className="max-w-[24rem]">
                  <div className="overflow-clip">
                    <p data-hero-ui className="label text-signal">
                      {t.hero.role} {t.hero.roleB}
                    </p>
                  </div>
                  <div className="mt-3 overflow-clip">
                    <p data-hero-ui className="text-[0.95rem] leading-[1.45] text-paper/75 md:text-[1.02rem]">
                      {t.hero.intro}
                    </p>
                  </div>
                </div>
                <div className="hidden overflow-clip md:block">
                  <button
                    type="button"
                    data-hero-ui
                    onClick={() => scrollToTarget(window.innerHeight * 1.25, { duration: 2.4 })}
                    className="label pointer-events-auto flex items-center gap-3 text-paper"
                  >
                    {t.hero.scroll}
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-paper/25">
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
                        <path d="M8 1.5 14 5 8 8.5 2 5Z M2 8l6 3.5L14 8 M2 11l6 3.5 6-3.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>
            </div>
            {tag(3)}
          </div>
        </div>
        {/* the flattened composition, selected as a frame */}
        <div data-cardsel aria-hidden className="pointer-events-none absolute left-0 top-0 opacity-0">
          <div className="absolute inset-0 border-[1.5px] border-signal" />
          {['-left-[4px] -top-[4px]', '-right-[4px] -top-[4px]', '-left-[4px] -bottom-[4px]', '-right-[4px] -bottom-[4px]'].map((c) => (
            <span key={c} className={`absolute h-[8px] w-[8px] border border-signal bg-paper ${c}`} />
          ))}
          <span className="absolute -top-6 left-0 flex items-center gap-1.5 font-mono text-[11px] text-signal">
            <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden>
              <path d="M5 1.5v13M11 1.5v13M1.5 5h13M1.5 11h13" fill="none" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            Hero
          </span>
          <span data-carddims className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[4px] bg-signal px-1.5 py-0.5 font-mono text-[11px] text-ink">1440 × 900</span>
        </div>
        {/* pre-manifesto: paper grows out of the frame */}
        <div data-paper aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center bg-paper" style={{ clipPath: 'circle(0px at 50% 50%)' }}>
          <p data-next className="label flex items-center gap-2 text-ink/60 opacity-0">
            <span className="text-ink">(02)</span> {t.manifesto.label} ↓
          </p>
        </div>
      </div>
    </section>
  )
}
