# Feature Map: Pinza

> Seeded before any code exists. Every entry marked **(planned)** must be replaced with real paths, selectors and commands when its milestone lands (see `AGENTS.md` section 3).
> Milestones and flows: `BRIEF.md`. Reference screens: `docs/design/`.

## Line (planned, M1)

- What it is (user point of view): a clothesline at the top of the screen where every new screenshot hangs as a thumbnail.
- Sub-features: reveal on top-edge hover, reveal on shortcut, auto-hide, drop-in animation for new screenshots, "New" badge, max thumbnails with unhang of the oldest, hide in fullscreen.
- How to reach it in the UI: take a screenshot (Win + Print Screen), or move the cursor to the top edge, or press Ctrl + Alt + T.
- Keyboard shortcuts: Ctrl + Alt + T (configurable).
- Selectors for programmatic control: `line-root`, `line-thumb-<id>`, `line-thumb-new-badge` (planned).
- Code location: `src/features/line/`, `src/app/line/page.tsx`, `src-tauri/src/shelf/`, `src-tauri/src/windows_mgr/`, `src-tauri/src/platform/windows/` (fullscreen, cursor).
- Backend/API involved: events `screenshot:added`, `screenshot:removed`, `line:show`, `line:hide`; command `get_shelf` (planned).
- Known pitfalls: click-through must stay on outside thumbnails; transparent window must not steal focus; DPI scaling per monitor.
- Design: `docs/design/01-linea-desplegada.png`.

## Screenshot watcher (planned, M1)

- What it is (user point of view): Pinza notices new screenshots on its own.
- Sub-features: known-folder detection, custom folder, debounce until the PNG is fully written, pause watching.
- How to reach it in the UI: no UI; configured in Settings > Capturas and in onboarding step 1.
- Keyboard shortcuts: none.
- Selectors for programmatic control: none (drive it with `pnpm seed:screenshots`).
- Code location: `src-tauri/src/watcher/`, `src-tauri/src/thumbnails/`.
- Backend/API involved: emits `screenshot:added`; commands `pause_watching`, `resume_watching` (planned).
- Known pitfalls: Snipping Tool may write in several steps; the folder may be redirected (OneDrive); never watch the real folder in tests.

## Thumbnail gestures (planned, M2)

- What it is (user point of view): act on a screenshot directly from the line.
- Sub-features: hover action bar, click to copy, hold 0.4 s to annotate, double-click to open in the default viewer, drag out to Explorer or another app, move to Recycle Bin.
- How to reach it in the UI: reveal the line and hover or click a thumbnail.
- Keyboard shortcuts: none.
- Selectors for programmatic control: `thumb-action-copy`, `thumb-action-annotate`, `thumb-action-open`, `thumb-action-trash`, `thumb-hold-ring` (planned).
- Code location: `src/features/line/gestures/`, `src-tauri/src/commands/` (`copy_image`, `open_file`, `trash_file`, `start_drag`).
- Backend/API involved: `tauri-plugin-clipboard-manager`, `tauri-plugin-opener`, `tauri-plugin-drag`, crate `trash`.
- Known pitfalls: native drag-out cannot be verified over CDP alone, use `pnpm verify:native`; click vs double-click vs hold must not trigger each other.
- Design: `docs/design/02-gestos.png`.

## Annotation editor (planned, M3)

- What it is (user point of view): draw on a screenshot and save an annotated copy.
- Sub-features: select/move, pen, highlighter, arrow, line, rectangle, ellipse, text, numbered steps, pixelate/blur, crop, edit objects after drawing, undo/redo, zoom and pan, copy, save and close.
- How to reach it in the UI: hold a thumbnail for 0.4 s or click the pencil in its action bar.
- Keyboard shortcuts: V, P, H, A, L, R, E, T, N, B, C for tools; Ctrl+Z / Ctrl+Y; Ctrl+C; Ctrl+S; Ctrl + wheel; Ctrl+0; Delete; Ctrl+D.
- Selectors for programmatic control: `editor-tool-<name>`, `editor-color-<n>`, `editor-stroke`, `editor-undo`, `editor-copy`, `editor-save`, `editor-canvas` (planned).
- Code location: `src/features/annotate/`, `src/app/editor/page.tsx`, `src-tauri/src/commands/` (`save_annotated`).
- Backend/API involved: command `save_annotated` (planned), emits `screenshot:added` for the copy.
- Known pitfalls: export at the original resolution, not screen size; the original file must keep the same hash.
- Design: `docs/design/03-anotar.png`.

## Settings and tray (planned, M4)

- What it is (user point of view): configure Pinza and control it from the system tray.
- Sub-features: start with Windows, shortcut, watched folder, Recycle Bin vs permanent delete, reveal mode, visible time, max thumbnails, hide in fullscreen, tray menu (show/hide, open folder, pause, settings, quit), language.
- How to reach it in the UI: tray icon > Ajustes…
- Keyboard shortcuts: none of its own.
- Selectors for programmatic control: `settings-<key>` per row (planned).
- Code location: `src/features/settings/`, `src/app/settings/page.tsx`, `src-tauri/src/settings/`, `src-tauri/src/tray/`.
- Backend/API involved: `tauri-plugin-store`, `tauri-plugin-autostart`, `tauri-plugin-global-shortcut`; event `settings:changed` (planned).
- Known pitfalls: shortcut conflicts with other apps; tray menu is native, verify with `pnpm verify:native`.
- Design: `docs/design/04-ajustes-y-bandeja.png`.

## Onboarding (planned, M5)

- What it is (user point of view): a 3-step first-run wizard.
- Sub-features: screenshots folder, shortcut, start with Windows.
- How to reach it in the UI: first launch after install (or with an empty `PINZA_DATA_DIR`).
- Keyboard shortcuts: Enter for next, Esc for back.
- Selectors for programmatic control: `onboarding-step-<n>`, `onboarding-next`, `onboarding-back` (planned).
- Code location: `src/features/onboarding/`, `src/app/onboarding/page.tsx`.
- Backend/API involved: commands `get_default_screenshots_dir`, `complete_onboarding` (planned).
- Known pitfalls: must end with watching active and the onboarding window destroyed.
- Design: `docs/design/05-primer-arranque.png`.
