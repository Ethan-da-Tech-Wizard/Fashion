// ==============================================================================
// Program: chrome_harness.js
// Purpose: Minimal headless-Chrome driver (Chrome DevTools Protocol over the
//          built-in WebSocket of Node >= 22) so regression tests can load the REAL
//          index.html and evaluate JavaScript in it. No npm packages, no network:
//          it only talks to a Chrome process it spawned itself on a local port.
// How it fits: required by tests/regression_chrome.test.js. Exposes launch(),
//          which returns {eval, errors, close}.
// Why CDP and not jsdom/--dump-dom: the bugs under test depend on real browser
//          behaviour (const-vs-window globals, canvas pixels, computed CSS), which a
//          DOM stub does not reproduce.
// --allow-file-access-from-files lets tests read CSS rules of file:// stylesheets through the CSSOM
//          (without it every cssRules access throws SecurityError).
// Limits: macOS Chrome path is hard-coded; override with the CHROME env variable.
// ==============================================================================
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

// Default Chrome location on macOS; CHROME overrides it on other systems.
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** Small promise wrapper around http.get returning the response body text. */
function httpGet(url) {
  return new Promise((res, rej) => {
    http.get(url, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(b)); }).on('error', rej);
  });
}

/**
 * Starts headless Chrome, opens `url`, and returns a handle.
 * @param {string} url - page to load (file:// URL of index.html).
 * @param {{seed?: object}} [opts] - seed: localStorage key/values injected BEFORE page scripts run
 *   (used to start from a saved game state without clicking through the menu).
 * @returns {Promise<{eval: function(string): Promise<any>, errors: string[], close: function(): void}>}
 */
async function launch(url, opts = {}) {
  // Fresh profile dir per run so saved game state from one test never leaks into the next.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fashion-chrome-'));
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files', '--remote-allow-origins=*',
    `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, 'about:blank'], { stdio: 'ignore' });

  // Poll until the DevTools endpoint answers (Chrome needs ~1 s to start).
  let targets = null;
  for (let i = 0; i < 60 && !targets; i++) {
    try { targets = JSON.parse(await httpGet(`http://127.0.0.1:${port}/json`)); } catch (e) { await new Promise(r => setTimeout(r, 200)); }
  }
  if (!targets) { proc.kill(); throw new Error('Chrome did not start'); }
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));

  let id = 0; const pending = new Map(); const errors = [];
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    // Collect uncaught exceptions and console.error calls: these are the "console errors" the tests assert on.
    if (m.method === 'Runtime.exceptionThrown') errors.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console.error ' + m.params.args.map(a => a.value ?? a.description).join(' '));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push('log ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
  });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  // Seed localStorage before any page script runs so Game.init() sees it.
  if (opts.seed) {
    await send('Page.addScriptToEvaluateOnNewDocument', { source:
      `try{ if(!sessionStorage.__seeded){ ${Object.entries(opts.seed).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join('')} sessionStorage.__seeded=1; } }catch(e){}` });
  }
  await send('Page.navigate', { url });
  await new Promise(r => setTimeout(r, 1500)); // let DOMContentLoaded handlers and first paint finish

  return {
    errors,
    /** Evaluates an expression in the page; awaits promises; returns the JSON-able value. */
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.result.exceptionDetails) throw new Error('page eval failed: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
      return r.result.result.value;
    },
    // Chrome may still be flushing its profile when killed, so the cleanup retries and never fails the run.
    close() { try { ws.close(); } catch (e) {} proc.kill(); try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (e) {} }
  };
}

module.exports = { launch };
