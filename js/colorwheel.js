// ==============================================================================
// Program: colorwheel.js
// Programmer: Ethan-da-Tech-Wizard
// Last Modified: November 19, 2026
// Purpose: Interactive polar HSL color wheel and cartesian saturation/lightness canvas.
//          Renders continuous 360-degree circular hue spectra and bi-directional
//          saturation-lightness gradients via direct ImageData byte buffer manipulation,
//          converting mouse coordinate trigonometry into validated hexadecimal swatches.
// ==============================================================================
// FILE OVERVIEW
// colorwheel.js is the single shared colour picker dialog (#colorwheel-modal in index.html).
// Every part of the game that lets the player choose a colour (skin, hair and eyes in the
// character creator; fabric, dye, tinsel, makeup, device and cover colours in the stations;
// the tool brush colour) calls ColorWheel.open(label, callback) and receives the chosen
// "#rrggbb" string through the callback when the player presses "Select Color".
//
// Picker model: a hue RING on the outside and a saturation/lightness SQUARE (clipped to a
// circle) inside it. The ring picks hue (0-360 degrees); the inner area picks saturation (x
// axis, left = 0 to right = 100) and lightness (y axis, top = 100 to bottom = 0) for the
// current hue. It is HSL, not HSV, so the "Brightness" slider in the HTML is HSL lightness.
// Two sliders and a hex field offer the same values as text.
//
// Who calls it: Game.init() calls ColorWheel.init(); the module-level callers listed above
// call setFromHex() then open(); the HTML calls update(), fromHex(), confirm(), close()
// through inline handlers. It depends on U (colour maths, clamp), Sound and the preset
// tables SKIN_PRESETS / HAIR_COLOR_PRESETS from utils.js.
//
// Design decisions:
//   - The `target` string passed to open() is only a label for the dialog title and for
//     choosing which preset swatches to show; the callback is what actually applies the
//     colour. Only the targets 'skin', 'hair' and 'eyes' also paint the matching swatch
//     button in the character creator directly (see _updatePreview).
//   - The inner gradient is drawn pixel by pixel into an ImageData buffer for exactness
//     (a canvas gradient cannot express "saturation x lightness" in one fill).
//   - Only one dialog exists, so its state (hue, sat, light, callback) is shared; opening it
//     from another place overwrites the previous caller's callback.
//
// Known limits: the pixel loop touches 280x280 = 78,400 pixels on every redraw (and a drag
// redraws on every mousemove), so it is the most expensive routine in this file. Only mouse
// events are handled; there is no touch support or keyboard control. The recent-colour list
// (max 12) is kept in memory only and is empty until the first confirm.
// How to test: ColorWheel.setFromHex('#ff0000'); ColorWheel.getHex() should give '#ff0000'
// (rounding may move other colours by a unit).

