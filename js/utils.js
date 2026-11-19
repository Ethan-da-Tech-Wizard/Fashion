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

/* ===== UTILS & CONSTANTS ===== */
const U = {
  /**
   * Retrieves the 2D rendering context for a canvas element by DOM id.
   * @param {string} id - HTML element id of target canvas.
   * @returns {CanvasRenderingContext2D}
   */
  getCtx(id) {
    return document.getElementById(id).getContext('2d');
  },

  /**
   * Clears the entire drawing surface of a canvas element.
   * @param {string} id - HTML element id of target canvas.
   */
  clearCanvas(id) {
    const c = document.getElementById(id);
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
  },

  /**
   * Resizes canvas internal pixel buffer to match parent container's layout dimensions.
   * @param {string} id - HTML element id of target canvas.
   */
  resizeCanvas(id) {
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
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
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
    const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
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
    let [r, g, b] = U.hexToRgb(hex).map(x => x / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch(max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  },

  /* Math helpers */

  /**
   * Generates a pseudo-random integer between min and max (inclusive).
   */
  rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Generates a pseudo-random floating point number in [min, max).
   */
  randFloat(min, max) {
    return Math.random() * (max - min) + min;
  },

  /**
   * Selects a random item from a non-empty array.
   */
  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  /**
   * Clamps a scalar numeric value between lower and upper bounds.
   */
  clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  },

  /**
   * Performs linear interpolation between values a and b by factor t [0..1].
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  /**
   * Computes Euclidean 2D distance between points (x1, y1) and (x2, y2).
   */
  dist(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  },

  /* DOM helpers */

  /**
   * Document querySelector shorthand.
   */
  $(sel) {
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
    if (typeof el === 'string') el = U.$(el);
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
    try { localStorage.setItem('fashion_' + key, JSON.stringify(data)); } catch(e){}
  },

  /**
   * Reads and deserializes key-value data from localStorage. Returns null if missing or error.
   */
  load(key) {
    try { return JSON.parse(localStorage.getItem('fashion_' + key)); } catch(e){ return null; }
  },

  /* Debounce */

  /**
   * Delays invocation until after wait interval has elapsed since the last call to throttle event frequency.
   * @param {Function} fn - Target callback.
   * @param {number} ms - Throttle window in milliseconds.
   */
  debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }
};

/* ===== GAME CONSTANTS & METRIC DEFINITIONS ===== */

// Catalog of designable garment silhouettes
const GARMENT_TYPES = [
  { id: 'dress', name: 'Dress', emoji: '👗', icon: '👗' },
  { id: 'pants', name: 'Pants', emoji: '👖', icon: '👖' },
  { id: 'shorts', name: 'Shorts', emoji: '🩳', icon: '🩳' },
  { id: 'shoes', name: 'Shoes', emoji: '👟', icon: '👟' },
  { id: 'headband', name: 'Headband', emoji: '🎀', icon: '🎀' },
  { id: 'bow', name: 'Bow', emoji: '🎗️', icon: '🎗️' },
];

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

// Decorative emoji sticker collection
const STICKER_SETS = [
  '⭐','💫','✨','🌟','💎','🦋','🌸','🌺','🌹','💐',
  '🎵','🎶','👑','💗','💜','💙','🩵','💚','💛','🧡',
  '❤️','🖤','🤍','🫶','🌈','☁️','🔥','❄️','🍀','🌙',
  '🐱','🐶','🦄','🐰','🐻','🦊','🐼','🦁','🐸','🦋',
  '🍓','🍒','🍭','🧁','🍰','🎂','🍩','🍬','🍫','☕',
  '🏀','⚽','🎾','🎯','🎪','🎡','🎠','🎨','🎭','🎬'
];

// Achievement insignia badge collection
const BADGE_SETS = [
  '🏆','🥇','🎖️','🏅','💫','⚡','🌠','🔮','💠','🎯',
  '🛡️','⚔️','🗡️','🪄','👸','🤴','🧝','🧚','🧜','🦹'
];

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
  for (let i = 0; i < points * 2; i++) {
    const a = (i * Math.PI / points) - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.4;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    else ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
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
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y - s * 0.4, x - s, y - s * 0.4, x - s, y + s * 0.1);
  ctx.bezierCurveTo(x - s, y + s * 0.6, x, y + s * 0.9, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.9, x + s, y + s * 0.6, x + s, y + s * 0.1);
  ctx.bezierCurveTo(x + s, y - s * 0.4, x, y - s * 0.4, x, y + s * 0.3);
  ctx.closePath();
  ctx.fill();
};

// Morphological face, eye, and hairstyle enumeration keys
const HAIR_STYLES = ['bob','long','pixie','curly','braids','ponytail','buns','mohawk','wavy','afro','straight','sidepart'];
const FACE_SHAPES = ['round','oval','heart','square'];
const EYE_SHAPES = ['round','almond','cat','big','closed-happy'];

// Book creation station constants
const BOOK_GENRES = ['Fantasy','Romance','Mystery','Sci-Fi','Adventure','Cooking','Art','Poetry','Comics','Fashion'];
const BOOK_TITLES_RANDOM = [
  'The Starlit Runway','Velvet Dreams','Glitter & Grace','Threads of Gold',
  'Moonlight Couture','The Crystal Needle','Silk Whispers','Neon Blooms',
  'The Hidden Closet','Colors of Tomorrow','Sparkle Academy','The Fashion Fox'
];

// Tech station gadget models with physical pixel canvas aspect dimensions
const DEVICE_TYPES = [
  { id: 'phone', name: 'Phone', emoji: '📱', w: 120, h: 220 },
  { id: 'tablet', name: 'Tablet', emoji: '📱', w: 220, h: 160 },
  { id: 'airpods', name: 'AirPods', emoji: '🎧', w: 160, h: 180 },
];

// Home decor craftable silhouettes with pixel bounding boxes
const DECOR_TYPES = [
  { id: 'blanket', name: 'Blanket', emoji: '🧣', w: 250, h: 200 },
  { id: 'pillow', name: 'Pillow', emoji: '🛏️', w: 150, h: 150 },
  { id: 'rug', name: 'Rug', emoji: '🟫', w: 250, h: 160 },
];

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

// NPC customer names queue
const CUSTOMER_NAMES = [
  'Luna','Aria','Stella','Ruby','Jade','Ivy','Pearl','Violet','Scarlet','Hazel',
  'Finn','Kai','Leo','Milo','Felix','Oscar','Hugo','Max','Theo','Ezra'
];

// Standard Fitzpatrick and fantasy skin tone palette presets
const SKIN_PRESETS = ['#FDDBB4','#E8B98D','#D4956B','#BA7A50','#8D5524','#6B3E26','#FFDBAC','#F1C27D','#C68642','#503335'];

// Curated hair color swatch presets
const HAIR_COLOR_PRESETS = ['#1a1a2e','#3d2b1f','#6b3a2a','#8B4513','#CD853F','#DAA520','#FFD700','#FF69B4','#9370DB','#DC143C','#1E90FF','#00CED1','#90EE90','#F0F0F0'];
