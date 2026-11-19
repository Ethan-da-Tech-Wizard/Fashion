// ==============================================================================
// Program: utils.js
// Programmer: Ethan-da-Tech-Wizard
// Last Modified: November 19, 2026
// Purpose: Core mathematical, colorimetric, canvas rendering, and DOM utility engine.
//          Provides high-precision HSL/RGB/HEX color space conversions, procedural
//          geometry drawing routines (stars, hearts, crowns, moons, waves), safe
//          localStorage serialization wrappers, debounce throttling, and global
//          game configuration constants for progression levels, cosmetics, and fabrics.
// ==============================================================================
// FILE OVERVIEW
// utils.js is the first script loaded by index.html and has no dependencies of its own.
// Everything else in the game relies on it, so it must stay free of references to the
// other modules. It defines two kinds of globals:
//   1. `U`: a toolbox object of small pure helpers (colour conversion, random numbers,
//      DOM shortcuts, localStorage wrappers) plus two canvas shape routines (U.drawStar,
//      U.drawHeart) that are attached to U further down the file.
//   2. Constant data tables (garment types, fabric patterns, level thresholds, colour
//      presets, ...) that the station modules read to build their menus and to decide
//      what is unlocked at each level.
//
// Who calls it: every other file (Game, Character, ColorWheel, Stations, Salon, Makeup,
// Tech, Decor, Books, Tools). It calls only browser APIs (document, localStorage,
// Math.random, canvas 2D context).
//
// Design decisions:
//   - Colours are exchanged as "#RRGGBB" strings between modules, and HSL triplets are
//     used only where hue/lightness maths is needed (colour wheel, random outfits).
//   - Randomness uses Math.random, which is not seedable, so generated content is not
//     reproducible; that is fine for a toy game but means tests cannot assert exact values.
//   - Storage failures (private mode, quota exceeded) are swallowed on purpose so the
//     game still runs, it just forgets progress.
//
// Known limits: hexToRgb only accepts 6-digit hex (see the note on that function).
// How to test: open the browser console and call e.g. U.hexToHsl('#ff0000') -> [0,100,50],
// or U.hslToHex(120,100,50) -> '#00ff00'.