/* ===== COLOR WHEEL CONTROLLER ===== */
// Singleton controller object.
const ColorWheel = {
  // The 280x280 <canvas id="cw-canvas"> and its 2D context, assigned in init().
  canvas: null,
  ctx: null,

  // Current colour in HSL. Defaults (hue 330, sat 100, light 50) are a vivid pink, matching the
  // #FF69B4 default in the hex field of index.html. hue is degrees 0-360 (a float while
  // dragging), sat and light are 0-100.
  hue: 330,
  sat: 100,
  light: 50,

  // Function to call with the "#rrggbb" result when the user confirms; set by open(). May be
  // undefined if open() was called without one.
  callback: null,

  // Free-text label of what is being coloured (shown in the dialog title).
  target: null,

  // Most recent confirmed colours, newest first, capped at 12 in confirm(). Not saved.
  recentColors: [],

  // True while the left mouse button is held on the canvas so moves keep picking (drag).
  _dragging: false,

  /**
   * Binds mouse interaction events and draws initial color wheel canvas geometry.
   */
  init() {
    // Called once at startup. Mouse listeners go on the canvas; releasing the button or leaving
    // the canvas ends a drag, so a drag cannot get "stuck" if the pointer exits the circle.
    this.canvas = document.getElementById('cw-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.addEventListener('mousedown', e => this._onDown(e));
    this.canvas.addEventListener('mousemove', e => this._onMove(e));
    this.canvas.addEventListener('mouseup', () => this._dragging = false);
    this.canvas.addEventListener('mouseleave', () => this._dragging = false);

    // Paint the first frame so the wheel is visible the first time the dialog opens.
    this._drawWheel();
  },

  /**
   * Opens color wheel modal dialog configured for a specific target cosmetic feature.
   *
   * @param {string} target - Cosmetic feature identifier ('skin', 'hair', 'eyes', 'fabric').
   * @param {Function} [callback] - Invoked with selected 7-character hex code upon confirmation.
   */
  open(target, callback) {
    // Remember who asked and what to do with the answer.
    this.target = target;
    this.callback = callback;

    // The label is appended to the title so the player knows what they are colouring.
    document.getElementById('cw-title').textContent = 'Pick a Color — ' + target;

    // Showing the modal is only a class toggle; style.css makes .modal.active display:flex.
    document.getElementById('colorwheel-modal').classList.add('active');

    // Swap the preset swatches to suit the target (skin tones for skin, etc.).
    this._loadPresets(target);

    // Redraw because the current colour may have been changed by setFromHex() just before open().
    this._drawWheel();
    this._updatePreview();
  },

  /**
   * Closes the color wheel modal dialog.
   */
  close() {
    // Hide the modal. Does not call the callback, so closing with the X button discards the choice.
    document.getElementById('colorwheel-modal').classList.remove('active');
  },

  /**
   * Confirms color selection, adds swatch to recent history, and fires callback.
   */
  confirm() {
    // The final colour, as hex, computed from the current hue/sat/light.
    const hex = this.getHex();

    // Keep a "recent colours" row, without duplicates, newest first, at most 12 swatches (the
    // oldest is dropped with pop()).
    if (!this.recentColors.includes(hex)) {
      this.recentColors.unshift(hex);
      if (this.recentColors.length > 12) this.recentColors.pop();
    }

    // Refresh the visible recent-colour swatches so the new colour appears next time.
    this._renderRecent();

    // Deliver the result to whoever opened the dialog; the callback is what actually applies the
    // colour (e.g. Character stores it in its data and redraws).
    if (this.callback) this.callback(hex);
    Sound.play('select');
    this.close();
  },

  /**
   * Converts current active HSL parameters to a hexadecimal color string.
   */
  getHex() {
    // HSL -> "#rrggbb"; sat and light may be fractions (set while dragging), which U.hslToRgb rounds.
    return U.hslToHex(this.hue, this.sat, this.light);
  },

  /**
   * Returns current active HSL parameters as a dictionary object.
   */
  getHSL() {
    return { h: this.hue, s: this.sat, l: this.light };
  },

  /**
   * Re-reads brightness and saturation slider inputs, redrawing wheel canvas and swatch preview.
   */
  update() {
    // Slider values arrive as strings; parseInt turns them into numbers. The sliders control
    // lightness and saturation only; hue comes from the ring.
    this.light = parseInt(document.getElementById('cw-brightness').value);
    this.sat = parseInt(document.getElementById('cw-saturation').value);

    // Both redraws are needed: the ring is drawn using the current sat/light, so it changes
    // colour as the sliders move, and the inner square depends on the hue.
    this._drawWheel();
    this._updatePreview();
  },

  /**
   * Parses manual text input from hex code text field.
   */
  fromHex() {
    // Called on every keystroke in the hex field. Typing is only applied when the text is a complete
    // "#rrggbb" value (leading '#' required here), so partial input like "#ff6" is ignored without
    // error and the wheel does not jump around while the player is still typing.
    const hex = document.getElementById('cw-hex').value;
    if (/^#[0-9a-f]{6}$/i.test(hex)) {
      // Convert to HSL so the wheel and sliders can show it.
      const [h, s, l] = U.hexToHsl(hex);
      this.hue = h;
      this.sat = s;
      this.light = l;

      // Push the converted values back into the sliders so they stay in step with the wheel.
      document.getElementById('cw-brightness').value = l;
      document.getElementById('cw-saturation').value = s;
      this._drawWheel();
      this._updatePreview();
    }
  },

  /**
   * Explicitly sets color state from a known hexadecimal code string.
   */
  setFromHex(hex) {
    // Same as fromHex but for a value that is already known to be valid (swatches and the
    // callers' current colours), so there is no regex check. Callers set the current colour first
    // so the dialog opens on the existing colour instead of the last one picked.
    const [h, s, l] = U.hexToHsl(hex);
    this.hue = h;
    this.sat = s;
    this.light = l;
    document.getElementById('cw-brightness').value = l;
    document.getElementById('cw-saturation').value = s;
    this._drawWheel();
    this._updatePreview();
  },

  /**
   * Procedurally renders the polar hue ring and interior saturation/lightness gradient box.
   */
  _drawWheel() {
    const c = this.canvas, ctx = this.ctx;

    // Centre of the square canvas (140, 140 for the 280x280 canvas).
    const cx = c.width / 2, cy = c.height / 2;

    // The ring's outer radius is 4 px inside the canvas edge so the stroke is not clipped; the ring is
    // 36 px thick (innerR = outerR - 36).
    const outerR = cx - 4, innerR = outerR - 36;

    // Clear first: later steps draw over each other, and leftovers from the previous colour would show.
    ctx.clearRect(0, 0, c.width, c.height);

    // Step 1: the hue ring. It is built from 360 thin wedges (one per degree), each filled with the
    // colour for that hue at the current saturation and lightness. Each wedge spans a-1 to a+1
    // degrees, i.e. it overlaps its neighbours by one degree, which hides hairline gaps that
    // anti-aliasing would otherwise leave between wedges. The path goes round the outside edge
    // forward and back along the inside edge (the `true` makes the second arc counter-clockwise).
    // 1. Draw 360-degree continuous polar hue ring
    for (let a = 0; a < 360; a += 1) {
      const startA = (a - 1) * Math.PI / 180;
      const endA = (a + 1) * Math.PI / 180;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startA, endA);
      ctx.arc(cx, cy, innerR, endA, startA, true);
      ctx.closePath();
      ctx.fillStyle = `hsl(${a}, ${this.sat}%, ${this.light}%)`;
      ctx.fill();
    }

    // 2. Draw circular hue needle indicator along the ring track
    // Step 2: the hue marker. Canvas angles start at 3 o'clock and increase clockwise, which
    // matches the atan2 used in _pick, so the same angle formula works in both directions.
    const indA = this.hue * Math.PI / 180;

    // The marker sits halfway across the ring's thickness.
    const indR = (outerR + innerR) / 2;
    const indX = cx + Math.cos(indA) * indR;
    const indY = cy + Math.sin(indA) * indR;
    ctx.beginPath();
    ctx.arc(indX, indY, 10, 0, Math.PI * 2);

    // Filled with the full current colour so it doubles as a mini preview, with a white outline so
    // it stays visible on any hue.
    ctx.fillStyle = this.getHex();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Step 3: the saturation/lightness field, drawn pixel by pixel. gradR leaves a 10 px margin
    // inside the ring so the field never touches it. putImageData REPLACES the pixels it
    // covers (it does not blend), so it overwrites the whole canvas, including the ring just drawn;
    // that is why step 4 draws the ring and marker again.
    // 3. Draw central saturation/brightness gradient box via direct pixel manipulation
    const gradR = innerR - 10;

    // A blank RGBA buffer the size of the canvas: 4 bytes per pixel (red, green, blue, alpha), all zero
    // (transparent) until filled in.
    const imgData = ctx.createImageData(c.width, c.height);
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const dx = x - cx, dy = y - cy;

        // Distance from the centre; only pixels inside the circle of radius gradR are coloured, which
        // makes the field round.
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < gradR) {
          // Saturation grows from 0 at the left edge of the field's bounding square to 100 at the right.
          const s = ((x - (cx - gradR)) / (gradR * 2)) * 100;

          // Lightness runs from 100 at the top to 0 at the bottom (100 minus the vertical fraction), because
          // canvas y grows downward but lightness should increase upward.
          const l = 100 - ((y - (cy - gradR)) / (gradR * 2)) * 100;

          // Clamp: pixels near the circle edge map to values just outside 0-100 because the circle is inside
          // the square; clamping keeps hslToRgb in range.
          const [r, g, b] = U.hslToRgb(this.hue, U.clamp(s, 0, 100), U.clamp(l, 0, 100));

          // Index of this pixel's red byte: row * width + column, times 4 bytes per pixel.
          const idx = (y * c.width + x) * 4;
          imgData.data[idx] = r;
          imgData.data[idx + 1] = g;
          imgData.data[idx + 2] = b;

          // Alpha 255 = fully opaque.
          imgData.data[idx + 3] = 255;
        }
      }
    }

    // Copy the buffer to the canvas at the top-left corner.
    ctx.putImageData(imgData, 0, 0);

    // Step 4: redraw the ring and marker on top, because putImageData wiped them. This is the
    // same code as steps 1 and 2 (kept as a duplicate rather than a helper in this version).
    // 4. Re-stroke outer ring and indicator to maintain clean anti-aliased edges over ImageData
    for (let a = 0; a < 360; a += 1) {
      const startA = (a - 1) * Math.PI / 180;
      const endA = (a + 1) * Math.PI / 180;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startA, endA);
      ctx.arc(cx, cy, innerR, endA, startA, true);
      ctx.closePath();
      ctx.fillStyle = `hsl(${a}, ${this.sat}%, ${this.light}%)`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(indX, indY, 10, 0, Math.PI * 2);
    ctx.fillStyle = this.getHex();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
  },

  _onDown(e) {
    // Start a drag and pick immediately so a simple click also selects.
    this._dragging = true;
    this._pick(e);
  },

  _onMove(e) {
    // Only pick while the button is held; otherwise moving over the canvas would change the colour.
    if (this._dragging) this._pick(e);
  },

  /**
   * Resolves mouse coordinate into polar angle (hue) or central cartesian coordinate (sat/light).
   */
  _pick(e) {
    // Convert from page coordinates to canvas coordinates by subtracting the element's on-screen
    // position. This assumes the canvas is displayed at its pixel size (280x280); if CSS scaled it,
    // the result would be off by the scale factor.
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Same geometry constants as _drawWheel; they must stay in sync with it or clicks will not
    // match what is drawn.
    const outerR = cx - 4, innerR = outerR - 36;
    const gradR = innerR - 10;

    // Click on the ring: hue is the angle of the pointer around the centre. atan2 returns radians in
    // (-pi, pi], so multiply by 180/pi to get degrees and add 360 then modulo 360 to map negative angles into
    // 0-360.
    if (dist >= innerR && dist <= outerR) {
      // Pick hue from circular polar ring using arctangent trigonometry
      this.hue = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
      this._drawWheel();
      this._updatePreview();

    // Click inside the field: map the position to saturation (x) and lightness (y), the inverse of the
    // formulas in _drawWheel. The slider values are rounded so they show whole numbers. The wheel is
    // not redrawn here (only the preview), so the ring colours update the next time something calls
    // _drawWheel (a hue pick or a slider move).
    } else if (dist < gradR) {
      // Pick saturation and lightness from central square projection
      this.sat = U.clamp(((x - (cx - gradR)) / (gradR * 2)) * 100, 0, 100);
      this.light = U.clamp(100 - ((y - (cy - gradR)) / (gradR * 2)) * 100, 0, 100);
      document.getElementById('cw-brightness').value = Math.round(this.light);
      document.getElementById('cw-saturation').value = Math.round(this.sat);
      this._updatePreview();
    }
  },

  /**
   * Updates preview swatch container and target UI button with currently active color.
   */
  _updatePreview() {
    // Show the current colour in the preview chip and the hex text field. Writing into #cw-hex does not fire
    // its oninput, so there is no feedback loop with fromHex().
    const hex = this.getHex();
    document.getElementById('cw-preview').style.background = hex;
    document.getElementById('cw-hex').value = hex;
    
    // Also paint the character creator's swatch button live while the dialog is open, for the three
    // targets that have one. The callback sets it again on confirm. (Note: closing with X after
    // browsing leaves the swatch showing the browsed colour even though the character data kept
    // the old one.)
    // Update active color picker button that initiated the dialog
    if (this.target === 'skin') {
      const el = document.getElementById('skin-color-pick');
      if (el) el.style.background = hex;
    } else if (this.target === 'hair') {
      const el = document.getElementById('hair-color-pick');
      if (el) el.style.background = hex;
    } else if (this.target === 'eyes') {
      const el = document.getElementById('eye-color-pick');
      if (el) el.style.background = hex;
    }
  },

  /**
   * Renders the recent colors swatch palette.
   */
  _renderRecent() {
    const cont = document.getElementById('cw-recent');

    // Defensive: the row exists in index.html, but this keeps the function safe if the markup changes.
    if (!cont) return;
    cont.innerHTML = '';
    this.recentColors.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'cw-recent-swatch';
      sw.style.background = c;

      // Clicking a swatch loads it into the wheel but does not confirm; the player still presses Select Color.
      sw.onclick = () => { this.setFromHex(c); };
      cont.appendChild(sw);
    });
  },

  /**
   * Loads preset palette swatches tailored to the active customization target.
   */
  _loadPresets(target) {
    const cont = document.getElementById('cw-presets');
    if (!cont) return;
    cont.innerHTML = '';

    // Presets depend on the target: skin tones for 'skin', natural and fantasy hair colours for 'hair', and
    // a general 12-colour palette (pinks, brights, black and white) for everything else.
    let presets = [];
    if (target === 'skin') presets = SKIN_PRESETS;
    else if (target === 'hair') presets = HAIR_COLOR_PRESETS;
    else presets = ['#FF69B4','#FF6347','#FFD700','#32CD32','#1E90FF','#9370DB','#FF1493','#00CED1','#FFA500','#8B0000','#000000','#FFFFFF'];

    presets.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'cw-recent-swatch';
      sw.style.background = c;
      sw.onclick = () => { this.setFromHex(c); };
      cont.appendChild(sw);
    });
  }
};
