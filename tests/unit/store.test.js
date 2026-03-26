import { describe, it, expect } from 'vitest'
import { getApiKey, saveApiKey, loadWines, saveWine, updateWine, deleteWine } from '../../src/store.js'

// ---------------------------------------------------------------------------
// API key
// ---------------------------------------------------------------------------
describe('getApiKey / saveApiKey', () => {
  it('returns empty string when nothing is stored', () => {
    expect(getApiKey()).toBe('')
  })

  it('stores and retrieves a key', () => {
    saveApiKey('AIzaTestKey')
    expect(getApiKey()).toBe('AIzaTestKey')
  })

  it('trims whitespace on save', () => {
    saveApiKey('  AIzaSpacey  ')
    expect(getApiKey()).toBe('AIzaSpacey')
  })
})

// ---------------------------------------------------------------------------
// loadWines
// ---------------------------------------------------------------------------
describe('loadWines', () => {
  it('returns empty array with no data', () => {
    expect(loadWines()).toEqual([])
  })

  it('returns wines previously persisted', () => {
    localStorage.setItem('wine_cellar_v1', JSON.stringify([{ id: '1', producer: 'DRC' }]))
    expect(loadWines()).toHaveLength(1)
    expect(loadWines()[0].producer).toBe('DRC')
  })

  it('returns empty array on corrupted JSON', () => {
    localStorage.setItem('wine_cellar_v1', '{{not-json}}')
    expect(loadWines()).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// saveWine
// ---------------------------------------------------------------------------
describe('saveWine', () => {
  const base = {
    producer: "Stag's Leap Wine Cellars",
    varietal: 'Cabernet Sauvignon',
    bottleSize: '750ml',
    wineType: 'Red',
    appellation: 'Napa Valley',
    subAppellation: 'Stags Leap District',
    vineyard: 'S.L.V.',
    proprietaryName: null,
    quantity: 1
  }

  it('adds a new wine and returns action:added', () => {
    const result = saveWine(base)
    expect(result.action).toBe('added')
    expect(result.wine.id).toBeDefined()
    expect(result.wine.createdAt).toBeGreaterThan(0)
    expect(loadWines()).toHaveLength(1)
  })

  it('detects exact duplicate and increments quantity', () => {
    saveWine(base)
    const result = saveWine({ ...base, quantity: 2 })
    expect(result.action).toBe('updated')
    expect(result.wine.quantity).toBe(3)
    expect(loadWines()).toHaveLength(1)
  })

  it('duplicate match is case-insensitive', () => {
    saveWine(base)
    const result = saveWine({ ...base, producer: "STAG'S LEAP WINE CELLARS", varietal: 'CABERNET SAUVIGNON' })
    expect(result.action).toBe('updated')
    expect(loadWines()).toHaveLength(1)
  })

  it('duplicate match trims surrounding whitespace', () => {
    saveWine(base)
    const result = saveWine({ ...base, producer: "  Stag's Leap Wine Cellars  " })
    expect(result.action).toBe('updated')
  })

  it('different appellation = distinct wine', () => {
    saveWine(base)
    saveWine({ ...base, appellation: 'Sonoma County' })
    expect(loadWines()).toHaveLength(2)
  })

  it('different vineyard = distinct wine', () => {
    saveWine(base)
    saveWine({ ...base, vineyard: 'Fay Vineyard' })
    expect(loadWines()).toHaveLength(2)
  })

  it('different varietal = distinct wine', () => {
    saveWine(base)
    saveWine({ ...base, varietal: 'Merlot' })
    expect(loadWines()).toHaveLength(2)
  })

  it('null vineyard fields match each other', () => {
    const noVineyard = { ...base, vineyard: null }
    saveWine(noVineyard)
    const result = saveWine(noVineyard)
    expect(result.action).toBe('updated')
  })

  it('quantity defaults to 1 when not a number', () => {
    const result = saveWine({ ...base, quantity: 'abc' })
    expect(result.wine.quantity).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// updateWine
// ---------------------------------------------------------------------------
describe('updateWine', () => {
  it('updates specified fields and preserves others', () => {
    const { wine } = saveWine({ producer: 'DRC', varietal: 'Pinot Noir', appellation: 'Burgundy', vineyard: null, quantity: 1 })
    const updated = updateWine(wine.id, { varietal: 'Chardonnay', quantity: 3 })
    expect(updated.varietal).toBe('Chardonnay')
    expect(updated.quantity).toBe(3)
    expect(updated.producer).toBe('DRC')
  })

  it('persists the update to localStorage', () => {
    const { wine } = saveWine({ producer: 'Test', varietal: 'X', appellation: null, vineyard: null, quantity: 1 })
    updateWine(wine.id, { producer: 'Updated' })
    expect(loadWines()[0].producer).toBe('Updated')
  })

  it('throws if wine id is not found', () => {
    expect(() => updateWine('nonexistent-uuid', {})).toThrow('Wine not found')
  })
})

// ---------------------------------------------------------------------------
// deleteWine
// ---------------------------------------------------------------------------
describe('deleteWine', () => {
  it('removes only the specified wine', () => {
    const { wine: w1 } = saveWine({ producer: 'A', varietal: 'X', appellation: null, vineyard: null, quantity: 1 })
    const { wine: w2 } = saveWine({ producer: 'B', varietal: 'Y', appellation: null, vineyard: null, quantity: 1 })

    deleteWine(w1.id)

    const wines = loadWines()
    expect(wines).toHaveLength(1)
    expect(wines[0].id).toBe(w2.id)
  })

  it('is a no-op for an unknown id', () => {
    saveWine({ producer: 'A', varietal: 'X', appellation: null, vineyard: null, quantity: 1 })
    deleteWine('unknown-id')
    expect(loadWines()).toHaveLength(1)
  })
})
