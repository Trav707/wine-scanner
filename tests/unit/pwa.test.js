import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isRunningStandalone, isIos, maybeShowInstallBanner, registerServiceWorker } from '../../src/pwa.js'

// ── isRunningStandalone ───────────────────────────────────────────────────────
describe('isRunningStandalone', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns true when display-mode is standalone', () => {
    vi.stubGlobal('window', {
      ...window,
      matchMedia: () => ({ matches: true }),
      navigator: { standalone: false }
    })
    expect(isRunningStandalone()).toBe(true)
  })

  it('returns true when navigator.standalone is true (iOS installed PWA)', () => {
    vi.stubGlobal('window', {
      ...window,
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: true }
    })
    expect(isRunningStandalone()).toBe(true)
  })

  it('returns false in a normal browser tab', () => {
    vi.stubGlobal('window', {
      ...window,
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: false }
    })
    expect(isRunningStandalone()).toBe(false)
  })
})

// ── isIos ─────────────────────────────────────────────────────────────────────
describe('isIos', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns true for iPhone user agent', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
    })
    expect(isIos()).toBe(true)
  })

  it('returns true for iPad user agent', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
    })
    expect(isIos()).toBe(true)
  })

  it('returns false for Android user agent', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36'
    })
    expect(isIos()).toBe(false)
  })

  it('returns false for desktop Chrome user agent', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    })
    expect(isIos()).toBe(false)
  })
})

// ── maybeShowInstallBanner ────────────────────────────────────────────────────
describe('maybeShowInstallBanner', () => {
  let banner, iosHint, androidHint, dismissBtn

  function buildBannerDom() {
    document.body.innerHTML = `
      <div id="installBanner" class="hidden"></div>
      <div id="iosInstallHint"></div>
      <div id="androidInstallHint" class="hidden"></div>
      <button id="installBtn"></button>
      <button id="dismissInstallBtn"></button>
    `
    banner      = document.getElementById('installBanner')
    iosHint     = document.getElementById('iosInstallHint')
    androidHint = document.getElementById('androidInstallHint')
    dismissBtn  = document.getElementById('dismissInstallBtn')
  }

  beforeEach(() => {
    buildBannerDom()
    // Default: not standalone, not iOS, banner not dismissed
    vi.stubGlobal('window', {
      ...window,
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: false, userAgent: 'Chrome/Android' },
      addEventListener: window.addEventListener.bind(window),
    })
    vi.stubGlobal('navigator', { userAgent: 'Chrome/Android', standalone: false })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('does not show banner when already dismissed', () => {
    localStorage.setItem('install_banner_dismissed', '1')
    maybeShowInstallBanner()
    expect(banner.classList.contains('hidden')).toBe(true)
  })

  it('does not show banner when running as standalone PWA', () => {
    vi.stubGlobal('window', {
      ...window,
      matchMedia: () => ({ matches: true }),
      navigator: { standalone: true },
      addEventListener: window.addEventListener.bind(window),
    })
    maybeShowInstallBanner()
    expect(banner.classList.contains('hidden')).toBe(true)
  })

  it('shows iOS banner for iPhone user agents', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
      standalone: false
    })
    maybeShowInstallBanner()
    expect(banner.classList.contains('hidden')).toBe(false)
  })

  it('dismiss button hides the banner and sets localStorage flag', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
      standalone: false
    })
    maybeShowInstallBanner()
    dismissBtn.click()
    expect(banner.classList.contains('hidden')).toBe(true)
    expect(localStorage.getItem('install_banner_dismissed')).toBe('1')
  })
})

// ── registerServiceWorker ─────────────────────────────────────────────────────
describe('registerServiceWorker', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('registers sw.js when serviceWorker is supported', () => {
    const register = vi.fn().mockResolvedValue({})
    vi.stubGlobal('navigator', { serviceWorker: { register } })
    vi.stubGlobal('window', {
      ...window,
      addEventListener: (event, cb) => { if (event === 'load') cb() }
    })
    registerServiceWorker()
    // Path is BASE_URL + 'sw.js'; in the test environment BASE_URL resolves to '/'
    expect(register).toHaveBeenCalledWith(expect.stringContaining('sw.js'))
  })

  it('does nothing when serviceWorker is not supported', () => {
    vi.stubGlobal('navigator', {})
    expect(() => registerServiceWorker()).not.toThrow()
  })
})
