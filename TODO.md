# Axion TODO

## Computer use — cross-platform parity

- [x] **Annotated screenshots on Linux/macOS** — uses ImageMagick `convert` to draw a labeled grid (labels show logical pixel coords, handles Retina 2x via `identify`). Falls back to plain screenshot if `convert` is not installed.

- [x] **`pressKey` on macOS** — now uses `key code N using {mod down}` for special keys and Cmd/Option/Shift combos. `^` maps to command, `%` to option, `+` to shift (macOS convention). Runs via a temp .scpt file to avoid escaping issues.

- [x] **`mouseClick` double-click on macOS** — uses `cliclick dc:x,y` for true double-click when available; falls back to a single osascript invocation with 50ms inter-click delay so the OS registers it within the double-click threshold.

- [ ] **`ocrFindText()` on Linux/macOS** — currently Windows-only (uses Windows.Media.Ocr). Linux could use `tesseract` CLI; macOS has Vision framework via `osascript` or a small Swift helper.

- [ ] **`showOverlay()` on Linux/macOS** — coordinate overlay hint window is Windows-only. Linux could use a transparent GTK/Python window; macOS could use a Swift/AppleScript overlay.

- [ ] **`uiaClickElement()` on Linux/macOS** — UI Automation element finder is Windows-only. Linux has AT-SPI (`at-spi2`); macOS has Accessibility API via Swift. Both are significant work.

## CLI

- [ ] **`/web` link mode in chat sessions** — `axion --link` currently only works when the web server is in code mode. Full bidirectional sync between CLI and web chat would be useful.

- [x] **Streaming for OpenAI-compatible endpoints** — tightened the tool-error fallback condition so generic 400s (auth, model-not-found) from Ollama/LM Studio are no longer silently swallowed and now surface as real errors.

## Tooling

- [x] **`axion --doctor` — MCP server health** — now spawns each configured server, sends an MCP `initialize` handshake, and reports ok/fail per server (3s timeout, all servers checked in parallel).

- [x] **Auto-update check** — `axion --doctor` now compares local HEAD against remote via `git ls-remote` and prompts `axion --update` if behind.

## Docs / DX

- [x] **`.env.example`** — added with all API keys, OAuth vars, and AXION_* overrides.

- [ ] **Extension auto-reload** — Chrome extension needs to be manually reloaded after `node build.js`. Could add a watch mode.
