import { useEffect, useRef } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useLang } from '@/lib/lang-context'
import { useUI } from '@/lib/store'
import { lockScroll } from '@/lib/lenis'
import { contact } from '@/content/projects'
import { navItems, useNavTo } from '@/lib/nav'

/** Full-screen menu for small screens: five ink columns drop like a curtain, links rise from masks. */
export default function Menu() {
  const { t } = useLang()
  const open = useUI((s) => s.menuOpen)
  const set = useUI((s) => s.set)
  const root = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const navTo = useNavTo()

  useGSAP(
    () => {
      gsap.set('[data-mcol]', { yPercent: -100 })
      gsap.set('[data-mlink]', { yPercent: 110 })
      gsap.set('[data-mfoot]', { autoAlpha: 0, y: 20 })
      tl.current = gsap
        .timeline({ paused: true, defaults: { ease: 'curtain' } })
        .set(root.current, { visibility: 'visible' })
        .to('[data-mcol]', { yPercent: 0, duration: 0.7, stagger: 0.05 })
        .to('[data-mlink]', { yPercent: 0, duration: 0.9, stagger: 0.06, ease: 'silk' }, 0.35)
        .to('[data-mfoot]', { autoAlpha: 1, y: 0, duration: 0.8, ease: 'silk' }, 0.55)
    },
    { scope: root },
  )

  useEffect(() => {
    if (!tl.current) return
    if (open) {
      lockScroll(true)
      tl.current.timeScale(1).play()
    } else {
      tl.current.timeScale(1.6).reverse()
      if (!useUI.getState().transitioning) lockScroll(false)
    }
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && set({ menuOpen: false })
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [set])

  return (
    <div ref={root} id="site-menu" className="invisible fixed inset-0 z-[55] lg:hidden" aria-hidden={!open}>
      <div className="absolute inset-0 flex">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} data-mcol className="h-full flex-1 bg-ink-2" style={{ marginLeft: i ? -1 : 0 }} />
        ))}
      </div>
      <nav className="relative flex h-full flex-col justify-between px-gutter pb-8 pt-[calc(var(--header-h)+6vh)]" aria-label="Menu">
        <ul className="flex flex-col gap-1">
          {navItems.map((n, i) => (
            <li key={n.id} className="overflow-clip">
              <a
                data-mlink
                href={`/#${n.id}`}
                tabIndex={open ? 0 : -1}
                onClick={(e) => {
                  e.preventDefault()
                  set({ menuOpen: false })
                  navTo(n.id, t.nav[n.key])
                }}
                className="flex items-baseline gap-4 text-[13vw] font-[760] uppercase leading-[0.95] tracking-[-0.04em] text-paper"
                style={{ fontStretch: '112%' }}
              >
                <span className="label text-signal">0{i + 1}</span>
                {t.nav[n.key]}
              </a>
            </li>
          ))}
        </ul>
        <div data-mfoot className="flex flex-col gap-4 text-paper">
          <a href={`mailto:${contact.email}`} tabIndex={open ? 0 : -1} className="text-lg font-medium underline decoration-signal underline-offset-4">
            {contact.email}
          </a>
          <div className="flex gap-5">
            {contact.socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer" tabIndex={open ? 0 : -1} className="label text-mute">
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </nav>
    </div>
  )
}
