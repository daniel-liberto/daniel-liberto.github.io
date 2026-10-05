import { useEffect } from 'react'
import { createLenis } from '@/lib/lenis'
import { gsap } from '@/lib/gsap'
import { pointer } from '@/lib/store'

/** Boots Lenis once for the whole app and tracks the pointer for every effect that needs it. */
export default function SmoothScroll() {
  useEffect(() => {
    const lenis = createLenis()
    lenis.stop() // the preloader starts it
    let lx = 0
    let ly = 0
    const move = (e: PointerEvent) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.nx = (e.clientX / window.innerWidth) * 2 - 1
      pointer.ny = -(e.clientY / window.innerHeight) * 2 + 1
      pointer.active = true
    }
    const leave = () => (pointer.active = false)
    const tick = () => {
      pointer.vx += (pointer.x - lx - pointer.vx) * 0.25
      pointer.vy += (pointer.y - ly - pointer.vy) * 0.25
      lx = pointer.x
      ly = pointer.y
    }
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    gsap.ticker.add(tick)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
      gsap.ticker.remove(tick)
    }
  }, [])
  return null
}
