import { vi, beforeEach, afterEach } from 'vitest'

// jsdom's localStorage.clear() is unreliable across Vitest versions.
// A simple in-memory mock is faster and more predictable.
function makeLocalStorage() {
  let store = {}
  return {
    getItem: (key) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (i) => Object.keys(store)[i] ?? null
  }
}

const mockStorage = makeLocalStorage()

beforeEach(() => {
  mockStorage.clear()
  vi.stubGlobal('localStorage', mockStorage)
})

afterEach(() => {
  vi.unstubAllGlobals()
})
