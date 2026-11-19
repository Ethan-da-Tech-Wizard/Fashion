// ==============================================================================
// Program: tools.js
// Programmer: Ethan-da-Tech-Wizard
// Last Modified: November 19, 2026
// Purpose: Interactive raster drawing tools, embellishment stamps, and fabric manipulation.
//          Implements continuous anti-aliased brush interpolation, spray paint particle
//          scatter, multi-colored diamond glitter dispersion, radial pearl illumination,
//          shear cut lines, destination-out eraser blends, and 4-connected flood fill.
// ==============================================================================
// FILE OVERVIEW
// tools.js is the shared "paint box" used by the design stations. When a station (Fashion
// Studio, Home Decor, Book Shop) puts a tool in the player's hand it sets Tools.currentTool and
// calls Tools.setup(canvasId); from then on mouse events on that canvas stamp or paint directly
// onto the canvas bitmap using the current colour and brush size.
//
// Supported tool ids (the `switch` statements below): 'dye' and 'brush' (round strokes),
// 'spray' (scattered dots), 'glitter' (sparkles), 'sticker' and 'badge' (emoji stamps), 'pearl',
// 'cut' (dashed cut line), 'stencil' (stamped shape from STENCIL_SETS), 'eraser' (makes pixels
// transparent) and 'fill' (flood fill).
//
// Who calls it: stations.js, decor.js and books.js (they read/write currentTool, currentColor,
// brushSize, currentSticker, currentBadge, currentStencil and call setup(), setColor(),
// openColorPicker()). It depends on U (colour maths), Sound (feedback), ColorWheel (colour picker)
// and STENCIL_SETS from utils.js. It never reads or writes Game state.
//
// Design decisions:
//   - setup() re-binds listeners on the SAME canvas element (it used to swap in a pixel-less clone and blank the art).
//   - Painting is destructive and raster-based: marks go straight into the canvas pixels with no
//     undo and no layer list. That keeps drawing instant but means a station that wants to
//     redraw its base shape (for example after changing fabric colour) also erases the marks.
//   - `_placedItems` records stamped emoji (type, position, size) so a station could redraw them,
//     but nothing in this file replays the list; it is bookkeeping only.
//   - Coordinates are converted from CSS pixels to canvas pixels (see _getPos) because the canvases
//     are scaled by CSS.
//
// Known limits: mouse events only (no touch or pen), no undo, the flood fill stops after 100,000
// pixels, and the 'stencil' tool always paints with the first stencil colour.
// How to test: open a station, pick a tool and paint; or in the console run
// Tools.currentTool = 'spray'; Tools.setup('decor-canvas') and drag on the canvas.

