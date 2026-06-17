// Runs on every page. Receives tool commands from the sidebar and executes DOM operations.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action !== 'page_tool') return;
  (async () => {
    try {
      sendResponse({ ok: true, result: await dispatch(msg.tool, msg.input) });
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
  })();
  return true;
});

async function dispatch(tool, input) {
  switch (tool) {
    case 'read_page':      return readPage();
    case 'get_html':       return getHtml(input);
    case 'find_elements':  return findElements(input);
    case 'click':          return clickEl(input);
    case 'type_text':      return typeText(input);
    case 'scroll':         return scroll(input);
    case 'select_option':  return selectOption(input);
    case 'get_value':      return getValue(input);
    default: throw new Error(`Unknown tool: ${tool}`);
  }
}

// ── Tool implementations ──────────────────────────────────────────────────────

function readPage() {
  const clone = document.body.cloneNode(true);
  for (const el of clone.querySelectorAll('script,style,noscript,svg,iframe')) el.remove();
  const text = (clone.innerText || clone.textContent || '').replace(/\s{3,}/g, '\n\n').trim();
  return {
    url:   location.href,
    title: document.title,
    text:  text.slice(0, 12000),
  };
}

function getHtml({ selector = 'body', limit = 4000 } = {}) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`No element matches "${selector}"`);
  return el.outerHTML.slice(0, limit);
}

function findElements({ selector, text: textQuery, limit = 10 } = {}) {
  let els = [];
  if (selector) {
    els = [...document.querySelectorAll(selector)];
  } else if (textQuery) {
    const all = document.querySelectorAll('a,button,input,select,textarea,label,[role=button],[role=link],[contenteditable]');
    const q = textQuery.toLowerCase();
    els = [...all].filter(el => (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || '').toLowerCase().includes(q));
  }
  return els.slice(0, limit).map(el => ({
    tag:       el.tagName.toLowerCase(),
    text:      (el.innerText || el.value || '').slice(0, 80).trim(),
    selector:  uniqueSelector(el),
    type:      el.type || null,
    href:      el.href || null,
    visible:   isVisible(el),
  }));
}

function clickEl({ selector, text: textQuery } = {}) {
  const el = resolveEl(selector, textQuery);
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.focus();
  el.click();
  return { clicked: el.tagName.toLowerCase(), text: (el.innerText || el.value || '').slice(0, 60).trim() };
}

function typeText({ selector, text: textQuery, value, clear = true } = {}) {
  if (!value) throw new Error('"value" is required');
  const el = resolveEl(selector, textQuery) || document.activeElement;
  el.focus();

  if (el.isContentEditable) {
    // contenteditable divs (e.g. Claude, Notion, ProseMirror/Lexical editors):
    // execCommand fires the mutation events these frameworks listen to.
    if (clear) {
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
    }
    document.execCommand('insertText', false, value);
    return { typed: value.slice(0, 60), into: el.tagName.toLowerCase() };
  }

  // Standard <input> / <textarea> path
  if (clear) { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); }
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') ||
                       Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
  if (nativeSetter?.set) nativeSetter.set.call(el, value);
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return { typed: value.slice(0, 60), into: el.tagName.toLowerCase() };
}

function scroll({ direction = 'down', amount = 400, selector } = {}) {
  const target = selector ? document.querySelector(selector) : window;
  if (!target) throw new Error(`No element matches "${selector}"`);
  const dy = direction === 'up' ? -amount : direction === 'down' ? amount : 0;
  const dx = direction === 'left' ? -amount : direction === 'right' ? amount : 0;
  if (target === window) window.scrollBy({ top: dy, left: dx, behavior: 'smooth' });
  else target.scrollBy({ top: dy, left: dx, behavior: 'smooth' });
  return { scrolled: direction, amount };
}

function selectOption({ selector, text: textQuery, value, label } = {}) {
  const el = resolveEl(selector, textQuery);
  if (el.tagName.toLowerCase() !== 'select') throw new Error('Element is not a <select>');
  const opt = [...el.options].find(o =>
    (value && o.value === value) || (label && o.text.toLowerCase().includes(label.toLowerCase()))
  );
  if (!opt) throw new Error(`Option not found: ${value || label}`);
  el.value = opt.value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return { selected: opt.text };
}

function getValue({ selector, text: textQuery } = {}) {
  const el = resolveEl(selector, textQuery);
  return { value: el.value, text: el.innerText?.slice(0, 200) };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveEl(selector, textQuery) {
  if (selector) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  if (textQuery) {
    const all = document.querySelectorAll('a,button,input,select,textarea,label,[role=button],[role=link],[role=menuitem],[contenteditable]');
    const q = textQuery.toLowerCase();
    const found = [...all].find(el =>
      isVisible(el) &&
      (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || '').toLowerCase().includes(q)
    );
    if (found) return found;
  }
  throw new Error(`Could not find element: ${selector || textQuery}`);
}

function isVisible(el) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
}

function uniqueSelector(el) {
  if (el.id) return `#${CSS.escape(el.id)}`;
  if (el.className) {
    const cls = [...el.classList].slice(0, 2).map(c => `.${CSS.escape(c)}`).join('');
    if (cls) return `${el.tagName.toLowerCase()}${cls}`;
  }
  return el.tagName.toLowerCase();
}
