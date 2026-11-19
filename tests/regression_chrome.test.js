// ==============================================================================
// Program: regression_chrome.test.js
// Purpose: Regression tests for the twelve real-browser bugs found in the Fashion
//          City page (icons never hydrated, canvas blanked by Tools.setup, locked
//          cards never unlocking, ...). Each test loads the REAL index.html in
//          headless Chrome (tests/chrome_harness.js) and asserts the CORRECT behaviour,
//          so it fails on the buggy code and passes once the matching "Fix:" commit
//          is applied.
// How to run: node tests/regression_chrome.test.js        (exit code 0 = all passed)
//          Optionally run a subset: node tests/regression_chrome.test.js icons sound
// Limits: needs Google Chrome (CHROME env var overrides the macOS path) and Node >= 22.
// ==============================================================================
const path = require('path');
const { launch } = require('./chrome_harness');

// file:// URL of the page under test (the repo's index.html, one directory above tests/).
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

// A saved game used by tests that need to start mid-progress: level 7 so every workshop card is unlocked.
const SAVE_L7 = JSON.stringify({ level: 7, xp: 1400, coins: 50, closet: [], character: null, weather: 'sunny', soundOn: true, hasStarted: true });

// name -> async function(page) that throws (via assert) when the behaviour is wrong.
const tests = {};
const assert = (c, m) => { if (!c) throw new Error(m); };

// Test 1: static [data-icon] placeholders must receive an SVG (index.html guard used window.Icons, which is undefined for a top-level const).
tests.icons = async p => {
  // #weather-btn is the one deliberate exception: Weather.set() replaces its contents with a sun/rain/snow emoji
  // (documented in weather.js), so it is expected to hold an emoji, not an SVG. The other 21 must hold an SVG.
  const r = await p.eval(`(() => {
    const all = [...document.querySelectorAll('[data-icon]')];
    return {total: all.length, filled: all.filter(e => e.querySelector('svg')).length,
      missing: all.filter(e => !e.querySelector('svg')).map(e => e.id || e.getAttribute('data-icon'))};
  })()`);
  assert(r.total === 22, 'expected 22 data-icon placeholders, found ' + r.total);
  assert(r.filled === 21 && r.missing.join() === 'weather-btn', `icons: ${r.filled}/${r.total} have an SVG; without: ${r.missing}`);
};

// Test 2: Tools.setup must not replace the canvas (a clone has no pixels) and must not stack duplicate listeners.
tests.canvas = async p => {
  const r = await p.eval(`(() => {
    const c = document.getElementById('studio-canvas'); c._tag = 'orig';
    const ctx = c.getContext('2d'); ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 50, 50);
    Tools.setup('studio-canvas'); Tools.setup('studio-canvas'); Tools.setup('studio-canvas');
    const c2 = document.getElementById('studio-canvas');
    const px = c2.getContext('2d').getImageData(10, 10, 1, 1).data[0];
    // Count how many times one mousedown reaches _onDown: 3 setup() calls must still mean exactly 1.
    let n = 0; const orig = Tools._onDown; Tools._onDown = function () { n++; };
    c2.dispatchEvent(new MouseEvent('mousedown', { clientX: 5, clientY: 5, bubbles: true }));
    Tools._onDown = orig;
    return { same: c2._tag === 'orig', red: px, handlers: n };
  })()`);
  assert(r.same, 'canvas element was replaced by Tools.setup');
  assert(r.red === 255, 'canvas pixels lost after Tools.setup (red=' + r.red + ')');
  assert(r.handlers === 1, 'mousedown handler ran ' + r.handlers + ' times after 3 setup() calls');
};

// Test 3: a card locked at a low level must get its ORIGINAL onclick back when the level rises.
tests.cardLocks = async p => {
  const r = await p.eval(`(() => {
    Game.state.level = 1; Game._updateCardLocks();
    const lockedCls = document.getElementById('card-salon').classList.contains('locked');
    Game.state.level = 7; Game._updateCardLocks();
    Game.goTo('menu');
    document.getElementById('card-salon').click();
    return { lockedCls, screen: Game.currentScreen };
  })()`);
  assert(r.lockedCls, 'salon card should be locked at level 1');
  assert(r.screen === 'salon', 'unlocked salon card did not open the salon (screen=' + r.screen + ')');
};

// Test 4: saved soundOn=false must be applied to Sound.enabled and the settings checkbox at start-up.
tests.sound = async p => {
  const r = await p.eval(`({enabled: Sound.enabled, checked: document.getElementById('setting-sound').checked})`);
  assert(r.enabled === false && r.checked === false, 'saved soundOn=false not applied: ' + JSON.stringify(r));
};

// Test 5: the closet tab highlight must follow the chosen filter for icon-only tabs.
tests.closetTabs = async p => {
  const r = await p.eval(`(() => {
    Closet.filterTab('hair');
    const a = [...document.querySelectorAll('.closet-tabs .tab.active')];
    return a.map(t => t.getAttribute('onclick'));
  })()`);
  assert(r.length === 1 && /'hair'/.test(r[0]), 'active closet tabs after filterTab(hair): ' + JSON.stringify(r));
};

// Test 6: a player-typed item name must not be interpreted as HTML in the customer detail pane.
tests.escape = async p => {
  const r = await p.eval(`(() => {
    Game.state.closet = [{ id: 1, type: 'books', name: '<img id="pwn" src=x>', createdAt: 1 }];
    const d = document.createElement('div');
    Game._serveCustomer('Ann', 'books', 'Nice', d, null);
    return { injected: !!d.querySelector('#pwn'), shown: d.textContent.includes('<img id="pwn" src=x>') };
  })()`);
  assert(!r.injected && r.shown, 'item name was inserted as HTML: ' + JSON.stringify(r));
};

