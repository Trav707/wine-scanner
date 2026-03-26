const WINES_KEY         = 'wine_cellar_v1'   // legacy key — used by the 'default' cellar
const API_KEY_KEY       = 'gemini_api_key'
const CELLARS_KEY       = 'wine_cellars'
const ACTIVE_CELLAR_KEY = 'active_cellar'

// --- API Key ---

export function getApiKey() {
  return localStorage.getItem(API_KEY_KEY) || ''
}

export function saveApiKey(key) {
  localStorage.setItem(API_KEY_KEY, key.trim())
}

// --- Cellar management ---

export function loadCellars() {
  try {
    return JSON.parse(localStorage.getItem(CELLARS_KEY)) || [{ id: 'default', name: 'My Cellar' }]
  } catch {
    return [{ id: 'default', name: 'My Cellar' }]
  }
}

export function addCellar(name) {
  const cellars = loadCellars()
  const id = 'c_' + Date.now()
  cellars.push({ id, name: name.trim() })
  localStorage.setItem(CELLARS_KEY, JSON.stringify(cellars))
  return id
}

export function deleteCellar(id) {
  let cellars = loadCellars()
  if (cellars.length <= 1) return false
  cellars = cellars.filter(c => c.id !== id)
  localStorage.setItem(CELLARS_KEY, JSON.stringify(cellars))
  localStorage.removeItem(getCellarKey(id))
  return true
}

export function getActiveCellarId() {
  return localStorage.getItem(ACTIVE_CELLAR_KEY) || 'default'
}

export function setActiveCellarId(id) {
  localStorage.setItem(ACTIVE_CELLAR_KEY, id)
}

// --- Internal helpers ---

function getCellarKey(id) {
  return id === 'default' ? WINES_KEY : 'wine_cellar_' + id
}

function activeKey() {
  return getCellarKey(getActiveCellarId())
}

// --- Wine CRUD ---

export function loadWines() {
  try {
    return JSON.parse(localStorage.getItem(activeKey()) || '[]')
  } catch {
    return []
  }
}

function persistWines(wines) {
  localStorage.setItem(activeKey(), JSON.stringify(wines))
}

function normalize(str) {
  return (str || '').toLowerCase().trim()
}

// Two wines are duplicates if producer + varietal + appellation + vineyard + vintage all match.
function isDuplicate(existing, incoming) {
  return (
    normalize(existing.producer)    === normalize(incoming.producer)    &&
    normalize(existing.varietal)    === normalize(incoming.varietal)    &&
    normalize(existing.appellation) === normalize(incoming.appellation) &&
    normalize(existing.vineyard)    === normalize(incoming.vineyard)    &&
    normalize(existing.vintage)     === normalize(incoming.vintage)
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
