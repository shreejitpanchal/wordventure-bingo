# Wordventure Bingo

A kid-friendly word game app (ages 10+) delivered as an offline-capable
PWA — Windows (Chrome/Edge) and Android (installed to home screen). No backend,
no accounts, no ads, no network calls after first load. (Named local player
profiles exist — see "Player profiles" below — but they're just labeled
localStorage buckets on-device, not accounts: no auth, no network, nothing
that leaves the device.) Three modes, chosen from
the main menu: **Bingo** (the original word-bingo game), **Wordscapes**
(a word-connect crossword puzzle, in the style of PeopleFun's Wordscapes/Word
Cross — named "Wordscapes" as an in-app mode label only; that name is a
third party's trademark, so it must not appear in any app-store listing,
package id, or branding if this is ever published), and **Sentence Quest**
(a fill-in-the-blank grammar quiz — see "Sentence Quest mode" below).

For a diagram-first map of module boundaries, data flow, and the screen
state machine, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — this file
stays the detailed per-feature record of *why* things are shaped the way
they are; keep both in sync when either changes.

## Stack & architecture

- React + Vite + TypeScript, Framer Motion for all transitions/animations, CSS
  Modules for styling (no Tailwind, no UI framework).
- `vite-plugin-pwa` owns the manifest + service worker (`vite.config.ts`).
- **Safe-area insets are handled once, globally, on `body` (`index.css`)
  — not per-screen.** `index.html`'s `viewport-fit=cover` draws content
  edge-to-edge (required for `env(safe-area-inset-*)` to report real,
  non-zero values at all), so without reserving that space, content can
  render under the status bar/notch or the gesture-nav bar in a fullscreen
  PWA/APK — this first surfaced on `WordscapesGameScreen` and got a
  screen-local fix, then again on `MenuScreen` (its top bar buttons sat
  right against the status bar), which is what prompted centralizing it:
  `body` gets `padding: env(safe-area-inset-*)` on all four sides, and
  every screen's own `.screen` class sizes itself with `height: 100%` /
  `min-height: 100%` (never `vh`/`dvh`) so it's measured against that
  already-inset box automatically. **Every current and future `.screen`
  class must follow that same `100%`-not-`vh` rule** — a `vh`/`dvh` value
  always measures the raw viewport regardless of any ancestor's padding,
  which silently undoes the inset and reintroduces exactly this bug for
  that one screen. `#root`/`body`/`html` already chain `height: 100%`
  correctly for this (see `index.css`) — nothing else needs to change to
  add a new screen safely.
- No router: `src/App.tsx` is a single explicit screen state machine
  (`profile | menu | game | win | settings | wordscapes-game |
  wordscapes-win | sentence-quest-game | sentence-quest-win`) swapped via
  `AnimatePresence`. Don't introduce React Router or similar for what is a
  handful of screens. Mode selection (Bingo vs. Wordscapes vs. Sentence
  Quest) happens inside `MenuScreen`, not as a separate screen.
- No backend, no global state library: all persistence is `localStorage`
  behind `src/lib/storage.ts` (settings, player profiles, Bingo streaks,
  Wordscapes stats, Sentence Quest stats, the Free Play custom word list).
  That file is the only place allowed to touch `localStorage` directly.
  `App.tsx` holds the active profile name and the loaded streaks/stats in
  React state and passes them down explicitly as props — components never
  re-read "the current profile" from storage themselves, so who a given
  render's data belongs to is always traceable through props, not an
  implicit global.
- Game logic is framework-free and colocated in `src/lib/` (`cardGeneration`,
  `winDetection`, `clueMatching`, `caller` for Bingo; `wordscapes/gridGeneration`
  for Wordscapes; `sentenceQuest` for Sentence Quest) — pure functions
  taking an injectable `rng` parameter so they stay unit-testable without
  mocking `Math.random`. Keep new game-rule logic there, not inside
  components. Shared utilities (e.g. `shuffle`) live in `src/lib/random.ts`
  — reuse it rather than re-implementing per module.