/* ===== UTILS & CONSTANTS ===== */
// `U` is a plain object used as a namespace rather than a class because none of the
// helpers keep state. Keeping it a single global makes calls short (U.rand(1, 6)).
const U = {
  /**
   * Retrieves the 2D rendering context for a canvas element by DOM id.
   * @param {string} id - HTML element id of target canvas.
   * @returns {CanvasRenderingContext2D}
   */
  // Convenience wrapper; no module calls it at the moment (they fetch their own canvases).
  // Throws a
  // TypeError if the id does not exist, so callers must only pass ids present in index.html.
  getCtx(id) {
    return document.getElementById(id).getContext('2d');
  },

  /**
   * Clears the entire drawing surface of a canvas element.
   * @param {string} id - HTML element id of target canvas.
   */
  clearCanvas(id) {
    // Fetches the element once so width/height are read from the same node that is cleared;
    // using the canvas's own width/height (the backing-store size, not the CSS size) clears
    // every pixel even when CSS scales the element.
    const c = document.getElementById(id);
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
  },

  /**
   * Resizes canvas internal pixel buffer to match parent container's layout dimensions.
   * @param {string} id - HTML element id of target canvas.
   */
  resizeCanvas(id) {
    // Reads the parent's CSS box instead of the canvas's own so the canvas fills its container.
    // Setting c.width/c.height also clears the canvas and resets the context state, so callers
    // must redraw afterwards. getBoundingClientRect returns fractional sizes; the browser
    // truncates them when assigned to width/height.
    const c = document.getElementById(id);
    const r = c.parentElement.getBoundingClientRect();
    c.width = r.width;
    c.height = r.height;
  },

  /* Color conversions */

  /**
   * Transforms cylindrical HSL coordinates into linear RGB color space [0..255].
   * Algorithm computes chroma amplitude 'a' and modulo piecewise hue intervals.
   *
   * @param {number} h - Hue in degrees [0..360].
   * @param {number} s - Saturation percentage [0..100].
   * @param {number} l - Lightness percentage [0..100].
   * @returns {[number, number, number]} Triplet of [r, g, b] integer values in range 0-255.
   */
  hslToRgb(h, s, l) {
    // HSL inputs arrive as percentages (0-100) but the formula below works on fractions
    // (0-1), so normalise first. Hue stays in degrees because it is divided by 30 below to
    // index the 12 half-sextants of the colour wheel.
    s /= 100;
    l /= 100;

    // This is the standard CSS Color 4 HSL-to-RGB formulation. k(n) maps a channel offset n
    // (0 for red, 8 for green, 4 for blue; each channel is 120 degrees = 4 units apart) plus
    // the hue into a position on a 12-step cycle.
    const k = n => (n + h / 30) % 12;

    // `a` is the maximum deviation from the middle lightness, i.e. how far a channel can swing
    // above or below l. It is limited by min(l, 1-l) so the result never leaves [0,1] near
    // black or white, and it scales with saturation (s = 0 gives pure grey).
    const a = s * Math.min(l, 1 - l);

    // Evaluates one channel: the clamp(k-3, 9-k, 1) term draws a trapezoid that rises, holds
    // and falls as hue moves around the wheel, bounded to [-1, 1]. Multiplying by `a` and
    // subtracting from l gives that channel's 0-1 value.
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

    // Scales to bytes and rounds. Channel order is R, G, B, which is why the offsets passed
    // to f are 0, 8, 4 (not 0, 4, 8).
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  },

  /**
   * Formats RGB byte channels into a standard 7-character hexadecimal color string (#RRGGBB).
   * @param {number} r - Red channel [0..255].
   * @param {number} g - Green channel [0..255].
   * @param {number} b - Blue channel [0..255].
   * @returns {string} Hex color string.
   */
  rgbToHex(r, g, b) {
    // Each channel is converted to base 16 and left-padded to two digits so that, for
    // example, 5 becomes "05" and not "5" (a one-digit channel would shift the others and
    // produce an invalid colour). Inputs must already be integers in 0-255; fractional
    // values would produce characters like "." in the output.
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Converts HSL values directly into a hexadecimal color string.
   */
  hslToHex(h, s, l) {
    const [r, g, b] = U.hslToRgb(h, s, l);
    return U.rgbToHex(r, g, b);
  },

  /**
   * Parses a hexadecimal color string (#RGB or #RRGGBB) into integer [r, g, b] channels.
   * Fallback returns hot pink [255, 105, 180] on malformed hex input.
   */
  hexToRgb(hex) {
    // The regex accepts an optional leading '#', exactly six hex digits (case-insensitive)
    // and nothing else. A 3-digit shorthand such as "#f0a" does NOT match despite the
    // doc comment above, so it returns the pink fallback. Colour values the game itself
    // produces are always 7-character strings, so this only matters for hand-typed hex.
    const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);

    // The fallback [255,105,180] ("hot pink") is deliberately loud: a bad colour is obvious
    // on screen rather than silently turning black.
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 105, 180];
  },

  /**
   * Deconstructs hexadecimal color string into RGB float channels [0..1] and derives cylindrical HSL representation.
   * Calculates lightness from channel extents, saturation from chroma ratio, and sector-based hue.
   *
   * @param {string} hex - Hexadecimal color code.
   * @returns {[number, number, number]} Triplet of [hue 0-360, sat 0-100, light 0-100].
   */
  hexToHsl(hex) {
    // Channels are scaled to 0-1 here because the HSL formulas below are defined on fractions.
    let [r, g, b] = U.hexToRgb(hex).map(x => x / 255);

    // max/min channel values give the colour's lightness and chroma (their difference d).
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    // Equal channels mean a grey: no hue or saturation exists, so both are set to 0
    // (avoids a divide by zero on d below).
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;

      // Saturation depends on lightness: for light colours (l > 0.5) the denominator uses the
      // distance to white, for dark ones the distance to black. This is the standard HSL formula.
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      // Hue is the position on the colour wheel, in sixths. The channel that holds the maximum
      // decides which sixth: red -> 0, green -> 2, blue -> 4 (hence the + 2 and + 4). The
      // `+ 6` for red when g < b wraps negative hues around to the 300-360 degree range.
      switch(max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    // Converts the 0-1 hue and saturation/lightness back to degrees and percentages and
    // rounds, so a round trip hex -> HSL -> hex can differ by a couple of units per channel.
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  },

  /* Math helpers */

  /**
   * Generates a pseudo-random integer between min and max (inclusive).
   */
  rand(min, max) {
    // Math.random() is in [0,1), so multiplying by (max-min+1) and flooring gives every
    // integer in [min, max] an equal chance. Assumes min <= max and integer arguments.
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Generates a pseudo-random floating point number in [min, max).
   */
  randFloat(min, max) {
    // Unlike rand(), the upper bound is exclusive and the result is not rounded; used for
    // CSS values such as animation durations and font scale.
    return Math.random() * (max - min) + min;
  },

  /**
   * Selects a random item from a non-empty array.
   */
  pick(arr) {
    // Uniform choice. Passing an empty array returns undefined (index 0 of nothing), so
    // callers must make sure the list is not empty.
    return arr[Math.floor(Math.random() * arr.length)];
  },

  /**
   * Escapes text so it can be placed inside an innerHTML template literal as plain text.
   * Added for Game._serveCustomer, which builds markup from player-typed book titles.
   *
   * @param {*} text - Any value; it is converted with String().
   * @returns {string} The text with & < > " ' replaced by HTML entities.
   */
  escapeHtml(text) {
    // The ampersand must be replaced first, otherwise the entities produced by the later replacements
    // would themselves be escaped (&lt; would become &amp;lt;). Quotes are included so the result is also
    // safe inside an attribute value.
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * Clamps a scalar numeric value between lower and upper bounds.
   */
  clamp(v, min, max) {
    // Order of operations matters: min(max,v) caps the top first, then max(min, ...) lifts to
    // the floor. If min > max the lower bound wins.
    return Math.max(min, Math.min(max, v));
  },

  /**
   * Performs linear interpolation between values a and b by factor t [0..1].
   */
  lerp(a, b, t) {
    // At t = 0 returns a, at t = 1 returns b; t outside [0,1] extrapolates.
    return a + (b - a) * t;
  },

  /**
   * Computes Euclidean 2D distance between points (x1, y1) and (x2, y2).
   */
  dist(x1, y1, x2, y2) {
    // Straight Pythagorean distance in canvas pixels. Not called by the other modules at the
    // moment; kept as a general helper.
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  },

  /* DOM helpers */

  /**
   * Document querySelector shorthand.
   */
  $(sel) {
    // Returns the first match or null. Not currently called by other modules (they use
    // document.getElementById directly).
    return document.querySelector(sel);
  },

  /**
   * Document querySelectorAll shorthand.
   */
  $$(sel) {
    return document.querySelectorAll(sel);
  },

  /**
   * Displays an element by clearing its inline display style.
   */
  show(el) {
    // Accepts either an element or a CSS selector string, so call sites can write
    // U.show('#modal'). Silently does nothing if the selector matches nothing.
    if (typeof el === 'string') el = U.$(el);

    // Setting display to '' removes the inline override, so the element falls back to
    // whatever the stylesheet says (e.g. flex) instead of forcing a particular value.
    if (el) el.style.display = '';
  },

  /**
   * Hides an element by setting inline display style to 'none'.
   */
  hide(el) {
    if (typeof el === 'string') el = U.$(el);
    if (el) el.style.display = 'none';
  },

  /* Storage */

  /**
   * Serializes and writes key-value data to localStorage with application namespace prefix.
   */
  save(key, data) {
    // Keys are prefixed with 'fashion_' so this game's data cannot collide with other apps
    // on the same origin (Game.resetGame removes 'fashion_state' directly, which depends on
    // this prefix). The try/catch swallows QuotaExceededError and SecurityError (storage
    // disabled); the caller is never told that saving failed.
    try { localStorage.setItem('fashion_' + key, JSON.stringify(data)); } catch(e){}
  },

  /**
   * Reads and deserializes key-value data from localStorage. Returns null if missing or error.
   */
  load(key) {
    // JSON.parse(null) returns null and corrupt JSON throws, so both a missing key and
    // unreadable data end up as null, which Game.init() treats as "no save".
    try { return JSON.parse(localStorage.getItem('fashion_' + key)); } catch(e){ return null; }
  },

  /* Debounce */

  /**
   * Delays invocation until after wait interval has elapsed since the last call to throttle event frequency.
   * @param {Function} fn - Target callback.
   * @param {number} ms - Throttle window in milliseconds.
   */
  debounce(fn, ms) {
    // `t` is the pending timer id kept in a closure, so every wrapped function has its own
    // timer. Each new call cancels the previous timer, so only the last call in a burst runs,
    // `ms` after it. Not currently called by any module; available for resize or slider handlers.
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }
};

/* ===== GAME CONSTANTS & METRIC DEFINITIONS ===== */

// Each table below is plain data; modules iterate over them to build buttons, so adding
// an entry here adds a menu option automatically (provided the drawing code supports
// the new id).
//
// GARMENT_TYPES: items the Fashion Studio can make. Fields: id (key stored on the closet
// item as `subtype`), name (button label), emoji (shown in the closet when the item has
// no image), icon (same emoji; kept for older code).
// Catalog of designable garment silhouettes
const GARMENT_TYPES = [
  { id: 'dress', name: 'Dress', emoji: '👗', icon: '👗' },
  { id: 'pants', name: 'Pants', emoji: '👖', icon: '👖' },
  { id: 'shorts', name: 'Shorts', emoji: '🩳', icon: '🩳' },
  { id: 'shoes', name: 'Shoes', emoji: '👟', icon: '👟' },
  { id: 'headband', name: 'Headband', emoji: '🎀', icon: '🎀' },
  { id: 'bow', name: 'Bow', emoji: '🎗️', icon: '🎗️' },
];

// FABRIC_PATTERNS: fill patterns for garments. `id` is matched by the pattern-drawing code
// in js/tools.js / stations.js; the list order is the order of buttons. Which ones are
// available depends on the player's level (see LEVEL_DATA unlock lists).
// Available fabric texture pattern shaders
const FABRIC_PATTERNS = [
  { id: 'solid', name: 'Solid' },
  { id: 'stripes', name: 'Stripes' },
  { id: 'polka', name: 'Polka Dots' },
  { id: 'plaid', name: 'Plaid' },
  { id: 'floral', name: 'Floral' },
  { id: 'stars', name: 'Stars' },
  { id: 'hearts', name: 'Hearts' },
  { id: 'zigzag', name: 'Zigzag' },
];

// STICKER_SETS: emoji stamped onto designs as stickers. 60 entries, ten per row; the Unicode
// characters are used as text so no image assets are needed. 🦋 appears twice, harmless.
// Decorative emoji sticker collection
const STICKER_SETS = [
  '⭐','💫','✨','🌟','💎','🦋','🌸','🌺','🌹','💐',
  '🎵','🎶','👑','💗','💜','💙','🩵','💚','💛','🧡',
  '❤️','🖤','🤍','🫶','🌈','☁️','🔥','❄️','🍀','🌙',
  '🐱','🐶','🦄','🐰','🐻','🦊','🐼','🦁','🐸','🦋',
  '🍓','🍒','🍭','🧁','🍰','🎂','🍩','🍬','🍫','☕',
  '🏀','⚽','🎾','🎯','🎪','🎡','🎠','🎨','🎭','🎬'
];

// BADGE_SETS: emoji used for the badge decoration tool (js/stations.js). 20 entries.
// Achievement insignia badge collection
const BADGE_SETS = [
  '🏆','🥇','🎖️','🏅','💫','⚡','🌠','🔮','💠','🎯',
  '🛡️','⚔️','🗡️','🪄','👸','🤴','🧝','🧚','🧜','🦹'
];

// STENCIL_SETS: shapes that can be stamped as a stencil. Fields: id, name (button label)
// and draw(ctx, x, y, s), which fills a path centred on (x, y) with size s (a radius or
// half-width, in canvas pixels) using the context's current fillStyle. The drawing code is
// pure canvas path maths, no images. 'moon' uses destination-out compositing to carve a
// second circle out of the first (and restores source-over), so it needs a transparent
// layer to work properly. Consumed by js/tools.js, which indexes it by position.
// Vector stencil shape rendering paths
const STENCIL_SETS = [
  { id: 'star', name: '⭐ Star', draw: (ctx, x, y, s) => { U.drawStar(ctx, x, y, s, 5); } },
  { id: 'heart', name: '❤️ Heart', draw: (ctx, x, y, s) => { U.drawHeart(ctx, x, y, s); } },
  { id: 'circle', name: '⭕ Circle', draw: (ctx, x, y, s) => { ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill(); } },
  { id: 'diamond', name: '💎 Diamond', draw: (ctx, x, y, s) => { ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.7, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.7, y); ctx.closePath(); ctx.fill(); } },
  { id: 'flower', name: '🌸 Flower', draw: (ctx, x, y, s) => { for(let i = 0; i < 6; i++){ const a = i * Math.PI / 3; ctx.beginPath(); ctx.arc(x + Math.cos(a) * s * 0.5, y + Math.sin(a) * s * 0.5, s * 0.35, 0, Math.PI * 2); ctx.fill(); } } },
  { id: 'lightning', name: '⚡ Bolt', draw: (ctx, x, y, s) => { ctx.beginPath(); ctx.moveTo(x - s * 0.2, y - s); ctx.lineTo(x + s * 0.4, y - s * 0.1); ctx.lineTo(x, y + s * 0.1); ctx.lineTo(x + s * 0.6, y + s); ctx.lineTo(x - s * 0.1, y + s * 0.15); ctx.lineTo(x + s * 0.1, y - s * 0.1); ctx.closePath(); ctx.fill(); } },
  { id: 'moon', name: '🌙 Moon', draw: (ctx, x, y, s) => { ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(x + s * 0.4, y - s * 0.2, s * 0.75, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; } },
  { id: 'crown', name: '👑 Crown', draw: (ctx, x, y, s) => { ctx.beginPath(); ctx.moveTo(x - s, y + s * 0.5); ctx.lineTo(x - s, y - s * 0.3); ctx.lineTo(x - s * 0.5, y + s * 0.1); ctx.lineTo(x, y - s * 0.6); ctx.lineTo(x + s * 0.5, y + s * 0.1); ctx.lineTo(x + s, y - s * 0.3); ctx.lineTo(x + s, y + s * 0.5); ctx.closePath(); ctx.fill(); } },
  { id: 'paw', name: '🐾 Paw', draw: (ctx, x, y, s) => { ctx.beginPath(); ctx.ellipse(x, y + s * 0.2, s * 0.5, s * 0.4, 0, 0, Math.PI * 2); ctx.fill(); for(let i = 0; i < 3; i++){ ctx.beginPath(); ctx.arc(x - s * 0.3 + i * s * 0.3, y - s * 0.3, s * 0.18, 0, Math.PI * 2); ctx.fill(); } ctx.beginPath(); ctx.arc(x + s * 0.45, y - s * 0.05, s * 0.15, 0, Math.PI * 2); ctx.fill(); } },
  { id: 'wave', name: '🌊 Wave', draw: (ctx, x, y, s) => { ctx.beginPath(); ctx.moveTo(x - s, y); for(let i = 0; i < 4; i++){ const sx = x - s + i * s * 0.67; ctx.quadraticCurveTo(sx + s * 0.17, y - s * 0.4, sx + s * 0.33, y); ctx.quadraticCurveTo(sx + s * 0.5, y + s * 0.4, sx + s * 0.67, y); } ctx.lineTo(x + s, y + s * 0.5); ctx.lineTo(x - s, y + s * 0.5); ctx.closePath(); ctx.fill(); } },
];

// Defined after STENCIL_SETS even though the table calls them: the entries only call
// U.drawStar/U.drawHeart when draw() runs later, by which time both exist. Do not call
// STENCIL_SETS draw functions before this file finishes loading.
/**
 * Draws an n-pointed geometric star polygon path on the 2D canvas.
 * @param {CanvasRenderingContext2D} ctx - Target 2D rendering context.
 * @param {number} x - Center horizontal coordinate.
 * @param {number} y - Center vertical coordinate.
 * @param {number} r - Outer circumscribed radius.
 * @param {number} points - Number of star points (e.g. 5).
 */
U.drawStar = function(ctx, x, y, r, points) {
  ctx.beginPath();

  // Stars alternate between outer and inner vertices, so 2*points vertices are generated.
  for (let i = 0; i < points * 2; i++) {
    // Angle step is pi/points (half a point per vertex). Subtracting pi/2 rotates the shape
    // so the first vertex points straight up (canvas y grows downward, 0 rad would point right).
    const a = (i * Math.PI / points) - Math.PI / 2;

    // Even vertices sit on the outer radius r; odd ones on the inner radius r*0.4. The 0.4
    // ratio gives a classic plump 5-point star; a smaller ratio makes spikier stars.
    const rad = i % 2 === 0 ? r : r * 0.4;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    else ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }

  // Closes the outline back to the first vertex, then fills with the current fillStyle.
  ctx.closePath();
  ctx.fill();
};

/**
 * Draws a symmetrical cubic bezier heart curve on the 2D canvas.
 * @param {CanvasRenderingContext2D} ctx - Target 2D rendering context.
 * @param {number} x - Center horizontal coordinate.
 * @param {number} y - Center vertical coordinate.
 * @param {number} s - Scale dimension radius.
 */
U.drawHeart = function(ctx, x, y, s) {
  // The heart is built from four cubic Beziers starting at the dip between the two lobes
  // (top centre, slightly below y), going down the left side, to the bottom point
  // (x, y+s), then back up the right side. The numbers are hand-tuned control points
  // (fractions of s) that make the lobes round; they are symmetrical about x.
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y - s * 0.4, x - s, y - s * 0.4, x - s, y + s * 0.1);
  ctx.bezierCurveTo(x - s, y + s * 0.6, x, y + s * 0.9, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.9, x + s, y + s * 0.6, x + s, y + s * 0.1);
  ctx.bezierCurveTo(x + s, y - s * 0.4, x, y - s * 0.4, x, y + s * 0.3);
  ctx.closePath();
  ctx.fill();
};

// Enumerations used by the character creator and customer generator. Each string must
// have a matching case in the drawing code in js/character.js; adding a name here without
// adding drawing support would draw nothing (or a default shape).
// Morphological face, eye, and hairstyle enumeration keys
const HAIR_STYLES = ['bob','long','pixie','curly','braids','ponytail','buns','mohawk','wavy','afro','straight','sidepart'];
const FACE_SHAPES = ['round','oval','heart','square'];
const EYE_SHAPES = ['round','almond','cat','big','closed-happy'];

// Books station data: genre buttons and a pool of titles for the "random title" button.
// Book creation station constants
const BOOK_GENRES = ['Fantasy','Romance','Mystery','Sci-Fi','Adventure','Cooking','Art','Poetry','Comics','Fashion'];
const BOOK_TITLES_RANDOM = [
  'The Starlit Runway','Velvet Dreams','Glitter & Grace','Threads of Gold',
  'Moonlight Couture','The Crystal Needle','Silk Whispers','Neon Blooms',
  'The Hidden Closet','Colors of Tomorrow','Sparkle Academy','The Fashion Fox'
];

// DEVICE_TYPES: gadgets the Tech Workshop can decorate. w and h are the device's body
// size in canvas pixels (the canvas is 600x500), chosen to keep roughly real-world
// proportions: tall phone, wide tablet, squarish earbud case.
// Tech station gadget models with physical pixel canvas aspect dimensions
const DEVICE_TYPES = [
  { id: 'phone', name: 'Phone', emoji: '📱', w: 120, h: 220 },
  { id: 'tablet', name: 'Tablet', emoji: '📱', w: 220, h: 160 },
  { id: 'airpods', name: 'AirPods', emoji: '🎧', w: 160, h: 180 },
];

// DECOR_TYPES: home decor items; w/h are the drawn bounding box in canvas pixels on the
// 600x500 station canvas (blanket and rug are landscape, the pillow is square).
// Home decor craftable silhouettes with pixel bounding boxes
const DECOR_TYPES = [
  { id: 'blanket', name: 'Blanket', emoji: '🧣', w: 250, h: 200 },
  { id: 'pillow', name: 'Pillow', emoji: '🛏️', w: 150, h: 150 },
  { id: 'rug', name: 'Rug', emoji: '🟫', w: 250, h: 160 },
];

// LEVEL_DATA: progression table. `lvl` is the level number, `xp` the TOTAL xp needed to
// reach it (cumulative, not per level; the gaps are 100, 150, 200, 250, 300, 400, 500, 600, 700),
// and `unlocks` the display strings shown on the level-up screen. Game.checkLevelUp()
// looks up the entry for (current level + 1) and compares Game.state.xp against its xp.
// Note that the strings are display-only text; the station unlock levels are hard-coded
// separately in Game._updateCardLocks and Game.startFreestyle (salon 3, makeup 4, tech 5,
// decor 6, books 7), so changing a level here does not move those gates.
// Progression leveling curves with XP thresholds and unlocked tooling features
const LEVEL_DATA = [
  { lvl:1, xp:0, unlocks:['Basic fabrics','5 sticker packs','Dye'] },
  { lvl:2, xp:100, unlocks:['Glitter!','3 new hairstyles','Badges'] },
  { lvl:3, xp:250, unlocks:['Hair Salon opens!','Polka dot fabric','More stickers'] },
  { lvl:4, xp:450, unlocks:['Makeup Studio opens!','Plaid fabric','Pearls'] },
  { lvl:5, xp:700, unlocks:['Tech Workshop opens!','Spray paint','Stencils'] },
  { lvl:6, xp:1000, unlocks:['Home Decor opens!','Tinsel','Floral fabric'] },
  { lvl:7, xp:1400, unlocks:['Book Shop opens!','Stars fabric','New eye styles'] },
  { lvl:8, xp:1900, unlocks:['Custom makeup colors','Zigzag fabric','More badges'] },
  { lvl:9, xp:2500, unlocks:['Premium glitter','4-color stencils','Luxury pearls'] },
  { lvl:10, xp:3200, unlocks:['Master Designer!','All items unlocked','Golden tools'] },
];

// Pool of first names for generated customers (Game._renderCustomers picks one at random;
// the name has no gameplay effect).
// NPC customer names queue
const CUSTOMER_NAMES = [
  'Luna','Aria','Stella','Ruby','Jade','Ivy','Pearl','Violet','Scarlet','Hazel',
  'Finn','Kai','Leo','Milo','Felix','Oscar','Hugo','Max','Theo','Ezra'
];

// SKIN_PRESETS: preset swatches in the colour wheel for skin. Listed as two runs
// of five, each roughly light to dark; also used to give random customers a skin colour.
// Standard Fitzpatrick and fantasy skin tone palette presets
const SKIN_PRESETS = ['#FDDBB4','#E8B98D','#D4956B','#BA7A50','#8D5524','#6B3E26','#FFDBAC','#F1C27D','#C68642','#503335'];

// HAIR_COLOR_PRESETS: natural colours first (blacks, browns, blonde) then fantasy colours
// (pink, purple, red, blue, teal, green, white-ish).
// Curated hair color swatch presets
const HAIR_COLOR_PRESETS = ['#1a1a2e','#3d2b1f','#6b3a2a','#8B4513','#CD853F','#DAA520','#FFD700','#FF69B4','#9370DB','#DC143C','#1E90FF','#00CED1','#90EE90','#F0F0F0'];
