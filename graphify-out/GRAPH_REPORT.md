# Graph Report - wordventure-bingo  (2026-09-13)

## Corpus Check
- 58 files · ~25,009 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 376 nodes · 750 edges · 25 communities (18 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.84)
- Token cost: 280,288 input · 0 output

## Community Hubs (Navigation)
- Bingo Game Logic & Core Types
- Screens & Presentation Layer
- Build Tooling & Core Dependencies
- App Shell, Settings & Storage
- dev.sh Task Runner
- Wordscapes Puzzle Generation
- dev.ps1 Task Runner
- Project Documentation Concepts
- TypeScript Config (App)
- CI & Release Workflows
- Package devDependencies
- Android APK Packaging (Bubblewrap)
- Letter Wheel Interaction
- TypeScript Config (Node/Vite)
- run_window_mode.sh Script
- Game-Logic Conventions (CLAUDE.md)
- PWA App Icons
- run_web.sh Script
- README Dev & Test Docs
- build_apk.sh Script
- Pointer Capture Rationale

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `framer-motion` - 14 edges
3. `withReducedMotion()` - 13 edges
4. `Invoke-Logged()` - 12 edges
5. `run()` - 12 edges
6. `react` - 11 edges
7. `dev.sh script` - 11 edges
8. `WordEntry` - 10 edges
9. `scripts` - 9 edges
10. `GameScreen()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `graphify Knowledge Graph` --references--> `Wordventure Bingo (Project)`  [EXTRACTED]
  CLAUDE.md → README.md
- `PWA Meta Tags (theme-color, icons, description)` --implements--> `Offline-Capable PWA Architecture`  [INFERRED]
  index.html → README.md
- `Wordscapes Reuses Bingo Word Banks` --rationale_for--> `Word Banks (JSON Data)`  [EXTRACTED]
  CLAUDE.md → README.md
- `Android Packaging via Bubblewrap/TWA` --references--> `Bubblewrap PWA-to-TWA Packaging`  [INFERRED]
  CLAUDE.md → README.md
- `Reference to src/main.tsx` --references--> `App.tsx Screen State Machine`  [INFERRED]
  index.html → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Tag-triggered release pipeline (plan -> gates -> image/binaries -> release)** — github_workflows_tag_plan_job, github_workflows_tag_gates_job, github_workflows_tag_image_job, github_workflows_tag_binaries_job, github_workflows_tag_release_job [EXTRACTED 1.00]
- **Supply-chain hardening rationale cluster (pinning, OS drift, double scanning)** — github_dependabot_sha_pinned_actions, github_workflows_ci_os_pinning_rationale, github_workflows_tag_trivy_double_scan_rationale [INFERRED 0.75]
- **Dependabot action bumps verified by narrow-triggered CI** — github_dependabot, github_dependabot_actions_minor_group, github_workflows_ci [INFERRED 0.85]
- **Fail-Loud Validation Across Card and Grid Generation** — readme_generatecard, readme_gridgeneration_generatelevel, readme_fail_loud_rationale [INFERRED 0.85]
- **PWA-to-TWA Packaging Flow** — readme_pwa_architecture, readme_bubblewrap, claude_android_bubblewrap_packaging, index_html_pwa_meta [INFERRED 0.85]
- **Shared Word Bank Reuse Between Bingo and Wordscapes** — readme_word_banks, readme_bingo_mode, readme_wordscapes_mode, claude_wordscapes_reuse_wordbanks_rationale [INFERRED 0.85]

## Communities (25 total, 3 thin omitted)

### Community 0 - "Bingo Game Logic & Core Types"
Cohesion: 0.07
Nodes (48): vitest, BingoCard(), Props, BingoCell(), Props, ClueBanner(), Props, TYPE_LABEL (+40 more)

### Community 1 - "Screens & Presentation Layer"
Cohesion: 0.11
Nodes (34): framer-motion, WinInfo, WordscapesWinInfo, COLORS, Confetti(), Piece, CrosswordGrid(), Props (+26 more)

### Community 2 - "Build Tooling & Core Dependencies"
Cohesion: 0.07
Nodes (32): dependencies, framer-motion, react, react-dom, name, private, scripts, build (+24 more)

### Community 3 - "App Shell, Settings & Storage"
Cohesion: 0.16
Nodes (24): react, App(), Props, SettingsScreen(), WordListEditor(), addWord(), removeWord(), useReducedMotion() (+16 more)

### Community 4 - "dev.sh Task Runner"
Cohesion: 0.16
Nodes (26): c(), expand(), finish(), host_arch(), host_os(), log_begin(), NO_COLOR, run() (+18 more)

### Community 5 - "Wordscapes Puzzle Generation"
Cohesion: 0.17
Nodes (23): WordscapesGameScreen(), handleWordTraced(), showFeedback(), shuffle(), buildGrid(), buildWheel(), candidatePlacements(), canPlace() (+15 more)

### Community 6 - "dev.ps1 Task Runner"
Cohesion: 0.17
Nodes (17): Get-Log(), Get-Now(), Invoke-Logged(), Build-Image(), Task-build(), Task-cov(), Task-down(), Task-graphify() (+9 more)

### Community 7 - "Project Documentation Concepts"
Cohesion: 0.10
Nodes (22): graphify Knowledge Graph, MenuScreen Mode Selection, App.tsx Screen State Machine, storage.ts as Sole localStorage Access Point, Wordscapes Reuses Bingo Word Banks, index.html Entry Document, Reference to src/main.tsx, PWA Meta Tags (theme-color, icons, description) (+14 more)

### Community 8 - "TypeScript Config (App)"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+11 more)

### Community 9 - "CI & Release Workflows"
Cohesion: 0.23
Nodes (15): scripts/dev.sh & dev.ps1 mirrored task runner, Dependabot actions-minor grouping (minor/patch bumps, auto-mergeable), SHA-pinned GitHub Actions convention, ci.yml workflow, ci.yml gates job (build/vet/test/cov/scan matrix), No automatic push/PR triggers by design (tag-only pipeline), Runner OS version pinning vs. -latest label drift rationale, tag.yml workflow (+7 more)

### Community 10 - "Package devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, @bubblewrap/cli, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, @types/react, @types/react-dom (+8 more)

### Community 11 - "Android APK Packaging (Bubblewrap)"
Cohesion: 0.25
Nodes (9): Android Packaging via Bubblewrap/TWA, Hosting Not Yet Deployed (Open Item), .github/workflows/tag.yml BUILD_TARGETS, Windows Packaging Undecided (Open Item), Bubblewrap PWA-to-TWA Packaging, Bubblewrap Chosen Over Capacitor, scripts/build_apk.ps1 / build_apk.sh, BUILD_NUMBER File (versionCode) (+1 more)

### Community 12 - "Letter Wheel Interaction"
Cohesion: 0.36
Nodes (7): LetterWheel(), handlePointerDown(), handlePointerMove(), tileIndexAt(), Props, tilePosition(), WheelTile

### Community 13 - "TypeScript Config (Node/Vite)"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, strict, include

### Community 14 - "run_window_mode.sh Script"
Cohesion: 0.53
Nodes (4): is_node_process(), open_app_window(), port_owner_pid(), run_window_mode.sh script

### Community 15 - "Game-Logic Conventions (CLAUDE.md)"
Cohesion: 0.50
Nodes (4): Anagram Clue Derivation (clueMatching.ts), Injectable-RNG Pure Function Pattern, shuffle Utility (src/lib/random.ts), sequenceRng/seededRng Test Helpers (src/test/rng.ts)

### Community 16 - "PWA App Icons"
Cohesion: 0.50
Nodes (4): Wordventure Bingo PWA App Icon (192x192), Wordventure Bingo App Icon (512x512), Maskable App Icon (192x192), Maskable App Icon (512x512)

### Community 17 - "run_web.sh Script"
Cohesion: 0.83
Nodes (3): is_node_process(), port_owner_pid(), run_web.sh script

## Knowledge Gaps
- **98 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+93 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 120 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `framer-motion` connect `Screens & Presentation Layer` to `Bingo Game Logic & Core Types`, `Build Tooling & Core Dependencies`, `App Shell, Settings & Storage`, `Letter Wheel Interaction`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Package devDependencies` to `Build Tooling & Core Dependencies`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `react` connect `App Shell, Settings & Storage` to `Bingo Game Logic & Core Types`, `Screens & Presentation Layer`, `Build Tooling & Core Dependencies`, `Letter Wheel Interaction`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _98 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bingo Game Logic & Core Types` be split into smaller, more focused modules?**
  _Cohesion score 0.07373271889400922 - nodes in this community are weakly interconnected._
- **Should `Screens & Presentation Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.10569105691056911 - nodes in this community are weakly interconnected._
- **Should `Build Tooling & Core Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06554621848739496 - nodes in this community are weakly interconnected._