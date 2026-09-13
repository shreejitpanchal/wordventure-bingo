# Wordventure Bingo

A kid-friendly word bingo/puzzle game (ages 10+) delivered as an offline-capable
PWA — Windows (Chrome/Edge) and Android (installed to home screen). No backend,
no accounts, no ads, no network calls after first load.

## Stack & architecture

- React + Vite + TypeScript, Framer Motion for all transitions/animations, CSS
  Modules for styling (no Tailwind, no UI framework).
- `vite-plugin-pwa` owns the manifest + service worker (`vite.config.ts`).
- No router: `src/App.tsx` is a single explicit screen state machine
  (`menu | game | win | settings`) swapped via `AnimatePresence`. Don't
  introduce React Router or similar for what is a 4-screen app.
- No backend, no global state library: all persistence is `localStorage`
  behind `src/lib/storage.ts` (settings, streaks, the Free Play custom word
  list). That file is the only place allowed to touch `localStorage` directly.
- Game logic is framework-free and colocated in `src/lib/` (`cardGeneration`,
  `winDetection`, `clueMatching`, `caller`) — pure functions taking an
  injectable `rng` parameter so they stay unit-testable without mocking
  `Math.random`. Keep new game-rule logic there, not inside components.

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

## Testing

- Unit tests are colocated as `*.test.ts` next to the module they cover in
  `src/lib/`, using Vitest. They cover the correctness-critical logic only
  (card generation, win detection, clue selection/formatting) per the
  original spec — UI and animation are verified manually in-browser, not
  with component tests. Don't add `@testing-library/*`/`jsdom` back unless a
  future change actually needs DOM-level testing.
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
  URL (GitHub Pages/Netlify/Vercel — still undecided). This blocks
  `scripts/build_apk.ps1` (Bubblewrap needs a live manifest URL, not a local
  dev server) and the PWA-install docs in the README, which assume the app
  has a real URL to open. Resolve this before either matters in practice.
- **Android packaging is decided; Windows packaging is not.** Android ships
  via Bubblewrap/TWA (`scripts/build_apk.ps1`), wrapping the deployed PWA
  rather than bundling `dist/` — deliberately chosen over Capacitor so there's
  one build artifact (the live site) instead of two. Windows has no
  equivalent: `.github/workflows/tag.yml`'s `BUILD_TARGETS` repo variable and
  `task_build`'s `windows` branch in `scripts/dev.sh`/`dev.ps1` are still
  TODO stubs from the original devops scaffold, which assumed a distributable
  Windows package (MSIX/Electron/etc.) that was never decided on. The
  Windows *user experience* is already fully covered without one — browser
  tab (`scripts/run_web.ps1`), app window (`scripts/run_window_mode.ps1`), or
  a real PWA install via the browser's install icon — so don't add Windows
  binary packaging unless a Play-Store-style distribution need actually
  comes up. If it does, revisit `BUILD_TARGETS`/`SHIP_IMAGE` before the
  first `git tag`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
