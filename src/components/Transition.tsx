import { useCallback, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { getLenis, lockScroll } from '@/lib/lenis'
import { homeMemory, useUI } from '@/lib/store'
import { playWhoosh } from '@/lib/sound'
import { TransitionContext, type GoOptions } from './transition-context'

const COLS = 5

/**
 * Page transitions for the router. Two flavours:
 * curtain: five columns rise, the route swaps underneath, then they keep rising off screen;
 * image: the clicked cover grows to fill the viewport and becomes the hero of the next page.
 */
export function TransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const root = useRef<HTMLDivElement>(null)
  const ghost = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const pending = useRef<null | { kind: 'curtain' | 'image'; hash?: string }>(null)
  const first = useRef(true)
  const prevPath = useRef(location.pathname)

  useLayoutEffect(() => {
    gsap.set(root.current!.querySelectorAll('[data-col]'), { yPercent: 100 })
  }, [])

  const go = useCallback(
    (to: string, opts: GoOptions = {}) => {
      if (useUI.getState().transitioning) return
      if (to === location.pathname && !opts.hash) return
      useUI.getState().set({ transitioning: true, menuOpen: false })
      if (location.pathname === '/') homeMemory.y = getLenis()?.scroll ?? window.scrollY
      homeMemory.fromCase = location.pathname.startsWith('/work') && to === '/'
      lockScroll(true)
      playWhoosh()

      const cols = root.current!.querySelectorAll<HTMLElement>('[data-col]')
      const g = ghost.current!

      if (opts.image) {
        pending.current = { kind: 'image', hash: opts.hash }
        const r = opts.image.getBoundingClientRect()
        const src = opts.image.getAttribute('data-src') ?? (opts.image as HTMLImageElement).currentSrc ?? ''
        g.style.backgroundImage = `url(${src})`
        gsap.set(g, {
          display: 'block',
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
          borderRadius: getComputedStyle(opts.image).borderRadius,
          autoAlpha: 1,
        })
        gsap.to(g, {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
          borderRadius: 0,
          duration: 1.15,
          ease: 'curtain',
          onComplete: () => navigate(to),
        })
        return
      }

      pending.current = { kind: 'curtain', hash: opts.hash }
      gsap.set(cols, { backgroundColor: opts.color ?? '#3dff8b' })
      gsap.fromTo(
        cols,
        { yPercent: 100 },
        {
          yPercent: 0,
          duration: 0.8,
          stagger: { each: 0.06, from: 'center' },
          ease: 'curtain',
          onComplete: () => navigate(to),
        },
      )
    },
    [location.pathname, navigate],
  )

  const jump = useCallback((target: string | number, label = '') => {
    if (useUI.getState().transitioning) return
    useUI.getState().set({ transitioning: true, menuOpen: false })
    lockScroll(true)
    playWhoosh()
    const cols = root.current!.querySelectorAll<HTMLElement>('[data-col]')
    const tag = labelRef.current!
    tag.querySelector('[data-jump-text]')!.textContent = label
    const lenis = getLenis()
    gsap
      .timeline({
        onComplete: () => {
          gsap.set(cols, { yPercent: 100 })
          useUI.getState().set({ transitioning: false })
          lockScroll(false)
        },
      })
      // 1. the curtain closes over the page (nothing has moved yet)
      .set(cols, { backgroundColor: '#111113' })
      .fromTo(cols, { yPercent: 100 }, { yPercent: 0, duration: 0.75, stagger: { each: 0.06, from: 'center' }, ease: 'curtain' })
      .fromTo(tag, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'silk' }, 0.55)
      .fromTo('[data-jump-bar]', { scaleX: 0 }, { scaleX: 1, duration: 1.15, ease: 'power2.inOut' }, 0.75)
      // 2. behind it, teleport (no smooth scroll: nobody is looking) and let every scrubbed scene settle
      .call(() => {
        const y = typeof target === 'number' ? target : (document.querySelector<HTMLElement>(target)?.getBoundingClientRect().top ?? 0) + window.scrollY
        lenis?.scrollTo(y, { immediate: true, force: true })
        if (!lenis) window.scrollTo(0, y)
        ScrollTrigger.update()
        requestAnimationFrame(() => window.dispatchEvent(new Event('section-resync')))
      }, [], 0.8)
      .call(() => window.dispatchEvent(new Event('section-resync')), [], 1.9)
      // 3. after at least a second, the curtain lifts and reveals the destination
      .to(tag, { autoAlpha: 0, y: -16, duration: 0.3 }, 1.95)
      .to(cols, { yPercent: -100, duration: 0.8, stagger: { each: 0.06, from: 'center' }, ease: 'curtain' }, 2.0)
  }, [])

  // runs after the new route has rendered (layout effects of the page already created their ScrollTriggers)
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const p = pending.current ?? { kind: 'curtain' as const }
    pending.current = null
    const lenis = getLenis()
    const cols = root.current!.querySelectorAll<HTMLElement>('[data-col]')
    const g = ghost.current!
    const wasPop = !useUI.getState().transitioning
    if (wasPop) homeMemory.fromCase = prevPath.current.startsWith('/work') && location.pathname === '/'
    prevPath.current = location.pathname

    // land at the right spot of the new page
    lenis?.scrollTo(0, { immediate: true, force: true })
    window.scrollTo(0, 0)

    let raf = 0
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        ScrollTrigger.refresh()
        if (location.pathname === '/') {
          const target = p.hash ? document.getElementById(p.hash) : null
          const y = target ? target.getBoundingClientRect().top + window.scrollY : homeMemory.fromCase ? homeMemory.y : 0
          lenis?.scrollTo(y, { immediate: true, force: true })
          window.scrollTo(0, y)
          ScrollTrigger.update()
        }
        lockScroll(false)

        if (p.kind === 'image') {
          gsap.to(g, { autoAlpha: 0, duration: 0.5, delay: 0.25, ease: 'power1.out', onComplete: () => gsap.set(g, { display: 'none' }) })
          useUI.getState().set({ transitioning: false })
        } else {
          if (wasPop) gsap.set(cols, { yPercent: 0, backgroundColor: '#19191c' })
          gsap.to(cols, {
            yPercent: -100,
            duration: 0.85,
            stagger: { each: 0.06, from: 'center' },
            ease: 'curtain',
            delay: 0.05,
            onComplete: () => {
              gsap.set(cols, { yPercent: 100 })
              useUI.getState().set({ transitioning: false })
            },
          })
        }
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [location.pathname, location.key])

  return (
    <TransitionContext.Provider value={{ go, jump }}>
      {children}
      <div ref={root} aria-hidden className="pointer-events-none fixed inset-0 z-[70] flex">
        {Array.from({ length: COLS }, (_, i) => (
          <div key={i} data-col className="h-full flex-1" style={{ marginLeft: i ? -1 : 0 }} />
        ))}
        <div ref={labelRef} className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-0">
          <span className="label text-paper/45">→</span>
          <span data-jump-text className="text-[clamp(2rem,6vw,5.5rem)] font-[760] leading-none tracking-[-0.05em] text-paper" />
          <span className="h-px w-40 bg-white/10">
            <span data-jump-bar className="block h-full w-full origin-left bg-signal" />
          </span>
        </div>
      </div>
      <div
        ref={ghost}
        aria-hidden
        className="pointer-events-none fixed z-[65] hidden bg-cover bg-center"
        style={{ willChange: 'top, left, width, height' }}
      />
    </TransitionContext.Provider>
  )
}