/* ===== DRAWING & EMBELLISHMENT TOOLS ===== */
// Singleton holding the current tool settings and painting state.
const Tools = {
  // Id of the active tool (see the list in the file overview) or null when none is chosen, in which
  // case clicks do nothing.
  currentTool: null,

  // Brush colour as "#rrggbb"; default is the game's signature pink.
  currentColor: '#ff69b4',

  // Brush radius in canvas pixels (drawing code uses it directly as a radius and doubles it for line
  // width); stations set it from a slider, usually between 2 and 30.
  brushSize: 8,

  // True between mouse-down and mouse-up on the canvas; mouse moves only paint while true.
  _painting: false,

  // Last pointer position in canvas pixels, so strokes can be drawn as lines between successive
  // mouse events and cut lines start where the previous one ended.
  _lastX: 0,
  _lastY: 0,

  // Record of every sticker/badge stamped (type, emoji, position, size). Cleared by clearPlaced().
  _placedItems: [], // Stickers, badges, pearls placed on active canvas

  // Reserved for glitter particles; not used by the current implementation (glitter is drawn
  // immediately and not stored).
  _glitterParticles: [],

  /**
   * Binds pointer event handlers to the target canvas, first unbinding any handlers a previous call attached.
   * The canvas element itself is never replaced, so its pixels (the drawing so far) survive every call.
   *
   * @param {string} canvasId - Target canvas HTML element id.
   */
  // Prepares one canvas for painting. Call it each time a station selects a tool.
  setup(canvasId) {
    // Look the canvas up by id; silently do nothing if the station's canvas is missing.
    const c = document.getElementById(canvasId);
    if (!c) return;

    // FIXED: this used to swap the canvas for c.cloneNode(true) to throw away old listeners, but cloneNode copies
    // the element and its attributes, not the bitmap, so every tool change blanked the drawing (observed: 42387
    // opaque pixels before and 0 after on the salon canvas). Instead the handlers are remembered on the element
    // (c._toolHandlers) and removed explicitly, which gives the same "exactly one set of listeners" guarantee
    // without touching the pixels. Side effect: the canvas element object is now stable, so cached references stay valid.
    if (c._toolHandlers) {
      for (const [type, fn] of Object.entries(c._toolHandlers)) c.removeEventListener(type, fn);
    }

    // The handlers are kept in one object so the next setup() call can remove precisely these functions
    // (removeEventListener needs the same function reference that was added). Mouse events only; the canvas is
    // passed along because the handlers need its size and position.
    const handlers = {
      mousedown: e => this._onDown(e, c),
      mousemove: e => this._onMove(e, c),

      // Releasing the button or leaving the canvas ends the stroke so painting does not continue "stuck"
      // when the pointer comes back.
      mouseup: () => { this._painting = false; },
      mouseleave: () => { this._painting = false; },
    };

    // Attach and remember them (see above for why they are stored on the element).
    for (const [type, fn] of Object.entries(handlers)) c.addEventListener(type, fn);
    c._toolHandlers = handlers;
  },

  /**
   * Converts client viewport cursor coordinates into canvas pixel space taking scaling into account.
   *
   * @param {MouseEvent} e - Pointer event.
   * @param {HTMLCanvasElement} c - Target canvas element.
   * @returns {{x: number, y: number}} Scaled coordinate pair.
   */
  _getPos(e, c) {
    // getBoundingClientRect is the canvas's displayed size and position on the page.
    const rect = c.getBoundingClientRect();
    return {
      // The canvas bitmap (c.width x c.height, e.g. 600x500) is usually displayed at a different CSS
      // size, so the mouse offset is multiplied by (bitmap size / displayed size). Without this, marks
      // would land away from the pointer whenever the canvas is scaled.
      x: (e.clientX - rect.left) * (c.width / rect.width),
      y: (e.clientY - rect.top) * (c.height / rect.height)
    };
  },

  /**
   * Pointer down handler: initiates active stroke and routes tool application.
   */
  // Mouse button pressed: start a stroke and apply the tool once at the click point.
  _onDown(e, c) {
    const pos = this._getPos(e, c);

    // From now on mouse moves count as part of a stroke.
    this._painting = true;

    // Remember the starting point for line drawing.
    this._lastX = pos.x;
    this._lastY = pos.y;
    const ctx = c.getContext('2d');

    // Dispatch on the active tool. A tool that has no case (or null) does nothing. 'dye' and 'brush'
    // behave identically. Each case plays its own sound effect; the eraser is silent because it fires
    // continuously while dragging.
    switch(this.currentTool) {
      case 'dye':
      case 'brush':
        this._drawBrush(ctx, pos.x, pos.y);
        Sound.play('paint');
        break;
      case 'spray':
        this._drawSpray(ctx, pos.x, pos.y);
        Sound.play('spray');
        break;
      case 'glitter':
        this._drawGlitter(ctx, pos.x, pos.y);
        Sound.play('sparkle');
        break;
      case 'sticker':
        this._placeSticker(ctx, pos.x, pos.y);
        Sound.play('place');
        break;
      case 'badge':
        this._placeBadge(ctx, pos.x, pos.y);
        Sound.play('place');
        break;
      case 'pearl':
        this._drawPearl(ctx, pos.x, pos.y);
        Sound.play('place');
        break;
      case 'cut':
        this._drawCut(ctx, pos.x, pos.y);
        Sound.play('snip');
        break;
      case 'stencil':
        this._drawStencil(ctx, pos.x, pos.y);
        Sound.play('spray');
        break;
      case 'eraser':
        this._erase(ctx, pos.x, pos.y);
        break;
      case 'fill':

        // Flood fill needs integer pixel coordinates because it indexes into the pixel array.
        this._floodFill(ctx, c, Math.round(pos.x), Math.round(pos.y), this.currentColor);
        Sound.play('paint');
        break;
    }
  },

  /**
   * Pointer move handler: interpolates stroke segments between previous and current positions.
   */
  // Mouse move: if the button is held, continue the stroke. Only some tools repeat while dragging;
  // stickers, badges, stencils and fill are stamps that apply once, on mouse-down.
  _onMove(e, c) {
    if (!this._painting) return;
    const pos = this._getPos(e, c);
    const ctx = c.getContext('2d');

    // Brush strokes are drawn as a line from the last point to the current one so fast movement
    // does not leave gaps between dots.
    switch(this.currentTool) {
      case 'dye':
      case 'brush':
        this._drawBrushLine(ctx, this._lastX, this._lastY, pos.x, pos.y);
        break;
      case 'spray':
        this._drawSpray(ctx, pos.x, pos.y);
        break;
      case 'glitter':
        this._drawGlitter(ctx, pos.x, pos.y);
        break;
      case 'cut':
        this._drawCut(ctx, pos.x, pos.y);
        break;
      case 'pearl':
        this._drawPearl(ctx, pos.x, pos.y);
        break;
      case 'eraser':
        this._erase(ctx, pos.x, pos.y);
        break;
    }

    // Always update the previous point, so the next segment starts where this one ended.
    this._lastX = pos.x;
    this._lastY = pos.y;
  },

  /* ===== BRUSH RENDERING ===== */
  // A single round dab, used for a click without movement.
  _drawBrush(ctx, x, y) {
    // Fill (not stroke) a full circle of radius brushSize.
    ctx.fillStyle = this.currentColor;
    ctx.beginPath();
    ctx.arc(x, y, this.brushSize, 0, Math.PI * 2);
    ctx.fill();
  },

  // A segment of a stroke. Line width is twice the radius so the stroke is as thick as the dab, and
  // round caps/joins keep a smooth, even width with no notches where segments meet.
  _drawBrushLine(ctx, x1, y1, x2, y2) {
    ctx.strokeStyle = this.currentColor;
    ctx.lineWidth = this.brushSize * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  },

  /* ===== SPRAY PAINT SCATTER ===== */
  // Spray can: scatters 30 tiny translucent dots at random positions within a circle of radius
  // 3 x brushSize around the pointer, so repeated passes build up density.
  _drawSpray(ctx, x, y) {
    const density = 30;
    const radius = this.brushSize * 3;
    ctx.fillStyle = this.currentColor;
    for (let i = 0; i < density; i++) {
      // Random point in the circle: random angle plus random distance. Because the distance is not
      // square-rooted, dots cluster toward the centre, which looks like real spray.
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;

      // Each dot is 0.5-2 px in radius with 10-40% opacity so overlapping dots blend softly.
      const size = Math.random() * 1.5 + 0.5;
      ctx.globalAlpha = Math.random() * 0.3 + 0.1;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Restore full opacity: globalAlpha is part of the context state and would otherwise affect every
    // later drawing on this canvas.
    ctx.globalAlpha = 1;
  },

  /* ===== GLITTER SPARKLE PARTICLES ===== */
  // Glitter: 15 sparkles within a circle of radius 2.5 x brushSize.
  _drawGlitter(ctx, x, y) {
    const count = 15;
    const radius = this.brushSize * 2.5;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      const size = Math.random() * 3 + 1;

      // Each sparkle's hue is the brush colour's hue shifted randomly by up to ±15 degrees (the +360 and
      // modulo keep it in 0-360), at full saturation and 50-80% lightness, so glitter shimmers around
      // the chosen colour instead of being a flat fill.
      const hue = (U.hexToHsl(this.currentColor)[0] + Math.random() * 30 - 15 + 360) % 360;
      ctx.fillStyle = U.hslToHex(hue, 100, 50 + Math.random() * 30);
      ctx.globalAlpha = Math.random() * 0.6 + 0.4;

      // Each sparkle is a four-pointed star: the polygon alternates long points (size) and short points
      // (0.4 x size), then rotated randomly (0 to pi) so no two look the same. save/restore keep the
      // translate and rotate from affecting the next sparkle.
      // Draw rotated four-pointed diamond sparkle polygon
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.random() * Math.PI);
      ctx.beginPath();
      for (let j = 0; j < 4; j++) {
        const a = j * Math.PI / 2;
        const r = (j % 2 === 0) ? size : size * 0.4;
        if (j === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },

  /* ===== STICKER EMBELLISHMENT ===== */
  // Emoji used by the sticker tool; stations change it when the player picks a sticker.
  currentSticker: '⭐',

  // Stamps the current sticker emoji centred on the click. The emoji is drawn as text at a font size of
  // 3 x brushSize px, so the brush-size slider also scales stickers.
  _placeSticker(ctx, x, y) {
    const size = this.brushSize * 3;
    ctx.font = `${size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.currentSticker, x, y);

    // Remember the placement (bookkeeping only; see the file overview).
    this._placedItems.push({ type: 'sticker', emoji: this.currentSticker, x, y, size });
  },

  /* ===== INSIGNIA BADGE EMBELLISHMENT ===== */
  // Emoji used by the badge tool; set from the badge picker in stations.js.
  currentBadge: '🏆',
  _placeBadge(ctx, x, y) {
    // Like a sticker but 4 x brushSize, so badges are larger.
    const size = this.brushSize * 4;
    ctx.font = `${size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.currentBadge, x, y);
    this._placedItems.push({ type: 'badge', emoji: this.currentBadge, x, y, size });
  },

  /* ===== PEARL SPHERE ILLUMINATION ===== */
  // Pearl: a small sphere (radius 0.6 x brushSize) lit from the upper left.
  _drawPearl(ctx, x, y) {
    const size = this.brushSize * 0.6;

    // The radial gradient starts at a point offset up and left (30% of the radius) for the highlight, runs
    // white then the brush colour then a darker tone of it (lightness x 0.6, applied by mapping over
    // the [h, s, l] triple and changing only index 2) toward the rim, which reads as a round, shiny bead.
    // Radial gradient simulating three-dimensional spherical lighting
    const grad = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, 0, x, y, size);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.3, this.currentColor);
    grad.addColorStop(1, U.hslToHex(...U.hexToHsl(this.currentColor).map((v, i) => i === 2 ? v * 0.6 : v)));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    // A small translucent white circle near the upper left adds the specular glint.
    // Specular highlight gleam
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(x - size * 0.25, y - size * 0.25, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  },

  /* ===== SHEAR CUT LINE ===== */
  // Cut: draws a white dashed line (4 px on, 4 px off) from the previous point to the current one, as
  // a visual "cut here" guide. It does not remove any pixels.
  _drawCut(ctx, x, y) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(this._lastX, this._lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Reset the dash pattern; line dash is part of the context state and would otherwise apply to later strokes.
    ctx.setLineDash([]);
  },

  /* ===== STENCIL SPRAY ===== */
  // Index into STENCIL_SETS (utils.js) of the shape to stamp.
  currentStencil: 0,

  // Four-colour palette for stencils. Only the first colour is used by _drawStencil at present
  // (the multi-colour effect described in level 9's unlock text is not implemented).
  stencilColors: ['#ff69b4', '#ffd700', '#3edbd5', '#b36bff'],
  _drawStencil(ctx, x, y) {
    // Guard against an index outside the list.
    if (STENCIL_SETS[this.currentStencil]) {
      const colors = this.stencilColors;
      const stencil = STENCIL_SETS[this.currentStencil];

      // Stamp the stencil at the click point with a size of 2 x brushSize, in the first stencil colour.
      ctx.fillStyle = colors[0] || this.currentColor;
      stencil.draw(ctx, x, y, this.brushSize * 2);
    }
  },

  /* ===== DESTINATION-OUT ERASER ===== */
  // Eraser: 'destination-out' compositing makes the pixels it covers transparent (instead of painting
  // over them), which reveals whatever is behind the canvas. It is switched back to 'source-over' so
  // later drawing behaves normally.
  _erase(ctx, x, y) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, this.brushSize * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  },

  /* ===== 4-CONNECTED FLOOD FILL ALGORITHM ===== */
  // Flood fill: replaces a connected area of similar colour with the fill colour, using an explicit stack
  // (depth-first) and a 'visited' set instead of recursion to avoid stack overflow.
  // Only up and down/left/right neighbours are followed (4-connected), so diagonal gaps stop the fill.
  _floodFill(ctx, canvas, startX, startY, fillColor) {
    const w = canvas.width, h = canvas.height;

    // Read the entire canvas as RGBA bytes (4 per pixel). The loop edits this array and one putImageData
    // at the end writes it back, which is much faster than changing pixels one by one on the canvas.
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const [fr, fg, fb] = U.hexToRgb(fillColor);

    // Byte index of the clicked pixel (row * width + column, times 4).
    const startIdx = (startY * w + startX) * 4;

    // Colour of the clicked pixel (red, green, blue, alpha): the colour to replace.
    const tr = data[startIdx], tg = data[startIdx + 1], tb = data[startIdx + 2], ta = data[startIdx + 3];

    // If the clicked area already has the fill colour (alpha is not compared), there is nothing to do,
    // and continuing would loop over the same area for no change.
    // Abort if start pixel already matches target fill color
    if (tr === fr && tg === fg && tb === fb) return;

    const stack = [[startX, startY]];

    // Pixels already changed, keyed by row * width + column.
    const visited = new Set();

    // Colour distance allowed per channel (0-255) for a pixel to count as "the same colour". 30 lets
    // the fill cross anti-aliased edges and gradients without leaking into very different colours.
    const tolerance = 30;

    // Does the pixel at byte index idx match the start colour within the tolerance on all four channels?
    const match = (idx) => {
      return Math.abs(data[idx] - tr) < tolerance &&
             Math.abs(data[idx + 1] - tg) < tolerance &&
             Math.abs(data[idx + 2] - tb) < tolerance &&
             Math.abs(data[idx + 3] - ta) < tolerance;
    };

    // Safety valve: stop after 100,000 changed pixels (a third of a 600x500 canvas), so a huge empty
    // area fills only partly rather than freezing the page.
    let count = 0;
    while (stack.length > 0 && count < 100000) {
      const [x, y] = stack.pop();

      // Convert (x, y) to a single index; used both for the visited set and the byte offset.
      const key = y * w + x;

      // Skip pixels we already handled (the stack can contain duplicates).
      if (visited.has(key)) continue;

      // Skip coordinates outside the canvas (neighbours of edge pixels).
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      const idx = key * 4;

      // Stop spreading at pixels that are not the same colour: they form the boundary of the region.
      if (!match(idx)) continue;
      visited.add(key);

      // Paint this pixel, fully opaque.
      data[idx] = fr;
      data[idx + 1] = fg;
      data[idx + 2] = fb;
      data[idx + 3] = 255;

      // Queue the four neighbours (right, left, below, above).
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      count++;
    }

    // Write the modified pixel data back to the canvas.
    ctx.putImageData(imageData, 0, 0);
  },

  /* ===== TOOL STATE UTILITIES ===== */
  // Forget stamped stickers/badges (stations call it when starting a new design).
  clearPlaced() {
    this._placedItems = [];
  },

  // Set the brush colour.
  setColor(hex) {
    this.currentColor = hex;
  },

  // Opens the shared colour wheel pre-loaded with the current brush colour; the chosen colour becomes
  // the brush colour and then the optional callback runs (stations use it to update their colour button).
  openColorPicker(callback) {
    ColorWheel.setFromHex(this.currentColor);
    ColorWheel.open('tool color', hex => {
      this.currentColor = hex;
      if (callback) callback(hex);
    });
  }
};
