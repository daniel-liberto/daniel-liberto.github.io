import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { heroState, pointer, portraitState, scrollState } from '@/lib/store'
import { portrait } from '@/content/projects'
import { roundBox } from './glsl'

/* ----------------------------------------------------------------------------------------------
 * Dot field: the Figma canvas grid. Dots swell and turn green around the cursor, stretch with
 * scroll velocity, and appear in a wave that starts at the portrait.
 * -------------------------------------------------------------------------------------------- */

const dotsFrag = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform float uIntro;
uniform float uVel;
uniform float uSpec;
uniform vec2 uMouse;
uniform float uMouseOn;
uniform vec2 uOrigin;

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  float sp = 24.0;
  vec2 cell = floor(p / sp);
  vec2 center = (cell + 0.5) * sp;
  vec2 local = p - center;

  vec2 dm = center - uMouse;
  float dist = length(dm);
  float infl = exp(-dist * dist / (2.0 * 110.0 * 110.0)) * uMouseOn;
  local += normalize(dm + 1e-4) * infl * 1.5;
  local.y /= 1.0 + min(abs(uVel) * 0.015, 3.0);

  float n = sin(center.x * 0.013 + uTime * 0.6) * sin(center.y * 0.017 - uTime * 0.45);
  float r = 0.8 + infl * 0.45 + n * 0.12;

  float maxD = length(uRes);
  float od = length(center - uOrigin);
  float front = uIntro * maxD * 1.2;
  float vis = smoothstep(front, front - 160.0, od);
  float edge = exp(-pow((od - front + 70.0) / 70.0, 2.0)) * (1.0 - smoothstep(0.92, 1.0, uIntro));
  r += edge * 1.4;

  float d = length(local);
  float a = 1.0 - smoothstep(r - 0.55, r + 0.55, d);
  vec3 paper = vec3(0.933, 0.922, 0.894);
  vec3 sig = vec3(0.239, 1.0, 0.545);
  float alpha = (0.13 + 0.12 * uSpec + infl * 0.22 + edge * 0.7) * vis;
  vec3 c = mix(paper, sig, clamp(infl * 0.6 + edge, 0.0, 1.0));
  vec2 uvn = p / uRes - 0.5;
  float vig = clamp(1.0 - dot(uvn, uvn) * 1.1, 0.0, 1.0);
  vec3 bg = vec3(0.039, 0.039, 0.043);
  gl_FragColor = vec4(bg + c * a * alpha * vig, 1.0);
}
`

function DotField({ originEl }: { originEl: RefObject<HTMLElement | null> }) {
  const { size, gl, viewport } = useThree()
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `void main() { gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`,
        fragmentShader: dotsFrag,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uRes: { value: new THREE.Vector2() },
          uDpr: { value: 1 },
          uTime: { value: 0 },
          uIntro: { value: 0 },
          uVel: { value: 0 },
          uSpec: { value: 0 },
          uMouse: { value: new THREE.Vector2(-9999, -9999) },
          uMouseOn: { value: 0 },
          uOrigin: { value: new THREE.Vector2() },
        },
      }),
    [],
  )
  useEffect(() => () => mat.dispose(), [mat])

  useFrame((_, dt) => {
    const u = mat.uniforms
    const rect = gl.domElement.getBoundingClientRect()
    u.uRes.value.set(size.width, size.height)
    u.uDpr.value = viewport.dpr
    u.uTime.value += dt
    u.uIntro.value = heroState.dots
    u.uSpec.value = heroState.grid
    u.uVel.value = THREE.MathUtils.damp(u.uVel.value, scrollState.velocity, 8, dt)
    const inside = pointer.active && pointer.y >= rect.top && pointer.y <= rect.bottom
    u.uMouseOn.value = THREE.MathUtils.damp(u.uMouseOn.value, inside ? 1 : 0, 4, dt)
    const tx = pointer.x - rect.left
    const ty = pointer.y - rect.top
    u.uMouse.value.x = THREE.MathUtils.damp(u.uMouse.value.x < -999 ? tx : u.uMouse.value.x, tx, 9, dt)
    u.uMouse.value.y = THREE.MathUtils.damp(u.uMouse.value.y < -999 ? ty : u.uMouse.value.y, ty, 9, dt)
    const o = originEl.current?.getBoundingClientRect()
    if (o) u.uOrigin.value.set(o.left - rect.left + o.width / 2, o.top - rect.top + o.height / 2)
  })

  return (
    <mesh renderOrder={0} frustumCulled={false} material={mat}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

/* ----------------------------------------------------------------------------------------------
 * Portrait: daniel.jpg as a Figma image layer. It loads like a progressive JPEG, can zoom into
 * any feature (switching to nearest-neighbour + pixel grid past ~400%), dims the background or
 * the person using the Vision person mask, and catches a light streak on the glasses lenses.
 * -------------------------------------------------------------------------------------------- */

const portraitVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const portraitFrag = /* glsl */ `
uniform sampler2D uTex;
uniform sampler2D uMask;
uniform vec2 uRes;
uniform float uReveal;
uniform float uZoom;
uniform vec2 uFocus;
uniform float uPixel;
uniform float uDim;
uniform float uDimP;
uniform float uTime;
uniform float uRadius;
uniform float uAlpha;
varying vec2 vUv;
${roundBox}

const float IMG = 640.0;

vec3 tex(vec2 t) { return texture2D(uTex, vec2(t.x, 1.0 - t.y)).rgb; }

void main() {
  vec2 st = vec2(vUv.x, 1.0 - vUv.y);
  float z = max(uZoom, 1.0);
  float asp = uRes.x / uRes.y;
  vec2 view = asp > 1.0 ? vec2(1.0, 1.0 / asp) / z : vec2(asp, 1.0) / z;
  vec2 c = clamp(uFocus, view * 0.5, 1.0 - view * 0.5);
  vec2 t = (st - 0.5) * view + c;

  // progressive JPEG: 64px blocks → 1px
  float steps = floor((1.0 - clamp(uReveal, 0.0, 1.0)) * 6.999);
  float bs = exp2(steps);
  vec2 q = bs > 1.0 ? (floor(t * IMG / bs) + 0.5) * bs / IMG : t;
  vec3 col = tex(q);

  // pixel inspection (Figma at 800%)
  if (uPixel > 0.001) {
    vec2 g = t * IMG;
    vec3 cn = tex((floor(g) + 0.5) / IMG);
    col = mix(col, cn, uPixel);
    vec2 fw = fwidth(g);
    vec2 gl = abs(fract(g - 0.5) - 0.5) / max(fw, vec2(1e-4));
    float line = 1.0 - min(min(gl.x, gl.y), 1.0);
    float show = smoothstep(3.0, 7.0, 1.0 / max(fw.x, 1e-4));
    col = mix(col, col * 0.55, line * uPixel * show);
  }

  // person mask: dim the background (or the person)
  float m = texture2D(uMask, vec2(t.x, 1.0 - t.y)).r;
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  vec3 dimmed = mix(vec3(lum), col, 0.3) * 0.16;
  col = mix(col, dimmed, uDim * (1.0 - m));
  col = mix(col, dimmed, uDimP * m);

  // Figma image placeholder before the first block arrives
  col = mix(vec3(0.025), col, smoothstep(0.0, 0.06, uReveal));

  vec2 px = (vUv - 0.5) * uRes;
  float sd = sdRoundBox(px, uRes * 0.5, min(uRadius, min(uRes.x, uRes.y) * 0.5));
  float a = 1.0 - smoothstep(-0.75, 0.75, sd);
  gl_FragColor = vec4(col, a * uAlpha);
  #include <colorspace_fragment>
}
`

function PortraitPlane({ anchor }: { anchor: RefObject<HTMLElement | null> }) {
  const mesh = useRef<THREE.Mesh>(null)
  const { size, gl } = useThree()
  const [tex, mask] = useLoader(THREE.TextureLoader, [portrait.src, portrait.mask])

  const mat = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    tex.generateMipmaps = true
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.needsUpdate = true
    mask.colorSpace = THREE.NoColorSpace
    mask.needsUpdate = true
    return new THREE.ShaderMaterial({
      vertexShader: portraitVert,
      fragmentShader: portraitFrag,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTex: { value: tex },
        uMask: { value: mask },
        uRes: { value: new THREE.Vector2(1, 1) },
        uReveal: { value: 0 },
        uZoom: { value: 1 },
        uFocus: { value: new THREE.Vector2(0.5, 0.5) },
        uPixel: { value: 0 },
        uDim: { value: 0 },
        uDimP: { value: 0 },
        uTime: { value: 0 },
        uRadius: { value: 18 },
        uAlpha: { value: 1 },
      },
    })
  }, [tex, mask, gl])
  useEffect(() => () => mat.dispose(), [mat])

  useFrame((_, dt) => {
    const el = anchor.current
    if (!el || !mesh.current) return
    const c = gl.domElement.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    mesh.current.position.set(r.left - c.left + r.width / 2 - size.width / 2, -(r.top - c.top + r.height / 2 - size.height / 2), 0)
    mesh.current.scale.set(Math.max(r.width, 1), Math.max(r.height, 1), 1)
    const u = mat.uniforms
    u.uRes.value.set(r.width, r.height)
    u.uTime.value += dt
    u.uReveal.value = portraitState.reveal
    u.uZoom.value = portraitState.zoom
    u.uFocus.value.set(portraitState.fx, portraitState.fy)
    u.uPixel.value = portraitState.pixel
    u.uDim.value = portraitState.dim
    u.uDimP.value = portraitState.dimP
    u.uRadius.value = portraitState.radius
    mesh.current.visible = r.bottom > c.top - 20 && r.top < c.bottom + 20 && r.width > 1
  })

  return (
    <mesh ref={mesh} renderOrder={1} frustumCulled={false} material={mat}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

export default function AnatomyScene({ anchor, active }: { anchor: RefObject<HTMLElement | null>; active: boolean }) {
  return (
    <Canvas
      orthographic
      flat
      dpr={[1, 2]}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ position: [0, 0, 10], zoom: 1, near: 0.1, far: 100 }}
      frameloop={active ? 'always' : 'never'}
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden
    >
      <DotField originEl={anchor} />
      <PortraitPlane anchor={anchor} />
    </Canvas>
  )
}
