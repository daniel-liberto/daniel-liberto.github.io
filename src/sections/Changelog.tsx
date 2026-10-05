import { useLayoutEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap'
import { useLang } from '@/lib/lang-context'
import type { NoteKind, ReleaseEntry } from '@/content/types'

const LANE_COLOR: Record<string, string> = {
  main: '#0a0a0b',
  unopar: '#7c7a74',
  'grupo-nexus': '#0b7a3e',
  'tcr-finance': '#f26b1d',
  hubib: '#c98a2e',
}

/** The picture each release brings into focus when the timeline reaches it. */
const SHOTS: Record<string, string> = {
  'v19.0': '/images/journey/unopar.webp',
  'v21.0': '/images/journey/unopar.webp',
  'v24.0': '/images/journey/nexus.webp',
  'v24.1': '/images/work/tcr-01.webp',
  'v25.0': '/images/work/hubib-01.webp',
  'v31.0': '/images/me/daniel.webp',
}

const KIND_STYLE: Record<NoteKind, string> = {
  added: 'bg-signal-deep text-paper',
  improved: 'border border-ink/30 text-ink',
  fixed: 'bg-you text-white',
  merged: 'bg-ink text-paper',
}

type Graph = { w: number; h: number; paths: { d: string; color: string; main?: boolean }[]; nodes: { x: number; y: number; color: string; head?: boolean; merge?: boolean }[] }

/** Lanes: main on the left, branches step to the right; branches that are still open converge into HEAD. */
function buildGraph(entries: ReleaseEntry[], ys: number[], wide: boolean): Graph {
  const X0 = wide ? 18 : 12
  const GAP = wide ? 34 : 22
  const lanes: Record<string, number> = { main: X0 }
  const open: string[] = []
  const paths: Graph['paths'] = []
  const nodes: Graph['nodes'] = []
  const headY = ys[ys.length - 1]
  const top = ys[0] - 40
  paths.push({ d: `M${X0},${top} L${X0},${headY}`, color: LANE_COLOR.main, main: true })
  let nextLane = 1
  entries.forEach((e, i) => {
    const y = ys[i]
    if (e.kind === 'branch') {
      const lane = lanes[e.branch] ?? X0 + GAP * nextLane++
      lanes[e.branch] = lane
      open.push(e.branch)
      const color = LANE_COLOR[e.branch] ?? '#0a0a0b'
      const by = y - 46
      paths.push({ d: `M${X0},${by} C${X0},${by + 26} ${lane},${by + 20} ${lane},${y}`, color })
      nodes.push({ x: lane, y, color })
    } else if (e.kind === 'merge') {
      const lane = lanes[e.branch]
      const color = LANE_COLOR[e.branch] ?? '#0a0a0b'
      const start = ys[entries.findIndex((x) => x.branch === e.branch)]
      paths.push({ d: `M${lane},${start} L${lane},${y - 34} C${lane},${y - 10} ${X0},${y - 16} ${X0},${y}`, color })
      open.splice(open.indexOf(e.branch), 1)
      delete lanes[e.branch]
      nextLane = 1
      nodes.push({ x: X0, y, color: LANE_COLOR.main, merge: true })
    } else {
      // HEAD: every open branch converges into today
      open.forEach((b) => {
        const lane = lanes[b]
        const start = ys[entries.findIndex((x) => x.branch === b)]
        paths.push({ d: `M${lane},${start} L${lane},${y - 54} C${lane},${y - 20} ${X0},${y - 26} ${X0},${y}`, color: LANE_COLOR[b] ?? '#0a0a0b' })
      })
      nodes.push({ x: X0, y, color: LANE_COLOR.main, head: true })
    }
  })
  return { w: X0 + GAP * 4, h: headY + 40, paths, nodes }
}

export default function Changelog() {
  const { t, lang } = useLang()
  const c = t.changelog
  const root = useRef<HTMLElement>(null)
  const list = useRef<HTMLOListElement>(null)
  const [graph, setGraph] = useState<Graph | null>(null)

  // measure the entries to place the commit nodes next to them
  useLayoutEffect(() => {
    const measure = () => {
      const lr = list.current!.getBoundingClientRect()
      const ys = Array.from(list.current!.querySelectorAll<HTMLElement>('[data-entry-node]')).map((el) => {
        const r = el.getBoundingClientRect()
        return r.top - lr.top + r.height / 2
      })
      setGraph(buildGraph(c.entries, ys, window.innerWidth >= 768))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(list.current!)
    return () => ro.disconnect()
  }, [c.entries])

  useGSAP(
    () => {
      if (!graph) return
      const paths = gsap.utils.toArray<SVGPathElement>('[data-gpath]', root.current!)
      gsap.set(paths, { drawSVG: '0%' })
      gsap.set('[data-gnode]', { scale: 0, transformOrigin: '50% 50%' })
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: list.current, start: 'top 70%', end: 'bottom 70%', scrub: 0.6 },
      })
      paths.forEach((p) => {
        const y0 = Number(p.dataset.y0)
        const y1 = Number(p.dataset.y1)
        const H = graph.h
        tl.to(p, { drawSVG: '100%', duration: Math.max(0.02, (y1 - y0) / H) }, y0 / H)
      })
      gsap.utils.toArray<SVGGElement>('[data-gnode]', root.current!).forEach((n) => {
        tl.to(n, { scale: 1, duration: 0.03, ease: 'back.out(3)' }, Number(n.dataset.y) / graph.h)
      })
      gsap.utils.toArray<HTMLElement>('[data-entry]', root.current!).forEach((el) => {
        gsap.from(el.querySelectorAll('[data-rv]'), { y: 30, autoAlpha: 0, stagger: 0.06, duration: 1, ease: 'silk', scrollTrigger: { trigger: el, start: 'top 82%' } })
      })
      // focus: the release the timeline is on shows its picture until the next one takes over
      const rels = gsap.utils.toArray<HTMLElement>('[data-rel]', root.current!)
      rels.forEach((el, i) => {
        const shot = el.querySelector<HTMLElement>('[data-shot]')!
        const img = shot.querySelector('img')
        gsap.set(shot, { clipPath: 'inset(0% 0% 100% 0% round 14px)' })
        const next = rels[i + 1]
        ScrollTrigger.create({
          trigger: el,
          start: 'top 62%',
          endTrigger: next ?? el,
          end: next ? 'top 62%' : 'bottom 30%',
          onToggle: (self) => {
            el.classList.toggle('is-focus', self.isActive)
            gsap.to(shot, { clipPath: self.isActive ? 'inset(0% 0% 0% 0% round 14px)' : `inset(${self.direction > 0 ? '100% 0% 0% 0%' : '0% 0% 100% 0%'} round 14px)`, duration: 0.9, ease: 'curtain', overwrite: true })
            if (self.isActive && img) gsap.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.2, ease: 'silk', overwrite: true })
          },
        })
      })
      gsap.from('[data-cl-head] [data-rv]', { y: 40, autoAlpha: 0, stagger: 0.08, duration: 1.1, ease: 'silk', scrollTrigger: { trigger: '[data-cl-head]', start: 'top 80%' } })
    },
    { scope: root, dependencies: [graph, lang], revertOnUpdate: true },
  )

  const yRange = (d: string) => {
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number)
    const ys = nums.filter((_, i) => i % 2 === 1)
    return [Math.min(...ys), Math.max(...ys)]
  }

  return (
    <section
      ref={root}
      id="journey"
      data-theme="light"
      data-frame={c.label}
      data-frame-index="06"
      className="relative z-20 rounded-t-[28px] bg-paper px-gutter pb-[14vh] pt-[18vh] text-ink"
      aria-labelledby="journey-title"
    >
      <div data-cl-head className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-7">
          <p data-rv className="label text-ink/55">(06) {c.label}</p>
          <h2 id="journey-title" data-rv className="mt-4 text-[clamp(3rem,8.4vw,9rem)] font-[780] leading-[0.86] tracking-[-0.055em]">
            {c.title}
          </h2>
        </div>
        <div className="col-span-12 flex flex-col justify-end gap-4 md:col-span-4 md:col-start-9">
          <p data-rv className="flex items-center gap-3">
            <span className="rounded-full bg-ink px-3 py-1.5 font-mono text-[0.8rem] text-signal">{c.version}</span>
            <span className="label text-ink/50">main · HEAD</span>
          </p>
          <p data-rv className="text-[1.05rem] leading-[1.5] text-ink/70">{c.intro}</p>
        </div>
      </div>

      <div className="relative mt-[10vh] grid grid-cols-12 gap-6">
        {/* git graph */}
        <div className="pointer-events-none absolute left-0 top-0 h-full" style={{ width: graph?.w ?? 0 }} aria-hidden>
          {graph && (
            <svg width={graph.w} height={graph.h} className="overflow-visible">
              {graph.paths.map((p, i) => {
                const [y0, y1] = yRange(p.d)
                return <path key={i} data-gpath data-y0={y0} data-y1={y1} d={p.d} fill="none" stroke={p.color} strokeWidth={p.main ? 2.2 : 2.6} strokeLinecap="round" />
              })}
              {graph.nodes.map((n, i) => (
                <g key={i} data-gnode data-y={n.y} transform={`translate(${n.x} ${n.y})`}>
                  {n.head ? (
                    <>
                      <circle r="15" fill="#3dff8b" opacity="0.35" className="animate-ping [transform-box:fill-box] [transform-origin:center]" />
                      <circle r="10" fill="#0a0a0b" />
                      <circle r="4.5" fill="#3dff8b" />
                    </>
                  ) : (
                    <circle r={n.merge ? 7 : 6.5} fill="#eeebe4" stroke={n.color} strokeWidth="2.6" />
                  )}
                </g>
              ))}
            </svg>
          )}
        </div>

        <ol ref={list} className="col-span-12 flex flex-col gap-[9vh] pl-[96px] md:pl-[200px] lg:col-span-9">
          {c.entries.map((e) => (
            <li key={e.version} data-entry data-rel className="relative grid grid-cols-12 gap-x-6 gap-y-3 transition-opacity duration-700 [&:not(.is-focus)]:opacity-45">
              <div className="col-span-12 md:col-span-3">
              <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-2">
                <span data-entry-node data-rv className={clsx('rounded-[6px] px-2 py-1 font-mono text-[0.78rem]', e.kind === 'head' ? 'bg-ink text-signal' : 'bg-ink/8 text-ink')}>
                  {e.version}
                </span>
                <span data-rv className="label text-ink/50">
                  {e.date} · <span style={{ color: LANE_COLOR[e.branch] }}>{e.branch}</span>
                </span>
              </div>
              <div data-shot className="mt-4 aspect-[4/3] w-full max-w-[280px] overflow-hidden rounded-[14px] bg-ink/10 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.5)]">
                <img src={SHOTS[e.version]} alt="" loading="lazy" className={clsx('h-full w-full object-cover', e.kind === 'head' && 'object-[50%_35%]')} />
              </div>
              </div>
              <div className="col-span-12 md:col-span-9">
                {e.kind === 'head' && (
                  <p data-rv className="label mb-3 flex items-center gap-2 text-signal-deep">
                    <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full bg-signal-deep" />
                    {c.head}
                  </p>
                )}
                <h3 data-rv className={clsx('font-[700] leading-[1] tracking-[-0.04em]', e.kind === 'head' ? 'serif text-[clamp(2.4rem,4.6vw,4.8rem)] font-normal' : 'text-[clamp(1.6rem,2.6vw,2.6rem)]')}>
                  {e.title}
                </h3>
                <p data-rv className="mt-2 text-[1rem] text-ink/55">{e.place}</p>
                <ul className="mt-5 flex flex-col gap-2.5">
                  {e.notes.map((n) => (
                    <li key={n.text} data-rv className="flex items-start gap-3 text-[1rem] leading-snug md:text-[1.05rem]">
                      <span className={clsx('mt-[1px] shrink-0 rounded-[5px] px-1.5 py-0.5 font-mono text-[0.66rem] uppercase tracking-[0.04em]', KIND_STYLE[n.kind])}>{c.kinds[n.kind]}</span>
                      <span className="text-ink/85">{n.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>

        {/* side facts */}
        <aside className="col-span-12 mt-10 flex flex-col gap-8 lg:col-span-3 lg:mt-0 lg:pt-2">
          <div data-entry>
            <p data-rv className="label mb-3 text-ink/50">{c.educationTitle}</p>
            <ul className="flex flex-col gap-4">
              {c.education.map((ed) => (
                <li key={ed.title} data-rv className="border-t border-ink/15 pt-3">
                  <p className="text-[0.98rem] font-[620] leading-snug">{ed.title}</p>
                  <p className="mt-1 text-[0.88rem] text-ink/55">
                    {ed.place} · {ed.detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div data-entry>
            <p data-rv className="label mb-3 text-ink/50">{c.languagesTitle}</p>
            <p data-rv className="border-t border-ink/15 pt-3 text-[0.98rem] font-[620]">{c.languages}</p>
          </div>
        </aside>
      </div>
    </section>
  )
}
