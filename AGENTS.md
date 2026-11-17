# AGENTS.md

> Operating manual for AI agents working on **Pinza**, a Windows 10/11 desktop app that hangs every new screenshot on a "clothesline" at the top of the screen (Tauri 2 + Rust + Next.js static export + Tailwind CSS + Motion).
> Methodology adapted from Lauren Tan's agent workflow (verification-first, feature maps, hard constraints over soft rules, self-correcting loops, evals for skills), run through **ODD** and **RDD** in gentle-ai / gentle-shell.
> Product context, flows, stack and milestones live in `BRIEF.md`. Reference screens live in `docs/design/`. Read both before your first task.

---

## 0. Core principle: verify, don't guess

You are a capable engineer with **zero business context** who joined five seconds ago. Your output is only trusted when it is **verified by actually running the software**, the same way a real user would use it.

- **Never** state a root cause ("found the smoking gun") without evidence from code you actually read **and** behavior you actually observed.
- **Never** hand verification back to the human. The human is not your test runner. If you cannot verify something, say so explicitly and explain what is missing.
- Correct code is the minimum bar. Good code is enforced by the constraints in section 5.
- Pinza is Windows-only. Real verification needs a Windows 10/11 machine or VM with WebView2. A green run on Linux or macOS proves nothing about the app.

---

## 1. The agent loop (mandatory for every task)

Run this loop autonomously. Do not stop and ask the human unless you are blocked by something only a human can provide (credentials, a product decision, an irreversible action).

The loop runs inside **ODD** (Authorize, Explore, Resolve uncertainty, Classify, Track, Implement, Close). Substantial work is tracked in one feature document, `odd/tasks/<feature-name>.md`, mirrored to Engram under `odd/<feature-name>/tasks`. TDD is enabled: observed RED, then GREEN, then REFACTOR.

```
1. UNDERSTAND   → Restate the task. Map it to a feature using the Feature Map (section 3).
                  Create or update odd/tasks/<feature-name>.md before the first write.
2. REPRODUCE    → For bugs: reproduce it in the running app BEFORE touching code.
                  For features: define how you will verify it works (acceptance check),
                  written as acceptance criteria in the ODD feature document.
3. INVESTIGATE  → Read the code that is actually involved. Use sub-agents to search in parallel.
                  Form hypotheses, then confirm each one with evidence (logs, traces, tests).
4. IMPLEMENT    → Follow existing conventions. The shortest path must be the correct path (section 5).
                  Write the failing test first (Vitest for the web, cargo test for Rust).
5. VERIFY       → Run the app with the verification skill (section 2). Observe the real behavior.
                  Run static checks: pnpm typecheck, pnpm lint, pnpm test, pnpm arch
                  (or all four at once with pnpm verify).
6. SELF-CORRECT → If anything fails, go back to step 3 with the new evidence. Repeat.
                  Do not exit the loop until verification and all checks are green.
7. DELIVER      → Split into atomic PRs against dev (section 6). Report what you verified and how.
                  RDD review runs on the frozen change; evidence goes in the review receipt.
8. LEARN        → If you hit a failure mode that a rule could have prevented, propose a new
                  lint / CI check / skill (section 5.3).
```

### Loop exit criteria (all must be true)

