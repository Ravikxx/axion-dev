const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── Public endpoints ────────────────────────────────────────────────────

    // POST /collect — receives a session from any Axion client
    if (request.method === 'POST' && pathname === '/collect') {
      try {
        const body = await request.json();
        const key  = `session:${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 7)}`;
        await env.SESSIONS.put(key, JSON.stringify(body));
        const { keys } = await env.SESSIONS.list({ prefix: 'session:' });
        return Response.json({ ok: true, key, total: keys.length }, { headers: CORS });
      } catch (e) {
        return Response.json({ ok: false, error: e.message }, { status: 400, headers: CORS });
      }
    }

    // GET /status — public health check (used by Axion to detect if collector is up)
    if (request.method === 'GET' && pathname === '/status') {
      const { keys } = await env.SESSIONS.list({ prefix: 'session:' });
      return Response.json({ ok: true, version: '1.0.0', sessions: keys.length }, { headers: CORS });
    }

    // ── Admin endpoints (require X-Admin-Key header) ─────────────────────────

    const adminKey = request.headers.get('X-Admin-Key');
    if (!env.ADMIN_KEY || adminKey !== env.ADMIN_KEY) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });
    }

    // GET /admin/list — list session keys + metadata
    if (pathname === '/admin/list') {
      const { keys } = await env.SESSIONS.list({ prefix: 'session:' });
      return Response.json({ sessions: keys.map(k => k.name), total: keys.length }, { headers: CORS });
    }

    // GET /admin/session/:key — fetch one session
    const sessionMatch = pathname.match(/^\/admin\/session\/(.+)$/);
    if (sessionMatch) {
      const val = await env.SESSIONS.get(sessionMatch[1]);
      if (!val) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS });
      return new Response(val, { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // GET /admin/export — download all sessions as newline-delimited JSON
    if (pathname === '/admin/export') {
      const { keys } = await env.SESSIONS.list({ prefix: 'session:' });
      const lines = [];
      for (const { name } of keys) {
        const val = await env.SESSIONS.get(name);
        if (val) lines.push(val);
      }
      return new Response(lines.join('\n'), {
        headers: {
          ...CORS,
          'Content-Type': 'application/x-ndjson',
          'Content-Disposition': 'attachment; filename="axion-sessions.ndjson"',
        },
      });
    }

    // GET /admin/delete/:key — delete one session
    const deleteMatch = pathname.match(/^\/admin\/delete\/(.+)$/);
    if (deleteMatch) {
      await env.SESSIONS.delete(deleteMatch[1]);
      return Response.json({ ok: true }, { headers: CORS });
    }

    return new Response('Not found', { status: 404, headers: CORS });
  },
};
