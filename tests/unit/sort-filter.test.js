import { describe, it, expect } from 'vitest'
import { sortAndFilterWines } from '../../src/utils.js'

// Fixture set: 5 wines with varied types, producers, vintages, and insertion order
const WINES = [
  { id: '1', createdAt: 1000, producer: 'Chateau Margaux', wineType: 'Red',      vintage: '2010', appellation: 'Bordeaux',      varietal: 'Cab Blend',  quantity: 1 },
  { id: '2', createdAt: 2000, producer: 'DRC',             wineType: 'Red',      vintage: '2019', appellation: 'Burgundy',      varietal: 'Pinot Noir', quantity: 1 },
  { id: '3', createdAt: 3000, producer: 'Kosta Browne',    wineType: 'Red',      vintage: '2021', appellation: 'Sonoma Coast',  varietal: 'Pinot Noir', quantity: 1 },
  { id: '4', createdAt: 4000, producer: 'Domaine Leflaive', wineType: 'White',   vintage: '2018', appellation: 'Burgundy',      varietal: 'Chardonnay', quantity: 1 },
  { id: '5', createdAt: 5000, producer: 'Schramsberg',     wineType: 'Sparkling', vintage: 'NV',  appellation: 'North Coast',   varietal: 'Blanc de Blancs', quantity: 2 },
]

// ── Default (newest first, no filter) ─────────────────────────────────────────
describe('default — newest first, no filter', () => {
  it('reverses insertion order', () => {
    const result = sortAndFilterWines(WINES)
    expect(result.map(w => w.id)).toEqual(['5', '4', '3', '2', '1'])
  })

  it('does not mutate the original array', () => {
    const copy = [...WINES]
    sortAndFilterWines(WINES)
    expect(WINES).toEqual(copy)
  })

  it('returns all wines when no filter is set', () => {
    expect(sortAndFilterWines(WINES)).toHaveLength(5)
  })
})

// ── Filter by wine type ───────────────────────────────────────────────────────
describe('filterType', () => {
  it('returns only Red wines', () => {
    const result = sortAndFilterWines(WINES, { filterType: 'Red' })
    expect(result).toHaveLength(3)
    expect(result.every(w => w.wineType === 'Red')).toBe(true)
  })

  it('returns only White wines', () => {
    const result = sortAndFilterWines(WINES, { filterType: 'White' })
    expect(result).toHaveLength(1)
    expect(result[0].producer).toBe('Domaine Leflaive')
  })

  it('returns only Sparkling wines', () => {
    const result = sortAndFilterWines(WINES, { filterType: 'Sparkling' })
    expect(result).toHaveLength(1)
    expect(result[0].producer).toBe('Schramsberg')
  })

  it('returns empty array when no wines match the filter', () => {
    const result = sortAndFilterWines(WINES, { filterType: 'Rosé' })
    expect(result).toHaveLength(0)
  })

  it('null filterType returns all wines', () => {
    expect(sortAndFilterWines(WINES, { filterType: null })).toHaveLength(5)
  })
})

// ── Sort modes ────────────────────────────────────────────────────────────────
describe('sortBy: oldest', () => {
  it('returns wines in insertion order', () => {
    const result = sortAndFilterWines(WINES, { sortBy: 'oldest' })
    expect(result.map(w => w.id)).toEqual(['1', '2', '3', '4', '5'])
  })
})

describe('sortBy: producer-az', () => {
  it('sorts producers alphabetically A→Z', () => {
    const result = sortAndFilterWines(WINES, { sortBy: 'producer-az' })
    const names = result.map(w => w.producer)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })
})

describe('sortBy: producer-za', () => {
  it('sorts producers alphabetically Z→A', () => {
    const result = sortAndFilterWines(WINES, { sortBy: 'producer-za' })
    const names = result.map(w => w.producer)
    expect(names).toEqual([...names].sort((a, b) => b.localeCompare(a)))
  })
})

describe('sortBy: vintage-desc', () => {
  it('puts newest vintages first', () => {
    const result = sortAndFilterWines(WINES, { sortBy: 'vintage-desc' })
    const vintages = result.map(w => parseInt(w.vintage) || 0)
    for (let i = 0; i < vintages.length - 1; i++) {
      expect(vintages[i]).toBeGreaterThanOrEqual(vintages[i + 1])
    }
  })

  it('NV and null vintages sink to the bottom', () => {
    const result = sortAndFilterWines(WINES, { sortBy: 'vintage-desc' })
    const last = result[result.length - 1]
    expect(last.producer).toBe('Schramsberg') // vintage: 'NV' → 0
  })
})

// ── Combined filter + sort ────────────────────────────────────────────────────
describe('combined filter + sort', () => {
  it('filters to Red then sorts A→Z', () => {
    const result = sortAndFilterWines(WINES, { filterType: 'Red', sortBy: 'producer-az' })
    expect(result).toHaveLength(3)
    const names = result.map(w => w.producer)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })

  it('filters to Red then sorts by vintage desc', () => {
    const result = sortAndFilterWines(WINES, { filterType: 'Red', sortBy: 'vintage-desc' })
    expect(result).toHaveLength(3)
    expect(result[0].vintage).toBe('2021')
    expect(result[1].vintage).toBe('2019')
    expect(result[2].vintage).toBe('2010')
  })
})

// ── Vintage in formatCardData ─────────────────────────────────────────────────
import { formatCardData } from '../../src/utils.js'

describe('formatCardData — vintage', () => {
  it('returns vintage string when present', () => {
    expect(formatCardData({ vintage: '2019' }).vintage).toBe('2019')
  })

  it('returns NV string as-is', () => {
    expect(formatCardData({ vintage: 'NV' }).vintage).toBe('NV')
  })

  it('returns empty string when vintage is null', () => {
    expect(formatCardData({ vintage: null }).vintage).toBe('')
  })
})

// ── Vintage duplicate detection ───────────────────────────────────────────────
import { saveWine, loadWines } from '../../src/store.js'

const BASE = { producer: 'Ridge', varietal: 'Zinfandel', appellation: 'Sonoma', vineyard: 'Lytton Springs', quantity: 1 }

describe('vintage in duplicate detection', () => {
  it('same wine + same vintage = duplicate (increments quantity)', () => {
    saveWine({ ...BASE, vintage: '2019' })
    const result = saveWine({ ...BASE, vintage: '2019' })
    expect(result.action).toBe('updated')
    expect(loadWines()).toHaveLength(1)
  })

  it('same wine + different vintage = separate entry', () => {
    saveWine({ ...BASE, vintage: '2019' })
    const result = saveWine({ ...BASE, vintage: '2021' })
    expect(result.action).toBe('added')
    expect(loadWines()).toHaveLength(2)
  })

  it('same wine + one has vintage, other has null = separate entries', () => {
    saveWine({ ...BASE, vintage: '2019' })
    const result = saveWine({ ...BASE, vintage: null })
    expect(result.action).toBe('added')
    expect(loadWines()).toHaveLength(2)
  })

  it('same wine + both have null vintage = duplicate', () => {
    saveWine({ ...BASE, vintage: null })
    const result = saveWine({ ...BASE, vintage: null })
    expect(result.action).toBe('updated')
    expect(loadWines()).toHaveLength(1)
  })
})
