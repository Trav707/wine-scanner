import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildExportRows, exportToXlsx } from '../../src/export.js'

const SAMPLE_WINES = [
  {
    id: '1', createdAt: 1000,
    producer: 'Ridge Vineyards', varietal: 'Zinfandel', bottleSize: '750ml',
    wineType: 'Red', appellation: 'Sonoma County', subAppellation: 'Dry Creek Valley',
    vineyard: 'Lytton Springs', proprietaryName: null, quantity: 3,
  },
  {
    id: '2', createdAt: 2000,
    producer: 'Robert Mondavi', varietal: 'Cabernet Sauvignon', bottleSize: '1.5L',
    wineType: 'Red', appellation: 'Napa Valley', subAppellation: null,
    vineyard: 'To Kalon Vineyard', proprietaryName: 'Opus One', quantity: 1,
  },
]

// ── buildExportRows ───────────────────────────────────────────────────────────
describe('buildExportRows', () => {
  it('produces one row per wine', () => {
    expect(buildExportRows(SAMPLE_WINES)).toHaveLength(2)
  })

  it('maps every field to the correct column header', () => {
    const [row] = buildExportRows([SAMPLE_WINES[0]])
    expect(row['Producer']).toBe('Ridge Vineyards')
    expect(row['Varietal']).toBe('Zinfandel')
    expect(row['Bottle Size']).toBe('750ml')
    expect(row['Wine Type']).toBe('Red')
    expect(row['Appellation']).toBe('Sonoma County')
    expect(row['Sub Appellation']).toBe('Dry Creek Valley')
    expect(row['Vineyard Designate']).toBe('Lytton Springs')
    expect(row['Proprietary Name']).toBe('')   // null → empty string
    expect(row['Quantity']).toBe(3)
  })

  it('converts quantity to a number, not a string', () => {
    const [row] = buildExportRows([{ ...SAMPLE_WINES[0], quantity: '6' }])
    expect(typeof row['Quantity']).toBe('number')
    expect(row['Quantity']).toBe(6)
  })

  it('defaults quantity to 1 when missing or non-numeric', () => {
    const [row] = buildExportRows([{ ...SAMPLE_WINES[0], quantity: null }])
    expect(row['Quantity']).toBe(1)
  })

  it('converts null string fields to empty strings', () => {
    const wine = { ...SAMPLE_WINES[0], subAppellation: null, vineyard: null, proprietaryName: null }
    const [row] = buildExportRows([wine])
    expect(row['Sub Appellation']).toBe('')
    expect(row['Vineyard Designate']).toBe('')
    expect(row['Proprietary Name']).toBe('')
  })

  it('returns an empty array for an empty wine list', () => {
    expect(buildExportRows([])).toEqual([])
  })

  it('does not include internal fields (id, createdAt) in the row', () => {
    const [row] = buildExportRows([SAMPLE_WINES[0]])
    expect(row).not.toHaveProperty('id')
    expect(row).not.toHaveProperty('createdAt')
  })

  it('produces rows with exactly 10 columns (includes Vintage)', () => {
    const [row] = buildExportRows([SAMPLE_WINES[0]])
    expect(Object.keys(row)).toHaveLength(10)
  })

  it('preserves special characters in wine names', () => {
    const wine = { ...SAMPLE_WINES[0], producer: "Stag's Leap & Co. <Winery>" }
    const [row] = buildExportRows([wine])
    expect(row['Producer']).toBe("Stag's Leap & Co. <Winery>")
  })

  it('handles unicode characters (e.g. Rosé)', () => {
    const wine = { ...SAMPLE_WINES[0], wineType: 'Rosé', varietal: 'Grenache Rosé' }
    const [row] = buildExportRows([wine])
    expect(row['Wine Type']).toBe('Rosé')
    expect(row['Varietal']).toBe('Grenache Rosé')
  })
})

// ── exportToXlsx ──────────────────────────────────────────────────────────────
describe('exportToXlsx', () => {
  beforeEach(() => {
    // Mock XLSX.writeFile so no actual file is written during tests
    vi.mock('xlsx', async (importOriginal) => {
      const actual = await importOriginal()
      return {
        ...actual,
        writeFile: vi.fn(),
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when given an empty array', () => {
    expect(() => exportToXlsx([])).toThrow('No wines to export.')
  })

  it('throws when given null', () => {
    expect(() => exportToXlsx(null)).toThrow('No wines to export.')
  })

  it('returns a filename with today\'s date and .xlsx extension', () => {
    const filename = exportToXlsx(SAMPLE_WINES)
    const today = new Date().toISOString().slice(0, 10)
    expect(filename).toBe(`wine-cellar-${today}.xlsx`)
  })
})
