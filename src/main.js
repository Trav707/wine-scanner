import { extractWineLabel } from './gemini.js'
import { getApiKey, saveApiKey, saveWine, updateWine, deleteWine, loadWines } from './store.js'
import { formatCardData, sortAndFilterWines } from './utils.js'
import { exportToXlsx } from './export.js'
import { initPwa } from './pwa.js'

// ── DOM refs ──────────────────────────────────────────────────────────────────
const scanPanel         = document.getElementById('scanPanel')
const cellarPanel       = document.getElementById('cellarPanel')
const tabScan           = document.getElementById('tabScan')
const tabCellar         = document.getElementById('tabCellar')
const cellarBadge       = document.getElementById('cellarBadge')

const cameraInput       = document.getElementById('cameraInput')
const imagePreview      = document.getElementById('imagePreview')
const wineForm          = document.getElementById('wineForm')
const saveButton        = document.getElementById('saveButton')
const loadingOverlay    = document.getElementById('loadingOverlay')

const errorBanner       = document.getElementById('errorBanner')
const errorMessage      = document.getElementById('errorMessage')
const successBanner     = document.getElementById('successBanner')
const successMessage    = document.getElementById('successMessage')

const settingsBtn       = document.getElementById('settingsBtn')
const settingsPanel     = document.getElementById('settingsPanel')
const apiKeyInput       = document.getElementById('apiKeyInput')
const saveKeyBtn        = document.getElementById('saveKeyBtn')
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn')

const editBanner        = document.getElementById('editBanner')
const editBannerName    = document.getElementById('editBannerName')
const cancelEditBtn     = document.getElementById('cancelEditBtn')

const deleteSection     = document.getElementById('deleteSection')
const deleteBtn         = document.getElementById('deleteBtn')
const deleteConfirmRow  = document.getElementById('deleteConfirmRow')
const confirmDeleteBtn  = document.getElementById('confirmDeleteBtn')
const cancelDeleteBtn   = document.getElementById('cancelDeleteBtn')

const wineList          = document.getElementById('wineList')
const cellarEmpty       = document.getElementById('cellarEmpty')
const cellarCountLabel  = document.getElementById('cellarCountLabel')
const loadMoreBtn       = document.getElementById('loadMoreBtn')
const exportBtn         = document.getElementById('exportBtn')
const filterBar         = document.getElementById('filterBar')
const sortSelect        = document.getElementById('sortSelect')
const darkModeBtn       = document.getElementById('darkModeBtn')
const iconSun           = document.getElementById('iconSun')
const iconMoon          = document.getElementById('iconMoon')

const FORM_FIELDS = [
  'producer', 'vintage', 'varietal', 'bottleSize', 'wineType',
  'appellation', 'subAppellation', 'vineyard', 'proprietaryName', 'quantity'
]

const DARK_MODE_KEY = 'dark_mode'

const PAGE_SIZE = 50

// ── State ─────────────────────────────────────────────────────────────────────
let editingId    = null   // id of wine being edited, or null for new-entry mode
let cellarPage   = 1      // how many pages of wines are currently rendered
let activeFilter = null   // wine type filter string, or null for all
let activeSort   = 'newest'

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  if (!getApiKey()) settingsPanel.classList.remove('hidden')

  cameraInput.addEventListener('change', handlePhotoCapture)
  wineForm.addEventListener('submit', handleSave)

  tabScan.addEventListener('click', () => switchTab('scan'))
  tabCellar.addEventListener('click', () => { renderCellar(); switchTab('cellar') })

  settingsBtn.addEventListener('click', toggleSettings)
  saveKeyBtn.addEventListener('click', handleSaveKey)
  cancelSettingsBtn.addEventListener('click', () => settingsPanel.classList.add('hidden'))

  cancelEditBtn.addEventListener('click', clearEditMode)
  deleteBtn.addEventListener('click', handleDeleteRequest)
  confirmDeleteBtn.addEventListener('click', handleDeleteConfirm)
  cancelDeleteBtn.addEventListener('click', handleDeleteCancel)

  loadMoreBtn.addEventListener('click', handleLoadMore)
  exportBtn.addEventListener('click', handleExport)

  // Sort / filter
  filterBar.addEventListener('click', handleFilterClick)
  sortSelect.addEventListener('change', e => { activeSort = e.target.value; renderCellar() })

  // Dark mode
  initDarkMode()
  darkModeBtn.addEventListener('click', toggleDarkMode)

  initPwa()

  updateBadge()
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(tab) {
  const onScan   = tab === 'scan'
  scanPanel.classList.toggle('hidden', !onScan)
  cellarPanel.classList.toggle('hidden', onScan)

  tabScan.classList.toggle('text-red-900', onScan)
  tabScan.classList.toggle('text-gray-400', !onScan)
  tabCellar.classList.toggle('text-red-900', !onScan)
  tabCellar.classList.toggle('text-gray-400', onScan)
}

