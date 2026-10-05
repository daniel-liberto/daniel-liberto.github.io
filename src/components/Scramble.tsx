import { useRef } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'

/** Label that decodes itself (ScrambleText) when it scrolls into view. */
export default function Scramble({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useGSAP(
    () => {
      gsap.from(ref.current, {
        scrambleText: { text: '', chars: '01#$%&*+<>/\\=', speed: 0.6, revealDelay: 0.15 },
        duration: 1.3,
        delay,
        ease: 'none',
        scrollTrigger: { trigger: ref.current, start: 'top 92%', once: true },
      })
    },
    { dependencies: [text], revertOnUpdate: true },
  )
  return (
    <span key={text} ref={ref} className={className}>
      {text}
    </span>
  )
}
