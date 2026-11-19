// ==============================================================================
// Program: makeup.js
// Programmer: Ethan-da-Tech-Wizard
// Last Modified: November 19, 2026
// Purpose: Facial beauty salon and cosmetics simulation module.
//          Renders high-detail facial canvas features, manages alpha-blended cosmetic
//          layers (blush gradients, eye shadow shading, lip tints, winged eyeliner,
//          volumetric eyelashes, and cheekbone highlights), and persists cosmetic styles.
// FILE OVERVIEW
// makeup.js is the Makeup Studio station (#makeup-screen in index.html). The player sees a
// large front-facing face (the saved character's skin, hair, eye and outfit colours) and applies
// cosmetic layers: blush, eyeshadow, lipstick, eyeliner (with a wing), lashes, a highlight glow,
// custom shades, and freehand paint. "Done" stores a picture of the finished look in the closet.
//
// How it works: the face is NOT edited incrementally. All settings live as plain fields on the
// Makeup object (colours, opacities, on/off flags), and _drawFace() repaints the entire face from
// those fields every time any of them changes. That makes every change reversible and keeps the
// drawing code in one place; the cost is that freehand paint (drawn directly on the canvas) is
// erased by the next repaint.
//
// Who calls it: Game.goTo('makeup') calls Makeup.init(); the Done button calls Makeup.finish().
// It reads Game.state.character and Character.data, and uses Character._darken, Tools (freehand
// painting), ColorWheel, Icons, Sound and Game (addToCloset, addXP, save, checkLevelUp, goTo).
//
// Layout: the same three columns as the other stations: #makeup-tools (tool buttons),
// #makeup-canvas (the face) and #makeup-side (the options for the chosen tool). The panel builders
// (_buildBlushPanel etc.) all follow the pattern: heading, colour button, swatch grid, slider or
// toggle, using the shared helpers _makeColorBtn, _makeSwatchGrid and _makeSlider at the end.
//
// Known limits / things to watch:
//   - (Fixed) The 'Lips' tool asks Icons for 'lipstick'; icons.js now defines it (it used to show the fallback star).
//   - (Fixed) Choosing 'Paint' calls Tools.setup(), which used to swap the canvas for a blank clone (the face
//     disappeared until _drawFace() ran again); it now keeps the element, so the face stays.
//   - Opacity 0 means "not applied": the face shows natural blush and natural lips in that case.
// How to test: Game.goTo('makeup'); Makeup.lipOpacity = 1; Makeup._drawFace() in the console, then
// check that the lips turn crimson.
// ==============================================================================
/* ===== MAKEUP STUDIO WORKSTATION ===== */
// Singleton controller for the Makeup Studio.
const Makeup = {
  // Each cosmetic has a colour ("#rrggbb") and an opacity from 0 to 1 (set by its "Intensity" slider);
  // 0 means the cosmetic is not applied. Liner, lashes and highlight are simple on/off flags. The defaults
  // below are the first colours shown in each panel (pale pink blush, purple shadow, crimson lips, near-black liner).
  // Current makeup layer state parameters
  blushColor: '#FFB6C1',
  blushOpacity: 0,
  shadowColor: '#9370DB',
  shadowOpacity: 0,
  lipColor: '#DC143C',
  lipOpacity: 0,
  linerColor: '#1a1a2e',

  // Liner, lashes and glow are on/off toggles rather than amounts.
  linerOn: false,
  lashesOn: false,
  highlightOn: false,

  // Shades the player created in the Custom panel: "#rrggbb" strings, at most 12. Kept between visits (not reset in init()).
  // Custom makeup palette array
  customPalette: [],

  /**
   * Initializes Makeup Studio canvas dimensions, resets layers, and renders face portrait.
   */
  init() {
    // Looked up by id on each call (not cached) (cheap, and robust if the element is ever replaced).
    const c = document.getElementById('makeup-canvas');
    if (!c) return;
    const parent = c.parentElement;
    const rect = parent.getBoundingClientRect();

    // Size the canvas to the space left of the side panels: 70 px tool column + 220 px side panel = 290 px; max 700 x 500.
    // Setting the size also clears the canvas.
    c.width = Math.min(rect.width - 290, 700);
    c.height = Math.min(rect.height, 500);

    // Every visit starts with a clean face (no makeup), so a new look can be made; colours are kept so the player
    // sees their last-used shades again.
    // Reset makeup state
    this.blushOpacity = 0;
    this.shadowOpacity = 0;
    this.lipOpacity = 0;
    this.linerOn = false;
    this.lashesOn = false;
    this.highlightOn = false;

    // Build the tool buttons (which also builds the first side panel), then paint the face.
    this._buildTools();
    this._drawFace();
  },

  /* ===== TOOL PANEL ===== */
  // Creates one button per tool in #makeup-tools. Ids: blush, shadow, lipstick, liner, lashes, highlight, custom,
  // freehand and eraser (shown as "Reset"). The first starts selected.
  _buildTools() {
    const tools = document.getElementById('makeup-tools');
    if (!tools) return;

    // Clear the column first: init() runs on every visit and must not stack duplicate buttons.
    tools.innerHTML = '';

    // Each entry: id (used by _onToolChange), icon (a key in Icons.paths; 'lipstick' was added to fix the missing-icon bug) and
    // the label under the icon.
    const toolList = [
      { id: 'blush', icon: 'face', label: 'Blush' },
      { id: 'shadow', icon: 'palette', label: 'Shadow' },
      { id: 'lipstick', icon: 'lipstick', label: 'Lips' },
      { id: 'liner', icon: 'pen', label: 'Liner' },
      { id: 'lashes', icon: 'lashes', label: 'Lashes' },
      { id: 'highlight', icon: 'sparkles', label: 'Glow' },
      { id: 'custom', icon: 'wand', label: 'Custom' },
      { id: 'freehand', icon: 'brush', label: 'Paint' },
      { id: 'eraser', icon: 'eraser', label: 'Reset' },
    ];

    toolList.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn' + (i === 0 ? ' active' : '');
      btn.innerHTML = `${Icons.get(t.icon)}<span class="tool-label">${t.label}</span>`;

      // Put the label under the icon (the default .tool-btn layout is a single row).
      btn.style.flexDirection = 'column';
      btn.title = t.label;

      // Select this tool: move the highlight, click sound, and show its options.
      btn.onclick = () => {
        tools.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Sound.play('click');
        this._onToolChange(t.id);
      };
      tools.appendChild(btn);
    });

    // Start on the blush panel.
    this._onToolChange('blush');
  },

  // Rebuilds the options panel (#makeup-side) for the chosen tool.
  // @param {string} toolId - One of 'blush', 'shadow', 'lipstick', 'liner', 'lashes', 'highlight', 'custom', 'freehand', 'eraser'.
  _onToolChange(toolId) {
    const side = document.getElementById('makeup-side');
    if (!side) return;

    // Throw away the previous tool's panel; each tool builds its own.
    side.innerHTML = '';

    // One panel builder per tool id; 'eraser' has no panel of its own, it resets the state inline.
    switch(toolId) {
      case 'blush': this._buildBlushPanel(side); break;
      case 'shadow': this._buildShadowPanel(side); break;
      case 'lipstick': this._buildLipPanel(side); break;
      case 'liner': this._buildLinerPanel(side); break;
      case 'lashes': this._buildLashesPanel(side); break;
      case 'highlight': this._buildHighlightPanel(side); break;
      case 'custom': this._buildCustomPanel(side); break;
      case 'freehand': this._buildFreehandPanel(side); break;

      // "Reset": clears all makeup (opacities to 0 and flags off), repaints a bare face and tells the player. Colours stay.
      case 'eraser':
        this.blushOpacity = 0;
        this.shadowOpacity = 0;
        this.lipOpacity = 0;
        this.linerOn = false;
        this.lashesOn = false;
        this.highlightOn = false;
        this._drawFace();
        Sound.play('whoosh');
        const h4 = document.createElement('h4');
        h4.textContent = 'Makeup Removed!';
        side.appendChild(h4);
        const p = document.createElement('p');
        p.style.cssText = 'font-size:12px;color:var(--text-muted);';
        p.textContent = 'Start fresh with a clean face.';
        side.appendChild(p);
        break;
    }
  },

  /* ===== BLUSH PANEL ===== */
  // Blush options: colour button, ten quick colours (pinks, corals, peach, tan, rose) and an intensity slider (0-100).
  // The slider value is divided by 100 to get the 0-1 opacity the drawing code uses.
  // @param {HTMLElement} side - The #makeup-side element to fill.
  _buildBlushPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Blush';
    side.appendChild(h4);

    // Color picker
    // `colorBtn` is used inside its own callback (to update the button after a pick); this works because the callback only
    // runs later, after the constant has been assigned.
    const colorBtn = this._makeColorBtn(this.blushColor, hex => {
      this.blushColor = hex;
      colorBtn.style.background = hex;
      this._drawFace();
    });
    side.appendChild(colorBtn);

    // Quick swatches change the colour and repaint immediately; they do not touch the opacity, so a colour is only visible once the Intensity slider is above 0.
    // Quick colors
    const colors = ['#FFB6C1','#FF69B4','#FF1493','#E8967A','#F4A460','#DEB887','#CD5C5C','#FF7F7F','#FFA07A','#DB7093'];
    side.appendChild(this._makeSwatchGrid(colors, c => {
      this.blushColor = c; colorBtn.style.background = c; this._drawFace();
    }));

    // Intensity slider
    // The slider works in whole percent (0-100); the state stores a 0-1 fraction, so the value is multiplied by 100 going in and divided by 100 coming out.
    side.appendChild(this._makeSlider('Intensity', this.blushOpacity * 100, 0, 100, v => {
      this.blushOpacity = v / 100;
      this._drawFace();
    }));
  },

  /* ===== EYESHADOW PANEL ===== */
  // Eyeshadow options: colour button, 12 quick colours (purples, pink, gold, blue, green, red, orange, grey, tan, black)
  // and an intensity slider.
  // @param {HTMLElement} side - The #makeup-side element to fill.
  _buildShadowPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Eyeshadow';
    side.appendChild(h4);

    const colorBtn = this._makeColorBtn(this.shadowColor, hex => {
      this.shadowColor = hex;
      colorBtn.style.background = hex;
      this._drawFace();
    });
    side.appendChild(colorBtn);

    const colors = ['#9370DB','#8A2BE2','#FF69B4','#FFD700','#1E90FF','#2E8B57','#DC143C','#FF4500','#4B0082','#708090','#CD853F','#000000'];
    side.appendChild(this._makeSwatchGrid(colors, c => {
      this.shadowColor = c; colorBtn.style.background = c; this._drawFace();
    }));

    side.appendChild(this._makeSlider('Intensity', this.shadowOpacity * 100, 0, 100, v => {
      this.shadowOpacity = v / 100;
      this._drawFace();
    }));
  },

  /* ===== LIPSTICK PANEL ===== */
  // Lipstick options: colour button, 12 quick colours (reds, pinks, nude) and an intensity slider.
  // @param {HTMLElement} side - The #makeup-side element to fill.
  _buildLipPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Lipstick';
    side.appendChild(h4);

    const colorBtn = this._makeColorBtn(this.lipColor, hex => {
      this.lipColor = hex;
      colorBtn.style.background = hex;
      this._drawFace();
    });
    side.appendChild(colorBtn);

    const colors = ['#DC143C','#FF1493','#FF69B4','#B22222','#8B0000','#CD5C5C','#FF6347','#FF4500','#C71585','#DB7093','#FFB6C1','#A0522D'];
    side.appendChild(this._makeSwatchGrid(colors, c => {
      this.lipColor = c; colorBtn.style.background = c; this._drawFace();
    }));

    side.appendChild(this._makeSlider('Intensity', this.lipOpacity * 100, 0, 100, v => {
      this.lipOpacity = v / 100;
      this._drawFace();
    }));
  },

  /* ===== LINER PANEL ===== */
  // Eyeliner options: colour, seven dark quick colours and an on/off toggle button. The toggle re-labels itself
  // ("Apply Liner" / "✓ Liner ON") and changes style (ghost vs primary button) to show its state.
  // @param {HTMLElement} side - The #makeup-side element to fill.
  _buildLinerPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Eyeliner';
    side.appendChild(h4);

    const colorBtn = this._makeColorBtn(this.linerColor, hex => {
      this.linerColor = hex;
      colorBtn.style.background = hex;
      this._drawFace();
    });
    side.appendChild(colorBtn);

    const colors = ['#1a1a2e','#000000','#3d2b1f','#4B0082','#191970','#2F4F4F','#800000'];
    side.appendChild(this._makeSwatchGrid(colors, c => {
      this.linerColor = c; colorBtn.style.background = c; this._drawFace();
    }));

    // Toggle button: its class (btn-primary vs btn-ghost) and text are set from the current state when the panel is built and updated again on every click, so the panel always shows the true state.
    // Toggle
    const toggle = document.createElement('button');
    toggle.className = 'btn ' + (this.linerOn ? 'btn-primary' : 'btn-ghost');
    toggle.style.cssText = 'width:100%;margin-top:12px;';
    toggle.textContent = this.linerOn ? '✓ Liner ON' : 'Apply Liner';
    toggle.onclick = () => {
      this.linerOn = !this.linerOn;
      toggle.className = 'btn ' + (this.linerOn ? 'btn-primary' : 'btn-ghost');
      toggle.textContent = this.linerOn ? '✓ Liner ON' : 'Apply Liner';
      Sound.play('click');
      this._drawFace();
    };
    side.appendChild(toggle);
  },

  /* ===== LASHES PANEL ===== */
  // Lashes: only an on/off toggle (the lash colour is fixed).
  // @param {HTMLElement} side - The #makeup-side element to fill.
  _buildLashesPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Lashes';
    side.appendChild(h4);

    const p = document.createElement('p');

    // Short muted explanation text under the heading.
    p.style.cssText = 'font-size:12px;color:var(--text-muted);margin-bottom:12px;';
    p.textContent = 'Add beautiful lashes to your look!';
    side.appendChild(p);

    const toggle = document.createElement('button');
    toggle.className = 'btn ' + (this.lashesOn ? 'btn-primary' : 'btn-ghost');
    toggle.style.cssText = 'width:100%;';
    toggle.textContent = this.lashesOn ? '✓ Lashes ON' : 'Apply Lashes';
    toggle.onclick = () => {
      this.lashesOn = !this.lashesOn;
      toggle.className = 'btn ' + (this.lashesOn ? 'btn-primary' : 'btn-ghost');
      toggle.textContent = this.lashesOn ? '✓ Lashes ON' : 'Apply Lashes';
      Sound.play('click');
      this._drawFace();
    };
    side.appendChild(toggle);
  },

  /* ===== HIGHLIGHT/GLOW PANEL ===== */
  // Highlight & glow: on/off toggle for a soft light on the brow, cheeks and nose bridge.
  // @param {HTMLElement} side - The #makeup-side element to fill.
  _buildHighlightPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Highlight & Glow';
    side.appendChild(h4);

    const p = document.createElement('p');
    p.style.cssText = 'font-size:12px;color:var(--text-muted);margin-bottom:12px;';
    p.textContent = 'Add a beautiful glow to cheeks, nose, and brow!';
    side.appendChild(p);

    const toggle = document.createElement('button');
    toggle.className = 'btn ' + (this.highlightOn ? 'btn-primary' : 'btn-ghost');
    toggle.style.cssText = 'width:100%;';
    toggle.textContent = this.highlightOn ? '✓ Glow ON' : 'Apply Glow';
    toggle.onclick = () => {
      this.highlightOn = !this.highlightOn;
      toggle.className = 'btn ' + (this.highlightOn ? 'btn-primary' : 'btn-ghost');
      toggle.textContent = this.highlightOn ? '✓ Glow ON' : 'Apply Glow';
      Sound.play('sparkle');
      this._drawFace();
    };
    side.appendChild(toggle);
  },

  /* ===== CUSTOM MAKEUP PANEL ===== */
  // Custom shades: the player picks a colour with the wheel and presses "+ Create" to add it to a palette (up to 12).
  // Clicking a saved shade applies it to blush and eyeshadow together. This function rebuilds itself after adding a
  // shade so the new swatch appears.
  // @param {HTMLElement} side - The #makeup-side element to fill.
  _buildCustomPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Custom Makeup';
    side.appendChild(h4);

    const p = document.createElement('p');
    p.style.cssText = 'font-size:12px;color:var(--text-muted);margin-bottom:10px;';
    p.textContent = 'Mix your own colors! Tap "Create" to add a custom shade.';
    side.appendChild(p);

    // Color mixer
    // One row containing the colour swatch and the "+ Create" button.
    const mixerRow = document.createElement('div');
    mixerRow.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:10px;';

    const mixColor = document.createElement('div');
    mixColor.className = 'color-pick-btn';
    mixColor.style.background = '#FF69B4';

    // The colour waiting to be added; a local variable (not saved), starting at hot pink each time the panel opens.
    let currentMix = '#FF69B4';
    mixColor.onclick = () => {
      ColorWheel.setFromHex(currentMix);
      ColorWheel.open('custom makeup', hex => {
        currentMix = hex;
        mixColor.style.background = hex;
      });
    };
    mixerRow.appendChild(mixColor);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-accent';
    addBtn.textContent = '+ Create';
    addBtn.onclick = () => {
      // Cap at 12 shades so the palette stays small; further presses do nothing.
      if (this.customPalette.length < 12) {
        this.customPalette.push(currentMix);
        Sound.play('sparkle');
        this._buildCustomPanel(side);
      }
    };
    mixerRow.appendChild(addBtn);
    side.appendChild(mixerRow);

    // Custom palette display
    if (this.customPalette.length > 0) {
      const label = document.createElement('h4');
      label.textContent = 'Your Shades';
      label.style.marginTop = '8px';
      side.appendChild(label);

      const grid = document.createElement('div');
      grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;';
      this.customPalette.forEach((c, i) => {
        const sw = document.createElement('div');
        sw.className = 'cw-recent-swatch';
        sw.style.background = c;
        sw.style.cursor = 'pointer';

        // Tooltip. (In practice a click applies the shade to blush and eyeshadow; lipstick is not changed.)
        sw.title = 'Click to use as blush/shadow/lip';
        sw.onclick = () => {
          // Applies the shade to blush and shadow and makes sure each is at least visible (opacity at least 0.4 / 0.35), so the
          // effect is seen immediately. (The code comment says "lowest opacity", but the code applies the shade to both layers.)
          // Apply to whichever has lowest opacity as a suggestion
          this.blushColor = c; this.blushOpacity = Math.max(this.blushOpacity, 0.4);
          this.shadowColor = c; this.shadowOpacity = Math.max(this.shadowOpacity, 0.35);
          this._drawFace();
          Sound.play('paint');
        };
        grid.appendChild(sw);
      });
      side.appendChild(grid);
    }
  },

  /* ===== FREEHAND PANEL ===== */
  // Freehand paint: draw on the face with the shared brush. This panel has a colour button, 10 quick colours and a size
  // slider (1-20); it ends by attaching Tools to the canvas, which keeps the face (Tools.setup no longer blanks the canvas).
  // @param {HTMLElement} side - The #makeup-side element to fill.
  _buildFreehandPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Freehand Paint';
    side.appendChild(h4);

    const colorBtn = document.createElement('div');
    colorBtn.className = 'color-pick-btn';
    colorBtn.style.background = Tools.currentColor;
    colorBtn.onclick = () => {
      Tools.openColorPicker(hex => { colorBtn.style.background = hex; });
    };
    side.appendChild(colorBtn);

    const quickColors = ['#FF69B4','#DC143C','#FFD700','#9370DB','#1E90FF','#2E8B57','#FF4500','#000000','#FFFFFF','#CD853F'];
    side.appendChild(this._makeSwatchGrid(quickColors, c => {
      Tools.setColor(c); colorBtn.style.background = c;
    }));

    side.appendChild(this._makeSlider('Size', Tools.brushSize, 1, 20, v => {
      Tools.brushSize = v;
    }));

    // Use the round brush with size 4 (a fine line) and attach the mouse handlers to the face canvas.
    Tools.currentTool = 'dye';
    Tools.brushSize = 4;
    Tools.setup('makeup-canvas');
  },

  /* ===== UI HELPERS ===== */
  // Creates a round colour swatch button that opens the shared colour wheel when clicked.
  // @param {string} color - Starting colour "#rrggbb".
  // @param {Function} onChange - Called with the new "#rrggbb" after the player confirms in the wheel.
  // @returns {HTMLElement} The button element (not yet added to the page).
  _makeColorBtn(color, onChange) {
    const btn = document.createElement('div');
    btn.className = 'color-pick-btn';
    btn.style.background = color;

    // Space below the button so the swatch grid that follows is not touching it.
    btn.style.margin = '0 0 8px 0';
    btn.onclick = () => {
      ColorWheel.setFromHex(color);
      ColorWheel.open('makeup', hex => {
        onChange(hex);
        btn.style.background = hex;
      });
    };
    return btn;
  },

  // Creates a wrapped row of small colour swatches; clicking one plays a click sound and calls onClick with its colour.
  // @param {string[]} colors - Colours "#rrggbb".
  // @param {Function} onClick - Called with the chosen colour.
  // @returns {HTMLElement} The container element.
  _makeSwatchGrid(colors, onClick) {
    const grid = document.createElement('div');
    grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin:6px 0;';
    colors.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'cw-recent-swatch';
      sw.style.background = c;
      sw.style.cursor = 'pointer';
      sw.onclick = () => { onClick(c); Sound.play('click'); };
      grid.appendChild(sw);
    });
    return grid;
  },

  // Creates a labelled range slider that calls onChange with the integer value on every move.
  // @param {string} label - Heading above the slider.
  // @param {number} value - Starting value.
  // @param {number} min - Smallest value.
  // @param {number} max - Largest value.
  // @param {Function} onChange - Called with an integer on each input event.
  // @returns {HTMLElement} The wrapper element.
  _makeSlider(label, value, min, max, onChange) {
    const wrap = document.createElement('div');

    // Separate each slider from the element above.
    wrap.style.marginTop = '10px';
    const h4 = document.createElement('h4');
    h4.textContent = label;
    wrap.appendChild(h4);
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.value = String(value);
    slider.style.cssText = 'width:100%;accent-color:var(--accent-pink);';

    // `oninput` fires continuously while dragging (unlike `onchange`, which fires on release), so the face updates live.
    slider.oninput = () => { onChange(parseInt(slider.value)); };
    wrap.appendChild(slider);
    return wrap;
  },

  /* ===== DRAW THE FACE ===== */
  // Repaints the entire face from the current settings, back to front: neck, shoulders, back hair, face, ears,
  // eyeshadow, eyes (with liner and lashes), eyebrows, blush, nose, lips, glow, front hair. Cosmetic layers are drawn
  // at partial opacity (globalAlpha) so skin shows through, and globalAlpha is restored to 1 after each layer.
  // Everything is positioned relative to the centre (cx, cy) with a face radius of 120 px.
  _drawFace() {
    const c = document.getElementById('makeup-canvas');
    if (!c) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;

    // Start from a transparent canvas: every layer is repainted each time.
    ctx.clearRect(0, 0, w, h);

    // Centre of the canvas, which is also the centre of the face.
    const cx = w/2, cy = h/2;

    // Face radius in pixels; every feature offset below was tuned against this size.
    const r = 120; // face radius

    // Use the saved character if there is one (otherwise the in-progress creator data) so the face matches the player's avatar.
    const charData = Game.state.character || Character.data;
    const skinColor = charData.skinTone || '#FDDBB4';
    const skinDark = Character._darken(skinColor, 12);
    const hairColor = charData.hairColor || '#3d2b1f';
    const eyeColor = charData.eyeColor || '#4a90d9';

    // Neck: a 40x60 rectangle behind the lower face; shoulders: an ellipse of the outfit's top colour.
    // Neck
    ctx.fillStyle = skinColor;

    // Neck: 40 px wide, starting 75% of the radius below the centre so the face circle overlaps its top.
    ctx.fillRect(cx - 20, cy + r*0.75, 40, 60);

    // Shoulders
    ctx.fillStyle = charData.outfit?.top || '#ff69b4';
    ctx.beginPath();

    // Shoulders: a 90x35 ellipse below the chin, in the outfit's top colour.
    ctx.ellipse(cx, cy + r + 55, 90, 35, 0, 0, Math.PI*2);
    ctx.fill();

    // Hair behind the face is a big ellipse a little larger than the head (1.15 x wide, 1.25 x tall), so a ring of hair
    // shows around the face.
    // Hair back (behind face)
    ctx.fillStyle = hairColor;
    ctx.beginPath();

    // Hair mass behind the face: slightly taller than wide, so hair shows above and at the sides.
    ctx.ellipse(cx, cy - 5, r*1.15, r*1.25, 0, 0, Math.PI*2);
    ctx.fill();

    // Face
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fill();

    // Ears reuse the skin fill still active from the face.
    // Ears
    ctx.beginPath();

    // Left and right ears at 94% of the radius, just inside the face edge, 5 px below the centre.
    ctx.ellipse(cx - r*0.94, cy + 5, 12, 16, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + r*0.94, cy + 5, 12, 16, 0, 0, Math.PI*2);
    ctx.fill();

    // Drawn before the eyes so the whites cover the middle. Two ellipses per side: a base in the shadow colour at
    // opacity x 0.55, and a smaller darker one (20 lightness points darker) above it at opacity x 0.3 for depth.
    // ===== MAKEUP: EYESHADOW =====
    if (this.shadowOpacity > 0) {
      ctx.fillStyle = this.shadowColor;

      // The shadow never reaches full strength (max 55%), so even at Intensity 100 the skin tone shows through, which looks more like real makeup.
      ctx.globalAlpha = this.shadowOpacity * 0.55;
      // Left eye shadow
      ctx.beginPath();

      // Shadow ellipse above the left eye (28x16, tilted -0.15 rad so it follows the brow); the right one is mirrored with +0.15.
      ctx.ellipse(cx - 32, cy - 15, 28, 16, -0.15, 0, Math.PI*2);
      ctx.fill();
      // Right eye shadow
      ctx.beginPath();
      ctx.ellipse(cx + 32, cy - 15, 28, 16, 0.15, 0, Math.PI*2);
      ctx.fill();

      // Gradient fade
      // A second, darker, smaller ellipse near the lash line adds a gradient-like depth.
      const shadowDark = Character._darken(this.shadowColor, 20);
      ctx.fillStyle = shadowDark;
      ctx.globalAlpha = this.shadowOpacity * 0.3;
      ctx.beginPath();
      ctx.ellipse(cx - 32, cy - 20, 22, 10, -0.1, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 32, cy - 20, 22, 10, 0.1, 0, Math.PI*2);
      ctx.fill();

      ctx.globalAlpha = 1;
    }

    // Eyes: for each side (dir -1 = left, +1 = right) draw the white, optional liner and lashes, iris, pupil and two
    // highlights. Eyes are 32 px either side of the centre.
    // ===== EYES =====
    // Eye line is just below the face centre; the eyes are 32 px either side.
    const eyeY = cy + 2;
    const eyeSpacing = 32;
    [-1, 1].forEach(dir => {
      const ex = cx + dir * eyeSpacing;

      // Whites
      ctx.fillStyle = '#fff';
      ctx.beginPath();

      // Sclera: a 16x14 ellipse (slightly wider than tall), with a faint outline.
      ctx.ellipse(ex, eyeY, 16, 14, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Eyeliner: an outline ellipse a pixel larger than the eye, plus a short "wing" line flicking up and outward
      // (the dir factor mirrors it).
      // Liner
      if (this.linerOn) {
        ctx.strokeStyle = this.linerColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, 17, 15, 0, 0, Math.PI*2);
        ctx.stroke();
        // Wing
        ctx.beginPath();
        ctx.moveTo(ex + dir*16, eyeY - 3);

        // The wing: from the outer corner (16 px out) flicking 7 px further out and 7 px up.
        ctx.lineTo(ex + dir*23, eyeY - 10);
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Lashes: five short strokes fanned across the top of each eye (angles from -0.3 pi to -0.9 pi, measured from the
      // eye centre; negative y is up on the canvas), each starting at the eye's edge and extending about 7 px outward.
      // Lashes
      if (this.lashesOn) {
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
          // Angle of lash i: five lashes spread evenly from -0.3 pi to -0.9 pi, which on a canvas (y down) is the upper half of the eye.
          const a = -Math.PI*0.3 + (i / 4) * Math.PI * 0.6 * -1;
          const lx = ex + Math.cos(a) * 17;
          const ly = eyeY + Math.sin(a) * 15;
          const lx2 = ex + Math.cos(a) * 24;
          const ly2 = eyeY + Math.sin(a) * 22;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx2, ly2);
          ctx.stroke();
        }
      }

      // Iris and pupil are nudged 1 px toward the outside (dir) so the gaze is offset slightly outward.
      // Iris
      ctx.fillStyle = eyeColor;
      ctx.beginPath();

      // Iris: a coloured disc of radius 10 inside the 14-16 px white.
      ctx.arc(ex + dir, eyeY, 10, 0, Math.PI*2);
      ctx.fill();

      // Pupil
      // Pupil: a dark disc of radius 5.
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(ex + dir, eyeY, 5, 0, Math.PI*2);
      ctx.fill();

      // Highlights
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();

      // Two highlights (a large and a small one, 85% and 50% white) make the eye look wet and alive.
      ctx.arc(ex - 3, eyeY - 4, 3.5, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(ex + 4, eyeY + 2, 2, 0, Math.PI*2);
      ctx.fill();
    });

    // Eyebrows are a darkened hair colour, one curve per brow.
    // Eyebrows
    ctx.strokeStyle = Character._darken(hairColor, 10);
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 50, eyeY - 22);
    ctx.quadraticCurveTo(cx - 32, eyeY - 30, cx - 14, eyeY - 22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 14, eyeY - 22);
    ctx.quadraticCurveTo(cx + 32, eyeY - 30, cx + 50, eyeY - 22);
    ctx.stroke();

    // Blush: when applied, ellipses on the cheeks at opacity x 0.45; otherwise a faint natural blush (15% pink) so the face
    // never looks flat.
    // ===== MAKEUP: BLUSH =====
    if (this.blushOpacity > 0) {
      // Blush is capped at 45% opacity so it stays soft, like the other layers.
      ctx.globalAlpha = this.blushOpacity * 0.45;
      ctx.fillStyle = this.blushColor;
      ctx.beginPath();
      ctx.ellipse(cx - 50, cy + 28, 22, 14, -0.15, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 50, cy + 28, 22, 14, 0.15, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      // Natural blush
      ctx.fillStyle = 'rgba(255,150,170,0.15)';
      ctx.beginPath(); ctx.ellipse(cx - 42, cy + 28, 14, 8, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 42, cy + 28, 14, 8, 0, 0, Math.PI*2); ctx.fill();
    }

    // Nose: a small darker-skin dot with a faint shine.
    // Nose
    ctx.fillStyle = skinDark;
    ctx.beginPath();

    // The nose is a dot 30 px below the centre; the shine is a smaller, 15% white dot just up and left of it.
    ctx.arc(cx, cy + 30, 5, 0, Math.PI*2);
    ctx.fill();
    // Nose shine
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(cx - 1, cy + 28, 2.5, 0, Math.PI*2);
    ctx.fill();

    // Lips: when lipstick is applied (opacity > 0) draw a larger upper and lower lip in the lip colour at
    // opacity x 0.7 + 0.3 (so even a low setting is clearly visible), plus a white shine; otherwise draw smaller
    // natural-coloured lips (#e8a0a0). Each lip is a closed shape of quadratic curves.
    // ===== MAKEUP: LIPS =====
    if (this.lipOpacity > 0) {
      ctx.fillStyle = this.lipColor;

      // Lip opacity runs from 30% (slider at its lowest non-zero value) to 100%, so any applied lipstick is clearly visible.
      ctx.globalAlpha = this.lipOpacity * 0.7 + 0.3;

      // Upper lip
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy + 48);
      ctx.quadraticCurveTo(cx - 10, cy + 42, cx, cy + 45);
      ctx.quadraticCurveTo(cx + 10, cy + 42, cx + 20, cy + 48);
      ctx.quadraticCurveTo(cx + 10, cy + 52, cx, cy + 50);
      ctx.quadraticCurveTo(cx - 10, cy + 52, cx - 20, cy + 48);
      ctx.closePath();
      ctx.fill();

      // Lower lip
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy + 50);
      ctx.quadraticCurveTo(cx, cy + 62, cx + 18, cy + 50);
      ctx.quadraticCurveTo(cx, cy + 55, cx - 18, cy + 50);
      ctx.closePath();
      ctx.fill();

      // Lip shine
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.globalAlpha = this.lipOpacity * 0.8;
      ctx.beginPath();
      ctx.ellipse(cx + 3, cy + 54, 6, 3, 0.2, 0, Math.PI*2);
      ctx.fill();

      ctx.globalAlpha = 1;
    } else {
      // Natural lips
      ctx.fillStyle = '#e8a0a0';
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy + 48);
      ctx.quadraticCurveTo(cx - 8, cy + 44, cx, cy + 46);
      ctx.quadraticCurveTo(cx + 8, cy + 44, cx + 16, cy + 48);
      ctx.quadraticCurveTo(cx + 8, cy + 51, cx, cy + 49);
      ctx.quadraticCurveTo(cx - 8, cy + 51, cx - 16, cy + 48);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();

      // Natural lower lip (the upper lip was drawn just above).
      ctx.moveTo(cx - 14, cy + 50);
      ctx.quadraticCurveTo(cx, cy + 58, cx + 14, cy + 50);
      ctx.quadraticCurveTo(cx, cy + 54, cx - 14, cy + 50);
      ctx.closePath();
      ctx.fill();
    }

    // Glow: three soft radial gradients in warm white (brow bone above the eyes, both cheeks, nose bridge), drawn at low
    // opacity so they brighten without hiding features.
    // ===== MAKEUP: HIGHLIGHT/GLOW =====
    if (this.highlightOn) {
      ctx.globalAlpha = 0.35;

      // Brow-bone glow: a radial gradient from warm white at the centre to fully transparent at 40 px, positioned 55% of the radius above the face centre (the forehead area).
      const grad = ctx.createRadialGradient(cx, cy - r*0.55, 0, cx, cy - r*0.55, 40);
      grad.addColorStop(0, 'rgba(255,255,240,0.8)');
      grad.addColorStop(1, 'rgba(255,255,240,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy - r*0.55, 40, 0, Math.PI*2);
      ctx.fill();

      // Cheek glow
      // Cheek glows: one per side, 50 px either side of the centre, 20 px radius.
      [-50, 50].forEach(dx => {
        const g2 = ctx.createRadialGradient(cx+dx, cy+22, 0, cx+dx, cy+22, 20);
        g2.addColorStop(0, 'rgba(255,255,240,0.6)');
        g2.addColorStop(1, 'rgba(255,255,240,0)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(cx+dx, cy+22, 20, 0, Math.PI*2);
        ctx.fill();
      });

      // Nose bridge highlight
      // Nose-bridge glow: a small 12 px gradient above the nose.
      const g3 = ctx.createRadialGradient(cx, cy+20, 0, cx, cy+20, 12);
      g3.addColorStop(0, 'rgba(255,255,240,0.5)');
      g3.addColorStop(1, 'rgba(255,255,240,0)');
      ctx.fillStyle = g3;
      ctx.beginPath();
      ctx.arc(cx, cy+20, 12, 0, Math.PI*2);
      ctx.fill();

      ctx.globalAlpha = 1;
    }

    // Front hair last, so it overlaps the forehead and eyebrows; a half ellipse plus a rectangle closing its lower edge,
    // then a faint strand line. (The makeup station always shows the same simple hair shape, regardless of hair style.)
    // ===== HAIR FRONT (bangs, sits on top) =====
    ctx.fillStyle = hairColor;
    ctx.beginPath();

    // Front hair cap: the upper half of an ellipse (angles pi to 0, counter-clockwise) across the forehead.
    ctx.ellipse(cx, cy - r*0.38, r*1.1, r*0.55, 0, Math.PI, 0, true);
    ctx.fill();
    ctx.beginPath();

    // A thin band along the bottom of the cap fills the gap between the half-ellipse and the hairline.
    ctx.rect(cx - r*1.1, cy - r*0.38, r*2.2, r*0.12);
    ctx.fill();

    // Hair detail
    ctx.strokeStyle = Character._darken(hairColor, 12);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy - r*0.05, r*0.9, 0.82*Math.PI, 0.18*Math.PI, true);
    ctx.stroke();
  },

  /* ===== FINISH ===== */
  // "Done": stores a picture of the look in the closet (type 'makeup'), awards 45 XP, saves, and leaves the station (the
  // level-up screen if a level was gained, otherwise the workshop).
  finish() {
    // Save makeup look to closet
    const c = document.getElementById('makeup-canvas');

    // Without a canvas there is no look to save. The XP below used to be awarded anyway; now the player gets the
    // error sound and stays on the screen (the same behaviour as Books.finish). With a canvas an item is ALWAYS
    // saved ("Natural Look" when no cosmetic is on), so a normal Done still pays 45 XP.
    if (!c) {
      Sound.play('error');
      return;
    }

    // From here an item definitely exists, so saving it and paying the XP always go together.
    {
      const imageData = c.toDataURL('image/png');

      // Build the item's name from the cosmetics used (for example "Blush + Lip Look"), or "Natural Look" if none.
      const lookName = [];

      // Collect the names of the cosmetics that are on, in a fixed order.
      if (this.blushOpacity > 0) lookName.push('Blush');
      if (this.shadowOpacity > 0) lookName.push('Shadow');
      if (this.lipOpacity > 0) lookName.push('Lip');
      if (this.linerOn) lookName.push('Liner');
      if (this.lashesOn) lookName.push('Lashes');
      if (this.highlightOn) lookName.push('Glow');

      Game.addToCloset({
        id: Date.now(),
        type: 'makeup',
        subtype: 'look',

        // Joined with " + " ("Blush + Lip Look") or "Natural Look" when nothing was applied.
        name: lookName.length > 0 ? lookName.join(' + ') + ' Look' : 'Natural Look',
        image: imageData,
        createdAt: Date.now(),
      });
    }

    Sound.play('complete');
    Game.addXP(45);
    Game.save();
    if (Game.checkLevelUp()) Game.goTo('levelup');
    else Game.goTo('workshop');
  }
};
