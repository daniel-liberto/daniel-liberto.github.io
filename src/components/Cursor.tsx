import { useEffect, useRef, useState } from 'react'
import { gsap } from '@/lib/gsap'
import { playTick } from '@/lib/sound'
import { useLang } from '@/lib/lang-context'

type Mode = 'default' | 'label' | 'drag' | 'hide'

/**
 * The visitor's cursor is a Figma multiplayer cursor: an arrow in "your" color with a name tag
 * that shows the action under it.
 */
export default function Cursor() {
  const { lang } = useLang()
  const [enabled] = useState(() => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  const root = useRef<HTMLDivElement>(null)
  const arrow = useRef<HTMLDivElement>(null)
  const tag = useRef<HTMLDivElement>(null)
  const tagText = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!enabled) return
    document.documentElement.classList.add('has-cursor')
    const el = root.current!
    const pos = { x: -100, y: -100 }
    const tagPos = { x: -100, y: -100 }
    let mode: Mode = 'default'
    let label = ''
    let target: Element | null = null
    let lastInteractive: Element | null = null
    let visible = false

    const setMode = (m: Mode, l = '') => {
      if (m === mode && l === label) return
      mode = m
      label = l
      el.dataset.mode = m
      if (tagText.current) tagText.current.textContent = l
      gsap.to(tag.current, {
        autoAlpha: m === 'label' || m === 'drag' ? 1 : 0,
        scale: m === 'label' || m === 'drag' ? 1 : 0.6,
        duration: 0.35,
        ease: 'back.out(2)',
      })
      gsap.to(arrow.current, { autoAlpha: m === 'hide' ? 0 : 1, duration: 0.2 })
    }

    const resolve = (t: Element | null) => {
      target = t?.closest('[data-cursor]') ?? null
      const m = (target?.getAttribute('data-cursor') as Mode | null) ?? 'default'
      setMode(m, target?.getAttribute('data-cursor-label') ?? '')
      const interactive = t?.closest('a, button, [role="button"], [data-sound]') ?? null
      if (interactive && interactive !== lastInteractive) playTick()
      lastInteractive = interactive
    }

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      pos.x = e.clientX
      pos.y = e.clientY
      if (!visible) {
        visible = true
        tagPos.x = pos.x
        tagPos.y = pos.y
        gsap.to(el, { autoAlpha: 1, duration: 0.3 })
      }
      resolve(e.target as Element)
    }
    const over = (e: PointerEvent) => resolve(e.target as Element)
    const leave = () => {
      visible = false
      gsap.to(el, { autoAlpha: 0, duration: 0.3 })
    }
    const down = () => {
      gsap.to(arrow.current, { scale: 0.82, duration: 0.18, ease: 'power2.out' })
    }
    const up = () => gsap.to(arrow.current, { scale: 1, duration: 0.4, ease: 'back.out(3)' })

    // re-evaluate after scroll: content moves under a still mouse
    const onScroll = () => {
      if (!visible) return
      resolve(document.elementFromPoint(pos.x, pos.y))
    }

    const tick = () => {
      arrow.current!.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`
      tagPos.x += (pos.x - tagPos.x) * 0.3
      tagPos.y += (pos.y - tagPos.y) * 0.3
      tag.current!.style.transform = `translate3d(${tagPos.x + 16}px, ${tagPos.y + 20}px, 0)`
    }

    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerover', over, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('scroll', onScroll, { passive: true })
    gsap.ticker.add(tick)
    return () => {
      document.documentElement.classList.remove('has-cursor')
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerover', over)
      document.documentElement.removeEventListener('pointerleave', leave)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('scroll', onScroll)
      gsap.ticker.remove(tick)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div ref={root} aria-hidden data-mode="default" className="group/cursor pointer-events-none fixed inset-0 z-[100] opacity-0" lang={lang}>
      {/* name tag (lags slightly behind the arrow, like a multiplayer cursor) */}
      <div ref={tag} className="absolute left-0 top-0 opacity-0" style={{ willChange: 'transform' }}>
        <div className="flex items-center gap-1.5 whitespace-nowrap rounded-[6px] rounded-tl-[2px] border border-ink/15 bg-paper px-2 py-1 text-[0.72rem] font-semibold leading-none text-ink shadow-[0_6px_20px_-6px_rgba(0,0,0,0.5)]">
          <svg viewBox="0 0 16 10" className="hidden h-2.5 w-4 group-data-[mode=drag]/cursor:block" aria-hidden>
            <path d="M5 1 1 5l4 4M11 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <span ref={tagText} />
        </div>
      </div>

      {/* arrow */}
      <div ref={arrow} className="absolute left-0 top-0" style={{ willChange: 'transform' }}>
        <svg width="22" height="24" viewBox="0 0 22 24" className="-ml-px -mt-px drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]" aria-hidden>
          <path d="M2 2v17.2l4.7-4.4 3.1 7.1 3-1.3-3.1-7h6.5L2 2Z" fill="#eeebe4" stroke="#0a0a0b" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>

      </div>

    </div>
  )
}
