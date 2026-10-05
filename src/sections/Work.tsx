import { lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gsap, ScrollTrigger, SplitText, useGSAP } from '@/lib/gsap'
import { useLang } from '@/lib/lang-context'
import { useUI } from '@/lib/store'
import { projects } from '@/content/projects'
import { useTransition } from '@/components/transition-context'
import Magnetic from '@/components/Magnetic'
import RollText from '@/components/RollText'
import SafeCanvas from '@/components/SafeCanvas'
import GitHubMark from '@/components/GitHubMark'
import { useActiveSection } from '@/hooks/useActiveSection'

const WorkPlanes = lazy(() => import('@/three/WorkPlanes'))

export default function Work() {
  const { t, lang } = useLang()
  const { go } = useTransition()
  const root = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const [glReady, setGlReady] = useState(false)
  const [active, setActive] = useState(false)
  const [planeEls, setPlaneEls] = useState<HTMLElement[]>([])

  useActiveSection(root, setActive)

  useEffect(() => {
    setPlaneEls(Array.from(root.current!.querySelectorAll<HTMLElement>('[data-gl-plane]')))
  }, [])

  const defs = useMemo(() => planeEls.map((el, i) => ({ id: projects[i].id, el, src: projects[i].cover, color: projects[i].color })), [planeEls])
  const onGlReady = useCallback(() => setGlReady(true), [])

  const open = (id: string, el: HTMLElement | null) => go(`/work/${id}`, { image: el })

  useGSAP(
    () => {
      const pin = pinRef.current!
      const track = pin.querySelector<HTMLElement>('[data-track]')!
      const panels = gsap.utils.toArray<HTMLElement>('[data-panel]', pin)
      const green = pin.querySelector<HTMLElement>('[data-green]')!
      const glow = pin.querySelector<HTMLElement>('[data-glow]')!
      const bar = pin.querySelector<HTMLElement>('[data-wbar]')!
      const count = pin.querySelector<HTMLElement>('[data-wcount]')!
      const hud = pin.querySelector<HTMLElement>('[data-hud]')!
      const distance = () => track.scrollWidth - window.innerWidth
      let current = -1
      let onGreen = false

      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          id: 'work',
          refreshPriority: 70,
          trigger: pin,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: (st) => {
            const gl = green.getBoundingClientRect().left
            // progress across the three projects only
            const first = panels[1].getBoundingClientRect()
            const last = panels[projects.length].getBoundingClientRect()
            const span = last.left - first.left
            const prog = gsap.utils.clamp(0, 1, (window.innerWidth * 0.35 - first.left) / Math.max(span, 1))
            bar.style.transform = `scaleX(${prog})`
            const idx = Math.min(projects.length - 1, Math.round(prog * (projects.length - 1)))
            if (idx !== current) {
              current = idx
              gsap.to(glow, { '--glow': projects[idx].color, duration: 1.2, ease: 'silk' })
              count.textContent = String(idx + 1).padStart(2, '0')
            }
            const g = gl < window.innerWidth * 0.45
            if (g !== onGreen && st.isActive) {
              onGreen = g
              useUI.getState().set(g ? { theme: 'light', frame: { index: '05', name: t.services.label } } : { theme: 'dark', frame: { index: '04', name: t.work.label } })
            }
            gsap.to(hud, { autoAlpha: gl < window.innerWidth * 0.6 ? 0 : 1, duration: 0.3, overwrite: 'auto' })
          },
          onToggle: (self) => {
            if (self.isActive) {
              onGreen = false
              useUI.getState().set({ theme: 'dark', frame: { index: '04', name: t.work.label } })
            }
          },
        },
      })

      // the intro title starts whole and only drifts apart as the track carries it away
      gsap.to('[data-wt="a"]', { xPercent: -18, ease: 'none', scrollTrigger: { trigger: panels[0], containerAnimation: tween, start: 'left left', end: 'right left', scrub: true } })
      gsap.to('[data-wt="b"]', { xPercent: 14, ease: 'none', scrollTrigger: { trigger: panels[0], containerAnimation: tween, start: 'left left', end: 'right left', scrub: true } })

      // per-panel choreography bound to the horizontal movement
      panels.slice(1).forEach((panel) => {
        const title = panel.querySelector('[data-panel-title]')
        if (title) {
          const split = SplitText.create(title, { type: 'chars', mask: 'chars' })
          gsap.from(split.chars, { yPercent: 110, rotate: 5, stagger: 0.025, duration: 1, ease: 'silk', scrollTrigger: { trigger: panel, containerAnimation: tween, start: 'left 70%' } })
        }
        gsap.from(panel.querySelectorAll('[data-pin-in]'), { y: 40, autoAlpha: 0, stagger: 0.06, duration: 1, scrollTrigger: { trigger: panel, containerAnimation: tween, start: 'left 65%' } })
        const plane = panel.querySelector('[data-gl-plane]')
        if (plane) {
          gsap
            .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: panel, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } })
            .fromTo(plane, { scale: 0.82 }, { scale: 1 })
            .to(plane, { scale: 0.82 })
        }
      })

      // the green panel: its title grows as it arrives
      gsap.fromTo('[data-green-title]', { scale: 0.7, transformOrigin: '0% 100%' }, { scale: 1, ease: 'none', scrollTrigger: { trigger: green, containerAnimation: tween, start: 'left right', end: 'left left', scrub: true } })
    },
    { scope: root, dependencies: [lang], revertOnUpdate: true },
  )

  useEffect(() => {
    if (glReady) ScrollTrigger.refresh()
  }, [glReady])

  return (
    <section ref={root} id="work" data-theme="dark" data-frame={t.work.label} data-frame-index="04" className="relative z-10 bg-ink text-paper" aria-labelledby="work-title">
      <div ref={pinRef} data-gl={glReady ? "on" : "off"} className="group/work relative h-svh min-h-[560px] overflow-hidden">
        <div
          data-glow
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.2]"
          style={{ '--glow': projects[0].color, background: 'radial-gradient(55% 60% at 50% 55%, var(--glow) 0%, transparent 72%)' } as React.CSSProperties}
        />
        <SafeCanvas>{defs.length > 0 && <WorkPlanes defs={defs} active={active} onReady={onGlReady} />}</SafeCanvas>

        <div data-track className="relative z-10 flex h-full w-max items-stretch">
          {/* intro */}
          <article data-panel className="flex w-[100vw] shrink-0 flex-col justify-center px-gutter md:w-[62vw]">
            <p className="label text-paper/50">(04) {t.work.label}</p>
            <h2 id="work-title" className="mt-6 font-display leading-[0.84] tracking-[-0.05em]">
              <span data-wt="a" className="block text-[16.5vw] font-[800] md:text-[10.5vw]" style={{ fontStretch: '112%' }}>
                {t.work.title}
              </span>
              <span data-wt="b" className="serif block pl-[6vw] text-[15vw] md:text-[9.5vw]">
                {t.work.titleB}
              </span>
            </h2>
            <p className="mt-10 max-w-[30rem] text-[1.02rem] leading-[1.5] text-paper/65">{t.work.intro}</p>
            <p className="label mt-8 flex items-center gap-3 text-paper">
              <span className="inline-block h-px w-12 bg-paper/40" />
              {t.work.drag} →
            </p>
          </article>

          {projects.map((p) => {
            const copy = t.projects[p.id]
            return (
              <article key={p.id} data-panel className="relative flex w-[88vw] shrink-0 flex-col justify-center gap-5 pr-[6vw] md:w-[72vw] lg:w-[66vw]">
                <div data-pin-in className="label flex items-end justify-between gap-4 text-paper/50">
                  <span className="text-paper">
                    {p.index} <span className="text-paper/40">/ 0{projects.length}</span>
                  </span>
                  <span className="hidden sm:block">{copy.category}</span>
                  <span>{p.year}</span>
                </div>

                <button
                  type="button"
                  data-gl-plane={p.id}
                  data-cursor="label"
                  data-cursor-label={t.work.view}
                  onClick={(e) => open(p.id, e.currentTarget.querySelector('img'))}
                  className="relative block h-[40vh] w-full rounded-[20px] text-left md:h-[47vh]"
                  aria-label={`${t.work.view}: ${p.name}`}
                >
                  <img
                    src={p.cover}
                    data-src={p.cover}
                    alt={`${p.name}: ${copy.tagline}`}
                    className="absolute inset-0 h-full w-full rounded-[20px] object-cover transition-opacity duration-500 group-data-[gl=on]/work:opacity-0"
                    loading="lazy"
                    draggable={false}
                  />
                </button>

                <div className="flex items-end justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-[1.2vw]">
                      <img data-pin-in src={p.logo} alt="" className="h-[12vw] w-[12vw] shrink-0 rounded-[22%] border border-white/10 object-cover shadow-[0_14px_40px_-16px_rgba(0,0,0,0.8)] md:h-[4.4vw] md:w-[4.4vw]" />
                      <h3 data-panel-title className="min-w-0 whitespace-nowrap font-display text-[11vw] font-[800] leading-[0.84] tracking-[-0.05em] md:text-[4.6vw]" style={{ fontStretch: '110%' }}>
                        {p.name}
                      </h3>
                    </div>
                    <p data-pin-in className="serif mt-4 text-[1.35rem] leading-[1.1] md:text-[1.6rem]" style={{ color: p.color }}>
                      {copy.tagline}
                    </p>
                    <p data-pin-in className="mt-2 hidden max-w-[44rem] text-[0.95rem] leading-snug text-paper/60 sm:block">
                      {copy.summary}
                    </p>
                  </div>
                  <div data-pin-in className="flex shrink-0 justify-end">
                    <Magnetic>
                      <button
                        type="button"
                        data-cursor="hide"
                        onClick={(e) => open(p.id, e.currentTarget.closest('[data-panel]')?.querySelector<HTMLElement>('[data-gl-plane] img') ?? null)}
                        className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-paper/25 text-center text-[0.8rem] font-semibold leading-tight transition-colors duration-500 hover:border-transparent hover:text-ink md:h-28 md:w-28"
                        style={{ '--c': p.color } as React.CSSProperties}
                      >
                        <span className="pointer-events-none absolute inset-0 scale-0 rounded-full bg-[var(--c)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-100" />
                        <span className="relative">
                          <RollText text={t.work.view} />
                        </span>
                      </button>
                    </Magnetic>
                  </div>
                </div>
              </article>
            )
          })}

          {/* archive */}
          <article data-panel className="relative flex w-[88vw] shrink-0 flex-col justify-center gap-7 pr-[8vw] md:w-[46vw]">
            <p data-pin-in className="label text-paper/50">{t.work.archive}</p>
            <h3 key={lang} data-panel-title className="serif text-[15vw] leading-[0.9] md:text-[6.5vw]">
              {t.work.moreTitle}
            </h3>
            <p data-pin-in className="max-w-[26rem] text-paper/60">
              {t.work.moreText}
            </p>
            <ul data-pin-in className="divide-y divide-white/10 border-y border-white/10">
              {t.archive.map((a) => (
                <li key={a.name} className="flex items-center justify-between gap-4 py-3 transition-[padding] duration-500 hover:pl-3">
                  <span className="flex items-center gap-3 text-[1.05rem] font-medium">
                    <GitHubMark className="h-[1.15em] w-[1.15em] shrink-0 text-paper" />
                    {a.name}
                  </span>
                  <span className="label flex items-center gap-4 text-paper/45">
                    <span className="hidden sm:inline">{a.kind}</span>
                    <span>{a.year}</span>
                    <span className="rounded-full border border-white/15 px-2 py-0.5">{t.work.private}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div data-pin-in>
              <Magnetic>
                <a href="https://github.com/daniel-liberto" target="_blank" rel="noreferrer" className="group inline-flex items-center gap-3 rounded-full bg-paper px-6 py-4 text-sm font-semibold text-ink">
                  <RollText text={t.work.moreCta} />
                  <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform duration-500 group-hover:rotate-45" aria-hidden>
                    <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </a>
              </Magnetic>
            </div>
          </article>

          {/* hand-off: the track ends on a green screen that becomes the services section */}
          <article data-green className="relative flex w-[100vw] shrink-0 flex-col justify-end bg-paper px-gutter pb-[7vh] text-ink">
            <p className="label absolute left-[var(--gutter)] top-[calc(var(--header-h)+3vh)] text-ink/60">(05) {t.services.label}</p>
            <h2 data-green-title className="font-display leading-[0.82] tracking-[-0.055em]">
              <span className="block text-[21vw] font-[800] md:text-[15vw]" style={{ fontStretch: '115%' }}>
                {t.services.title}
              </span>
              <span className="serif block text-[20vw] md:text-[14vw]">{t.services.titleB}</span>
            </h2>
            <p className="mt-8 max-w-[34rem] text-[1.05rem] leading-[1.5] text-ink/75 md:absolute md:bottom-[8vh] md:right-[var(--gutter)] md:mt-0">{t.services.intro}</p>
          </article>
        </div>

        <div data-hud aria-hidden className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex items-center gap-4 px-gutter">
          <span data-wcount className="label tabular-nums">
            01
          </span>
          <div className="h-px flex-1 bg-white/10">
            <div data-wbar className="h-full origin-left bg-paper" style={{ transform: 'scaleX(0)' }} />
          </div>
          <span className="label text-paper/50">0{projects.length}</span>
        </div>
      </div>
    </section>
  )
}
