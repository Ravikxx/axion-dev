import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createServer } from 'http';
import { execSync } from 'child_process';
import { OAUTH_PROVIDERS } from './providers.js';

const DIR        = join(homedir(), '.axion');
const TOKEN_FILE = join(DIR, 'oauth.json');

// ── Token persistence ─────────────────────────────────────────────────────────

function loadTokens() {
  try {
    if (!existsSync(TOKEN_FILE)) return {};
    return JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
  } catch { return {}; }
}

function saveTokens(tokens) {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf8');
}

export function getOAuthToken(service) {
  return loadTokens()[service] || null;
}

export function listOAuthTokens() {
  const tokens = loadTokens();
  return Object.entries(tokens).map(([service, data]) => ({
    service,
    connectedAt: data.connectedAt,
    scopes:      data.scopes,
  }));
}

export function revokeOAuthToken(service) {
  const tokens = loadTokens();
  if (!tokens[service]) return false;
  delete tokens[service];
  saveTokens(tokens);
  return true;
}

// ── Device flow (GitHub + Google) ────────────────────────────────────────────

async function deviceFlow(provider, onStatus) {
  const cfg = OAUTH_PROVIDERS[provider];

  // Step 1: request device code
  const codeRes = await fetch(cfg.deviceCodeURL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body:    new URLSearchParams({ client_id: cfg.clientId, scope: cfg.scopes }),
  });
  const codeData = await codeRes.json();
  if (codeData.error) throw new Error(codeData.error_description || codeData.error);

  const { device_code, user_code, verification_uri, interval = 5, expires_in = 300 } = codeData;

  onStatus({ user_code, verification_uri });

  // Step 2: poll for token
  const deadline = Date.now() + expires_in * 1000;
  const pollMs   = (interval + 1) * 1000;

  while (Date.now() < deadline) {
    await sleep(pollMs);

    const tokenRes = await fetch(cfg.tokenURL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body:    new URLSearchParams({
        client_id:     cfg.clientId,
        client_secret: cfg.clientSecret,
        device_code,
        grant_type:    'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.access_token) return tokenData.access_token;
    if (tokenData.error === 'authorization_pending') continue;
    if (tokenData.error === 'slow_down') { await sleep(5000); continue; }
    throw new Error(tokenData.error_description || tokenData.error);
  }

  throw new Error('Authorization timed out — try again');
}

// ── Connect ───────────────────────────────────────────────────────────────────

export async function connectOAuth(service, { onStatus, onToken, pastedToken } = {}) {
  const cfg = OAUTH_PROVIDERS[service];
  if (!cfg) throw new Error(`Unknown service "${service}". Available: ${Object.keys(OAUTH_PROVIDERS).join(', ')}`);

  let accessToken;

  if (cfg.tokenFlow === 'paste') {
    if (!pastedToken) throw new Error(`paste_required`);
    accessToken = pastedToken.trim();
  } else if (cfg.tokenFlow === 'redirect') {
    accessToken = await redirectFlow(service, onStatus);
  } else {
    accessToken = await deviceFlow(service, onStatus);
  }

  // Save token
  const tokens = loadTokens();
  tokens[service] = {
    accessToken,
    connectedAt: new Date().toISOString(),
    scopes:      cfg.scopes || 'custom',
  };
  saveTokens(tokens);

  onToken?.(accessToken);
  return accessToken;
}

// ── Local redirect flow (Google Desktop app) ──────────────────────────────────

function openBrowser(url) {
  try {
    if (process.platform === 'win32')   execSync(`start "" "${url}"`, { stdio: 'ignore' });
    else if (process.platform === 'darwin') execSync(`open "${url}"`, { stdio: 'ignore' });
    else                                    execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
  } catch {}
}

async function redirectFlow(provider, onStatus) {
  const cfg  = OAUTH_PROVIDERS[provider];
  const port = await getFreePort();
  const redirectUri = `http://localhost:${port}`;

  const authUrl = `${cfg.authURL}?${new URLSearchParams({
    client_id:     cfg.clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         cfg.scopes,
    access_type:   'offline',
    prompt:        'consent',
  })}`;

  onStatus({ authUrl, port });
  openBrowser(authUrl);

  // Wait for browser to redirect back with ?code=...
  const code = await waitForCode(port);

  // Exchange code for token
  const tokenRes = await fetch(cfg.tokenURL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      code,
      client_id:     cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }),
  });
  const tokenData = await tokenRes.json();
  if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
  return tokenData.access_token;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

function waitForCode(port) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('Authorization timed out (2 minutes)'));
    }, 120_000);

    const server = createServer((req, res) => {
      const url    = new URL(req.url, `http://localhost:${port}`);
      const code   = url.searchParams.get('code');
      const error  = url.searchParams.get('error');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      if (code) {
        res.end('<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>✔ Connected!</h2><p>You can close this tab and return to Axion.</p></body></html>');
      } else {
        res.end('<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>✖ Authorization failed</h2><p>You can close this tab.</p></body></html>');
      }

      clearTimeout(timeout);
      server.close();
      if (code) resolve(code);
      else reject(new Error(error || 'Authorization denied'));
    });

    server.listen(port, '127.0.0.1');
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
