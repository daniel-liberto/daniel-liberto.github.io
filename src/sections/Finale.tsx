import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { useGesture } from '@use-gesture/react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useLang } from '@/lib/lang-context'
import { useUI } from '@/lib/store'
import { useTransition } from '@/components/transition-context'
import { playPluck } from '@/lib/sound'
import { contact } from '@/content/projects'
import { useMedia } from '@/hooks/useMedia'
import FrameIcon from '@/components/FrameIcon'
import FigmaCursor from '@/components/FigmaCursor'
import ContactFrame from './finale/ContactFrame'
import { CreditsBoard, DesignSystemBoard, ScribblesBoard } from './finale/Boards'

type Cam = { s: number; x: number; y: number }
type Item = { id: string; name: string; col: number; row: number; w: number; h: number; kind: 'frame' | 'live' | 'board'; section?: string }

const SECTION_OF: Record<string, string> = {
  hero: 'top',
  toolbox: 'toolbox',
  manifesto: 'manifesto',
  process: 'process',
  work: 'work',
  services: 'services',
  changelog: 'journey',
  contact: 'contact',
}

export default function Finale() {
  const { t, lang } = useLang()
  const { jump } = useTransition()
  const f = t.finale
  const root = useRef<HTMLElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const world = useRef<HTMLDivElement>(null)
  const daniel = useRef<HTMLDivElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const [vp, setVp] = useState({ w: 1440, h: 900 })
  const [selected, setSelected] = useState<string>('contact')
  const [zoomPct, setZoomPct] = useState(100)
  const wide = useMedia('(min-width: 1024px)')
  const landscape = vp.w >= vp.h
  const camRef = useRef<Cam>({ s: 1, x: 0, y: 0 })
  const api = useRef<{ fit: () => void; zoomBy: (k: number) => void; focus: (id: string) => void } | null>(null)

  useEffect(() => {
    const m = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    m()
    window.addEventListener('resize', m)
    return () => window.removeEventListener('resize', m)
  }, [])

  /* ------------------------------ world layout ------------------------------ */
  const GX = Math.max(140, vp.w * 0.16)
  const GY = Math.max(130, vp.h * 0.3)
  const items: Item[] = useMemo(() => {
    const W = vp.w
    const H = vp.h
    const nm = (id: string) => f.frames.find((x) => x.id === id)?.name ?? id
    const fr = (id: string, col: number, row: number): Item => ({ id, name: nm(id), col, row, w: W, h: H, kind: id === 'contact' ? 'live' : 'frame', section: SECTION_OF[id] })
    return [
      fr('hero', 0, 0),
      fr('manifesto', 1, 0),
      fr('process', 2, 0),
      fr('work', 3, 0),
      fr('services', 0, 1),
      fr('toolbox', 1, 1),
      fr('changelog', 2, 1),
      fr('contact', 3, 1),
      { id: 'ds', name: 'Design system', col: 4, row: 0, w: W, h: H, kind: 'board' },
      { id: 'credits', name: f.credits, col: 4, row: 1, w: W, h: H, kind: 'board' },
      { id: 'scribbles', name: f.pages[2], col: 0, row: 2, w: W * 2 + GX, h: H * 0.8, kind: 'board' },
    ]
  }, [vp, f, GX])
  const pos = (it: Item) => ({ x: it.col * (vp.w + GX), y: it.row * (vp.h + GY) })
  const live = items.find((i) => i.kind === 'live')!
  const P = pos(live)
  const worldW = 5 * vp.w + 4 * GX
  const worldH = 2 * (vp.h + GY) + vp.h * 0.8

  /* ------------------------------ camera ------------------------------ */
  useGSAP(
    () => {
      const sec = root.current!
      const pin = sec.querySelector<HTMLElement>('[data-pin]')!
      const w = world.current!
      const labels = gsap.utils.toArray<HTMLElement>('[data-flabel]', pin)
      const dots = pin.querySelector<HTMLElement>('[data-dots]')!
      const zoomText = gsap.utils.toArray<HTMLElement>('[data-zoomtext]', pin)
      const follow = pin.querySelector<HTMLElement>('[data-follow]')!
      const cam = camRef.current
      const area = () => {
        const W = vp.w
        const H = vp.h
        return wide ? { l: 240, t: 48, r: W - 240, b: H } : { l: 0, t: 48, r: W, b: H - 56 }
      }
      const fitCam = (): Cam => {
        const a = area()
        const s = Math.min((a.r - a.l) / worldW, (a.b - a.t) / worldH) * 0.95
        return { s, x: (a.l + a.r) / 2 - (worldW / 2) * s, y: (a.t + a.b) / 2 - (worldH / 2) * s }
      }
      const focusCam = (wx: number, wy: number, s: number): Cam => {
        const a = area()
        return { s, x: (a.l + a.r) / 2 - wx * s, y: (a.t + a.b) / 2 - wy * s }
      }
      // scroll camera: the live frame starts covering the screen and shrinks into its slot
      const scrollCam = (t: number): Cam => {
        const end = fitCam()
        const e = gsap.parseEase('power2.inOut')(t)
        const s = Math.exp(Math.log(1) + (Math.log(end.s) - Math.log(1)) * e)
        const qx = 0 + (P.x * end.s + end.x - 0) * e
        const qy = 0 + (P.y * end.s + end.y - 0) * e
        return { s, x: qx - P.x * s, y: qy - P.y * s }
      }

      let mode: 'scroll' | 'free' = 'scroll'
      const state = { t: 0 }
      /** Camera weights of the choreography: a = the shot following Daniel, b = the shot on his comment. */
      const shots = { a: 0, b: 0 }
      const back = { k: 1, from: { s: 1, x: 0, y: 0 } as Cam }
      const dw = { x: P.x - 600, y: P.y + vp.h * 1.6, on: 0 }
      const pin2 = { x: P.x + vp.w * 0.82, y: P.y + vp.h * 0.12 }
      const frameCenter = (id: string) => {
        const it = items.find((i) => i.id === id)!
        const p = pos(it)
        return { x: p.x + it.w / 2, y: p.y + it.h / 2 }
      }
      const lerpCam = (a: Cam, b: Cam, k: number): Cam => ({
        s: Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * k),
        x: a.x + (b.x - a.x) * k,
        y: a.y + (b.y - a.y) * k,
      })
      const shotA = () => focusCam(frameCenter('manifesto').x, frameCenter('manifesto').y + vp.h * 0.4, Math.min(fitCam().s * 1.9, 0.5))
      const shotB = () => focusCam(P.x + vp.w * 0.62, P.y + vp.h * 0.3, Math.min(fitCam().s * 2.6, 0.62))
      /** Everything the scroll controls: zoom-out first, then the camera following Daniel. */
      const scrolled = (): Cam => {
        let c = scrollCam(state.t)
        if (shots.a > 0) c = lerpCam(c, shotA(), gsap.parseEase('power3.inOut')(shots.a))
        if (shots.b > 0) c = lerpCam(c, shotB(), gsap.parseEase('power3.inOut')(shots.b))
        return c
      }

      const render = () => {
        let c: Cam = cam
        if (mode === 'scroll') {
          const sc = scrolled()
          c = back.k < 1 ? lerpCam(back.from, sc, back.k) : sc
          Object.assign(cam, c)
        }
        w.style.transform = `translate3d(${c.x}px, ${c.y}px, 0) scale(${c.s})`
        w.style.setProperty('--inv', String(1 / c.s))
        const g = 24 * c.s
        dots.style.backgroundSize = `${g}px ${g}px`
        dots.style.backgroundPosition = `${c.x}px ${c.y}px`
        dots.style.opacity = String(gsap.utils.clamp(0, 1, (c.s - 0.18) * 3))
        labels.forEach((el) => {
          const x = Number(el.dataset.x) * c.s + c.x
          const y = Number(el.dataset.y) * c.s + c.y
          el.style.transform = `translate3d(${x}px, ${y - 22}px, 0)`
          el.style.opacity = state.t > 0.15 || mode === 'free' ? '1' : '0'
        })
        const pct = Math.round(c.s * 100)
        zoomText.forEach((z) => (z.textContent = `${pct}%`))
        if (daniel.current) {
          daniel.current.style.transform = `translate3d(${dw.x * c.s + c.x}px, ${dw.y * c.s + c.y}px, 0)`
          daniel.current.style.opacity = String(dw.on)
        }
        if (bubble.current) {
          const bx = pin2.x * c.s + c.x
          const by = pin2.y * c.s + c.y
          bubble.current.style.transform = `translate3d(${bx}px, ${by}px, 0)`
          // keep the comment card on screen: slide it left (and under the pin) near the right edge
          const card = bubble.current.querySelector<HTMLElement>('[data-bubble-card]')
          if (card) {
            const over = bx + 28 + card.offsetWidth + 12 - vp.w
            card.style.translate = over > 0 ? `${-over}px 30px` : '0 0'
          }
        }
      }
      gsap.ticker.add(render)

      /* choreography, scrubbed by the scroll (forwards and backwards): Daniel joins, the camera
         follows him to the contact frame, he leaves a comment */
      const toCam = (target: () => Cam, duration: number, ease = 'power3.inOut') => {
        const from: Cam = { ...cam }
        const proxy = { k: 0 }
        return gsap.to(proxy, {
          k: 1,
          duration,
          ease,
          onUpdate: () => Object.assign(cam, lerpCam(from, target(), proxy.k)),
        })
      }
      const hero = frameCenter('hero')
      const man = frameCenter('manifesto')
      const proc = frameCenter('process')
      const chore = gsap
        .timeline({ paused: true, defaults: { ease: 'power2.inOut' } })
        .fromTo('[data-toast]', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'back.out(2)' }, 0.1)
        .fromTo('[data-avatar-d]', { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.5, ease: 'back.out(3)' }, 0.15)
        .fromTo(dw, { x: hero.x - vp.w * 0.2, y: hero.y + vp.h * 0.3, on: 0 }, { on: 1, duration: 0.3 }, 0.5)
        .fromTo(follow, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0.7)
        .to(shots, { a: 1, duration: 1.6, ease: 'none' }, 0.9)
        .to(dw, { x: man.x + vp.w * 0.1, y: man.y, duration: 1.4 }, 1.0)
        .to(dw, { x: proc.x - vp.w * 0.1, y: proc.y + vp.h * 0.2, duration: 1.2 }, 2.6)
        .to(shots, { b: 1, duration: 1.8, ease: 'none' }, 2.8)
        .to(dw, { x: pin2.x - 8, y: pin2.y + 8, duration: 1.3, ease: 'power3.inOut' }, 3.6)
        .fromTo(daniel.current, { scale: 1 }, { scale: 0.85, duration: 0.12, yoyo: true, repeat: 1 }, 4.95)
        .call(() => playPluck(), [], 5.0)
        .fromTo('[data-pin-dot]', { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.45, ease: 'back.out(3)' }, 5.0)
        .fromTo('[data-bubble-card]', { autoAlpha: 0, y: 10, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.8)' }, 5.25)
        .to(dw, { x: pin2.x + vp.w * 0.5, y: pin2.y + vp.h * 0.45, duration: 1.4 }, 5.6)
        .to('[data-toast]', { autoAlpha: 0, duration: 0.4 }, 5.6)
        .to(follow, { autoAlpha: 0, duration: 0.5 }, 6.0)
        .to({}, { duration: 0.4 })

      const goFree = () => {
        if (mode === 'free') return
        chore.progress(1)
        Object.assign(cam, scrolled())
        mode = 'free'
        pin.classList.add('is-free')
      }
      const goScroll = () => {
        if (mode === 'scroll') return
        back.from = { ...cam }
        mode = 'scroll'
        pin.classList.remove('is-free')
        // blend back from wherever the visitor left the camera
        gsap.fromTo(back, { k: 0 }, { k: 1, duration: 0.7, ease: 'power2.out' })
      }

      // site header steps aside, Figma chrome slides in
      const chromeTl = gsap
        .timeline({ paused: true })
        .fromTo('[data-topbar]', { yPercent: -100 }, { yPercent: 0, duration: 0.5, ease: 'power3.out' }, 0)
        .fromTo('[data-lpanel]', { xPercent: -100 }, { xPercent: 0, duration: 0.6, ease: 'power3.out' }, 0.1)
        .fromTo('[data-rpanel]', { xPercent: 100 }, { xPercent: 0, duration: 0.6, ease: 'power3.out' }, 0.15)
        .fromTo('[data-bottombar]', { yPercent: 160, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out' }, 0.25)

      let chromeOn = false
      gsap.timeline({
        scrollTrigger: {
          id: 'finale',
          refreshPriority: 30,
          trigger: pin,
          start: 'top top',
          end: () => `+=${window.innerHeight * 7}`,
          pin: true,
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const p = self.progress
            state.t = gsap.utils.clamp(0, 1, (p - 0.05) / 0.27)
            if (mode === 'scroll') chore.progress(gsap.utils.clamp(0, 1, (p - 0.36) / 0.54))
            const on = p > 0.08
            if (on !== chromeOn) {
              chromeOn = on
              useUI.getState().set({ finale: on, theme: on ? 'canvas' : 'dark' })
              if (on) chromeTl.play()
              else chromeTl.reverse()
            }
            // the last stretch is a hold: the canvas is yours to explore before the post-credits
            if (p >= 0.94) goFree()
            else if (p < 0.92) goScroll()
          },
          onLeaveBack: () => useUI.getState().set({ finale: false }),
          onLeave: () => {
            chromeOn = false
            useUI.getState().set({ finale: false })
          },
        },
      })

      api.current = {
        fit: () => {
          goFree()
          toCam(fitCam, 0.9)
        },
        zoomBy: (k: number) => {
          goFree()
          const a = area()
          const cx = (a.l + a.r) / 2
          const cy = (a.t + a.b) / 2
          const s = gsap.utils.clamp(0.04, 2, cam.s * k)
          const wx = (cx - cam.x) / cam.s
          const wy = (cy - cam.y) / cam.s
          gsap.to(cam, { s, x: cx - wx * s, y: cy - wy * s, duration: 0.5, ease: 'power3.out' })
        },
        focus: (id: string) => {
          goFree()
          const it = items.find((i) => i.id === id)
          if (!it) return
          const p = pos(it)
          const a = area()
          const s = Math.min((a.r - a.l) / it.w, (a.b - a.t) / it.h) * 0.86
          toCam(() => focusCam(p.x + it.w / 2, p.y + it.h / 2, s), 1)
        },
      }

      const zoomTimer = window.setInterval(() => setZoomPct(Math.round(cam.s * 100)), 250)
      return () => {
        gsap.ticker.remove(render)
        window.clearInterval(zoomTimer)
        chore.kill()
        useUI.getState().set({ finale: false })
      }
    },
    { scope: root, dependencies: [vp, wide, lang, items], revertOnUpdate: true },
  )

  /* ------------------------------ gestures ------------------------------ */
  useGesture(
    {
      onDrag: ({ delta: [dx, dy], pinching, cancel, event }) => {
        if (pinching) return cancel()
        if (!root.current?.querySelector('[data-pin]')?.classList.contains('is-free')) return
        if ((event as PointerEvent).pointerType === 'touch') return
        const cam = camRef.current
        cam.x += dx
        cam.y += dy
      },
      onWheel: ({ event, delta: [, dy] }) => {
        const e = event as WheelEvent
        if (!e.ctrlKey && !e.metaKey) return
        if (!root.current?.querySelector('[data-pin]')?.classList.contains('is-free')) return
        e.preventDefault()
        const cam = camRef.current
        const s = gsap.utils.clamp(0.04, 2, cam.s * Math.exp(-dy * 0.004))
        const wx = (e.clientX - cam.x) / cam.s
        const wy = (e.clientY - cam.y) / cam.s
        cam.s = s
        cam.x = e.clientX - wx * s
        cam.y = e.clientY - wy * s
      },
      onPinch: ({ origin: [ox, oy], offset: [scale], memo, first }) => {
        if (!root.current?.querySelector('[data-pin]')?.classList.contains('is-free')) return memo
        const cam = camRef.current
        if (first) {
          return { s0: cam.s, k0: scale, ox, oy, wx: (ox - cam.x) / cam.s, wy: (oy - cam.y) / cam.s }
        }
        const m = memo as { s0: number; k0: number; wx: number; wy: number }
        const s = gsap.utils.clamp(0.04, 2, m.s0 * (scale / m.k0))
        cam.s = s
        cam.x = ox - m.wx * s
        cam.y = oy - m.wy * s
        return memo
      },
    },
    { target: viewport, eventOptions: { passive: false }, drag: { filterTaps: true, pointer: { buttons: [1] } }, pinch: { scaleBounds: { min: 0.05, max: 40 } } },
  )

  const finaleOn = useUI((s) => s.finale)
  const sel = items.find((i) => i.id === selected) ?? live
  const selPos = pos(sel)
  const shot = (id: string) => `/canvas/${landscape ? 'd' : 'm'}-${id}.webp`

  return (
    <section ref={root} id="contact" data-theme="dark" data-frame={t.contact.label} data-frame-index="07" className="relative z-20 -mt-[28px] overflow-hidden rounded-t-[28px] bg-canvas" aria-label={t.contact.label}>
      <div data-pin className="group/fin relative h-svh min-h-[560px] overflow-hidden bg-canvas">
        <div data-dots aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1.2px)' }} />

        {/* the pannable, zoomable canvas */}
        <div
          ref={viewport}
          data-cursor={finaleOn ? 'label' : undefined}
          data-cursor-label={f.you}
          className="absolute inset-0 touch-pan-y select-none group-[.is-free]/fin:cursor-grab"
        >
          <div ref={world} className="absolute left-0 top-0 origin-top-left" style={{ width: worldW, height: worldH, willChange: 'transform' }}>
            {items.map((it) => {
              const p = pos(it)
              const isSel = selected === it.id
              return (
                <div
                  key={it.id}
                  className={clsx('absolute', it.kind !== 'live' && 'group/frame')}
                  style={{ left: p.x, top: p.y, width: it.w, height: it.h }}
                  onClick={() => it.kind !== 'live' && setSelected(it.id)}
                  onDoubleClick={() => it.section && jump(`#${it.section}`, it.name)}
                >
                  <div className="absolute inset-0 overflow-hidden bg-ink-2 shadow-[0_0_0_calc(1px*var(--inv,1))_rgba(255,255,255,0.08)]">
                    {it.kind === 'frame' && (
                      <img src={shot(it.id)} alt={it.name} loading="lazy" draggable={false} className="h-full w-full object-cover object-top" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
                    )}
                    {it.kind === 'live' && <ContactFrame />}
                    {it.id === 'ds' && <DesignSystemBoard t={t} />}
                    {it.id === 'credits' && <CreditsBoard t={t} />}
                    {it.id === 'scribbles' && <ScribblesBoard lang={lang} />}
                  </div>
                  <div
                    aria-hidden
                    className={clsx(
                      'pointer-events-none absolute inset-0 transition-opacity',
                      isSel && finaleOn ? 'opacity-100' : 'opacity-0 group-hover/frame:opacity-60',
                    )}
                    style={{ boxShadow: '0 0 0 calc(2px * var(--inv, 1)) #3dff8b' }}
                  />
                </div>
              )
            })}
            {/* sticky note */}
            <div className="hand absolute flex items-center justify-center bg-signal-soft p-[2%] text-center text-ink shadow-xl" style={{ left: P.x + vp.w * 0.35, top: P.y + vp.h + GY * 0.25, width: vp.w * 0.32, height: vp.w * 0.2, transform: 'rotate(-3deg)', fontSize: vp.w * 0.028 }}>
              {f.sticky}
            </div>
          </div>
        </div>

        {/* frame names (screen space, like Figma) */}
        {items.map((it) => {
          const p = pos(it)
          return (
            <div key={it.id} data-flabel data-x={p.x} data-y={p.y} className="pointer-events-none absolute left-0 top-0 flex items-center gap-1 whitespace-nowrap font-mono text-[11px] text-paper/60 opacity-0">
              <FrameIcon className="h-2.5 w-2.5" />
              {it.name}
            </div>
          )
        })}

        {/* Daniel + his comment */}
        <FigmaCursor ref={daniel} name="Daniel" className="!z-30 opacity-0" />
        <div ref={bubble} className="pointer-events-none absolute left-0 top-0 z-30">
          <div data-pin-dot className="absolute -left-4 -top-4 flex h-8 w-8 items-center justify-center rounded-full rounded-bl-none bg-signal font-[700] text-ink opacity-0 shadow-lg">D</div>
          <div data-bubble-card className="pointer-events-auto absolute left-7 top-[-14px] w-[min(320px,78vw)] rounded-2xl border border-white/10 bg-[#2c2c2c] p-4 text-paper opacity-0 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-signal text-[11px] font-[700] text-ink">D</span>
              <span className="text-[13px] font-[650]">Daniel Liberto</span>
              <span className="text-[12px] text-paper/45">{lang === 'pt' ? 'agora' : 'now'}</span>
            </div>
            <p className="mt-3 text-[14px] leading-[1.45] text-paper/90">{f.comment}</p>
            <a href={`mailto:${contact.email}`} className="mt-4 flex items-center justify-between rounded-xl bg-signal px-3.5 py-2.5 text-[13px] font-[650] text-ink transition-transform hover:scale-[1.02]">
              {f.reply}
              <span aria-hidden>↗</span>
            </a>
          </div>
        </div>

        {/* following border */}
        <div data-follow aria-hidden className="pointer-events-none absolute inset-0 z-30 opacity-0" style={{ boxShadow: 'inset 0 0 0 3px #3dff8b' }}>
          <span className="absolute left-1/2 top-[56px] -translate-x-1/2 rounded-b-md rounded-t-md bg-signal px-2.5 py-1 text-[12px] font-[650] text-ink lg:top-[52px]">
            {lang === 'pt' ? 'Seguindo Daniel' : 'Following Daniel'}
          </span>
        </div>

        {/* ------------------------------ Figma chrome ------------------------------ */}
        <div data-topbar className="absolute inset-x-0 top-0 z-40 flex h-12 items-center justify-between border-b border-white/8 bg-figma px-3 text-paper">
          <div className="flex items-center gap-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-signal/12 text-signal">
              <FrameIcon filled className="h-4 w-4" />
            </span>
            <div className="ml-2 hidden items-center gap-0.5 sm:flex">
              {['M2 2v11l3-3 2 5 2-1-2-5h4z', 'M4 1v14M12 1v14M1 4h14M1 12h14', 'M3 13 8 3l5 10M5.5 9h5', 'M3 3h10M8 3v10', 'M3 3h10v7H8l-3 3v-3H3z'].map((d, i) => (
                <span key={i} className={clsx('flex h-8 w-8 items-center justify-center rounded-md', i === 0 && 'bg-signal text-ink')}>
                  <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
                    <path d={d} fill={i === 0 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                </span>
              ))}
            </div>
          </div>
          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 text-[13px] md:flex">
            <span className="text-paper/55">{f.file}</span>
            <span className="text-paper/30">/</span>
            <span className="font-[600]">{f.pages[0]}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              <span data-avatar-d className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-figma bg-signal text-[11px] font-[700] text-ink opacity-0">D</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-figma bg-paper text-[10px] font-[700] text-ink">{f.you.slice(0, 1)}</span>
            </div>
            <button
              type="button"
              onClick={() => jump(0, t.nav.home)}
              className="flex h-8 items-center gap-1.5 rounded-md bg-signal px-3 text-[12.5px] font-[650] text-ink"
            >
              <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                <path d="M3 1.5v9l7.5-4.5z" fill="currentColor" />
              </svg>
              {f.present}
            </button>
            <span data-zoomtext className="hidden w-12 text-right font-mono text-[12px] text-paper/70 sm:block">
              100%
            </span>
          </div>
        </div>

        {/* toast */}
        <div className="pointer-events-none absolute bottom-20 left-1/2 z-40 -translate-x-1/2">
          <div data-toast className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[13px] text-paper opacity-0 shadow-xl">
            <span className="h-5 w-5 rounded-full bg-signal text-center text-[11px] font-[700] leading-5 text-ink">D</span>
            {f.joined}
          </div>
        </div>

        {wide && (
          <>
            <aside data-lpanel className="absolute bottom-0 left-0 top-12 z-40 w-[240px] overflow-y-auto border-r border-white/8 bg-figma text-paper" data-lenis-prevent>
              <div className="border-b border-white/8 p-3">
                <p className="mb-2 text-[11px] font-[600] text-paper/50">{lang === 'pt' ? 'Páginas' : 'Pages'}</p>
                {f.pages.map((pg, i) => (
                  <p key={pg} className={clsx('rounded-md px-2 py-1.5 text-[12.5px]', i === 0 ? 'bg-white/8 font-[600]' : 'text-paper/70')}>
                    {pg}
                  </p>
                ))}
              </div>
              <div className="p-3">
                <p className="mb-2 text-[11px] font-[600] text-paper/50">{f.layers}</p>
                {items.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      setSelected(it.id)
                      api.current?.focus(it.id)
                    }}
                    className={clsx('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px]', selected === it.id ? 'bg-signal/15 text-signal' : 'text-paper/80 hover:bg-white/5')}
                  >
                    <FrameIcon className="h-3 w-3 opacity-70" />
                    {it.name}
                    {it.kind === 'live' && <span className="ml-auto rounded bg-signal px-1 text-[9px] font-[700] uppercase text-ink">live</span>}
                  </button>
                ))}
              </div>
            </aside>

            <aside data-rpanel className="absolute bottom-0 right-0 top-12 z-40 w-[240px] border-l border-white/8 bg-figma text-paper">
              <div className="flex gap-4 border-b border-white/8 px-4 py-3 text-[12px]">
                <span className="font-[650]">{f.design}</span>
                <span className="text-paper/45">{f.prototype}</span>
              </div>
              <div className="border-b border-white/8 p-4">
                <p className="mb-3 flex items-center gap-1.5 text-[12px] font-[650]">
                  <FrameIcon className="h-3 w-3" /> {sel.name}
                </p>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11.5px]">
                  {[
                    ['X', Math.round(selPos.x)],
                    ['Y', Math.round(selPos.y)],
                    ['W', Math.round(sel.w)],
                    ['H', Math.round(sel.h)],
                  ].map(([k, v]) => (
                    <span key={k} className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5">
                      <span className="text-paper/40">{k}</span>
                      {v}
                    </span>
                  ))}
                </div>
              </div>
              <div className="border-b border-white/8 p-4">
                <p className="mb-2 text-[11px] font-[600] text-paper/50">Fill</p>
                <p className="flex items-center gap-2 font-mono text-[11.5px]">
                  <span className="h-4 w-4 rounded border border-white/15 bg-ink" />
                  0A0A0B <span className="ml-auto text-paper/40">100%</span>
                </p>
              </div>
              <div className="p-4">
                {sel.section && (
                  <button
                    type="button"
                    onClick={() => jump(`#${sel.section}`, sel.name)}
                    className="flex w-full items-center justify-between rounded-md bg-white/8 px-3 py-2 text-[12.5px] font-[600] hover:bg-white/12"
                  >
                    {lang === 'pt' ? 'Ver no site' : 'View on site'}
                    <span aria-hidden>↗</span>
                  </button>
                )}
                <p className="mt-4 text-[11.5px] leading-relaxed text-paper/45">{lang === 'pt' ? 'Dica: duplo clique num frame leva você até a seção.' : 'Tip: double-click a frame to jump to its section.'}</p>
              </div>
            </aside>
          </>
        )}

        <div className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2">
        <div data-bottombar className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full bg-figma/95 px-4 py-2 text-[12px] text-paper/70 shadow-xl sm:flex">{wide ? f.hint : f.hintTouch}</div>
          <div className="flex items-center rounded-full bg-figma/95 p-1 text-paper shadow-xl">
            <button type="button" onClick={() => api.current?.zoomBy(1 / 1.4)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10" aria-label={f.zoomOut}>
              −
            </button>
            <span className="w-11 text-center font-mono text-[11px]">{zoomPct}%</span>
            <button type="button" onClick={() => api.current?.zoomBy(1.4)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10" aria-label={f.zoomIn}>
              +
            </button>
            <button type="button" onClick={() => api.current?.fit()} className="ml-1 rounded-full px-3 py-1.5 text-[11.5px] font-[600] hover:bg-white/10">
              {f.fit}
            </button>
          </div>
        </div>
        </div>
      </div>
    </section>
  )
}
