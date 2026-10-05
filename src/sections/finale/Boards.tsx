import type { Dict } from '@/content/types'
import FigmaLogo from '@/components/FigmaLogo'

/** Design-system board: the tokens and components this very site is built from. */
export function DesignSystemBoard({ t }: { t: Dict }) {
  const colors = [
    ['ink', '#0A0A0B'],
    ['ink-2', '#111113'],
    ['paper', '#EEEBE4'],
    ['signal', '#3DFF8B'],
    ['signal-deep', '#0B7A3E'],
    ['you', '#FF5A2C'],
  ]
  return (
    <div className="flex h-full w-full flex-col gap-[4%] bg-paper p-[5%] text-ink">
      <div className="flex items-baseline justify-between">
        <p className="text-[3.2vw] font-[780] leading-none tracking-[-0.04em]">Design system</p>
        <p className="font-mono text-[0.9vw] text-ink/50">v31.0 · tokens.json</p>
      </div>
      <div className="grid flex-1 grid-cols-12 gap-[3%]">
        <div className="col-span-5 flex flex-col gap-[4%]">
          <p className="font-mono text-[0.9vw] uppercase text-ink/50">{t.finale.tokensTitle}</p>
          <div className="grid flex-1 grid-cols-3 gap-[6%]">
            {colors.map(([n, c]) => (
              <div key={n} className="flex flex-col overflow-hidden rounded-[0.8vw] border border-ink/10">
                <div className="flex-1" style={{ background: c }} />
                <div className="bg-white/70 px-[8%] py-[6%] font-mono text-[0.8vw] leading-tight">
                  {n}
                  <br />
                  <span className="text-ink/50">{c}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-4 flex flex-col gap-[5%]">
          <p className="font-mono text-[0.9vw] uppercase text-ink/50">{t.finale.typeTitle}</p>
          {[
            ['Aa', 'Mona Sans · 200–900', 'font-display font-[800]'],
            ['Aa', 'Fraunces · Italic', 'serif'],
            ['Aa', 'Geist Mono', 'font-mono'],
            ['Aa', 'Caveat', 'hand'],
          ].map(([a, n, cls]) => (
            <div key={n} className="flex items-center gap-[6%] border-t border-ink/10 pt-[3%]">
              <span className={`text-[3vw] leading-none ${cls}`}>{a}</span>
              <span className="font-mono text-[0.85vw] text-ink/60">{n}</span>
            </div>
          ))}
        </div>
        <div className="col-span-3 flex flex-col gap-[6%]">
          <p className="font-mono text-[0.9vw] uppercase text-ink/50">{t.finale.componentsTitle}</p>
          <span className="w-fit rounded-full bg-signal px-[1.4vw] py-[0.7vw] text-[1vw] font-[650]">{t.contact.whatsapp}</span>
          <span className="w-fit rounded-full border border-ink/25 px-[1.4vw] py-[0.7vw] text-[1vw] font-[600]">GitHub</span>
          <span className="w-fit rounded-full bg-ink px-[1.2vw] py-[0.5vw] text-[1vw] font-[650] text-signal">GSAP</span>
          <span className="flex w-fit items-center gap-[0.4vw] rounded-full border border-ink px-[0.9vw] py-[0.3vw] text-[1.1vw] font-[560]">
            <FigmaLogo className="h-[1vw] w-auto" /> Figma
          </span>
          <span className="w-fit rounded-[0.4vw] rounded-tl-[0.1vw] border border-ink/20 bg-paper px-[0.6vw] py-[0.3vw] text-[0.9vw] font-[650] text-ink">{t.finale.you}</span>
        </div>
      </div>
    </div>
  )
}

/** Scribbles board: the planning notes of this very portfolio. */
export function ScribblesBoard({ lang }: { lang: 'pt' | 'en' }) {
  const notes =
    lang === 'pt'
      ? ['hero = anatomia da selfie', 'cursor do Daniel edita o manifesto', 'rabisco → interface → código → produto', 'trilha horizontal termina em verde', 'final: zoom out pro arquivo do Figma!']
      : ['hero = anatomy of the selfie', "Daniel's cursor edits the manifesto", 'scribble → interface → code → product', 'horizontal track ends in green', 'ending: zoom out to the Figma file!']
  return (
    <div
      className="relative h-full w-full overflow-hidden bg-paper p-[3%] text-ink"
      style={{ backgroundImage: 'linear-gradient(rgba(60,90,200,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(60,90,200,0.1) 1px, transparent 1px)', backgroundSize: '2.2% 4.6%' }}
    >
      <p className="font-mono text-[0.9vw] uppercase text-ink/50">{lang === 'pt' ? 'Rabiscos · planejamento deste site' : 'Scribbles · planning this site'}</p>
      <div className="mt-[2%] grid grid-cols-5 gap-[2.5%]">
        {notes.map((n, i) => (
          <div key={n} className="hand rounded-[0.6vw] border-2 border-ink/80 bg-white/40 p-[8%] text-[2.2vw] leading-[1.05]" style={{ transform: `rotate(${[-2, 1.5, -1, 2.5, -1.5][i]}deg)` }}>
            <span className="mb-[6%] block font-mono text-[0.8vw] text-signal-deep">0{i + 1}</span>
            {n}
          </div>
        ))}
      </div>
      <svg viewBox="0 0 1000 120" className="absolute bottom-[6%] left-[3%] w-[94%]" aria-hidden>
        <path d="M10 60 C 200 10, 300 110, 500 60 S 800 10, 990 60" fill="none" stroke="#0b7a3e" strokeWidth="3" strokeDasharray="10 9" />
        <path d="M972 46 990 60 970 74" fill="none" stroke="#0b7a3e" strokeWidth="3" />
      </svg>
    </div>
  )
}

export function CreditsBoard({ t }: { t: Dict }) {
  return (
    <div className="flex h-full w-full flex-col justify-between bg-ink-2 p-[6%] text-paper">
      <p className="font-mono text-[0.9vw] uppercase text-paper/45">{t.finale.credits}</p>
      <div>
        <p className="text-[3.6vw] font-[780] leading-[0.9] tracking-[-0.05em]">
          Daniel
          <br />
          <span className="serif font-normal">Liberto.</span>
        </p>
        <p className="mt-[5%] max-w-[80%] text-[1.15vw] leading-snug text-paper/65">{t.finale.creditsText}</p>
      </div>
      <p className="font-mono text-[0.9vw] text-paper/45">© 2026 Daniel Liberto de Almeida · {t.footer.rights}</p>
    </div>
  )
}