// ── Scan / Gemini ─────────────────────────────────────────────────────────────
async function handlePhotoCapture(event) {
  const file = event.target.files[0]
  if (!file) return

  const objectURL = URL.createObjectURL(file)
  imagePreview.src = objectURL
  imagePreview.classList.remove('hidden')
  imagePreview.onload = () => URL.revokeObjectURL(objectURL)

  clearMessages()

  const apiKey = getApiKey()
  if (!apiKey) {
    settingsPanel.classList.remove('hidden')
    showError('Enter your Gemini API key first.')
    return
  }

  setLoading(true)
  try {
    const wineData = await extractWineLabel(file, apiKey)
    populateForm(wineData)
    // A new scan while in edit mode re-populates the same form —
    // saving will still update the existing record.
  } catch (err) {
    const msg = err.message || ''
    if (msg.startsWith('INVALID_KEY:')) {
      showError(msg.replace('INVALID_KEY: ', ''))
      settingsPanel.classList.remove('hidden')
    } else if (msg.startsWith('RATE_LIMIT:')) {
      showError(msg.replace('RATE_LIMIT: ', ''))
    } else {
      showError("Couldn't read the label. Error: " + (err.message || 'Unknown error'))
    }
  } finally {
    setLoading(false)
  }
}

// ── Form helpers ──────────────────────────────────────────────────────────────
function populateForm(data) {
  const map = {
    producer: data.producer, vintage: data.vintage, varietal: data.varietal,
    bottleSize: data.bottleSize, wineType: data.wineType, appellation: data.appellation,
    subAppellation: data.subAppellation, vineyard: data.vineyard,
    proprietaryName: data.proprietaryName,
  }
  for (const [id, value] of Object.entries(map)) {
    const el = document.getElementById(id)
    if (el && value != null) el.value = value
  }
}

function getFormData() {
  const wine = {}
  for (const id of FORM_FIELDS) {
    const el = document.getElementById(id)
    wine[id] = el?.value?.trim() || null
  }
  wine.quantity = Number(wine.quantity) || 1
  return wine
}

function resetForm() {
  wineForm.reset()
  document.getElementById('quantity').value = '1'
  imagePreview.classList.add('hidden')
  cameraInput.value = ''
}

// ── Save (add or update) ──────────────────────────────────────────────────────
function handleSave(event) {
  event.preventDefault()
  const wine = getFormData()

  if (editingId) {
    updateWine(editingId, wine)
    showSuccess('Wine updated.')
    clearEditMode()
  } else {
    const result = saveWine(wine)
    if (result.action === 'updated') {
      showSuccess(`Duplicate found — quantity updated to ${result.wine.quantity}.`)
    } else {
      showSuccess('Wine saved!')
    }
    resetForm()
  }

  updateBadge()
}

