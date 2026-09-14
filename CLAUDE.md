# Wordventure Bingo

A kid-friendly word game app (ages 10+) delivered as an offline-capable
PWA — Windows (Chrome/Edge) and Android (installed to home screen). No backend,
no accounts, no ads, no network calls after first load. Two modes, chosen from
the main menu: **Bingo** (the original word-bingo game) and **Wordscapes**
(a word-connect crossword puzzle, in the style of PeopleFun's Wordscapes/Word
Cross — named "Wordscapes" as an in-app mode label only; that name is a
third party's trademark, so it must not appear in any app-store listing,
package id, or branding if this is ever published).

## Stack & architecture

- React + Vite + TypeScript, Framer Motion for all transitions/animations, CSS
  Modules for styling (no Tailwind, no UI framework).
- `vite-plugin-pwa` owns the manifest + service worker (`vite.config.ts`).
- No router: `src/App.tsx` is a single explicit screen state machine
  (`menu | game | win | settings | wordscapes-game | wordscapes-win`) swapped
  via `AnimatePresence`. Don't introduce React Router or similar for what is
  a handful of screens. Mode selection (Bingo vs. Wordscapes) happens inside
  `MenuScreen`, not as a separate screen.
- No backend, no global state library: all persistence is `localStorage`
  behind `src/lib/storage.ts` (settings, Bingo streaks, Wordscapes stats, the
  Free Play custom word list). That file is the only place allowed to touch
  `localStorage` directly.
- Game logic is framework-free and colocated in `src/lib/` (`cardGeneration`,
  `winDetection`, `clueMatching`, `caller` for Bingo; `wordscapes/gridGeneration`
  for Wordscapes) — pure functions taking an injectable `rng` parameter so
  they stay unit-testable without mocking `Math.random`. Keep new game-rule
  logic there, not inside components. Shared utilities (e.g. `shuffle`) live
  in `src/lib/random.ts` — reuse it rather than re-implementing per module.

## Word banks

- Plain JSON under `src/data/wordbanks/`, registered in `src/data/wordBanks.ts`.
  Editable with no build step — see the README's "Adding new word categories"
  section for the schema.
- Each category needs **at least 24 words per difficulty tier** (`easy`/
  `medium`/`hard`) to fill a 5x5 card. `generateCard` throws loudly if a
  tier is short rather than silently rendering a broken card — if you add a
  category, make sure all three tiers clear that bar.
- `anagram` is never authored; it's derived from `word` at runtime
  (`clueMatching.ts`). Only add `synonym`/`fillBlank`/`riddle` where they
  read naturally — `definition` is the only required clue field.
- Each easy tier additionally carries a set of short (3-5 letter) words,
  added specifically so Wordscapes-easy has enough material — see
  "Wordscapes mode" below for why. They're ordinary `easy`-tagged entries,
  so Bingo's easy cards can draw them too (harmless — more variety, still
  easy vocabulary); don't remove them thinking they're Wordscapes-only.

## Bingo mode

