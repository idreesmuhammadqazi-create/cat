# marmalade — a phone pet

A tiny cat who lives on your phone. Feed her, play with her, let her nap, tap to pat.
She runs around her room all day, loafs on the rug when she's tired, does zoomies when
she's happy, and sleeps when it's night where you are.

This is a real installable app: a PWA with a home-screen icon, its own window, offline
cache, and local save data. No accounts, no backend, no tracking, no dependencies.

## install it on your phone

Installing needs the app online over HTTPS once (then it works offline):

1. Publish this folder to any static host. Easiest options:
   - **GitHub Pages** — push this branch, then repo **Settings → Pages → Deploy from a
     branch** → pick the branch, folder `/ (root)` → Save. The app lands at
     `https://<your-user>.github.io/cat/`.
   - **Netlify Drop** — open `app.netlify.com/drop` and drag this folder in. You get an
     HTTPS URL immediately.
2. Open that URL on your phone:
   - **Android / Chrome** — menu → **Install app** (or **Add to Home Screen**).
   - **iPhone / Safari** — **Share** → **Add to Home Screen**.
3. Open her from the home screen. She runs full screen, and the `install` button in the
   app / onboarding card also walks you through it.

Installing keeps her data under one origin. If you change hosts, the URL changes and she
starts over — export/import isn't built in.

## live with her

- **three needs** — food, love, rest. They drift down while you're away, with the offline
  loss capped so she gets needy, never hopeless. She can't die.
- **feed** — fills her bowl, she trots over and eats. Refill while she's eating and she
  says thanks.
- **play** — yarn. She chases it around the rug for a few rounds.
- **nap** — she walks to the rug, curls into a loaf, and recharges. She also auto-naps
  when she's exhausted or when it's night (21:00–07:00).
- **pat** — tap/click her anywhere, or focus her and press Enter/Space. Squish, closed
  eyes, hearts, purr. Patting a sleeping cat keeps her asleep.
- **name** — tap her name chip to rename her (up to 14 characters).
- **nights** — the room dims, the window turns to night, the clock shows the actual time.
- **saved** — needs, name, age in days, pat count and the fact she's asleep all persist.
  Data lives in `localStorage` (`cat.pet.v3`). Clearing site data resets her.

## run it locally

```sh
npm start
# http://localhost:8000
```

No install step, no build. `server.js` is a 40-line static server so the service worker
and manifest work over HTTP.

When editing the shell, the service worker serves cached files first and updates in the
background — a normal reload twice, or Clear site data, gets you fresh files. Bump
`VERSION` in `sw.js` when you want a new offline shell immediately.

## files

| file | what |
| --- | --- |
| `index.html` | room, cat, dock, onboarding/rename/install sheets |
| `styles.css` | room, cat coat and poses, dock, night lighting, safe areas |
| `cat.js` | needs, wandering, zoomies, feed/play/sleep, petting, persistence |
| `manifest.webmanifest` | install metadata, icons, standalone mode |
| `sw.js` | offline app shell |
| `icons/` | generated PNG icons + source SVGs |
| `server.js` | zero-dependency local static server |

## native build

The app is just static files, so it can be wrapped in Capacitor for an Android APK or a
store build: point Capacitor's `webDir` at a folder containing the files above, run
`npx cap add android`, and open the project in Android Studio. A PWA install is the
no-toolchain path; the wrapped build is only needed for app-store distribution.

## tested

Headless Chrome at 390×844, 320×568 and 1440×900: feeding, playing, patting, napping,
renaming, day/night lighting, manifest + service worker registration, and a full offline
reload with the pet's state intact.
