# ◈ Axion

**Axion** is an open-source AI coding agent ecosystem built by Axion Labs. It includes a terminal CLI, a Chrome extension, a web UI, and an IDE integration — all sharing the same models, tools, and memory.

---

## What's included

| Component | Description |
|---|---|
| **CLI** | Terminal agent — reads, writes, and runs code in any directory |
| **Chrome Extension** | Browser sidebar — ask questions about pages, automate the web |
| **Web UI** | Browser-based chat with the same agent (`/web`) |
| **MCP Servers** | Connect Blender, GitHub, Notion, Slack, and more |
| **OAuth** | Connect GitHub and Google Drive/Calendar with `/oauth` |
| **Scheduled Tasks** | Run AI tasks on a schedule with `/schedule` |

---

## Installation

### Requirements
- [Node.js](https://nodejs.org) v18+
- npm

### Steps

```bash
git clone https://github.com/Ravikxx/axion.git
cd axion
npm install
node build.js
npm install -g .
```

Then run from anywhere:

```bash
axion
```

---

## API Keys

Set keys before running, or use `/api` inside the chat:

```bash
# Option 1 — environment variables
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
export GEMINI_API_KEY=...
export GROQ_API_KEY=gsk_...
export MISTRAL_API_KEY=...

# Option 2 — .env file (place in ~/.axion/.env or your project root)
# Copy .env.example to get started
cp .env.example ~/.axion/.env
```

Or set them live inside the CLI:

```
/api claude sk-ant-...
/api gpt sk-...
/api gemini AI...
```

---

## Models

| Alias | Provider | Notes |
|---|---|---|
| `claude` | Anthropic | claude-sonnet-4-6 |
| `claude-opus` | Anthropic | claude-opus-4-8 |
| `claude-haiku` | Anthropic | claude-haiku-4-5 |
| `gpt` | OpenAI | gpt-4o |
| `gpt-mini` | OpenAI | gpt-4o-mini |
| `gemini` | Google | gemini-2.0-flash |
| `gemini-2.5-pro` | Google | gemini-2.5-pro |
| `groq` | Groq | llama-3.3-70b |
| `mistral` | Mistral | mistral-large |
| `veil` | Axion Labs | No key required |
| `ollama` | Local | Requires Ollama running |

Switch models anytime:

```
/model gpt
/model gemini-2.5-pro
/model ollama
```

Add a custom OpenAI-compatible endpoint:

```
/endpoint my-model https://my-api.com/v1 my-model-id sk-...
```

---

## Modes

| Mode | Behavior |
|---|---|
| `ask` | Confirms every tool call before running |
| `plan` | Shows a plan first, then confirms |
| `auto` / `bypass` | Runs everything without asking |

Switch with `/mode auto` or press `Ctrl+P` to cycle.

---

## CLI Commands

```
/help                         show all commands
/model <name>                 switch model
/mode <name>                  switch mode: ask · plan · auto
/api <model> <key>            set API key
/endpoint <name> <url> [model] [key]   add custom endpoint
/thinking [on|off|tokens]     enable extended thinking
/web [port]                   open web UI in browser
/web stop                     stop web server

/oauth connect <service>      connect GitHub · Google · Notion · Slack
/oauth list                   show connected services
/oauth revoke <service>       disconnect

/schedule add <name> "<expr>" <prompt>   add scheduled task
/schedule list                list all tasks
/schedule run <name>          run a task now
/schedule results [name]      show result files

/mcp                          show connected MCP servers
/mcp add <name> <cmd> [args]  connect an MCP server
/mcp tools [name]             list available tools

/remember <text>              save a persistent note
/forget <index>               remove a note
/goal <description>           run autonomously until goal is met
/save <name>                  save current chat
/resume <name>                resume a saved chat
/export <filename>            export chat as markdown
/undo                         restore last overwritten file
/clear                        clear history
/exit                         quit
```

---

## Schedule formats

```
/schedule add morning-report "daily 09:00" Summarize my GitHub notifications
/schedule add weekly-review  "weekly mon 09:00" Review what I worked on this week
/schedule add price-check    "every 30m" Check Bitcoin price and alert if > 100k
```

Results are saved as markdown files in `~/.axion/schedule-results/`.

---

## OAuth integrations

Connect services to give the agent access to them:

```
/oauth connect github     → device flow, auto-adds GitHub MCP server
/oauth connect google     → opens browser, connects Drive + Calendar
/oauth connect notion     → paste integration token
/oauth connect slack      → paste bot token
```

To enable OAuth, register your own apps and add credentials to `~/.axion/.env`:

```
AXION_GITHUB_CLIENT_ID=...
AXION_GITHUB_CLIENT_SECRET=...
AXION_GOOGLE_CLIENT_ID=...
AXION_GOOGLE_CLIENT_SECRET=...
```

---

## Chrome Extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` folder from this repo
5. Click the Axion icon or press `Alt+Shift+A`

The extension sidebar lets you ask about the current page, run browser automation, take screenshots, and chat using any supported model — no API key required if using Veil. Links in AI responses are clickable and open in a new tab.

---

## Web UI

```
/web          # opens http://localhost:3000
/web 8080     # custom port
/web stop     # stop the server
```

The web UI shares the same agent session as the CLI.

---

## MCP Servers

Connect any Model Context Protocol server:

```
/mcp add github npx -y @modelcontextprotocol/server-github
/mcp add notion npx -y @modelcontextprotocol/server-notion
/mcp add blender /blender connect
```

Config is saved to `~/.axion/mcp.json`.

---

## Rebuilding after edits

```bash
node build.js       # rebuild CLI
node build-web.js   # rebuild web UI
npm install -g .    # update global install
```

---

## Project structure

```
axion/
├── src/
│   ├── agent/          # Agent loop, tools, models, MCP, OAuth APIs
│   ├── ui/             # CLI React/Ink UI
│   ├── web/            # Web server + React web client
│   ├── oauth/          # OAuth providers + flow
│   ├── config.js       # Models, providers, API keys
│   ├── persist.js      # Local storage (~/.axion/)
│   └── scheduler.js    # Scheduled tasks
├── extension/          # Chrome extension
├── mcp-servers/        # Bundled MCP servers (Blender)
├── build.js            # CLI bundler
└── build-web.js        # Web UI bundler
```

---

## License

MIT — made by [Axion Labs](https://github.com/Ravikxx)
