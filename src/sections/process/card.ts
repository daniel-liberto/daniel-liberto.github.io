/** Design size of the card. Sketch strokes, redlines and code highlights all use these coordinates. */
export const CARD = { w: 360, h: 476, pad: 24, radius: 28 }

/** Every part of the card with its box in card coordinates. */
export const PARTS = {
  header: { x: 24, y: 24, w: 312, h: 40 },
  label: { x: 24, y: 88, w: 140, h: 16 },
  amount: { x: 24, y: 112, w: 312, h: 44 },
  delta: { x: 24, y: 172, w: 112, h: 24 },
  chart: { x: 24, y: 212, w: 312, h: 96 },
  actions: { x: 24, y: 324, w: 312, h: 48 },
  recent: { x: 24, y: 396, w: 312, h: 56 },
} as const

export type PartKey = keyof typeof PARTS

const pts = [64, 60, 67, 50, 55, 40, 44, 30, 36, 20, 25, 10]

/** A smooth (Catmull-Rom → Bézier) path through the 7-day balance points, in chart coordinates. */
export function sparkPath(w: number = PARTS.chart.w, h: number = PARTS.chart.h) {
  const step = w / (pts.length - 1)
  const P = pts.map((y, i) => [i * step, (y / 70) * h * 0.92 + h * 0.04] as const)
  let d = `M${P[0][0]},${P[0][1]}`
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)]
    const p1 = P[i]
    const p2 = P[i + 1]
    const p3 = P[Math.min(P.length - 1, i + 2)]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return { d, end: P[P.length - 1], points: P }
}

/** Notes pinned around the card, in card coordinates: label position, arrow start and arrow target. */
export const NOTES = [
  { x: -236, y: 110, from: [-100, 128], to: [14, 136], rot: -4 },
  { x: -214, y: 196, from: [-104, 204], to: [16, 186], rot: 3 },
  { x: -206, y: 340, from: [-96, 350], to: [16, 348], rot: -3 },
  { x: 380, y: 236, from: [404, 252], to: [340, 262], rot: 4 },
] as const
