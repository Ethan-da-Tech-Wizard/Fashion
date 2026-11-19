// ==============================================================================
// Program: tech.js
// Programmer: Ethan-da-Tech-Wizard
// Last Modified: November 19, 2026
// Purpose: Tech gadget design workshop and accessory customization engine.
//          Renders procedural vector device models (Smartphones, Tablets, AirPods)
//          with customizable casing chassis, screen wallpapers, metallic antenna bands,
//          camera bumps, spray-paint layers, and sticker embellishments.
// FILE OVERVIEW
// tech.js is the Tech Workshop station (#tech-screen in index.html): the player picks a gadget
// (phone, tablet or earbud case), chooses its body and screen colours, decorates it with spray
// paint, glitter, paint and stickers, and presses Done to save a picture of it in the closet.
//
// Who calls it: Game.goTo('tech') calls Tech.init(); the screen's Done button calls Tech.finish().
// It uses Tools (painting on #tech-canvas), ColorWheel, Icons, Sound, DEVICE_TYPES (utils.js) and
// Game (addToCloset, addXP, save, checkLevelUp, goTo).
//
// Layout: the usual three columns: #tech-tools (tool buttons), #tech-canvas (the device) and
// #tech-side (options). _buildTools makes the buttons; _buildSidePanel(toolId) fills the options and
// also attaches Tools to the canvas for the painting tools.
//
// State on Tech: deviceType (id from DEVICE_TYPES or null), deviceColor (body) and screenColor.
// Everything else lives in the canvas pixels. _drawDevice() repaints the device from this state, which
// also erases any paint or stickers on the canvas.
//
// Known limits / things to watch:
//   - (Fixed) Tools.setup() used to swap the canvas for a blank clone, so choosing a painting tool could make
//     the device disappear; the canvas is now kept. The device still cannot be recoloured without losing the decoration.
//   - (Fixed) Icons.get() is called with 'phone', 'tablet' and 'airpods'; icons.js now defines them (the picker
//     used to show the fallback star).
//   - (Fixed) finish() used to award 50 XP even when no device was chosen; it now plays the error sound and stays
//     on the screen (like Books.finish) so XP is only given for a saved item.
// How to test: Game.goTo('tech'); Tech.deviceType = 'phone'; Tech._drawDevice() in the console.
// ==============================================================================
/* ===== TECH WORKSHOP WORKSTATION ===== */
// Singleton controller for the Tech Workshop.
const Tech = {
  // Chosen gadget id from DEVICE_TYPES ('phone', 'tablet', 'airpods') or null until one is picked.
  deviceType: null,

  // Body colour; the default is near-black navy.
  deviceColor: '#1a1a2e',

  // Screen colour; the default is dark slate.
  screenColor: '#111827',

  /**
   * Initializes Tech Workshop canvas geometry, resets active gadget model, and loads tools.
   */
  init() {
    // Looked up by id on each call (cheap, and robust if the element is ever replaced).
    const c = document.getElementById('tech-canvas');
    if (!c) return;
    const parent = c.parentElement;
    const rect = parent.getBoundingClientRect();

    // Fit the canvas to the space beside the side panels: the tool column (70 px) plus the options panel (220 px) is 290 px;
    // at most 700 x 500. Setting the size clears the canvas.
    c.width = Math.min(rect.width - 290, 700);
    c.height = Math.min(rect.height, 500);

    // Each visit starts with no device selected so the player picks one; the colours are kept.
    this.deviceType = null;
    this._buildTools();
    this._buildSidePanel('pick');
  },

  /* ===== TOOLS ===== */
  // Creates the tool buttons in #tech-tools: Device (pick), Color, Spray, Sticker, Glitter, Paint (dye) and Eraser.
  _buildTools() {
    const tools = document.getElementById('tech-tools');
    if (!tools) return;

    // Clear first: init() runs on every visit and must not stack duplicate buttons.
    tools.innerHTML = '';

    // Each entry: id (passed to _buildSidePanel), icon (a key in Icons.paths) and label.
    const toolList = [
      { id: 'pick', icon: 'tech', label: 'Device' },
      { id: 'color', icon: 'palette', label: 'Color' },
      { id: 'spray', icon: 'brush', label: 'Spray' },
      { id: 'sticker', icon: 'star', label: 'Sticker' },
      { id: 'glitter', icon: 'sparkles', label: 'Glitter' },
      { id: 'dye', icon: 'brush', label: 'Paint' },
      { id: 'eraser', icon: 'eraser', label: 'Eraser' },
    ];

    toolList.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn' + (i === 0 ? ' active' : '');
      btn.innerHTML = `${Icons.get(t.icon)}<span class="tool-label">${t.label}</span>`;

      // Icon above its label (.tool-btn defaults to a row).
      btn.style.flexDirection = 'column';
      btn.title = t.label;

      // Select the tool: move the highlight, click sound, then rebuild the side panel (which also configures Tools).
      btn.onclick = () => {
        tools.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Sound.play('click');
        this._buildSidePanel(t.id);
      };
      tools.appendChild(btn);
    });
  },

  // Fills #tech-side for the selected tool and, for painting tools, configures the shared Tools object and attaches it to
  // the canvas.
  // @param {string} toolId - 'pick', 'color', 'spray', 'sticker', 'glitter', 'dye' or 'eraser'.
  _buildSidePanel(toolId) {
    const side = document.getElementById('tech-side');
    if (!side) return;

    // Discard the previous tool's panel before building the new one.
    side.innerHTML = '';

    // Device picker: one cell per entry in DEVICE_TYPES; choosing a cell draws that device straight away.
    if (toolId === 'pick') {
      const h4 = document.createElement('h4');
      h4.textContent = 'Choose Device';
      side.appendChild(h4);

      // .item-grid fits as many 48 px cells as the 220 px panel allows.
      const grid = document.createElement('div');
      grid.className = 'item-grid';
      DEVICE_TYPES.forEach(d => {
        const cell = document.createElement('div');

        // The current device is highlighted when the panel is built.
        cell.className = 'item-cell' + (this.deviceType === d.id ? ' active' : '');

        // Icon plus name (the icon id equals the device id: 'phone', 'tablet', 'airpods', defined in icons.js).
        cell.innerHTML = `<div style="text-align:center"><div>${Icons.get(d.id, 26)}</div><div style="font-size:10px;color:var(--text-muted);margin-top:4px;">${d.name}</div></div>`;
        cell.onclick = () => {
          this.deviceType = d.id;
          grid.querySelectorAll('.item-cell').forEach(c => c.classList.remove('active'));
          cell.classList.add('active');
          Sound.play('select');
          this._drawDevice();
        };
        grid.appendChild(cell);
      });
      side.appendChild(grid);

      // Until a device is chosen show a hint on the empty canvas.
      if (!this.deviceType) {
        this._drawPlaceholder('Pick a device →');
      }

    // Colour panel: a body colour button (opens the wheel) with 12 quick colours, then eight dark screen colours.
    // Both redraw the device immediately.
    } else if (toolId === 'color') {
      const h4 = document.createElement('h4');
      h4.textContent = 'Device Color';
      side.appendChild(h4);

      const colorBtn = document.createElement('div');
      colorBtn.className = 'color-pick-btn';
      colorBtn.style.background = this.deviceColor;
      colorBtn.onclick = () => {
        // Load the current colour so the wheel opens on it; the callback below applies the pick and repaints.
        ColorWheel.setFromHex(this.deviceColor);
        ColorWheel.open('device', hex => {
          this.deviceColor = hex;
          colorBtn.style.background = hex;
          this._drawDevice();
        });
      };
      side.appendChild(colorBtn);

      // Twelve body colours: dark navy, off-white, gold, pink, blue, purple, green, orange, silver, dark red, black and sky blue.
      const colors = ['#1a1a2e','#F5F5F5','#FFD700','#FF69B4','#1E90FF','#9370DB','#2E8B57','#FF4500','#C0C0C0','#8B0000','#000000','#87CEEB'];
      const qg = document.createElement('div');
      qg.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;';
      colors.forEach(c => {
        const sw = document.createElement('div');
        sw.className = 'cw-recent-swatch';
        sw.style.background = c;

        // A quick swatch sets the colour, updates the big swatch and repaints in one go.
        sw.onclick = () => { this.deviceColor = c; colorBtn.style.background = c; this._drawDevice(); Sound.play('click'); };
        qg.appendChild(sw);
      });
      side.appendChild(qg);

      // Screen colours are all dark (navy, slate, deep purple, dark green, brown, plum, dark blue) so the screen looks like
      // an off display; they are fixed presets rather than a wheel.
      // Screen color
      const h4b = document.createElement('h4');
      h4b.textContent = 'Screen Color';
      h4b.style.marginTop = '12px';
      side.appendChild(h4b);

      const presets = ['#111827','#0f172a','#1e1b4b','#14532d','#7c2d12','#1a1a2e','#4a044e','#172554'];
      const sg = document.createElement('div');
      sg.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
      presets.forEach(c => {
        const sw = document.createElement('div');
        sw.className = 'cw-recent-swatch';
        sw.style.background = c;

        // Screen swatches only change the screen colour and repaint (there is no big swatch to update for the screen).
        sw.onclick = () => { this.screenColor = c; this._drawDevice(); Sound.play('click'); };
        sg.appendChild(sw);
      });
      side.appendChild(sg);

    // Spray: the shared tool in spray mode (a scatter of small dots); the panel offers colour and size.
    } else if (toolId === 'spray') {
      this._buildPaintPanel(side, 'Spray Paint');
      Tools.currentTool = 'spray';
      Tools.setup('tech-canvas');

    // Stickers: tech-themed emoji (devices, music, shapes, hearts) in the first ten, then general decorations. Choosing
    // one sets Tools.currentSticker; the player clicks on the canvas to place it (size 3 x 8 = 24 px).
    } else if (toolId === 'sticker') {
      const h4 = document.createElement('h4');
      h4.textContent = 'Stickers';
      side.appendChild(h4);

      // Twenty emoji: the first ten are tech-related (devices, camera, battery, antenna, bulb, bolt, plug), the rest general decorations.
      const techStickers = ['📱','💻','🎮','🎧','📷','🔋','📡','💡','⚡','🔌',
        '🎵','🎶','🌟','💎','🦋','🌸','❤️','⭐','🔥','💜'];
      const grid = document.createElement('div');
      grid.className = 'item-grid';
      techStickers.forEach(s => {
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

      // Brush size 8 gives 24 px stickers (size is 3 x brushSize).
      Tools.brushSize = 8;
      Tools.setup('tech-canvas');

    // Glitter: the shared glitter tool.
    } else if (toolId === 'glitter') {
      this._buildPaintPanel(side, 'Glitter');
      Tools.currentTool = 'glitter';
      Tools.setup('tech-canvas');

    // Paint: the shared round brush.
    } else if (toolId === 'dye') {
      this._buildPaintPanel(side, 'Paint');
      Tools.currentTool = 'dye';
      Tools.setup('tech-canvas');

    // Eraser: the shared eraser at a radius of 15 px (it removes 30 px wide), plus a button that repaints the device from
    // scratch (removing everything painted).
    } else if (toolId === 'eraser') {
      Tools.currentTool = 'eraser';

      // Eraser radius 15 px, a generous size so large areas are quick to clear.
      Tools.brushSize = 15;
      Tools.setup('tech-canvas');
      const h4 = document.createElement('h4');
      h4.textContent = 'Eraser';
      side.appendChild(h4);
      const p = document.createElement('p');
      p.style.cssText = 'font-size:12px;color:var(--text-muted);';
      p.textContent = 'Draw over areas to erase them.';
      side.appendChild(p);
      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn btn-ghost';
      resetBtn.style.cssText = 'width:100%;margin-top:12px;';
      resetBtn.textContent = '🔄 Reset Device';

      // Reset repaints the device from its settings, wiping all paint and stickers (it also still serves as the way to start over from the plain device).
      resetBtn.onclick = () => { this._drawDevice(); Sound.play('whoosh'); };
      side.appendChild(resetBtn);
    }
  },

  // Shared options for the spray, glitter and paint tools: a heading ("<label> Color"), a colour button, 12 quick colours and a
  // size slider (2-30 px) bound to Tools.brushSize.
  // @param {HTMLElement} side - The #tech-side element to fill.
  // @param {string} label - Tool name used in the heading ('Spray Paint', 'Glitter' or 'Paint').
  _buildPaintPanel(side, label) {
    const h4 = document.createElement('h4');
    h4.textContent = label + ' Color';
    side.appendChild(h4);

    const colorBtn = document.createElement('div');
    colorBtn.className = 'color-pick-btn';
    colorBtn.style.background = Tools.currentColor;
    colorBtn.onclick = () => {
      Tools.openColorPicker(hex => { colorBtn.style.background = hex; });
    };
    side.appendChild(colorBtn);

    // The same 12 quick colours the Fashion Studio offers (pinks, reds, gold, green, blue, purple, teal, orange, white, black, dark red).
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

    // Size slider
    const slbl = document.createElement('h4');
    slbl.textContent = 'Size';
    slbl.style.marginTop = '10px';
    side.appendChild(slbl);
    const slider = document.createElement('input');

    // Size 2-30 px; the slider starts at the current Tools.brushSize so it matches the tool's real value.
    slider.type = 'range'; slider.min = '2'; slider.max = '30'; slider.value = Tools.brushSize;
    slider.style.cssText = 'width:100%;accent-color:var(--accent-pink);';
    slider.oninput = () => { Tools.brushSize = parseInt(slider.value); };
    side.appendChild(slider);
  },

  /* ===== DRAW ===== */
  // Shows a faint hint message in the middle of the empty canvas.
  // @param {string} msg - Text to show.
  _drawPlaceholder(msg) {
    const c = document.getElementById('tech-canvas');
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.font = '18px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(msg, c.width/2, c.height/2);
  },

  // Clears the canvas and paints the selected device in the centre. Does nothing until a device is selected.
  _drawDevice() {
    const c = document.getElementById('tech-canvas');
    if (!c || !this.deviceType) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;

    // Repaint from scratch: removes earlier paint and stickers.
    ctx.clearRect(0, 0, w, h);

    const cx = w/2, cy = h/2;

    // Look up the device's size record; if the id is unknown nothing is drawn.
    const d = DEVICE_TYPES.find(t => t.id === this.deviceType);
    if (!d) return;

    // The device's width and height from DEVICE_TYPES (pixels: phone 120x220, tablet 220x160). The earbud case is drawn at
    // a fixed size, so its table size is not used.
    const sw = d.w, sh = d.h;

    // Dispatch to the per-device drawing routine.
    if (this.deviceType === 'phone') {
      this._drawPhone(ctx, cx, cy, sw, sh);
    } else if (this.deviceType === 'tablet') {
      this._drawTablet(ctx, cx, cy, sw, sh);
    } else if (this.deviceType === 'airpods') {
      this._drawAirpods(ctx, cx, cy);
    }
  },

  // Paints a phone: a soft shadow, a rounded-rectangle body, a dark screen inset by 12 px (and shifted 8 px down to leave room for
  // the camera), a faint diagonal screen shine, a camera dot, a home bar, and a lighter metallic edge.
  // @param {CanvasRenderingContext2D} ctx - Target context.
  // @param {number} cx - Centre x.
  // @param {number} cy - Centre y.
  // @param {number} sw - Body width in pixels.
  // @param {number} sh - Body height in pixels.
  _drawPhone(ctx, cx, cy, sw, sh) {
    // Corner radius of the body in pixels (a phone has rounder corners than a tablet).
    const r = 16;

    // A translucent black copy of the body offset 4 px down and right gives a drop shadow.
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    this._roundRect(ctx, cx - sw/2 + 4, cy - sh/2 + 4, sw, sh, r);
    ctx.fill();

    // Body
    ctx.fillStyle = this.deviceColor;
    this._roundRect(ctx, cx - sw/2, cy - sh/2, sw, sh, r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Screen
    // Bezel thickness: 12 px of body colour around the screen (plus 8 px extra at the top for the camera).
    const margin = 12;
    ctx.fillStyle = this.screenColor;
    this._roundRect(ctx, cx - sw/2 + margin, cy - sh/2 + margin + 8, sw - margin*2, sh - margin*2 - 16, 8);
    ctx.fill();

    // A triangle of 5% white from the screen's top corners to the left side suggests a glass reflection.
    // Screen shine
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.moveTo(cx - sw/2 + margin, cy - sh/2 + margin + 8);
    ctx.lineTo(cx + sw/2 - margin, cy - sh/2 + margin + 8);
    ctx.lineTo(cx - sw/2 + margin, cy + sh/4);
    ctx.closePath();
    ctx.fill();

    // Camera dot
    ctx.fillStyle = '#333';
    ctx.beginPath();

    // Front camera: a 3 px dark dot centred 10 px below the top edge.
    ctx.arc(cx, cy - sh/2 + 10, 3, 0, Math.PI*2);
    ctx.fill();

    // Bottom bar
    ctx.fillStyle = 'rgba(255,255,255,0.1)';

    // Home bar: a 40x4 px translucent pill 14 px above the bottom edge.
    this._roundRect(ctx, cx - 20, cy + sh/2 - 14, 40, 4, 2);
    ctx.fill();

    // The edge colour is the body colour 15 lightness points lighter (capped at 100), so it works for any body colour.
    // Metallic edge
    const [dh,ds,dl] = U.hexToHsl(this.deviceColor);
    ctx.strokeStyle = U.hslToHex(dh, ds, Math.min(100, dl + 15));
    ctx.lineWidth = 2;
    this._roundRect(ctx, cx - sw/2 + 1, cy - sh/2 + 1, sw - 2, sh - 2, r);
    ctx.stroke();
  },

  // Paints a tablet: the same layers as the phone with a thinner 10 px bezel, a smaller corner radius (14), a smaller camera
  // dot at the top edge and a fainter shine.
  // @param {CanvasRenderingContext2D} ctx - Target context.
  // @param {number} cx - Centre x.
  // @param {number} cy - Centre y.
  // @param {number} sw - Body width in pixels.
  // @param {number} sh - Body height in pixels.
  _drawTablet(ctx, cx, cy, sw, sh) {
    const r = 14;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    this._roundRect(ctx, cx - sw/2 + 4, cy - sh/2 + 4, sw, sh, r);
    ctx.fill();

    ctx.fillStyle = this.deviceColor;
    this._roundRect(ctx, cx - sw/2, cy - sh/2, sw, sh, r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Tablet bezel: 10 px all round (thinner than the phone's top/bottom).
    const margin = 10;
    ctx.fillStyle = this.screenColor;
    this._roundRect(ctx, cx - sw/2 + margin, cy - sh/2 + margin, sw - margin*2, sh - margin*2, 6);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.moveTo(cx - sw/2 + margin, cy - sh/2 + margin);
    ctx.lineTo(cx + sw/2 - margin, cy - sh/2 + margin);
    ctx.lineTo(cx - sw/2 + margin, cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.beginPath();

    // Tablet camera dot: 2 px radius, 6 px below the top edge.
    ctx.arc(cx, cy - sh/2 + 6, 2, 0, Math.PI*2);
    ctx.fill();

    const [dh,ds,dl] = U.hexToHsl(this.deviceColor);
    ctx.strokeStyle = U.hslToHex(dh, ds, Math.min(100, dl + 15));
    ctx.lineWidth = 2;
    this._roundRect(ctx, cx - sw/2 + 1, cy - sh/2 + 1, sw - 2, sh - 2, r);
    ctx.stroke();
  },

  // Paints an earbud charging case (90x100 px, corner radius 20) with a hinge line, a green LED and two faint earbud outlines
  // with stems inside the lid area.
  // @param {CanvasRenderingContext2D} ctx - Target context.
  // @param {number} cx - Centre x.
  // @param {number} cy - Centre y.
  _drawAirpods(ctx, cx, cy) {
    // Case
    // Charging case size in pixels (width, height) and corner radius.
    const caseW = 90, caseH = 100, caseR = 20;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    this._roundRect(ctx, cx - caseW/2 + 3, cy - caseH/2 + 3, caseW, caseH, caseR);
    ctx.fill();

    ctx.fillStyle = this.deviceColor;
    this._roundRect(ctx, cx - caseW/2, cy - caseH/2, caseW, caseH, caseR);
    ctx.fill();

    // Hinge line
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    // The hinge line runs across the case 8 px above the centre, inset 5 px from each edge.
    ctx.moveTo(cx - caseW/2 + 5, cy - 8);
    ctx.lineTo(cx + caseW/2 - 5, cy - 8);
    ctx.stroke();

    // LED indicator
    ctx.fillStyle = '#32CD32';
    ctx.beginPath();

    // Green status LED near the bottom edge.
    ctx.arc(cx, cy + caseH/2 - 15, 3, 0, Math.PI*2);
    ctx.fill();

    // Metallic edging
    const [dh,ds,dl] = U.hexToHsl(this.deviceColor);
    ctx.strokeStyle = U.hslToHex(dh, ds, Math.min(100, dl + 15));
    ctx.lineWidth = 2;
    this._roundRect(ctx, cx - caseW/2 + 1, cy - caseH/2 + 1, caseW - 2, caseH - 2, caseR);
    ctx.stroke();

    // Airpod outlines inside
    ctx.fillStyle = 'rgba(255,255,255,0.08)';

    // One earbud outline on each side of centre: a head (ellipse 12x20) and a stem (6x15 rectangle) below it.
    [-18, 18].forEach(dx => {
      ctx.beginPath();
      ctx.ellipse(cx + dx, cy - 22, 12, 20, 0, 0, Math.PI*2);
      ctx.fill();
      // Stem
      ctx.fillRect(cx + dx - 3, cy - 5, 6, 15);
    });
  },

  // Builds (but does not fill or stroke) a rounded-rectangle path from four arcTo corners. Callers choose fill or stroke.
  // @param {CanvasRenderingContext2D} ctx - Target context.
  // @param {number} x - Left edge.
  // @param {number} y - Top edge.
  // @param {number} w - Width.
  // @param {number} h - Height.
  // @param {number} r - Corner radius (must not exceed half the width or height).
  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();

    // Start on the top edge after the corner, then four arcTo calls round the corners clockwise. arcTo needs the corner point and the next point, which is why each call lists the two adjacent corners.
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  /* ===== FINISH ===== */
  // "Done" handler: saves a picture of the design to the closet (type 'tech'), awards 50 XP, saves, and leaves (the level-up
  // screen if a level was gained, otherwise the workshop).
  finish() {
    const c = document.getElementById('tech-canvas');

    // Nothing to save without a canvas and a chosen device. Before the fix the XP below was awarded anyway, so
    // pressing Done repeatedly on an empty screen farmed 50 XP per click; now the player gets the error sound and
    // stays on the screen to pick a device (the same behaviour as Books.finish).
    if (!c || !this.deviceType) {
      Sound.play('error');
      return;
    }

    // From here an item definitely exists, so saving it and paying the XP always go together.
    {
      const imageData = c.toDataURL('image/png');
      const d = DEVICE_TYPES.find(t => t.id === this.deviceType);
      Game.addToCloset({
        id: Date.now(),
        type: 'tech',
        subtype: this.deviceType,
        name: (d ? d.name : 'Device') + ' Design',
        image: imageData,
        createdAt: Date.now(),
      });
    }

    // Reward feedback: jingle plus 50 XP.
    Sound.play('complete');

    // Award XP; the extra Game.save() is redundant (addXP saves) but harmless.
    Game.addXP(50);
    Game.save();
    if (Game.checkLevelUp()) Game.goTo('levelup');
    else Game.goTo('workshop');
  }
};
