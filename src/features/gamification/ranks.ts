export interface Rank {
  name: string
  minXp: number
  descriptor: string
}

export const ranks: Rank[] = [
  { name: 'Ground Trainee', minXp: 0, descriptor: 'Your mental engine is warming up.' },
  { name: 'Cadet', minXp: 150, descriptor: 'Clear for the first stage of training.' },
  { name: 'Junior Cadet', minXp: 400, descriptor: 'The basics are becoming instinct.' },
  { name: 'Flight Trainee', minXp: 800, descriptor: 'You are thinking several steps ahead.' },
  { name: 'First Officer', minXp: 1500, descriptor: 'Calm, quick and consistently accurate.' },
  { name: 'Captain', minXp: 2600, descriptor: 'You own the calculation.' },
  { name: 'Ace', minXp: 4200, descriptor: 'Exceptional speed with precision.' },
  { name: 'Elite Aviator', minXp: 6500, descriptor: 'The cockpit of the mind is yours.' },
]

export function rankFor(xp: number): Rank {
  let rank = ranks[0]
  for (const candidate of ranks) if (xp >= candidate.minXp) rank = candidate
  return rank
}

export function nextRank(xp: number): Rank | null {
  return ranks.find((rank) => rank.minXp > xp) ?? null
}

export function rankProgress(xp: number): { current: Rank; next: Rank | null; progress: number; remaining: number } {
  const current = rankFor(xp)
  const next = nextRank(xp)
  if (!next) return { current, next, progress: 1, remaining: 0 }
  const span = next.minXp - current.minXp
  return { current, next, progress: Math.min(1, (xp - current.minXp) / span), remaining: next.minXp - xp }
}
