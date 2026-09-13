# Wordventure Bingo

A kid-friendly word bingo/puzzle game for ages 10+, with PowerPoint-style animations,
built as an offline-capable Progressive Web App (PWA). Playable on a Windows laptop
(Chrome/Edge) and installable to the home screen on Android — no login, no ads, no
backend. 🎯📝

## Tech stack

- React + Vite
- Framer Motion for all transitions/animations
- CSS Modules for styling
- `vite-plugin-pwa` for the offline service worker + install manifest
- `localStorage` for settings, streaks, and the custom Free Play word list
- Vitest for unit tests

## Running locally

```bash
npm install
npm run dev
```

Opens the app at `http://localhost:5173` with hot reload.

**One-click launchers** — install dependencies on first run automatically.
Windows (PowerShell):

```powershell
.\scripts\run_web.ps1           # opens in a normal browser tab
.\scripts\run_window_mode.ps1   # opens in a chromeless app window, closer to the installed PWA feel
```

macOS/Linux/Git Bash (`.ps1` and `.sh` are equivalent — use whichever your shell is):

```bash
./scripts/run_web.sh
./scripts/run_window_mode.sh
```

## Building for production

```bash
npm run build     # outputs to dist/
npm run preview   # serves the production build locally, for a final check
```

Or via the mirrored dev-task scripts, which wrap the same commands with
logging (see `scripts/dev.sh` / `scripts/dev.ps1`):

```bash
./scripts/dev.sh build
./scripts/dev.sh preview
```

Other available tasks: `vet` (lint + typecheck), `test`, `cov` (coverage),
`scan` (`npm audit`), `all` (build vet test — the fast loop), `full` (the
pre-release sweep). Run `./scripts/dev.sh` with no arguments for the full list.

## Adding new word categories or words

Word banks live as plain JSON in [src/data/wordbanks/](src/data/wordbanks/) —
no build step needed to edit them. Each file has this shape:

```json
{
  "category": "animals",
  "label": "Animals",
  "words": [
    {
      "word": "GIRAFFE",
      "difficulty": "easy",
      "definition": "A tall African animal with a very long neck and a spotted coat.",
      "synonym": "optional alternate clue",
      "fillBlank": "optional sentence with a ____ blank",
      "riddle": "optional riddle whose answer is the word"
    }
  ]
}
```

Rules:
- `word` is required, uppercase by convention.
- `definition` is required — it's always available as a clue.
- `synonym`, `fillBlank`, and `riddle` are optional extra clue variants; the
  game weights which type is shown more toward `riddle`/anagram on harder
  difficulties. An anagram clue is always available for every word — it's
  generated automatically from the letters, no authoring needed.
- Each category needs **at least 24 words per difficulty tier** (`easy`,
  `medium`, `hard`) to fill a 5x5 card (24 cells + 1 FREE center). Adding a
  category short on words will fail loudly at card-generation time rather
  than silently rendering a broken card.

To add a brand-new category:
1. Add a new JSON file under `src/data/wordbanks/`.
2. Register it in [src/data/wordBanks.ts](src/data/wordBanks.ts) (`WORD_BANKS` map and `CATEGORY_ORDER`).
3. Add the new `CategoryId` to the union in [src/types.ts](src/types.ts).

The **Free Play** category (`src/data/wordbanks/freeplay.json`) additionally
merges in whatever a parent adds through the in-app Settings → Free Play Word
List editor (stored in `localStorage`, no difficulty tiers).

## Installing the PWA

**Android (phone/tablet):** open the app's URL in Chrome, tap the menu (⋮),
then **Add to Home screen**. It launches full-screen from the home screen
icon afterward and works offline once loaded.

**Windows (Chrome/Edge):** open the app's URL, then use the install icon in
the address bar (or the browser menu → **Apps → Install this site as an
app**). It opens in its own window like a native app.

The app precaches all its assets on first load, so once installed it keeps
working with no network connection.

## Building an Android APK

`scripts/build_apk.ps1` (Windows) / `build_apk.sh` (macOS/Linux/Git Bash)
wraps the **deployed** PWA in a native Android shell using
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) (Google's
official PWA→Trusted Web Activity tool). It reuses the live manifest and
service worker as-is — there's no separate native codebase to keep in sync.

Prerequisites:
- The app must already be deployed to a real public HTTPS URL (GitHub Pages,
  Netlify, or Vercel — hosting isn't set up yet, see `CLAUDE.md`'s "Known
  open item"). A TWA can't point at a local dev server.
- A JDK and the Android SDK — Bubblewrap's first run offers to download both
  automatically if missing.

```powershell
$env:WORDVENTURE_HOSTED_URL = "https://you.github.io/wordventure-bingo"
.\scripts\build_apk.ps1
```

```bash
WORDVENTURE_HOSTED_URL="https://you.github.io/wordventure-bingo" ./scripts/build_apk.sh
```

The first run scaffolds `android/` and a signing keystore, prompting for a
keystore password interactively — **write that password down somewhere
safe**. Every future update APK must be signed with the same key, and
`android/` (including the keystore) is gitignored on purpose: losing that
key means you can never publish an update to an existing Play Store listing
under the same package ID. Back the keystore up outside of git.

Later runs re-sync from the live manifest and rebuild; each build increments
the repo-root `BUILD_NUMBER` file (tracked in git) so `versionCode` keeps
strictly increasing, as Android requires. The signed APK lands in
`dist-apk/`.

## Testing

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

Unit tests cover the correctness-critical logic — card generation, win
detection, and clue selection/formatting (`src/lib/*.test.ts`). UI and
animation behavior is verified manually in-browser (desktop + Android).
