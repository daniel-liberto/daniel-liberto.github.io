import { useEffect, useRef } from 'react'
import { Navigate, useParams } from 'react-router'
import { gsap, ScrollTrigger, SplitText, useGSAP } from '@/lib/gsap'
import { useLang } from '@/lib/lang-context'
import { useUI } from '@/lib/store'
import { projectById, projects } from '@/content/projects'
import { useSectionWatch } from '@/hooks/useSectionWatch'
import { useTransition } from '@/components/transition-context'
import Magnetic from '@/components/Magnetic'
import RollText from '@/components/RollText'

export default function CaseRoute() {
  const { id = '' } = useParams()
  const project = projectById(id)
  if (!project) return <Navigate to="/" replace />
  return <Case key={project.id} id={project.id} />
}

function Case({ id }: { id: string }) {
  const { t, lang } = useLang()
  const { go } = useTransition()
  const p = projectById(id)!
  const copy = t.projects[p.id]
  const idx = projects.findIndex((x) => x.id === p.id)
  const next = projects[(idx + 1) % projects.length]
  const nextCopy = t.projects[next.id]
  const root = useRef<HTMLDivElement>(null)
  const leaving = useRef(false)
  useSectionWatch(root, [lang, id])

  useEffect(() => {
    document.title = `${p.name} · Daniel Liberto`
    return () => {
      document.title = t.meta.title
    }
  }, [p.name, t.meta.title])

  useGSAP(
    () => {
      const ready = useUI.getState().ready
      /* hero: the cover (already full screen after the transition) folds into a card */
      const title = SplitText.create('[data-case-title]', { type: 'chars', mask: 'chars' })
      gsap.from(title.chars, { yPercent: 115, duration: 1.3, stagger: 0.035, ease: 'silk', delay: ready ? 0.35 : 1.6 })
      gsap.from('[data-hero-meta]', { y: 30, autoAlpha: 0, duration: 1, stagger: 0.06, ease: 'silk', delay: ready ? 0.6 : 1.9 })
      gsap
        .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '[data-case-hero]', start: 'top top', end: 'bottom top', scrub: true } })
        .to('[data-cover]', { clipPath: 'inset(8% 6% 8% 6% round 24px)', scale: 0.92, yPercent: 10 }, 0)
        .to('[data-cover-img]', { scale: 1.15 }, 0)
        .to('[data-case-title]', { yPercent: -60, opacity: 0.2 }, 0)

      /* text reveals */
      gsap.utils.toArray<HTMLElement>('[data-lines]').forEach((el) => {
        SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) => gsap.from(self.lines, { yPercent: 105, stagger: 0.07, duration: 1.1, ease: 'silk', scrollTrigger: { trigger: el, start: 'top 85%' } }),
        })
      })
      gsap.utils.toArray<HTMLElement>('[data-fade]').forEach((el) => {
        gsap.from(el, { y: 40, autoAlpha: 0, duration: 1, ease: 'silk', scrollTrigger: { trigger: el, start: 'top 88%' } })
      })

      /* metrics count up when they can */
      gsap.utils.toArray<HTMLElement>('[data-metric]').forEach((el) => {
        const raw = el.dataset.metric!
        const m = raw.match(/^([^\d]*)([\d.,]+)(.*)$/)
        if (!m) return
        const [, pre, num, post] = m
        const decimals = /[.,]\d$/.test(num) ? 1 : 0
        const value = parseFloat(num.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'))
        const fmt = (v: number) => pre + v.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + post
        const o = { v: 0 }
        gsap.to(o, { v: value, duration: 1.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' }, onUpdate: () => (el.textContent = fmt(o.v)) })
      })

      /* gallery: vertical scroll drives a horizontal strip */
      const strip = root.current!.querySelector<HTMLElement>('[data-strip]')!
      const pin = root.current!.querySelector<HTMLElement>('[data-gallery]')!
      const dist = () => strip.scrollWidth - window.innerWidth
      const tween = gsap.to(strip, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: { trigger: pin, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 1, invalidateOnRefresh: true, refreshPriority: 10 },
      })
      gsap.utils.toArray<HTMLElement>('[data-shot]').forEach((el) => {
        gsap.fromTo(el.querySelector('img'), { xPercent: -8 }, { xPercent: 8, ease: 'none', scrollTrigger: { trigger: el, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } })
      })

      /* next case: the next cover grows until it fills the screen, then we travel */
      const nextImg = root.current!.querySelector<HTMLElement>('[data-next-img]')!
      gsap
        .timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: '[data-next]',
            start: 'top top',
            end: '+=120%',
            pin: true,
            scrub: true,
            refreshPriority: 5,
            onUpdate: (self) => {
              if (self.progress > 0.995 && !leaving.current) {
                leaving.current = true
                go(`/work/${next.id}`, { image: nextImg })
              }
            },
          },
        })
        .fromTo('[data-next-frame]', { clipPath: 'inset(30% 34% 30% 34% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)' }, 0)
        .fromTo(nextImg, { scale: 1.3 }, { scale: 1 }, 0)
        .to('[data-next-label]', { yPercent: -120, autoAlpha: 0 }, 0.6)
        .to('[data-next-dim]', { opacity: 0.55 / 0.6 }, 0.6)

      // images settle late on a cold load: measure again once they are in
      const imgs = Array.from(root.current!.querySelectorAll('img'))
      let pending = imgs.filter((i) => !i.complete).length
      const done = () => --pending === 0 && ScrollTrigger.refresh()
      imgs.forEach((i) => !i.complete && i.addEventListener('load', done, { once: true }))
    },
    { scope: root, dependencies: [lang, id], revertOnUpdate: true },
  )

  const metaRows = [
    [t.case.role, copy.role],
    [t.case.year, p.year],
    [t.case.platforms, copy.platforms.join(' · ')],
  ]

  return (
    <div ref={root} style={{ '--pc': p.color } as React.CSSProperties}>
      {/* hero */}
      <section data-case-hero data-theme="dark" data-frame={p.name} data-frame-index={p.index} className="relative h-svh overflow-hidden bg-ink text-paper">
        <div data-cover className="absolute inset-0 overflow-hidden" style={{ clipPath: 'inset(0% 0% 0% 0% round 0px)' }}>
          <img data-cover-img src={p.cover} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-ink/55" />
          <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-ink to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-ink via-ink/80 to-transparent" />
        </div>
        <div className="relative flex h-full flex-col justify-end px-gutter pb-[5vh]">
          <div data-hero-meta className="label mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-paper/70">
            <span className="text-paper">
              {p.index} / 0{projects.length}
            </span>
            <span>{copy.category}</span>
            <span>{p.year}</span>
          </div>
          <div className="flex items-center gap-[2vw]">
            <img data-hero-meta src={p.logo} alt="" className="h-[14vw] w-[14vw] shrink-0 rounded-[22%] border border-white/10 object-cover md:h-[9vw] md:w-[9vw]" />
            <h1 data-case-title className="min-w-0 font-display text-[14vw] font-[820] leading-[0.82] tracking-[-0.055em] md:text-[10.5vw]" style={{ fontStretch: '112%' }}>
              {p.name}
            </h1>
          </div>
          <div data-hero-meta className="mt-6 flex items-end justify-between gap-6">
            <p className="serif max-w-[34rem] text-[1.5rem] leading-[1.1] md:text-[2rem]" style={{ color: p.color }}>
              {copy.tagline}
            </p>
            <p className="label hidden items-center gap-3 md:flex">
              {t.case.scroll}
              <span className="inline-block h-10 w-px bg-paper/40" />
            </p>
          </div>
        </div>
      </section>

      {/* overview */}
      <section data-theme="dark" className="relative bg-ink px-gutter py-[16vh] text-paper">
        <div className="grid grid-cols-12 gap-6">
          <p className="label col-span-12 text-paper/50 md:col-span-3">(01) {t.case.overview}</p>
          <div className="col-span-12 md:col-span-9">
            <p data-lines className="text-[clamp(1.6rem,3.1vw,3.2rem)] font-[560] leading-[1.12] tracking-[-0.03em]">
              {copy.overview}
            </p>
            <div className="mt-[8vh] grid grid-cols-1 gap-6 border-t border-white/10 pt-6 md:grid-cols-3">
              {metaRows.map(([k, v]) => (
                <div key={k} data-fade>
                  <p className="label text-paper/45">{k}</p>
                  <p className="mt-2 text-[1.02rem] leading-snug">{v}</p>
                </div>
              ))}
            </div>
            <div data-fade className="mt-8 flex flex-wrap items-center gap-2">
              {p.stack.map((s) => (
                <span key={s} className="rounded-full border border-white/15 px-3 py-1.5 text-[0.85rem]">
                  {s}
                </span>
              ))}
            </div>
            <div data-fade className="mt-10">
              <Magnetic>
                <a href={p.url} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-3 rounded-full px-6 py-4 text-sm font-semibold text-ink" style={{ background: p.color }}>
                  <RollText text={`${t.case.visit} · ${p.urlLabel}`} />
                  <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform duration-500 group-hover:rotate-45" aria-hidden>
                    <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </a>
              </Magnetic>
            </div>
          </div>
        </div>
      </section>

      {/* challenge vs approach: contrast break */}
      <section data-theme="light" className="relative rounded-t-[28px] bg-paper px-gutter py-[16vh] text-ink">
        <div className="grid grid-cols-12 gap-x-6 gap-y-16">
          <div className="col-span-12 md:col-span-6">
            <p className="label text-ink/50">(02) {t.case.challenge}</p>
            <p data-lines className="mt-6 text-[clamp(1.35rem,2.2vw,2.2rem)] font-[560] leading-[1.2] tracking-[-0.025em]">
              {copy.challenge}
            </p>
          </div>
          <div className="col-span-12 md:col-span-6 md:pt-[22vh]">
            <p className="label text-ink/50">(03) {t.case.solution}</p>
            <p data-lines className="mt-6 text-[clamp(1.1rem,1.5vw,1.45rem)] leading-[1.5] text-ink/80">
              {copy.solution}
            </p>
          </div>
        </div>
        <div className="mt-[14vh] grid grid-cols-1 gap-8 border-t border-ink/15 pt-8 md:grid-cols-3">
          {copy.metrics.map((m) => (
            <div key={m.label} data-fade>
              <p data-metric={m.value} className="text-[clamp(3.2rem,7vw,7.4rem)] font-[760] leading-none tracking-[-0.06em]">
                {m.value}
              </p>
              <p className="mt-3 max-w-[18rem] text-[0.95rem] text-ink/60">{m.label}</p>
            </div>
          ))}
        </div>
        <p className="label mt-8 text-ink/40">{t.case.metricsNote}</p>
      </section>

      {/* gallery: horizontal */}
      <section data-gallery data-theme="dark" className="relative h-svh overflow-hidden bg-ink text-paper">
        <div data-strip className="flex h-full w-max items-center gap-[4vw] px-gutter">
          <div className="flex w-[80vw] shrink-0 flex-col justify-center md:w-[34vw]">
            <p className="label text-paper/50">(04) {t.case.gallery}</p>
            <h2 className="serif mt-5 text-[14vw] leading-[0.9] md:text-[6vw]">{t.case.gallery}</h2>
            <p className="label mt-8 flex items-center gap-3">
              <span className="inline-block h-px w-12 bg-paper/40" />→
            </p>
          </div>
          {p.gallery.map((src, i) => (
            <figure key={src} data-shot className="relative h-[58vh] w-[84vw] shrink-0 md:h-[66vh] md:w-[min(64vw,105vh)]">
              <div className="h-full w-full overflow-hidden rounded-[22px] bg-ink-3">
                <img src={src} alt={copy.captions[i] ?? p.name} loading="lazy" className="h-full w-[116%] max-w-none object-cover" style={{ marginLeft: '-8%' }} />
              </div>
              <figcaption className="label mt-4 flex justify-between text-paper/55">
                <span>{copy.captions[i]}</span>
                <span>
                  {String(i + 1).padStart(2, '0')} / {String(p.gallery.length).padStart(2, '0')}
                </span>
              </figcaption>
            </figure>
          ))}
          <div className="w-[10vw] shrink-0" />
        </div>
      </section>

      {/* highlights */}
      <section data-theme="dark" className="relative bg-ink px-gutter py-[14vh] text-paper">
        <p className="label text-paper/50">(05) {t.case.highlights}</p>
        <ol className="mt-10 border-t border-white/10">
          {copy.highlights.map((h, i) => (
            <li key={h} data-fade className="group grid grid-cols-12 items-baseline gap-6 border-b border-white/10 py-6 md:py-8">
              <span className="label col-span-2 md:col-span-1" style={{ color: p.color }}>
                0{i + 1}
              </span>
              <span className="col-span-10 text-[clamp(1.3rem,2.6vw,2.6rem)] font-[600] leading-[1.1] tracking-[-0.03em] transition-transform duration-700 ease-[var(--ease-silk)] group-hover:translate-x-3 md:col-span-11">
                {h}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-16 flex flex-wrap items-center justify-between gap-6">
          <a
            href="/#work"
            onClick={(e) => {
              e.preventDefault()
              go('/', { hash: 'work' })
            }}
            className="group label flex items-center gap-3 text-paper"
          >
            ← <RollText text={t.case.back} />
          </a>
          <a href={p.url} target="_blank" rel="noreferrer" className="label text-paper/60 underline underline-offset-4">
            {p.urlLabel}
          </a>
        </div>
      </section>

      {/* next case */}
      <section data-next data-theme="dark" className="relative h-svh overflow-hidden bg-ink text-paper">
        <div data-next-frame className="absolute inset-0 overflow-hidden" style={{ clipPath: 'inset(30% 34% 30% 34% round 24px)' }}>
          <img data-next-img data-src={next.cover} src={next.cover} alt="" className="h-full w-full object-cover" />
          <div data-next-dim className="absolute inset-0 bg-ink/60" />
        </div>
        <div data-next-label className="pointer-events-none relative flex h-full flex-col items-center justify-center text-center">
          <p className="label text-paper/60">{t.case.next}</p>
          <p className="mt-4 font-display text-[14vw] font-[820] leading-[0.85] tracking-[-0.055em] md:text-[9vw]" style={{ fontStretch: '112%' }}>
            {next.name}
          </p>
          <p className="serif mt-4 text-[1.4rem]" style={{ color: next.color }}>
            {nextCopy.tagline}
          </p>
          <p className="label mt-10 flex items-center gap-2 text-paper/60">↓ {t.case.holdNext}</p>
        </div>
      </section>
    </div>
  )
}