- Auto-caller pace (`GameScreen.tsx`'s `paceMs`) is `config.callSeconds *
  1000`, a **menu setting** (`GameConfig.callSeconds`, options in
  `CALL_SECONDS_OPTIONS`, `src/lib/caller.ts`) — not derived from
  difficulty. It used to be a difficulty-keyed lookup (`CALL_PACE_MS`,
  4-7s), which read as "too fast" for a kid reading a clue and scanning a
  5x5 card regardless of how easy the vocabulary was. Difficulty still
  controls word/vocabulary difficulty only; pace is independent, the same
  way Wordscapes decoupled word length from Bingo's difficulty tags. Only
  `MenuScreen` constructs a `GameConfig`, so `callSeconds` is always one of
  `CALL_SECONDS_OPTIONS` in practice — no runtime clamping needed the way
  Wordscapes' `wordCount` needs it in `generateLevel`.

## Wordscapes mode

- Puzzles are **procedurally generated**, not hand-authored levels — there is
  no level map/tree. `generateLevel` (`src/lib/wordscapes/gridGeneration.ts`)
  samples words from the *same* category/difficulty word banks Bingo uses
  (no separate dictionary asset), greedily fits up to `wordCount` (a menu
  option, 3-10) into an interlocking crossword grid, and derives the letter
  wheel from the max per-letter count any single placed word needs (tiles
  are reused across words by re-tracing them, never consumed). Words that
  don't fit geometrically can still surface as optional "bonus words" if
  their letters are a sub-multiset of the wheel.
- **Wordscapes has its own difficulty axis, separate from Bingo's.** Bingo's
  `easy`/`medium`/`hard` tags mean vocabulary/reading difficulty — "easy"
  Bingo words like ELEPHANT or KANGAROO are simple to *read*, not short.
  Wordscapes additionally needs puzzles that are short enough for a legible
  wheel, so `selectWordscapesPool` layers a **word-length cap on top of**
  the existing category/difficulty filter (`easy` ≤5 letters, `medium` ≤8,
  `hard` uncapped) — never call `selectWordPool` directly for Wordscapes,
  always go through `selectWordscapesPool`. The existing word banks didn't
  have enough ≤5-letter words to make `easy` viable on their own (only 2-4
  per category), which is why each easy tier got ~24 new short words added.
  Two categories (`spelling`, `freeplay`) initially got only 4-5 letter
  words, which produced same-length-only puzzles — every easy tier needs a
  genuine spread across 3/4/5 letters, not just "short," or generation will
  cluster on whichever length is best represented.
- **`generateLevel` deliberately samples and places across a mix of word
  lengths (`stratifiedSample`), not just randomly.** A random sample skews
  toward whatever length the pool happens to have most of, and even a
  length-diverse sample still produces same-length puzzles if placement
  attempts go strictly longest-first (the first `wordCount` acceptances
  cluster on the first-tried, usually-longest, group). Only the anchor (the
  unconditional first placement) is chosen for length; everything else
  attempts in the sample's length-interleaved order.
- This reuse is why Wordscapes needed (almost) no new content authoring —
  but a category/difficulty/word-count combo that's too sparse or too
  letter-diverse could still fail to generate. `generateLevel` throws loudly
  rather than render a broken puzzle; verified (via a standalone script, not
  the test suite) that every shipped category/difficulty combo reliably
  generates across word counts 3-10 and many random seeds. Re-verify this
  if you significantly change a word bank's contents.
- The wheel (`LetterWheel.tsx`) lays tiles out in a **wrapping straight
  row, not a circle** — a circle has a fixed radius while tile count varies
  per puzzle, so a bigger puzzle used to overlap into an unreadable ring.
  Flex-wrap sizes itself to however many tiles there are, so this scales to
  any word count/difficulty without layout bugs. It supports both a
  continuous drag (2+ tiles visited in one press submits on release, like a
  swipe) and tapping tiles one at a time (a simple click adds a tile and
  waits, confirmed via the ✓ button or cleared via ✕) — a plain click and a
  1-tile drag are otherwise indistinguishable, so without this a click
  submitted instantly as a 1-letter word. Tapping an already-selected tile
  again is a no-op, **not** an undo/toggle — an earlier version removed the
  tile on re-tap, which silently ate letters whenever a kid tapped a tile
  twice (double-tap, re-confirming a tap that looked like it hadn't
  registered), producing a confusingly wrong short word with no visible
  cause. ✕ is the only way to remove a letter; don't reintroduce a
  tap-to-undo shortcut without a much more deliberate, visible affordance
  than "tap it again." Hit-testing uses
  `document.elementFromPoint` against a `data-tile-index` attribute (the
  standard technique for drag-select UIs) rather than manually tracked DOM
  rects, which stay correct through Framer Motion's tap-scale animation.
  Uses the Pointer Events API with container-level pointer capture (not
  per-tile) so a drag keeps tracking across mouse (Windows) and touch
  (Android) alike.
- Every puzzle **auto-reveals one random letter of each placed word** as a
  free hint (`revealHintLetters`, always applied inside `generateLevel` —
  not optional/difficulty-gated). This is deliberately *not* always index 0
  (the first letter): an earlier version always revealed index 0, which
  made every puzzle predictable in the same way, and made longer words
  disproportionately likely to show a *second*, coincidental reveal
  whenever a later word's own index-0 happened to land on an intersection
  with an earlier one. Fixed by picking a random index per word, preferring
  one of that word's own exclusive (non-intersection) cells so revealing it
  can't also hand a free hint to whatever crosses it, and skipping a word
  that already inherited a reveal from an intersecting word rather than
  adding a redundant second one. Verified via a standalone script: ~99.9%
  of 5+ letter words now get exactly one reveal (was 100% getting two
  before the fix). Tapping any grid cell also shows the definition clue(s)
  for the word(s) through it (reusing `WordEntry.definition`, the same data
  Bingo's clues come from) — without either, Wordscapes gave no indication
  at all of what to spell.
- **Two reveal-help mechanisms, both non-navigating (no screen jump):**
  `revealRandomLetter` (the repeatable "💡 Reveal a Letter" button) reveals
  one random still-hidden cell and lets the player keep playing; `revealAll`
  ("🏳️ Give Up") reveals everything at once. Neither jumps straight to a
  win screen — a kid who's stuck should get to actually read the real
  words, not just skip past them. `WordscapesGameScreen` shows the wheel +
  both buttons whenever `isLevelComplete(level.grid)` is false, and a
  "Continue" panel over the fully-revealed grid once it's true — this is
  **derived from grid state**, not tracked as a separate flag, so it stays
  correct no matter which path completed it: the player's own last word,
  enough single-letter reveals to finish it, or Give Up. `handleWordTraced`
  must NOT call `onComplete` directly when the player's own last word
  finishes the grid — an earlier version did, which skipped the review
  panel only on that path (Give Up/hints already rendered it, since they
  don't call `onComplete` at all) and dropped the player straight onto the
  win screen with no chance to see their finished grid. Let `complete` flip
  true and re-render instead; `onComplete` only fires from the panel's own
  "Continue" button.
- **`assisted` (was named `gaveUp`) is sticky for the rest of the puzzle**:
  it becomes `true` the moment *any* reveal help is used — even a single
  hint — and stays `true` even if the player goes on to finish the rest
  themselves. Threads through `onComplete(bonusWordsFound, assisted)` →
  `App.tsx` → `recordWordscapesCompletion(category, bonusWords, solved)`:
  `solved` (`= !assisted`) gates only the "puzzles completed" counter (an
  assisted finish isn't a real solve), while bonus words found are still
  credited either way — don't conflate those two independent stat updates
  again by skipping the whole storage call when `assisted` is true.
  `WordscapesWinScreen` also reads `assisted` to skip the confetti and
  swap the heading to "NICE TRY!".

## Testing

- Unit tests are colocated as `*.test.ts` next to the module they cover in
  `src/lib/` (including `src/lib/wordscapes/`), using Vitest. They cover the
  correctness-critical logic only (card generation, win detection, clue
  selection/formatting, Wordscapes grid generation) per the original spec —
  UI and animation are verified manually in-browser, not with component
  tests. Don't add `@testing-library/*`/`jsdom` back unless a future change
  actually needs DOM-level testing.
- Use the `sequenceRng`/`seededRng` helpers in `src/test/rng.ts` for
  deterministic tests instead of mocking `Math.random`.

## Dev workflow

- `scripts/dev.sh` / `dev.ps1` are the only place that knows how to build,
  lint, test, or scan this repo (see the repo-wide dev-script contract).
  Ask the user to run `./scripts/dev.sh all` (or `dev.ps1`) after code
  changes rather than running it yourself.
- `npm run dev` / `npm run preview` are for the user to check the app in a
  browser — same "ask, don't run" rule applies.

## Known open items

- **Hosting isn't deployed yet.** Nothing serves the PWA at a public HTTPS
  URL (GitHub Pages/Netlify/Vercel — still undecided). This no longer blocks
  Android APK builds (see below), but still blocks the PWA-install docs in
  the README (which assume the app has a real URL to open in a browser) and
  any future proper Play-Store release. Resolve this before either matters
  in practice.
- **Android packaging is decided; Windows packaging is not.** Android ships
  via **Capacitor** (`scripts/build_apk.ps1`/`.sh`, `capacitor.config.ts`),
  which bundles `dist/` directly into the native project as local WebView
  assets — not Bubblewrap/TWA, which was tried first and rejected: it wraps
  a *deployed* PWA and verifies domain ownership via Digital Asset Links,
  which has no localhost/offline path, so it hard-blocked every APK build
  until hosting existed. That's a real requirement for local test builds
  (the actual ask), so the earlier "one build artifact instead of two"
  reasoning for preferring Bubblewrap no longer wins — Capacitor accepts a
  second artifact (this native bundle, alongside the PWA if one is ever
  hosted) in exchange for not needing hosting at all. The build ships a
  **debug**-signed APK (Android's own throwaway debug keystore) — good
  enough to sideload/test, but not for a Play Store release; that needs a
  proper release keystore, deliberately not set up until actually needed.
  `build_apk.sh` resolves `ANDROID_HOME` itself (env var if it points at a
  real directory, else `ANDROID_SDK_ROOT`, else this machine's known SDK
  install at `~/Android/sdk`) rather than trusting a possibly-stale export,
  and — Git Bash/MSYS only — runs the result through `cygpath -w` before
  exporting it: Gradle's `java.exe` is a native Windows process that can't
  resolve a POSIX-style path like `/c/Users/.../sdk`, and (unlike a
  command-line argument) MSYS doesn't path-mangle environment variable
  *values* for you, so a POSIX `ANDROID_HOME` fails deep inside Gradle with
  a misleading "SDK location not found" even though the directory is real.
  Windows has no packaging equivalent: `.github/workflows/tag.yml`'s
  `BUILD_TARGETS` repo variable and `task_build`'s `windows` branch in
  `scripts/dev.sh`/`dev.ps1` are still TODO stubs from the original devops
  scaffold, which assumed a distributable
  Windows package (MSIX/Electron/etc.) that was never decided on. The
  Windows *user experience* is already fully covered without one — browser
  tab (`scripts/run_web.ps1`), app window (`scripts/run_window_mode.ps1`), or
  a real PWA install via the browser's install icon — so don't add Windows
  binary packaging unless a Play-Store-style distribution need actually
  comes up. If it does, revisit `BUILD_TARGETS`/`SHIP_IMAGE` before the
  first `git tag`.
- **The app icon has one source of truth: `assets/main-icon.jpg`.** Every
  other icon file is derived from it, never hand-edited — `npm run icons`
  (`scripts/generate_icons.mjs`, using `sharp`) letterboxes it onto a white
  1024x1024 canvas at `assets/icon.png` (the square master; `main-icon.jpg`
  itself is a 588x340 banner with lettering running edge-to-edge, so a
  center-crop-to-square — which `@capacitor/assets` does to any non-square
  source — would slice into it) and renders the PWA manifest icons
  (`public/icons/icon-*.png`, `maskable-*.png` — the maskable pair gets an
  extra ~80% safe-zone shrink so adaptive-icon masks don't clip them).
  `scripts/build_apk.sh`/`.ps1` run `npm run icons` and then
  `npx @capacitor/assets generate --android` (scoped to Android only — this
  repo has no `ios/` project) on every build, since `android/` is
  regenerated from scratch each time and would otherwise silently revert to
  Capacitor's default launcher icon. To change the app icon, replace
  `assets/main-icon.jpg` and re-run `npm run icons`; don't edit the
  generated files directly.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
