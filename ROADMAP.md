# Wine Bottle Scanner — Roadmap

## Project Summary
A Progressive Web App (PWA) that runs in iPhone Safari. Take a photo of a wine label,
Gemini 1.5 Flash extracts structured data via vision API, you review/correct the
pre-filled form, then save. All data persists in localStorage and exports as .xlsx.

**No Xcode. No App Store. No subscriptions. Free to run (Gemini billing required for
high-volume use; typical personal use is free or near-free).**

---

## Tech Stack
| Purpose          | Tool / Library       | Cost                   |
|------------------|----------------------|------------------------|
| Vision + Extract | Gemini 1.5 Flash API | Pay-per-use (~$0.01–0.03/scan) |
| Excel export     | SheetJS (xlsx)       | Free                   |
| Styling          | Tailwind CSS CDN     | Free                   |
| Storage          | localStorage         | Free                   |
| Hosting          | GitHub Pages         | Free                   |

---

## ✅ Phase 1 — Gemini Vision Integration  COMPLETE
- [x] Vite + Vitest project scaffold
- [x] Gemini API key input — stored in localStorage, never hardcoded
- [x] On photo capture, base64-encode and send to Gemini 1.5 Flash
- [x] Structured prompt returns JSON with all label fields
- [x] Auto-populate form fields from JSON response
- [x] Loading overlay while API call is in flight
- [x] Graceful error handling: bad key, network failure, quota exceeded
- [x] **14 unit tests + 4 integration tests**

---

## ✅ Phase 2 — Wine List & Persistence  COMPLETE
- [x] Save wines to localStorage on form submit
- [x] Duplicate detection: Producer + Varietal + Appellation + Vineyard + Vintage must all
      match to trigger — different vintage = distinct entry
- [x] Duplicate detected → quantity incremented instead of new row added
- [x] Tab navigation: Scan tab + Cellar tab
- [x] Cellar renders newest-first, 50 at a time with "Load more"
- [x] Tap Edit on any cellar entry → re-populates form in Scan tab
- [x] Quantity manually adjustable in edit mode
- [x] Delete wine with confirm step (no accidental deletions)
- [x] Wine count badge on Cellar tab
- [x] **20 unit tests + 9 integration tests**

---

## ✅ Phase 3 — Excel Export  COMPLETE
- [x] SheetJS generates real .xlsx files client-side
- [x] Export button in Cellar tab header (disabled when cellar is empty)
- [x] All wines exported in newest-first order (matches Cellar view)
- [x] Column order: Producer · Vintage · Varietal · Bottle Size · Wine Type ·
      Appellation · Sub Appellation · Vineyard Designate · Proprietary Name · Quantity
- [x] Pre-sized columns — file opens cleanly without manual resizing
- [x] File downloads to iPhone Files app; can be AirDropped or emailed
- [x] Success message shows filename and count after export
- [x] **13 unit tests + 5 integration tests**

---

## ✅ Phase 4 — PWA (Install to Home Screen)  COMPLETE
- [x] `manifest.json` — name, icons, theme color, standalone display
- [x] Icon PNGs generated from pure Node.js (no extra packages): 192×192, 512×512, 180×180 Apple touch
- [x] Service worker: app shell cached on install; Gemini API calls never intercepted
- [x] Navigation requests: network-first with offline fallback
- [x] Same-origin assets: cache-first, updated in background
- [x] Old caches pruned on SW activation
- [x] Install banner: iOS shows manual Share → Add to Home Screen instructions;
      Android/Chrome shows native install button via `beforeinstallprompt`
- [x] Banner remembers dismissal in localStorage; hidden when already installed
- [x] Dark mode preference respected: if dismissed, stays dismissed
- [x] `DEPLOYMENT.md` — step-by-step guide for GitHub Pages + local network
- [x] **13 unit tests**

---

## ✅ Phase 5 — Polish  COMPLETE
- [x] **Vintage year field** — form, Gemini extraction, cellar card, duplicate logic, Excel export
- [x] **Sort** — Newest · Oldest · Producer A→Z · Producer Z→A · Vintage (newest first)
- [x] **Filter** — horizontally scrollable type pills: All · Red · White · Rosé · Sparkling · Dessert · Orange
- [x] Live count label updates with active filter ("3 wines")
- [x] **Dark mode** — moon/sun toggle in header, respects `prefers-color-scheme` on first launch, persists across sessions
- [x] Mobile UX polish — larger tap targets, no-scrollbar filter row, safe area insets
- [x] **22 new tests** covering sort, filter, combined filter+sort, vintage display, vintage duplicate logic

---

## Test Summary
| Suite | Tests |
|---|---|
| `tests/unit/gemini.test.js` | 14 |
| `tests/unit/store.test.js` | 20 |
| `tests/unit/utils.test.js` | 18 |
| `tests/unit/export.test.js` | 13 |
| `tests/unit/pwa.test.js` | 13 |
| `tests/unit/sort-filter.test.js` | 22 |
| `tests/integration/scan-and-save.test.js` | 4 |
| `tests/integration/edit-and-delete.test.js` | 9 |
| `tests/integration/export-flow.test.js` | 5 |
| **Total** | **118** |

---

## Deferred / Future Work

### Photo Thumbnails (deferred from Phase 5)
Storing a compressed thumbnail per bottle requires **IndexedDB** — localStorage's 5MB
cap is too small at scale (2,000 bottles × ~20KB = 40MB). The rest of the app is
unaffected; cellar cards show all text fields needed to identify every bottle.

**What's needed to implement:**
- IndexedDB wrapper (read/write blobs by wine id)
- Compress image on capture before storing (Canvas API → `toBlob`)
- Render thumbnail in cellar card alongside existing text
- Clean up orphaned blobs when a wine is deleted

### Other ideas
- Vintage-based browsing / timeline view
- Notes / tasting notes field per wine
- Search by producer or varietal
- Share individual wine entries
- iCloud / Google Drive backup of the wine list JSON
