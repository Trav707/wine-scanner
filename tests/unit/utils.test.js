import { describe, it, expect } from 'vitest'
import { formatCardData, wineTypeColor, WINE_TYPE_COLORS } from '../../src/utils.js'

// ── wineTypeColor ─────────────────────────────────────────────────────────────
describe('wineTypeColor', () => {
  it('returns the correct class for each known type', () => {
    for (const [type, cls] of Object.entries(WINE_TYPE_COLORS)) {
      expect(wineTypeColor(type)).toBe(cls)
    }
  })

  it('returns a fallback class for an unknown type', () => {
    expect(wineTypeColor('Mead')).toBe('bg-gray-100 text-gray-600')
    expect(wineTypeColor(undefined)).toBe('bg-gray-100 text-gray-600')
    expect(wineTypeColor(null)).toBe('bg-gray-100 text-gray-600')
  })
})

// ── formatCardData — headline ─────────────────────────────────────────────────
describe('formatCardData — headline', () => {
  it('uses proprietaryName as headline when present', () => {
    const d = formatCardData({ producer: 'Robert Mondavi', proprietaryName: 'Opus One' })
    expect(d.headline).toBe('Opus One')
  })

  it('falls back to producer when proprietaryName is null', () => {
    const d = formatCardData({ producer: 'Ridge Vineyards', proprietaryName: null })
    expect(d.headline).toBe('Ridge Vineyards')
  })

  it('falls back to "Unknown Wine" when both are missing', () => {
    const d = formatCardData({})
    expect(d.headline).toBe('Unknown Wine')
  })
})

// ── formatCardData — subline ──────────────────────────────────────────────────
describe('formatCardData — subline', () => {
  it('shows producer · varietal when a proprietary name is present', () => {
    const d = formatCardData({
      producer: 'Robert Mondavi',
      proprietaryName: 'Opus One',
      varietal: 'Bordeaux Blend',
    })
    expect(d.subline).toBe('Robert Mondavi · Bordeaux Blend')
  })

  it('shows only varietal when headline equals producer (no proprietary name)', () => {
    const d = formatCardData({
      producer: 'Ridge Vineyards',
      proprietaryName: null,
      varietal: 'Zinfandel',
    })
    expect(d.subline).toBe('Zinfandel')
  })

  it('omits producer from subline when proprietaryName === producer', () => {
    const d = formatCardData({
      producer: 'Screaming Eagle',
      proprietaryName: 'Screaming Eagle',
      varietal: 'Cabernet Sauvignon',
    })
    // proprietaryName is the headline; producer would be redundant in subline
    expect(d.subline).toBe('Cabernet Sauvignon')
  })

  it('is empty string when no varietal and no separate proprietary name', () => {
    const d = formatCardData({ producer: 'DRC', proprietaryName: null, varietal: null })
    expect(d.subline).toBe('')
  })
})

// ── formatCardData — region ───────────────────────────────────────────────────
describe('formatCardData — region', () => {
  it('combines appellation and subAppellation with a dot separator', () => {
    const d = formatCardData({ appellation: 'Napa Valley', subAppellation: 'Rutherford' })
    expect(d.region).toBe('Napa Valley · Rutherford')
  })

  it('shows only appellation when no subAppellation', () => {
    const d = formatCardData({ appellation: 'Burgundy', subAppellation: null })
    expect(d.region).toBe('Burgundy')
  })

  it('is empty string when neither appellation field is set', () => {
    const d = formatCardData({})
    expect(d.region).toBe('')
  })
})

// ── formatCardData — quantity & bottleSize ────────────────────────────────────
describe('formatCardData — quantity and bottleSize', () => {
  it('returns numeric quantity', () => {
    expect(formatCardData({ quantity: 6 }).quantity).toBe(6)
  })

  it('defaults quantity to 1 when missing or non-numeric', () => {
    expect(formatCardData({}).quantity).toBe(1)
    expect(formatCardData({ quantity: 'abc' }).quantity).toBe(1)
  })

  it('defaults bottleSize to 750ml when missing', () => {
    expect(formatCardData({}).bottleSize).toBe('750ml')
  })

  it('passes through bottleSize as-is when present', () => {
    expect(formatCardData({ bottleSize: '1.5L' }).bottleSize).toBe('1.5L')
  })
})

// ── formatCardData — vineyard ─────────────────────────────────────────────────
describe('formatCardData — vineyard', () => {
  it('returns vineyard string when present', () => {
    expect(formatCardData({ vineyard: 'To Kalon Vineyard' }).vineyard).toBe('To Kalon Vineyard')
  })

  it('returns empty string when vineyard is null', () => {
    expect(formatCardData({ vineyard: null }).vineyard).toBe('')
  })
})
