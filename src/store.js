const WINES_KEY = 'wine_cellar_v1'
const API_KEY_KEY = 'gemini_api_key'

// --- API Key ---

export function getApiKey() {
  return localStorage.getItem(API_KEY_KEY) || ''
}

export function saveApiKey(key) {
  localStorage.setItem(API_KEY_KEY, key.trim())
}

// --- Wine CRUD ---

export function loadWines() {
  try {
    return JSON.parse(localStorage.getItem(WINES_KEY) || '[]')
  } catch {
    return []
  }
}

function persistWines(wines) {
  localStorage.setItem(WINES_KEY, JSON.stringify(wines))
}

function normalize(str) {
  return (str || '').toLowerCase().trim()
}

// Two wines are duplicates if producer + varietal + appellation + vineyard + vintage all match.
// Vintage is included so a 2019 and 2021 of the same wine are treated as distinct bottles.
function isDuplicate(existing, incoming) {
  return (
    normalize(existing.producer) === normalize(incoming.producer) &&
    normalize(existing.varietal) === normalize(incoming.varietal) &&
    normalize(existing.appellation) === normalize(incoming.appellation) &&
    normalize(existing.vineyard) === normalize(incoming.vineyard) &&
    normalize(existing.vintage) === normalize(incoming.vintage)
  )
}

export function saveWine(wine) {
  const wines = loadWines()
  const dupIndex = wines.findIndex(w => isDuplicate(w, wine))

  if (dupIndex !== -1) {
    wines[dupIndex].quantity = (Number(wines[dupIndex].quantity) || 1) + (Number(wine.quantity) || 1)
    persistWines(wines)
    return { action: 'updated', wine: wines[dupIndex] }
  }

  const newWine = { ...wine, quantity: Number(wine.quantity) || 1, id: crypto.randomUUID(), createdAt: Date.now() }
  wines.push(newWine)
  persistWines(wines)
  return { action: 'added', wine: newWine }
}

export function updateWine(id, changes) {
  const wines = loadWines()
  const idx = wines.findIndex(w => w.id === id)
  if (idx === -1) throw new Error(`Wine not found: ${id}`)
  wines[idx] = { ...wines[idx], ...changes }
  persistWines(wines)
  return wines[idx]
}

export function deleteWine(id) {
  persistWines(loadWines().filter(w => w.id !== id))
}
