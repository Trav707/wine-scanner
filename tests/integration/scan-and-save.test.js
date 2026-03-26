/**
 * Integration tests: end-to-end flow across gemini.js and store.js.
 * Gemini's HTTP calls are mocked — everything else is real module code.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { extractWineLabel } from '../../src/gemini.js'
import { saveWine, loadWines } from '../../src/store.js'

const SCREAMING_EAGLE = {
  producer: 'Screaming Eagle',
  varietal: 'Cabernet Sauvignon',
  bottleSize: '750ml',
  wineType: 'Red',
  appellation: 'Napa Valley',
  subAppellation: 'Oakville',
  vineyard: null,
  proprietaryName: 'Screaming Eagle'
}

function mockFetch(data) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }]
    })
  }
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('scan → save flow', () => {
  it('extracts label and saves a new wine entry', async () => {
    fetch.mockResolvedValueOnce(mockFetch(SCREAMING_EAGLE))

    const file = new File(['img'], 'label.jpg', { type: 'image/jpeg' })
    const extracted = await extractWineLabel(file, 'fake-key')

    const result = saveWine({ ...extracted, quantity: 1 })

    expect(result.action).toBe('added')
    expect(result.wine.producer).toBe('Screaming Eagle')
    expect(result.wine.wineType).toBe('Red')
    expect(loadWines()).toHaveLength(1)
  })

  it('scanning the same bottle twice increments quantity to 2', async () => {
    fetch.mockResolvedValue(mockFetch(SCREAMING_EAGLE))

    const file = new File(['img'], 'label.jpg', { type: 'image/jpeg' })

    const first = await extractWineLabel(file, 'fake-key')
    saveWine({ ...first, quantity: 1 })

    const second = await extractWineLabel(file, 'fake-key')
    const result = saveWine({ ...second, quantity: 1 })

    expect(result.action).toBe('updated')
    expect(result.wine.quantity).toBe(2)
    expect(loadWines()).toHaveLength(1)
  })

  it('scanning different wines creates separate entries', async () => {
    const ridge = { ...SCREAMING_EAGLE, producer: 'Ridge Vineyards', appellation: 'Sonoma County' }

    fetch.mockResolvedValueOnce(mockFetch(SCREAMING_EAGLE))
    fetch.mockResolvedValueOnce(mockFetch(ridge))

    const file = new File(['img'], 'label.jpg', { type: 'image/jpeg' })

    const w1 = await extractWineLabel(file, 'fake-key')
    saveWine({ ...w1, quantity: 1 })

    const w2 = await extractWineLabel(file, 'fake-key')
    saveWine({ ...w2, quantity: 1 })

    expect(loadWines()).toHaveLength(2)
  })

  it('scanning 6 different bottles creates 6 separate entries', async () => {
    const file = new File(['img'], 'label.jpg', { type: 'image/jpeg' })

    for (let i = 0; i < 6; i++) {
      fetch.mockResolvedValueOnce(mockFetch({ ...SCREAMING_EAGLE, producer: `Winery ${i}` }))
      const data = await extractWineLabel(file, 'fake-key')
      saveWine({ ...data, quantity: 1 })
    }

    expect(loadWines()).toHaveLength(6)
  })
})
