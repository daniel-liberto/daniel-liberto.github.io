import { portraitState } from './store'

type Rect = { left: number; top: number; width: number; height: number }

/** Visible window of the (square) portrait texture for a plane of this aspect, matching the shader. */
function view(rect: Rect, zoom = portraitState.zoom, fx = portraitState.fx, fy = portraitState.fy) {
  const z = Math.max(zoom, 1)
  const asp = rect.width / Math.max(rect.height, 1)
  const vw = (asp > 1 ? 1 : asp) / z
  const vh = (asp > 1 ? 1 / asp : 1) / z
  const cx = Math.min(Math.max(fx, vw / 2), 1 - vw / 2)
  const cy = Math.min(Math.max(fy, vh / 2), 1 - vh / 2)
  return { vw, vh, cx, cy }
}

/** Texture uv (top-left origin) → screen point. */
export function texToScreen(u: number, v: number, rect: Rect) {
  const { vw, vh, cx, cy } = view(rect)
  return {
    x: rect.left + ((u - cx) / vw + 0.5) * rect.width,
    y: rect.top + ((v - cy) / vh + 0.5) * rect.height,
  }
}

/** Screen point → texture uv, or null outside the plane. */
export function screenToTex(x: number, y: number, rect: Rect) {
  const sx = (x - rect.left) / rect.width
  const sy = (y - rect.top) / rect.height
  if (sx < 0 || sx > 1 || sy < 0 || sy > 1) return null
  const { vw, vh, cx, cy } = view(rect)
  return { u: cx + (sx - 0.5) * vw, v: cy + (sy - 0.5) * vh }
}