## Player profiles

- **Named local profiles, not accounts.** `ProfileScreen` asks "Who's
  playing?" before the menu is reachable at all (`App.tsx`'s `screen`
  starts at `'profile'` whenever `getCurrentProfile()` is `null`) — pick an
  existing name or type a new one, both go through the same
  `createProfile`/`onChoose` path since creating is idempotent for a name
  already in the list. There's no password, no server, nothing that
  identifies a real person beyond whatever string they typed; it exists
  purely so siblings/family sharing one device/tablet don't have to see
  each other's streaks. A small `👋 {name}` button on `MenuScreen` (mirrors
  the settings gear, opposite corner) re-opens the picker to switch.
- **Only Bingo streaks and Wordscapes stats are scoped per profile**
  (`streaksKey`/`wordscapesStatsKey` in `storage.ts`, suffixed by name) —
  Settings and the Free Play word list stay device-wide. Those are a
  device/accessibility preference and shared content respectively, not
  per-player statistics, so scoping them per profile wasn't warranted; if
  that changes, thread the profile name into `WordListEditor`/`useSettings`
  the same explicit-prop way `App.tsx` already does for streaks/stats,
  don't have `storage.ts` reach for "the current profile" internally.
- **First-ever profile inherits pre-profile-era progress.** This feature
  shipped after the app already had real device-wide streaks/stats
  (unscoped `wordventure:streaks`/`wordventure:wordscapesStats` keys) — 
  `createProfile` copies those legacy keys into the new profile's scoped
  keys, but only when `getProfiles()` was empty (i.e. this is the very
  first name anyone's picked on this device), so upgrading doesn't
  silently zero out an existing player's progress. There's no way to know
  whose progress it was, so whoever picks a name first gets it; every
  profile created after that starts empty, correctly.

## Appearance settings (theme & font size)

- **Device-wide, not per-profile** — like the rest of `Settings` (see
  "Player profiles" above), theme and font size are accessibility/display
  preferences tied to the physical device, not a specific player.
- **Applied via a single `data-*` attribute swap on `<html>`
  (`useAppearance.ts`), not per-component theming.** `theme.css` already
  had a full `[data-theme='dark']` token set plus a `prefers-color-scheme`
  media-query fallback (`:not([data-theme='light'])`) from the original
  scaffold — it just had nothing ever setting the attribute. `Settings.theme`
  is `'system' | 'light' | 'dark'`: `'system'` *removes* `data-theme`
  entirely (falls through to the `prefers-color-scheme` block, i.e. follows
  the OS/browser), `'light'`/`'dark'` set it explicitly and win regardless
  of OS preference. `Settings.fontSize` is `'small' | 'medium' | 'large' |
  'xlarge'`, applied the same way via `data-font-size`, scaling `html`'s
  root `font-size` (87.5%/100%/112.5%/125%) — every `font-size` in this
  codebase is authored in `rem` (verified, no stray `px`/`em` sizes), and
  `rem` is always relative to the root element regardless of where else
  `font-size` is set, so this one attribute scales the *entire* app's text
  with zero per-component changes. Don't reach for a React theme
  context/provider or thread `settings` through every styled component for
  either of these — the whole point of doing it through `theme.css`'s
  existing CSS-variable/root-font-size mechanism is that components stay
  completely unaware of the current theme/font-size; they just consume
  `var(--color-*)` and `rem` like they always did.
- Researched via `C:\Development\python-adventure-kids` (a sibling,
  different-stack project) for how it structures the equivalent settings —
  named font-size scale keys and named theme presets, both persisted and
  applied at one global point — as a UX/data-model reference, not code to
  port; that Flet app has no CSS cascade, so it reapplies colors/sizes to
  every control manually on each change. This app's CSS-variable/root-`rem`
  approach is strictly less code and doesn't need that reference's
  "rebuild every view" repaint step.

## Hardware back button

- **The Android hardware/gesture back button (and desktop browser back) is
  wired to in-app navigation in `App.tsx`, not left to its default
  behavior.** Both a browser and Capacitor's default Android back handling
  just call `history.back()` if there's a history entry to go back to,
  else exit/minimize the app — since this app is a hand-rolled `screen`
  state machine with no router, it never pushed any history entry beyond
  the initial page load, so that condition was never met and back always
  fell straight through to "exit," which read as "the app just collapses
  and does nothing" from a deep screen.
- **Fix is explicit, deliberate `window.history.pushState(null, '')` calls
  at exactly the functions that leave `'menu'` for a divertable sub-flow**
  (`startGame`, `startWordscapes`, `openSettings`, `switchProfile`), paired
  with a `popstate` listener whose handler resolves "what does back do
  here" via a `switch (screen)` that calls the exact same functions each
  screen's own visible back/exit/Menu button already calls (`goToMenu`,
  `closeSettings`, or `setScreen('menu')` for the profile-switch case).
  `goToMenu`/`closeSettings`/that profile case deliberately do **not**
  push — they're the functions this handler calls to *consume* the entry,
  not create a new one. Don't add a push to any of them.
