/**
 * Generative UI sound, synthesized with Tone.js (lazy-loaded the first time sound is turned on).
 * No audio files: every tick, whoosh and chord is built from oscillators and noise.
 */
type ToneNS = typeof import('tone')

let Tone: ToneNS | null = null
let enabled = false
let loading: Promise<void> | null = null

let tick: import('tone').Synth | null = null
let pluck: import('tone').PolySynth | null = null
let noise: import('tone').NoiseSynth | null = null
let pad: import('tone').PolySynth | null = null
let padLoop: import('tone').Loop | null = null

const scale = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6']

async function boot() {
  if (Tone) return
  Tone = await import('tone')
  await Tone.start()
  const master = new Tone.Volume(-14).toDestination()
  const reverb = new Tone.Reverb({ decay: 4.5, wet: 0.35 }).connect(master)
  tick = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.05 },
    volume: -16,
  }).connect(reverb)
  pluck = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.004, decay: 0.4, sustain: 0, release: 0.6 },
    volume: -12,
  }).connect(reverb)
  const filter = new Tone.AutoFilter({ frequency: 0.6, baseFrequency: 300, octaves: 4 }).connect(reverb).start()
  noise = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.25, decay: 0.5, sustain: 0, release: 0.4 },
    volume: -20,
  }).connect(filter)
  pad = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 1.5,
    modulationIndex: 2,
    envelope: { attack: 3, decay: 1, sustain: 0.6, release: 5 },
    volume: -30,
  }).connect(reverb)
  const chords = [
    ['C3', 'G3', 'D4', 'E4'],
    ['A2', 'E3', 'B3', 'C4'],
    ['F2', 'C3', 'G3', 'A3'],
    ['G2', 'D3', 'A3', 'B3'],
  ]
  let i = 0
  padLoop = new Tone.Loop((time) => {
    pad?.triggerAttackRelease(chords[i++ % chords.length], '2m', time)
  }, '2m')
  Tone.getTransport().bpm.value = 64
}

export async function setSound(on: boolean) {
  enabled = on
  if (on) {
    loading ??= boot()
    await loading
    if (!enabled || !Tone) return
    Tone.getDestination().mute = false
    padLoop?.start(0)
    Tone.getTransport().start()
  } else if (Tone) {
    Tone.getTransport().stop()
    padLoop?.stop()
    pad?.releaseAll()
    Tone.getDestination().mute = true
  }
}

let lastTick = 0
/** A soft pentatonic tick for hovers. `i` picks the note so lists play little melodies. */
export function playTick(i = Math.floor(Math.random() * scale.length)) {
  if (!enabled || !tick || !Tone) return
  const now = Tone.now()
  if (now - lastTick < 0.045) return
  lastTick = now
  tick.triggerAttackRelease(scale[((i % scale.length) + scale.length) % scale.length], '32n', now)
}

/** A brighter two-note pluck for clicks and confirmations. */
export function playPluck() {
  if (!enabled || !pluck || !Tone) return
  pluck.triggerAttackRelease(['E5', 'B5'], '16n', Tone.now())
}

/** Filtered noise for curtains and page transitions. */
export function playWhoosh() {
  if (!enabled || !noise || !Tone) return
  noise.triggerAttackRelease('2n', Tone.now())
}
