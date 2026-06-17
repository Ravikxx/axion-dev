import { mkdirSync, writeFileSync, appendFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { homedir } from 'os';
import { join, basename } from 'path';

const DEBUG_DIR = join(homedir(), 'axion-dev-debug');
const SCREENSHOTS_DIR = join(DEBUG_DIR, 'screenshots');
const SESSIONS_DIR = join(DEBUG_DIR, 'sessions');
const TOOLS_LOG = join(DEBUG_DIR, 'tools.log');

// Cost per 1M tokens (input/output) — update if pricing changes
const COST_PER_M = {
  input:  { 'claude-opus-4-8': 5.00, 'claude-sonnet-4-6': 3.00, 'claude-haiku-4-5': 1.00 },
  output: { 'claude-opus-4-8': 25.00, 'claude-sonnet-4-6': 15.00, 'claude-haiku-4-5': 5.00 },
};

function ensureDirs() {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  mkdirSync(SESSIONS_DIR, { recursive: true });
}

ensureDirs();

// Track last screenshot path for diff generation
let _lastScreenshotPath = null;

export function saveScreenshot(base64Data, suffix = '') {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const fname = `${ts}${suffix}.png`;
    const fpath = join(SCREENSHOTS_DIR, fname);
    writeFileSync(fpath, Buffer.from(base64Data, 'base64'));

    // Generate diff vs previous screenshot if ImageMagick is available
    if (_lastScreenshotPath && existsSync(_lastScreenshotPath)) {
      try {
        const diffPath = join(SCREENSHOTS_DIR, `${ts}-diff.png`);
        execSync(`compare -metric AE "${_lastScreenshotPath}" "${fpath}" "${diffPath}" 2>/dev/null || true`, { timeout: 5000 });
      } catch {}
    }
    _lastScreenshotPath = fpath;
    return fpath;
  } catch (err) {
    console.error('[debug] failed to save screenshot:', err.message);
  }
}

export function logVisionResponse(screenshotPath, prompt, response) {
  try {
    const ts = new Date().toISOString();
    const screenshotName = screenshotPath ? basename(screenshotPath) : 'unknown';
    const promptSnip = (prompt || '').slice(0, 120).replace(/\n/g, ' ');
    const responseSnip = (response || '').slice(0, 300).replace(/\n/g, ' ');
    const line = `[${ts}] vision screenshot=${screenshotName} prompt="${promptSnip}" response="${responseSnip}"\n`;
    appendFileSync(TOOLS_LOG, line);
  } catch (err) {
    console.error('[debug] failed to log vision response:', err.message);
  }
}

// Per-session tool call accumulator — reset on each saveSession call
let _sessionToolLog = [];

export function logToolCall(name, input, result, durationMs, iteration = null) {
  try {
    const ts = new Date().toISOString();
    const inputStr = JSON.stringify(input ?? {});
    const outputStr = typeof result?.output === 'string'
      ? result.output.slice(0, 200)
      : JSON.stringify(result ?? {}).slice(0, 200);
    const iterStr = iteration != null ? ` iter=${iteration}` : '';
    const line = `[${ts}]${iterStr} ${name} (${durationMs}ms) in=${inputStr.slice(0, 200)} out=${outputStr}\n`;
    appendFileSync(TOOLS_LOG, line);

    _sessionToolLog.push({ name, success: result?.success !== false, durationMs });
  } catch (err) {
    console.error('[debug] failed to log tool call:', err.message);
  }
}

function estimateCost(inputTokens, outputTokens, modelAlias) {
  const modelKey = Object.keys(COST_PER_M.input).find(k => (modelAlias || '').includes(k.split('-').slice(0, 3).join('-'))) || 'claude-sonnet-4-6';
  const inCost  = (inputTokens  / 1_000_000) * (COST_PER_M.input[modelKey]  ?? 3.00);
  const outCost = (outputTokens / 1_000_000) * (COST_PER_M.output[modelKey] ?? 15.00);
  return (inCost + outCost).toFixed(4);
}

export function saveSession(history, modelAlias, inputTokens = 0, outputTokens = 0) {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const fname = `${ts}.json`;
    const fpath = join(SESSIONS_DIR, fname);

    const totalTools = _sessionToolLog.length;
    const failed = _sessionToolLog.filter(t => !t.success);
    const costUsd = estimateCost(inputTokens, outputTokens, modelAlias);

    const payload = {
      timestamp: new Date().toISOString(),
      model: modelAlias,
      tokens: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
      estimatedCostUsd: costUsd,
      toolSummary: {
        total: totalTools,
        failed: failed.length,
        failedTools: failed.map(t => t.name),
      },
      history,
    };
    writeFileSync(fpath, JSON.stringify(payload, null, 2));

    // Append session summary line to tools.log
    const failStr = failed.length ? ` | FAILED: ${failed.map(t => t.name).join(', ')}` : '';
    const summaryLine = `[${new Date().toISOString()}] SESSION END — model=${modelAlias} tools=${totalTools} failed=${failed.length} tokens=${inputTokens}in/${outputTokens}out cost=$${costUsd}${failStr}\n`;
    appendFileSync(TOOLS_LOG, summaryLine);

    // Reset accumulator for next session
    _sessionToolLog = [];
    _lastScreenshotPath = null;

    return fpath;
  } catch (err) {
    console.error('[debug] failed to save session:', err.message);
  }
}
