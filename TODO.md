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

- [ ] **Streaming for OpenAI-compatible endpoints** — some custom endpoints (Ollama, LM Studio) support streaming but the code may fall back to non-streaming for certain error shapes.

## Tooling

- [ ] **`axion --doctor` — MCP server health** — currently just lists configured servers from mcp.json. Could try spawning each server and checking it responds to a ping, reporting which ones are broken.

- [ ] **Auto-update check** — `axion --doctor` could check npm for a newer version and suggest `npm install -g axion-cli`.

## Docs / DX

- [ ] **`.env.example`** — referenced in README but may not exist in the repo.

- [ ] **Extension auto-reload** — Chrome extension needs to be manually reloaded after `node build.js`. Could add a watch mode.
