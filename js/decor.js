// ==============================================================================
// Program: decor.js
// Programmer: Ethan-da-Tech-Wizard
// Last Modified: November 19, 2026
// Purpose: Home decor crafting workstation and textile customization engine.
//          Renders blankets, pillows, and rugs with procedural woven patterns,
//          fringes, corner tassels, and pearl borders, exporting crafted textile items
//          directly into the player's wardrobe and apartment inventory.
// FILE OVERVIEW
// decor.js is the Home Decor station (#decor-screen in index.html): the player chooses a blanket,
// pillow or rug, sets its colour and pattern, adds tassels, fringe or a pearl border, decorates it
// with paint, glitter and stickers, and presses Done to save a picture of it in the closet.
//
// Who calls it: Game.goTo('decor') calls Decor.init(); the Done button calls Decor.finish(). It uses
// Tools (painting on #decor-canvas), ColorWheel, Icons, Sound, U (colour maths, drawStar), DECOR_TYPES
// (utils.js) and Game (addToCloset, addXP, save, checkLevelUp, goTo).
//
// Layout: the usual three columns: #decor-tools (tool buttons), #decor-canvas (the item) and
// #decor-side (options). _buildTools makes the buttons; _buildSidePanel(toolId) picks one of the
// panel builders; the painting tools also attach Tools to the canvas.
//
// State on Decor: decorType (id or null), baseColor, patternType, tassels and fringe (booleans).
// _drawDecorItem() repaints the item from this state: clip to the item's outline, fill with the base
// colour, draw the pattern, remove the clip, then outline, extras, a floor shadow and the item's name.
// Pearl border, paint, glitter and stickers are drawn straight onto the canvas and are erased by the
// next _drawDecorItem() (for example when the colour changes).
//
// Known limits / things to watch:
//   - (Fixed) Tools.setup() used to swap the canvas for a blank clone, so choosing a painting tool blanked
//     the item; it now re-binds listeners on the same canvas element and the pixels persist.
//   - (Fixed) Icons.get() is called with 'blanket', 'pillow' and 'rug'; icons.js now defines them (they used to
//     show the fallback star).
//   - Tassels and fringe use Math.random on every redraw, so they look slightly different each time.
//   - (Fixed) finish() used to award 45 XP even if no item was chosen; it now plays the error sound and stays
//     on the screen (like Books.finish) so XP is only given for a saved item.
// How to test: Game.goTo('decor'); Decor.decorType = 'rug'; Decor.patternType = 'stars'; Decor._drawDecorItem().
// ==============================================================================
/* ===== HOME DECOR STUDIO WORKSTATION ===== */
// Singleton controller for the Home Decor station.
const Decor = {
  // Chosen item id from DECOR_TYPES ('blanket', 'pillow', 'rug') or null until one is picked.
  decorType: null,

  // Fabric colour (default medium purple), changed in the Fabric panel.
  baseColor: '#9370DB',

  // Pattern id: 'solid', 'stripes', 'polka', 'plaid', 'chevron', 'diamonds', 'floral' or 'stars' (the list in _buildPatternPanel).
  patternType: 'solid',

  // Whether corner tassels are drawn.
  tassels: false,

  // Whether fringe along the bottom edge is drawn.
  fringe: false,

  /**
   * Initializes Home Decor canvas, resets textile attributes, and populates tools.
   */
  init() {
    // Looked up by id on each call (cheap, and robust if the element is ever replaced).
    const c = document.getElementById('decor-canvas');
    if (!c) return;
    const parent = c.parentElement;
    const rect = parent.getBoundingClientRect();

    // Fit the canvas into the space beside the side panels (70 px tool column + 220 px options panel = 290 px), at most 700 x 500. This also clears it.
    c.width = Math.min(rect.width - 290, 700);
    c.height = Math.min(rect.height, 500);

    // Each visit starts without an item and without extras; colour and pattern are remembered from the last visit.
    this.decorType = null;
    this.tassels = false;
    this.fringe = false;
    this._buildTools();
    this._buildSidePanel('pick');
  },

  /* ===== TOOLS ===== */
  // Creates the tool buttons in #decor-tools: Item, Fabric, Pattern, Paint, Sticker, Glitter, Extras and Eraser.
  _buildTools() {
    const tools = document.getElementById('decor-tools');
    if (!tools) return;

    // Clear first: init() runs on every visit and must not stack duplicate buttons.
    tools.innerHTML = '';

    // Each entry: id (passed to _buildSidePanel), icon (a key in Icons.paths) and label.
    const toolList = [
      { id: 'pick', icon: 'decor', label: 'Item' },
      { id: 'fabric', icon: 'fabric', label: 'Fabric' },
      { id: 'pattern', icon: 'square', label: 'Pattern' },
      { id: 'dye', icon: 'palette', label: 'Paint' },
      { id: 'sticker', icon: 'star', label: 'Sticker' },
      { id: 'glitter', icon: 'sparkles', label: 'Glitter' },
      { id: 'extras', icon: 'bow', label: 'Extras' },
      { id: 'eraser', icon: 'eraser', label: 'Eraser' },
    ];

    toolList.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn' + (i === 0 ? ' active' : '');
      btn.innerHTML = `${Icons.get(t.icon)}<span class="tool-label">${t.label}</span>`;

      // Icon above its label (.tool-btn defaults to a row).
      btn.style.flexDirection = 'column';
      btn.title = t.label;

      // Select the tool: move the highlight, click sound, and rebuild the options panel.
      btn.onclick = () => {
        tools.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Sound.play('click');
        this._buildSidePanel(t.id);
      };
      tools.appendChild(btn);
    });
  },

  // Rebuilds #decor-side for the selected tool; the painting tools also set the shared Tools tool and attach it to the canvas.
  // @param {string} toolId - 'pick', 'fabric', 'pattern', 'dye', 'sticker', 'glitter', 'extras' or 'eraser'.
  _buildSidePanel(toolId) {
    const side = document.getElementById('decor-side');
    if (!side) return;

    // Discard the previous tool's panel before building the new one.
    side.innerHTML = '';

    switch(toolId) {
      case 'pick': this._buildPickPanel(side); break;
      case 'fabric': this._buildFabricPanel(side); break;
      case 'pattern': this._buildPatternPanel(side); break;

      // The 'dye' tool is the shared round brush; the panel builder only creates the colour and size controls, and the two assignments afterwards give Tools the tool and attach it to the canvas.
      case 'dye': this._buildPaintPanel(side); Tools.currentTool = 'dye'; Tools.setup('decor-canvas'); break;
      case 'sticker': this._buildStickerPanel(side); break;
      case 'glitter': this._buildGlitterPanel(side); break;
      case 'extras': this._buildExtrasPanel(side); break;

      // Eraser: the shared eraser with a 15 px radius, plus a button that redraws the item from its settings, which removes everything painted on top.
      case 'eraser':

        // Eraser size 15 px radius (30 px wide).
        Tools.currentTool = 'eraser'; Tools.brushSize = 15; Tools.setup('decor-canvas');
        const h4 = document.createElement('h4'); h4.textContent = 'Eraser'; side.appendChild(h4);
        const p = document.createElement('p');
        p.style.cssText = 'font-size:12px;color:var(--text-muted);';
        p.textContent = 'Erase decorations from the item.';
        side.appendChild(p);
        const resetBtn = document.createElement('button');
        resetBtn.className = 'btn btn-ghost'; resetBtn.style.cssText = 'width:100%;margin-top:12px;';
        resetBtn.textContent = '🔄 Reset Item';
        resetBtn.onclick = () => { this._drawDecorItem(); Sound.play('whoosh'); };
        side.appendChild(resetBtn);
        break;
    }
  },

  /* ===== PICK PANEL ===== */
  // Item picker: one cell per entry in DECOR_TYPES. Choosing one draws it immediately.
  // @param {HTMLElement} side - The #decor-side element to fill.
  _buildPickPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Choose Item';
    side.appendChild(h4);

    // .item-grid fits as many 48 px cells as the panel allows.
    const grid = document.createElement('div');
    grid.className = 'item-grid';

      // One cell per decor type; the current type is highlighted.
      DECOR_TYPES.forEach(d => {
      const cell = document.createElement('div');
      cell.className = 'item-cell' + (this.decorType === d.id ? ' active' : '');

      // Icon plus name. The icon id equals the item id ('blanket', 'pillow', 'rug'), which icons.js now defines.
      cell.innerHTML = `<div style="text-align:center"><div>${Icons.get(d.id, 24)}</div><div style="font-size:10px;color:var(--text-muted);margin-top:4px;">${d.name}</div></div>`;
      cell.onclick = () => {
        this.decorType = d.id;
        grid.querySelectorAll('.item-cell').forEach(c => c.classList.remove('active'));
        cell.classList.add('active');
        Sound.play('select');
        this._drawDecorItem();
      };
      grid.appendChild(cell);
    });
    side.appendChild(grid);

    // Until an item is chosen, show a hint on the cleared canvas.
    if (!this.decorType) {
      // Placeholder hint drawn directly because no item exists yet (so _drawDecorItem would return early).
      const c = document.getElementById('decor-canvas');
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.font = '18px Outfit'; ctx.textAlign = 'center';
      ctx.fillText('Pick a decor item →', c.width/2, c.height/2);
    }
  },

  /* ===== FABRIC PANEL ===== */
  // Base colour: a button that opens the wheel and 16 quick colours (purple, pinks, gold, blue, green, coral, turquoise, then soft cream, tan and pastel shades).
  // @param {HTMLElement} side - The #decor-side element to fill.
  _buildFabricPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Base Color';
    side.appendChild(h4);

    const colorBtn = document.createElement('div');
    colorBtn.className = 'color-pick-btn';
    colorBtn.style.background = this.baseColor;
    colorBtn.onclick = () => {
      ColorWheel.setFromHex(this.baseColor);
      ColorWheel.open('decor fabric', hex => {
        this.baseColor = hex;
        colorBtn.style.background = hex;
        this._drawDecorItem();
      });
    };
    side.appendChild(colorBtn);

    // Sixteen fabric colours: vivid first (purple, pink, gold, blue, green, coral, turquoise) then soft neutrals and pastels (cream, tan, pink, lavender, khaki, powder blue, terracotta, lemon, white).
    const colors = ['#9370DB','#FF69B4','#FFD700','#1E90FF','#2E8B57','#FF6347','#00CED1',
      '#F5F5DC','#DEB887','#FFC0CB','#E6E6FA','#F0E68C','#B0E0E6','#D2691E','#FFFACD','#F5F5F5'];
    const qg = document.createElement('div');
    qg.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;';
    colors.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'cw-recent-swatch';
      sw.style.background = c;
      sw.onclick = () => { this.baseColor = c; colorBtn.style.background = c; this._drawDecorItem(); Sound.play('click'); };
      qg.appendChild(sw);
    });
    side.appendChild(qg);
  },

  /* ===== PATTERN PANEL ===== */
  // Pattern grid: eight patterns. This list is separate from FABRIC_PATTERNS in utils.js: it adds 'chevron' and 'diamonds' and omits 'hearts' and 'zigzag'.
  // @param {HTMLElement} side - The #decor-side element to fill.
  _buildPatternPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Pattern';
    side.appendChild(h4);

    // Pattern ids must match the cases in _drawPattern; 'solid' has no case, which means no overlay is drawn.
    const patterns = [
      { id: 'solid', name: 'Solid' },
      { id: 'stripes', name: 'Stripes' },
      { id: 'polka', name: 'Polka' },
      { id: 'plaid', name: 'Plaid' },
      { id: 'chevron', name: 'Chevron' },
      { id: 'diamonds', name: 'Diamonds' },
      { id: 'floral', name: 'Floral' },
      { id: 'stars', name: 'Stars' },
    ];

    const grid = document.createElement('div');
    grid.className = 'item-grid';
    patterns.forEach(p => {
      const cell = document.createElement('div');
      cell.className = 'item-cell' + (this.patternType === p.id ? ' active' : '');

      // Pattern cells show text names, which need a smaller font than the emoji cells.
      cell.style.fontSize = '11px';
      cell.textContent = p.name;
      cell.onclick = () => {
        this.patternType = p.id;
        grid.querySelectorAll('.item-cell').forEach(c => c.classList.remove('active'));
        cell.classList.add('active');
        Sound.play('select');
        this._drawDecorItem();
      };
      grid.appendChild(cell);
    });
    side.appendChild(grid);
  },

  /* ===== PAINT PANEL ===== */
  // Shared options for paint and glitter: a colour button, 12 quick colours and a size slider (2-30 px) bound to Tools.brushSize.
  // @param {HTMLElement} side - The #decor-side element to fill.
  _buildPaintPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Paint Color';
    side.appendChild(h4);

    const colorBtn = document.createElement('div');
    colorBtn.className = 'color-pick-btn';
    colorBtn.style.background = Tools.currentColor;
    colorBtn.onclick = () => { Tools.openColorPicker(hex => { colorBtn.style.background = hex; }); };
    side.appendChild(colorBtn);

    // Same 12 quick colours as the other stations' paint panels.
    const quickColors = ['#FF69B4','#FF6347','#FFD700','#32CD32','#1E90FF','#9370DB','#FF1493','#00CED1','#FFA500','#FFFFFF','#000000','#8B0000'];
    const qGrid = document.createElement('div');
    qGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;';
    quickColors.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'cw-recent-swatch';
      sw.style.background = c;
      sw.onclick = () => { Tools.setColor(c); colorBtn.style.background = c; Sound.play('click'); };
      qGrid.appendChild(sw);
    });
    side.appendChild(qGrid);

    const slbl = document.createElement('h4');
    slbl.textContent = 'Size'; slbl.style.marginTop = '10px';
    side.appendChild(slbl);
    const slider = document.createElement('input');

    // Size slider 2-30 px bound directly to Tools.brushSize.
    slider.type = 'range'; slider.min = '2'; slider.max = '30'; slider.value = Tools.brushSize;
    slider.style.cssText = 'width:100%;accent-color:var(--accent-pink);';
    slider.oninput = () => { Tools.brushSize = parseInt(slider.value); };
    side.appendChild(slider);
  },

  /* ===== STICKER PANEL ===== */
  // Sticker grid: 20 home-themed emoji. Picking one sets Tools.currentSticker; the player clicks on the canvas to place it (24 px).
  // @param {HTMLElement} side - The #decor-side element to fill.
  _buildStickerPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Stickers';
    side.appendChild(h4);

    // Twenty emoji suited to home decor: flowers, butterfly, pets, rainbow, cloud, clover, star, gem, heart, bow, moon, flame, snowflake, strawberry, cupcake, bouquet.
    const decorStickers = ['🌸','🌺','🌹','🌻','🦋','🐱','🐶','🌈','☁️','🍀',
      '⭐','💎','❤️','🎀','🌙','🔥','❄️','🍓','🧁','💐'];
    const grid = document.createElement('div');
    grid.className = 'item-grid';
    decorStickers.forEach(s => {
      const cell = document.createElement('div');
      cell.className = 'item-cell' + (Tools.currentSticker === s ? ' active' : '');
      cell.textContent = s;
      cell.onclick = () => {
        Tools.currentSticker = s;
        grid.querySelectorAll('.item-cell').forEach(c => c.classList.remove('active'));
        cell.classList.add('active');
        Sound.play('click');
      };
      grid.appendChild(cell);
    });
    side.appendChild(grid);
    Tools.currentTool = 'sticker';

    // Brush size 8 gives 24 px stickers.
    Tools.brushSize = 8;
    Tools.setup('decor-canvas');
  },

  /* ===== GLITTER PANEL ===== */
  // Glitter uses the same colour and size options as paint, with the glitter tool.
  // @param {HTMLElement} side - The #decor-side element to fill.
  _buildGlitterPanel(side) {
    this._buildPaintPanel(side);
    Tools.currentTool = 'glitter';
    Tools.setup('decor-canvas');
  },

  /* ===== EXTRAS PANEL ===== */
  // Extras: toggle buttons for tassels and fringe (each redraws the item) and a button that adds a pearl border. The toggles show their state in
  // their label and button style; the pearl border has no off switch (it is part of the canvas pixels).
  // @param {HTMLElement} side - The #decor-side element to fill.
  _buildExtrasPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Extra Details';
    side.appendChild(h4);

    // Toggle button: label and style come from `this.tassels` when built and are refreshed on every click.
    // Tassels toggle
    const tasselBtn = document.createElement('button');
    tasselBtn.className = 'btn ' + (this.tassels ? 'btn-primary' : 'btn-ghost');
    tasselBtn.style.cssText = 'width:100%;margin-bottom:8px;';
    tasselBtn.textContent = this.tassels ? '✓ Tassels ON' : '🎀 Add Tassels';
    tasselBtn.onclick = () => {
      this.tassels = !this.tassels;
      tasselBtn.className = 'btn ' + (this.tassels ? 'btn-primary' : 'btn-ghost');
      tasselBtn.textContent = this.tassels ? '✓ Tassels ON' : '🎀 Add Tassels';
      Sound.play('click');
      this._drawDecorItem();
    };
    side.appendChild(tasselBtn);

    // Same pattern for fringe.
    // Fringe toggle
    const fringeBtn = document.createElement('button');
    fringeBtn.className = 'btn ' + (this.fringe ? 'btn-primary' : 'btn-ghost');
    fringeBtn.style.cssText = 'width:100%;margin-bottom:8px;';
    fringeBtn.textContent = this.fringe ? '✓ Fringe ON' : '〰️ Add Fringe';
    fringeBtn.onclick = () => {
      this.fringe = !this.fringe;
      fringeBtn.className = 'btn ' + (this.fringe ? 'btn-primary' : 'btn-ghost');
      fringeBtn.textContent = this.fringe ? '✓ Fringe ON' : '〰️ Add Fringe';
      Sound.play('click');
      this._drawDecorItem();
    };
    side.appendChild(fringeBtn);

    // Not a toggle: pressing it paints pearls onto the canvas once (pressing again paints a second ring on top).
    // Pearl border
    const pearlBtn = document.createElement('button');
    pearlBtn.className = 'btn btn-ghost';
    pearlBtn.style.cssText = 'width:100%;margin-bottom:8px;';
    pearlBtn.textContent = '🫧 Add Pearl Border';
    pearlBtn.onclick = () => {
      this._drawPearlBorder();
      Sound.play('sparkle');
    };
    side.appendChild(pearlBtn);
  },

  /* ===== DRAWING ===== */
  // Repaints the whole item from the current settings and clears whatever was on the canvas. Does nothing until an item is selected.
  _drawDecorItem() {
    const c = document.getElementById('decor-canvas');
    if (!c || !this.decorType) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;

    // Repaint from scratch: removes earlier paint, stickers and pearls.
    ctx.clearRect(0, 0, w, h);

    const cx = w/2, cy = h/2;

    // The size record for the chosen type; an unknown id draws nothing.
    const d = DECOR_TYPES.find(t => t.id === this.decorType);
    if (!d) return;

    // Item size in pixels from DECOR_TYPES (blanket 250x200, pillow 150x150, rug 250x160).
    const dw = d.w, dh = d.h;

    // Clip to the item's outline so the colour and pattern (drawn as big rectangles) only appear inside it.
    // Draw base shape
    ctx.save();
    this._getDecorPath(ctx, this.decorType, cx, cy, dw, dh);
    ctx.clip();

    // The rectangle is twice the item's size, centred on it, so it always covers the whole outline.
    // Base color
    ctx.fillStyle = this.baseColor;

    // Oversized fill; the clip trims it to the item's outline.
    ctx.fillRect(cx - dw, cy - dh, dw*2, dh*2);

    // Pattern colours derived from the base: a darker tone (18 lightness points down) and a lighter tone (15 up).
    // Pattern
    const [ph, ps, pl] = U.hexToHsl(this.baseColor);
    const patDark = U.hslToHex(ph, ps, Math.max(0, pl - 18));
    const patLight = U.hslToHex(ph, ps, Math.min(100, pl + 15));

    // The pattern tiles over the same oversized rectangle, again trimmed by the clip.
    this._drawPattern(ctx, cx - dw, cy - dh, dw*2, dh*2, patDark, patLight);

    // Remove the clip so the outline, tassels and fringe (which stick out of the shape) can be drawn.
    ctx.restore();

    // Outline
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    this._getDecorPath(ctx, this.decorType, cx, cy, dw, dh);
    ctx.stroke();

    // Extras
    // Extras are drawn after the clip is removed because they extend past the outline.
    if (this.tassels) this._drawTassels(ctx, cx, cy, dw, dh);
    if (this.fringe) this._drawFringe(ctx, cx, cy, dw, dh);

    // A faint ellipse below the item suggests it sits on the floor.
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();

    // Floor shadow: a flat ellipse 15 px below the item's bottom edge, 60% of its width.
    ctx.ellipse(cx, cy + dh/2 + 15, dw*0.6, 8, 0, 0, Math.PI*2);
    ctx.fill();

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '14px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(d.name, cx, cy + dh/2 + 35);
  },

  // Builds (without painting) the outline path of an item centred on (cx, cy). Used for clipping and for stroking the outline.
  // @param {CanvasRenderingContext2D} ctx - Target context.
  // @param {string} type - 'blanket', 'pillow' or 'rug'.
  // @param {number} cx - Centre x.
  // @param {number} cy - Centre y.
  // @param {number} w - Item width in pixels.
  // @param {number} h - Item height in pixels.
  _getDecorPath(ctx, type, cx, cy, w, h) {
    ctx.beginPath();
    switch(type) {
      // Blanket: a rectangle with 12 px rounded corners (four arcTo calls).
      case 'blanket':
        // Soft rectangle with slightly rounded corners
        // Blanket corner radius in pixels.
        const br = 12;
        ctx.moveTo(cx - w/2 + br, cy - h/2);
        ctx.arcTo(cx + w/2, cy - h/2, cx + w/2, cy + h/2, br);
        ctx.arcTo(cx + w/2, cy + h/2, cx - w/2, cy + h/2, br);
        ctx.arcTo(cx - w/2, cy + h/2, cx - w/2, cy - h/2, br);
        ctx.arcTo(cx - w/2, cy - h/2, cx + w/2, cy - h/2, br);
        ctx.closePath();
        break;

      // Pillow: four quadratic curves that bulge slightly outside the rectangle by 10 px, which gives a puffy cushion shape.
      case 'pillow':
        // Puffy shape
        // Pillow outline: starts near the top-left corner and curves through four control points that push 10 px outside the box on each side, giving the puffy sides.
        ctx.moveTo(cx - w/2 + 15, cy - h/2 + 5);
        ctx.quadraticCurveTo(cx, cy - h/2 - 10, cx + w/2 - 15, cy - h/2 + 5);
        ctx.quadraticCurveTo(cx + w/2 + 10, cy, cx + w/2 - 15, cy + h/2 - 5);
        ctx.quadraticCurveTo(cx, cy + h/2 + 10, cx - w/2 + 15, cy + h/2 - 5);
        ctx.quadraticCurveTo(cx - w/2 - 10, cy, cx - w/2 + 15, cy - h/2 + 5);
        ctx.closePath();
        break;

      // Rug: an ellipse.
      case 'rug':
        // Oval
        // Rug: an ellipse with the item's width and height as its diameters.
        ctx.ellipse(cx, cy, w/2, h/2, 0, 0, Math.PI*2);
        break;
    }
  },

  // Draws the selected pattern over the rectangle (x, y, w, h); the clip set by the caller keeps it inside the item. Every pattern tiles from the
  // rectangle's top-left corner; alternate rows are shifted by half a cell to make a brick-like layout.
  // @param {CanvasRenderingContext2D} ctx - Target context.
  // @param {number} x - Left of the area to fill.
  // @param {number} y - Top of the area to fill.
  // @param {number} w - Width of the area.
  // @param {number} h - Height of the area.
  // @param {string} dark - Darker tone of the base colour, for lines and dots.
  // @param {string} light - Lighter tone, for flowers and stars.
  _drawPattern(ctx, x, y, w, h, dark, light) {
    // Dark tone for lines and dots; patterns that use the light tone set it themselves.
    ctx.fillStyle = dark;
    ctx.strokeStyle = dark;

    switch(this.patternType) {
      // Diagonal stripes 8 px wide every 24 px, each running at 45 degrees (the line from (dx, 0) goes to (dx + h, h)).
      case 'stripes':
        ctx.lineWidth = 8;

        // Start at -h so the 45-degree lines also cover the lower-left corner; the loop runs to w + h for the same reason on the right.
        for (let dx = -h; dx < w + h; dx += 24) {
          ctx.beginPath(); ctx.moveTo(x + dx, y); ctx.lineTo(x + dx + h, y + h); ctx.stroke();
        }
        break;

      // Dots of radius 5 every 28 px; every second row is shifted 14 px.
      case 'polka':
        for (let dy = 0; dy < h; dy += 28) {
          // Every other row (period 56 px) starts 14 px in, so dots form a staggered grid.
          for (let dx = (dy % 56 < 28 ? 0 : 14); dx < w; dx += 28) {
            ctx.beginPath(); ctx.arc(x + dx, y + dy, 5, 0, Math.PI*2); ctx.fill();
          }
        }
        break;

      // Translucent (25%) crossing bands 10 px wide every 35 px; overlaps look darker, like woven plaid.
      case 'plaid':
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 10;
        for (let dx = 0; dx < w; dx += 35) { ctx.beginPath(); ctx.moveTo(x+dx, y); ctx.lineTo(x+dx, y+h); ctx.stroke(); }
        for (let dy = 0; dy < h; dy += 35) { ctx.beginPath(); ctx.moveTo(x, y+dy); ctx.lineTo(x+w, y+dy); ctx.stroke(); }
        ctx.globalAlpha = 1;
        break;

      // Rows of V shapes: each is a short up-and-down zigzag 30 px wide and 10 px tall, repeated every 20 px vertically.
      case 'chevron':
        ctx.strokeStyle = dark;
        ctx.lineWidth = 4;
        for (let dy = 0; dy < h; dy += 20) {
          ctx.beginPath();
          for (let dx = 0; dx < w; dx += 30) {
            ctx.moveTo(x + dx, y + dy + 10);
            ctx.lineTo(x + dx + 15, y + dy);
            ctx.lineTo(x + dx + 30, y + dy + 10);
          }
          ctx.stroke();
        }
        break;

      // Small squares (12 px) rotated 45 degrees, forming diamonds on a 30 px grid with alternate rows offset 15 px.
      case 'diamonds':
        for (let dy = 0; dy < h; dy += 30) {
          for (let dx = (dy % 60 < 30 ? 0 : 15); dx < w; dx += 30) {
            ctx.fillStyle = dark;

            // Rotate a square 45 degrees about its centre to make a diamond; save/restore keep the rotation local.
            ctx.save(); ctx.translate(x + dx, y + dy); ctx.rotate(Math.PI/4);
            ctx.fillRect(-6, -6, 12, 12);
            ctx.restore();
          }
        }
        break;

      // Flowers every 55 px: five light petals (radius 5) around a dark centre (radius 3), in alternating offset rows.
      case 'floral':
        for (let dy = 25; dy < h; dy += 55) {
          for (let dx = (dy % 110 < 55 ? 25 : 50); dx < w; dx += 55) {
            ctx.fillStyle = light;
            for (let p = 0; p < 5; p++) {
              const a = p * Math.PI * 2 / 5;
              ctx.beginPath(); ctx.arc(x+dx+Math.cos(a)*7, y+dy+Math.sin(a)*7, 5, 0, Math.PI*2); ctx.fill();
            }
            ctx.fillStyle = dark;
            ctx.beginPath(); ctx.arc(x+dx, y+dy, 3, 0, Math.PI*2); ctx.fill();
          }
        }
        break;

      // Light 5-point stars (radius 9) every 45 px, alternating row offsets.
      case 'stars':
        for (let dy = 20; dy < h; dy += 45) {
          for (let dx = (dy % 90 < 45 ? 20 : 42); dx < w; dx += 45) {
            ctx.fillStyle = light;
            U.drawStar(ctx, x+dx, y+dy, 9, 5);
          }
        }
        break;
    }
  },

  // Draws a tassel at each of the four corners of the rectangle: six short strands in random directions (a 90 degree spread pointing
  // downward) with a darker knot. Random, so the tassels change each redraw.
  // @param {CanvasRenderingContext2D} ctx - Target context.
  // @param {number} cx - Item centre x.
  // @param {number} cy - Item centre y.
  // @param {number} w - Item width in pixels.
  // @param {number} h - Item height in pixels.
  _drawTassels(ctx, cx, cy, w, h) {
    const corners = [
      [cx - w/2, cy - h/2],
      [cx + w/2, cy - h/2],
      [cx - w/2, cy + h/2],
      [cx + w/2, cy + h/2],
    ];
    corners.forEach(([tx, ty]) => {
      ctx.strokeStyle = this.baseColor;
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        // Strand angle between 45 and 135 degrees from the horizontal, i.e. pointing downward and outward.
        const angle = Math.random() * Math.PI * 0.5 + Math.PI*0.25;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + Math.cos(angle) * (12 + Math.random()*8), ty + Math.sin(angle) * (12 + Math.random()*8));
        ctx.stroke();
      }
      // Knot
      // Knot colour: the base colour 15 lightness points darker.
      const [bh,bs,bl] = U.hexToHsl(this.baseColor);
      ctx.fillStyle = U.hslToHex(bh, bs, Math.max(0, bl - 15));
      ctx.beginPath(); ctx.arc(tx, ty, 4, 0, Math.PI*2); ctx.fill();
    });
  },

  // Draws short threads hanging off the bottom edge of the bounding rectangle, one every 6 px, 10-18 px long with a slight random sway.
  // @param {CanvasRenderingContext2D} ctx - Target context.
  // @param {number} cx - Item centre x.
  // @param {number} cy - Item centre y.
  // @param {number} w - Item width in pixels.
  // @param {number} h - Item height in pixels.
  _drawFringe(ctx, cx, cy, w, h) {
    const [bh,bs,bl] = U.hexToHsl(this.baseColor);
    ctx.strokeStyle = U.hslToHex(bh, bs, Math.max(0, bl - 10));
    ctx.lineWidth = 1.5;

    // Fringe hangs from the item's bottom edge.
    const bottom = cy + h/2;
    for (let x = cx - w/2 + 5; x < cx + w/2; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, bottom);
      ctx.lineTo(x + (Math.random()-0.5)*3, bottom + 10 + Math.random()*8);
      ctx.stroke();
    }
  },

  // Adds a ring of pearls along the item's edge, drawn directly onto the canvas on top of everything. Each pearl is a small radial-gradient sphere
  // with a highlight. A blanket gets pearls along its rectangle every 14 px; pillow and rug get pearls around their ellipse (the pillow's ring is 90% of its size
  // so it sits inside the puffy outline).
  _drawPearlBorder() {
    const c = document.getElementById('decor-canvas');
    if (!c || !this.decorType) return;
    const ctx = c.getContext('2d');
    const cx = c.width/2, cy = c.height/2;
    const d = DECOR_TYPES.find(t => t.id === this.decorType);
    if (!d) return;

    const w = d.w, h = d.h;

    // Pearl radius in pixels.
    // Pearl radius in pixels.
    const pearlSize = 4;

    // Draw pearls around shape border
    // Pearl centres, built per shape: spacing 14 px along the blanket sides, or an angle step of 0.25 rad (pillow) or 0.2 rad (rug) around the ellipse.
    let points = [];
    if (this.decorType === 'blanket') {
      for (let x = cx-w/2; x <= cx+w/2; x += 14) { points.push([x, cy-h/2]); points.push([x, cy+h/2]); }
      for (let y = cy-h/2; y <= cy+h/2; y += 14) { points.push([cx-w/2, y]); points.push([cx+w/2, y]); }
    } else if (this.decorType === 'pillow') {
      for (let a = 0; a < Math.PI*2; a += 0.25) {
        points.push([cx + Math.cos(a)*w/2*0.9, cy + Math.sin(a)*h/2*0.9]);
      }
    } else if (this.decorType === 'rug') {
      for (let a = 0; a < Math.PI*2; a += 0.2) {
        points.push([cx + Math.cos(a)*w/2, cy + Math.sin(a)*h/2]);
      }
    }

    // Each pearl: a radial gradient offset 1 px toward the upper left (white to pale lilac to a darker grey-violet rim) gives a spherical look, and a small white spot is
    // the shine.
    points.forEach(([px, py]) => {
      const grad = ctx.createRadialGradient(px-1, py-1, 0, px, py, pearlSize);
      grad.addColorStop(0, '#fff');
      grad.addColorStop(0.4, '#f0e8f0');
      grad.addColorStop(1, '#c0b0c8');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(px, py, pearlSize, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.arc(px - 1, py - 1, 1.5, 0, Math.PI*2); ctx.fill();
    });
  },

  /* ===== FINISH ===== */
  // "Done": saves a picture of the decorated item in the closet (type 'decor'), awards 45 XP, saves, and leaves (the level-up screen if a level was gained, otherwise the workshop).
  finish() {
    const c = document.getElementById('decor-canvas');

    // Nothing to save without a canvas and a chosen item. The XP below used to be awarded regardless, so pressing
    // Done on an empty screen farmed 45 XP per click; now the player gets the error sound and stays to pick an item
    // (the same behaviour as Books.finish).
    if (!c || !this.decorType) {
      Sound.play('error');
      return;
    }

    // From here an item definitely exists, so saving it and paying the XP always go together.
    {
      const imageData = c.toDataURL('image/png');
      const d = DECOR_TYPES.find(t => t.id === this.decorType);
      Game.addToCloset({
        id: Date.now(),
        type: 'decor',
        subtype: this.decorType,
        name: (d ? d.name : 'Decor') + ' Design',
        image: imageData,
        createdAt: Date.now(),
      });
    }

    // Reward feedback: jingle plus 45 XP.
    Sound.play('complete');
    Game.addXP(45);
    Game.save();
    if (Game.checkLevelUp()) Game.goTo('levelup');
    else Game.goTo('workshop');
  }
};
