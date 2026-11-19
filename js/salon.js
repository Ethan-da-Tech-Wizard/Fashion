// ==============================================================================
// Program: salon.js
// Programmer: Ethan-da-Tech-Wizard
// Last Modified: November 19, 2026
// Purpose: Hair styling, cutting, dyeing, highlights, and tinsel workstation engine.
//          Renders close-up avatar bust portraits, manages tool states (shears, dyes,
//          highlighter streaks, metallic tinsel fibers, and floral accessories),
//          and persists newly sculpted hairstyles back to player profile state.
// FILE OVERVIEW
// salon.js is the Hair Salon station (#salon-screen in index.html): the player sees a close-up
// head and shoulders of their own character and can change hair style, dye, paint highlights,
// add tinsel strands, place clips/accessories, or draw freehand. "Done" saves the hairstyle onto
// the character and also stores a picture of the result in the closet.
//
// Who calls it: Game.goTo('salon') calls Salon.init(); the screen's Done button calls
// Salon.finish(). It reads Game.state.character (skin, eye, outfit colours and starting hair)
// and writes the chosen hair back to it. It uses Tools (painting on the canvas), ColorWheel,
// Character (_darken and _drawMiniHairPreview helpers), Icons, Sound and HAIR_STYLES.
//
// Layout: the same three columns as every station: #salon-tools (tool buttons), #salon-canvas
// (the head), #salon-side (options for the selected tool). The tool list is built by _buildTools;
// choosing a tool calls _onToolChange which rebuilds the side panel.
//
// State on Salon: hairColor, hairStyle (ids from HAIR_STYLES), tinselColor, tinselOn (whether
// tinsel is currently drawn). The head is redrawn from this state by _drawHead() every time a
// style or colour changes, which also wipes any freehand paint or stickers placed earlier.
//
// Known limits / things to watch:
//   - The head is a simplified, front-facing drawing (not the Character renderer).
//   - (Fixed) Tools.setup() used to swap the canvas for a blank clone, so choosing Highlights, Draw or
//     a clip/accessory cleared the head [observed: 42387 opaque pixels on the Style tool and 0 after
//     switching to Highlights]. It now re-binds listeners on the same element, so the head stays.
//   - "Undo" (the eraser button) is really "reset to the base drawing"; there is no undo history.
//   - Salon.finish() saves whatever is on the canvas as the closet picture.
// How to test: Game.goTo('salon') in the console, click the dye swatches and the style grid, then Done.
// ==============================================================================
/* ===== HAIR SALON WORKSTATION ===== */
// Singleton controller for the Hair Salon station.
const Salon = {
  // Current hair colour "#rrggbb"; initialised from the saved character when the salon opens.
  hairColor: '#3d2b1f',

  // Current hair style id from HAIR_STYLES.
  hairStyle: 'long',

  // Colour of tinsel strands (gold by default). Kept between visits.
  tinselColor: '#ffd700',

  // True while tinsel should be drawn on top of the hair whenever the head is redrawn; reset to false on entry.
  tinselOn: false,

  // Reserved for a snapshot of the base head; never used.
  _baseImage: null,

  /**
   * Initializes Hair Salon canvas dimensions, synchronizes player hair model, and builds toolbars.
   */
  init() {
    // The canvas is looked up by id on every call rather than cached (cheap; before the Tools.setup() fix the element was replaced by a clone and a cached reference would have pointed at a detached canvas).
    const c = document.getElementById('salon-canvas');
    if (!c) return;

    // The parent (.studio-layout) is measured, not the canvas, because the canvas's own size is what is being decided.
    const parent = c.parentElement;
    const rect = parent.getBoundingClientRect();

    // Size the canvas to the space left of the side panels: the left tool column (70 px) plus the right panel
    // (220 px) take 290 px; the canvas is at most 700 by 500 pixels. (Setting width/height also clears it.)
    c.width = Math.min(rect.width - 290, 700);
    c.height = Math.min(rect.height, 500);

    // Copy character's current hair
    // Start from the player's real hair so the salon edits what they created. Falls back to the defaults if the
    // saved character lacks hair data.
    if (Game.state.character) {
      // `||` keeps the previous defaults when an older save has no hair fields.
      this.hairColor = Game.state.character.hairColor || '#3d2b1f';
      this.hairStyle = Game.state.character.hairStyle || 'long';
    }

    // Entering the salon always starts without tinsel.
    this.tinselOn = false;

    // Build the left tool column, the right options panel, and draw the head, in that order (drawing last so the
    // canvas shows the final state).
    this._buildTools();
    this._buildSidePanel();
    this._drawHead();
  },

  /* ===== TOOL PANEL ===== */
  // Creates one button per tool in #salon-tools. Tool ids: style, dye, highlights, tinsel, accessories, freehand,
  // eraser (shown as "Undo"). The first button starts selected.
  _buildTools() {
    const tools = document.getElementById('salon-tools');
    if (!tools) return;

    // Clear first: init() runs every time the screen opens and must not duplicate buttons.
    tools.innerHTML = '';

    // Each entry: id (used by _onToolChange), icon (key in Icons.paths) and label shown under the icon.
    const toolList = [
      { id: 'style', icon: 'scissors', label: 'Style' },
      { id: 'dye', icon: 'palette', label: 'Dye' },
      { id: 'highlights', icon: 'brush', label: 'Highlights' },
      { id: 'tinsel', icon: 'sparkles', label: 'Tinsel' },
      { id: 'accessories', icon: 'bow', label: 'Clips' },
      { id: 'freehand', icon: 'pen', label: 'Draw' },
      { id: 'eraser', icon: 'eraser', label: 'Undo' },
    ];

    // One button per tool; `i === 0` marks the first ("Style") as active so it matches the panel shown on entry.
    toolList.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn' + (i === 0 ? ' active' : '');
      btn.innerHTML = `${Icons.get(t.icon)}<span class="tool-label">${t.label}</span>`;

      // Stack the icon above its label (the .tool-btn rule lays children out in a row by default).
      btn.style.flexDirection = 'column';

      // Tooltip and accessible name for the icon button.
      btn.title = t.label;

      // Move the highlight to the clicked button, play a click and switch the side panel.
      btn.onclick = () => {
        tools.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Sound.play('click');
        this._onToolChange(t.id);
      };
      tools.appendChild(btn);
    });

    // Show the style panel initially.
    this._onToolChange('style');
  },

  // Rebuilds #salon-side for the chosen tool (and sets up painting where the tool paints on the canvas).
  // @param {string} toolId - One of 'style', 'dye', 'highlights', 'tinsel', 'accessories', 'freehand', 'eraser'.
  _onToolChange(toolId) {
    const side = document.getElementById('salon-side');
    if (!side) return;

    // Every tool shows a different panel, so the old one is discarded completely.
    side.innerHTML = '';

    if (toolId === 'style') {
      // Each branch builds a panel; only 'freehand' also needs the shared Tools set up for drawing.
      this._buildStylePanel(side);
    } else if (toolId === 'dye') {
      this._buildDyePanel(side);
    } else if (toolId === 'highlights') {
      this._buildHighlightsPanel(side);
    } else if (toolId === 'tinsel') {
      this._buildTinselPanel(side);
    } else if (toolId === 'accessories') {
      this._buildAccessoriesPanel(side);

    // Freehand drawing uses the shared 'dye' brush on this canvas (Tools.setup keeps the canvas pixels, so the head drawn earlier stays visible).
    } else if (toolId === 'freehand') {
      this._buildFreehandPanel(side);

      // The freehand tool is the shared 'dye' brush; it is applied to this canvas by the setup call below.
      Tools.currentTool = 'dye';
      Tools.setup('salon-canvas');
    } else if (toolId === 'eraser') {
      // "Undo" redraws the head from state: hair colour and style are kept, but everything painted on top is removed.
      // Reset to base
      this._drawHead();
      Sound.play('whoosh');

      // Panel heading; .side-panel h4 in style.css gives it the gradient bar.
      const h4 = document.createElement('h4');
      h4.textContent = 'Reset!';
      side.appendChild(h4);
      const p = document.createElement('p');
      p.style.cssText = 'font-size:12px;color:var(--text-muted);';
      p.textContent = 'Hair reset to base style.';
      side.appendChild(p);
    }
  },

  /* ===== STYLE PANEL ===== */
  // Fills the side panel with a grid of the twelve hair styles. Each cell is a 36x36 thumbnail drawn by
  // Character._drawMiniHairPreview in the current hair colour, plus a label; clicking selects it and redraws the head.
  // @param {HTMLElement} side - The #salon-side element to fill.
  _buildStylePanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Hair Style';
    side.appendChild(h4);

    // .item-grid lays the style cells out in as many columns as fit the 220 px panel.
    const grid = document.createElement('div');
    grid.className = 'item-grid';
    HAIR_STYLES.forEach(h => {
      const cell = document.createElement('div');

      // Mark the current style as selected when the panel is built.
      cell.className = 'item-cell' + (this.hairStyle === h ? ' active' : '');
      
      const mc = document.createElement('canvas');
      mc.width = 36; mc.height = 36;

      // Block + auto margins centre the 36 px thumbnail inside the cell (a canvas is inline by default).
      mc.style.display = 'block'; mc.style.margin = '0 auto';

      // The `window.Character` check only protects against the character script failing to load.
      if (window.Character) Character._drawMiniHairPreview(mc.getContext('2d'), h, 18, 18, this.hairColor);
      
      const lbl = document.createElement('div');

      // Tiny 9 px muted caption with the style id, so styles can be told apart by name as well as by picture.
      lbl.style.cssText = 'font-size:9px;color:var(--text-muted);text-align:center;margin-top:4px;';
      lbl.textContent = h;
      
      cell.appendChild(mc);
      cell.appendChild(lbl);
      cell.onclick = () => {
        this.hairStyle = h;
        grid.querySelectorAll('.item-cell').forEach(c => c.classList.remove('active'));
        cell.classList.add('active');

        // A scissors snip sound suits a haircut; other tools use 'paint' or 'click'.
        Sound.play('snip');
        this._drawHead();
      };
      grid.appendChild(cell);
    });
    side.appendChild(grid);
  },

  /* ===== DYE PANEL ===== */
  // Fills the side panel with a colour swatch (opens the wheel) and 16 preset hair colours. Choosing a colour sets
  // Salon.hairColor and redraws the head, so the whole hair changes colour.
  // @param {HTMLElement} side - The #salon-side element to fill.
  _buildDyePanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Hair Color';
    side.appendChild(h4);

    // Swatch button showing the current hair colour; its background is updated by the wheel callback and by the presets below.
    const colorBtn = document.createElement('div');
    colorBtn.className = 'color-pick-btn';
    colorBtn.style.background = this.hairColor;

    // Load the current hair colour into the wheel first so it opens on that colour; the callback applies the pick.
    colorBtn.onclick = () => {
      ColorWheel.setFromHex(this.hairColor);
      ColorWheel.open('hair dye', hex => {
        this.hairColor = hex;
        colorBtn.style.background = hex;
        this._drawHead();
      });
    };
    side.appendChild(colorBtn);

    // The presets are applied directly (no wheel), so they stay one click away.
    // Preset hair colors
    const label2 = document.createElement('h4');
    label2.textContent = 'Presets';
    label2.style.marginTop = '12px';
    side.appendChild(label2);

    // Wrapping flex row with 5 px gaps for the swatches.
    const presets = document.createElement('div');
    presets.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;';

    // Presets: natural blacks and browns, blondes, then fantasy pink, ruby, purple, blue, turquoise, green, orange
    // and silver/white.
    const colors = ['#1a1a2e','#3d2b1f','#6b3a2a','#8B4513','#CD853F','#DAA520','#FFD700',
      '#FF69B4','#E0115F','#9370DB','#1E90FF','#00CED1','#90EE90','#FF4500','#C0C0C0','#F0F0F0'];
    colors.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'cw-recent-swatch';
      sw.style.background = c;

      // The .cw-recent-swatch class does not set a pointer cursor in every context, so it is set here to show the swatch is clickable.
      sw.style.cursor = 'pointer';

      // Apply immediately: store the colour, update the big swatch, paint sound, redraw the head with the new colour.
      sw.onclick = () => {
        this.hairColor = c;
        colorBtn.style.background = c;
        Sound.play('paint');
        this._drawHead();
      };
      presets.appendChild(sw);
    });
    side.appendChild(presets);
  },

  /* ===== HIGHLIGHTS PANEL ===== */
  // Highlights: paint streaks with the shared brush directly on the hair. This panel only chooses the colour and
  // size; Tools does the painting. The hair itself is not changed, so highlights are lost whenever the head is redrawn.
  // @param {HTMLElement} side - The #salon-side element to fill.
  _buildHighlightsPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Highlights Color';
    side.appendChild(h4);

    // Ten quick colours (gold, white, pink, ruby, blue, purple, turquoise, orange, green, silver). Picking one sets
    // the shared brush colour (Tools.currentColor), not Salon.hairColor.
    const quickColors = ['#FFD700','#F0F0F0','#FF69B4','#E0115F','#1E90FF','#9370DB','#00CED1','#FF4500','#90EE90','#C0C0C0'];
    const qGrid = document.createElement('div');
    qGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;';
    quickColors.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'cw-recent-swatch';
      sw.style.background = c;
      sw.style.cursor = 'pointer';
      sw.onclick = () => {
        Tools.currentColor = c;
        Sound.play('click');
      };
      qGrid.appendChild(sw);
    });
    side.appendChild(qGrid);

    // Brush size 2 to 20 px (radius) starting at 6.
    // Size slider
    // Brush size heading.
    const label = document.createElement('h4');
    label.textContent = 'Brush Size';
    label.style.marginTop = '12px';
    side.appendChild(label);
    const slider = document.createElement('input');

    // Range inputs report strings; the handler converts with parseInt before storing in Tools.brushSize.
    slider.type = 'range'; slider.min = '2'; slider.max = '20'; slider.value = '6';
    slider.style.cssText = 'width:100%;accent-color:var(--accent-pink);';
    slider.oninput = () => { Tools.brushSize = parseInt(slider.value); };
    side.appendChild(slider);

    const p = document.createElement('p');
    p.style.cssText = 'font-size:11px;color:var(--text-muted);margin-top:8px;';
    p.textContent = 'Paint highlights directly on the hair!';
    side.appendChild(p);

    // Switch the shared tools to the round brush at size 6 and attach the mouse handlers to the salon canvas
    // (this replaces the canvas element and blanks it, see the file overview).
    Tools.currentTool = 'dye';

    // Highlights are thin streaks, so the size is reset to 6 px each time this panel opens.
    Tools.brushSize = 6;
    Tools.setup('salon-canvas');
  },

  /* ===== TINSEL PANEL ===== */
  // Tinsel: thin glittery strands hanging over the hair. The panel has a colour picker, eight quick colours, and
  // buttons to add or remove strands.
  // @param {HTMLElement} side - The #salon-side element to fill.
  _buildTinselPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Tinsel';
    side.appendChild(h4);

    const colorBtn = document.createElement('div');
    colorBtn.className = 'color-pick-btn';

    // Swatch button shows the tinsel colour (separate from the hair colour).
    colorBtn.style.background = this.tinselColor;
    colorBtn.onclick = () => {
      ColorWheel.setFromHex(this.tinselColor);
      ColorWheel.open('tinsel', hex => {
        this.tinselColor = hex;
        colorBtn.style.background = hex;
      });
    };
    side.appendChild(colorBtn);

    const quickColors = ['#FFD700','#C0C0C0','#FF69B4','#00CED1','#9370DB','#FF4500','#90EE90','#E0115F'];
    const qGrid = document.createElement('div');
    qGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;';
    quickColors.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'cw-recent-swatch';
      sw.style.background = c;
      sw.onclick = () => { this.tinselColor = c; colorBtn.style.background = c; Sound.play('click'); };
      qGrid.appendChild(sw);
    });
    side.appendChild(qGrid);

    // Adds a new random set of 12 strands each time it is pressed (each press draws on top of the existing ones,
    // so repeated presses make the tinsel denser).
    // Add tinsel button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-accent';
    addBtn.style.cssText = 'margin-top:14px;width:100%;';
    addBtn.textContent = '✨ Add Tinsel Strands';

    // Add: switch tinsel on and draw a fresh set of strands over the current picture (without clearing).
    addBtn.onclick = () => {
      this.tinselOn = true;
      this._drawTinsel();
      Sound.play('sparkle');
    };
    side.appendChild(addBtn);

    // Remove: turn tinsel off and redraw the head, which clears it.
    // Remove tinsel
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-ghost';
    removeBtn.style.cssText = 'margin-top:6px;width:100%;font-size:12px;';
    removeBtn.textContent = 'Remove Tinsel';
    removeBtn.onclick = () => {
      this.tinselOn = false;
      this._drawHead();
      Sound.play('click');
    };
    side.appendChild(removeBtn);
  },

  /* ===== ACCESSORIES PANEL ===== */
  // Accessories ("Clips"): a grid of 12 emoji. Choosing one sets Tools.currentSticker, switches the shared tool to
  // the sticker stamp and attaches the mouse handlers; the player then clicks on the canvas to place it.
  // @param {HTMLElement} side - The #salon-side element to fill.
  _buildAccessoriesPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Hair Accessories';
    side.appendChild(h4);

    // Twelve emoji used as hair clips: bow, flowers, butterfly, gem, star, crown, moon, heart, strawberry, rainbow, and so on.
    const accessories = ['🎀','🌸','🦋','💎','⭐','🌺','💫','👑','🌙','❤️','🍓','🌈'];
    const grid = document.createElement('div');
    grid.className = 'item-grid';
    accessories.forEach(a => {
      const cell = document.createElement('div');
      cell.className = 'item-cell';
      cell.textContent = a;
      cell.onclick = () => {
        // Sticker size is 3 x brushSize px, here 24 px (brushSize 8).
        Tools.currentSticker = a;
        Tools.currentTool = 'sticker';
        Tools.brushSize = 8;

        // Attach (or re-attach) the mouse handlers for the sticker tool; the canvas element and its pixels are kept (see Tools.setup).
        Tools.setup('salon-canvas');
        grid.querySelectorAll('.item-cell').forEach(c => c.classList.remove('active'));
        cell.classList.add('active');
        Sound.play('click');
      };
      grid.appendChild(cell);
    });
    side.appendChild(grid);

    const p = document.createElement('p');
    p.style.cssText = 'font-size:11px;color:var(--text-muted);margin-top:8px;';
    p.textContent = 'Click on the hair to place accessories!';
    side.appendChild(p);
  },

  /* ===== FREEHAND PANEL ===== */
  // Freehand: colour swatch, eight quick colours and a size slider (2 to 25) for drawing anywhere on the canvas.
  // @param {HTMLElement} side - The #salon-side element to fill.
  _buildFreehandPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Freehand Drawing';
    side.appendChild(h4);

    const colorBtn = document.createElement('div');
    colorBtn.className = 'color-pick-btn';
    colorBtn.style.background = Tools.currentColor;
    colorBtn.onclick = () => {
      Tools.openColorPicker(hex => { colorBtn.style.background = hex; });
    };
    side.appendChild(colorBtn);

    // Eight quick colours for freehand drawing, ending in white and black.
    const quickColors = ['#FF69B4','#FF6347','#FFD700','#32CD32','#1E90FF','#9370DB','#FFFFFF','#000000'];
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

    const label = document.createElement('h4');
    label.textContent = 'Size';
    label.style.marginTop = '10px';
    side.appendChild(label);
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = '2'; slider.max = '25'; slider.value = Tools.brushSize;
    slider.style.cssText = 'width:100%;accent-color:var(--accent-pink);';
    slider.oninput = () => { Tools.brushSize = parseInt(slider.value); };
    side.appendChild(slider);
  },

  /* ===== BUILD SIDE PANEL (initial) ===== */
  // Initial side panel when the salon opens (the style grid).
  _buildSidePanel() {
    // The salon always opens on the style tool.
    this._onToolChange('style');
  },

  /* ===== DRAW HEAD & HAIR ===== */
  // Draws the whole close-up from the current state, back to front: neck, shoulders, back hair, head, ears, eyes,
  // nose, mouth, blush, eyebrows, front hair, then tinsel if on. Skin, eye and outfit colours come from the saved
  // character (or Character.data before a game exists). Any earlier painting on the canvas is erased.
  _drawHead() {
    const c = document.getElementById('salon-canvas');
    if (!c) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    // Head centre: horizontally centred and 20 px below the middle so there is room for hair and shoulders. The head is
    // a circle of radius 90.
    const cx = w/2, cy = h/2 + 20;

    // Head radius in pixels; all feature offsets in this routine are written relative to it or to the centre.
    const headR = 90;

    // Prefer the saved character; fall back to the creator's in-progress data when no game exists yet.
    const charData = Game.state.character || Character.data;

    // Fall back to defaults when the data is missing a field (older saves).
    const skinColor = charData.skinTone || '#FDDBB4';

    // Neck: a 30x60 rectangle starting at 65% of the head radius below the centre so it tucks behind the head.
    // Neck
    ctx.fillStyle = skinColor;

    // Neck rectangle: 30 px wide, 60 px tall, starting inside the lower head so the join is hidden by the head drawn later.
    ctx.fillRect(cx - 15, cy + headR*0.65, 30, 60);

    // Shoulders: an ellipse of the outfit's top colour below the head.
    // Shoulders hint
    ctx.fillStyle = charData.outfit?.top || '#ff69b4';
    ctx.beginPath();

    // A 70x30 ellipse just below the chin suggests shoulders; it is drawn before the head so it sits behind it.
    ctx.ellipse(cx, cy + headR + 50, 70, 30, 0, 0, Math.PI*2);
    ctx.fill();

    // Hair behind the head is drawn before the head, so the face covers its top edge.
    // Hair back
    this._drawSalonHairBack(ctx, cx, cy, headR);

    // Head
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(cx, cy, headR, 0, Math.PI*2);
    ctx.fill();

    // The ears are skin-coloured ellipses at the head's sides, using the fill style already set for the head.
    // Ears
    ctx.beginPath();
    ctx.ellipse(cx - headR*0.92, cy + 5, 10, 14, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + headR*0.92, cy + 5, 10, 14, 0, 0, Math.PI*2);
    ctx.fill();

    // Each eye: white disc, faint outline, coloured iris, dark pupil and a small highlight; positions are 25 px either
    // side of the centre. (A single `ex` offset of -25 and +25 draws both.)
    // Simple eyes
    // Eye colour from the saved character.
    const eyeColor = charData.eyeColor || '#4a90d9';
    const eyeY = cy + 5;
    [-25, 25].forEach(ex => {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx + ex, eyeY, 13, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = eyeColor;
      ctx.beginPath(); ctx.arc(cx + ex + 1, eyeY, 8, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath(); ctx.arc(cx + ex + 1, eyeY, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(cx + ex - 2, eyeY - 3, 3, 0, Math.PI*2); ctx.fill();
    });

    // A single darker-skin dot (skin colour 12 lightness points darker).
    // Nose
    // Nose colour: skin darkened by 12 lightness points.
    const skinDark = Character._darken(skinColor, 12);
    ctx.fillStyle = skinDark;
    ctx.beginPath(); ctx.arc(cx, cy + 22, 4, 0, Math.PI*2); ctx.fill();

    // A smiling arc: the lower part of a 12 px circle, from 0.15 pi to 0.85 pi.
    // Mouth
    // Mouth colour: a plain red stroke, drawn as a smile arc.
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy + 38, 12, 0.15*Math.PI, 0.85*Math.PI);
    ctx.stroke();

    // Pale pink ovals on the cheeks.
    // Blush
    ctx.fillStyle = 'rgba(255,150,170,0.2)';
    ctx.beginPath(); ctx.ellipse(cx - 35, cy + 25, 12, 7, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 35, cy + 25, 12, 7, 0, 0, Math.PI*2); ctx.fill();

    // Eyebrows follow the hair colour (darkened) so changing the dye changes them too.
    // Eyebrows
    // Eyebrows use the hair colour so dyeing changes them as well.
    ctx.strokeStyle = Character._darken(this.hairColor, 10);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx-35, eyeY-18); ctx.quadraticCurveTo(cx-25, eyeY-24, cx-15, eyeY-18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+15, eyeY-18); ctx.quadraticCurveTo(cx+25, eyeY-24, cx+35, eyeY-18); ctx.stroke();

    // Front hair goes over the forehead, then tinsel on top of everything.
    // Hair front
    this._drawSalonHairFront(ctx, cx, cy, headR);

    // Tinsel overlay
    // Tinsel goes on top of the front hair so the strands hang over it.
    if (this.tinselOn) {
      this._drawTinsel();
    }
  },

  // Hair drawn behind the head for styles that fall behind the shoulders (long/wavy/straight, braids, ponytail); other
  // styles need nothing behind the head.
  // @param {CanvasRenderingContext2D} ctx - Salon canvas context.
  // @param {number} cx - Head centre x.
  // @param {number} cy - Head centre y.
  // @param {number} r - Head radius in pixels.
  _drawSalonHairBack(ctx, cx, cy, r) {
    ctx.fillStyle = this.hairColor;

    // Short alias for the style id used in the comparisons below.
    const s = this.hairStyle;

    // Long hair: a curtain from the sides of the head down to 2.2 head radii below the centre.
    if (['long','wavy','straight'].includes(s)) {
      ctx.beginPath();
      ctx.moveTo(cx - r*0.95, cy - r*0.1);
      ctx.quadraticCurveTo(cx - r*1.1, cy + r*1.5, cx - r*0.5, cy + r*2.2);
      ctx.quadraticCurveTo(cx, cy + r*2.5, cx + r*0.5, cy + r*2.2);
      ctx.quadraticCurveTo(cx + r*1.1, cy + r*1.5, cx + r*0.95, cy - r*0.1);
      ctx.closePath();
      ctx.fill();
    }

    // Braids: a column of small overlapping circles on each side every 14 px, wobbling sideways with a sine wave (5 px).
    if (s === 'braids') {
      [-35, 35].forEach(bx => {
        for (let by = cy + r*0.5; by < cy + r*2.5; by += 14) {
          ctx.beginPath();
          ctx.arc(cx + bx + Math.sin(by*0.08)*5, by, 9, 0, Math.PI*2);
          ctx.fill();
        }
      });
    }

    // Ponytail: a tapered strand falling from the upper right.
    if (s === 'ponytail') {
      ctx.beginPath();
      ctx.moveTo(cx + 8, cy - r*0.7);
      ctx.quadraticCurveTo(cx + r*1.3, cy - r*0.4, cx + r*0.8, cy + r*1.5);
      ctx.quadraticCurveTo(cx + r*0.3, cy + r*2, cx + 8, cy + r*0.5);
      ctx.closePath();
      ctx.fill();
    }
  },

  // Hair drawn over the head: the cap on top plus the shapes that define each style.
  // @param {CanvasRenderingContext2D} ctx - Salon canvas context.
  // @param {number} cx - Head centre x.
  // @param {number} cy - Head centre y.
  // @param {number} r - Head radius in pixels.
  _drawSalonHairFront(ctx, cx, cy, r) {
    ctx.fillStyle = this.hairColor;
    const s = this.hairStyle;

    // Cap: a half ellipse across the top of the head plus a thin rectangle that closes the bottom edge of the cap
    // above the eyebrows (12% of the radius high) so there is no gap at the hairline.
    // Hair cap — sits above eyebrow line
    ctx.beginPath();
    ctx.ellipse(cx, cy - r*0.38, r*1.08, r*0.52, 0, Math.PI, 0, true);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(cx - r*1.08, cy - r*0.38, r*2.16, r*0.12);
    ctx.fill();

    // Bob: short side panels down to cheek level.
    if (s === 'bob') {
      ctx.beginPath();
      ctx.moveTo(cx - r*0.95, cy - r*0.1);
      ctx.quadraticCurveTo(cx - r*1.12, cy + r*0.5, cx - r*0.65, cy + r*0.6);
      ctx.lineTo(cx - r*0.55, cy);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + r*0.95, cy - r*0.1);
      ctx.quadraticCurveTo(cx + r*1.12, cy + r*0.5, cx + r*0.65, cy + r*0.6);
      ctx.lineTo(cx + r*0.55, cy);
      ctx.closePath(); ctx.fill();
    }

    // Pixie: a swept fringe.
    if (s === 'pixie') {
      ctx.beginPath();
      ctx.moveTo(cx - r*0.6, cy - r*0.35);
      ctx.quadraticCurveTo(cx + r*0.2, cy - r*0.9, cx + r*0.7, cy - r*0.2);
      ctx.lineTo(cx + r*0.3, cy); ctx.lineTo(cx - r*0.2, cy - r*0.1);
      ctx.closePath(); ctx.fill();
    }

    // Curly/afro: a ring of overlapping circles around the top half of the head (afro radius 1.35 x, curly 1.15 x)
    // plus one on each side.
    if (s === 'curly' || s === 'afro') {
      // Ring radius multiplier: the afro stands out further than curly hair.
      const er = s === 'afro' ? 1.35 : 1.15;
      for (let a = -0.3; a > -Math.PI - 0.3; a -= 0.35) {
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a)*r*er, cy + Math.sin(a)*r*er, r*0.3, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.beginPath(); ctx.arc(cx - r*er, cy + 12, r*0.28, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + r*er, cy + 12, r*0.28, 0, Math.PI*2); ctx.fill();
    }

    // Buns: two circles on top of the head.
    if (s === 'buns') {
      ctx.beginPath(); ctx.arc(cx - r*0.5, cy - r*0.85, r*0.28, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + r*0.5, cy - r*0.85, r*0.28, 0, Math.PI*2); ctx.fill();
    }

    // Mohawk: five circles in a row whose heights follow a sine curve.
    if (s === 'mohawk') {
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(cx + (i-2)*r*0.25, cy - r*0.65 - Math.sin(i*0.9+0.5)*14, r*0.2, 0, Math.PI*2);
        ctx.fill();
      }
    }

    // Side part: a fringe swept across the forehead.
    if (s === 'sidepart') {
      ctx.beginPath();
      ctx.moveTo(cx - r*0.8, cy - r*0.3);
      ctx.quadraticCurveTo(cx - r*0.1, cy - r*0.7, cx + r*0.4, cy - r*0.25);
      ctx.lineTo(cx + r*0.6, cy - r*0.05); ctx.lineTo(cx - r*0.4, cy + r*0.05);
      ctx.closePath(); ctx.fill();
    }

    // A faint darker arc for styles with smooth hair, for a strand effect.
    // Hair detail line
    if (['long','wavy','straight','sidepart','bob'].includes(s)) {
      ctx.strokeStyle = Character._darken(this.hairColor, 12);

      // Thin line so the strand arc reads as a subtle detail.
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy - r*0.05, r*0.88, 0.82*Math.PI, 0.18*Math.PI, true);
      ctx.stroke();
    }
  },

  /* ===== TINSEL ===== */
  // Draws 12 glittery tinsel strands over the hair in the tinsel colour. Each strand starts on the upper head at a
  // random angle and runs down in 8 slightly jittery segments, ending with a sparkle dot. The strands are random
  // each time, so redrawing the head (which calls this when tinselOn is true) gives a different arrangement.
  _drawTinsel() {
    const c = document.getElementById('salon-canvas');
    if (!c) return;
    const ctx = c.getContext('2d');
    const cx = c.width/2, cy = c.height/2 + 20;

    // Head radius, the same value as in _drawHead (duplicated).
    const r = 90;

    // Strand colour and line width; strokes are translucent (0.7) so the hair beneath shows.
    ctx.strokeStyle = this.tinselColor;
    ctx.lineWidth = 1.5;

    // Translucent lines so the hair shows through.
    ctx.globalAlpha = 0.7;

    for (let i = 0; i < 12; i++) {
      // Start angle: around -36 degrees (upper right) plus a random spread of ±72 degrees (0.8 pi total), so strands
      // fan out across the top of the head.
      const startAngle = -Math.PI*0.2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const sx = cx + Math.cos(startAngle) * r * 0.7;
      const sy = cy + Math.sin(startAngle) * r * 0.4 - r*0.2;

      // Strand length 40-100 px; each of the 8 segments moves down by len/8 and sideways by up to ±6 px.
      const len = 40 + Math.random() * 60;

      ctx.beginPath();
      ctx.moveTo(sx, sy);

      // The strand's current end point; starts at its anchor and drifts downward.
      let px = sx, py = sy;
      for (let j = 0; j < 8; j++) {
        // Each segment moves a random -6..+6 px sideways and an even len/8 down, producing a wavy hanging strand.
        px += (Math.random()-0.5) * 12;
        py += len / 8;
        ctx.lineTo(px, py);
      }
      ctx.stroke();

      // A small bright dot at the free end of each strand.
      // Sparkle at end
      ctx.fillStyle = this.tinselColor;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  /* ===== FINISH ===== */
  // "Done" button handler: saves the new hair to the character and the closet, awards 60 XP, and leaves the salon
  // (to the level-up screen if a level was gained, otherwise the workshop).
  finish() {
    // Update both the saved game and the live Character object, so the next time the character is drawn (workshop,
    // creator) it wears the new hair.
    // Save hair changes to character
    if (Game.state.character) {
      // Both the saved copy and the live Character.data object are updated because the saved copy is what gets stored on disk and the live one is what the creator and workshop draw from.
      Game.state.character.hairColor = this.hairColor;
      Game.state.character.hairStyle = this.hairStyle;
      Character.data.hairColor = this.hairColor;
      Character.data.hairStyle = this.hairStyle;
    }

    // Store a picture of the canvas as a closet item of type 'hair' (name is the style plus " Hairstyle").
    // Save salon result to closet
    const c = document.getElementById('salon-canvas');
    if (c) {
      // Export the canvas as a PNG data URL, a text string that can be stored in JSON and used directly as an <img> src.
      const imageData = c.toDataURL('image/png');
      Game.addToCloset({
        id: Date.now(),
        type: 'hair',
        subtype: this.hairStyle,

        // Closet label: the style id with its first letter capitalised, followed by " Hairstyle".
        name: this.hairStyle.charAt(0).toUpperCase() + this.hairStyle.slice(1) + ' Hairstyle',
        image: imageData,
        createdAt: Date.now(),
      });
    }

    // Reward feedback: jingle plus 60 XP.
    Sound.play('complete');

    // Award XP and save. The explicit Game.save() is redundant (addXP already saves) but harmless.
    Game.addXP(60);
    Game.save();
    if (Game.checkLevelUp()) Game.goTo('levelup');
    else Game.goTo('workshop');
  }
};
