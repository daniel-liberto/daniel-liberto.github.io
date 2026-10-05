import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { Flip } from 'gsap/Flip'
import { CustomEase } from 'gsap/CustomEase'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(
  useGSAP,
  ScrollTrigger,
  SplitText,
  Flip,
  CustomEase,
  ScrambleTextPlugin,
  DrawSVGPlugin,
)

/** Signature eases used across the whole site. */
CustomEase.create('curtain', 'M0,0 C0.76,0 0.24,1 1,1')
CustomEase.create('silk', 'M0,0 C0.19,1 0.22,1 1,1')
CustomEase.create('snap', 'M0,0 C0.62,0 0,1 1,1')
CustomEase.create('swing', 'M0,0 C0.5,0 0.1,1.25 0.6,1.05 0.8,0.98 0.9,1 1,1')
CustomEase.create('figma', 'M0,0 C0.3,0 0,1 1,1')

gsap.defaults({ ease: 'silk', duration: 1 })

ScrollTrigger.config({ ignoreMobileResize: true })

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const isTouch = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: none), (pointer: coarse)').matches

export {
  gsap,
  useGSAP,
  ScrollTrigger,
  SplitText,
  Flip,
  CustomEase,
  ScrambleTextPlugin,
  DrawSVGPlugin,
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __gsap: unknown }).__gsap = { gsap, ScrollTrigger, Flip }
}
