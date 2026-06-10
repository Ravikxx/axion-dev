# Axion TODO

## Computer use — cross-platform parity

- [ ] **Annotated screenshots on Linux/macOS** — `captureScreenAnnotated()` falls back to a plain screenshot on non-Windows, losing the coordinate grid the agent uses to aim clicks. Need to draw the grid using ImageMagick (`convert`) or a Node canvas library (`@napi-rs/canvas`). Windows already does this via GDI+.

- [ ] **`pressKey` on macOS** — current implementation uses `osascript keystroke` which only works for printable characters, not key combos like Cmd+C or F-keys. Needs a proper key-code mapping using `osascript key code` with modifier flags, or `cliclick` key support.

- [ ] **`mouseClick` double-click on macOS** — `osascript click at {x, y}` doesn't accept a repeat count; the `times` parameter is ignored. Need to loop the osascript call or find an alternative.

- [ ] **`ocrFindText()` on Linux/macOS** — currently Windows-only (uses Windows.Media.Ocr). Linux could use `tesseract` CLI; macOS has Vision framework via `osascript` or a small Swift helper.

- [ ] **`showOverlay()` on Linux/macOS** — coordinate overlay hint window is Windows-only. Linux could use a transparent GTK/Python window; macOS could use a Swift/AppleScript overlay.

- [ ] **`uiaClickElement()` on Linux/macOS** — UI Automation element finder is Windows-only. Linux has AT-SPI (`at-spi2`); macOS has Accessibility API via Swift. Both are significant work.

## CLI

- [ ] **`/web` link mode in chat sessions** — `axion --link` currently only works when the web server is in code mode. Full bidirectional sync between CLI and web chat would be useful.

- [x] **Streaming for OpenAI-compatible endpoints** — tightened the tool-error fallback condition so generic 400s (auth, model-not-found) from Ollama/LM Studio are no longer silently swallowed and now surface as real errors.

## Tooling

- [ ] **`axion --doctor` — MCP server health** — currently just lists configured servers from mcp.json. Could try spawning each server and checking it responds to a ping, reporting which ones are broken.

- [x] **Auto-update check** — `axion --doctor` now compares local HEAD against remote via `git ls-remote` and prompts `axion --update` if behind.

## Docs / DX

- [x] **`.env.example`** — added with all API keys, OAuth vars, and AXION_* overrides.

- [ ] **Extension auto-reload** — Chrome extension needs to be manually reloaded after `node build.js`. Could add a watch mode.