- **No stack bookkeeping needed, on purpose.** A screen only ever needs
  exactly one history entry, however many further screens it can lead to
  before returning to `'menu'` — e.g. `game` → `win` both resolve back to
  `'menu'` in a single hop (matching their own visible exit/Menu buttons,
  which don't have a "back to game" concept either), so `handleWin`/
  `playAgain`/`nextWordscapesPuzzle` don't push additional entries; the one
  pushed by `startGame`/`startWordscapes` already covers the whole
  sub-flow. If a future screen needs actual multi-level back (a real "go
  to the PREVIOUS specific screen, not always menu" need), this switch-
  statement approach won't scale to that — reach for a real stack
  (`history.state` carrying an app-level breadcrumb list) instead, don't
  bolt more cases onto the switch.
- **Visible back/exit/Menu buttons don't call `history.back()`
  themselves** — they call `setScreen(...)` directly, same as always. This
  can leave a pushed entry un-consumed at the browser level (e.g. opening
  Settings via the gear, then closing it with the visible Back button
  rather than hardware back). That's harmless: the dangling entry is
  silently absorbed by a later hardware back press with no visible effect
  (the `switch` no-ops on `'menu'`), at worst costing one extra press
  before the app actually exits. Making every visible button also drive
  `history.back()` to keep the two perfectly in sync isn't worth the risk
  of double-firing `handleBack` for that minor a polish gain.
- **On the native Android APK, `@capacitor/app`'s `backButton` event is
  the authoritative mechanism — not the `popstate` listener above.**
  Capacitor's docs say its default Android back handling calls
  `history.back()` for you, which is why the `pushState`/`popstate`
  approach above was tried first; real-device testing on the actual APK
  showed it did **not** reliably reach the app (hardware back still just
  closed it from Settings) — WebView-back-button-to-JS-history bridging
  apparently isn't trustworthy enough to depend on alone. A second
  `useEffect` in `App.tsx`, gated on `Capacitor.isNativePlatform()`,
  registers `CapacitorApp.addListener('backButton', ...)` and calls the
  *same* `handleBackRef.current()` resolver directly — no history
  involved at all. Registering that listener also **disables** Capacitor's
  default back handling entirely (per its own docs), so on native Android
  this listener becomes the sole back-press path; the `pushState` calls
  sprinkled through `startGame`/`startWordscapes`/`openSettings`/
  `switchProfile` become inert there but stay meaningful for the web/PWA
  case, where this plugin event doesn't exist and `popstate` is still the
  only mechanism. Keep both — don't remove the `popstate` path thinking
  the plugin superseded it, it only supersedes it *on native*.
- Researched via `C:\Development\python-adventure-kids` (a sibling,
  different-stack Flet/Flutter project) for the underlying concept: it
  intercepts the native back action (`can_pop = False` + `on_confirm_pop`,
  a `WillPopScope`-style hook — real-device testing there found the naive
  default just closes the app, same symptom reported here) and drives
  navigation from its own Python-side history stack instead. The
  `@capacitor/app` listener above is this app's equivalent of that direct
  native interception; the `popstate`/`pushState` mechanism is what's left
  for contexts (the web/PWA) where no such native hook exists.

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
- **Easy short-word pool sizes per category** (words of length 3-5 —
  `selectWordscapesPool`'s effective easy pool): spelling 169, animals 55,
  geography 46, science 45, freeplay 181 (started at 36/29/28/26/36; grew to
  62/../../../58 in one round of additions, then spelling/freeplay grew far
  further — see below). Grown specifically because a small pool +
  `wordCount: 3` visibly repeats words within a handful of games — a pool
  this size keeps any single word's chance of appearing in a given
  wordCount=3 puzzle under ~8% (was ~14% before, verified via a standalone
  script sampling 1000 generations). If repetition complaints come back at
  a low word count, the fix is more words here, not a generation-algorithm
  change — the algorithm already samples/places without bias (see
  "Wordscapes mode" below); repetition is a pure pool-size symptom.
  Keep new additions **balanced across 3/4/5 letters** and **free of
  duplicate `word` values within the same category file** (a repeated word
  string across difficulty tiers would let a card/puzzle draw two entries
  for the same word) — re-run the pool-size/duplicate check after editing
  any word bank.
- **`spelling` and `freeplay` additionally got a general vocabulary
  expansion** (not just short Wordscapes words): +450 words each, spread
  ~200 easy / ~125 medium / ~125 hard, bringing `spelling` to 582 total and
  `freeplay` to 530. `freeplay` had no `medium`/`hard` entries before this —
  it now does, purely for data-model consistency and clue-weighting/
  Wordscapes-length-cap purposes; **Bingo's `selectWordPool` still ignores
  `freeplay`'s difficulty tag entirely and always draws from the whole
  list** (`cardGeneration.ts`), so adding these tiers doesn't gate which
  words a `freeplay` game can show at a given difficulty setting the way it
  does for every other category — don't assume it does if you touch this
  later. Both files' additions were drafted by an agent per category, then
  independently re-verified (not just trusted) via the same duplicate/
  JSON-validity/generation-reliability checks used for every other word-bank
  change in this project.

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
- **`WordscapesGameScreen`'s `.screen` is a fixed-`height` (`100%`, not
  `min-height`) layout with exactly one flexible region (`.gridBox`,
  bounding just `CrosswordGrid`), and the grid always scales to fit inside
  it rather than scrolling.** A tall or awkwardly-shaped word set (a
  plus/zigzag grid that grows more vertically than horizontally — a small
  word count produces this just as easily as a large one) used to grow the
  *whole page*, scrolling the top bar out of reach and pushing the letter
  wheel/action buttons down under the device's status bar or gesture-nav
  bar in a fullscreen PWA/APK (`index.html`'s `viewport-fit=cover` draws
  content edge-to-edge; see "Stack & architecture" for the app-wide
  `env(safe-area-inset-*)` fix on `body` — this screen used to carry its
  own copy of that padding before it was centralized there). Two fixes,
  layered:
  1. `.screen` gets `overflow: hidden`; the top bar/feedback/hint slots and
     `.bottomControls` (wheel + assist buttons) are `flex-shrink: 0`; only
     `.gridBox` (`flex: 1; min-height: 0`) is allowed to flex — `min-height:
     0` is required on it, since a flex item won't shrink below its
     content's natural size otherwise, which would just push `.screen`
     tall again.
  2. `CrosswordGrid`'s own `.grid` no longer just caps `max-width` (which
     only ever bounded the horizontal axis — a grid taller than it is wide
     still overflowed vertically regardless of word count). It sets an
     inline `aspectRatio: '{cols} / {rows}'` and uses `max-width: min(100%,
     480px)` **and** `max-height: 100%` with `width/height: auto`, the
     standard "letterbox an aspect-ratio'd element inside a box" technique
     (same idea as `object-fit: contain` on an image) — the browser solves
     for the largest size that respects the aspect ratio and fits both
     axes of `.gridBox`. This is why every puzzle now fits in one view
     with no scrolling, at any word count, cell size shrinking as needed
     rather than the grid overflowing. **The two numbers here (`100%` and
     `480px`) each serve a different form factor this app targets — don't
     collapse this back to one or the other:**
     - On a **phone**, `.gridBox`'s width is always under 480px once
       `.screen`'s own padding is subtracted, so `min(100%, 480px)`
       resolves to `100%` — this is the load-bearing part of the fix. A
       hardcoded small ceiling here (an earlier pass used a flat
       `max-width: 380px`) silently wastes whatever extra *height*
       `.gridBox` has to offer too, since the browser picks the largest
       size fitting both axes — with width capped small, that "largest
       size" stays small even with plenty of vertical room, leaving the
       puzzle tiny with dead space above and below it.
     - On a **tablet**, `.gridBox` can easily be 700px+ wide — stretching
       the puzzle to fill that isn't "bigger," it's oversized and harder
       to scan. The `480px` ceiling caps it to this app's existing
       comfortable-content-width convention (`MenuScreen`/`ProfileScreen`
       sections use the same `max-width: 480px`), so a tablet gets a
       puzzle sized like a large phone's, centered with room around it.
  If a similarly tall-content screen is added later, follow the same
  pattern: fixed top chrome / one flexible fit-or-scroll middle region /
  fixed bottom chrome, not a single page that scrolls as a whole.
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

## Sentence Quest mode

- **Fill-in-the-blank grammar quiz — one sentence with a missing word,
  four multiple-choice options.** Built to directly target grammar/usage
  skill-building (verb tense, prepositions, synonyms/antonyms, idioms,
  and general grammar rules), which is why it has its **own category set**
  (`SentenceQuestCategoryId`: `verbTense`, `prepositions`,
  `synonymsAntonyms`, `idioms`, `grammarBasics`) instead of reusing Bingo/
  Wordscapes' topic categories (`spelling`/`animals`/`geography`/`science`/
  `freeplay`) — those are vocabulary themes, not grammar concepts, and
  don't map cleanly onto "test this specific grammar rule." Content lives
  in `src/data/sentenceQuestBanks/*.json`, registered in
  `src/data/sentenceQuestBanks.ts` (mirrors `wordBanks.ts`'s pattern
  exactly, just a parallel, unrelated registry — not an extension of it).
