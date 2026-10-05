import { useRef } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useLang } from '@/lib/lang-context'
import { useUI } from '@/lib/store'
import { playTick } from '@/lib/sound'

/** Decorative keys at the start of each row, like a real keyboard. */
const MODS = ['esc', 'tab', '⇪', '⇧']

/**
 * The toolbox as a mechanical keyboard: as you scroll, each category is "typed" (its keys press
 * down and light up), and the space bar closes the set. Hovering a key presses it too.
 */
export default function Toolbox() {
  const { t, lang } = useLang()
  const root = useRef<HTMLElement>(null)
  const groups = t.toolbox.groups

  useGSAP(
    () => {
      const pin = root.current!.querySelector<HTMLElement>('[data-pin]')!
      const caps = groups.map((_, g) => gsap.utils.toArray<HTMLElement>(`[data-cap="${g}"]`, pin))
      const space = pin.querySelector<HTMLElement>('[data-space]')!
      const rows = gsap.utils.toArray<HTMLElement>('[data-cat]', pin)
      const texts = gsap.utils.toArray<HTMLElement>('[data-cat-text]', pin)
      let current = -1

      gsap.set(texts, { autoAlpha: 0, y: 10 })
      gsap.set('[data-done]', { autoAlpha: 0, y: 10 })
      const STAGE = 1.1
      const tl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        scrollTrigger: {
          id: 'toolbox',
          refreshPriority: 55,
          trigger: pin,
          start: 'top top',
          end: () => `+=${window.innerHeight * 2.6}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const time = self.progress * tl.duration()
            const g = Math.min(groups.length - 1, Math.floor((time - 0.2) / STAGE))
            if (g !== current) {
              const prev = current
              current = g
              rows.forEach((r, i) => r.classList.toggle('is-on', i === g))
              if (prev >= 0) gsap.to(texts[prev], { autoAlpha: 0, y: -8, duration: 0.25, overwrite: true })
              if (g >= 0) gsap.to(texts[g], { autoAlpha: 1, y: 0, duration: 0.5, delay: 0.1, overwrite: true })
            }
            if (self.isActive) {
              const s = useUI.getState()
              if (s.frame.index !== '05.1') s.set({ frame: { index: '05.1', name: t.toolbox.label }, theme: 'dark' })
            }
          },
        },
      })
      // each category types itself: press down, light up, release
      caps.forEach((list, g) => {
        const at = 0.2 + g * STAGE
        list.forEach((cap, i) => {
          const k = at + i * (1 / list.length)
          tl.to(cap, { y: 6, duration: 0.08 }, k)
            .to(cap, { backgroundColor: '#3dff8b', color: '#0a0a0b', boxShadow: '0 0 28px -6px rgba(61,255,139,0.7)', duration: 0.1 }, k)
            .to(cap, { y: 0, duration: 0.12 }, k + 0.08)
        })
        // when the next category starts, the finished one settles to a calm "done" state
        if (g < caps.length - 1) tl.to(list, { backgroundColor: '#eeebe4', color: '#0a0a0b', boxShadow: '0 0 0 0 rgba(0,0,0,0)', duration: 0.3 }, at + STAGE)
      })
      const end = 0.2 + caps.length * STAGE
      // finale: every key settles to white and only the space bar lights up
      tl.to(caps.flat(), { backgroundColor: '#eeebe4', color: '#0a0a0b', boxShadow: '0 0 0 0 rgba(0,0,0,0)', duration: 0.25 }, end)
        .to(space, { y: 6, duration: 0.1 }, end + 0.2)
        .to(space, { backgroundColor: '#3dff8b', color: '#0a0a0b', boxShadow: '0 0 60px -6px rgba(61,255,139,0.8)', duration: 0.15 }, end + 0.2)
        .to(space, { y: 0, duration: 0.15 }, end + 0.3)
        .to('[data-hint]', { autoAlpha: 0, duration: 0.2 }, end)
        .to('[data-done]', { autoAlpha: 1, y: 0, duration: 0.3 }, end + 0.3)
    },
    { scope: root, dependencies: [lang], revertOnUpdate: true },
  )

  const key = (label: string, g: number, i: number) => (
    <span key={label} className="group/key relative inline-flex lg:min-w-0 lg:flex-1" onPointerEnter={() => playTick(g + i)}>
      <span aria-hidden className="absolute inset-0 translate-y-[6px] rounded-[12px] bg-black/70" />
      <span
        data-cap={g}
        className="relative inline-flex h-[clamp(40px,4.4vw,64px)] w-full min-w-[clamp(40px,4.4vw,64px)] items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap rounded-[12px] border border-white/10 bg-ink-4 px-[clamp(10px,0.8vw,14px)] text-[clamp(11px,0.92vw,15px)] font-[620] text-paper shadow-[inset_0_-3px_0_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] transition-[translate] duration-150 group-hover/key:translate-y-[4px]"
      >
        {label}
      </span>
    </span>
  )

  return (
    <section ref={root} id="toolbox" data-theme="dark" data-frame={t.toolbox.label} data-frame-index="05.1" className="relative z-10 bg-ink text-paper" aria-labelledby="toolbox-title">
      <div data-pin className="relative grid h-svh min-h-[640px] grid-rows-[auto_1fr] gap-6 overflow-hidden px-gutter pb-[5vh] pt-[calc(var(--header-h)+3vh)] lg:grid-cols-12 lg:grid-rows-1 lg:gap-10">
        {/* categories */}
        <div className="flex flex-col justify-between lg:col-span-4">
          <div>
            <p className="label text-paper/50">(05.1) {t.toolbox.label}</p>
            <h2 id="toolbox-title" className="mt-3 text-[clamp(2.2rem,4.6vw,5.4rem)] font-[760] leading-[0.92] tracking-[-0.05em]">
              {t.toolbox.title}
            </h2>
            <div className="relative mt-3 h-10">
              <p data-hint className="hand absolute inset-0 -rotate-2 text-[1.5rem] text-signal md:text-[1.9rem]">
                {t.toolbox.hint}
              </p>
              <p data-done className="hand absolute inset-0 -rotate-2 text-[1.5rem] text-signal md:text-[1.9rem]">
                ↵ {t.toolbox.space}
              </p>
            </div>
          </div>
          <ol className="mt-6 hidden lg:block">
            {groups.map((g, i) => (
              <li key={g.title} data-cat className="group/cat relative border-t border-white/10 py-3 last:border-b">
                <div className="flex items-baseline gap-3 opacity-35 transition-opacity duration-500 group-[.is-on]/cat:opacity-100">
                  <span className="font-mono text-[0.7rem] text-signal">0{i + 1}</span>
                  <span className="text-[1.3rem] font-[650] tracking-[-0.02em]">{g.title}</span>
                </div>
              </li>
            ))}
          </ol>
          <div className="relative mt-2 h-6 lg:mt-4">
            {groups.map((g, i) => (
              <p key={g.title} data-cat-text className="absolute inset-0 text-[0.95rem] text-paper/70">
                <span className="font-mono text-[0.7rem] text-signal lg:hidden">
                  0{i + 1} {g.title}
                </span>
              </p>
            ))}
          </div>
        </div>

        {/* the keyboard */}
        <div className="flex items-center justify-center lg:col-span-8" style={{ perspective: '1600px' }}>
          <div
            className="w-full rounded-[28px] border border-white/10 bg-gradient-to-b from-ink-3 to-ink-2 p-[clamp(12px,1.8vw,28px)] shadow-[0_60px_120px_-40px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)] lg:[transform:rotateX(24deg)]"
            aria-label={groups.flatMap((g) => g.items).join(', ')}
          >
            <div className="flex flex-col gap-[clamp(8px,0.9vw,14px)]">
              {groups.map((g, gi) => (
                <div key={g.title} className="flex flex-wrap gap-[clamp(6px,0.6vw,10px)] lg:flex-nowrap">
                  <span aria-hidden className="hidden h-[clamp(40px,4.4vw,64px)] shrink-0 items-end justify-start rounded-[12px] border border-white/6 bg-ink-3 p-2 font-mono text-[10px] text-paper/35 sm:inline-flex" style={{ width: `${44 + gi * 14}px` }}>
                    {MODS[gi]}
                  </span>
                  {g.items.map((it, i) => key(it, gi, i))}
                </div>
              ))}
              <div className="flex gap-[clamp(6px,0.7vw,12px)]">
                <span aria-hidden className="hidden h-[clamp(40px,4.6vw,66px)] w-[9%] items-end rounded-[12px] border border-white/6 bg-ink-3 p-2 font-mono text-[10px] text-paper/35 sm:inline-flex">
                  ⌘
                </span>
                <span className="relative inline-flex flex-1">
                  <span aria-hidden className="absolute inset-0 translate-y-[6px] rounded-[12px] bg-black/70" />
                  <span data-space className="relative flex h-[clamp(40px,4.6vw,66px)] w-full items-center justify-center rounded-[12px] border border-white/10 bg-ink-4 font-mono text-[clamp(10px,0.9vw,13px)] uppercase tracking-[0.08em] text-paper/70 shadow-[inset_0_-3px_0_rgba(0,0,0,0.35)]">
                    {t.toolbox.space}
                  </span>
                </span>
                <span aria-hidden className="hidden h-[clamp(40px,4.6vw,66px)] w-[9%] items-end rounded-[12px] border border-white/6 bg-ink-3 p-2 font-mono text-[10px] text-paper/35 sm:inline-flex">
                  ⌥
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
