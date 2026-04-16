/* ===== UTILS & CONSTANTS ===== */
const U = {
  /* Canvas helpers */
  getCtx(id) { return document.getElementById(id).getContext('2d'); },
  clearCanvas(id) {
    const c = document.getElementById(id);
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
  },
  resizeCanvas(id) {
    const c = document.getElementById(id);
    const r = c.parentElement.getBoundingClientRect();
    c.width = r.width;
    c.height = r.height;
  },

  /* Color conversions */
  hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0)*255), Math.round(f(8)*255), Math.round(f(4)*255)];
  },
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  },
  hslToHex(h, s, l) {
    const [r, g, b] = U.hslToRgb(h, s, l);
    return U.rgbToHex(r, g, b);
  },
  hexToRgb(hex) {
    const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    return m ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)] : [255,105,180];
  },
  hexToHsl(hex) {
    let [r, g, b] = U.hexToRgb(hex).map(x => x/255);
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h, s, l = (max+min)/2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      switch(max) {
        case r: h = ((g-b)/d + (g<b?6:0))/6; break;
        case g: h = ((b-r)/d+2)/6; break;
        case b: h = ((r-g)/d+4)/6; break;
      }
    }
    return [Math.round(h*360), Math.round(s*100), Math.round(l*100)];
  },

  /* Math helpers */
  rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
  randFloat(min, max) { return Math.random() * (max - min) + min; },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  clamp(v, min, max) { return Math.max(min, Math.min(max, v)); },
  lerp(a, b, t) { return a + (b - a) * t; },
  dist(x1, y1, x2, y2) { return Math.sqrt((x2-x1)**2 + (y2-y1)**2); },

  /* DOM helpers */
  $(sel) { return document.querySelector(sel); },
  $$(sel) { return document.querySelectorAll(sel); },
  show(el) { if (typeof el === 'string') el = U.$(el); if(el) el.style.display = ''; },
  hide(el) { if (typeof el === 'string') el = U.$(el); if(el) el.style.display = 'none'; },

  /* Storage */
  save(key, data) { try { localStorage.setItem('fashion_'+key, JSON.stringify(data)); } catch(e){} },
  load(key) { try { return JSON.parse(localStorage.getItem('fashion_'+key)); } catch(e){ return null; } },

  /* Debounce */
  debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }
};

/* ===== GAME CONSTANTS ===== */
const GARMENT_TYPES = [
  { id: 'dress', name: 'Dress', emoji: '👗', icon: '👗' },
  { id: 'pants', name: 'Pants', emoji: '👖', icon: '👖' },
  { id: 'shorts', name: 'Shorts', emoji: '🩳', icon: '🩳' },
  { id: 'shoes', name: 'Shoes', emoji: '👟', icon: '👟' },
  { id: 'headband', name: 'Headband', emoji: '🎀', icon: '🎀' },
  { id: 'bow', name: 'Bow', emoji: '🎗️', icon: '🎗️' },
];

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

const STICKER_SETS = [
  '⭐','💫','✨','🌟','💎','🦋','🌸','🌺','🌹','💐',
  '🎵','🎶','👑','💗','💜','💙','🩵','💚','💛','🧡',
  '❤️','🖤','🤍','🫶','🌈','☁️','🔥','❄️','🍀','🌙',
  '🐱','🐶','🦄','🐰','🐻','🦊','🐼','🦁','🐸','🦋',
  '🍓','🍒','🍭','🧁','🍰','🎂','🍩','🍬','🍫','☕',
  '🏀','⚽','🎾','🎯','🎪','🎡','🎠','🎨','🎭','🎬'
];

const BADGE_SETS = [
  '🏆','🥇','🎖️','🏅','💫','⚡','🌠','🔮','💠','🎯',
  '🛡️','⚔️','🗡️','🪄','👸','🤴','🧝','🧚','🧜','🦹'
];

