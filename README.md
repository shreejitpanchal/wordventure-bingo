# Wordventure Bingo

A kid-friendly word game app for ages 10+, with PowerPoint-style animations,
built as an offline-capable Progressive Web App (PWA). Playable on a Windows laptop
(Chrome/Edge) and installable to the home screen on Android — no login, no ads, no
backend. 🎯📝

For a map of how the codebase fits together (module boundaries, data flow,
the screen state machine), see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

First launch asks "Who's playing?" — pick a name (or add a new one). This
isn't a login: it's just a local label so siblings/family sharing one
device/tablet each keep their own streaks/stats for every mode, all
still stored only on-device. Tap the name button on the main menu (next to
the settings gear) to switch player at any time. The settings gear also
shows a "🏆 {name}'s Stats" summary — games played, wins, best streaks,
puzzles/rounds completed, and so on across all four modes — for whoever's
currently playing.

Four modes, picked from the main menu:
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
- **Sentence Quest** — a fill-in-the-blank grammar quiz: read a sentence
  with a missing word and pick the right one from four options, with an
  explanation shown after each answer. Its own category set targets
  specific grammar skills (Verb Tense, Prepositions, Synonyms & Antonyms,
  Idioms & Expressions, Grammar Basics) rather than Bingo/Wordscapes'
  vocabulary themes. Pick how many questions make up a round (5/10/15/20)
  in the menu. Consecutive rounds avoid reusing the previous round's
  questions where the pool allows it.
