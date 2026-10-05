import { useRef, useState, type ComponentType } from 'react'
import clsx from 'clsx'
import { gsap, useGSAP } from '@/lib/gsap'
import { useLang } from '@/lib/lang-context'
import { useUI } from '@/lib/store'
import { playTick } from '@/lib/sound'
import { AppDemo, BuildDemo, FlowDemo, MotionDemo, SystemDemo, type DemoProps } from './services/demos'

type Card = { bg: string; dark: boolean; Demo: ComponentType<DemoProps> }

/** Each service is a card that demonstrates itself; the colors alternate so every card is a contrast break. */
const CARDS: Card[] = [
  { bg: '#0a0a0b', dark: true, Demo: FlowDemo },
  { bg: '#fbfaf7', dark: false, Demo: SystemDemo },
  { bg: '#3dff8b', dark: false, Demo: BuildDemo },
  { bg: '#050506', dark: true, Demo: MotionDemo },
  { bg: '#eeebe4', dark: false, Demo: AppDemo },
]

/**
 * Services as a deck: every card slides up over the previous one, which steps back into the pile.
 * Only the card on top runs its live demo.
 */
export default function Services() {
  const { t, lang } = useLang()
  const root = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  // how far each card is through its time on top of the deck (read every frame by scroll-driven demos)
  const [progress] = useState(() => CARDS.map(() => ({ current: 0 })))
  const items = t.services.items

  useGSAP(
    () => {
      const pin = root.current!.querySelector<HTMLElement>('[data-pin]')!
      const cards = gsap.utils.toArray<HTMLElement>('[data-card]', pin)
      const dims = gsap.utils.toArray<HTMLElement>('[data-dim]', pin)
      const dots = gsap.utils.toArray<HTMLElement>('[data-sdot]', pin)
      const num = pin.querySelector<HTMLElement>('[data-snum]')!
      let current = 0

      gsap.set(cards.slice(1), { yPercent: 108, rotate: 4, transformOrigin: '50% 100%' })
      gsap.set(dims, { opacity: 0 })

      const STEP = 1
      // the first card holds longer: its user flow is walked through by the scroll
      const HOLDS = [2.6, 2.2, 2.8, 3, 3]
      const ins = HOLDS.map((_, i) => HOLDS.slice(0, i).reduce((a, b) => a + b, 0) + i * STEP)
      const tl = gsap.timeline({
        defaults: { ease: 'power3.inOut' },
        scrollTrigger: {
          id: 'services',
          refreshPriority: 60,
          trigger: pin,
          start: 'top top',
          end: () => `+=${window.innerHeight * 8.2}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const time = self.progress * tl.duration()
            let idx = 0
            ins.forEach((t0, i) => {
              if (time >= t0 - STEP * 0.5) idx = i
              progress[i].current = gsap.utils.clamp(0, 1, (time - t0) / HOLDS[i])
            })
            if (idx !== current) {
              current = idx
              setActive(idx)
              num.textContent = String(idx + 1).padStart(2, '0')
              dots.forEach((d, i) => d.classList.toggle('is-on', i <= idx))
              playTick(idx)
            }
            if (self.isActive) {
              const s = useUI.getState()
              if (s.frame.index !== '05') s.set({ frame: { index: '05', name: t.services.label }, theme: 'light' })
            }
          },
        },
      })
      tl.to({}, { duration: HOLDS[0] })
      cards.forEach((card, i) => {
        if (i === 0) return
        const at = ins[i] - STEP
        tl.to(card, { yPercent: 0, rotate: 0, duration: STEP }, at)
        for (let j = 0; j < i; j++) {
          const depth = i - j
          tl.to(cards[j], { scale: 1 - 0.05 * depth, yPercent: -3.2 * depth, duration: STEP }, at).to(dims[j], { opacity: Math.min(0.5, 0.22 * depth), duration: STEP }, at)
        }
      })
      tl.to({}, { duration: HOLDS[HOLDS.length - 1] }, ins[ins.length - 1])
    },
    { scope: root, dependencies: [lang], revertOnUpdate: true },
  )

  return (
    <section ref={root} id="services" data-theme="light" data-frame={t.services.label} data-frame-index="05" className="relative z-10 bg-paper text-ink" aria-label={t.services.label}>
      <div data-pin className="relative h-svh min-h-[640px] overflow-hidden">
        <div className="absolute inset-x-0 top-[calc(var(--header-h)+1.5vh)] flex items-center justify-between px-gutter">
          <p className="label text-ink/55">(05) {t.services.label}</p>
          <div className="flex items-center gap-4">
            <div className="hidden gap-1.5 sm:flex">
              {items.map((s, i) => (
                <span key={s.title} data-sdot className={clsx('h-1.5 w-6 rounded-full bg-ink/15 transition-colors duration-500 [&.is-on]:bg-ink', i === 0 && 'is-on')} />
              ))}
            </div>
            <p className="label tabular-nums">
              <span data-snum>01</span> <span className="text-ink/45">/ 0{items.length}</span>
            </p>
          </div>
        </div>

        <div className="absolute inset-x-[var(--gutter)] bottom-[3vh] top-[calc(var(--header-h)+6.5vh)]">
          {items.map((s, i) => {
            const c = CARDS[i]
            const { Demo } = c
            return (
              <article
                key={s.title}
                data-card
                className={clsx('absolute inset-0 overflow-hidden rounded-[28px] shadow-[0_-30px_80px_-40px_rgba(0,0,0,0.45)]', c.dark ? 'text-paper' : 'text-ink', i === 1 && 'border border-ink/10')}
                style={{ background: c.bg, zIndex: i }}
                aria-label={s.title}
              >
                <div className="flex h-full flex-col gap-5 p-6 md:grid md:grid-cols-12 md:gap-8 md:p-[3vw]">
                  <div className="flex flex-col justify-between gap-4 md:col-span-5">
                    <div>
                      <p className={clsx('label', c.dark ? 'text-signal' : 'text-ink/60')}>
                        {String(i + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
                      </p>
                      <h3 className="mt-3 text-[clamp(2rem,4.4vw,5.2rem)] font-[760] leading-[0.92] tracking-[-0.05em]">{s.title}</h3>
                      <p className={clsx('mt-4 max-w-[28rem] text-[0.95rem] leading-[1.5] md:text-[1.05rem]', c.dark ? 'text-paper/70' : 'text-ink/70')}>{s.text}</p>
                    </div>
                    <div className="hidden md:block">
                      <p className={clsx('label mb-3', c.dark ? 'text-paper/45' : 'text-ink/50')}>{t.services.deliverables}</p>
                      <ul className="flex flex-wrap gap-2">
                        {s.deliverables.map((d) => (
                          <li key={d} className={clsx('rounded-full border px-3 py-1.5 text-[0.85rem] font-[560]', c.dark ? 'border-white/15' : 'border-ink/20')}>
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="relative min-h-0 flex-1 md:col-span-7 md:h-full">
                    <Demo active={active === i} progress={progress[i]} />
                  </div>
                </div>
                <div data-dim aria-hidden className="pointer-events-none absolute inset-0 bg-ink" />
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
