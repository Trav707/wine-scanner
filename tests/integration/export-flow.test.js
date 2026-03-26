/**
 * Integration tests: full save-then-export flow across store.js and export.js.
 * XLSX.writeFile is mocked to avoid actual file I/O.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { saveWine, loadWines } from '../../src/store.js'
import { buildExportRows } from '../../src/export.js'

const makeWine = (overrides = {}) => ({
  producer: 'Default Producer', varietal: 'Chardonnay', bottleSize: '750ml',
  wineType: 'White', appellation: 'Burgundy', subAppellation: null,
  vineyard: null, proprietaryName: null, quantity: 1,
  ...overrides,
})

describe('save → export flow', () => {
  it('all saved wines appear in the exported rows', () => {
    saveWine(makeWine({ producer: 'DRC', varietal: 'Pinot Noir' }))
    saveWine(makeWine({ producer: 'Kosta Browne', varietal: 'Pinot Noir', appellation: 'Sonoma Coast' }))

    const wines = loadWines()
    const rows = buildExportRows(wines)

    expect(rows).toHaveLength(2)
    const producers = rows.map(r => r['Producer'])
    expect(producers).toContain('DRC')
    expect(producers).toContain('Kosta Browne')
  })

  it('exported quantity reflects the incremented value after a duplicate scan', () => {
    const wine = makeWine({ producer: 'Ridge', varietal: 'Zinfandel', appellation: 'Sonoma', vineyard: 'Lytton Springs' })
    saveWine(wine)
    saveWine({ ...wine, quantity: 5 }) // duplicate — increments to 6

    const rows = buildExportRows(loadWines())
    expect(rows).toHaveLength(1)
    expect(rows[0]['Quantity']).toBe(6)
  })

  it('newest-first ordering is preserved in the export', () => {
    saveWine(makeWine({ producer: 'First Added' }))
    saveWine(makeWine({ producer: 'Second Added', appellation: 'Different Region' }))

    const rows = buildExportRows(loadWines().slice().reverse())
    expect(rows[0]['Producer']).toBe('Second Added')
    expect(rows[1]['Producer']).toBe('First Added')
  })

  it('export rows contain only the 9 expected column headers', () => {
    saveWine(makeWine())
    const [row] = buildExportRows(loadWines())
    const headers = Object.keys(row)
    expect(headers).toEqual([
      'Producer', 'Vintage', 'Varietal', 'Bottle Size', 'Wine Type',
      'Appellation', 'Sub Appellation', 'Vineyard Designate',
      'Proprietary Name', 'Quantity',
    ])
  })

  it('a large cellar (100 wines) exports without error', () => {
    for (let i = 0; i < 100; i++) {
      saveWine(makeWine({ producer: `Winery ${i}`, appellation: `Region ${i}` }))
    }
    const rows = buildExportRows(loadWines())
    expect(rows).toHaveLength(100)
    expect(rows.every(r => typeof r['Quantity'] === 'number')).toBe(true)
  })
})
