// ==============================================================================
// Program: stations.js
// Programmer: Ethan-da-Tech-Wizard
// Last Modified: November 19, 2026
// Purpose: Interactive multi-step Fashion Studio wizard and Closet wardrobe manager.
//          Orchestrates step progression (Garment Type selection, Fabric texture pattern
//          generation, Shears cutting contours, Embellishment toolbars, and Final preview),
//          exporting composite canvas data URLs to persistent player wardrobe inventory.
// ==============================================================================
// FILE OVERVIEW
// stations.js contains two objects:
//   Stations - the Fashion Studio, a five-step wizard (type -> fabric -> cut -> decorate ->
//              preview) that produces a clothing item and stores it in the closet.
//   Closet   - the wardrobe screen that lists everything the player has made (all stations).
//
// Screen/markup: #studio-screen in index.html (tool column #studio-tools, canvas
// #studio-canvas, info column #studio-side, step indicator #studio-steps, footer buttons
// #studio-prev / #studio-next). Each step rewrites #studio-tools and #studio-side with new
// buttons, so the markup is only a skeleton.
//
// Who calls it: Game.goTo('studio') calls Stations.init(0); the footer buttons call
// Stations.prevStep()/nextStep(); Game.goTo('closet') calls Closet.render(); the closet tab
// buttons call Closet.filterTab(). It calls Tools (painting), ColorWheel (fabric colour),
// Icons (button art), Sound, Game.addToCloset/addXP/checkLevelUp/goTo, and the tables in
// utils.js (GARMENT_TYPES, FABRIC_PATTERNS, STICKER_SETS, BADGE_SETS).
//
// State kept on Stations: currentStep (index into `steps`), garmentType (id or null),
// fabricPattern (id), fabricColor ("#rrggbb"). The step list order must match the
// five .step spans in index.html.
//
// Saved item shape (pushed to Game.state.closet): { id, type:'clothes', subtype: garment id,
// name, image: PNG data URL of the canvas, fabricColor, fabricPattern, createdAt }. The other
// stations push similar objects with their own `type` ('hair', 'makeup', 'tech', 'decor', 'books').
//
// Known limits / things to watch:
//   - Tools.setup() replaces the canvas element with a clone, and a cloned canvas does NOT
//     keep the original's pixels (per the DOM specification), so any drawing done before
//     Tools.setup() is lost. _renderCutStep draws after calling setup (correct);
//     _renderDecorateStep draws the fabric BEFORE calling setup, so the garment may not appear
//     on the Decorate step. [observed: in headless Chrome the studio canvas had 18420 opaque
//     pixels after the fabric step and 0 after entering the decorate step]
//   - The saved image is whatever is on the canvas at save time, not a re-render of the
//     garment, so the picture depends on the previous step's drawing.
//   - Closet.filterTab() decides which tab is highlighted by comparing the button's text to the
//     filter name, but the tab buttons contain only an SVG icon (no text), so only "All" ever
//     shows as selected.
/* ===== FASHION STUDIO STATION ===== */
// Fashion Studio controller (singleton).
const Stations = {
  // Index of the visible wizard step, 0 to 4.
  currentStep: 0,

  // Step ids in order. Must match the order of the `.step` spans in #studio-steps.
  steps: ['type','fabric','cut','decorate','preview'],

  // Chosen garment id from GARMENT_TYPES, or null until the player picks one (the wizard will not
  // leave step 0 without it).
  garmentType: null,

  // Fabric pattern id from FABRIC_PATTERNS; null until the fabric step sets it to 'solid'.
  fabricPattern: null,

  // Fabric colour; kept between items, so the next garment starts with the last colour.
  fabricColor: '#ff69b4',

  // Reserved; not used anywhere in the current code.
  decorCanvas: null,

  /**
   * Initializes the Fashion Studio workstation to a designated step index (0-4).
   * @param {number} [step=0] - Initial step index.
   */
  // Enter the studio at the given step (Game.goTo passes 0).
  init(step) {
    // `step || 0` makes an undefined argument mean "start".
    this.currentStep = step || 0;

    // Size the canvas before drawing; drawing needs the final width/height.
    this._resizeCanvas();
    this._renderStep();
  },

  // Sets the drawing surface to the space left by the layout. The 290 px subtracted is the width of
  // the left tool column (70 px) plus the right info column (220 px) defined in style.css, so the
  // canvas width fills the rest, up to 700 px; height is the parent's height, up to 500 px. Setting
  // width/height also clears the canvas. This changes the canvas away from the 600x500 attributes
  // in index.html.
  _resizeCanvas() {
    const c = document.getElementById('studio-canvas');
    if (!c) return;
    const parent = c.parentElement;
    const rect = parent.getBoundingClientRect();
    c.width = Math.min(rect.width - 290, 700);
    c.height = Math.min(rect.height, 500);
  },

  // "Next" button. On the last step the same button saves the item.
  nextStep() {
    // Cannot leave the first step without a garment: play the error sound and stay.
    if (this.currentStep === 0 && !this.garmentType) {
      Sound.play('error');
      return;
    }

    // Advance and redraw the new step.
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this._renderStep();
      Sound.play('whoosh');
    } else {
      // On the last step the button reads "Save to Closet", so pressing it finishes the item.
      // Save to closet
      this._saveToCloset();
    }
  },

  prevStep() {
    // Prev is hidden on step 0 (see _renderStep), so the guard only protects against a stray call.
    if (this.currentStep > 0) {
      this.currentStep--;
      this._renderStep();
      Sound.play('whoosh');
    }
  },

  _renderStep() {
    // Step indicator in the header: the current step is "active", earlier ones "done" (CSS styles
    // these differently), later ones neither.
    // Update step indicators
    document.querySelectorAll('#studio-steps .step').forEach((el, i) => {
      el.classList.remove('active', 'done');
      if (i === this.currentStep) el.classList.add('active');
      else if (i < this.currentStep) el.classList.add('done');
    });

    const step = this.steps[this.currentStep];

    // Each step has its own renderer that rebuilds the left tool column, right side panel and canvas.
    switch(step) {
      case 'type': this._renderTypeStep(); break;
      case 'fabric': this._renderFabricStep(); break;
      case 'cut': this._renderCutStep(); break;
      case 'decorate': this._renderDecorateStep(); break;
      case 'preview': this._renderPreviewStep(); break;
    }

    // Hide Prev on step 0 using visibility (keeps its space so the layout does not shift) and relabel
    // Next as "Save to Closet" on the last step.
    // Show/hide buttons
    document.getElementById('studio-prev').style.visibility = this.currentStep > 0 ? 'visible' : 'hidden';
    document.getElementById('studio-next').textContent = this.currentStep === this.steps.length - 1 ? 'Save to Closet ✓' : 'Next →';
  },

  /* ===== TYPE STEP ===== */
  // Step 1: choose the garment type. The tool column just shows a hint; the side panel shows a grid.
  _renderTypeStep() {
    const tools = document.getElementById('studio-tools');
    tools.innerHTML = '<div class="tool-btn" style="font-size:12px;height:auto;padding:6px;">Pick a<br>Type</div>';

    const side = document.getElementById('studio-side');
    side.innerHTML = '<h4>Choose Garment Type</h4>';

    const grid = document.createElement('div');
    grid.className = 'item-grid';
    GARMENT_TYPES.forEach(g => {
      const cell = document.createElement('div');
      cell.className = 'item-cell' + (this.garmentType === g.id ? ' active' : '');

      // Each cell shows the garment's SVG icon and name. (Icons.get is called directly because
      // Icons.init() only fills the static data-icon placeholders once at page load.)
      cell.innerHTML = `<div style="text-align:center"><div>${Icons.get(g.id, 28)}</div><div style="font-size:10px;color:var(--text-muted);margin-top:4px;">${g.name}</div></div>`;

      // Selecting highlights the cell, remembers the choice and draws the dashed outline immediately.
      cell.onclick = () => {
        this.garmentType = g.id;
        grid.querySelectorAll('.item-cell').forEach(c => c.classList.remove('active'));
        cell.classList.add('active');
        Sound.play('select');
        this._drawGarmentOutline();
      };
      grid.appendChild(cell);
    });
    side.appendChild(grid);

    // If a garment was chosen earlier (e.g. the player pressed Prev), show it again; otherwise show a
    // hint on the empty canvas.
    if (this.garmentType) this._drawGarmentOutline();
    else this._drawPlaceholder('Pick a garment type →');
  },

  // Draws a faint hint message in the centre of an empty canvas.
  _drawPlaceholder(msg) {
    const c = document.getElementById('studio-canvas');
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.font = '18px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(msg, c.width/2, c.height/2);
  },

  // Draws the chosen garment as a dashed outline with its name under it (step 1 preview).
  _drawGarmentOutline() {
    const c = document.getElementById('studio-canvas');
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;

    // Dashed line pattern 8 px on, 6 px off, reset after stroking because it is part of the context state.
    ctx.setLineDash([8, 6]);

    const cx = w/2, cy = h/2;
    this._drawGarmentPath(ctx, this.garmentType, cx, cy, 1);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    const g = GARMENT_TYPES.find(t => t.id === this.garmentType);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '16px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(g ? g.name : '', cx, h - 30);
  },

  // Builds (but does not stroke or fill) the outline path of a garment, centred on (cx, cy) and
  // multiplied by `scale`. Callers decide whether to stroke it, fill it, or clip to it, which is how
  // the fabric is limited to the garment shape. The coordinates are hand-drawn outlines in pixels at
  // scale 1: each garment is roughly 150-200 px wide and 150-190 px tall.
  // @param {CanvasRenderingContext2D} ctx - Target context.
  // @param {string} type - Garment id ('dress', 'pants', 'shorts', 'shoes', 'headband', 'bow').
  // @param {number} cx - Centre x.
  // @param {number} cy - Centre y.
  // @param {number} scale - Size multiplier (1 = normal).
  _drawGarmentPath(ctx, type, cx, cy, scale) {
    const s = scale;
    ctx.beginPath();

    // Pick the outline for the garment. An unknown id leaves an empty path.
    switch(type) {
      // Dress: a polygon with shoulders, short sleeves flaring out, a fitted waist and a curved hem
      // (two quadratic curves for the bottom edge). The path goes clockwise from the left shoulder.
      case 'dress':
        ctx.moveTo(cx - 30*s, cy - 80*s);
        ctx.lineTo(cx + 30*s, cy - 80*s);
        ctx.lineTo(cx + 35*s, cy - 40*s);
        ctx.lineTo(cx + 70*s, cy - 50*s); // right sleeve
        ctx.lineTo(cx + 75*s, cy - 25*s);
        ctx.lineTo(cx + 40*s, cy - 20*s);
        ctx.lineTo(cx + 60*s, cy + 90*s);
        ctx.quadraticCurveTo(cx + 50*s, cy + 100*s, cx, cy + 95*s);
        ctx.quadraticCurveTo(cx - 50*s, cy + 100*s, cx - 60*s, cy + 90*s);
        ctx.lineTo(cx - 40*s, cy - 20*s);
        ctx.lineTo(cx - 75*s, cy - 25*s);
        ctx.lineTo(cx - 70*s, cy - 50*s); // left sleeve
        ctx.lineTo(cx - 35*s, cy - 40*s);
        ctx.closePath();
        break;

      // Pants: waistband, outer legs, and the two inseams meeting at the crotch (cx, cy+10).
      case 'pants':
        ctx.moveTo(cx - 40*s, cy - 60*s);
        ctx.lineTo(cx + 40*s, cy - 60*s);
        ctx.lineTo(cx + 45*s, cy + 10*s);
        ctx.lineTo(cx + 35*s, cy + 90*s);
        ctx.lineTo(cx + 5*s, cy + 90*s);
        ctx.lineTo(cx, cy + 10*s);
        ctx.lineTo(cx - 5*s, cy + 90*s);
        ctx.lineTo(cx - 35*s, cy + 90*s);
        ctx.lineTo(cx - 45*s, cy + 10*s);
        ctx.closePath();
        break;

      // Shorts: same layout as pants but the legs end at cy+40 instead of cy+90.
      case 'shorts':
        ctx.moveTo(cx - 40*s, cy - 40*s);
        ctx.lineTo(cx + 40*s, cy - 40*s);
        ctx.lineTo(cx + 45*s, cy + 20*s);
        ctx.lineTo(cx + 35*s, cy + 40*s);
        ctx.lineTo(cx + 5*s, cy + 40*s);
        ctx.lineTo(cx, cy + 10*s);
        ctx.lineTo(cx - 5*s, cy + 40*s);
        ctx.lineTo(cx - 35*s, cy + 40*s);
        ctx.lineTo(cx - 45*s, cy + 20*s);
        ctx.closePath();
        break;

      // Shoes: two separate closed shapes (left and right) in one path; the second moveTo starts the
      // second shoe.
      case 'shoes':
        // Left shoe
        ctx.moveTo(cx - 60*s, cy - 10*s);
        ctx.quadraticCurveTo(cx - 70*s, cy - 20*s, cx - 50*s, cy - 25*s);
        ctx.lineTo(cx - 15*s, cy - 25*s);
        ctx.lineTo(cx - 10*s, cy - 10*s);
        ctx.quadraticCurveTo(cx - 10*s, cy + 10*s, cx - 35*s, cy + 10*s);
        ctx.quadraticCurveTo(cx - 65*s, cy + 10*s, cx - 60*s, cy - 10*s);
        // Right shoe
        ctx.moveTo(cx + 10*s, cy - 10*s);
        ctx.quadraticCurveTo(cx + 10*s, cy - 20*s, cx + 15*s, cy - 25*s);
        ctx.lineTo(cx + 50*s, cy - 25*s);
        ctx.quadraticCurveTo(cx + 70*s, cy - 20*s, cx + 60*s, cy - 10*s);
        ctx.quadraticCurveTo(cx + 65*s, cy + 10*s, cx + 35*s, cy + 10*s);
        ctx.quadraticCurveTo(cx + 10*s, cy + 10*s, cx + 10*s, cy - 10*s);
        break;

      // Headband: two concentric ellipses (outer 50x30, inner 45x25). Both are drawn in the same direction,
      // so the default (nonzero) fill treats them as one solid oval and the inner one only adds an outline when
      // stroked. The extra moveTo avoids a stray line joining the two ellipses.
      case 'headband':
        ctx.ellipse(cx, cy, 50*s, 30*s, 0, 0, Math.PI*2);
        ctx.moveTo(cx + 50*s, cy);
        ctx.ellipse(cx, cy, 45*s, 25*s, 0, 0, Math.PI*2);
        break;

      // Bow: two loops meeting at the centre plus a small square knot.
      case 'bow':
        // Left loop
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(cx - 50*s, cy - 40*s, cx - 40*s, cy);
        ctx.quadraticCurveTo(cx - 50*s, cy + 40*s, cx, cy);
        // Right loop
        ctx.quadraticCurveTo(cx + 50*s, cy - 40*s, cx + 40*s, cy);
        ctx.quadraticCurveTo(cx + 50*s, cy + 40*s, cx, cy);
        // Center knot
        ctx.moveTo(cx - 8*s, cy - 10*s);
        ctx.lineTo(cx + 8*s, cy - 10*s);
        ctx.lineTo(cx + 8*s, cy + 10*s);
        ctx.lineTo(cx - 8*s, cy + 10*s);
        ctx.closePath();
        break;
    }
  },

  /* ===== FABRIC STEP ===== */
  // Step 2: choose colour and pattern.
  _renderFabricStep() {
    const tools = document.getElementById('studio-tools');
    tools.innerHTML = '';

    const side = document.getElementById('studio-side');
    side.innerHTML = '<h4>Choose Fabric</h4>';

    // Colour swatch button; opens the shared wheel and redraws the fabric when a colour is chosen.
    // Color picker
    const colorBtn = document.createElement('div');
    colorBtn.className = 'color-pick-btn';
    colorBtn.style.background = this.fabricColor;
    colorBtn.style.margin = '0 auto 10px';
    colorBtn.onclick = () => {
      ColorWheel.setFromHex(this.fabricColor);
      ColorWheel.open('fabric', hex => {
        this.fabricColor = hex;
        colorBtn.style.background = hex;
        this._drawFabric();
      });
    };
    side.appendChild(colorBtn);

    // One cell per pattern in FABRIC_PATTERNS; picking one redraws the fabric immediately.
    // Pattern grid
    const label2 = document.createElement('h4');
    label2.textContent = 'Pattern';
    side.appendChild(label2);

    const grid = document.createElement('div');
    grid.className = 'item-grid';
    FABRIC_PATTERNS.forEach(p => {
      const cell = document.createElement('div');
      cell.className = 'item-cell' + (this.fabricPattern === p.id ? ' active' : '');
      cell.style.fontSize = '11px';
      cell.textContent = p.name;
      cell.onclick = () => {
        this.fabricPattern = p.id;
        grid.querySelectorAll('.item-cell').forEach(c => c.classList.remove('active'));
        cell.classList.add('active');
        Sound.play('select');
        this._drawFabric();
      };
      grid.appendChild(cell);
    });
    side.appendChild(grid);

    // Default the pattern to plain colour the first time the player reaches this step, then draw.
    if (!this.fabricPattern) this.fabricPattern = 'solid';
    this._drawFabric();
  },

  // Paints the fabric inside the garment outline: clip to the garment path, fill with the base colour,
  // draw the chosen pattern in a darker/lighter tone, then (after restoring the clip) draw a white
  // outline. Called whenever the colour, pattern, or step changes.
  _drawFabric() {
    const c = document.getElementById('studio-canvas');
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w/2, cy = h/2;

    // The clip region keeps all pattern drawing inside the garment shape, so patterns can be drawn over
    // the whole canvas without special handling.
    // Fill garment shape with fabric
    ctx.save();
    this._drawGarmentPath(ctx, this.garmentType, cx, cy, 1);
    ctx.clip();

    // Base color
    ctx.fillStyle = this.fabricColor;
    ctx.fillRect(0, 0, w, h);

    // Pattern overlay
    // Pattern colours are derived from the base colour so patterns always harmonise: a darker tone
    // (lightness -20, floor 0) for stripes/dots/plaid/zigzag and a lighter tone (+15, cap 100) for
    // flowers/stars/hearts.
    const [ph, ps, pl] = U.hexToHsl(this.fabricColor);
    const patternColor = U.hslToHex(ph, ps, Math.max(0, pl - 20));
    const patternLight = U.hslToHex(ph, ps, Math.min(100, pl + 15));

    ctx.fillStyle = patternColor;
    ctx.strokeStyle = patternColor;

    // Each case tiles a pattern across the whole canvas; only the part inside the clip is visible.
    switch(this.fabricPattern) {
      // Diagonal stripes 6 px thick every 20 px. Each line runs from (x, 0) to (x+h, h), a 45 degree slope;
      // starting at x = -h makes the left corner covered too.
      case 'stripes':
        ctx.lineWidth = 6;
        for (let x = -h; x < w + h; x += 20) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + h, h);
          ctx.stroke();
        }
        break;

      // Polka dots of radius 4 on a 25 px grid. Every other row is offset by 12 px (odd multiples of 25
      // are shifted) so the dots form a staggered pattern.
      case 'polka':
        for (let y = 0; y < h; y += 25) {
          for (let x = (y % 50 === 0 ? 0 : 12); x < w; x += 25) {
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI*2);
            ctx.fill();
          }
        }
        break;

      // Plaid: translucent (30% opacity) thick lines every 30 px in both directions; where they cross the
      // colour is darker, which gives the woven look.
      case 'plaid':
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 8;
        for (let x = 0; x < w; x += 30) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += 30) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;

      // Floral: a flower every 50 px, staggered by row. Each is five lighter petals around the centre
      // (angle p * 2 pi / 5, radius 6) and a small centre dot in a hue shifted +40 degrees.
      case 'floral':
        for (let y = 20; y < h; y += 50) {
          for (let x = (y % 100 < 50 ? 20 : 45); x < w; x += 50) {
            ctx.fillStyle = patternLight;
            for (let p = 0; p < 5; p++) {
              const a = p * Math.PI * 2 / 5;
              ctx.beginPath();
              ctx.arc(x + Math.cos(a)*6, y + Math.sin(a)*6, 4, 0, Math.PI*2);
              ctx.fill();
            }
            ctx.fillStyle = U.hslToHex((ph+40)%360, 80, 60);
            ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill();
          }
        }
        break;

      // Stars: 8 px stars every 40 px, staggered rows, in the lighter tone.
      case 'stars':
        for (let y = 20; y < h; y += 40) {
          for (let x = (y % 80 < 40 ? 20 : 40); x < w; x += 40) {
            ctx.fillStyle = patternLight;
            U.drawStar(ctx, x, y, 8, 5);
          }
        }
        break;

      // Hearts: the heart routine draws at a fixed size, so the context is scaled to 35% and moved to each
      // position; save/restore keep that transform local.
      case 'hearts':
        ctx.fillStyle = patternLight;
        for (let y = 20; y < h; y += 40) {
          for (let x = (y % 80 < 40 ? 15 : 35); x < w; x += 40) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(0.35, 0.35);
            U.drawHeart(ctx, 0, -12, 10);
            ctx.restore();
          }
        }
        break;

      // Zigzag: horizontal wavy lines every 20 px. The y offset alternates between -6 and +6 every 15 px
      // (x % 30), giving a 12 px peak-to-peak wave.
      case 'zigzag':
        ctx.strokeStyle = patternColor;
        ctx.lineWidth = 3;
        for (let y = 0; y < h; y += 20) {
          ctx.beginPath();
          for (let x = 0; x < w; x += 15) {
            const yy = y + (x % 30 < 15 ? -6 : 6);
            if (x === 0) ctx.moveTo(x, yy);
            else ctx.lineTo(x, yy);
          }
          ctx.stroke();
        }
        break;
    }

    // Remove the clip so the outline below is not cut off.
    ctx.restore();

    // Outline
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    this._drawGarmentPath(ctx, this.garmentType, cx, cy, 1);
    ctx.stroke();
  },

  /* ===== CUT STEP ===== */
  // Step 3: cutting. The player traces the dashed outline with the scissors (the 'cut' tool). It is
  // decorative: it draws dashed guide lines but does not remove fabric or score the accuracy.
  _renderCutStep() {
    const tools = document.getElementById('studio-tools');
    tools.innerHTML = `
      <button class="tool-btn active" title="Scissors">${Icons.get('scissors')}</button>
    `;

    const side = document.getElementById('studio-side');
    side.innerHTML = '<h4>Cut Along the Lines!</h4><p style="font-size:12px;color:var(--text-muted)">Trace the dotted outline with your mouse to cut the fabric</p>';

    // The cut tool draws a dashed white line along the mouse path (see Tools._drawCut).
    Tools.currentTool = 'cut';

    // setup() clones the canvas, which clears it, so the fabric is redrawn after it (next lines).
    Tools.setup('studio-canvas');

    // Draw the fabric with cut guides
    this._drawFabric();

    // Redraw the fabric, then overlay the dashed cut guide.
    // Add animated dashed outline
    const c = document.getElementById('studio-canvas');
    const ctx = c.getContext('2d');
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    this._drawGarmentPath(ctx, this.garmentType, c.width/2, c.height/2, 1);
    ctx.stroke();
    ctx.setLineDash([]);

    // Scissors cursor
    // Use the crosshair cursor on the canvas (the "scissors cursor" is just a crosshair).
    c.style.cursor = 'crosshair';
  },

  /* ===== DECORATE STEP ===== */
  // Step 4: decorate with tools. The comment below says the fabric is saved as the base, but it is
  // only redrawn (before Tools.setup() clears the canvas, see the note in the file overview).
  _renderDecorateStep() {
    // Save current fabric as base
    const c = document.getElementById('studio-canvas');
    this._drawFabric();

    // Setup tools
    const tools = document.getElementById('studio-tools');
    tools.innerHTML = '';

    // Tool buttons: id (the Tools tool id), icon (key in Icons.paths) and label shown under the icon.
    const toolList = [
      { id: 'dye', icon: 'palette', label: 'Dye' },
      { id: 'fill', icon: 'bucket', label: 'Fill' },
      { id: 'glitter', icon: 'sparkles', label: 'Glitter' },
      { id: 'sticker', icon: 'star', label: 'Sticker' },
      { id: 'badge', icon: 'medal', label: 'Badge' },
      { id: 'pearl', icon: 'bubbles', label: 'Pearl' },
      { id: 'eraser', icon: 'eraser', label: 'Eraser' },
    ];

    // One button per tool; clicking sets Tools.currentTool, moves the highlight and rebuilds the side
    // panel for that tool (colour, size, or sticker grids).
    toolList.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn' + (Tools.currentTool === t.id ? ' active' : '');
      btn.innerHTML = `${Icons.get(t.icon)}<span class="tool-label">${t.label}</span>`;
      btn.style.flexDirection = 'column';
      btn.title = t.label;
      btn.onclick = () => {
        Tools.currentTool = t.id;
        tools.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Sound.play('click');
        this._updateSidePanel(t.id);
      };
      tools.appendChild(btn);
    });

    // Start with the dye (paint brush) selected and wire the canvas for mouse painting.
    Tools.currentTool = 'dye';
    Tools.setup('studio-canvas');
    tools.querySelector('.tool-btn').classList.add('active');
    this._updateSidePanel('dye');
  },

  // Rebuilds #studio-side for the chosen tool: colour pickers for colour-based tools, a size slider for
  // brush-like tools, and sticker or badge grids for the stamp tools.
  // @param {string} toolId - One of the ids from the tool list ('dye', 'fill', 'glitter', 'sticker', 'badge', 'pearl', 'eraser', ...).
  _updateSidePanel(toolId) {
    const side = document.getElementById('studio-side');
    side.innerHTML = '';

    // Tools that paint with a colour get the swatch button and a row of 12 quick colours.
    // Color picker (for all color-based tools)
    if (['dye','fill','glitter','pearl','spray'].includes(toolId)) {
      const h4 = document.createElement('h4');
      h4.textContent = 'Color';
      side.appendChild(h4);

      const colorBtn = document.createElement('div');
      colorBtn.className = 'color-pick-btn';
      colorBtn.style.background = Tools.currentColor;
      colorBtn.onclick = () => {
        Tools.openColorPicker(hex => { colorBtn.style.background = hex; });
      };
      side.appendChild(colorBtn);

      // Quick palette: pinks, reds, yellows, greens, blues, purples, white, black and dark red.
      // Quick colors
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
    }

    // Tools with a size get a slider from 2 to 30 px, which sets Tools.brushSize directly.
    // Brush size
    if (['dye','glitter','pearl','spray','eraser'].includes(toolId)) {
      const h4 = document.createElement('h4');
      h4.textContent = 'Size';
      h4.style.marginTop = '10px';
      side.appendChild(h4);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '2';
      slider.max = '30';
      slider.value = Tools.brushSize;
      slider.style.width = '100%';
      slider.style.accentColor = 'var(--accent-pink)';
      slider.oninput = () => { Tools.brushSize = parseInt(slider.value); };
      side.appendChild(slider);
    }

    // Sticker grid: the emoji list from STICKER_SETS; picking one sets Tools.currentSticker.
    // Stickers
    if (toolId === 'sticker') {
      const h4 = document.createElement('h4');
      h4.textContent = 'Stickers';
      side.appendChild(h4);

      const grid = document.createElement('div');
      grid.className = 'item-grid';
      STICKER_SETS.forEach(s => {
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
    }

    // Badge grid, same idea with BADGE_SETS and Tools.currentBadge.
    // Badges
    if (toolId === 'badge') {
      const h4 = document.createElement('h4');
      h4.textContent = 'Badges';
      side.appendChild(h4);

      const grid = document.createElement('div');
      grid.className = 'item-grid';
      BADGE_SETS.forEach(b => {
        const cell = document.createElement('div');
        cell.className = 'item-cell' + (Tools.currentBadge === b ? ' active' : '');
        cell.textContent = b;
        cell.onclick = () => {
          Tools.currentBadge = b;
          grid.querySelectorAll('.item-cell').forEach(c => c.classList.remove('active'));
          cell.classList.add('active');
          Sound.play('click');
        };
        grid.appendChild(cell);
      });
      side.appendChild(grid);
    }
  },

  /* ===== PREVIEW STEP ===== */
  // Step 5: preview. It does not redraw anything; it only labels the current canvas contents.
  _renderPreviewStep() {
    const tools = document.getElementById('studio-tools');
    tools.innerHTML = '<div class="tool-btn" style="font-size:12px;height:auto;padding:6px;">Preview</div>';

    const side = document.getElementById('studio-side');
    side.innerHTML = '<h4>✨ Looking Great!</h4><p style="font-size:13px;color:var(--text-muted)">Your creation is ready! Save it to your closet.</p>';

    // Draw character wearing the garment
    const c = document.getElementById('studio-canvas');
    const ctx = c.getContext('2d');
    // Keep current canvas content but add character preview overlay info
    const garment = GARMENT_TYPES.find(g => g.id === this.garmentType);
    if (garment) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = '16px Fredoka';
      ctx.textAlign = 'center';
      ctx.fillText(`${garment.emoji} ${garment.name} — Ready!`, c.width/2, c.height - 20);
    }
  },

  /* ===== SAVE ===== */
  // Final step: store the finished garment.
  _saveToCloset() {
    const c = document.getElementById('studio-canvas');

    // Encode the canvas as a PNG data URL (a base64 string; a few tens of KB). It is stored in the save
    // file in localStorage, which has a limit of about 5 MB per origin, so a large closet can eventually
    // fail to save (U.save swallows the error).
    const imageData = c.toDataURL('image/png');
    const item = {
      // Unique id from the creation time in ms. Two items made in the same millisecond would clash (not
      // possible by hand).
      id: Date.now(),
      type: 'clothes',
      subtype: this.garmentType,
      name: GARMENT_TYPES.find(g => g.id === this.garmentType)?.name || 'Item',
      image: imageData,
      fabricColor: this.fabricColor,
      fabricPattern: this.fabricPattern,
      createdAt: Date.now(),
    };

    // Add to the closet (also saves), then award 50 XP (also saves and plays a coin sound).
    Game.addToCloset(item);
    Game.addXP(50);
    Sound.play('complete');

    // Reset the wizard for the next garment. fabricColor is kept on purpose.
    // Reset for next item
    this.currentStep = 0;
    this.garmentType = null;
    this.fabricPattern = 'solid';

    // If the XP crossed the next level threshold, show the level-up screen, else go back to the workshop.
    // Check level up
    if (Game.checkLevelUp()) {
      Game.goTo('levelup');
    } else {
      Game.goTo('workshop');
    }
  }
};








