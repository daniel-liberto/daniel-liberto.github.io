export type Lang = 'en' | 'pt'

export type ProjectId = 'tcr' | 'vcx' | 'hubib'

export interface Metric {
  value: string
  label: string
}

export interface ProjectCopy {
  tagline: string
  category: string
  role: string
  summary: string
  overview: string
  challenge: string
  solution: string
  highlights: string[]
  platforms: string[]
  metrics: Metric[]
  captions: string[]
}

/** A feature of the portrait that gets its own callout in the anatomy sequence. */
export type AnatomyKey = 'brow' | 'lens' | 'brain' | 'beard' | 'jacket' | 'env'

export interface AnatomyItem {
  key: AnatomyKey
  title: string
  text: string
}

export interface ServiceItem {
  title: string
  text: string
  deliverables: string[]
}

export type NoteKind = 'added' | 'improved' | 'fixed' | 'merged'

export interface ReleaseEntry {
  version: string
  date: string
  branch: string
  title: string
  place: string
  /** branch: opens a lane, merge: closes a lane into main, head: the current state. */
  kind: 'branch' | 'merge' | 'head'
  notes: { kind: NoteKind; text: string }[]
}

export interface Dict {
  meta: { title: string; description: string }
  nav: {
    work: string
    services: string
    about: string
    contact: string
    menu: string
    close: string
    sound: string
    skip: string
    back: string
    home: string
  }
  preloader: { file: string; compiling: string; ready: string }
  hero: {
    edition: string
    role: string
    roleB: string
    intro: string
    available: string
    location: string
    scroll: string
    /** Names of the hero layers in the exploded view. */
    layers: string[]
  }
  anatomy: {
    label: string
    title: string
    titleB: string
    file: string
    zoom: string
    items: AnatomyItem[]
    outro: string
  }
  manifesto: {
    label: string
    /** Markup: [word]{style} where style is serif | code | mark | chip | pill. */
    text: string
    cursor: string
    stats: { value: number; suffix: string; label: string }[]
  }
  process: {
    label: string
    title: string
    titleB: string
    stages: { name: string; text: string }[]
    card: {
      title: string
      balance: string
      amount: string
      currency: string
      delta: string
      send: string
      receive: string
      recent: string
      tx: { name: string; value: string }[]
      notes: string[]
      notif: string
      notifValue: string
    }
    design: { colors: string; type: string; spacing: string; component: string; autoLayout: string }
    code: { file: string; compiled: string }
    product: { live: string; hint: string }
  }
  work: {
    label: string
    title: string
    titleB: string
    intro: string
    view: string
    live: string
    moreTitle: string
    moreText: string
    moreCta: string
    archive: string
    private: string
    drag: string
  }
  case: {
    overview: string
    challenge: string
    solution: string
    highlights: string
    gallery: string
    next: string
    back: string
    visit: string
    scroll: string
    role: string
    year: string
    platforms: string
    stack: string
    metricsNote: string
    holdNext: string
  }
  projects: Record<ProjectId, ProjectCopy>
  archive: { name: string; kind: string; year: string }[]
  services: {
    label: string
    title: string
    titleB: string
    intro: string
    items: ServiceItem[]
    deliverables: string
  }
  toolbox: { label: string; title: string; hint: string; space: string; groups: { title: string; items: string[] }[] }
  changelog: {
    label: string
    title: string
    version: string
    intro: string
    entries: ReleaseEntry[]
    kinds: Record<NoteKind, string>
    head: string
    languagesTitle: string
    languages: string
    educationTitle: string
    education: { title: string; place: string; detail: string }[]
  }
  contact: {
    label: string
    titleA: string
    scribble: string
    titleB: string
    text: string
    copy: string
    copied: string
    whatsapp: string
    response: string
    socials: string
    more: string
  }
  finale: {
    joined: string
    file: string
    pages: string[]
    layers: string
    design: string
    prototype: string
    you: string
    comment: string
    reply: string
    present: string
    hint: string
    hintTouch: string
    zoomIn: string
    zoomOut: string
    fit: string
    frames: { id: string; name: string }[]
    tokensTitle: string
    typeTitle: string
    componentsTitle: string
    credits: string
    creditsText: string
    sticky: string
  }
  postCredits: {
    label: string
    credits: { role: string; name: string }[]
    creditsTitle: string
    disclaimer: string
    presents: string
    presentsTitle: string
    thanks: string
    end: string
    top: string
  }
  footer: { built: string; rights: string; top: string; local: string }
  notFound: { title: string; text: string; cta: string }
}