const STENCIL_SETS = [
  { id: 'star', name: '⭐ Star', draw: (ctx,x,y,s) => { U.drawStar(ctx,x,y,s,5); } },
  { id: 'heart', name: '❤️ Heart', draw: (ctx,x,y,s) => { U.drawHeart(ctx,x,y,s); } },
  { id: 'circle', name: '⭕ Circle', draw: (ctx,x,y,s) => { ctx.beginPath(); ctx.arc(x,y,s,0,Math.PI*2); ctx.fill(); } },
  { id: 'diamond', name: '💎 Diamond', draw: (ctx,x,y,s) => { ctx.beginPath(); ctx.moveTo(x,y-s); ctx.lineTo(x+s*.7,y); ctx.lineTo(x,y+s); ctx.lineTo(x-s*.7,y); ctx.closePath(); ctx.fill(); } },
  { id: 'flower', name: '🌸 Flower', draw: (ctx,x,y,s) => { for(let i=0;i<6;i++){const a=i*Math.PI/3; ctx.beginPath(); ctx.arc(x+Math.cos(a)*s*.5,y+Math.sin(a)*s*.5,s*.35,0,Math.PI*2); ctx.fill();} } },
  { id: 'lightning', name: '⚡ Bolt', draw: (ctx,x,y,s) => { ctx.beginPath(); ctx.moveTo(x-s*.2,y-s); ctx.lineTo(x+s*.4,y-s*.1); ctx.lineTo(x,y+s*.1); ctx.lineTo(x+s*.6,y+s); ctx.lineTo(x-s*.1,y+s*.15); ctx.lineTo(x+s*.1,y-s*.1); ctx.closePath(); ctx.fill(); } },
  { id: 'moon', name: '🌙 Moon', draw: (ctx,x,y,s) => { ctx.beginPath(); ctx.arc(x,y,s,0,Math.PI*2); ctx.fill(); ctx.globalCompositeOperation='destination-out'; ctx.beginPath(); ctx.arc(x+s*.4,y-s*.2,s*.75,0,Math.PI*2); ctx.fill(); ctx.globalCompositeOperation='source-over'; } },
  { id: 'crown', name: '👑 Crown', draw: (ctx,x,y,s) => { ctx.beginPath(); ctx.moveTo(x-s,y+s*.5); ctx.lineTo(x-s,y-s*.3); ctx.lineTo(x-s*.5,y+s*.1); ctx.lineTo(x,y-s*.6); ctx.lineTo(x+s*.5,y+s*.1); ctx.lineTo(x+s,y-s*.3); ctx.lineTo(x+s,y+s*.5); ctx.closePath(); ctx.fill(); } },
  { id: 'paw', name: '🐾 Paw', draw: (ctx,x,y,s) => { ctx.beginPath(); ctx.ellipse(x,y+s*.2,s*.5,s*.4,0,0,Math.PI*2); ctx.fill(); for(let i=0;i<3;i++){ctx.beginPath(); ctx.arc(x-s*.3+i*s*.3,y-s*.3,s*.18,0,Math.PI*2); ctx.fill();} ctx.beginPath(); ctx.arc(x+s*.45,y-s*.05,s*.15,0,Math.PI*2); ctx.fill(); } },
  { id: 'wave', name: '🌊 Wave', draw: (ctx,x,y,s) => { ctx.beginPath(); ctx.moveTo(x-s,y); for(let i=0;i<4;i++){const sx=x-s+i*s*.67; ctx.quadraticCurveTo(sx+s*.17,y-s*.4,sx+s*.33,y); ctx.quadraticCurveTo(sx+s*.5,y+s*.4,sx+s*.67,y);} ctx.lineTo(x+s,y+s*.5); ctx.lineTo(x-s,y+s*.5); ctx.closePath(); ctx.fill(); } },
];

/* Helper drawing functions for stencils */
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

const HAIR_STYLES = ['bob','long','pixie','curly','braids','ponytail','buns','mohawk','wavy','afro','straight','sidepart'];
const FACE_SHAPES = ['round','oval','heart','square'];
const EYE_SHAPES = ['round','almond','cat','big','closed-happy'];

const BOOK_GENRES = ['Fantasy','Romance','Mystery','Sci-Fi','Adventure','Cooking','Art','Poetry','Comics','Fashion'];
const BOOK_TITLES_RANDOM = [
  'The Starlit Runway','Velvet Dreams','Glitter & Grace','Threads of Gold',
  'Moonlight Couture','The Crystal Needle','Silk Whispers','Neon Blooms',
  'The Hidden Closet','Colors of Tomorrow','Sparkle Academy','The Fashion Fox'
];

const DEVICE_TYPES = [
  { id: 'phone', name: 'Phone', emoji: '📱', w: 120, h: 220 },
  { id: 'tablet', name: 'Tablet', emoji: '📱', w: 220, h: 160 },
  { id: 'airpods', name: 'AirPods', emoji: '🎧', w: 160, h: 180 },
];

const DECOR_TYPES = [
  { id: 'blanket', name: 'Blanket', emoji: '🧣', w: 250, h: 200 },
  { id: 'pillow', name: 'Pillow', emoji: '🛏️', w: 150, h: 150 },
  { id: 'rug', name: 'Rug', emoji: '🟫', w: 250, h: 160 },
];

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

const CUSTOMER_NAMES = [
  'Luna','Aria','Stella','Ruby','Jade','Ivy','Pearl','Violet','Scarlet','Hazel',
  'Finn','Kai','Leo','Milo','Felix','Oscar','Hugo','Max','Theo','Ezra'
];

const SKIN_PRESETS = ['#FDDBB4','#E8B98D','#D4956B','#BA7A50','#8D5524','#6B3E26','#FFDBAC','#F1C27D','#C68642','#503335'];
const HAIR_COLOR_PRESETS = ['#1a1a2e','#3d2b1f','#6b3a2a','#8B4513','#CD853F','#DAA520','#FFD700','#FF69B4','#9370DB','#DC143C','#1E90FF','#00CED1','#90EE90','#F0F0F0'];
