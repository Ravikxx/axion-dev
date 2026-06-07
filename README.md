# Axion — by Axion Labs

A terminal AI coding agent. Works from any directory.

## Quick install

```bash
cd axion
npm install
npm install -g .
```

Then just type `axion` from anywhere:

```bash
axion
axion --model gpt --mode auto
axion --model groq --mode plan
```

## API keys

Set before running (or use `/api` inside the chat):

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
export GROQ_API_KEY=gsk_...
export MISTRAL_API_KEY=...
```

Or put them in `.env` in the directory where you run `axion`.

## CLI flags

```
--model <name>   Starting model  (default: claude)
--mode  <name>   Starting mode   (default: ask)
-m               Alias for --model
-M               Alias for --mode
```

## Commands

| Command             | Description                          |
|---------------------|--------------------------------------|
| `/help`             | Show all commands                    |
| `/model <name>`     | Switch model mid-session             |
| `/mode <name>`      | Switch mode: ask · plan · auto       |
| `/api <model> <key>`| Set an API key live (no restart)     |
| `/clear`            | Clear chat history                   |
| `/exit`             | Quit                                 |

## Models

| Alias           | Provider  | Model                      |
|-----------------|-----------|----------------------------|
| `claude`        | Anthropic | claude-sonnet-4-6          |
| `claude-opus`   | Anthropic | claude-opus-4-8            |
| `claude-haiku`  | Anthropic | claude-haiku-4-5-20251001  |
| `gpt`           | OpenAI    | gpt-4o                     |
| `gpt-mini`      | OpenAI    | gpt-4o-mini                |
| `groq`          | Groq      | llama-3.3-70b-versatile    |
| `groq-fast`     | Groq      | llama-3.1-8b-instant       |
| `mistral`       | Mistral   | mistral-large-latest       |
| `mistral-small` | Mistral   | mistral-small-latest       |
| `veil`          | Veil      | *(no key required)*        |

## Action modes

- **ask** — confirms every tool call before running
- **plan** — shows a numbered plan, confirms before executing  
- **auto** — runs all tools without prompting

## Tools

`read_file` · `write_file` · `list_directory` · `run_command` · `git_status` · `git_diff` · `git_commit` · `git_push` · `web_search`

## Rebuilding after edits

```bash
cd axion
node build.js
# Re-run npm install -g . to update the global install
npm install -g .
```
