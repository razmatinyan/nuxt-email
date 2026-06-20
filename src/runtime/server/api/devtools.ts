import { defineEventHandler } from 'h3'

const html = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>nuxt-email DevTools</title>
<script>
  (function () {
    const root = document.documentElement

    function parentDoc() {
      try {
        if (window.parent && window.parent !== window) return window.parent.document
      } catch (e) {}
      return null
    }

    function readDevtoolsTheme() {
      const doc = parentDoc()
      if (!doc) return null
      const el = doc.documentElement
      if (el.classList.contains('dark')) return 'dark'
      if (el.classList.contains('light')) return 'light'
      const scheme = el.style.colorScheme || getComputedStyle(el).colorScheme
      if (scheme && scheme.indexOf('dark') !== -1) return 'dark'
      if (scheme && scheme.indexOf('light') !== -1) return 'light'
      return null
    }

    function systemTheme() {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    function applyTheme() {
      root.setAttribute('data-theme', readDevtoolsTheme() || systemTheme())
    }

    applyTheme()

    const doc = parentDoc()
    if (doc) {
      const observer = new MutationObserver(applyTheme)
      observer.observe(doc.documentElement, { attributes: true, attributeFilter: ['class', 'style'] })
    }
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme)
    }
  })()
<\/script>
<style>
  :root {
    color-scheme: light;
    --bg: #f5f5f5;
    --panel: #ffffff;
    --border: #e5e5e5;
    --border-soft: #f0f0f0;
    --text: #1a1a1a;
    --text-2: #333333;
    --muted: #666666;
    --muted-2: #888888;
    --dim: #aaaaaa;
    --hover: #f0f0f0;
    --accent-text: #1a73e8;
    --accent-bg: #e8f0fe;
    --btn-bg: #1a73e8;
    --btn-bg-hover: #1558b0;
    --btn-text: #ffffff;
    --input-bg: #ffffff;
    --input-border: #d5d5d5;
    --ok: #2e7d32;
    --fail: #c62828;
    --preview-bg: #ffffff;
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --bg: #161618;
    --panel: #1c1c1f;
    --border: #2a2a2d;
    --border-soft: #242427;
    --text: #e4e4e7;
    --text-2: #d4d4d8;
    --muted: #a1a1aa;
    --muted-2: #8b8b93;
    --dim: #6b6b72;
    --hover: #27272a;
    --accent-text: #93c5fd;
    --accent-bg: rgba(96, 165, 250, 0.15);
    --btn-bg: #3b82f6;
    --btn-bg-hover: #2563eb;
    --btn-text: #ffffff;
    --input-bg: #242427;
    --input-border: #3f3f46;
    --ok: #4ade80;
    --fail: #f87171;
    --preview-bg: #ffffff;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; font-size: 14px; color: var(--text); background: var(--bg); display: flex; height: 100vh; overflow: hidden; transition: background-color 0.15s ease, color 0.15s ease; }
  #sidebar { width: 220px; background: var(--panel); border-right: 1px solid var(--border); display: flex; flex-direction: column; flex-shrink: 0; }
  #sidebar h2 { padding: 14px 16px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); border-bottom: 1px solid var(--border); }
  #template-list { flex: 1; overflow-y: auto; padding: 8px 0; }
  .tpl-item { padding: 9px 16px; cursor: pointer; color: var(--text-2); font-size: 13px; }
  .tpl-item:hover { background: var(--hover); }
  .tpl-item.active { background: var(--accent-bg); color: var(--accent-text); font-weight: 500; }
  #main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  #toolbar { background: var(--panel); border-bottom: 1px solid var(--border); padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
  .field { display: flex; flex-direction: column; gap: 5px; }
  .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
  #toolbar input, #toolbar select, #toolbar textarea { width: 100%; border: 1px solid var(--input-border); border-radius: 6px; padding: 8px 10px; font-size: 13px; font-family: inherit; background: var(--input-bg); color: var(--text); transition: border-color 0.12s ease, box-shadow 0.12s ease; }
  #toolbar input::placeholder, #toolbar textarea::placeholder { color: var(--dim); }
  #toolbar input:focus, #toolbar select:focus, #toolbar textarea:focus { outline: none; border-color: var(--btn-bg); box-shadow: 0 0 0 3px var(--accent-bg); }
  #provider-input { cursor: pointer; }
  #props-input { min-height: 120px; resize: vertical; font-family: ui-monospace, 'SF Mono', 'Courier New', monospace; font-size: 12.5px; line-height: 1.6; }
  .toolbar-actions { display: flex; align-items: center; gap: 12px; }
  #send-btn { align-self: flex-start; background: var(--btn-bg); color: var(--btn-text); border: none; border-radius: 6px; padding: 8px 18px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; }
  #send-btn:hover { background: var(--btn-bg-hover); }
  #send-result { font-size: 12px; color: var(--muted); max-width: 320px; word-break: break-all; }
  #content { flex: 1; display: flex; overflow: hidden; }
  #preview-frame { flex: 1; border: none; background: var(--preview-bg); }
  #log-panel { width: 320px; background: var(--panel); border-left: 1px solid var(--border); display: flex; flex-direction: column; }
  #log-panel h3 { padding: 12px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); border-bottom: 1px solid var(--border); }
  #log-list { flex: 1; overflow-y: auto; padding: 8px 0; }
  .log-entry { padding: 8px 16px; border-bottom: 1px solid var(--border-soft); font-size: 12px; }
  .log-entry .log-meta { display: flex; justify-content: space-between; margin-bottom: 2px; }
  .log-entry .log-to { color: var(--text-2); font-weight: 500; }
  .log-entry .log-tpl { color: var(--muted-2); font-size: 11px; }
  .log-entry .log-ok { color: var(--ok); }
  .log-entry .log-fail { color: var(--fail); }
  .log-entry .log-time { color: var(--dim); font-size: 11px; }
  .no-tpl { padding: 24px 16px; color: var(--muted-2); font-size: 13px; }
</style>
</head>
<body>
<div id="sidebar">
  <h2>Templates</h2>
  <div id="template-list"><div class="no-tpl">Loading…</div></div>
</div>
<div id="main">
  <div id="toolbar">
    <label class="field">
      <span class="field-label">To</span>
      <input id="to-input" type="email" placeholder="recipient@example.com">
    </label>
    <label class="field">
      <span class="field-label">Provider</span>
      <select id="provider-input"></select>
    </label>
    <label class="field">
      <span class="field-label">Props (JSON)</span>
      <textarea id="props-input" placeholder="{}" spellcheck="false"></textarea>
    </label>
    <div class="toolbar-actions">
      <button id="send-btn">Send Test</button>
      <span id="send-result"></span>
    </div>
  </div>
  <div id="content">
    <iframe id="preview-frame" title="Email Preview"></iframe>
    <div id="log-panel">
      <h3>Send Log</h3>
      <div id="log-list"><div class="no-tpl">No sends yet.</div></div>
    </div>
  </div>
</div>
<script>
  let currentTemplate = null;
  let templateData = [];

  async function loadConfig() {
    try {
      const res = await fetch('/_email/config');
      const data = await res.json();
      const select = document.getElementById('provider-input');
      select.innerHTML = data.providers.map(p =>
        '<option value="' + p + '"' + (p === data.provider ? ' selected' : '') + '>'
        + p + (p === data.provider ? ' (configured)' : '') + '</option>'
      ).join('');
    } catch (e) {}
  }

  async function loadTemplates() {
    try {
      const res = await fetch('/_email/templates');
      templateData = await res.json();
      renderSidebar();
      if (templateData.length > 0) selectTemplate(templateData[0]);
    } catch (e) {
      document.getElementById('template-list').innerHTML = '<div class="no-tpl">Failed to load templates.</div>';
    }
  }

  function renderSidebar() {
    const list = document.getElementById('template-list');
    if (templateData.length === 0) { list.innerHTML = '<div class="no-tpl">No templates found.</div>'; return; }
    list.innerHTML = templateData.map(t =>
      '<div class="tpl-item" data-name="' + t.name + '">' + t.name + '</div>'
    ).join('');
    list.querySelectorAll('.tpl-item').forEach(el => {
      el.addEventListener('click', () => {
        const t = templateData.find(x => x.name === el.dataset.name);
        if (t) selectTemplate(t);
      });
    });
  }

  function selectTemplate(t) {
    currentTemplate = t.name;
    document.querySelectorAll('.tpl-item').forEach(el => el.classList.toggle('active', el.dataset.name === t.name));
    document.getElementById('preview-frame').src = '/_email/preview/' + t.name;
    document.getElementById('props-input').value = JSON.stringify(t.previewProps || {}, null, 2);
    document.getElementById('send-result').textContent = '';
  }

  document.getElementById('send-btn').addEventListener('click', async () => {
    if (!currentTemplate) { alert('Select a template first.'); return; }
    const to = document.getElementById('to-input').value.trim();
    if (!to) { alert('Enter a recipient email.'); return; }
    let props = {};
    try { props = JSON.parse(document.getElementById('props-input').value || '{}'); } catch { alert('Props must be valid JSON.'); return; }
    const provider = document.getElementById('provider-input').value;
    document.getElementById('send-result').textContent = 'Sending…';
    try {
      const res = await fetch('/_email/send-test/' + currentTemplate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, props, provider }),
      });
      const data = await res.json();
      document.getElementById('send-result').textContent = data.success ? '✓ Sent (' + data.provider + ')' : '✗ ' + (data.error || 'Failed');
      loadLog();
    } catch (e) {
      document.getElementById('send-result').textContent = '✗ Network error';
    }
  });

  async function loadLog() {
    try {
      const res = await fetch('/_email/log');
      const entries = await res.json();
      const list = document.getElementById('log-list');
      if (!entries.length) { list.innerHTML = '<div class="no-tpl">No sends yet.</div>'; return; }
      list.innerHTML = entries.map(e => {
        const d = new Date(e.timestamp);
        const time = d.toLocaleTimeString();
        return '<div class="log-entry">' +
          '<div class="log-meta"><span class="log-to">' + e.to.join(', ') + '</span><span class="log-time">' + time + '</span></div>' +
          '<div><span class="log-tpl">' + (e.template || '-') + '</span> - ' +
          (e.success ? '<span class="log-ok">✓ sent</span>' : '<span class="log-fail">✗ ' + (e.error || 'failed') + '</span>') + '</div>' +
          '</div>';
      }).join('');
    } catch {}
  }

  loadConfig();
  loadTemplates();
  loadLog();
<\/script>
</body>
</html>`

export default defineEventHandler(() => {
	return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
})
