import * as THREE from 'three'
import { simplex3 } from './glsl'

/**
 * The hero photo split into real layers: the room (background) and Daniel (Vision person mask).
 * Each layer is its own transparent canvas so DOM typography can sit between them.
 * Plain three.js (no R3F) so CSS 3D transforms on the layers never trigger canvas resizes:
 * sizes come from ResizeObserver content boxes, which ignore transforms.
 */

export const STUDIO = {
  src: '/images/me/daniel-studio.webp',
  /** The same room with Daniel painted out, used only by the background layer. */
  room: '/images/me/daniel-studio-room.webp',
  mask: '/images/me/daniel-studio-mask.webp',
  w: 1122,
  h: 1402,
}

export type PhotoRect = { x: number; y: number; w: number; h: number }

export type StudioState = {
  rect: PhotoRect
  /** Focus point in the image (uv, top-left origin). */
  focus: [number, number]
  zoom: number
  reveal: number
  /** Left dissolve of the photo panel (fraction of its width). */
  fadeL: number
  /** Light direction for the rim (screen space, y down). */
  light: [number, number]
  rim: number
  dim: number
}

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`

const frag = (person: boolean) => /* glsl */ `
uniform sampler2D uTex;
uniform sampler2D uMask;
uniform vec2 uRes;
uniform vec4 uRect;
uniform vec2 uImg;
uniform vec2 uFocus;
uniform vec2 uOffset;
uniform float uZoom;
uniform float uReveal;
uniform float uTime;
uniform vec2 uLight;
uniform float uRim;
uniform float uFadeL;
uniform float uDim;
varying vec2 vUv;
${simplex3}

vec4 img(vec2 t) { return texture2D(uTex, vec2(t.x, 1.0 - t.y)); }
float msk(vec2 t) { return texture2D(uMask, vec2(t.x, 1.0 - t.y)).r; }

