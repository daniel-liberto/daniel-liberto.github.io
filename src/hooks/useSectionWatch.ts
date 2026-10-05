import { useGSAP, ScrollTrigger } from '@/lib/gsap'
import { useUI, type Theme } from '@/lib/store'
import type { RefObject } from 'react'

/**
 * Every element with data-theme (and optionally data-frame / data-frame-index) reports itself
 * to the header while it sits under the header line, so the header can recolor and show
 * the Figma-like "frame" name of what is on screen. The deepest active element wins.
 */
export function useSectionWatch(scope: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useGSAP(
    () => {
      const els = Array.from(scope.current!.querySelectorAll<HTMLElement>('[data-theme]'))
      const apply = (el: HTMLElement) => {
        const theme = el.dataset.theme as Theme
        const name = el.dataset.frame
        const index = el.dataset.frameIndex
        const s = useUI.getState()
        const patch: Parameters<typeof s.set>[0] = {}
        if (theme && s.theme !== theme) patch.theme = theme
        if (name && index && (s.frame.name !== name || s.frame.index !== index)) patch.frame = { name, index }
        if (Object.keys(patch).length) s.set(patch)
      }
      const triggers: ScrollTrigger[] = []
      const sync = () => {
        const on = triggers.filter((t) => t.isActive)
        if (on.length) apply(on[on.length - 1].trigger as HTMLElement)
      }
      els.forEach((el) => {
        triggers.push(
          ScrollTrigger.create({
            trigger: el,
            start: 'top 40px',
            end: 'bottom 40px',
            // computed after every pin so pin spacing is already in place
            refreshPriority: -10,
            onToggle: sync,
            onRefresh: sync,
          }),
        )
      })
      sync()
      // after a teleport (curtain jumps) the header re-reads whatever is under it
      window.addEventListener('section-resync', sync)
      return () => window.removeEventListener('section-resync', sync)
    },
    { scope, dependencies: deps, revertOnUpdate: true },
  )
}
