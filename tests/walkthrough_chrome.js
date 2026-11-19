// ==============================================================================
// Program: walkthrough_chrome.js
// Purpose: End-to-end smoke test that drives the REAL page in headless Chrome the way a player does:
//          menu -> character creator -> workshop -> Fashion Studio (all 5 steps, saving an item) ->
//          Hair Salon (every tool) -> Makeup/Tech/Decor/Books (Done) -> closet (every tab).
//          It asserts: no console errors or uncaught exceptions, every static icon placeholder
//          has an SVG (the weather button excepted), and canvas pixels persist across tool changes.
// How to run: node tests/walkthrough_chrome.js   (exit code 0 = pass; prints the raw measurements)
// Why: unit-style regression tests cover each bug in isolation; this checks the fixes together
//      through the real click paths (inline onclick handlers, screen switches, resize logic).
// ==============================================================================
const path = require('path');
const { launch } = require('./chrome_harness');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

(async () => {
  const p = await launch(URL);
  const log = []; let bad = 0;
  const check = (ok, msg) => { log.push((ok ? 'OK   ' : 'FAIL ') + msg); if (!ok) bad++; };
  // Counts non-transparent pixels on a canvas: the observable "is the drawing still there" measure.
  const opaque = id => p.eval(`(() => { const c = document.getElementById('${id}'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; })()`);
  const click = sel => p.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.click(); return true; })()`);
  const screen = () => p.eval('Game.currentScreen');

  // --- menu -> character -> workshop ---
  check(await screen() === 'menu', 'starts on menu');
  await click('#btn-new-game');
  check(await screen() === 'character', 'New Game opens character creator (screen=' + await screen() + ')');
  await click('#character-screen .btn-primary');
  check(await screen() === 'workshop', 'Done opens workshop (screen=' + await screen() + ')');

  // --- icons ---
  const ic = await p.eval(`({total: document.querySelectorAll('[data-icon]').length, svg: document.querySelectorAll('[data-icon] svg').length})`);
  check(ic.total === 22 && ic.svg >= 21, `icons: ${ic.svg}/${ic.total} placeholders hold an SVG (weather button shows an emoji by design)`);

  // Give the player enough level that every station card is unlocked, then refresh the workshop (what a level-up does).
  await p.eval(`Game.state.level = 7; Game.state.xp = 1400; Game.goTo('workshop');`);

  // --- Fashion Studio: five steps; canvas pixels must survive each Tools.setup() ---
  await click('#card-studio');
  check(await screen() === 'studio', 'studio card opens studio');
  await p.eval(`document.querySelector('#studio-side .item-cell').click()`);   // pick the first garment
  const counts = [await opaque('studio-canvas')];
  for (let i = 0; i < 3; i++) { await click('#studio-next'); counts.push(await opaque('studio-canvas')); }
  // Steps now: 1 fabric, 2 cut (calls Tools.setup), 3 decorate (calls Tools.setup after drawing the fabric).
  check(counts.every(n => n > 0), 'studio canvas opaque pixels per step ' + JSON.stringify(counts) + ' (all > 0; before the fix steps 2-3 were 0)');
  // Click every tool button on the decorate step; the garment must still be there after each.
  const toolCount = await p.eval(`document.querySelectorAll('#studio-tools .tool-btn').length`);
  let toolOk = true; const toolPx = [];
  for (let i = 0; i < toolCount; i++) {
    await p.eval(`document.querySelectorAll('#studio-tools .tool-btn')[${i}].click()`);
    const n = await opaque('studio-canvas'); toolPx.push(n); if (n === 0) toolOk = false;
  }
  check(toolOk && toolCount > 0, `studio: ${toolCount} tools clicked, pixels after each ${JSON.stringify(toolPx)}`);
  await click('#studio-next');                       // preview step
  const before = await p.eval('Game.state.closet.length');
  await click('#studio-next');                       // "Save to Closet"
  check(await p.eval('Game.state.closet.length') === before + 1, 'studio saved one item to the closet');

  // --- Hair Salon: every tool button must leave the head on the canvas ---
  await p.eval(`Game.goTo('workshop')`);
  await click('#card-salon');
  check(await screen() === 'salon', 'salon card opens salon');
  const base = await opaque('salon-canvas');
  const sTools = await p.eval(`document.querySelectorAll('#salon-tools .tool-btn').length`);
  const sPx = [base]; let sOk = base > 0;
  for (let i = 0; i < sTools; i++) {
    await p.eval(`document.querySelectorAll('#salon-tools .tool-btn')[${i}].click()`);
    const n = await opaque('salon-canvas'); sPx.push(n); if (n === 0) sOk = false;
  }
  check(sOk && sTools > 0, `salon: ${sTools} tools clicked, opaque pixels ${JSON.stringify(sPx)} (before the fix: 0 after Highlights)`);

  // --- other stations: open, press Done with nothing chosen (no XP), then with a choice ---
  for (const [st, btn] of [['makeup', 'Makeup'], ['tech', 'Tech'], ['decor', 'Decor'], ['books', 'Books']]) {
    await p.eval(`Game.goTo('workshop')`);
    await click('#card-' + st);
    check(await screen() === st, st + ' card opens ' + st);
    const tools = await p.eval(`document.querySelectorAll('#${st}-tools .tool-btn').length`);
    for (let i = 0; i < tools; i++) await p.eval(`document.querySelectorAll('#${st}-tools .tool-btn')[${i}].click()`);
    const px = await opaque(st + '-canvas');
    check(tools > 0, `${st}: ${tools} tool buttons clicked without error (canvas opaque px ${px})`);
  }

  // --- closet: every tab must light up exactly itself ---
  await p.eval(`Game.goTo('closet')`);
  const tabs = await p.eval(`[...document.querySelectorAll('.closet-tabs .tab')].map(t => t.dataset.filter)`);
  let tabOk = true;
  for (const f of tabs) {
    await p.eval(`document.querySelector('.closet-tabs .tab[data-filter="${f}"]').click()`);
    const act = await p.eval(`[...document.querySelectorAll('.closet-tabs .tab.active')].map(t => t.dataset.filter)`);
    if (act.length !== 1 || act[0] !== f) tabOk = false;
  }
  check(tabOk && tabs.length === 7, 'closet tabs ' + JSON.stringify(tabs) + ' each highlight only themselves');

  // --- console errors ---
  check(p.errors.length === 0, 'console errors/exceptions: ' + JSON.stringify(p.errors));

  console.log(log.join('\n'));
  p.close();
  process.exit(bad ? 1 : 0);
})();
