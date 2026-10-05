import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { pointer, scrollState } from '@/lib/store'
import { coverUv, roundBox, simplex3 } from './glsl'

const vertex = /* glsl */ `
uniform float uVelocity;
uniform float uHover;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  // the plane bends like paper when the track moves fast
  p.y += sin(uv.x * 3.14159265) * uVelocity * 0.08;
  p.x += sin(uv.y * 3.14159265) * uVelocity * 0.02;
  p.z += sin(uv.x * 3.14159265) * uHover * 0.02;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

const fragment = /* glsl */ `
uniform sampler2D uTexture;
uniform vec2 uRes;
uniform vec2 uImgRes;
uniform float uVelocity;
uniform float uHover;
uniform vec2 uMouse;
uniform float uTime;
uniform float uReveal;
uniform float uParallax;
uniform float uRadius;
uniform vec3 uColor;
varying vec2 vUv;
${simplex3}
${coverUv}
${roundBox}

void main() {
  vec2 uv = vUv;

  // overscan for parallax + hover push-in
  vec2 zuv = (uv - 0.5) * (0.88 - 0.05 * uHover) + 0.5;
  zuv.x += uParallax * 0.06;

  // liquid ripple around the pointer while hovering
  float d = distance(uv, uMouse);
  zuv += (uv - uMouse) * sin(d * 30.0 - uTime * 5.0) * 0.011 * uHover * smoothstep(0.45, 0.0, d);

  // scan-line tearing with speed
  float tear = snoise(vec3(uv.y * 12.0, uTime * 2.0, 0.0));
  zuv.x += tear * abs(uVelocity) * 0.006;

  vec2 tuv = coverUv(zuv, uRes, uImgRes);

  float shift = uVelocity * 0.012 + uHover * 0.0015;
  vec3 col = vec3(
    texture2D(uTexture, tuv + vec2(shift, 0.0)).r,
    texture2D(uTexture, tuv).g,
    texture2D(uTexture, tuv - vec2(shift, 0.0)).b
  );

  // reveal: an organic wipe from the bottom with a brand-colored burning edge
  float n = snoise(vec3(uv * 2.6, uTime * 0.15)) * 0.09;
  float p = uv.y * 0.86 + n + 0.07;
  float thr = uReveal * 1.12;
  float m = 1.0 - smoothstep(thr - 0.012, thr, p);
  float edge = smoothstep(thr - 0.09, thr - 0.012, p) * m;
  col = mix(col, uColor, edge * 0.95);
  col *= 1.0 - 0.2 * (1.0 - uHover) * smoothstep(0.3, 1.0, length(uv - 0.5) * 1.4);

  vec2 px = (uv - 0.5) * uRes;
  float sd = sdRoundBox(px, uRes * 0.5, uRadius);
  float corner = 1.0 - smoothstep(-1.0, 0.5, sd);

  gl_FragColor = vec4(col, m * corner);
  #include <colorspace_fragment>
}
`

export type PlaneDef = { id: string; el: HTMLElement; src: string; color: string }

function Plane({ def, texture }: { def: PlaneDef; texture: THREE.Texture }) {
  const mesh = useRef<THREE.Mesh>(null)
  const { size, gl } = useThree()
  const hover = useRef({ target: 0 })

  const material = useMemo(() => {
    const img = texture.image as HTMLImageElement
    return new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      uniforms: {
        uTexture: { value: texture },
        uRes: { value: new THREE.Vector2(1, 1) },
        uImgRes: { value: new THREE.Vector2(img.width, img.height) },
        uVelocity: { value: 0 },
        uHover: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uTime: { value: 0 },
        uReveal: { value: 0 },
        uParallax: { value: 0 },
        uRadius: { value: 20 },
        uColor: { value: new THREE.Color(def.color) },
      },
    })
  }, [texture, def.color])
  useEffect(() => () => material.dispose(), [material])

  useEffect(() => {
    const el = def.el
    const enter = () => (hover.current.target = 1)
    const leave = () => (hover.current.target = 0)
    el.addEventListener('pointerenter', enter)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointerenter', enter)
      el.removeEventListener('pointerleave', leave)
    }
  }, [def.el])

  useFrame((_, delta) => {
    if (!mesh.current) return
    const c = gl.domElement.getBoundingClientRect()
    const r = def.el.getBoundingClientRect()
    const u = material.uniforms
    mesh.current.position.set(r.left - c.left + r.width / 2 - size.width / 2, -(r.top - c.top + r.height / 2 - size.height / 2), 0)
    mesh.current.scale.set(r.width, r.height, 1)
    u.uRes.value.set(r.width, r.height)
    u.uTime.value += delta
    u.uVelocity.value = THREE.MathUtils.damp(u.uVelocity.value, THREE.MathUtils.clamp(scrollState.velocity / 70, -1, 1), 6, delta)
    u.uHover.value = THREE.MathUtils.damp(u.uHover.value, hover.current.target, 5, delta)
    u.uParallax.value = (r.left + r.width / 2 - window.innerWidth / 2) / window.innerWidth
    u.uMouse.value.set((pointer.x - r.left) / r.width, 1 - (pointer.y - r.top) / r.height)
    const revealX = (window.innerWidth - r.left) / (r.width * 0.75)
    const revealY = (window.innerHeight - r.top) / (r.height * 0.9)
    u.uReveal.value = THREE.MathUtils.damp(u.uReveal.value, THREE.MathUtils.clamp(Math.min(revealX, revealY), 0, 1), 8, delta)
    mesh.current.visible = r.right > -50 && r.left < window.innerWidth + 50 && r.bottom > -50 && r.top < window.innerHeight + 50
  })

  return (
    <mesh ref={mesh} material={material} frustumCulled={false}>
      <planeGeometry args={[1, 1, 48, 24]} />
    </mesh>
  )
}

function Planes({ defs, onReady }: { defs: PlaneDef[]; onReady: () => void }) {
  const { gl } = useThree()
  const [ready, setReady] = useState(false)
  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader()
    let loaded = 0
    return defs.map((d) =>
      loader.load(d.src, (t) => {
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
        t.needsUpdate = true
        if (++loaded === defs.length) setReady(true)
      }),
    )
  }, [defs, gl])
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures])
  useEffect(() => {
    if (ready) onReady()
  }, [ready, onReady])

  if (!ready) return null
  return (
    <>
      {defs.map((d, i) => (
        <Plane key={d.id} def={d} texture={textures[i]} />
      ))}
    </>
  )
}

export default function WorkPlanes({ defs, active, onReady }: { defs: PlaneDef[]; active: boolean; onReady: () => void }) {
  return (
    <Canvas
      orthographic
      flat
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 10], zoom: 1, near: 0.1, far: 100 }}
      frameloop={active ? 'always' : 'never'}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      aria-hidden
    >
      <Planes defs={defs} onReady={onReady} />
    </Canvas>
  )
}