- **A round is `questionCount` (menu option, `QUESTION_COUNT_OPTIONS` =
  5/10/15/20 in `src/lib/sentenceQuest.ts`) questions sampled from the
  chosen category/difficulty pool.** `generateRound` shuffles which
  questions are picked *and* shuffles each question's own `options` order
  — the correct answer is never predictably in the same on-screen slot.
  Grading is always by string equality against `answer`, never by array
  index, so that shuffle can never cause a misgrade. Like `generateCard`/
  Wordscapes' `generateLevel`, it throws loudly if the pool can't fill a
  round rather than rendering a broken one — every category/difficulty
  needs at least `MAX_QUESTION_COUNT` (20) questions.
- **Every `sentence` must contain exactly one `"___"` marker** (checked by
  `splitSentence`, which throws otherwise) and **every question must have
  exactly 4 `options`, with `answer` equal to exactly one of them
  string-for-string.** These invariants are enforced by convention/review,
  not by a runtime guard in the game code itself — when adding or editing
  question-bank content, verify it with a script (see below), not by eye.
- **`explanation` is the actual teaching moment, not a footnote.**
  `SentenceQuestScreen` shows it immediately after the player answers,
  regardless of right or wrong — the point of this mode is building
  grammar understanding, so seeing *why* an answer is correct matters more
  than the score. Don't make `explanation` optional or skip rendering it
  to save space.
