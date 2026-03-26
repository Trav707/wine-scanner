/**
 * PWA plumbing: service worker registration + install prompt.
 * Isolated in its own module so it's easy to test and replace.
 */

const INSTALL_DISMISSED_KEY = 'install_banner_dismissed'

let deferredInstallPrompt = null  // holds the beforeinstallprompt event on Chrome/Android

export function initPwa() {
  registerServiceWorker()
  maybeShowInstallBanner()
}

// ── Service Worker ────────────────────────────────────────────────────────────

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(err => {
      // Fails silently in non-HTTPS environments (local IP without HTTPS).
      // The app still works — offline support just isn't active.
      console.debug('Service worker registration skipped:', err.message)
    })
  })
}

// ── Install banner ────────────────────────────────────────────────────────────

export function maybeShowInstallBanner() {
  // Don't show if already running as an installed PWA
  if (isRunningStandalone()) return
  // Don't show if the user already dismissed it
  if (localStorage.getItem(INSTALL_DISMISSED_KEY)) return

  const banner          = document.getElementById('installBanner')
  const iosHint         = document.getElementById('iosInstallHint')
  const androidHint     = document.getElementById('androidInstallHint')
  const installBtn      = document.getElementById('installBtn')
  const dismissBtn      = document.getElementById('dismissInstallBtn')

  if (!banner) return

  // Android/Chrome: intercept the native install prompt before it auto-fires
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault()
    deferredInstallPrompt = event
    // Switch to the Chrome-native install button variant
    iosHint.classList.add('hidden')
    androidHint.classList.remove('hidden')
    banner.classList.remove('hidden')
  })

  // iOS Safari: show the manual share-sheet instructions
  if (isIos() && !isRunningStandalone()) {
    banner.classList.remove('hidden')
  }

  installBtn?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return
    deferredInstallPrompt.prompt()
    const { outcome } = await deferredInstallPrompt.userChoice
    deferredInstallPrompt = null
    if (outcome === 'accepted') dismissBanner(banner)
  })

  dismissBtn?.addEventListener('click', () => dismissBanner(banner))
}

function dismissBanner(banner) {
  banner.classList.add('hidden')
  localStorage.setItem(INSTALL_DISMISSED_KEY, '1')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function isRunningStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}
