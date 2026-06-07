import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── RichText renderer (markdown-lite) ────────────────────────────────────────

function RichText({ text }) {
  if (!text) return null;
  const segments = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      segments.push(<pre key={segments.length}><code>{codeLines.join('\n')}</code></pre>);
      i++;
      continue;
    }

    // Headings
    const hMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (hMatch) {
      const level = hMatch[1].length;
      const Tag = `h${level}`;
      segments.push(<Tag key={segments.length}>{hMatch[2]}</Tag>);
      i++;
      continue;
    }

    // Regular line — inline markup
    const inlined = renderInline(line);
    segments.push(<div key={segments.length}>{inlined || ' '}</div>);
    i++;
  }

  return <div className="rich-text">{segments}</div>;
}

function renderInline(text) {
  const parts = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const s = m[0];
    if (s.startsWith('`'))  parts.push(<code key={m.index}>{s.slice(1, -1)}</code>);
    else if (s.startsWith('**')) parts.push(<strong key={m.index}>{s.slice(2, -2)}</strong>);
    else parts.push(<em key={m.index}>{s.slice(1, -1)}</em>);
    last = m.index + s.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// ── Diff renderer ─────────────────────────────────────────────────────────────

function DiffView({ diff }) {
  if (!diff) return null;
  return (
    <div style={{ fontFamily: 'monospace', fontSize: 11, margin: '4px 0' }}>
      {diff.map((line, i) => {
        if (line.startsWith('+')) return <div key={i} className="diff-add">{line}</div>;
        if (line.startsWith('-')) return <div key={i} className="diff-rem">{line}</div>;
        return <div key={i} style={{ color: '#555' }}>{line}</div>;
      })}
    </div>
  );
}

// ── Tool block ────────────────────────────────────────────────────────────────

function ToolBlock({ id, name, input, output, success, pending, diff }) {
  const [open, setOpen] = useState(false);
  const isThinking = name && name.includes('sequentialthinking');

  if (isThinking) {
    const num     = input?.thoughtNumber || '?';
    const total   = input?.totalThoughts || '?';
    const thought = input?.thought || '';
    const badge   = input?.isRevision ? ` · revising #${input.revisesThought}` : input?.branchId ? ` · branch ${input.branchId}` : '';
    return (
      <div className="tool-block" style={{ borderColor: '#7c3aed22', background: '#7c3aed08' }}>
        <div className="tool-header" style={{ color: '#9f7aea' }}>
          <span style={{ marginRight: 6 }}>{pending ? '◌' : '💭'}</span>
          <span className="tool-name" style={{ color: '#9f7aea' }}>Thought {num}/{total}{badge}</span>
          {thought && <span style={{ color: '#555', fontSize: 10, marginLeft: 'auto' }} onClick={() => setOpen(v => !v)}>{open ? '▲' : '▼'}</span>}
        </div>
        {thought && (
          <div className="tool-output" style={{ color: '#888', fontStyle: 'italic', display: open ? undefined : '-webkit-box', WebkitLineClamp: open ? undefined : 2, WebkitBoxOrient: open ? undefined : 'vertical', overflow: open ? undefined : 'hidden' }}>
            {thought}
          </div>
        )}
      </div>
    );
  }

  const statusClass = pending ? 'spin' : success ? 'ok' : 'err';
  const statusIcon  = pending ? '…' : success ? '✔' : '✖';
  const headerClass = `tool-header ${pending ? 'pending' : success ? 'success' : output ? 'failure' : ''}`;

  const inputSummary = input
    ? Object.values(input).map((v) => String(v).slice(0, 80)).join('  ')
    : '';

  return (
    <div className="tool-block">
      <div className={headerClass} onClick={() => output && setOpen((v) => !v)}>
        <span className="tool-name">{name}</span>
        <span className="tool-input">{inputSummary}</span>
        <span className={`tool-status ${statusClass}`}>{statusIcon}</span>
        {output && <span style={{ color: '#555', fontSize: 10 }}>{open ? '▲' : '▼'}</span>}
      </div>
      {open && output && (
        <div className="tool-output">
          {diff ? <DiffView diff={diff} /> : output}
        </div>
      )}
    </div>
  );
}

// ── Message row ───────────────────────────────────────────────────────────────

function MessageRow({ msg }) {
  switch (msg.type) {
    case 'user':
      return (
        <div className="msg msg-user">
          <div className="msg-label user-label">
            {msg.source === 'cli' ? 'you [cli]' : 'you'}
          </div>
          <div style={{ paddingLeft: 4 }}>{msg.content}</div>
        </div>
      );

    case 'assistant':
      return (
        <div className="msg msg-assistant">
          <div className="msg-label axion-label">Axion</div>
          <div style={{ paddingLeft: 4 }}>
            {msg.streaming
              ? <><span>{msg.content}</span><span className="streaming-cursor" /></>
              : <RichText text={msg.content} />
            }
          </div>
        </div>
      );

    case 'thinking': {
      const tc = msg.content || '';
      const tSize = tc.length > 500 ? `${(tc.length / 1000).toFixed(1)}k chars` : `${tc.length} chars`;
      const tPreview = tc.split('\n').map(l => l.trim()).find(l => l.length > 0) || '';
      return (
        <div className="msg msg-thinking-block">
          <div style={{ color: '#c084fc', fontSize: 11, marginBottom: 3, display: 'flex', gap: 6, alignItems: 'center' }}>
            <span>◈</span>
            <strong>thinking</strong>
            <span style={{ color: '#555' }}>·</span>
            <span style={{ color: '#555' }}>{tSize}</span>
          </div>
          {tPreview && (
            <div style={{ color: '#9d6ec9', fontSize: 11, fontStyle: 'italic', marginBottom: 4, paddingLeft: 14, opacity: 0.8 }}>
              {tPreview.length > 120 ? tPreview.slice(0, 120) + '…' : tPreview}
            </div>
          )}
          {tc.length > 0 && (
            <details style={{ marginLeft: 14 }}>
              <summary style={{ color: '#555', fontSize: 11, cursor: 'pointer', userSelect: 'none' }}>expand full reasoning</summary>
              <div style={{ marginTop: 6, paddingLeft: 8, borderLeft: '2px solid #6b21a8', lineHeight: 1.6 }}>
                <RichText text={tc} />
              </div>
            </details>
          )}
        </div>
      );
    }

    case 'plan':
      return (
        <div className="msg msg-plan">
          <div className="msg-label plan-label">◈ Plan</div>
          <RichText text={msg.content} />
        </div>
      );

    case 'btw':
      return (
        <div className="msg msg-btw">
          <div className="msg-label btw-label">btw</div>
          <RichText text={msg.content} />
        </div>
      );

    case 'adviser':
      return (
        <div className="msg msg-adviser">
          <div className="msg-label adviser-label">◈ Adviser {msg.label ? `(${msg.label})` : ''}</div>
          <RichText text={msg.content} />
        </div>
      );

    case 'sub-agent':
      return (
        <div className="msg msg-sub-agent">
          <div className="msg-label sub-label">⟳ {msg.label || 'agent'}</div>
          <RichText text={msg.content} />
        </div>
      );

    case 'agent-msg':
      return (
        <div className="msg msg-agent-msg">
          📨 <strong>{msg.from}</strong> → <strong>{msg.to}</strong>: "{msg.content}"
        </div>
      );

    case 'img':
      return (
        <div className="msg msg-img">
          <div className="msg-label" style={{ color: '#c084fc', marginBottom: 4 }}>◈ image · {msg.model}</div>
          <img
            src={`data:image/png;base64,${msg.b64}`}
            alt={msg.revisedPrompt || msg.prompt}
            style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 6, border: '1px solid var(--border)', display: 'block' }}
          />
          {msg.revisedPrompt && msg.revisedPrompt !== msg.prompt && (
            <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4 }}>Revised: {msg.revisedPrompt}</div>
          )}
        </div>
      );

    case 'tool':
      return (
        <div className="msg" style={{ paddingLeft: 4 }}>
          <ToolBlock {...msg} />
        </div>
      );

    case 'error':
      return (
        <div className="msg msg-error">
          ✖ {msg.content}
        </div>
      );

    case 'info':
      return (
        <div className="msg msg-info">
          {msg.content}
        </div>
      );

    default:
      return null;
  }
}