- [ ] The bug no longer reproduces / the feature behaves as specified **in the running app**.
- [ ] Evidence is attached: screenshot, trace summary, console output, test output, or metric before/after.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm arch` pass locally.
- [ ] No new violations of the hard constraints (section 5.1).
- [ ] No performance regression on the affected path (section 4, if applicable).
- [ ] The ODD feature document has its evidence, progress and next step updated.

### Special case: "already fixed?"

When reproducing a bug report, first check it against the latest `dev`. If it does not reproduce on `dev`, report: *"Reproduced on vX.Y.Z (the release named in the report), already fixed on dev, needs a release."* Do not write code.

---

## 2. Verification skill

The agent must be able to operate the application exactly like a user and inspect it like an engineer. Every window is a WebView2 (Chromium) page, so the Chrome DevTools Protocol works against the running app once remote debugging is enabled.

| Capability | How in this project |
|---|---|
| Launch a dev build | `pnpm dev:debug` (runs `pnpm tauri dev` with `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222`, plus `PINZA_WATCH_DIR` and `PINZA_DATA_DIR` pointing to temp folders) |
| Programmatic UI control | Playwright `chromium.connectOverCDP('http://localhost:9222')`, one page per Tauri window (`line`, `editor`, `settings`, `onboarding`). Native-only behavior (global shortcut, tray menu, drag-out to Explorer, top-edge hover over other apps) through `pnpm verify:native`, a PowerShell harness in `scripts/verify/` that sends real input and checks the result on disk or screen |
| Screenshots | `pnpm verify:shot <window>` for a single WebView; `pnpm verify:desktop-shot` for the whole desktop (needed for the transparent `line` window over other apps) |
| Console / logs | `pnpm verify:logs` (Rust logs from `tauri-plugin-log` in `%LOCALAPPDATA%\<bundle identifier>\logs\`, plus WebView console captured over CDP) |
| CPU / performance traces | `pnpm verify:trace <window> <scenario>` (CDP tracing while running a scenario such as `drop`, `reveal`, `unhang`, `drag`) |
| Heap snapshots / memory | `pnpm verify:heap <window>` (CDP `HeapProfiler`), plus process memory from `Get-Process` |
| Network inspection | `pnpm verify:network`: Pinza must make **zero** network requests; the check fails on any request outside the Tauri asset and IPC protocols |
| API / backend checks | No HTTP backend. Rust commands are covered by `cargo test`; the IPC surface by `pnpm verify:ipc` (debug-only smoke test of every typed command from `src/shared/ipc/`) |
| Test data / seed | `pnpm seed:screenshots` copies fixture PNGs from `e2e/fixtures/screenshots/` into `PINZA_WATCH_DIR`, one by one, to simulate real captures |
| Test credentials | No accounts. Use a dedicated Windows test profile or VM and the temp folders above. **Never** point tests at the user's real Screenshots folder |

Rules:
- Verification is done against the **real running app**, not by reading code and assuming.
- When analyzing a trace, cite the concrete function/long task you found, not a vague impression.
- If the verification tooling itself is broken, fixing it has priority over the original task, and you must say so.
- Building this tooling is part of milestone M0. Until a command exists, say which check you could not run and why.

---

## 3. Feature Map

The Feature Map lives at `docs/feature-map.md`. It teaches you **where every feature is and how to reach it**, so vague reports ("the clothesline is laggy", a screenshot with "???") can be mapped to code and to a reproduction path.

### Format for each entry

```markdown
## <Feature name>
- What it is (user point of view): <one line>
- Sub-features: <sub-feature>, <sub-feature>
- How to reach it in the UI: <navigation steps>
- Keyboard shortcuts: <shortcuts>
- Selectors for programmatic control: <data-testid values>
- Code location: <src/features/... and src-tauri/src/...>
- Backend/API involved: <Tauri commands and events>
- Known pitfalls: <notes>
```

### Maintenance

- **Creating it:** a seeded version with the planned features already exists. Replace planned paths, selectors and commands with real ones as each milestone lands.
- **Maintaining it:** any PR that adds, moves, renames or removes a feature, window, route, shortcut, Tauri command, event or selector **must update the Feature Map in the same PR**.
- If you could not find a feature quickly using the map, that is a defect in the map: fix it.

---

## 4. Investigation discipline (anti-hallucination)

- Read the files that are actually affected before proposing a cause. Check your own tool calls: if you did not open the relevant code, you do not know the answer yet.
- Use sub-agents for wide searches (call sites, related features, history) and keep the main agent as coordinator.
- Use `git log` / `git blame` on the affected files: the git history is a primary source of context. The ODD feature document in `odd/tasks/` is the second one.
- Separate clearly in your report: **observed facts**, **hypotheses**, **confirmed causes**.
- Performance work on the WebView2 windows (above all `line`, which is always alive) and the Rust main process: target 60 fps, every frame must finish in ~16 ms. Look for long tasks (>16 ms), heavy computation or I/O on the render path (decoding full PNGs in the WebView instead of Rust thumbnails), polling from the web side while the line is hidden, animations on layout properties instead of `transform`/`opacity`, and work that leaked into the wrong process (file I/O in the WebView, UI state in Rust that the web should own).
- Budgets from `BRIEF.md` section 6: capture saved to thumbnail visible < 300 ms; ~0 % CPU while the line is hidden; < 150 MB for the whole app at rest with 10 thumbnails.

---

## 5. Constraints: hard beats soft

Enforcement layers, from strongest to weakest:

1. **Codebase architecture and conventions** (strongest: agents copy existing patterns)
2. **Static analysis**: compiler/type checker, lints, CI checks, dependency-graph checks
3. Rules files (this file)
4. Skills
5. Automated code review: gentle-ai native review through **RDD** (`gentle-ai review mode enable`), run on every PR to `dev`

Layers 1 and 2 make CI **red**. Layers 3 to 5 are soft: agents can forget them. Never rely only on soft layers for anything important.

### 5.1 Hard constraints (enforced by CI in this project)

| Constraint | Enforced by |
|---|---|
| Each web feature is colocated in one directory: `src/features/<feature-name>/` (`line`, `annotate`, `settings`, `onboarding`). Each native concern is one Rust module: `src-tauri/src/<module>/` | `pnpm arch` (dependency-cruiser) |
| Forbidden imports between features: `src/features/*` may only import from itself and `src/shared/*`. Only `src/shared/ipc/` may import `@tauri-apps/api` or any `@tauri-apps/plugin-*` / `@crabnebula/*` package. The web never touches the filesystem directly | `pnpm arch` (dependency-cruiser) + ESLint `no-restricted-imports` |
| Banned APIs / patterns: Next.js server features (`"use server"`, Route Handlers, `middleware.ts`, `next/headers`, `next/server`, `cookies()`); importing `framer-motion` (use `motion/react`); `console.log` (use the logger in `src/shared/`); in Rust, `unwrap()` / `expect()` outside tests (`clippy::unwrap_used`, `clippy::expect_used`) and `unsafe` outside `src-tauri/src/platform/windows/` (`#![deny(unsafe_code)]` at the crate root) | `pnpm lint` |
| No code comments that narrate history, chat instructions or decisions ("X said never do this"). Code must be self-explanatory; context goes in the PR description and the ODD feature document. Allowed exceptions: TSDoc / `///` doc comments on public APIs, a `// SAFETY:` comment above every `unsafe` block (required), links to Win32 or Tauri docs explaining non-obvious platform behavior, and `TODO(#<issue>)` with an issue number | `pnpm lint` |
| Strict typing, no escape hatches (`any`, `as unknown as`, `@ts-ignore`, `@ts-expect-error` without a linked issue, non-null `!` on IPC results; in Rust, `#[allow(...)]` on clippy lints without a reason) | `pnpm typecheck` + `pnpm lint` |
| The web app must stay statically exportable (`output: 'export'`): `next build` must succeed and produce the `line`, `editor`, `settings` and `onboarding` routes | `pnpm build:web` in CI |
| Pinza never makes network requests and never deletes user files permanently unless the user turned off "Move to Recycle Bin". File operations live only in `src-tauri/src/commands/` and are tested against temp folders | `pnpm verify:network` + `cargo test` |

### 5.2 Conventions ("the shortest path is the best path")

- Agents naturally take shortcuts, so the framework is designed so that **the quickest way to solve a problem is the correct way**.
- To create a new feature, Tauri command, event or window, copy the canonical pattern from `src/features/line/` (web feature), `src-tauri/src/commands/copy_image.rs` plus its typed wrapper in `src/shared/ipc/` (command), and `src-tauri/src/windows_mgr/` (window). Until those exist (before M2), follow the structure in `BRIEF.md` section 5.4 and make the first one exemplary. Do not invent a new structure.
- Animations: reuse the presets in `src/shared/motion/` (`springDrop`, `springSway`, `slideDown`, `unhang`, `lift`). Animate only `transform` and `opacity`. Every window root is wrapped in `MotionConfig reducedMotion="user"`.
- Every interactive element gets a `data-testid` and is listed in the Feature Map.
- ~80% of work on a feature should stay inside its own directory. If you need to touch many unrelated places, stop and reconsider the design.

### 5.3 Turning feedback into rules

Every time a human has to write a review comment saying "don't do this", that is a **smell**. Instead of only fixing the PR:

1. Fix the PR.
2. Propose how to make it impossible next time, in this order of preference:
   - eliminate the problem categorically (architecture/API change),
   - add a lint rule or CI check,
   - add a compiler/type-level constraint,
   - only as a last resort, add a line to this file or a skill.
3. Do **not** turn one-off review feedback into a global rule unless the human confirms it is durable.

---

## 6. Pull requests

- Split work into **multiple atomic PRs**; each PR describes one small, coherent change. No hard size cap, but a reviewer must be able to understand and revert it in isolation.
- Branch naming: `feature/<kebab-case>` or `fix/<kebab-case>`, always created from `dev`. Commit message format: Conventional Commits with the feature as scope (`feat(line): ...`, `fix(watcher): ...`, `test(annotate): ...`).
- Agents commit, push and open the PR **against `dev`** automatically. Nobody but Albert ever pushes to, merges into or opens PRs against `main`.
- PR description must contain:
  - **What & why** (link to the GitHub Issue `#<number>` if there is one, and always to `odd/tasks/<feature-name>.md`)
  - **How it was verified** (commands run, screenshots/traces, before/after metrics)
  - **Feature Map updated?** yes / not needed
  - **New constraint proposed?** (if section 5.3 applied)
- Auto-merge policy: **disabled**. Albert merges PRs into `dev` by hand after the RDD review, and promotes `dev` to `main` by hand. This may be relaxed later for specific areas only once verification + CI are trusted there.

---

## 7. Skills and how they are maintained

Skills live in `skills/`. Each skill encodes a lesson learned from an **observed failure mode** of agents (e.g. "stop guessing, read the code", "how to drive Pinza over CDP", "how to take a trace of the drop animation", "how to verify native drag-out").

### Eval playbook (run every time a skill is created or modified)

1. **Coordinator agent** writes a rubric of what the skill must achieve.
2. Coordinator spawns **N sub-agents**, each in its own directory with **neutral names** (sub-agents must not realize they are being evaluated, since that changes their behavior).
3. Each sub-agent performs a realistic task using the skill.
4. Coordinator scores every run against the rubric (e.g. 0 to 10).
5. A **judge agent on a different model** cross-checks the scores to remove self-bias.
6. Run across the models the team actually uses: the orchestrator and reviewer models configured in the gentle-shell profiles for this repo (the judge must come from a different model family than the one being scored).
7. **Hill-climb**: loop (modify skill → re-run eval) until the target score is reached (e.g. 10/10 on every rubric item) or progress stalls; then report.

Store evals in `evals/`.

---

## 8. Local first, then cloud and automations

- New verification skills are built and observed **locally** first, on Windows: watch how the agent drives the app, fix where it gets lost.
- Only after trusting it locally, run it in CI and cloud agents: GitHub Actions `windows-latest` runners (WebView checks over CDP only; tray, global shortcut and drag-out need an interactive desktop and stay local until a self-hosted Windows runner exists).
- Automations built on the same verification skills (planned, not part of v1):
  - **Bug triage bot** (`pinza-triage`): picks reports from GitHub Issues labelled `bug`, maps them to the Feature Map, reproduces in a clean environment, checks whether `dev` already fixes it, and opens a PR or posts findings.
  - **Nightly performance check**: runs `pnpm verify:trace line drop` and `reveal` on `dev` and flags any frame over 16 ms or regression against the last run.

Scale gradually: do not jump from 1 trusted agent to 100 parallel agents; untrusted parallelism only burns tokens.

---

## 9. Project reference

- Stack: Tauri 2 (Rust stable) for the native shell; Next.js 16.4 App Router as static export, React 19, TypeScript strict (TSX); Tailwind CSS v4; Motion (`motion/react`) for animation; Konva + react-konva and perfect-freehand for the annotation editor; Zustand; lucide-react; pnpm. Tauri plugins and crates: global-shortcut, clipboard-manager, opener, autostart, store, single-instance, log, `tauri-plugin-drag`, `notify`, `trash`, `image`, `windows`. Tests: Vitest, Testing Library, cargo test, Playwright over CDP. Full list in `BRIEF.md` section 4.
- Repo layout: `src/` (Next.js: `app/` routes per window, `features/`, `shared/` with `ipc/`, `motion/`, `i18n/`, `ui/`), `src-tauri/` (Rust: `commands/`, `watcher/`, `shelf/`, `thumbnails/`, `settings/`, `tray/`, `windows_mgr/`, `platform/windows/`), `odd/tasks/` (ODD feature documents), `docs/` (`design/`, `feature-map.md`), `e2e/`, `scripts/verify/`, `skills/`, `evals/`.
- Environments: local dev on Windows (`pnpm dev:debug`), CI on GitHub Actions `windows-latest`, release build (NSIS/MSI installer from the Tauri bundler). There are no servers and no production data.
- Domain glossary (below):
  - **Line** (*línea*): the transparent strip at the top of the screen where screenshots hang. Window `line`.
  - **Peg** (*pinza*): the clip that holds a thumbnail on the line.
  - **Hang / unhang** (*colgar / descolgar*): add a screenshot to the line / remove it from the line. Unhanging never deletes the file.
  - **Watched folder**: the folder Pinza monitors, by default the Windows Screenshots known folder.
  - **Annotated copy**: `<original name>_anotada.png`, written next to the original. The original is never modified.
  - **Reveal**: showing the line by hovering the top edge or pressing the shortcut.
- Owners / escalation: Albert is the product owner and the only person who merges into `dev` and promotes to `main`. Escalate product decisions, scope changes and anything listed below to him.
- Things you must never do: push, merge or open PRs against `main`; force-push `dev`; point tests or scripts at the user's real Screenshots folder; permanently delete user files; modify an original screenshot; add network calls, telemetry or analytics; disable lint rules, type checks or RDD review to get a green run; commit secrets or code-signing certificates; copy code, name or icon from Tendedero.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