// Closet: the wardrobe screen's controller (#closet-screen, #closet-grid, .closet-tabs).
/* ===== CLOSET ===== */
const Closet = {
  // The category filter currently selected: 'all' or an item `type` ('clothes', 'hair', ...).
  currentFilter: 'all',

  // Called by the tab buttons. Stores the filter, updates which tab is highlighted, redraws the grid.
  filterTab(tab) {
    this.currentFilter = tab;
    document.querySelectorAll('.closet-tabs .tab').forEach(t => {
      // Highlight logic: it compares the button's text to the filter name, which works for the "All" tab
      // only because the other tabs show an icon and contain no text.
      t.classList.toggle('active', t.textContent.trim() === tab || (tab === 'all' && t.textContent.includes('All')));
    });
    this.render();
    Sound.play('click');
  },

  // Rebuilds the grid for the current filter.
  render() {
    const grid = document.getElementById('closet-grid');

    // Defensive: the grid exists in index.html.
    if (!grid) return;
    grid.innerHTML = '';

    // Items matching the filter, or all items. `|| []` protects against a missing closet array in an old save.
    let items = Game.state.closet || [];
    if (this.currentFilter !== 'all') {
      items = items.filter(i => i.type === this.currentFilter);
    }

    // First grid cell: a line stretching across all columns showing how many items match.
    // Item count
    const countEl = document.createElement('div');
    countEl.style.cssText = 'grid-column:1/-1;text-align:center;font-size:13px;color:var(--text-muted);padding:4px;';
    const total = (Game.state.closet || []).length;

    // Pluralise "item" for counts other than 1.
    countEl.textContent = this.currentFilter === 'all'
      ? `${total} item${total !== 1 ? 's' : ''} in your closet`
      : `${items.length} ${this.currentFilter} item${items.length !== 1 ? 's' : ''}`;
    grid.appendChild(countEl);

    if (items.length === 0) {
      // Empty state message spanning every column (innerHTML += replaces the grid's children, which is fine
      // here because only the count line is in it).
      grid.innerHTML += '<p class="empty-msg" style="grid-column:1/-1;">Your closet is empty! Create some items in the workshop.</p>';
      return;
    }

    // Emoji used as a fallback picture and as the type badge on each card.
    const typeEmojis = { clothes: '👗', hair: '💇', makeup: '💄', tech: '📱', decor: '🛋️', books: '📚' };

    // One card per item.
    items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'closet-item';
      card.style.position = 'relative';

      // Type badge in the corner (clothes, hair, ...).
      // Type badge
      const badge = document.createElement('div');
      badge.style.cssText = 'position:absolute;top:6px;left:6px;font-size:14px;background:rgba(0,0,0,0.4);border-radius:6px;padding:2px 6px;z-index:2;';
      badge.textContent = typeEmojis[item.type] || '✨';
      card.appendChild(badge);

      // Items made with a canvas have a PNG data URL, shown as a thumbnail; others fall back to an emoji.
      if (item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.style.cssText = 'width:100%;height:100px;object-fit:contain;border-radius:8px;';
        card.appendChild(img);
      } else {
        const emoji = document.createElement('div');
        emoji.style.cssText = 'font-size:48px;padding:20px;';

        // Choose the emoji: the garment's own emoji, or the item type's, or a sparkle.
        emoji.textContent = GARMENT_TYPES.find(g => g.id === item.subtype)?.emoji || typeEmojis[item.type] || '✨';
        card.appendChild(emoji);
      }

      // Item name under the picture.
      const name = document.createElement('div');
      name.className = 'item-name';
      name.textContent = item.name;
      card.appendChild(name);

      // Delete button
      const del = document.createElement('button');
      del.style.cssText = 'position:absolute;top:6px;right:6px;background:rgba(220,20,60,0.6);border:none;color:#fff;border-radius:50%;width:20px;height:20px;font-size:10px;cursor:pointer;display:none;z-index:2;';
      del.textContent = '✕';

      // Delete button, visible only while hovering the card. stopPropagation prevents the click from also
      // triggering anything on the card. Removing filters the closet by id and saves; the grid is redrawn.
      del.onclick = (e) => {
        e.stopPropagation();
        Game.state.closet = Game.state.closet.filter(i => i.id !== item.id);
        Game.save();
        this.render();
        Sound.play('click');
      };
      card.appendChild(del);
      card.onmouseenter = () => del.style.display = 'block';
      card.onmouseleave = () => del.style.display = 'none';

      grid.appendChild(card);
    });
  }
};
