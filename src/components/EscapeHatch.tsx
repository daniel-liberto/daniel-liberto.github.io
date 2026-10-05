import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { gsap } from '@/lib/gsap'
import { useLang } from '@/lib/lang-context'
import { useTransition } from './transition-context'

/**
 * A floating "get me out of here" button that only exists on inner pages (case studies),
 * so nobody feels trapped. Escape on the keyboard does the same.
 */
export default function EscapeHatch() {
  const { pathname } = useLocation()
  const { lang } = useLang()
  const { go } = useTransition()
  const ref = useRef<HTMLButtonElement>(null)
  const inner = pathname.startsWith('/work/')
  const pt = lang === 'pt'

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (inner) gsap.fromTo(el, { yPercent: 160, rotate: -8, autoAlpha: 0 }, { yPercent: 0, rotate: 0, autoAlpha: 1, duration: 1, delay: 1.2, ease: 'back.out(1.8)' })
    else gsap.set(el, { autoAlpha: 0, yPercent: 160 })
    if (!inner) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && go('/', { hash: 'work' })
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inner, go])

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[58] -translate-x-1/2 md:bottom-7 md:left-auto md:right-7 md:translate-x-0">
      <button
        ref={ref}
        type="button"
        tabIndex={inner ? 0 : -1}
        aria-hidden={!inner}
        onClick={() => go('/', { hash: 'work' })}
        data-cursor="label"
        data-cursor-label={pt ? 'Corre!' : 'Run!'}
        className="group pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-full border border-signal/40 bg-ink/85 py-2 pl-2 pr-5 text-paper opacity-0 shadow-[0_18px_50px_-18px_rgba(61,255,139,0.55)] backdrop-blur-md transition-colors hover:bg-signal hover:text-ink"
      >
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-signal text-ink transition-transform duration-500 group-hover:rotate-[-12deg] group-hover:scale-110 group-hover:bg-ink group-hover:text-signal">
          {/* a little door with someone running out of it */}
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path d="M4 3h8v18H4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="16.5" cy="6" r="1.8" fill="currentColor" />
            <path d="m14 21 2-5-2-3 2-3.5 3 2.5h2M16 16l3 1.5M14 13l-2 1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="flex flex-col text-left leading-tight">
          <span className="text-[0.95rem] font-[700] tracking-[-0.01em]">{pt ? 'Me tire daqui!' : 'Get me out of here!'}</span>
          <span className="font-mono text-[0.62rem] uppercase opacity-60">{pt ? 'Voltar aos projetos · Esc' : 'Back to work · Esc'}</span>
        </span>
      </button>
    </div>
  )
}
