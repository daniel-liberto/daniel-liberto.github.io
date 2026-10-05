import { create } from 'zustand'

export type Theme = 'dark' | 'light' | 'signal' | 'canvas'

type UI = {
  /** The preloader finished and the first page may animate in. */
  ready: boolean
  /** The hero intro already played once in this session (skip it on later visits to "/"). */
  introPlayed: boolean
  menuOpen: boolean
  sound: boolean
  /** Theme of the section under the header, so the header can switch colors. */
  theme: Theme
  /** Figma-like "frame" label of the section in view. */
  frame: { index: string; name: string }
  /** A page transition is running: ignore clicks on links. */
  transitioning: boolean
  /** The Figma file finale is on screen: the site header steps aside for the Figma chrome. */
  finale: boolean
  /** The post-credits roll is on screen: lights down, header away. */
  cinema: boolean
  set: (p: Partial<Omit<UI, 'set'>>) => void
}

export const useUI = create<UI>((set) => ({
  ready: false,
  introPlayed: false,
  menuOpen: false,
  sound: false,
  theme: 'dark',
  frame: { index: '01', name: 'Hero' },
  transitioning: false,
  finale: false,
  cinema: false,
  set: (p) => set(p),
}))

if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __ui: typeof useUI }).__ui = useUI

/** Mutable, per-frame state shared between DOM, GSAP and WebGL (never triggers React renders). */
export const pointer = { x: -9999, y: -9999, nx: 0, ny: 0, vx: 0, vy: 0, active: false }

export const scrollState = { velocity: 0, smoothVelocity: 0, y: 0 }

/** Driven by the hero / anatomy timelines, read by the portrait shader every frame. */
export const portraitState = {
  /** 0 → 1: the image "develops" like a progressive JPEG. */
  reveal: 0,
  /** Zoom factor (1 = whole image) and the focus point in image uv (0..1, top-left origin). */
  zoom: 1,
  fx: 0.5,
  fy: 0.5,
  /** 0 → 1: switch to nearest-neighbour sampling with a pixel grid (Figma at 800%). */
  pixel: 0,
  /** 0 → 1: darken and desaturate the background, keep the person bright. */
  dim: 0,
  /** 0 → 1: the opposite, darken the person to spotlight the background. */
  dimP: 0,
  /** Corner radius in CSS px. */
  radius: 18,
}

export const heroState = { intro: 0, dots: 0, grid: 0 }

export const workState = { velocity: 0 }

/** Where the home page was scrolled when we left it for a case page. */
export const homeMemory = { y: 0, fromCase: false }

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((r) => (resolve = r))
  return { promise, resolve }
}

/** Resolved by the hero once its WebGL scene has compiled, so the preloader can wait for it. */
export const heroGate = deferred()
