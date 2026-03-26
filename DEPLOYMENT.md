# Deploying Wine Scanner to Your iPhone

PWA features (offline mode, Add to Home Screen) require **HTTPS**.
The simplest free option is GitHub Pages.

---

## Option A — GitHub Pages (recommended)

This gives you a permanent HTTPS URL you can bookmark and share.

### First deploy

```bash
# 1. Build the app
npm run build

# 2. Create a GitHub repo (do this on github.com, then:)
cd /Users/travis/Vibe_Coding/Wine_Bottle_Scanner
git init
git add .
git commit -m "Initial release"
git remote add origin https://github.com/YOUR_USERNAME/wine-scanner.git
git push -u origin main

# 3. Enable GitHub Pages in repo Settings → Pages → Source: GitHub Actions
#    (or deploy the dist/ folder to the gh-pages branch)
```

### After any code change

```bash
npm run build
git add .
git commit -m "Update"
git push
```

Your app will be live at: `https://YOUR_USERNAME.github.io/wine-scanner`

---

## Option B — Local network (dev/testing only)

Both devices must be on the same Wi-Fi. Full offline/SW support won't work over
plain HTTP on iPhone, but the app itself functions fine.

```bash
npm run dev -- --host
```

Look for the `Network:` line in the output, e.g.:
```
  ➜  Network: http://192.168.1.42:5173/
```

Open that URL in **Safari** on your iPhone.

> **Note:** Service workers require HTTPS. On a local network without HTTPS, the
> SW registration will silently fail — the app still works, it just won't cache
> for offline use. Everything else (scan, save, export) works normally.

---

## Installing on iPhone (both options)

1. Open the app URL in **Safari** (must be Safari — Chrome on iOS can't install PWAs)
2. Tap the **Share** button (box with arrow pointing up)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add**

The app will appear on your home screen and launch full-screen without the Safari
browser chrome.

---

## After installing: entering your API key

On first launch the settings panel opens automatically. Enter your Gemini API key
and tap **Save Key**. The key is stored only on your device in localStorage.

---

## Updating the app after a code change

If you're using GitHub Pages, push your changes and wait ~60 seconds for the
deployment to complete. Then on your iPhone:

1. Open the installed app
2. Pull down to refresh (or close and reopen)
3. The service worker will pick up the new version in the background
4. On next launch, the new version is active

To force an immediate update: open Safari → navigate to the app URL → hard reload.
