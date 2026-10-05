import { useRef, type ReactNode } from 'react'
import { gsap, isTouch, useGSAP } from '@/lib/gsap'
import clsx from 'clsx'

/** Pulls its child toward the pointer; the inner layer moves further for a parallax feel. */
export default function Magnetic({
  children,
  strength = 0.35,
  className,
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (isTouch()) return
      const el = root.current!
      const inner = el.firstElementChild as HTMLElement | null
      const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' })
      const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' })
      const ixTo = inner ? gsap.quickTo(inner, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' }) : null
      const iyTo = inner ? gsap.quickTo(inner, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' }) : null

      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect()
        const x = e.clientX - (r.left + r.width / 2)
        const y = e.clientY - (r.top + r.height / 2)
        xTo(x * strength)
        yTo(y * strength)
        ixTo?.(x * strength * 0.35)
        iyTo?.(y * strength * 0.35)
      }
      const leave = () => {
        xTo(0)
        yTo(0)
        ixTo?.(0)
        iyTo?.(0)
      }
      el.addEventListener('pointermove', move)
      el.addEventListener('pointerleave', leave)
      return () => {
        el.removeEventListener('pointermove', move)
        el.removeEventListener('pointerleave', leave)
      }
    },
    { scope: root },
  )

  return (
    <div ref={root} className={clsx('inline-block will-change-transform', className)}>
      {children}
    </div>
  )
}
