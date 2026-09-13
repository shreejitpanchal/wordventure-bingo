# Graph Report - wordventure-bingo  (2026-09-13)

## Corpus Check
- Corpus is ~3,975 words - fits in a single context window. You may not need a graph.

## Summary
- 69 nodes · 128 edges · 11 communities (8 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 1% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.7)
- Token cost: 70,521 input · 0 output

## Community Hubs (Navigation)
- CI & Release Workflows
- dev.sh Output & Dispatch Helpers
- dev.sh Task Implementations
- dev.ps1 Task Implementations
- dev.ps1 Log Capture Helpers
- dev.ps1 Compose & Graphify Tasks
- dev.ps1 Image & Scan Tasks
- dev.sh Image & Scan Tasks
- graphify CLAUDE.md Integration
- Project README

## God Nodes (most connected - your core abstractions)
1. `Invoke-Logged()` - 11 edges
2. `dev.sh script` - 11 edges
3. `run()` - 11 edges
4. `warn()` - 8 edges
5. `tag.yml workflow` - 6 edges
6. `tag.yml gates job (reuses ci.yml via workflow_call)` - 6 edges
7. `tag.yml release job (creates GitHub release, checksums, notes)` - 6 edges
8. `Warn()` - 5 edges
9. `c()` - 5 edges
10. `ci.yml workflow` - 5 edges

## Surprising Connections (you probably didn't know these)
- `wordventure-bingo project (kid-friendly word bingo PWA)` --references--> `tag.yml workflow`  [AMBIGUOUS]
  README.md → .github/workflows/tag.yml
- `SHA-pinned GitHub Actions convention` --semantically_similar_to--> `Double Trivy scan rationale (pre-push gate + post-push pushed-digest gate)`  [INFERRED] [semantically similar]
  .github/dependabot.yml → .github/workflows/tag.yml
- `Dependabot actions-minor grouping (minor/patch bumps, auto-mergeable)` --semantically_similar_to--> `Idempotent release creation (safe workflow re-run)`  [INFERRED] [semantically similar]
  .github/dependabot.yml → .github/workflows/tag.yml
- `tag.yml binaries job (cross-compile matrix per BUILD_TARGETS)` --references--> `scripts/dev.sh & dev.ps1 mirrored task runner`  [EXTRACTED]
  .github/workflows/tag.yml → .github/workflows/ci.yml
- `tag.yml gates job (reuses ci.yml via workflow_call)` --references--> `ci.yml workflow`  [EXTRACTED]
  .github/workflows/tag.yml → .github/workflows/ci.yml

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Tag-triggered release pipeline (plan -> gates -> image/binaries -> release)** — github_workflows_tag_plan_job, github_workflows_tag_gates_job, github_workflows_tag_image_job, github_workflows_tag_binaries_job, github_workflows_tag_release_job [EXTRACTED 1.00]
- **Dependabot action bumps verified by narrow-triggered CI** — github_dependabot, github_dependabot_actions_minor_group, github_workflows_ci [INFERRED 0.85]
- **Supply-chain hardening rationale cluster (pinning, OS drift, double scanning)** — github_dependabot_sha_pinned_actions, github_workflows_ci_os_pinning_rationale, github_workflows_tag_trivy_double_scan_rationale [INFERRED 0.75]

## Communities (11 total, 2 thin omitted)

### Community 0 - "CI & Release Workflows"
Cohesion: 0.23
Nodes (15): scripts/dev.sh & dev.ps1 mirrored task runner, Dependabot actions-minor grouping (minor/patch bumps, auto-mergeable), SHA-pinned GitHub Actions convention, ci.yml workflow, ci.yml gates job (build/vet/test/cov/scan matrix), No automatic push/PR triggers by design (tag-only pipeline), Runner OS version pinning vs. -latest label drift rationale, tag.yml workflow (+7 more)

### Community 1 - "dev.sh Output & Dispatch Helpers"
Cohesion: 0.27
Nodes (12): c(), expand(), finish(), host_arch(), host_os(), log_begin(), NO_COLOR, dev.sh script (+4 more)

### Community 2 - "dev.sh Task Implementations"
Cohesion: 0.27
Nodes (10): run(), task_build(), task_cov(), task_down(), task_graphify(), task_test(), task_up(), task_vet() (+2 more)

### Community 4 - "dev.ps1 Task Implementations"
Cohesion: 0.40
Nodes (5): Invoke-Logged(), Task-build(), Task-cov(), Task-test(), Task-vet()

### Community 5 - "dev.ps1 Log Capture Helpers"
Cohesion: 0.67
Nodes (4): Get-Log(), Get-Now(), Start-TaskLog(), Write-Finish()

### Community 6 - "dev.ps1 Compose & Graphify Tasks"
Cohesion: 0.50
Nodes (4): Task-down(), Task-graphify(), Task-up(), Warn()

### Community 7 - "dev.ps1 Image & Scan Tasks"
Cohesion: 0.67
Nodes (3): Build-Image(), Task-image(), Task-scan()

### Community 8 - "dev.sh Image & Scan Tasks"
Cohesion: 0.67
Nodes (3): build_image(), task_image(), task_scan()

## Ambiguous Edges - Review These
- `tag.yml workflow` → `wordventure-bingo project (kid-friendly word bingo PWA)`  [AMBIGUOUS]
  .github/workflows/tag.yml · relation: references

## Knowledge Gaps
- **2 isolated node(s):** `NO_COLOR`, `graphify query/path/explain/update workflow`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 12 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `tag.yml workflow` and `wordventure-bingo project (kid-friendly word bingo PWA)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `tag.yml workflow` connect `CI & Release Workflows` to `Project README`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `NO_COLOR`, `graphify query/path/explain/update workflow` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._