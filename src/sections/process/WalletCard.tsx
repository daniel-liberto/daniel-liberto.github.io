import type { Dict } from '@/content/types'
import { CARD, PARTS, sparkPath } from './card'

/** The fintech wallet card that travels through the whole process section. */
export default function WalletCard({ copy }: { copy: Dict['process']['card'] }) {
  const spark = sparkPath()
  const P = PARTS
  return (
    <div
      data-card
      className="absolute left-0 top-0 overflow-hidden border border-white/10 bg-ink-2 text-paper shadow-[0_40px_120px_-30px_rgba(0,0,0,0.6)]"
      style={{ width: CARD.w, height: CARD.h, borderRadius: CARD.radius }}
    >
      <div data-card-glow aria-hidden className="absolute -right-24 -top-28 h-64 w-64 rounded-full bg-signal/20 opacity-0 blur-3xl" />

      {/* header */}
      <div data-part="header" className="absolute flex items-center justify-between" style={{ left: P.header.x, top: P.header.y, width: P.header.w, height: P.header.h }}>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-signal font-[700] text-ink">D</span>
          <span className="text-[15px] font-[600] tracking-[-0.01em]">{copy.title}</span>
        </div>
        <span className="flex h-7 items-center gap-1.5 rounded-full border border-white/12 px-3 text-[12px] font-[560]">
          <span className="h-3.5 w-3.5 rounded-full bg-[#26a17b]" />
          {copy.currency}
          <svg viewBox="0 0 10 10" className="h-2 w-2 opacity-60" aria-hidden>
            <path d="m2 3.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </span>
      </div>

      {/* balance */}
      <p data-part="label" className="absolute text-[13px] leading-4 text-paper/55" style={{ left: P.label.x, top: P.label.y }}>
        {copy.balance}
      </p>
      <p data-part="amount" className="absolute flex items-baseline gap-2 whitespace-nowrap" style={{ left: P.amount.x, top: P.amount.y, height: P.amount.h }}>
        <span data-amount className="text-[40px] font-[680] leading-[44px] tracking-[-0.045em] tabular-nums">
          {copy.amount}
        </span>
        <span className="text-[14px] font-[560] text-paper/50">{copy.currency}</span>
      </p>
      <p
        data-part="delta"
        className="absolute flex items-center justify-center gap-1 rounded-full bg-signal/14 text-[12px] font-[620] text-signal"
        style={{ left: P.delta.x, top: P.delta.y, width: P.delta.w, height: P.delta.h }}
      >
        <svg viewBox="0 0 10 10" className="h-2 w-2" aria-hidden>
          <path d="M5 1.5 9 8H1z" fill="currentColor" />
        </svg>
        {copy.delta}
      </p>

      {/* chart */}
      <svg data-part="chart" className="absolute overflow-visible" style={{ left: P.chart.x, top: P.chart.y, width: P.chart.w, height: P.chart.h }} viewBox={`0 0 ${P.chart.w} ${P.chart.h}`} aria-hidden>
        <defs>
          <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#3dff8b" stopOpacity="0.28" />
            <stop offset="1" stopColor="#3dff8b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={P.chart.w} y1={P.chart.h * f} y2={P.chart.h * f} stroke="rgba(238,235,228,0.07)" strokeDasharray="3 4" />
        ))}
        <path data-spark-fill d={`${spark.d} L${P.chart.w},${P.chart.h} L0,${P.chart.h} Z`} fill="url(#spark-fill)" />
        <path data-spark d={spark.d} fill="none" stroke="#3dff8b" strokeWidth="2.2" strokeLinecap="round" />
        <circle data-spark-dot cx={spark.end[0]} cy={spark.end[1]} r="4.5" fill="#3dff8b" />
        <circle data-spark-ping cx={spark.end[0]} cy={spark.end[1]} r="4.5" fill="none" stroke="#3dff8b" strokeWidth="1.5" opacity="0" />
      </svg>

      {/* actions */}
      <div data-part="actions" className="absolute grid grid-cols-2 gap-3" style={{ left: P.actions.x, top: P.actions.y, width: P.actions.w, height: P.actions.h }}>
        <button type="button" tabIndex={-1} className="flex items-center justify-center gap-2 rounded-2xl bg-signal text-[14px] font-[650] text-ink transition-transform duration-300 hover:scale-[1.03]">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
            <path d="M3 13 13 3M6 3h7v7" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          {copy.send}
        </button>
        <button type="button" tabIndex={-1} className="flex items-center justify-center gap-2 rounded-2xl border border-white/14 text-[14px] font-[600] transition-colors duration-300 hover:bg-white/6">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
            <path d="M13 3 3 13M10 13H3V6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          {copy.receive}
        </button>
      </div>

      {/* recent */}
      <div data-part="recent" className="absolute" style={{ left: P.recent.x, top: P.recent.y, width: P.recent.w }}>
        <p className="text-[11px] uppercase tracking-[0.08em] text-paper/40">{copy.recent}</p>
        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/6">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-signal" aria-hidden>
                <path d="M8 2v12M3 9l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
            <span className="text-[13.5px] font-[560]">{copy.tx[0].name}</span>
          </div>
          <span className="text-[13.5px] font-[620] tabular-nums text-signal">{copy.tx[0].value}</span>
        </div>
      </div>
    </div>
  )
}
