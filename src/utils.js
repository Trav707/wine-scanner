// Pure display helpers — no DOM, no side effects, fully unit-testable.

export const WINE_TYPE_COLORS = {
  'Red':       'bg-red-100 text-red-800',
  'White':     'bg-yellow-50 text-yellow-700 border border-yellow-200',
  'Rosé':      'bg-pink-100 text-pink-800',
  'Sparkling': 'bg-blue-50 text-blue-700 border border-blue-200',
  'Dessert':   'bg-orange-100 text-orange-800',
  'Orange':    'bg-orange-200 text-orange-900',
}

const DEFAULT_TYPE_COLOR = 'bg-gray-100 text-gray-600'

export function wineTypeColor(type) {
  return WINE_TYPE_COLORS[type] ?? DEFAULT_TYPE_COLOR
}

/**
 * Maps a raw wine record to the strings needed to render a cellar card.
 * All fields are guaranteed to be strings (never null/undefined).
 */
export function formatCardData(wine) {
  const hasProprietaryName =
    wine.proprietaryName && wine.proprietaryName !== wine.producer

  const headline = wine.proprietaryName || wine.producer || 'Unknown Wine'

  const sublineParts = []
  if (hasProprietaryName && wine.producer) sublineParts.push(wine.producer)
  if (wine.varietal) sublineParts.push(wine.varietal)
  const subline = sublineParts.join(' · ')

  const regionParts = [wine.appellation, wine.subAppellation].filter(Boolean)
  const region = regionParts.join(' · ')

  return {
    headline,
    subline,
    region,
    vineyard:  wine.vineyard  || '',
    vintage:   wine.vintage   || '',
    type:      wine.wineType  || '',
    typeColor: wineTypeColor(wine.wineType),
    quantity:  Number(wine.quantity) || 1,
    bottleSize: wine.bottleSize || '750ml',
  }
}

/**
 * Filters and sorts a wines array without mutating it.
 * Used by the Cellar tab; extracted here so it's unit-testable.
 *
 * @param {object[]} wines      - raw wine records from loadWines()
 * @param {object}   options
 * @param {string|null} options.filterType - wine type to filter by, or null for all
 * @param {string}  options.sortBy         - 'newest'|'oldest'|'producer-az'|'producer-za'|'vintage-desc'
 */
export function sortAndFilterWines(wines, { filterType = null, sortBy = 'newest' } = {}) {
  let result = filterType
    ? wines.filter(w => w.wineType === filterType)
    : wines.slice()

  switch (sortBy) {
    case 'oldest':
      // loadWines() returns in insertion order (oldest first) — nothing to do
      break
    case 'newest':
      result.reverse()
      break
    case 'producer-az':
      result.sort((a, b) => (a.producer || '').localeCompare(b.producer || ''))
      break
    case 'producer-za':
      result.sort((a, b) => (b.producer || '').localeCompare(a.producer || ''))
      break
    case 'vintage-desc':
      result.sort((a, b) => {
        const va = parseInt(a.vintage) || 0
        const vb = parseInt(b.vintage) || 0
        return vb - va   // newest vintage first; NV / null wines sink to the bottom
      })
      break
    default:
      result.reverse() // fallback to newest
  }

  return result
}
