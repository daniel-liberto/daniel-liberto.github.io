import type { Dict } from '@/content/types'
import { CODE_COLORS as COLORS, codeLines } from './code'

/** A small editor window that "types" the WalletCard component. */
export default function CodePanel({ copy, file, compiled }: { copy: Dict['process']['card']; file: string; compiled: string }) {
  const lines = codeLines(copy)
  return (
    <div data-code className="absolute overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0f] font-mono shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)]">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        </div>
        <span className="flex items-center gap-2 rounded-md bg-white/6 px-2.5 py-1 text-[11px] text-paper/80">
          <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden>
            <circle cx="8" cy="8" r="2" fill="#61dafb" />
            <g fill="none" stroke="#61dafb" strokeWidth="0.9">
              <ellipse cx="8" cy="8" rx="7" ry="2.7" />
              <ellipse cx="8" cy="8" rx="7" ry="2.7" transform="rotate(60 8 8)" />
              <ellipse cx="8" cy="8" rx="7" ry="2.7" transform="rotate(120 8 8)" />
            </g>
          </svg>
          {file}
        </span>
        <span className="w-10" />
      </div>
      <div className="relative px-1 py-4 text-[12.5px] leading-[1.75]">
        {lines.map((l, i) => (
          <div key={i} data-code-line data-part-ref={l.part ?? ''} className="flex whitespace-pre">
            <span className="w-9 shrink-0 select-none pr-3 text-right text-paper/25">{i + 1}</span>
            <span data-code-text className="block" style={{ paddingLeft: l.indent * 16 }}>
              {l.toks.map(([s, c], j) => (
                <span key={j} style={{ color: COLORS[c] }}>
                  {s}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
      <div data-compiled className="flex items-center gap-2 border-t border-white/8 px-4 py-2.5 text-[11px] text-signal">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path d="m3 8.5 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        {compiled}
      </div>
    </div>
  )
}