- **Synonym Safari** — a two-column tap-to-connect matching game: tap a word
  on the left, then its match on the right, to lock in a pair. Its own
  category set (Synonyms, Antonyms / Opposites) picks the word relation
  being tested rather than a vocabulary theme. **💡 Reveal a Pair** reveals
  one random remaining pair if you're stuck (repeatable) — using it means
  the round doesn't count toward your "rounds completed" stat, same as
  Wordscapes' hint. Pick how many pairs make up a round (4-8) in the menu.
  Consecutive rounds avoid repeating the previous round's words where
  possible, so playing several rounds in a row doesn't keep dealing the
  same small handful of pairs. Every round opens on a brief "get ready"
  intro panel (a safari-themed graphic and the round's category/difficulty)
  before the words themselves are revealed.

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
2. Register it in [src/data/wordBanks.ts](src/data/wordBanks.ts) (`WORD_BANKS` map).
3. Add its menu label to [src/data/wordBankLabels.ts](src/data/wordBankLabels.ts)
   (`WORD_BANK_CATEGORIES` -- this list is also the menu order; the label
   must match the JSON's `label` exactly, `npm test` checks it).
4. Add the new `CategoryId` to the union in [src/types.ts](src/types.ts).

Every rule above (24+ words per tier, unique words, matching labels, and
that Wordscapes can actually generate a puzzle from every tier) is checked
by `src/data/banks.test.ts`, so `npm test` fails on a broken bank before
it ever reaches a player.

The **Free Play** category (`src/data/wordbanks/freeplay.json`) additionally
merges in whatever a parent adds through the in-app Settings → Free Play Word
List editor (stored in `localStorage`, no difficulty tiers).

## Adding new Sentence Quest questions

Sentence Quest's question banks are separate from the word banks above —
plain JSON in [src/data/sentenceQuestBanks/](src/data/sentenceQuestBanks/),
same no-build-step editing. Each file has this shape:

```json
{
  "category": "verbTense",
  "label": "Verb Tense",
  "questions": [
    {
      "sentence": "Yesterday, she ___ to the store to buy some milk.",
      "options": ["went", "goes", "go", "going"],
      "answer": "went",
      "difficulty": "easy",
      "explanation": "\"Yesterday\" signals the past, so the verb should be \"went,\" the past tense of \"go\"."
    }
  ]
}
```

Rules:
- `sentence` must contain **exactly one** `"___"` (three underscores) marking
  the blank.
- `options` must have **exactly 4** entries, and `answer` must equal one of
  them exactly (including capitalization/punctuation).
- `explanation` is required and shown to the player right after they
  answer, correct or not — it's the actual teaching moment, not optional
  flavor text.
- Each category needs **at least 20 questions per difficulty tier** to
  support the largest round size (20 questions). Adding a category/tier
  short on questions will fail loudly at round-generation time rather than
  silently rendering a broken round.

To add a brand-new category:
1. Add a new JSON file under `src/data/sentenceQuestBanks/`.
2. Register it in [src/data/sentenceQuestBanks.ts](src/data/sentenceQuestBanks.ts)
   (`SENTENCE_QUEST_BANKS` map).
3. Add its menu label to
   [src/data/sentenceQuestLabels.ts](src/data/sentenceQuestLabels.ts)
   (`SENTENCE_QUEST_CATEGORIES` -- also the menu order; must match the
   JSON's `label`).
4. Add the new `SentenceQuestCategoryId` to the union in
   [src/types.ts](src/types.ts).

The structural rules above are checked by `src/data/banks.test.ts` on every
`npm test` (one blank, 4 distinct options, answer present once, unique
sentences, no doubled words, 20+ per tier). That pass is necessary, not
sufficient -- also read a real sample of any new sentences for grammar,
sense and kid-appropriateness; see `CLAUDE.md`'s "Sentence Quest mode".

## Adding new Synonym Safari pairs

Synonym Safari's word-pair banks are separate from everything above —
plain JSON in [src/data/synonymSafariBanks/](src/data/synonymSafariBanks/)
(`synonyms.json` and `antonyms.json`), same no-build-step editing. Each file
has this shape:

```json
{
  "relation": "synonym",
  "label": "Synonyms",
  "pairs": [
    { "word": "happy", "match": "joyful", "difficulty": "easy" }
  ]
}
```

Rules:
- `word` and `match` are both required; `word` must be **unique within the
  file** — a repeated `word` value risks the same source word appearing
  twice in a generated round with two different correct matches.
- There's no in-app "Mixed" category combining both files — each category
  (Synonyms, Antonyms / Opposites) plays only from its own bank.
- Each difficulty tier needs enough pairs that a generated round (up to 8
  pairs) doesn't feel repetitive — see `CLAUDE.md`'s "Synonym Safari mode"
  section for the target pool size and the reasoning behind it. Also note:
  the game itself avoids repeating the *previous* round's words where the
  pool allows it (see that same section), so pool size mainly matters for
  variety across many rounds, not for avoiding an immediate repeat.

To add a brand-new relation type (a 4th bank, e.g. "homophones"):
1. Add a new JSON file under `src/data/synonymSafariBanks/`.
2. Register it in
   [src/data/synonymSafariBanks.ts](src/data/synonymSafariBanks.ts)
   (`SYNONYM_SAFARI_BANKS` map).
3. Add its menu label to
   [src/data/synonymSafariLabels.ts](src/data/synonymSafariLabels.ts)
   (`SYNONYM_SAFARI_CATEGORIES` -- also the menu order; must match the
   JSON's `label`).
4. Add the new `SynonymSafariCategoryId` to the union in
   [src/types.ts](src/types.ts).

`src/data/banks.test.ts` checks the rules above on every `npm test`
(unique `word` per file, no repeated `match` within a tier, 8+ pairs per
tier, no pair matching a word to itself).

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

Consecutive puzzles avoid reusing the previous puzzle's words where the
word bank allows it, same idea as Synonym Safari's round-to-round variety
(see that section above).

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
detection, clue selection/formatting, Wordscapes grid generation, Sentence
Quest round generation, and Synonym Safari round generation/matching
(`src/lib/*.test.ts`, including `src/lib/wordscapes/`) — plus the mode
registry's stats arithmetic (`src/modes/modes.test.ts`) and the shipped
content banks' structural invariants (`src/data/banks.test.ts`). UI and
animation behavior is verified manually in-browser (desktop + Android).
