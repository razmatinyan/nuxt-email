import { defineEventHandler } from 'h3'

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>nuxt-email DevTools</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; font-size: 14px; color: #1a1a1a; background: #f5f5f5; display: flex; height: 100vh; overflow: hidden; }
  #sidebar { width: 220px; background: #fff; border-right: 1px solid #e5e5e5; display: flex; flex-direction: column; flex-shrink: 0; }
  #sidebar h2 { padding: 14px 16px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #666; border-bottom: 1px solid #e5e5e5; }
  #template-list { flex: 1; overflow-y: auto; padding: 8px 0; }
  .tpl-item { padding: 9px 16px; cursor: pointer; border-radius: 0; color: #333; font-size: 13px; }
  .tpl-item:hover { background: #f0f0f0; }
  .tpl-item.active { background: #e8f0fe; color: #1a73e8; font-weight: 500; }
  #main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  #toolbar { background: #fff; border-bottom: 1px solid #e5e5e5; padding: 12px 16px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  #toolbar label { font-size: 12px; color: #555; }
  #toolbar input, #toolbar textarea { border: 1px solid #d5d5d5; border-radius: 4px; padding: 6px 8px; font-size: 13px; font-family: inherit; }
  #to-input { width: 200px; }
  #props-input { width: 260px; height: 34px; resize: none; }
  #send-btn { background: #1a73e8; color: #fff; border: none; border-radius: 4px; padding: 7px 16px; font-size: 13px; cursor: pointer; white-space: nowrap; }
  #send-btn:hover { background: #1558b0; }
  #send-result { font-size: 12px; color: #555; max-width: 320px; word-break: break-all; }
  #content { flex: 1; display: flex; overflow: hidden; }
  #preview-frame { flex: 1; border: none; background: #fff; }
  #log-panel { width: 320px; background: #fff; border-left: 1px solid #e5e5e5; display: flex; flex-direction: column; }
  #log-panel h3 { padding: 12px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #666; border-bottom: 1px solid #e5e5e5; }
  #log-list { flex: 1; overflow-y: auto; padding: 8px 0; }
  .log-entry { padding: 8px 16px; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
  .log-entry .log-meta { display: flex; justify-content: space-between; margin-bottom: 2px; }
  .log-entry .log-to { color: #333; font-weight: 500; }
  .log-entry .log-tpl { color: #888; font-size: 11px; }
  .log-entry .log-ok { color: #2e7d32; }
  .log-entry .log-fail { color: #c62828; }
  .log-entry .log-time { color: #aaa; font-size: 11px; }
  .no-tpl { padding: 24px 16px; color: #888; font-size: 13px; }
</style>
</head>
<body>
<div id="sidebar">
  <h2>Templates</h2>
  <div id="template-list"><div class="no-tpl">Loading…</div></div>
</div>
<div id="main">
  <div id="toolbar">
    <label>To: <input id="to-input" type="email" placeholder="recipient@example.com"></label>
    <label>Props: <textarea id="props-input" placeholder="{}"></textarea></label>
    <button id="send-btn">Send Test</button>
    <span id="send-result"></span>
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
    document.getElementById('send-result').textContent = 'Sending…';
    try {
      const res = await fetch('/_email/send-test/' + currentTemplate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, props }),
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
          '<div><span class="log-tpl">' + (e.template || '—') + '</span> — ' +
          (e.success ? '<span class="log-ok">✓ sent</span>' : '<span class="log-fail">✗ ' + (e.error || 'failed') + '</span>') + '</div>' +
          '</div>';
      }).join('');
    } catch {}
  }

  loadTemplates();
  loadLog();
<\/script>
</body>
</html>`

export default defineEventHandler(() => {
	return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
})
