/**
 * Integration tests: edit and delete flows across store.js.
 * These test the real store operations that main.js coordinates.
 */
import { describe, it, expect } from 'vitest'
import { saveWine, updateWine, deleteWine, loadWines } from '../../src/store.js'

const WINE_A = {
  producer: "Stag's Leap Wine Cellars", varietal: 'Cabernet Sauvignon',
  bottleSize: '750ml', wineType: 'Red', appellation: 'Napa Valley',
  subAppellation: "Stags Leap District", vineyard: 'S.L.V.',
  proprietaryName: null, quantity: 1,
}

const WINE_B = {
  producer: 'Kosta Browne', varietal: 'Pinot Noir',
  bottleSize: '750ml', wineType: 'Red', appellation: 'Sonoma Coast',
  subAppellation: null, vineyard: null,
  proprietaryName: null, quantity: 2,
}

// ── Edit flow ─────────────────────────────────────────────────────────────────
describe('edit flow', () => {
  it('updating preserves id and createdAt', () => {
    const { wine } = saveWine(WINE_A)
    const { id, createdAt } = wine

    const updated = updateWine(id, { varietal: 'Merlot', quantity: 3 })

    expect(updated.id).toBe(id)
    expect(updated.createdAt).toBe(createdAt)
  })

  it('updated fields are reflected in loadWines()', () => {
    const { wine } = saveWine(WINE_A)
    updateWine(wine.id, { varietal: 'Merlot', appellation: 'Sonoma County' })

    const saved = loadWines().find(w => w.id === wine.id)
    expect(saved.varietal).toBe('Merlot')
    expect(saved.appellation).toBe('Sonoma County')
    expect(saved.producer).toBe(WINE_A.producer) // unchanged
  })

  it('manually adjusting quantity works', () => {
    const { wine } = saveWine(WINE_A)
    const updated = updateWine(wine.id, { quantity: 12 })
    expect(updated.quantity).toBe(12)
    expect(loadWines().find(w => w.id === wine.id).quantity).toBe(12)
  })

  it('editing one wine does not affect others', () => {
    const { wine: wA } = saveWine(WINE_A)
    const { wine: wB } = saveWine(WINE_B)

    updateWine(wA.id, { varietal: 'Changed' })

    const bAfter = loadWines().find(w => w.id === wB.id)
    expect(bAfter.varietal).toBe(WINE_B.varietal)
    expect(bAfter.producer).toBe(WINE_B.producer)
  })

  it('newest-first ordering: most recently added appears first when reversed', () => {
    saveWine(WINE_A)
    saveWine(WINE_B)

    const newestFirst = loadWines().slice().reverse()
    expect(newestFirst[0].producer).toBe(WINE_B.producer)
    expect(newestFirst[1].producer).toBe(WINE_A.producer)
  })
})

// ── Delete flow ───────────────────────────────────────────────────────────────
describe('delete flow', () => {
  it('deleted wine is removed and others remain intact', () => {
    const { wine: wA } = saveWine(WINE_A)
    const { wine: wB } = saveWine(WINE_B)

    deleteWine(wA.id)

    const remaining = loadWines()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(wB.id)
    expect(remaining[0].producer).toBe(WINE_B.producer)
  })

  it('cellar is empty after deleting the only wine', () => {
    const { wine } = saveWine(WINE_A)
    deleteWine(wine.id)
    expect(loadWines()).toHaveLength(0)
  })

  it('deleting a wine then re-adding the same wine creates a fresh entry', () => {
    const { wine } = saveWine(WINE_A)
    deleteWine(wine.id)

    const { wine: reAdded, action } = saveWine(WINE_A)
    expect(action).toBe('added')
    expect(reAdded.id).not.toBe(wine.id)
    expect(loadWines()).toHaveLength(1)
  })

  it('deleting then editing remaining wine works correctly', () => {
    const { wine: wA } = saveWine(WINE_A)
    const { wine: wB } = saveWine(WINE_B)

    deleteWine(wA.id)
    updateWine(wB.id, { quantity: 5 })

    const wines = loadWines()
    expect(wines).toHaveLength(1)
    expect(wines[0].quantity).toBe(5)
  })
})
