import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const DIR  = join(homedir(), '.axion');
const FILE = join(DIR, 'config.json');

function load() {
  try {
    if (!existsSync(FILE)) return {};
    return JSON.parse(readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

function save(data) {
  try {
    if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
    writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

const _cfg = load();

export function getSavedModel()   { return _cfg.model   || null; }
export function getSavedMode()    { return _cfg.mode    || null; }
export function getSavedApiKeys() { return _cfg.apiKeys || {}; }

// Returns map of name → {baseURL, model, apiKey}, migrating old single-endpoint format
export function getSavedCustomEndpoints() {
  if (_cfg.customEndpoints) return _cfg.customEndpoints;
  if (_cfg.customEndpoint?.baseURL) return { other: _cfg.customEndpoint };
  return {};
}

export function saveModel(model) {
  _cfg.model = model;
  save(_cfg);
}

export function saveMode(mode) {
  _cfg.mode = mode;
  save(_cfg);
}

export function saveApiKey(provider, key) {
  if (!_cfg.apiKeys) _cfg.apiKeys = {};
  _cfg.apiKeys[provider] = key;
  save(_cfg);
}

export function saveCustomEndpoints(map) {
  _cfg.customEndpoints = map;
  delete _cfg.customEndpoint;
  save(_cfg);
}

export function getAdviserModel() { return _cfg.adviserModel || null; }

export function saveAdviserModel(model) {
  _cfg.adviserModel = model || null;
  save(_cfg);
}

export function getCompareModels() { return _cfg.compareModels || null; }

export function saveCompareModels(models) {
  _cfg.compareModels = models;
  save(_cfg);
}

export function getSavedVisionModel() { return _cfg.visionModel || null; }

export function saveVisionModel(alias) {
  _cfg.visionModel = alias;
  save(_cfg);
}

export function getSavedImageModel() { return _cfg.imageModel || null; }

export function saveImageModel(alias) {
  _cfg.imageModel = alias;
  save(_cfg);
}

// ── Persistent memory ────────────────────────────────────────────────────────

const MEMORY_FILE = join(DIR, 'memory.json');

export function getMemories() {
  try {
    if (!existsSync(MEMORY_FILE)) return [];
    return JSON.parse(readFileSync(MEMORY_FILE, 'utf8'));
  } catch { return []; }
}

export function addMemory(text) {
  const list = getMemories();
  list.push({ text, addedAt: new Date().toISOString() });
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  writeFileSync(MEMORY_FILE, JSON.stringify(list, null, 2), 'utf8');
  return list;
}

export function removeMemory(index) {
  const list = getMemories();
  if (index < 0 || index >= list.length) return false;
  list.splice(index, 1);
  writeFileSync(MEMORY_FILE, JSON.stringify(list, null, 2), 'utf8');
  return true;
}

// ── Undo (file backup stack) ──────────────────────────────────────────────────

const BACKUPS_DIR = join(DIR, 'backups');
const _undoStack  = []; // { originalPath, backupPath }
const MAX_BACKUPS = 20;

export function backupFile(originalPath, content) {
  try {
    if (!existsSync(BACKUPS_DIR)) mkdirSync(BACKUPS_DIR, { recursive: true });
    const ts   = Date.now();
    const name = originalPath.replace(/[^a-zA-Z0-9.-]/g, '_').slice(-60);
    const dest = join(BACKUPS_DIR, `${ts}-${name}`);
    writeFileSync(dest, content, 'utf8');
    _undoStack.push({ originalPath, backupPath: dest });
    // Prune oldest backup if over cap
    if (_undoStack.length > MAX_BACKUPS) {
      const old = _undoStack.shift();
      try { unlinkSync(old.backupPath); } catch {}
    }
  } catch {}
}

export function undoLastBackup() {
  if (!_undoStack.length) return null;
  const { originalPath, backupPath } = _undoStack.pop();
  try {
    const content = readFileSync(backupPath, 'utf8');
    writeFileSync(originalPath, content, 'utf8');
    unlinkSync(backupPath);
    return originalPath;
  } catch (err) {
    return null;
  }
}

export function undoStackSize() { return _undoStack.length; }

// ── Chat save/resume ──────────────────────────────────────────────────────────

const CHATS_DIR = join(DIR, 'chats');

export function saveChat(name, { model, mode, tokenCount, agentHistory, displayMessages, tab = 'code' }) {
  if (!existsSync(CHATS_DIR)) mkdirSync(CHATS_DIR, { recursive: true });
  const data = {
    name,
    savedAt: new Date().toISOString(),
    model,
    mode,
    tab,
    tokenCount,
    // Strip tool-call internals from history — keep only user/assistant text
    agentHistory: agentHistory
      .map((m) => {
        if (m.role === 'user' && typeof m.content === 'string') return m;
        if (m.role === 'assistant' && typeof m.content === 'string') return m;
        if (m.role === 'user' && Array.isArray(m.content)) {
          // Flatten Anthropic tool results to text summary
          const text = m.content
            .filter((b) => b.type === 'tool_result')
            .map((b) => `[tool result: ${b.content?.slice?.(0, 200) ?? ''}]`)
            .join('\n');
          return text ? { role: 'user', content: text } : null;
        }
        if (m.role === 'assistant' && Array.isArray(m.content)) {
          const text = m.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
          return text ? { role: 'assistant', content: text } : null;
        }
        return null;
      })
      .filter(Boolean),
    // Strip diff arrays from display messages (files already written)
    displayMessages: displayMessages.map(({ diff: _d, ...m }) => m),
  };
  writeFileSync(join(CHATS_DIR, `${name}.json`), JSON.stringify(data, null, 2), 'utf8');
}

export function loadChat(name) {
  const file = join(CHATS_DIR, `${name}.json`);
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
}

export function deleteChat(name) {
  const file = join(CHATS_DIR, `${name}.json`);
  if (!existsSync(file)) return false;
  unlinkSync(file);
  return true;
}

export function exportChat(filename, messages) {
  const lines = [
    `# Axion Chat Export`,
    `*Exported: ${new Date().toLocaleString()}*`,
    '',
  ];
  for (const msg of messages) {
    if (msg.type === 'user') {
      lines.push(`## You\n\n${msg.content}\n`);
    } else if (msg.type === 'assistant') {
      lines.push(`## Axion\n\n${msg.content}\n`);
    } else if (msg.type === 'plan') {
      lines.push(`## Plan\n\n${msg.content}\n`);
    } else if (msg.type === 'info') {
      lines.push(`> ${msg.content}\n`);
    } else if (msg.type === 'tool') {
      lines.push(`> **${msg.name}** ${msg.output ? `→ ${String(msg.output).slice(0, 200)}` : ''}\n`);
    }
  }
  const outPath = join(process.cwd(), filename.endsWith('.md') ? filename : `${filename}.md`);
  writeFileSync(outPath, lines.join('\n'), 'utf8');
  return outPath;
}

// ── Macro save/load ───────────────────────────────────────────────────────────

const MACROS_DIR = join(DIR, 'macros');

export function saveMacro(name, steps) {
  if (!existsSync(MACROS_DIR)) mkdirSync(MACROS_DIR, { recursive: true });
  const data = { name, savedAt: new Date().toISOString(), steps };
  writeFileSync(join(MACROS_DIR, `${name}.json`), JSON.stringify(data, null, 2), 'utf8');
}

export function loadMacro(name) {
  const file = join(MACROS_DIR, `${name}.json`);
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, 'utf8')).steps; } catch { return null; }
}

export function listMacros() {
  if (!existsSync(MACROS_DIR)) return [];
  return readdirSync(MACROS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        const d = JSON.parse(readFileSync(join(MACROS_DIR, f), 'utf8'));
        return { name: d.name, steps: d.steps?.length ?? 0, savedAt: d.savedAt };
      } catch { return { name: f.slice(0, -5) }; }
    })
    .sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
}

