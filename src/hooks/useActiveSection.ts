import { useEffect, type RefObject } from 'react'
import { ScrollTrigger } from '@/lib/gsap'

/**
 * Reports whether a section is on (or near) screen, using ScrollTrigger instead of an
 * IntersectionObserver: after a route change the page is restored straight into a pinned
 * section, and observers can miss that jump; ScrollTrigger re-evaluates on every refresh.
 */
export function useActiveSection(ref: RefObject<HTMLElement | null>, onChange: (active: boolean) => void, margin = 200) {
  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: ref.current,
      start: `top bottom+=${margin}`,
      end: `bottom top-=${margin}`,
      refreshPriority: -20,
      onToggle: (self) => onChange(self.isActive),
      onRefresh: (self) => onChange(self.isActive),
    })
    onChange(st.isActive)
    return () => st.kill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
