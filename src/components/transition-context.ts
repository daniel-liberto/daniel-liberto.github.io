import { createContext, useContext } from 'react'

export type GoOptions = {
  /** Expand this element (an image) to full screen before navigating. */
  image?: HTMLElement | null
  /** Accent color of the curtain columns. */
  color?: string
  /** Section id to land on when arriving at "/". */
  hash?: string
}

type Ctx = {
  go: (to: string, opts?: GoOptions) => void
  /** Same-page jump: a full-screen curtain hides a teleport to the target, holds, then reveals it. */
  jump: (target: string | number, label?: string) => void
}

export const TransitionContext = createContext<Ctx | null>(null)

export function useTransition() {
  const ctx = useContext(TransitionContext)
  if (!ctx) throw new Error('useTransition must be used inside <TransitionProvider>')
  return ctx
}
