import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';
import { API_KEYS } from './config.js';

const os = platform();

// ── Helpers ───────────────────────────────────────────────────────────────────

function which(bin) {
  try { execSync(`which ${bin}`, { stdio: 'ignore', timeout: 2000 }); return true; } catch { return false; }
}

function ok(msg)   { process.stdout.write(`  \x1b[32m✓\x1b[0m  ${msg}\n`); }
function warn(msg) { process.stdout.write(`  \x1b[33m⚠\x1b[0m  ${msg}\n`); }
function fail(msg) { process.stdout.write(`  \x1b[31m✗\x1b[0m  ${msg}\n`); }
function head(msg) { process.stdout.write(`\n\x1b[1m${msg}\x1b[0m\n`); }

// ── Checks ────────────────────────────────────────────────────────────────────

function checkNode() {
  head('Node.js');
  const ver = process.versions.node.split('.').map(Number);
  if (ver[0] >= 18) ok(`Node.js ${process.versions.node}`);
  else fail(`Node.js ${process.versions.node} — v18+ required`);
}

function checkApiKeys() {
  head('API keys');
  const providers = [
    { key: 'anthropic',  label: 'Anthropic (claude)' },
    { key: 'openai',     label: 'OpenAI (gpt)' },
    { key: 'gemini',     label: 'Google (gemini)' },
    { key: 'groq',       label: 'Groq' },
    { key: 'mistral',    label: 'Mistral' },
    { key: 'openrouter', label: 'OpenRouter' },
    { key: 'tavily',     label: 'Tavily (web search)' },
  ];
  let anySet = false;
  for (const { key, label } of providers) {
    if (API_KEYS[key]) { ok(label); anySet = true; }
    else warn(`${label} — not set  (use /api or set env var)`);
  }
  if (!anySet) fail('No API keys configured — set at least one to use Axion');
}

function checkGit() {
  head('Git');
  if (which('git')) ok('git');
  else warn('git not found — git tools will not work');
}

function checkComputerUse() {
  head(`Computer use (${os})`);

  if (os === 'win32') {
    ok('PowerShell — always available on Windows');
    ok('Mouse / keyboard via SendInput (built-in)');
    ok('Screenshots via System.Drawing (built-in)');
    return;
  }

  if (os === 'darwin') {
    ok('osascript — always available on macOS');
    if (which('cliclick')) ok('cliclick — scroll support');
    else warn('cliclick not found — scroll falls back to arrow keys  →  brew install cliclick');
    ok('screencapture — always available on macOS');
    warn('Grant Accessibility + Screen Recording to Terminal in System Settings → Privacy & Security');
    return;
  }

  // Linux
  if (which('xdotool')) ok('xdotool — mouse, keyboard, scroll');
  else fail('xdotool not found — mouse/keyboard will not work  →  sudo apt install xdotool');

  if (which('scrot')) ok('scrot — screenshots');
  else warn('scrot not found — screenshots will not work  →  sudo apt install scrot');

  if (which('xclip')) ok('xclip — clipboard fallback for typeText');
  else warn('xclip not found — typeText relies on xdotool type only  →  sudo apt install xclip');

  if (which('xdpyinfo') || which('xrandr')) ok('screen size detection available');
  else warn('xdpyinfo/xrandr not found — screen size defaults to 1920×1080');

  if (process.env.DISPLAY || process.env.WAYLAND_DISPLAY) {
    ok(`Display: ${process.env.DISPLAY || process.env.WAYLAND_DISPLAY}`);
  } else {
    fail('No DISPLAY or WAYLAND_DISPLAY — computer use requires a running desktop session');
  }
}

function checkWebServer() {
  head('Web server');
  const pidFile = join(homedir(), '.axion', 'web-server.pid');
  const port = Number(process.env.AXION_WEB_PORT) || 3000;
  if (existsSync(pidFile)) ok(`PID file found — server likely running on port ${port}`);
  else warn(`Web server not running — start with /web inside Axion`);
}

function checkAxionDir() {
  head('Config');
  const dir = join(homedir(), '.axion');
  if (existsSync(dir)) ok('~/.axion directory exists');
  else warn('~/.axion not found — will be created on first run');

  if (existsSync(join(dir, 'config.json'))) ok('Saved config found');
  else warn('No saved config yet — use /api, /model etc. inside Axion to persist settings');
}

function checkMcp() {
  head('MCP');
  const mcpFile = join(homedir(), '.axion', 'mcp.json');
  if (!existsSync(mcpFile)) {
    warn('No MCP servers configured — use /mcp add or /mcp install');
    return;
  }
  try {
    const cfg = JSON.parse(readFileSync(mcpFile, 'utf8'));
    const servers = Object.keys(cfg.mcpServers || cfg || {});
    if (servers.length) ok(`${servers.length} server(s): ${servers.join(', ')}`);
    else warn('mcp.json exists but no servers configured');
  } catch {
    warn('mcp.json found but could not parse it');
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function runDoctor() {
  process.stdout.write('\n\x1b[1m◈ Axion Doctor\x1b[0m\n');
  checkNode();
  checkApiKeys();
  checkGit();
  checkComputerUse();
  checkWebServer();
  checkAxionDir();
  checkMcp();
  process.stdout.write('\n');
}
