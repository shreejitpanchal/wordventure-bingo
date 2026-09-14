# Wordventure Bingo

A kid-friendly word game app for ages 10+, with PowerPoint-style animations,
built as an offline-capable Progressive Web App (PWA). Playable on a Windows laptop
(Chrome/Edge) and installable to the home screen on Android — no login, no ads, no
backend. 🎯📝

For a map of how the codebase fits together (module boundaries, data flow,
the screen state machine), see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

First launch asks "Who's playing?" — pick a name (or add a new one). This
isn't a login: it's just a local label so siblings/family sharing one
device/tablet each keep their own Bingo streaks and Wordscapes stats, all
still stored only on-device. Tap the name button on the main menu (next to
the settings gear) to switch player at any time.

Two modes, picked from the main menu:
- **Bingo** — the original word-bingo game (clues, auto-caller, win patterns).
  The menu's **Call Speed** setting picks how many seconds the auto-caller
  waits between clues (10-60s, default 20s) — independent of difficulty, so
  picking "Hard" words doesn't also speed up the clock.
- **Wordscapes** — a word-connect crossword puzzle: swipe letters on a wheel
  to spell words that fill an interlocking grid, in the style of PeopleFun's
  Wordscapes/Word Cross. Puzzles are procedurally generated from the same
  word banks Bingo uses — no separate content to author. (Note: "Wordscapes"
  is used here only as an in-app label; it's a third party's trademark and
  must not be used in any app-store listing or published branding.)

## Tech stack

- React + Vite
- Framer Motion for all transitions/animations
- CSS Modules for styling
- `vite-plugin-pwa` for the offline service worker + install manifest
- `localStorage` for settings, player profiles, per-profile streaks/stats,
  and the (device-wide) custom Free Play word list
- Capacitor for local Android APK builds — see "Building an Android APK"
  below
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

## How Wordscapes puzzles are generated

Wordscapes has no fixed level list — every puzzle is built on the fly by
[src/lib/wordscapes/gridGeneration.ts](src/lib/wordscapes/gridGeneration.ts)
from the *same* word banks above (whichever category/difficulty you pick in
the menu):

1. Sample words from the pool (capped to the puzzle's word-count setting,
   3-10, chosen in the menu) and try to fit as many as possible into an
   interlocking crossword grid (longest words first, one at a time, each new
   word placed wherever it can cross an already-placed one).
2. Build the letter wheel from the placed words — one tile per letter,
   sized to the most copies any single word needs (tiles are reused across
   words, not consumed). Tiles lay out in a wrapping straight row so the
   wheel stays readable no matter how many tiles a puzzle needs.
3. Any sampled word that couldn't be placed geometrically, plus any other
   word in the category whose letters happen to fit the wheel, becomes an
   optional **bonus word** — findable for extra points but not required to
   finish the puzzle.
4. One random letter of every word is auto-revealed as a free hint, and
   tapping any grid cell shows the definition clue(s) for the word(s) that
   pass through it.

Spell a word either by dragging continuously across its letters (like a
swipe) or by tapping them one at a time, confirming with the ✓ button
(✕ clears your current selection).

Stuck? **💡 Reveal a Letter** reveals one random hidden letter and lets you
keep playing — press it as many times as you like. **🏳️ Give Up** reveals
the whole grid at once. Either way, once everything's visible, **Continue**
moves on. Using either button means the puzzle doesn't count toward your
"puzzles completed" stat, even if you finish the rest yourself — any bonus
words you'd already found still do.

**Difficulty here means something different than in Bingo.** Bingo's
easy/medium/hard tags are about vocabulary/reading level. Wordscapes
additionally caps word *length* per difficulty (easy ≤5 letters, medium ≤8,
hard uncapped) so the puzzle and wheel stay a manageable size — an "easy"
Bingo word like ELEPHANT is simple to read but too long for an easy
Wordscapes puzzle. Each category's easy tier includes a set of short (3-5
letter) words added specifically to make this work.

Because it draws on the existing word banks, almost no separate Wordscapes
content needed authoring — but a category/difficulty/word-count combo that's
too sparse or too letter-diverse could theoretically fail to produce a
puzzle (`generateLevel` throws loudly rather than rendering a broken one).
All shipped categories were checked to generate reliably across every word
count (3-10); re-check if you significantly change a word bank's contents.

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
builds a local, installable APK using [Capacitor](https://capacitorjs.com/),
which bundles this repo's own `dist/` build straight into the native Android
project as local WebView assets. **No hosting/deployment needed** — it works
from a plain checkout, offline.

Prerequisites:
- A JDK (17+) — install via [Android Studio](https://developer.android.com/studio)
  or [Adoptium](https://adoptium.net).
- The Android SDK, with `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) pointing at
  it — Android Studio's SDK Manager installs this. The script also falls
  back to `~/Android/sdk` if neither env var resolves to a real directory,
  so it needs no manual setup on a machine that already has an SDK there
  (e.g. installed by another project's toolchain).

```powershell
.\scripts\build_apk.ps1
```

```bash
./scripts/build_apk.sh
```

The first run scaffolds `android/` via Capacitor (fully regenerable, and
gitignored — nothing there is worth keeping by hand). Every run bumps the
repo-root `BUILD_NUMBER` file (tracked in git) so `versionCode` keeps
strictly increasing, as Android requires, and syncs `versionName` from
`package.json`. The launcher icon is regenerated on every build from
`assets/main-icon.jpg` (via `npm run icons` + `@capacitor/assets`) — to
change it, replace that file and rebuild, don't edit the generated
`assets/icon.png`/`public/icons/*.png` by hand. The APK lands in
`dist-apk/`, ready to install with `adb install <path>`.

This produces a **debug**-signed build (Android's own throwaway debug
keystore) — fine for testing on a device/emulator, but not eligible for a
Play Store release. A release build needs its own signing keystore, which
isn't set up yet (see `CLAUDE.md`'s "Known open items") — add that if/when
actually publishing.

## Testing

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

Unit tests cover the correctness-critical logic — card generation, win
detection, clue selection/formatting, and Wordscapes grid generation
(`src/lib/*.test.ts`, including `src/lib/wordscapes/`). UI and animation
behavior is verified manually in-browser (desktop + Android).
