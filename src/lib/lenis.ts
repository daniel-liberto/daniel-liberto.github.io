import Lenis from 'lenis'
import { gsap, ScrollTrigger } from './gsap'
import { scrollState } from './store'

let instance: Lenis | null = null

/**
 * One Lenis for the whole app (home and case pages share it), driven by the GSAP ticker
 * so smooth scroll, ScrollTrigger and every tween advance in the same frame.
 */
export function createLenis() {
  if (instance) return instance
  const lenis = new Lenis({
    autoRaf: false,
    lerp: 0.085,
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.2,
    syncTouch: false,
    anchors: false,
    prevent: (node) => node.closest?.('[data-lenis-prevent]') != null,
  })
  lenis.on('scroll', (l: Lenis) => {
    scrollState.velocity = l.velocity
    scrollState.y = l.scroll
    ScrollTrigger.update()
  })
  const tick = (time: number) => {
    lenis.raf(time * 1000)
    scrollState.smoothVelocity += (scrollState.velocity - scrollState.smoothVelocity) * 0.1
  }
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  instance = lenis
  if (import.meta.env.DEV) (window as unknown as { __lenis: Lenis }).__lenis = lenis
  return lenis
}

export const getLenis = () => instance

/** Smooth-scroll to an element id or a y position. */
export function scrollToTarget(target: string | number | HTMLElement, opts: { offset?: number; immediate?: boolean; duration?: number } = {}) {
  const lenis = instance
  if (!lenis) {
    if (typeof target === 'number') window.scrollTo(0, target)
    else (typeof target === 'string' ? document.querySelector(target) : target)?.scrollIntoView()
    return
  }
  lenis.scrollTo(target, {
    offset: opts.offset ?? 0,
    immediate: opts.immediate,
    duration: opts.duration ?? 1.6,
    easing: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    force: true,
  })
}

/** Pause smooth scroll (menus, preloader, transitions). */
export function lockScroll(locked: boolean) {
  if (!instance) return
  if (locked) instance.stop()
  else instance.start()
}