export function deleteMacro(name) {
  const file = join(MACROS_DIR, `${name}.json`);
  if (!existsSync(file)) return false;
  unlinkSync(file); return true;
}

// ── Watch-and-learn (learned preferences) ────────────────────────────────────

const LEARNED_FILE = join(DIR, 'learned.md');

export function getLearnedInstructions() {
  try {
    if (!existsSync(LEARNED_FILE)) return '';
    return readFileSync(LEARNED_FILE, 'utf8').trim();
  } catch { return ''; }
}

export function appendLearnedInstructions(text) {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  const existing = getLearnedInstructions();
  const separator = existing ? '\n\n---\n\n' : '';
  const stamped   = `*Learned ${new Date().toLocaleString()}*\n\n${text.trim()}`;
  writeFileSync(LEARNED_FILE, existing + separator + stamped, 'utf8');
}

export function clearLearnedInstructions() {
  if (existsSync(LEARNED_FILE)) unlinkSync(LEARNED_FILE);
}

export function listChats() {
  if (!existsSync(CHATS_DIR)) return [];
  return readdirSync(CHATS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        const d = JSON.parse(readFileSync(join(CHATS_DIR, f), 'utf8'));
        return { name: d.name, model: d.model, savedAt: d.savedAt, messages: d.displayMessages?.length ?? 0, tab: d.tab || 'code' };
      } catch {
        return { name: f.slice(0, -5) };
      }
    })
    .sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
}

// ── Scheduled tasks ───────────────────────────────────────────────────────────

const SCHEDULES_FILE = join(DIR, 'schedules.json');
const RESULTS_DIR    = join(DIR, 'schedule-results');

export function getSchedules() {
  try {
    if (!existsSync(SCHEDULES_FILE)) return [];
    return JSON.parse(readFileSync(SCHEDULES_FILE, 'utf8'));
  } catch { return []; }
}

export function saveSchedules(list) {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  writeFileSync(SCHEDULES_FILE, JSON.stringify(list, null, 2), 'utf8');
}

export function saveScheduleResult(name, content) {
  if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
  const safe = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const ts   = new Date().toISOString().replace(/[:.]/g, '-');
  const file = join(RESULTS_DIR, `${safe}-${ts}.md`);
  writeFileSync(file, content, 'utf8');
  return file;
}

export function getScheduleResults(name) {
  if (!existsSync(RESULTS_DIR)) return [];
  const prefix = name ? name.replace(/[^a-zA-Z0-9_-]/g, '_') : null;
  return readdirSync(RESULTS_DIR)
    .filter(f => f.endsWith('.md') && (!prefix || f.startsWith(prefix + '-')))
    .sort()
    .reverse()
    .map(f => ({ file: join(RESULTS_DIR, f), name: f }));
}

export function searchChats(query) {
  if (!existsSync(CHATS_DIR)) return [];
  const q = query.toLowerCase();
  const hits = [];
  for (const f of readdirSync(CHATS_DIR).filter(f => f.endsWith('.json'))) {
    try {
      const d = JSON.parse(readFileSync(join(CHATS_DIR, f), 'utf8'));
      const matches = (d.displayMessages || [])
        .filter(m => (m.type === 'user' || m.type === 'assistant') &&
                     typeof m.content === 'string' &&
                     m.content.toLowerCase().includes(q))
        .map(m => ({ type: m.type, snippet: m.content.trim().slice(0, 140).replace(/\n+/g, ' ') }));
      if (matches.length) {
        hits.push({ name: d.name, model: d.model || '?', savedAt: d.savedAt, matches });
      }
    } catch {}
  }
  return hits.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
}