- **Stats are per-profile** (`SentenceQuestStats`, `sentenceQuestStatsKey`
  in `storage.ts`), same pattern as Wordscapes: `recordSentenceQuestRound`
  splits `roundsCompleted` (gated on `completed: true` — currently always
  true, since a round can only be reported via
  `SentenceQuestScreen`'s own completion flow, but the parameter exists
  for the same reason Wordscapes' `solved` flag does: an abandoned-partway
  round should be able to credit correct answers without counting as a
  full completion, if that path gets built later) from `correctAnswers`/
  `questionsAnswered`, which are always credited regardless. Unlike Bingo/
  Wordscapes, there's no pre-profile-era legacy key to migrate — this
  feature was added after profiles already existed, so it's profile-scoped
  from day one with nothing to inherit.
- **Content was authored in bulk by background agents, one per category**
  (mirroring how `spelling`/`freeplay`'s word-bank expansion was done),
  targeting ~100-150 questions per difficulty tier per category. Final
  counts: `verbTense` 318 (106/106/106), `prepositions` 356
  (112/122/122), `synonymsAntonyms` 325 (115/105/105), `idioms` 315
  (105/104/106), `grammarBasics` 338 (110/114/114) — **1652 questions
  total**. Each category file started with 6 hand-written example
  questions (2 per difficulty) that fixed the tone/quality bar/schema for
  its agent to match — those originals are still in each file, not just
  scaffolding to delete.
- **Structural validation (schema/duplicates/JSON-validity) cannot catch
  actual content bugs — independent review of every file's real content
  found and fixed several after the agents' own "ALL GOOD" self-checks
  had already passed:** a subject-verb agreement error baked into a
  templated clause (`"When the scientists **was** younger..."` — the
  template didn't fork on subject number), two he/she–his/her pronoun
  mismatches within a single sentence, a duplicated-determiner typo
  (`"standing among **the the** crowd"`), a self-contradictory question
  (a `"(the opposite of X)"` hint whose stated answer was the *same* word
  as `X`, not its antonym), and — most importantly — **one genuinely
  inappropriate word (`"Whore"`) that turned up as a plausible-looking
  misspelling among multiple-choice distractors**, caught only by
  actually reading sampled output, not by any schema check. None of this
  is a one-time cleanup: **any future edit to these files (agent-authored
  or hand-written) needs the same two-pass treatment** — first the
  structural script (exactly one `"___"` per sentence, exactly 4 options
  with `answer` present exactly once, no duplicate `sentence` values, no
  duplicated-word/double-space typos, valid JSON) — but treat that pass
  as necessary, not sufficient. **Also read a real sample of the actual
  generated sentences** (not just the validator's summary) before trusting
  new content, specifically checking for: grammar correctness in the
  sentence itself (not just the blank), sensible/non-contradictory
  sentence logic, and inappropriate language — this is a kids' app, so
  that last check isn't optional. A keyword sweep can help surface
  candidates but has real false-positive risk on short substrings inside
  innocent words (e.g. `"hell"` inside `"seashells"`) — verify each hit
  before treating it as real, don't blind-delete on a keyword match alone.
- Added a `--color-danger`/`--color-danger-dark` pair to `theme.css`
  specifically for this mode's right/wrong answer feedback — no prior
  screen needed a "this is wrong" color (Wordscapes' invalid-word feedback
  deliberately uses a neutral/muted style, not red, since a mistyped word
  is a minor slip, not a graded answer). A quiz's correct/incorrect
  distinction is the core feedback loop here, so it earns a real color
  rather than reusing the muted style.

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