// ── Spinner ───────────────────────────────────────────────────────────────────

const SPINNER_FRAMES = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧'];

function Spinner() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 100);
    return () => clearInterval(id);
  }, []);
  return <span style={{ display: 'inline-block', width: '1ch' }}>{SPINNER_FRAMES[frame]}</span>;
}

// ── Welcome banner ────────────────────────────────────────────────────────────

function WelcomeBanner({ model, mode, cwd }) {
  const modeParts = cwd?.replace(/\\/g, '/').split('/').filter(Boolean);
  const shortCwd  = modeParts ? modeParts[modeParts.length - 1] || cwd : '';
  return (
    <div className="welcome-banner">
      <div>
        <div className="banner-title">◈ Axion <span style={{ color: '#555', fontWeight: 'normal', fontSize: 12 }}>by Axion Labs</span></div>
        <div className="banner-row"><span className="banner-key">model</span><span className="banner-val">{model}</span></div>
        <div className="banner-row"><span className="banner-key">mode</span><span className="banner-val">{mode}</span></div>
        <div className="banner-row"><span className="banner-key">dir</span><span className="banner-sub">{shortCwd}</span></div>
      </div>
      <div>
        <div className="banner-tip-title">Getting started</div>
        <div className="banner-tip">
          /help for all commands<br />
          /model · /mode · /api to configure<br />
          /thinking to enable extended reasoning<br />
          /goal to run until a condition is met
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [messages, setMessages]         = useState([]);
  const [streamContent, setStreamContent] = useState(null);
  const [thinking, setThinking]         = useState(false);
  const [thinkingWord, setThinkingWord] = useState('');
  const [inputMode, setInputMode]       = useState('chat'); // 'chat' | 'confirm-tool' | 'confirm-plan'
  const [confirmInfo, setConfirmInfo]   = useState(null);
  const [status, setStatus]             = useState(null);   // {model, mode, tokens, ...}
  const [inputValue, setInputValue]     = useState('');
  const [connected, setConnected]       = useState(false);
  const [welcomeData, setWelcomeData]   = useState(null);

  const wsRef          = useRef(null);
  const streamBufRef   = useRef('');
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  // ── Push helpers ──────────────────────────────────────────────────────────

  const pushMsg = useCallback((msg) => {
    setMessages((prev) => [...prev, { ...msg, _key: Math.random() }]);
  }, []);

  const updateLastTool = useCallback((name, update) => {
    setMessages((prev) => {
      const idx = [...prev].reverse().findIndex((m) => m.type === 'tool' && m.name === name && m.pending);
      if (idx === -1) return prev;
      const ri = prev.length - 1 - idx;
      const next = [...prev];
      next[ri] = { ...next[ri], ...update };
      return next;
    });
  }, []);

  // ── WebSocket ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws    = new WebSocket(`${proto}://${location.host}`);
    wsRef.current = ws;

    ws.onopen  = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'hello', clientType: 'web' }));
    };
    ws.onclose = () => setConnected(false);

    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);

      switch (data.type) {

        case 'welcome':
          setConnected(true);
          setWelcomeData(data);
          setStatus({ model: data.model, mode: data.mode, tokens: { total: 0, input: 0, output: 0 } });
          // Replay history from server (e.g. when CLI session was already active)
          if (data.history?.length) {
            setMessages(data.history.map((m) => ({ ...m, _key: Math.random() })));
          }
          break;

        case 'message':
          pushMsg(data.msg);
          break;

        case 'tool_call':
          pushMsg({ type: 'tool', id: data.id, name: data.name, input: data.input, output: null, success: null, pending: true });
          break;

        case 'tool_result':
          updateLastTool(data.name, { output: data.output, success: data.success, pending: false, diff: data.diff || null });
          break;

        case 'stream_chunk':
          streamBufRef.current += data.content;
          setStreamContent(streamBufRef.current);
          break;

        case 'stream_end': {
          const raw = streamBufRef.current;
          streamBufRef.current = '';
          setStreamContent(null);
          // Fallback: strip <think> tags that the streaming filter missed
          const thinkRe = /<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/gi;
          const thoughts = [];
          let m;
          while ((m = thinkRe.exec(raw)) !== null) {
            if (m[1].trim()) thoughts.push(m[1].trim());
          }
          const content = thoughts.length
            ? raw.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '').trim()
            : raw;
          for (const t of thoughts) pushMsg({ type: 'thinking', content: t });
          if (content.trim()) pushMsg({ type: 'assistant', content });
          break;
        }

        case 'thinking_start':
          setThinking(true);
          setThinkingWord(data.word || '');
          break;

        case 'thinking_end':
          setThinking(false);
          setThinkingWord('');
          break;

        case 'confirm_request':
          setInputMode(data.kind === 'tool' ? 'confirm-tool' : 'confirm-plan');
          setConfirmInfo(data.kind === 'tool' ? data.tool : null);
          break;

        case 'tokens':
          setStatus((s) => s ? { ...s, tokens: { total: data.total, input: data.input, output: data.output } } : s);
          break;

        case 'status':
          setStatus((s) => ({
            ...s,
            model: data.model,
            mode:  data.mode,
            tokens: data.tokens || s?.tokens || { total: 0, input: 0, output: 0 },
            goal:  data.goal,
            extThinking: data.extThinking,
          }));
          break;

        case 'clear':
          setMessages([]);
          setStreamContent(null);
          streamBufRef.current = '';
          break;

        case 'resume':
          setMessages(data.messages || []);
          setStatus((s) => ({ ...s, model: data.model, mode: data.mode }));
          break;

        default:
          break;
      }
    };

    return () => ws.close();
  }, [pushMsg, updateLastTool]);

  // Auto-scroll when messages change
  useEffect(() => { scrollToBottom(); }, [messages, streamContent, thinking]);

  // ── Send ──────────────────────────────────────────────────────────────────

  const sendWs = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const sendConfirm = useCallback((answer) => {
    sendWs({ type: 'confirm', answer });
    setInputMode('chat');
    setConfirmInfo(null);
    inputRef.current?.focus();
  }, [sendWs]);

  const handleSubmit = useCallback(() => {
    const val = inputValue.trim();
    if (!val) return;

    if (inputMode === 'confirm-tool' || inputMode === 'confirm-plan') {
      const lower = val.toLowerCase();
      if (lower === 'y' || lower === 'yes') sendConfirm(true);
      if (lower === 'n' || lower === 'no')  sendConfirm(false);
      setInputValue('');
      return;
    }

    sendWs({ type: 'submit', content: val });
    setInputValue('');
  }, [inputValue, inputMode, sendWs, sendConfirm]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // ── Derived display ───────────────────────────────────────────────────────

  const tokStr = status?.tokens?.total
    ? status.tokens.total < 1000
      ? `${status.tokens.total}`
      : status.tokens.total < 1_000_000
        ? `${(status.tokens.total / 1000).toFixed(1)}k`
        : `${(status.tokens.total / 1_000_000).toFixed(2)}M`
    : null;

  const currentMode    = status?.mode || 'ask';
  const displayMode    = currentMode === 'auto' ? 'bypass' : currentMode;
  const modeColorClass = `status-mode-${currentMode}`;

  const cycleMode = useCallback(() => {
    const modes = ['ask', 'plan', 'auto'];
    const idx  = modes.indexOf(currentMode);
    const next = modes[(idx + 1) % modes.length];
    sendWs({ type: 'submit', content: `/mode ${next}` });
  }, [currentMode, sendWs]);
  const inputDisabled  = !connected || (inputMode !== 'chat' && inputMode !== 'confirm-tool' && inputMode !== 'confirm-plan');

  const placeholder = !connected
    ? 'Connecting…'
    : inputMode === 'confirm-tool' || inputMode === 'confirm-plan'
      ? 'y / n'
      : thinking
        ? `${thinkingWord}… — type /btw for a side question`
        : 'ask Axion something…  or type / for commands';

  return (
    <>
      {/* ── Messages ── */}
      <div id="messages">
        {welcomeData && <WelcomeBanner model={welcomeData.model} mode={welcomeData.mode} cwd={welcomeData.cwd} />}
        {messages.map((msg, i) => <MessageRow key={msg._key ?? i} msg={msg} />)}
        {streamContent !== null && (
          <MessageRow msg={{ type: 'assistant', content: streamContent, streaming: true }} />
        )}
        <div ref={messagesEndRef} style={{ height: 4 }} />
      </div>

      {/* ── Thinking indicator ── */}
      {thinking && (
        <div id="thinking-bar">
          <Spinner /> <span>{thinkingWord || 'thinking'}…</span>
        </div>
      )}

      {/* ── Confirm prompt ── */}
      {(inputMode === 'confirm-tool' || inputMode === 'confirm-plan') && (
        <div id="confirm-bar">
          <span className="confirm-label">
            {inputMode === 'confirm-tool'
              ? <>run <strong style={{ color: '#22d3ee' }}>{confirmInfo?.name}</strong>
                  {confirmInfo?.label ? <> · <span style={{ color: '#888' }}>{confirmInfo.label}</span></> : null}?</>
              : 'execute this plan?'}
          </span>
          <button className="confirm-btn confirm-yes" onClick={() => sendConfirm(true)}>Yes (y)</button>
          <button className="confirm-btn confirm-no"  onClick={() => sendConfirm(false)}>No (n)</button>
        </div>
      )}

      {/* ── Status bar ── */}
      <div id="statusbar">
        <div className="status-left">
          <span className="status-axion">◈ Axion</span>
          <span className="status-sep">·</span>
          <span className="status-model">{status?.model || '…'}</span>
          <span className="status-sep">·</span>
          <span
            className={modeColorClass}
            onClick={cycleMode}
            title="Click to cycle permission mode (ask → plan → bypass)"
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >{displayMode}</span>
          {tokStr && <><span className="status-sep">·</span><span className="status-tokens">{tokStr} tok</span></>}
          {!connected && <span style={{ color: '#f87171' }}>· disconnected</span>}
        </div>
        <div className="status-right">
          {status?.extThinking && <span style={{ color: '#c084fc' }}>◎ thinking</span>}
          {status?.goal && <span style={{ color: '#facc15' }}>⟳ goal active</span>}
        </div>
      </div>

      {/* ── Hint ── */}
      <div id="hint-bar">
        ? for help · /goal to set a target · /retry to redo · click mode to cycle · Shift+Enter for newline
      </div>

      {/* ── Input ── */}
      <div id="input-area">
        <span className="input-prompt">›</span>
        <textarea
          id="chat-input"
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={inputDisabled}
          rows={1}
          autoFocus
        />
      </div>
    </>
  );
}