void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uRes;
  vec2 q = (p - uRect.xy) / uRect.zw;
  if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) { gl_FragColor = vec4(0.0); return; }

  float ra = uRect.z / uRect.w;
  float ri = uImg.x / uImg.y;
  vec2 s = (ra > ri ? vec2(1.0, ri / ra) : vec2(ra / ri, 1.0)) / uZoom;
  vec2 c = clamp(uFocus, s * 0.5, 1.0 - s * 0.5);
  // parallax moves the picture inside its panel, never the panel edges
  vec2 t = c + (q - 0.5 - uOffset / uRect.zw) * s;

  vec3 col = img(t).rgb;
  float m = msk(t);

  // the photo panel dissolves into the page on its left side and at the bottom
  float fade = smoothstep(0.0, max(uFadeL, 0.0001), q.x) * smoothstep(0.0, 0.16, 1.0 - q.y);

  // intro: light rises from the floor with a green burning edge
  float n = snoise(vec3(q * 2.6, uTime * 0.2)) * 0.07;
  float pr = (1.0 - q.y) * 0.9 + n + 0.05;
  float thr = uReveal * 1.2;
  float vis = 1.0 - smoothstep(thr - 0.04, thr, pr);
  float edge = smoothstep(thr - 0.14, thr - 0.04, pr) * vis * (1.0 - smoothstep(0.85, 1.0, uReveal));

  float a;
  ${
    person
      ? `
  // rim light: mask gradient tells which way the silhouette faces
  vec2 o = 5.0 / uImg;
  vec2 g = vec2(msk(t + vec2(o.x, 0.0)) - msk(t - vec2(o.x, 0.0)), msk(t + vec2(0.0, o.y)) - msk(t - vec2(0.0, o.y)));
  float gl = length(g);
  float facing = clamp(dot(-g / max(gl, 1e-4), uLight), 0.0, 1.0);
  float rim = smoothstep(0.05, 0.6, gl) * (0.25 + 0.75 * facing);
  col = col * (1.0 - uDim * 0.5) + vec3(0.24, 1.0, 0.55) * rim * uRim * 0.6;
  a = smoothstep(0.35, 0.65, m) * fade * vis;`
      : `
  // the room plate has Daniel painted out; it sits a touch darker than the cut-out
  col *= 0.86 * (1.0 - uDim * 0.6);
  a = fade * vis;`
  }
  col = mix(col, vec3(0.24, 1.0, 0.55), edge * 0.9);
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
`

let shared: Promise<[THREE.Texture, THREE.Texture, THREE.Texture]> | null = null
function textures() {
  shared ??= Promise.all(
    [STUDIO.src, STUDIO.mask, STUDIO.room].map(
      (src, i) =>
        new Promise<THREE.Texture>((resolve, reject) =>
          new THREE.TextureLoader().load(
            src,
            (t) => {
              t.colorSpace = i === 1 ? THREE.NoColorSpace : THREE.SRGBColorSpace
              t.generateMipmaps = true
              t.minFilter = THREE.LinearMipmapLinearFilter
              t.needsUpdate = true
              resolve(t)
            },
            undefined,
            reject,
          ),
        ),
    ),
  ) as Promise<[THREE.Texture, THREE.Texture, THREE.Texture]>
  return shared
}

export async function createStudioLayer(host: HTMLElement, kind: 'bg' | 'person') {
  const [photo, mask, room] = await textures()
  const tex = kind === 'bg' ? room : photo
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
  canvas.setAttribute('aria-hidden', 'true')
  host.appendChild(canvas)
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 0)
  const dpr = Math.min(window.devicePixelRatio, 2)
  renderer.setPixelRatio(dpr)
  const scene = new THREE.Scene()
  const camera = new THREE.Camera()
  const material = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag(kind === 'person'),
    transparent: true,
    depthTest: false,
    uniforms: {
      uTex: { value: tex },
      uMask: { value: mask },
      uRes: { value: new THREE.Vector2(1, 1) },
      uRect: { value: new THREE.Vector4(0, 0, 1, 1) },
      uImg: { value: new THREE.Vector2(STUDIO.w, STUDIO.h) },
      uFocus: { value: new THREE.Vector2(0.5, 0.4) },
      uOffset: { value: new THREE.Vector2() },
      uZoom: { value: 1 },
      uReveal: { value: 0 },
      uTime: { value: 0 },
      uLight: { value: new THREE.Vector2(1, 0) },
      uRim: { value: 0.8 },
      uFadeL: { value: 0 },
      uDim: { value: 0 },
    },
  })
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material))

  const size = { w: 1, h: 1 }
  const ro = new ResizeObserver(([e]) => {
    size.w = Math.max(1, e.contentRect.width)
    size.h = Math.max(1, e.contentRect.height)
    renderer.setSize(size.w, size.h, false)
  })
  ro.observe(host)

  const u = material.uniforms
  return {
    render(state: StudioState, offset: [number, number], time: number) {
      u.uRes.value.set(size.w, size.h)
      u.uRect.value.set(state.rect.x, state.rect.y, state.rect.w, state.rect.h)
      u.uFocus.value.set(state.focus[0], state.focus[1])
      u.uOffset.value.set(offset[0], offset[1])
      u.uZoom.value = state.zoom
      u.uReveal.value = state.reveal
      u.uTime.value = time
      u.uLight.value.set(state.light[0], state.light[1])
      u.uRim.value = state.rim
      u.uFadeL.value = state.fadeL
      u.uDim.value = state.dim
      renderer.render(scene, camera)
    },
    dispose() {
      ro.disconnect()
      material.dispose()
      renderer.dispose()
      canvas.remove()
    },
  }
}

/** Where the photo sits: a tall panel on the right on wide screens, under the name on phones. */
export function photoRect(W: number, H: number): { rect: PhotoRect; focus: [number, number]; fadeL: number } {
  if (W >= 900) {
    const x = W * 0.4
    return { rect: { x, y: 0, w: W - x, h: H }, focus: [0.52, 0.36], fadeL: 0.34 }
  }
  const y = Math.min(H * 0.17, 150)
  return { rect: { x: 0, y, w: W, h: H - y }, focus: [0.52, 0.42], fadeL: 0 }
}

/** Screen position of the face center (used to aim the rim light). */
export function faceCenter(r: PhotoRect, focus: [number, number], zoom = 1) {
  const ra = r.w / r.h
  const ri = STUDIO.w / STUDIO.h
  const sx = (ra > ri ? 1 : ra / ri) / zoom
  const sy = (ra > ri ? ri / ra : 1) / zoom
  const cx = Math.min(Math.max(focus[0], sx / 2), 1 - sx / 2)
  const cy = Math.min(Math.max(focus[1], sy / 2), 1 - sy / 2)
  const fu = 0.5
  const fv = 0.37
  return { x: r.x + ((fu - cx) / sx + 0.5) * r.w, y: r.y + ((fv - cy) / sy + 0.5) * r.h }
}
