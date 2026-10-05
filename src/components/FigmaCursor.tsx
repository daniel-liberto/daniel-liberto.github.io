import clsx from 'clsx'
import { forwardRef } from 'react'

/** A multiplayer cursor (arrow + name tag), like the ones that fly around a shared Figma file. */
const FigmaCursor = forwardRef<HTMLDivElement, { name: string; color?: string; textColor?: string; className?: string }>(
  function FigmaCursor({ name, color = '#3dff8b', textColor = '#0a0a0b', className }, ref) {
    return (
      <div ref={ref} aria-hidden className={clsx('pointer-events-none absolute left-0 top-0 z-20', className)} style={{ willChange: 'transform' }}>
        <svg width="22" height="24" viewBox="0 0 22 24" className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]">
          <path d="M2 2v17.2l4.7-4.4 3.1 7.1 3-1.3-3.1-7h6.5L2 2Z" fill={color} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <span
          className="absolute left-[16px] top-[20px] whitespace-nowrap rounded-[6px] rounded-tl-[2px] px-2 py-1 text-[0.72rem] font-semibold leading-none shadow-[0_6px_18px_-6px_rgba(0,0,0,0.35)]"
          style={{ background: color, color: textColor }}
        >
          {name}
        </span>
      </div>
    )
  },
)

export default FigmaCursor
