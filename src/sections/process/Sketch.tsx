import { useLayoutEffect, useRef } from 'react'
import rough from 'roughjs'
import { CARD, NOTES, PARTS, sparkPath } from './card'

const INK = '#18181b'
const PEN = '#0b7a3e'

/**
 * The "scribble" version of the wallet card, drawn with Rough.js so every stroke looks hand-made.
 * Paths are generated once and then revealed with DrawSVG by the process timeline.
 */
export default function Sketch({ notes, amount, send, receive, currency }: { notes: string[]; amount: string; send: string; receive: string; currency: string }) {
  const svg = useRef<SVGSVGElement>(null)

  useLayoutEffect(() => {
    const el = svg.current!
    const layer = el.querySelector('[data-rough]')!
    layer.innerHTML = ''
    const rc = rough.svg(el)
    const base = { roughness: 1.6, bowing: 1.4, stroke: INK, strokeWidth: 1.7, seed: 11 }
    const add = (n: SVGGElement) => layer.appendChild(n)
    const P = PARTS
    add(rc.rectangle(3, 3, CARD.w - 6, CARD.h - 6, { ...base, seed: 3 }))
    add(rc.circle(44, 44, 36, base))
    add(rc.linearPath([[70, 44], [80, 38], [90, 49], [100, 39], [110, 49], [120, 41], [130, 46]], { ...base, strokeWidth: 1.4 }))
    add(rc.rectangle(256, 29, 80, 30, { ...base, seed: 5 }))
    add(rc.line(24, 97, 156, 97, { ...base, strokeWidth: 1.3 }))
    add(rc.rectangle(P.delta.x, P.delta.y, P.delta.w, P.delta.h, { ...base, fill: 'rgba(11,122,62,0.5)', fillStyle: 'hachure', hachureGap: 5, fillWeight: 1, seed: 8 }))
    const sp = sparkPath(P.chart.w - 8, P.chart.h - 8).points.map(([x, y]) => [x + P.chart.x + 4, y + P.chart.y + 4] as [number, number])
    add(rc.curve(sp, { ...base, strokeWidth: 2, seed: 21 }))
    add(rc.line(P.chart.x, P.chart.y + P.chart.h, P.chart.x + P.chart.w, P.chart.y + P.chart.h, { ...base, strokeWidth: 1.2 }))
    add(rc.rectangle(P.actions.x, P.actions.y, 150, 48, { ...base, fill: INK, fillStyle: 'hachure', hachureGap: 6, fillWeight: 1.2, seed: 13 }))
    add(rc.rectangle(P.actions.x + 162, P.actions.y, 150, 48, { ...base, seed: 17 }))
    add(rc.circle(42, 434, 30, base))
    add(rc.line(66, 432, 176, 432, { ...base, strokeWidth: 1.3 }))
    add(rc.line(270, 432, 336, 432, { ...base, strokeWidth: 1.3 }))
    // annotation arrows
    NOTES.forEach((n, i) => {
      const [x1, y1] = n.from
      const [x2, y2] = n.to
      const mx = (x1 + x2) / 2
      const my = Math.min(y1, y2) - 18
      const g = rc.curve(
        [
          [x1, y1],
          [mx, my],
          [x2, y2],
        ],
        { ...base, stroke: PEN, strokeWidth: 1.6, roughness: 1.1, seed: 30 + i },
      )
      g.setAttribute('data-note-arrow', String(i))
      add(g)
      const ang = Math.atan2(y2 - my, x2 - mx)
      const a1 = [x2 - 11 * Math.cos(ang - 0.5), y2 - 11 * Math.sin(ang - 0.5)] as [number, number]
      const a2 = [x2 - 11 * Math.cos(ang + 0.5), y2 - 11 * Math.sin(ang + 0.5)] as [number, number]
      const head = rc.linearPath([a1, [x2, y2], a2], { ...base, stroke: PEN, strokeWidth: 1.6, roughness: 0.6, seed: 40 + i })
      head.setAttribute('data-note-arrow', String(i))
      add(head)
    })
  }, [])

  const pad = 260
  return (
    <svg
      ref={svg}
      data-sketch
      aria-hidden
      className="pointer-events-none absolute overflow-visible"
      style={{ left: -pad, top: -60, width: CARD.w + pad * 2, height: CARD.h + 120 }}
      viewBox={`${-pad} -60 ${CARD.w + pad * 2} ${CARD.h + 120}`}
    >
      <g data-rough />
      <g className="hand" fill={INK} data-sketch-text>
        <text x="30" y="148" fontSize="36">
          {amount}!
        </text>
        <text x="270" y="50" fontSize="17">
          {currency}
        </text>
        <text x="74" y="355" fontSize="19" fill="#eeebe4">
          {send}
        </text>
        <text x="234" y="355" fontSize="19">
          {receive}
        </text>
        <text x="44" y="190" fontSize="16">
          +4%
        </text>
      </g>
      <g className="hand" fill={PEN}>
        {NOTES.map((n, i) => (
          <text key={i} data-note={i} x={n.x} y={n.y} fontSize="23" transform={`rotate(${n.rot} ${n.x} ${n.y})`}>
            {notes[i]}
          </text>
        ))}
      </g>
    </svg>
  )
}
