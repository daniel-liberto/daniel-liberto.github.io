import type { ProjectId } from './types'

export interface Project {
  id: ProjectId
  index: string
  name: string
  year: string
  color: string
  /** Text color that stays readable on top of `color`. */
  onColor: string
  url: string
  urlLabel: string
  cover: string
  /** Square, dark app icon. */
  logo: string
  gallery: string[]
  stack: string[]
}

export const projects: Project[] = [
  {
    id: 'tcr',
    index: '01',
    name: 'TCR Finance',
    year: '2024 · 2026',
    color: '#f26b1d',
    onColor: '#0a0a0b',
    url: 'https://site.tcr.finance',
    urlLabel: 'site.tcr.finance',
    cover: '/images/work/tcr-01.webp',
    logo: '/images/logos/tcr.webp',
    gallery: ['/images/work/tcr-02.webp', '/images/work/tcr-03.webp', '/images/work/tcr-04.webp', '/images/work/tcr-05.webp'],
    stack: ['React 19', 'TypeScript', 'Three.js', 'React Three Fiber', 'Tailwind CSS', 'TanStack Query', 'Recharts', 'Expo / React Native'],
  },
  {
    id: 'vcx',
    index: '02',
    name: 'VCX Finance',
    year: '2025 · 2026',
    color: '#d4ff2a',
    onColor: '#0a0a0b',
    url: 'https://vcx.exchange',
    urlLabel: 'vcx.exchange',
    cover: '/images/work/vcx-01.webp',
    logo: '/images/logos/vcx.webp',
    gallery: ['/images/work/vcx-02.webp', '/images/work/vcx-03.webp', '/images/work/vcx-04.webp', '/images/work/vcx-05.webp'],
    stack: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'shadcn/ui', 'Recharts', 'i18next'],
  },
  {
    id: 'hubib',
    index: '03',
    name: 'Hubib',
    year: '2025 · 2026',
    color: '#ea8e43',
    onColor: '#0a0a0b',
    url: 'https://hubib.com',
    urlLabel: 'hubib.com',
    cover: '/images/work/hubib-01.webp',
    logo: '/images/logos/hubib.webp',
    gallery: ['/images/work/hubib-02.webp', '/images/work/hubib-03.webp', '/images/work/hubib-04.webp', '/images/work/hubib-05.webp', '/images/work/hubib-06.webp'],
    stack: ['React', 'TypeScript', 'GSAP', 'Three.js', 'React Three Fiber', 'Lenis', 'Framer Motion', 'Tailwind CSS', 'i18next', 'Expo'],
  },
]

export const projectById = (id: string) => projects.find((p) => p.id === id)

export const contact = {
  email: 'daniel.liberto@hotmail.com',
  whatsapp: 'https://wa.me/5518998067305',
  socials: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/daniel-almeida-dev' },
    { label: 'GitHub', href: 'https://github.com/daniel-liberto' },
    { label: 'WhatsApp', href: 'https://wa.me/5518998067305' },
  ],
}

/** The portrait and its person mask (Vision segmentation), in a 1280px square. */
export const portrait = {
  src: '/images/me/daniel.webp',
  mask: '/images/me/daniel-mask.webp',
  size: 640,
}

/** Every image the preloader waits for. */
export const preloadImages = ['/images/me/daniel-studio.webp', '/images/me/daniel-studio-mask.webp', '/images/me/daniel-studio-room.webp', ...projects.map((p) => p.cover)]
