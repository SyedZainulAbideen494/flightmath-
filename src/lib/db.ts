import Dexie, { type Table } from 'dexie'
import type { AppData } from './types'

interface MetaRecord {
  key: string
  value: unknown
}

class FlightMathDB extends Dexie {
  meta!: Table<MetaRecord, string>

  constructor() {
    super('flightmath')
    this.version(1).stores({ meta: 'key' })
  }
}

export const db = new FlightMathDB()

const FALLBACK_KEY = 'flightmath:data'

function localGet(): AppData | null {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY)
    return raw ? (JSON.parse(raw) as AppData) : null
  } catch {
    return null
  }
}

function localSet(data: AppData): void {
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(data))
  } catch {
    // Storage can be unavailable in private contexts; the in-memory store still works.
  }
}

export async function loadData(): Promise<AppData | null> {
  try {
    const record = await db.meta.get('app-data')
    if (record?.value) return record.value as AppData
  } catch {
    // Fall through to localStorage.
  }
  if (typeof window !== 'undefined') return localGet()
  return null
}

export async function saveData(data: AppData): Promise<void> {
  localSet(data)
  try {
    await db.meta.put({ key: 'app-data', value: data })
  } catch {
    // IndexedDB unavailable — localStorage copy remains.
  }
}

export async function clearData(): Promise<void> {
  try {
    await db.meta.delete('app-data')
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined') localStorage.removeItem(FALLBACK_KEY)
}
