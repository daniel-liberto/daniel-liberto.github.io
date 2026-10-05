import { useRef } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useLang } from '@/lib/lang-context'
import { useSectionWatch } from '@/hooks/useSectionWatch'
import { useTransition } from '@/components/transition-context'
import FrameIcon from '@/components/FrameIcon'

export default function NotFound() {
  const { t, lang } = useLang()
  const { go } = useTransition()
  const root = useRef<HTMLDivElement>(null)
  useSectionWatch(root, [lang])

  useGSAP(
    () => {
      gsap.from('[data-nf]', { y: 40, autoAlpha: 0, stagger: 0.08, duration: 1.1, ease: 'silk', delay: 0.4 })
      gsap.to('[data-nf-frame]', { rotate: 2, repeat: -1, yoyo: true, duration: 2.4, ease: 'sine.inOut' })
    },
    { scope: root },
  )

  return (
    <div ref={root}>
      <section data-theme="dark" data-frame="404" data-frame-index="00" className="relative flex h-svh flex-col items-center justify-center overflow-hidden bg-ink px-gutter text-center text-paper">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(238,235,228,0.14) 1px, transparent 1.3px)', backgroundSize: '24px 24px' }} />
        <div data-nf data-nf-frame className="relative border-[1.5px] border-dashed border-you px-[6vw] py-[3vw]">
          <span className="absolute -top-6 left-0 flex items-center gap-1 font-mono text-[0.7rem] text-you">
            <FrameIcon className="h-3 w-3" /> missing-frame
          </span>
          <p className="font-display text-[26vw] font-[820] leading-[0.8] tracking-[-0.06em] md:text-[16vw]">404</p>
        </div>
        <h1 data-nf className="mt-12 text-[clamp(1.6rem,3vw,3rem)] font-[680] tracking-[-0.03em]">
          {t.notFound.title}
        </h1>
        <p data-nf className="mt-3 max-w-[28rem] text-paper/60">
          {t.notFound.text}
        </p>
        <button data-nf type="button" onClick={() => go('/')} className="mt-10 rounded-full bg-signal px-6 py-4 text-sm font-semibold text-ink">
          {t.notFound.cta}
        </button>
      </section>
    </div>
  )
}