// ── Edit mode ─────────────────────────────────────────────────────────────────
function enterEditMode(wine) {
  editingId = wine.id
  populateForm(wine)
  document.getElementById('quantity').value = wine.quantity

  const label = wine.proprietaryName || wine.producer || 'Wine'
  editBannerName.textContent = label
  editBanner.classList.remove('hidden')
  deleteSection.classList.remove('hidden')
  deleteConfirmRow.classList.add('hidden')
  saveButton.textContent = 'Update Wine'

  clearMessages()
  switchTab('scan')
  scanPanel.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function clearEditMode() {
  editingId = null
  saveButton.textContent = 'Save Wine'
  editBanner.classList.add('hidden')
  deleteSection.classList.add('hidden')
  deleteConfirmRow.classList.add('hidden')
  resetForm()
  clearMessages()
}

// ── Delete flow ───────────────────────────────────────────────────────────────
function handleDeleteRequest() {
  deleteBtn.classList.add('hidden')
  deleteConfirmRow.classList.remove('hidden')
}

function handleDeleteConfirm() {
  if (!editingId) return
  deleteWine(editingId)
  clearEditMode()
  updateBadge()
  renderCellar()
  showSuccess('Wine deleted.')
  switchTab('cellar')
}

function handleDeleteCancel() {
  deleteConfirmRow.classList.add('hidden')
  deleteBtn.classList.remove('hidden')
}

// ── Export ────────────────────────────────────────────────────────────────────
function handleExport() {
  try {
    const wines = loadWines().slice().reverse() // newest first, matches cellar view
    const filename = exportToXlsx(wines)
    showSuccess(`Exported ${wines.length} wine${wines.length !== 1 ? 's' : ''} to ${filename}`)
  } catch (err) {
    showError(err.message)
  }
}

// ── Sort / filter ─────────────────────────────────────────────────────────────
function handleFilterClick(e) {
  const pill = e.target.closest('.filter-pill')
  if (!pill) return
  activeFilter = pill.dataset.type || null
  filterBar.querySelectorAll('.filter-pill').forEach(p => {
    const isActive = p === pill
    p.classList.toggle('bg-red-900', isActive)
    p.classList.toggle('text-white', isActive)
    p.classList.toggle('bg-gray-100', !isActive)
    p.classList.toggle('text-gray-600', !isActive)
  })
  renderCellar()
}

// ── Dark mode ─────────────────────────────────────────────────────────────────
function initDarkMode() {
  const saved = localStorage.getItem(DARK_MODE_KEY)
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  if (saved === 'dark' || (!saved && prefersDark)) applyDarkMode(true)
}

function toggleDarkMode() {
  applyDarkMode(!document.documentElement.classList.contains('dark'))
}

function applyDarkMode(dark) {
  document.documentElement.classList.toggle('dark', dark)
  iconSun.classList.toggle('hidden', !dark)
  iconMoon.classList.toggle('hidden', dark)
  localStorage.setItem(DARK_MODE_KEY, dark ? 'dark' : 'light')
}

// ── Cellar rendering ──────────────────────────────────────────────────────────
function renderCellar() {
  cellarPage = 1
  wineList.innerHTML = ''

  const wines = sortAndFilterWines(loadWines(), { filterType: activeFilter, sortBy: activeSort })
  cellarCountLabel.textContent = `${wines.length} wine${wines.length !== 1 ? 's' : ''}`

  if (wines.length === 0) {
    cellarEmpty.classList.remove('hidden')
    loadMoreBtn.classList.add('hidden')
    return
  }

  cellarEmpty.classList.add('hidden')
  appendWineCards(wines.slice(0, PAGE_SIZE))
  loadMoreBtn.classList.toggle('hidden', wines.length <= PAGE_SIZE)
  wineList._filteredWines = wines  // cache for load-more paging
}

function handleLoadMore() {
  cellarPage++
  const wines = wineList._filteredWines || []
  const start = (cellarPage - 1) * PAGE_SIZE
  appendWineCards(wines.slice(start, start + PAGE_SIZE))
  loadMoreBtn.classList.toggle('hidden', start + PAGE_SIZE >= wines.length)
}

function appendWineCards(wines) {
  const fragment = document.createDocumentFragment()
  for (const wine of wines) {
    fragment.appendChild(buildWineCard(wine))
  }
  wineList.appendChild(fragment)
}

function buildWineCard(wine) {
  const d = formatCardData(wine)

  const card = document.createElement('div')
  card.className = 'bg-white rounded-lg shadow-sm p-4'

  card.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap mb-1">
          ${d.type ? `<span class="text-xs font-semibold px-2 py-0.5 rounded-full ${d.typeColor}">${d.type}</span>` : ''}
          ${d.quantity > 1 ? `<span class="text-xs font-bold text-gray-500">×${d.quantity}</span>` : ''}
        </div>
        <p class="font-semibold text-gray-900 leading-snug">
          ${d.vintage ? `<span class="text-gray-400 font-normal text-sm mr-1">${escHtml(d.vintage)}</span>` : ''}${escHtml(d.headline)}
        </p>
        ${d.subline ? `<p class="text-sm text-gray-500 mt-0.5">${escHtml(d.subline)}</p>` : ''}
        ${d.region   ? `<p class="text-xs text-gray-400 mt-0.5">${escHtml(d.region)}</p>` : ''}
        ${d.vineyard ? `<p class="text-xs text-gray-400 italic">${escHtml(d.vineyard)}</p>` : ''}
      </div>
      <button class="edit-btn shrink-0 text-xs font-semibold text-red-900 border border-red-200
                     rounded-md px-3 py-1.5 active:bg-red-50">
        Edit
      </button>
    </div>
  `

  card.querySelector('.edit-btn').addEventListener('click', () => enterEditMode(wine))
  return card
}

// Minimal XSS protection for user-generated strings inserted via innerHTML.
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Settings ──────────────────────────────────────────────────────────────────
function toggleSettings() {
  const isHidden = settingsPanel.classList.toggle('hidden')
  if (!isHidden) {
    apiKeyInput.value = getApiKey()
    apiKeyInput.focus()
  }
}

function handleSaveKey() {
  const key = apiKeyInput.value.trim()
  if (!key) { showError('API key cannot be empty.'); return }
  saveApiKey(key)
  settingsPanel.classList.add('hidden')
  showSuccess('API key saved.')
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function setLoading(active) {
  loadingOverlay.classList.toggle('hidden', !active)
}

function showError(msg) {
  successBanner.classList.add('hidden')
  errorMessage.textContent = msg
  errorBanner.classList.remove('hidden')
}

function showSuccess(msg) {
  errorBanner.classList.add('hidden')
  successMessage.textContent = msg
  successBanner.classList.remove('hidden')
  setTimeout(() => successBanner.classList.add('hidden'), 3000)
}

function clearMessages() {
  errorBanner.classList.add('hidden')
  successBanner.classList.add('hidden')
}

function updateBadge() {
  const count = loadWines().length
  cellarBadge.textContent = count > 99 ? '99+' : count
  cellarBadge.classList.toggle('hidden', count === 0)
  exportBtn.disabled = count === 0
}

init()
