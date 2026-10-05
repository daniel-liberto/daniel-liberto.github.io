import { useRef, useState } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useLang } from '@/lib/lang-context'
import { playPluck } from '@/lib/sound'
import { contact } from '@/content/projects'
import { useClock } from '@/hooks/useClock'
import Magnetic from '@/components/Magnetic'
import RollText from '@/components/RollText'

/** The contact screen. It is a real section first, and then the live frame of the Figma file. */
export default function ContactFrame() {
  const { t, lang } = useLang()
  const c = t.contact
  const root = useRef<HTMLDivElement>(null)
  const clock = useClock()
  const [copied, setCopied] = useState(false)

  useGSAP(
    () => {
      gsap.set('[data-scribble-line]', { drawSVG: '0%' })
      const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top 55%', toggleActions: 'play none none reverse' } })
      tl.from('[data-ct] .split-line', { yPercent: 110, duration: 1.1, stagger: 0.08, ease: 'silk' })
        .from('[data-scribble]', { autoAlpha: 0, rotate: -12, scale: 0.8, duration: 0.9, ease: 'back.out(2)' }, 0.25)
        .to('[data-scribble-line]', { drawSVG: '100%', duration: 0.8, ease: 'power2.inOut' }, 0.55)
        .from('[data-cin]', { y: 30, autoAlpha: 0, stagger: 0.06, duration: 0.9, ease: 'silk' }, 0.4)
      gsap.to('[data-more-arrow]', { y: 6, repeat: -1, yoyo: true, duration: 0.8, ease: 'sine.inOut' })
    },
    { scope: root, dependencies: [lang], revertOnUpdate: true },
  )

  const copy = () => {
    navigator.clipboard?.writeText(contact.email).catch(() => {})
    setCopied(true)
    playPluck()
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div ref={root} className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-ink px-gutter pb-[4vh] pt-[calc(var(--header-h)+3vh)] text-paper">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ backgroundImage: 'radial-gradient(rgba(238,235,228,0.12) 1px, transparent 1.3px)', backgroundSize: '24px 24px' }}
      />
      <div className="relative flex items-start justify-between">
        <p className="label text-paper/50">(07) {c.label}</p>
        <p className="label tabular-nums text-paper/50">
          {t.hero.location} · {clock}
        </p>
      </div>

      <div className="relative grid grid-cols-12 items-end gap-6">
        <h2 data-ct className="col-span-12 font-display text-[16vw] font-[800] leading-[0.86] tracking-[-0.055em] md:col-span-8 md:text-[9.6vw]">
          <span className="split-mask block">
            <span className="split-line block">{c.titleA}</span>
          </span>
          <span className="relative block">
            <span data-scribble className="hand relative inline-block -rotate-3 pl-[0.2em] text-[1.18em] font-[600] leading-[0.9] tracking-[-0.01em] text-signal">
              {c.scribble}
              <svg viewBox="0 0 300 30" preserveAspectRatio="none" className="absolute -bottom-[0.06em] left-[0.1em] h-[0.2em] w-[96%] overflow-visible" aria-hidden>
                <path data-scribble-line d="M4 18C60 6 120 4 180 12s90 10 112 2M30 26c70-6 150-8 240-4" fill="none" stroke="#3dff8b" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </span>
          </span>
          <span className="split-mask block">
            <span className="split-line block">{c.titleB}</span>
          </span>
        </h2>

        <div className="col-span-12 flex flex-col gap-6 md:col-span-4 md:pb-[1.2vw]">
          <p data-cin className="max-w-[24rem] text-[1.05rem] leading-[1.5] text-paper/70">
            {c.text}
          </p>
          <button
            data-cin
            type="button"
            onClick={copy}
            data-cursor="label"
            data-cursor-label={copied ? c.copied : c.copy}
            className="group w-fit text-left"
          >
            <span className="block text-[clamp(1.2rem,1.9vw,1.9rem)] font-[620] tracking-[-0.03em] underline decoration-signal decoration-2 underline-offset-[6px]">
              {contact.email}
            </span>
            <span className="label mt-2 block text-paper/45">{copied ? c.copied : c.copy}</span>
          </button>
          <div data-cin className="flex flex-wrap gap-2">
            <Magnetic>
              <a href={contact.whatsapp} target="_blank" rel="noreferrer" className="group flex items-center gap-2 rounded-full bg-signal px-5 py-3 text-[0.88rem] font-[650] text-ink">
                <RollText text={c.whatsapp} />
              </a>
            </Magnetic>
            {contact.socials
              .filter((s) => s.label !== 'WhatsApp')
              .map((s) => (
                <Magnetic key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer" className="group flex items-center gap-2 rounded-full border border-paper/20 px-5 py-3 text-[0.88rem] font-[600] transition-colors hover:border-paper/60">
                    <RollText text={s.label} />
                  </a>
                </Magnetic>
              ))}
          </div>
        </div>
      </div>

      <div className="relative flex items-end justify-between gap-6">
        <p className="label flex items-center gap-3 text-signal">
          <span data-more-arrow className="inline-block">
            ↓
          </span>
          {c.more}
        </p>
        <p className="label hidden text-paper/45 sm:block">{c.response}</p>
      </div>
    </div>
  )
}
