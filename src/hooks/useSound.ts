let context: AudioContext | null = null

type Sound = 'correct' | 'incorrect' | 'complete' | 'xp' | 'rank' | 'achievement' | 'tick'

const tones: Record<Sound, { freqs: number[]; duration: number; gain: number }> = {
  correct: { freqs: [660, 880], duration: 0.09, gain: 0.045 },
  incorrect: { freqs: [220, 185], duration: 0.12, gain: 0.04 },
  complete: { freqs: [523, 659, 784], duration: 0.13, gain: 0.05 },
  xp: { freqs: [740], duration: 0.07, gain: 0.03 },
  rank: { freqs: [523, 659, 784, 1046], duration: 0.15, gain: 0.05 },
  achievement: { freqs: [587, 784, 988], duration: 0.14, gain: 0.045 },
  tick: { freqs: [420], duration: 0.035, gain: 0.02 },
}

export function playSound(sound: Sound, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    if (!context) context = new Ctx()
    if (context.state === 'suspended') void context.resume()
    const spec = tones[sound]
    spec.freqs.forEach((frequency, index) => {
      const oscillator = context!.createOscillator()
      const gain = context!.createGain()
      const start = context!.currentTime + index * spec.duration * 0.75
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, start)
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(spec.gain, start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.duration)
      oscillator.connect(gain).connect(context!.destination)
      oscillator.start(start)
      oscillator.stop(start + spec.duration + 0.02)
    })
  } catch {
    // Audio is optional and must never break the learning flow.
  }
}

export function haptic(pattern: number | number[] = 12): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
  } catch {
    // ignore
  }
}
