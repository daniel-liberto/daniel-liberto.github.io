import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { pointer } from '@/lib/store'
import { simplex3 } from './glsl'

const N = 9000

/* --------------------------------------------------------------------------------------------
 * Four formations for the same particles. Each is written into its own attribute so the shader
 * can blend between any two of them.
 * ------------------------------------------------------------------------------------------ */
function sphere(out: Float32Array) {
  const g = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const a = g * i
    out.set([Math.cos(a) * r * 1.25, y * 1.25, Math.sin(a) * r * 1.25], i * 3)
  }
}
function torusKnot(out: Float32Array) {
  const p = 2
  const q = 3
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2 * 7
    const r = 0.62 + 0.28 * Math.cos(q * t)
    const cx = r * Math.cos(p * t)
    const cy = r * Math.sin(p * t)
    const cz = 0.28 * Math.sin(q * t)
    // thicken the line into a tube
    const a = Math.random() * Math.PI * 2
    const rr = 0.11 * Math.sqrt(Math.random())
    out.set([(cx + Math.cos(a) * rr) * 1.35, (cy + Math.sin(a) * rr) * 1.35, (cz + Math.cos(a * 1.7) * rr) * 1.35], i * 3)
  }
}
function wave(out: Float32Array) {
  const side = Math.ceil(Math.sqrt(N))
  for (let i = 0; i < N; i++) {
    const x = ((i % side) / (side - 1) - 0.5) * 3
    const z = (Math.floor(i / side) / (side - 1) - 0.5) * 3
    const y = Math.sin(x * 2.2) * 0.22 + Math.cos(z * 2.6) * 0.18
    out.set([x, y, z], i * 3)
  }
}
function cube(out: Float32Array) {
  for (let i = 0; i < N; i++) {
    const face = i % 6
    const u = Math.random() * 2 - 1
    const v = Math.random() * 2 - 1
    const s = face < 3 ? 1 : -1
    const ax = face % 3
    const p = ax === 0 ? [s, u, v] : ax === 1 ? [u, s, v] : [u, v, s]
    out.set([p[0] * 0.9, p[1] * 0.9, p[2] * 0.9], i * 3)
  }
}

/** Each particle flies from its spot in one formation to its spot in the next. */
const vertPair = /* glsl */ `
attribute vec3 aFrom;
attribute vec3 aTo;
attribute float aRand;
uniform float uT;
uniform int uEase;
uniform float uTime;
uniform float uSize;
uniform float uPixel;
varying float vDepth;
varying float vGlow;
${simplex3}

float ease(float t) {
  if (uEase == 0) return t >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t);
  if (uEase == 1) return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  return t < 0.5 ? 8.0 * t * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 4.0) / 2.0;
}

void main() {
  float t = clamp(uT * 1.6 - aRand * 0.6, 0.0, 1.0);
  float e = ease(t);
  vec3 p = mix(aFrom, aTo, e);
  // turbulence that peaks mid-flight, so particles swirl instead of sliding in straight lines
  float fly = sin(3.14159 * t);
  vec3 n = vec3(
    snoise(p * 1.6 + vec3(uTime * 0.3, 0.0, 0.0)),
    snoise(p * 1.6 + vec3(0.0, uTime * 0.3, 7.0)),
    snoise(p * 1.6 + vec3(13.0, 0.0, uTime * 0.3))
  );
  p += n * (0.35 * fly + 0.015);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vDepth = clamp((-mv.z - 2.4) / 2.6, 0.0, 1.0);
  vGlow = fly;
  gl_PointSize = uSize * uPixel * (0.6 + aRand * 0.8) / -mv.z;
}
`

const frag = /* glsl */ `
varying float vDepth;
varying float vGlow;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.1, d);
  vec3 near = vec3(0.24, 1.0, 0.55);
  vec3 far = vec3(0.93, 0.92, 0.89);
  vec3 col = mix(near, far, vDepth * 0.85);
  col = mix(col, vec3(1.0), vGlow * 0.35);
  gl_FragColor = vec4(col, a * (0.95 - vDepth * 0.55));
}
`
const BUILDERS = [sphere, torusKnot, wave, cube]
const EASES = [0, 1, 2, 0]

function Particles({ progress }: { progress: { current: number } }) {
  const points = useRef<THREE.Points>(null)
  const shapes = useMemo(
    () =>
      BUILDERS.map((b) => {
        const a = new Float32Array(N * 3)
        b(a)
        return a
      }),
    [],
  )
  const { geo, mat } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const from = new THREE.BufferAttribute(shapes[0].slice(), 3)
    const to = new THREE.BufferAttribute(shapes[1].slice(), 3)
    geo.setAttribute('position', new THREE.BufferAttribute(shapes[0].slice(), 3))
    geo.setAttribute('aFrom', from)
    geo.setAttribute('aTo', to)
    const rnd = new Float32Array(N)
    for (let i = 0; i < N; i++) rnd[i] = Math.random()
    geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1))
    const mat = new THREE.ShaderMaterial({
      vertexShader: vertPair,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uT: { value: 0 },
        uEase: { value: 0 },
        uTime: { value: 0 },
        uSize: { value: 26 },
        uPixel: { value: Math.min(window.devicePixelRatio, 2) },
      },
    })
    return { geo, mat }
  }, [shapes])
  useEffect(
    () => () => {
      geo.dispose()
      mat.dispose()
    },
    [geo, mat],
  )

  const seg = useRef(-1)
  const shown = useRef(0)
  const rot = useRef({ x: 0, y: 0 })

  useFrame((_, dt) => {
    shown.current += (progress.current - shown.current) * Math.min(1, dt * 6)
    const m = Math.min(BUILDERS.length - 1.0001, shown.current * (BUILDERS.length - 1))
    const s = Math.floor(m)
    const local = m - s
    if (s !== seg.current) {
      seg.current = s
      ;(geo.getAttribute('aFrom') as THREE.BufferAttribute).copyArray(shapes[s]).needsUpdate = true
      ;(geo.getAttribute('aTo') as THREE.BufferAttribute).copyArray(shapes[s + 1]).needsUpdate = true
      mat.uniforms.uEase.value = EASES[s + 1]
    }
    // each transition plays in the middle of its slice, holding the formed shape at both ends
    mat.uniforms.uT.value = THREE.MathUtils.clamp((local - 0.15) / 0.7, 0, 1)
    mat.uniforms.uTime.value += dt
    const p = points.current!
    rot.current.y += dt * 0.18
    const tx = pointer.active ? pointer.ny * 0.45 : 0.25
    const ty = pointer.active ? pointer.nx * 0.7 : 0
    p.rotation.x = THREE.MathUtils.damp(p.rotation.x, tx, 3, dt)
    p.rotation.y = rot.current.y + THREE.MathUtils.damp(p.rotation.y - rot.current.y, ty, 3, dt)
  })

  return <points ref={points} geometry={geo} material={mat} frustumCulled={false} />
}

export default function MotionMorph({ progress, active }: { progress: { current: number }; active: boolean }) {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 4.2], fov: 42 }}
      frameloop={active ? 'always' : 'never'}
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden
    >
      <Particles progress={progress} />
    </Canvas>
  )
}
