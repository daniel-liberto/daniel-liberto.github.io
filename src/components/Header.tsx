import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import clsx from 'clsx'
import { gsap, useGSAP } from '@/lib/gsap'
import { useLang } from '@/lib/lang-context'
import { scrollState, useUI } from '@/lib/store'
import { setSound } from '@/lib/sound'
import { useTransition } from '@/components/transition-context'
import { navItems, useNavTo } from '@/lib/nav'
import FrameIcon from './FrameIcon'
import RollText from './RollText'

export default function Header() {
  const { t, lang, setLang } = useLang()
  const ready = useUI((s) => s.ready)
  const theme = useUI((s) => s.theme)
  const frame = useUI((s) => s.frame)
  const sound = useUI((s) => s.sound)
  const menuOpen = useUI((s) => s.menuOpen)
  const finale = useUI((s) => s.finale || s.cinema)
  const set = useUI((s) => s.set)
  const root = useRef<HTMLElement>(null)
  const frameName = useRef<HTMLSpanElement>(null)
  const { go, jump } = useTransition()
  const { pathname } = useLocation()
  const navTo = useNavTo()

  useGSAP(
    () => {
      if (!ready) {
        gsap.set('[data-hd]', { yPercent: -140 })
        return
      }
      gsap.to('[data-hd]', { yPercent: 0, duration: 1.2, stagger: 0.06, ease: 'silk', delay: 0.5 })
    },
    { scope: root, dependencies: [ready] },
  )

  // logo and nav slide away while scrolling down and come back on the way up; the frame pill stays
  useEffect(() => {
    let hidden = false
    const el = root.current!
    const tick = () => {
      const v = scrollState.velocity
      const next = scrollState.y > 160 && !useUI.getState().menuOpen ? (v > 0.6 ? true : v < -0.6 ? false : hidden) : false
      if (next !== hidden) {
        hidden = next
        el.classList.toggle('is-tucked', hidden)
      }
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  // the frame label decodes itself each time a new section takes the screen
  useEffect(() => {
    if (!frameName.current) return
    gsap.to(frameName.current, {
      duration: 0.7,
      scrambleText: { text: frame.name, chars: 'abcdefghijklmnopqrstuvwxyz', speed: 0.8 },
      ease: 'none',
    })
  }, [frame.name])

  const toggleSound = () => {
    const next = !sound
    set({ sound: next })
    void setSound(next)
  }

  const onDark = theme === 'dark' || theme === 'canvas' || menuOpen

  return (
    <header
      ref={root}
      className={clsx(
        'pointer-events-none fixed inset-x-0 top-0 z-[60] flex h-[var(--header-h)] items-center justify-between gap-6 px-gutter transition-[color,translate,opacity] duration-500',
        onDark ? 'text-paper' : 'text-ink',
        finale && '-translate-y-full opacity-0',
      )}
    >
      <div data-hd className="tuck pointer-events-auto flex items-center gap-3">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            if (pathname === '/') jump(0, t.nav.home)
            else go('/')
          }}
          className="group flex items-center gap-2.5"
          aria-label="Daniel Liberto · home"
        >
          <span className={clsx('flex h-8 w-8 items-center justify-center rounded-[9px] transition-colors duration-500', onDark ? 'bg-paper/8' : 'bg-ink/8')}>
            <FrameIcon filled className={clsx('h-4 w-4 transition-transform duration-700 ease-[var(--ease-silk)] group-hover:rotate-90', onDark ? 'text-signal' : 'text-ink')} />
          </span>
          <span className="text-[0.95rem] font-[620] tracking-[-0.02em]" style={{ fontStretch: '108%' }}>
            Daniel Liberto
          </span>
        </a>
      </div>

      <div className="absolute left-1/2 hidden -translate-x-1/2 md:block">
        <span data-hd className={clsx('pointer-events-auto flex items-center gap-1.5 rounded-full border border-current/15 px-3 py-1.5 font-mono text-[0.72rem] backdrop-blur-md transition-colors duration-500', onDark ? 'bg-ink/45' : 'bg-paper/55')}>
          <FrameIcon className="h-3 w-3 opacity-60" />
          <span className="tabular-nums opacity-60">{frame.index}</span>
          <span ref={frameName} className="min-w-[4ch]">
            {frame.name}
          </span>
        </span>
      </div>

      <div data-hd className="tuck pointer-events-auto flex items-center gap-1 sm:gap-2">
        <nav className="mr-3 hidden items-center gap-6 lg:flex" aria-label="Main">
          {navItems.map((n) => (
            <a
              key={n.id}
              href={`/#${n.id}`}
              onClick={(e) => {
                e.preventDefault()
                navTo(n.id, t.nav[n.key])
              }}
              className="group text-[0.86rem] font-medium"
            >
              <RollText text={t.nav[n.key]} />
            </a>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
          className="group flex h-9 items-center rounded-full px-2.5 font-mono text-[0.72rem] uppercase"
          aria-label={lang === 'pt' ? 'Switch to English' : 'Mudar para português'}
        >
          <span className={clsx('transition-opacity', lang === 'pt' ? 'opacity-100' : 'opacity-40')}>PT</span>
          <span className="mx-1 opacity-30">/</span>
          <span className={clsx('transition-opacity', lang === 'en' ? 'opacity-100' : 'opacity-40')}>EN</span>
        </button>

        <button
          type="button"
          onClick={toggleSound}
          className="flex h-9 w-9 items-center justify-center rounded-full"
          aria-label={t.nav.sound}
          aria-pressed={sound}
        >
          <span className="flex h-3.5 items-end gap-[2.5px]">
            {[0.55, 1, 0.7, 0.85].map((h, i) => (
              <span
                key={i}
                className={clsx('w-[2px] rounded-full bg-current', sound ? 'animate-[eq_0.9s_ease-in-out_infinite_alternate]' : '')}
                style={{ height: sound ? `${h * 100}%` : '2px', animationDelay: `${i * 0.13}s`, transition: 'height .4s' }}
              />
            ))}
          </span>
        </button>

        <button
          type="button"
          onClick={() => set({ menuOpen: !menuOpen })}
          className={clsx(
            'ml-1 flex h-9 items-center gap-2 rounded-full px-4 text-[0.8rem] font-semibold transition-colors duration-500 lg:hidden',
            onDark ? 'bg-paper text-ink' : 'bg-ink text-paper',
          )}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
        >
          {menuOpen ? t.nav.close : t.nav.menu}
        </button>

        <a
          href="/#contact"
          onClick={(e) => {
            e.preventDefault()
            navTo('contact', t.nav.contact)
          }}
          className={clsx(
            'group ml-1 hidden h-9 items-center gap-2 rounded-full px-4 text-[0.8rem] font-semibold transition-colors duration-500 lg:flex',
            onDark ? 'bg-signal text-ink' : 'bg-ink text-paper',
          )}
        >
          <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-current pulse-dot" />
          <RollText text={lang === 'pt' ? 'Disponível' : 'Available'} />
        </a>
      </div>
    </header>
  )
}