// Test 7: every icon name requested by the stations must exist (otherwise Icons.get silently shows the star).
tests.iconNames = async p => {
  const r = await p.eval(`['lipstick','phone','tablet','airpods','blanket','pillow','rug'].filter(n => !(n in Icons.paths))`);
  assert(r.length === 0, 'icons missing from Icons.paths: ' + r.join(','));
};

// Test 8: Done in tech/decor with nothing made, and makeup without a canvas, must award no XP.
tests.noEmptyXP = async p => {
  const r = await p.eval(`(() => {
    const out = {}; Game.state.xp = 0;
    Tech.deviceType = null; Tech.finish(); out.tech = Game.state.xp;
    Decor.decorType = null; Decor.finish(); out.decor = Game.state.xp;
    const mc = document.getElementById('makeup-canvas'); mc.id = 'makeup-canvas-x';
    Makeup.finish(); mc.id = 'makeup-canvas'; out.makeup = Game.state.xp;
    out.closet = Game.state.closet.length;
    // Positive control: a real item must still pay (tech 50 XP) and be stored, so the guard is not over-eager.
    Tech.deviceType = 'phone'; Tech.finish(); out.techReal = Game.state.xp; out.closetReal = Game.state.closet.length;
    return out;
  })()`);
  assert(r.techReal === 50 && r.closetReal === 1, 'a real tech item no longer pays: ' + JSON.stringify(r));
  assert(r.tech === 0 && r.decor === 0 && r.makeup === 0 && r.closet === 0, 'XP/closet after empty Done: ' + JSON.stringify(r));
};

// Test 9: a large XP jump must raise several levels in one checkLevelUp() call.
tests.multiLevel = async p => {
  const r = await p.eval(`(() => { Game.state.level = 1; Game.state.xp = 700; const up = Game.checkLevelUp(); return { up, level: Game.state.level }; })()`);
  assert(r.up === true && r.level === 5, 'level after 700 xp: ' + r.level + ' (expected 5)');
};

// Test 10: newGame must reset the avatar to the defaults, not keep the previous look.
tests.newGameCharacter = async p => {
  const r = await p.eval(`(() => { Character.data.hairStyle = 'mohawk'; Character.data.skinTone = '#000000'; Game.newGame(); return Character.data; })()`);
  assert(r.hairStyle === 'long' && r.skinTone === '#FDDBB4', 'Character.data after newGame: ' + JSON.stringify(r));
};

// Test 11: Roll Again must replace the summary, not stack another one under it.
tests.rollAgain = async p => {
  const r = await p.eval(`(() => {
    Game.goTo('books'); Books._buildSidePanel('random'); Books._generateRandom(document.getElementById('books-side'));
    const s = document.getElementById('books-side');
    return { h4: s.querySelectorAll('h4').length, buttons: s.querySelectorAll('button').length };
  })()`);
  assert(r.h4 === 1 && r.buttons === 1, 'books side panel after reroll: ' + JSON.stringify(r));
};

// Test 12: CSS animation definitions: one `shimmer` keyframes block, a border-dance that animates a property a CSS border/background supports.
tests.css = async p => {
  const r = await p.eval(`(() => {
    // Cross-origin sheets (the Google Fonts link) throw on .cssRules, so each sheet is read inside try/catch.
    const rules = sh => { try { return [...sh.cssRules]; } catch (e) { return []; } };
    const kf = []; for (const sh of document.styleSheets) for (const r of rules(sh)) if (r.type === CSSRule.KEYFRAMES_RULE) kf.push(r);
    const named = n => kf.filter(k => k.name === n);
    const dance = named('border-dance')[0];
    const props = dance ? [...dance.cssRules].flatMap(f => [...f.style]) : [];
    const used = n => { let u = false; for (const sh of document.styleSheets) for (const r of rules(sh)) if (r.style && (r.style.animationName || '').includes(n)) u = true; return u; };
    return { shimmerCount: named('shimmer').length, dance: props, danceUsed: used('border-dance'),
      titleAnim: getComputedStyle(document.querySelector('.shimmer-text') || document.body).animationName };
  })()`);
  assert(r.shimmerCount === 1, '@keyframes shimmer defined ' + r.shimmerCount + ' times');
  // Chrome reports the shorthand as longhands (background-position-x/-y), so match by prefix.
  assert(r.dance.some(n => n.startsWith('background-position')), 'border-dance should animate background-position: ' + r.dance);
  
  assert(!r.dance.includes('stroke-dashoffset'), 'border-dance still animates stroke-dashoffset: ' + r.dance);
};

// Per-test page options (some tests need a saved game loaded before scripts run).
const seeds = {
  sound: { fashion_state: JSON.stringify({ level: 1, xp: 0, coins: 0, closet: [], character: null, weather: 'sunny', soundOn: false, hasStarted: true }) },
};

(async () => {
  const only = process.argv.slice(2);
  let failed = 0;
  for (const [name, fn] of Object.entries(tests)) {
    if (only.length && !only.includes(name)) continue;
    // A fresh browser per test keeps global state (Game.state, canvases) isolated.
    const page = await launch(URL, { seed: seeds[name] });
    try { await fn(page); console.log('PASS ' + name); }
    catch (e) { failed++; console.log('FAIL ' + name + ' :: ' + e.message); }
    finally { page.close(); }
  }
  process.exit(failed ? 1 : 0);
})();
