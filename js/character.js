// ==============================================================================
// Program: character.js
// Programmer: Ethan-da-Tech-Wizard
// Last Modified: November 19, 2026
// Purpose: Core procedural vector avatar rendering and layer composite engine.
//          Draws modular humanoid body parts, directional lighting highlights,
//          subsurface skin shadows, multi-pass hair volume (rear and front layers),
//          expressive eyes with corneal reflections, and layered clothing garments
//          to HTML5 2D canvas surfaces with dynamic viewport scaling.
// FILE OVERVIEW
// character.js owns the player's avatar: the data describing it, the character-creator
// screen (#character-screen in index.html) that edits it, and the canvas drawing routine
// that paints it. The avatar is drawn entirely with canvas path calls (no images), so it
// scales to any size and its colours can be changed freely.
//
// Who calls it: Game.goTo('character') calls Character.init(); Game.finishCharacter() calls
// getData() to save the avatar; Game.continueGame() and Game.init() assign Character.data
// from the save file; Game._renderWorkshopChar() and the stations call drawCharacter()
// directly to paint the avatar on other canvases (workshop preview, station previews). The
// HTML buttons "Random" and "Mystery" call randomize() and mystery(). It depends on U
// (colour maths, picks), the constant lists HAIR_STYLES / FACE_SHAPES / EYE_SHAPES /
// presets from utils.js, ColorWheel (colour pickers) and Sound.
//
// Data model (Character.data), all plain JSON so it can be saved with Game.state:
//   skinTone / hairColor / eyeColor: "#rrggbb" strings
//   hairStyle: one of HAIR_STYLES; faceShape: one of FACE_SHAPES; eyeShape: one of EYE_SHAPES
//   outfit: { top, bottom } colours of the shirt and legs
//   accessories: reserved list, currently unused by the drawing code
//
// Drawing approach: drawCharacter() paints back to front (painter's algorithm): legs, shoes,
// back hair, torso, arms, neck, head, face features, then front hair on top. The origin is
// moved to the character's centre point and every dimension is multiplied by a scale `s`, so
// one routine serves the 400x600 creator canvas (scale 1) and the 200x300 workshop canvas
// (scale 0.55). Numeric offsets are hand-tuned pixel values at scale 1; the figure is roughly
// 250 px tall at scale 1: head circle radius 65 centred 75 px above the origin, torso from -10
// to +50, legs to +105, shoes at +110.
//
// Known limits: face and hair-style buttons are rebuilt from scratch on every
// randomize/setData, which is cheap but would reset scroll position in the hair list. The
// `accessories` array and `hairStyle` values 'wavy'/'straight' have little or no unique
// drawing (they share the 'long' back-hair shape).
// How to test: open the creator and click Random repeatedly; or in the console run
// Character.data.hairStyle = 'mohawk'; Character.render().
// ==============================================================================
/* ===== CHARACTER CREATION & RENDERING ENGINE ===== */
// Singleton: there is exactly one player avatar.
const Character = {
  // Default appearance used for a brand-new game (a long-haired character with a pink top and
  // purple bottoms). Game.newGame() calls reset() to restore this look (it used to keep the previous
  // game's avatar). The shape is documented above.
  // Active character appearance model schema
  data: {
    skinTone: '#FDDBB4',
    hairStyle: 'long',
    hairColor: '#3d2b1f',
    eyeShape: 'round',
    eyeColor: '#4a90d9',
    faceShape: 'round',
    outfit: { top: '#ff69b4', bottom: '#9370db' },
    accessories: [],
  },

  /**
   * Initializes creator options UI, color wheel event bindings, and renders initial canvas frame.
   */
  // Entry point when the creator screen opens (called by Game.goTo('character')).
  init() {
    // Create the option buttons first so they reflect the current data (the highlighted choice).
    this._buildOptions();

    // Attach colour-picker click handlers. This must run on every entry; see the note on that function.
    this._setupColorCallbacks();

    // Draw the avatar once so the canvas is not empty.
    this.render();
  },

  // Rebuilds all three option rows (face shape, hair style, eye shape) and the three colour swatch
  // buttons from the current data. Each choice is a <button class="opt-btn"> holding a tiny
  // canvas drawing of that choice; the class "active" marks the selected one. The element ids
  // are those in index.html (#face-shapes, #hair-styles, #eye-shapes, #skin-color-pick, ...).
  // Returns early without finishing if a row element is missing (for example on a page without the
  // creator markup), which also skips the later rows.
  _buildOptions() {
    // Face shapes: a 32x32 thumbnail of each shape in a fixed skin tone (the thumbnails do not follow
    // the current skin colour, so they stay readable).
    // Face shapes
    const faceRow = document.getElementById('face-shapes');
    if (!faceRow) return;
    faceRow.innerHTML = '';

    // Button tooltips. The internal id 'square' is shown to players as "Soft".
    const faceLabels = { round: 'Round', oval: 'Oval', heart: 'Heart', square: 'Soft' };
    FACE_SHAPES.forEach(f => {
      const btn = document.createElement('button');

      // Highlight the currently selected option at build time.
      btn.className = 'opt-btn' + (this.data.faceShape === f ? ' active' : '');

      // Each branch draws a miniature of that head shape: a circle, an ellipse (narrower than tall),
      // a heart made from two Beziers, and a rounded rectangle made with arcTo corners.
      // Draw mini face preview
      const mc = document.createElement('canvas');
      mc.width = 32; mc.height = 32;
      const mctx = mc.getContext('2d');
      mctx.fillStyle = '#FDDBB4';
      if (f === 'round') { mctx.beginPath(); mctx.arc(16,16,12,0,Math.PI*2); mctx.fill(); }
      else if (f === 'oval') { mctx.beginPath(); mctx.ellipse(16,16,10,14,0,0,Math.PI*2); mctx.fill(); }
      else if (f === 'heart') { mctx.beginPath(); mctx.moveTo(16,27); mctx.bezierCurveTo(4,18,4,6,16,10); mctx.bezierCurveTo(28,6,28,18,16,27); mctx.fill(); }
      else { mctx.beginPath(); const r=3; mctx.moveTo(6+r,5); mctx.arcTo(26,5,26,27,r); mctx.arcTo(26,27,6,27,r); mctx.arcTo(6,27,6,5,r); mctx.arcTo(6,5,26,5,r); mctx.fill(); }
      btn.innerHTML = '';
      btn.appendChild(mc);
      btn.title = faceLabels[f] || f;

      // Choosing: store the choice, move the "active" highlight to this button only, give audio
      // feedback and redraw the avatar immediately so the change is visible.
      btn.onclick = () => {
        this.data.faceShape = f;
        faceRow.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Sound.play('click');
        this.render();
      };
      faceRow.appendChild(btn);
    });

    // Hair styles: thumbnails drawn by _drawMiniHairPreview in the current hair colour. They are
    // built once, so they show the colour that was set when the row was built; picking a new hair
    // colour does not repaint them until the next _buildOptions().
    // Hair styles
    const hairRow = document.getElementById('hair-styles');
    if (!hairRow) return;
    hairRow.innerHTML = '';
    HAIR_STYLES.forEach(h => {
      const btn = document.createElement('button');
      btn.className = 'opt-btn' + (this.data.hairStyle === h ? ' active' : '');
      // Draw mini hair preview
      const mc = document.createElement('canvas');
      mc.width = 36; mc.height = 36;
      const mctx = mc.getContext('2d');
      this._drawMiniHairPreview(mctx, h, 18, 18, this.data.hairColor);
      btn.innerHTML = '';
      btn.appendChild(mc);

      // Title-case the style name for the tooltip (first letter upper, rest unchanged).
      btn.title = h.charAt(0).toUpperCase() + h.slice(1);
      btn.onclick = () => {
        this.data.hairStyle = h;
        hairRow.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Sound.play('click');
        this.render();
      };
      hairRow.appendChild(btn);
    });

    // Eye shapes: thumbnails from _drawMiniEyePreview, same selection behaviour as above.
    // Eye shapes
    const eyeRow = document.getElementById('eye-shapes');
    if (!eyeRow) return;
    eyeRow.innerHTML = '';
    EYE_SHAPES.forEach(e => {
      const btn = document.createElement('button');
      btn.className = 'opt-btn' + (this.data.eyeShape === e ? ' active' : '');
      const mc = document.createElement('canvas');
      mc.width = 32; mc.height = 32;
      const mctx = mc.getContext('2d');
      this._drawMiniEyePreview(mctx, e, 16, 16);
      btn.innerHTML = '';
      btn.appendChild(mc);
      btn.title = e.charAt(0).toUpperCase() + e.slice(1);
      btn.onclick = () => {
        this.data.eyeShape = e;
        eyeRow.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Sound.play('click');
        this.render();
      };
      eyeRow.appendChild(btn);
    });

    // Colour swatch buttons show the current colour as their background; clicks open ColorWheel
    // (see _setupColorCallbacks).
    // Set color buttons
    document.getElementById('skin-color-pick').style.background = this.data.skinTone;
    document.getElementById('hair-color-pick').style.background = this.data.hairColor;
    document.getElementById('eye-color-pick').style.background = this.data.eyeColor;
  },

  // Draws a 36x36 thumbnail of a hair style: a hair-coloured head disc, a skin-coloured face disc
  // on top, then the style-specific hair shapes. A simplified cartoon, not the real renderer.
  // Parameters: ctx = 2D context of the thumbnail; style = a HAIR_STYLES id; cx, cy = centre of the head in thumbnail pixels; color = hair colour "#rrggbb".
  _drawMiniHairPreview(ctx, style, cx, cy, color) {
    ctx.fillStyle = color;
    // Simple hair silhouette preview
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI*2); ctx.fill(); // head
    ctx.fillStyle = '#FDDBB4';
    ctx.beginPath(); ctx.arc(cx, cy+2, 7, 0, Math.PI*2); ctx.fill(); // face
    ctx.fillStyle = color;
    // Hair shape on top
    if (style === 'long' || style === 'straight' || style === 'wavy') {
      ctx.beginPath(); ctx.ellipse(cx, cy-4, 12, 8, 0, Math.PI, 0, true); ctx.fill();
      ctx.fillRect(cx-11, cy-2, 4, 16); ctx.fillRect(cx+7, cy-2, 4, 16);
    } else if (style === 'bob') {
      ctx.beginPath(); ctx.ellipse(cx, cy-4, 12, 8, 0, Math.PI, 0, true); ctx.fill();
      ctx.fillRect(cx-11, cy-2, 4, 8); ctx.fillRect(cx+7, cy-2, 4, 8);
    } else if (style === 'pixie') {
      ctx.beginPath(); ctx.ellipse(cx+2, cy-5, 11, 7, 0.2, Math.PI, 0, true); ctx.fill();
    } else if (style === 'curly' || style === 'afro') {
      ctx.beginPath(); ctx.arc(cx, cy-2, 14, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FDDBB4'; ctx.beginPath(); ctx.arc(cx, cy+2, 7, 0, Math.PI*2); ctx.fill();
    } else if (style === 'braids') {
      ctx.beginPath(); ctx.ellipse(cx, cy-4, 12, 8, 0, Math.PI, 0, true); ctx.fill();
      ctx.beginPath(); ctx.arc(cx-7, cy+10, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx+7, cy+10, 3, 0, Math.PI*2); ctx.fill();
    } else if (style === 'ponytail') {
      ctx.beginPath(); ctx.ellipse(cx, cy-4, 12, 8, 0, Math.PI, 0, true); ctx.fill();
      ctx.beginPath(); ctx.arc(cx+10, cy-6, 5, 0, Math.PI*2); ctx.fill();
    } else if (style === 'buns') {
      ctx.beginPath(); ctx.ellipse(cx, cy-4, 12, 8, 0, Math.PI, 0, true); ctx.fill();
      ctx.beginPath(); ctx.arc(cx-8, cy-12, 4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx+8, cy-12, 4, 0, Math.PI*2); ctx.fill();
    } else if (style === 'mohawk') {
      ctx.beginPath(); ctx.ellipse(cx, cy-4, 12, 8, 0, Math.PI, 0, true); ctx.fill();
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(cx+i*4, cy-14, 3, 0, Math.PI*2); ctx.fill(); }
    } else if (style === 'sidepart') {
      ctx.beginPath(); ctx.ellipse(cx-2, cy-5, 13, 8, -0.15, Math.PI, 0, true); ctx.fill();
    } else {
      ctx.beginPath(); ctx.ellipse(cx, cy-4, 12, 8, 0, Math.PI, 0, true); ctx.fill();
    }
  },

  // Draws a 32x32 thumbnail of an eye shape. 'closed-happy' is a smile-shaped arc; the others are
  // an ellipse whose width/height depend on the shape (big = largest, almond = flattest,
  // cat = slightly tilted), with a blue iris, pupil and highlight.
  _drawMiniEyePreview(ctx, shape, cx, cy) {
    ctx.fillStyle = '#fff';
    if (shape === 'closed-happy') {
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0.7*Math.PI, 0.3*Math.PI, true); ctx.stroke();
      return;
    }

    // Eye ellipse radii in thumbnail pixels: ew = horizontal radius, eh = vertical radius.
    const ew = shape === 'big' ? 10 : shape === 'cat' ? 9 : 8;
    const eh = shape === 'big' ? 10 : shape === 'almond' ? 6 : 8;
    const tilt = shape === 'cat' ? 0.2 : 0;
    ctx.beginPath(); ctx.ellipse(cx, cy, ew, eh, tilt, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#4a90d9'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(cx-2, cy-2, 1.8, 0, Math.PI*2); ctx.fill();
  },

  // Wires the three colour swatch buttons. Assigning `.onclick` here REPLACES the inline
  // onclick="ColorWheel.open('skin')" attributes in index.html; the version here is the one that
  // runs, because it first loads the character's current colour into the wheel (setFromHex) and
  // provides a callback that stores the picked colour, repaints the swatch and redraws the avatar.
  // `self` is used instead of `this` because the callbacks run later from ColorWheel.
  _setupColorCallbacks() {
    const self = this;
    document.getElementById('skin-color-pick').onclick = () => {
      ColorWheel.setFromHex(self.data.skinTone);
      ColorWheel.open('skin', hex => { self.data.skinTone = hex; document.getElementById('skin-color-pick').style.background = hex; self.render(); });
    };
    document.getElementById('hair-color-pick').onclick = () => {
      ColorWheel.setFromHex(self.data.hairColor);
      ColorWheel.open('hair', hex => { self.data.hairColor = hex; document.getElementById('hair-color-pick').style.background = hex; self.render(); });
    };
    document.getElementById('eye-color-pick').onclick = () => {
      ColorWheel.setFromHex(self.data.eyeColor);
      ColorWheel.open('eyes', hex => { self.data.eyeColor = hex; document.getElementById('eye-color-pick').style.background = hex; self.render(); });
    };
  },

  // Randomises every appearance field. Colours come from the preset lists; the outfit colours are
  // random hues with saturation 50-100 and a lightness window that keeps them visible (top 45-70,
  // bottom 30-60 percent, slightly darker than the top so the two read as different garments).
  // Rebuilds the option rows so the highlighted buttons match the new values.
  randomize() {
    this.data.skinTone = U.pick(SKIN_PRESETS);
    this.data.hairColor = U.pick(HAIR_COLOR_PRESETS);
    this.data.hairStyle = U.pick(HAIR_STYLES);
    this.data.eyeShape = U.pick(EYE_SHAPES);

    // A fixed list of ten natural and fantasy eye colours (blue, green, browns, dark navy, purple,
    // red, ...), not tied to the presets in utils.js.
    this.data.eyeColor = U.pick(['#4a90d9','#2ecc71','#8b4513','#1a1a2e','#9b59b6','#e74c3c','#3498db','#795548','#27ae60','#6c5ce7']);
    this.data.faceShape = U.pick(FACE_SHAPES);
    this.data.outfit.top = U.hslToHex(U.rand(0,360), U.rand(50,100), U.rand(45,70));
    this.data.outfit.bottom = U.hslToHex(U.rand(0,360), U.rand(50,100), U.rand(30,60));
    Sound.play('sparkle');
    this._buildOptions();
    this.render();
  },

  // "Mystery": randomises, then covers the canvas with a translucent white rectangle and redraws
  // 300 ms later, which looks like a flash that reveals the new look. It draws on the canvas
  // directly and does not touch the data.
  mystery() {
    this.randomize();
    const c = document.getElementById('character-canvas');
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(0, 0, c.width, c.height);
    setTimeout(() => this.render(), 300);
    Sound.play('sparkle');
  },

  // Redraws the avatar on the canvas with the given id. By default the creator canvas, so
  // Character.render() refreshes the preview after any change; other ids and scales let other
  // screens reuse it. Silently returns if that canvas does not exist.
  render(canvasId = 'character-canvas', scale = 1) {
    const c = document.getElementById(canvasId);
    if (!c) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    // Draw centred horizontally (w/2) and slightly above the vertical middle (h * 0.50 = exactly the
    // middle, in this version) at the given scale.
    this.drawCharacter(ctx, this.data, w/2, h * 0.50, scale, w, h);
  },

  // Master draw routine. Paints the whole figure with the origin moved to (cx, cy).
  /* ============================
     MAIN CHARACTER DRAW
     ============================ */
  /**
   * Paints the avatar onto any 2D context.
   * @param {CanvasRenderingContext2D} ctx - Target context; its transform is saved and restored.
   * @param {Object} data - Appearance object shaped like Character.data.
   * @param {number} cx - X of the character's centre in canvas pixels.
   * @param {number} cy - Y of the character's centre in canvas pixels (the torso's middle).
   * @param {number} scale - Size multiplier (1 = 400x600 creator size; 0.55 = workshop preview).
   * @param {number} canvasW - Canvas width (currently unused by the routine).
   * @param {number} canvasH - Canvas height (currently unused by the routine).
   */
  drawCharacter(ctx, data, cx, cy, scale, canvasW, canvasH) {
    // Short alias; every measurement below is written as "number * s".
    const s = scale;

    // Save the context state (transform, styles) so this routine leaves the caller's canvas
    // exactly as it found it; ctx.restore() at the end matches it.
    ctx.save();

    // Move the origin to the character's centre so all coordinates below are relative to it.
    ctx.translate(cx, cy);

    // Skin shading palette derived from the base skin colour: a highlight (a little lighter, 5 points
    // less saturated) and a shadow (a bit darker, 5 points more saturated). Clamped to 0-100.
    const skinColor = data.skinTone;
    const [skinH, skinS, skinL] = U.hexToHsl(skinColor);
    const skinHighlight = U.hslToHex(skinH, Math.max(0,skinS-5), Math.min(100,skinL+8));
    const skinShadow = U.hslToHex(skinH, Math.min(100,skinS+5), Math.max(0,skinL-12));

    // Head radius and the head centre's vertical offset (negative = above the origin).
    const headR = 65 * s;
    const headY = -75 * s;

    // Legs are drawn first so the torso and shoes overlap their ends.
    // ===== 1. LEGS =====
    // The `|| '#9370db'` fallback protects old saved characters that lack outfit colours.
    const legColor = data.outfit.bottom || '#9370db';
    const [lgH,lgS,lgL] = U.hexToHsl(legColor);
    const legDark = U.hslToHex(lgH,lgS,Math.max(0,lgL-12));

    // Each leg is a closed shape made from a short straight top edge and curved sides (quadratic
    // Beziers) to give a soft, tapered look.
    // Left leg
    ctx.fillStyle = legColor;
    ctx.beginPath();
    ctx.moveTo(-22*s, 48*s);
    ctx.quadraticCurveTo(-26*s, 75*s, -22*s, 105*s);
    ctx.quadraticCurveTo(-20*s, 108*s, -10*s, 105*s);
    ctx.quadraticCurveTo(-8*s, 75*s, -10*s, 48*s);
    ctx.closePath();
    ctx.fill();
    // Right leg
    ctx.beginPath();
    ctx.moveTo(22*s, 48*s);
    ctx.quadraticCurveTo(26*s, 75*s, 22*s, 105*s);
    ctx.quadraticCurveTo(20*s, 108*s, 10*s, 105*s);
    ctx.quadraticCurveTo(8*s, 75*s, 10*s, 48*s);
    ctx.closePath();
    ctx.fill();

    // A faint darker oval down each leg (15% opacity) suggests roundness without a gradient.
    // Leg shading
    ctx.fillStyle = legDark;
    ctx.globalAlpha = 0.15;
    ctx.beginPath(); ctx.ellipse(-16*s, 78*s, 4*s, 20*s, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(16*s, 78*s, 4*s, 20*s, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

    // Fixed dark navy shoes; they are not customisable here (shoes are a Fashion Studio item).
    // ===== 2. SHOES =====
    const shoeColor = '#2c2c3a';
    ctx.fillStyle = shoeColor;
    // Cute rounded shoes
    ctx.beginPath();
    ctx.ellipse(-16*s, 110*s, 14*s, 7*s, -0.1, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(16*s, 110*s, 14*s, 7*s, 0.1, 0, Math.PI*2);
    ctx.fill();

    // Two translucent white ovals add a glossy highlight.
    // Shoe shine
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.ellipse(-18*s, 108*s, 6*s, 3*s, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(14*s, 108*s, 6*s, 3*s, 0, 0, Math.PI*2); ctx.fill();
    // Little heel detail
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.arc(-16*s, 112*s, 3*s, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(16*s, 112*s, 3*s, 0, Math.PI*2); ctx.fill();

    // Long styles (and braids/ponytail) have hair BEHIND the body, so it is drawn before the torso.
    // ===== 3. HAIR BACK LAYER =====
    this._drawHairBack(ctx, data, headR, headY, s);

    // ===== 4. TORSO =====
    // Torso colours: a lighter and a darker tint of the top colour for the gradient and neckline.
    const topColor = data.outfit.top || '#ff69b4';
    const [tH,tS,tL] = U.hexToHsl(topColor);
    const topLight = U.hslToHex(tH, Math.max(0,tS-10), Math.min(100,tL+12));
    const topDark = U.hslToHex(tH, Math.min(100,tS+5), Math.max(0,tL-15));

    // Torso: a rounded trapezoid (shoulders at y -10, waist at y 50) drawn with Beziers.
    // Body shape
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.moveTo(-28*s, -10*s);
    ctx.quadraticCurveTo(-36*s, 20*s, -28*s, 50*s);
    ctx.quadraticCurveTo(0, 56*s, 28*s, 50*s);
    ctx.quadraticCurveTo(36*s, 20*s, 28*s, -10*s);
    ctx.quadraticCurveTo(0, -16*s, -28*s, -10*s);
    ctx.closePath();
    ctx.fill();

    // Reuse the same torso path (no new beginPath) and fill it again with a diagonal gradient from a
    // white sheen at top-left to a slight shadow at bottom-right.
    // Torso highlight
    const topGrad = ctx.createLinearGradient(-20*s, -10*s, 20*s, 40*s);
    topGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
    topGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
    topGrad.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = topGrad;
    ctx.fill();

    // Neckline curve and two faint fold lines (12% opacity) for a fabric feel.
    // Collar/neckline
    ctx.strokeStyle = topDark;
    ctx.lineWidth = 1.5*s;
    ctx.beginPath();
    ctx.moveTo(-14*s, -10*s);
    ctx.quadraticCurveTo(0, -4*s, 14*s, -10*s);
    ctx.stroke();
    // Subtle fold lines
    ctx.strokeStyle = topDark;
    ctx.globalAlpha = 0.12;
    ctx.lineWidth = 1*s;
    ctx.beginPath(); ctx.moveTo(-8*s, 10*s); ctx.quadraticCurveTo(-5*s, 30*s, -10*s, 45*s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8*s, 10*s); ctx.quadraticCurveTo(5*s, 30*s, 10*s, 45*s); ctx.stroke();
    ctx.globalAlpha = 1;

    // Arms are skin-coloured tapering shapes outside the torso; hands are circles at their ends.
    // ===== 5. ARMS =====
    ctx.fillStyle = skinColor;
    // Left arm — tapered
    ctx.beginPath();
    ctx.moveTo(-30*s, -5*s);
    ctx.quadraticCurveTo(-42*s, 10*s, -38*s, 38*s);
    ctx.quadraticCurveTo(-36*s, 44*s, -32*s, 38*s);
    ctx.quadraticCurveTo(-28*s, 12*s, -25*s, -2*s);
    ctx.closePath();
    ctx.fill();
    // Right arm
    ctx.beginPath();
    ctx.moveTo(30*s, -5*s);
    ctx.quadraticCurveTo(42*s, 10*s, 38*s, 38*s);
    ctx.quadraticCurveTo(36*s, 44*s, 32*s, 38*s);
    ctx.quadraticCurveTo(28*s, 12*s, 25*s, -2*s);
    ctx.closePath();
    ctx.fill();

    // Highlight on the outer side of each arm; the angle (±0.15 rad) matches the arm's lean.
    // Arm highlight
    ctx.fillStyle = skinHighlight;
    ctx.globalAlpha = 0.25;
    ctx.beginPath(); ctx.ellipse(-35*s, 18*s, 3*s, 12*s, 0.15, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(35*s, 18*s, 3*s, 12*s, -0.15, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

    // Hands — small soft circles
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.arc(-35*s, 42*s, 6*s, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(35*s, 42*s, 6*s, 0, Math.PI*2); ctx.fill();

    // The neck joins the head and torso; drawn before the head so the head overlaps its top.
    // ===== 6. NECK =====
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.moveTo(-9*s, -12*s);
    ctx.quadraticCurveTo(-10*s, -22*s, -8*s, -28*s);
    ctx.lineTo(8*s, -28*s);
    ctx.quadraticCurveTo(10*s, -22*s, 9*s, -12*s);
    ctx.closePath();
    ctx.fill();

    // Faint shadow under the chin on the neck.
    // Neck shadow
    ctx.fillStyle = skinShadow;
    ctx.globalAlpha = 0.1;
    ctx.beginPath(); ctx.ellipse(0, -15*s, 8*s, 4*s, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

    // Head shape, ears and shading live in _drawHead.
    // ===== 7. HEAD =====
    this._drawHead(ctx, data, skinColor, skinHighlight, skinShadow, headR, headY, s);

    // Face feature placement: eyes sit 6 px below the head's centre and 22 px either side of the
    // vertical axis (scaled).
    // ===== 8. FACE FEATURES =====
    const eyeY = headY + 6*s;
    const eyeSpacing = 22*s;

    // Both eyes use the same routine; the isRight flag lets the 'cat' shape tilt each eye in
    // opposite directions.
    // Eyes
    this._drawEye(ctx, -eyeSpacing, eyeY, data, s, false);
    this._drawEye(ctx, eyeSpacing, eyeY, data, s, true);

    // Lashes: three short strokes per eye along the top arc, from 0.3*pi to 0.7*pi (the upper
    // part of the eye), longer for the 'big' eye shape.
    // Lashes (subtle top lashes)
    ctx.strokeStyle = '#2c2c3a';
    ctx.lineWidth = 1.8*s;
    ctx.lineCap = 'round';
    [-1,1].forEach(side => {
      const ex = side * eyeSpacing;
      const ew = data.eyeShape === 'big' ? 15*s : 12*s;
      for (let i = 0; i < 3; i++) {
        const a = (0.3 + i*0.2) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(ex + Math.cos(a)*ew*0.9, eyeY - Math.sin(a)*ew*0.7);
        ctx.lineTo(ex + Math.cos(a)*ew*1.15, eyeY - Math.sin(a)*ew*1.0);
        ctx.stroke();
      }
    });

    // Eyebrows are a darkened version of the hair colour so they always match, curved with one
    // Bezier per brow. The `side` factor (-1 or 1) mirrors the shape to the other side.
    // Eyebrows — soft arched
    ctx.strokeStyle = this._darken(data.hairColor, 8);
    ctx.lineWidth = 2.2 * s;
    ctx.lineCap = 'round';
    [-1,1].forEach(side => {
      const bx = side * eyeSpacing;
      ctx.beginPath();
      ctx.moveTo(bx - 10*s*side, eyeY - 17*s);
      ctx.quadraticCurveTo(bx, eyeY - 22*s, bx + 8*s*side, eyeY - 16*s);
      ctx.stroke();
    });

    // Nose: a tiny curved line plus a soft dot. The curve is stroked with whatever strokeStyle was
    // last set (the eyebrow colour) at 30% opacity, so it is a very faint line.
    // Nose — tiny cute dot with subtle line
    ctx.fillStyle = skinShadow;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(-2*s, headY + 14*s);
    ctx.quadraticCurveTo(0, headY + 18*s, 2*s, headY + 14*s);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = skinShadow;
    ctx.globalAlpha = 0.2;
    ctx.beginPath(); ctx.arc(0, headY + 17*s, 2*s, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

    // Mouth: an upper lip shape, a slightly darker lower lip, and two soft shine ellipses.
    // Mouth — cute glossy lips
    const mouthY = headY + 28*s;
    // Upper lip
    ctx.fillStyle = '#e8888a';
    ctx.beginPath();
    ctx.moveTo(-9*s, mouthY);
    ctx.quadraticCurveTo(-5*s, mouthY - 4*s, 0, mouthY - 2*s);
    ctx.quadraticCurveTo(5*s, mouthY - 4*s, 9*s, mouthY);
    ctx.quadraticCurveTo(5*s, mouthY + 2*s, 0, mouthY + 1*s);
    ctx.quadraticCurveTo(-5*s, mouthY + 2*s, -9*s, mouthY);
    ctx.closePath();
    ctx.fill();
    // Lower lip
    ctx.fillStyle = '#e07577';
    ctx.beginPath();
    ctx.moveTo(-8*s, mouthY + 1*s);
    ctx.quadraticCurveTo(0, mouthY + 8*s, 8*s, mouthY + 1*s);
    ctx.quadraticCurveTo(0, mouthY + 3*s, -8*s, mouthY + 1*s);
    ctx.closePath();
    ctx.fill();
    // Lip shine
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.ellipse(-3*s, mouthY - 1*s, 3*s, 1.5*s, -0.2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.ellipse(1*s, mouthY + 3*s, 4*s, 2*s, 0, 0, Math.PI*2); ctx.fill();

    // Blush: pale pink ovals on each cheek at 18% opacity, plus a small white sparkle on each.
    // Cheek blush — soft pink circles
    const blushColor = 'rgba(255,140,160,0.18)';
    ctx.fillStyle = blushColor;
    ctx.beginPath(); ctx.ellipse(-28*s, headY + 20*s, 12*s, 7*s, -0.1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(28*s, headY + 20*s, 12*s, 7*s, 0.1, 0, Math.PI*2); ctx.fill();
    // Blush sparkle
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(-30*s, headY + 18*s, 1.5*s, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(26*s, headY + 18*s, 1.5*s, 0, Math.PI*2); ctx.fill();

    // Front hair goes last so it overlaps the forehead and eyebrows.
    // ===== 9. HAIR FRONT =====
    this._drawHairFront(ctx, data, headR, headY, s);

    // Undo the translate/state changes from the beginning of the routine.
    ctx.restore();
  },

  // Head, ear and face-shape drawing.
  /* ===== HEAD SHAPE ===== */
  /**
   * Paints the head silhouette, soft lighting and ears.
   * @param {CanvasRenderingContext2D} ctx - Target context (origin already at the character's centre).
   * @param {Object} data - Appearance object; only faceShape is read here.
   * @param {string} skinColor - Base skin colour "#rrggbb".
   * @param {string} skinHighlight - Lighter skin tone for the highlight gradient.
   * @param {string} skinShadow - Darker skin tone for the inner ear.
   * @param {number} headR - Head radius in scaled pixels.
   * @param {number} headY - Head centre y in scaled pixels (negative = above origin).
   * @param {number} s - Scale factor.
   */
  _drawHead(ctx, data, skinColor, skinHighlight, skinShadow, headR, headY, s) {
    // Base head shape depends on faceShape: a circle; an ellipse narrower (0.88) and taller (1.08)
    // than the round head; a heart (two Beziers meeting at a chin point); or by default (the 'square' id) a
    // rounded rectangle whose bottom corners are rounder than the top.
    // Base head
    ctx.fillStyle = skinColor;
    if (data.faceShape === 'round') {
      ctx.beginPath(); ctx.arc(0, headY, headR, 0, Math.PI*2); ctx.fill();
    } else if (data.faceShape === 'oval') {
      ctx.beginPath(); ctx.ellipse(0, headY, headR*0.88, headR*1.08, 0, 0, Math.PI*2); ctx.fill();
    } else if (data.faceShape === 'heart') {
      ctx.beginPath();
      ctx.moveTo(0, headY + headR*0.82);
      ctx.bezierCurveTo(-headR*0.9, headY + headR*0.3, -headR*0.8, headY - headR*0.6, 0, headY - headR*0.5);
      ctx.bezierCurveTo(headR*0.8, headY - headR*0.6, headR*0.9, headY + headR*0.3, 0, headY + headR*0.82);
      ctx.fill();
    } else {
      const sqW = headR*0.82, sqH = headR*0.9, sqRad = headR*0.22;
      ctx.beginPath();
      ctx.moveTo(-sqW + sqRad, headY - sqH);
      ctx.arcTo(sqW, headY - sqH, sqW, headY + sqH, sqRad);
      ctx.arcTo(sqW, headY + sqH, -sqW, headY + sqH, sqRad*1.3);
      ctx.arcTo(-sqW, headY + sqH, -sqW, headY - sqH, sqRad*1.3);
      ctx.arcTo(-sqW, headY - sqH, sqW, headY - sqH, sqRad);
      ctx.fill();
    }

    // A radial gradient from the upper-left makes the face look lit from there. It always fills a
    // circle of radius headR (even for non-round heads), but at 30% opacity and fading to transparent,
    // so the mismatch is not visible.
    // Head highlight — soft light from upper-left
    const headGrad = ctx.createRadialGradient(-headR*0.3, headY - headR*0.4, 0, 0, headY, headR);
    headGrad.addColorStop(0, skinHighlight);
    headGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
    headGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = headGrad;
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.arc(0, headY, headR, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

    // Ears sit on the head's sides (88% of the radius), tilted slightly outward; the darker inner ear
    // is drawn at 20% opacity.
    // Ears — small, tucked
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.ellipse(-headR*0.88, headY + 4*s, 6*s, 9*s, -0.1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(headR*0.88, headY + 4*s, 6*s, 9*s, 0.1, 0, Math.PI*2); ctx.fill();
    // Inner ear
    ctx.fillStyle = skinShadow;
    ctx.globalAlpha = 0.2;
    ctx.beginPath(); ctx.ellipse(-headR*0.88, headY + 4*s, 3*s, 5*s, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(headR*0.88, headY + 4*s, 3*s, 5*s, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  },

  // Eyes: layered from back to front (white, outline, iris, ring, pupil, three highlights).
  /* ===== EYES (Luminous Doll-Style) ===== */
  /**
   * Paints one eye centred at (x, y).
   * @param {CanvasRenderingContext2D} ctx - Target context.
   * @param {number} x - Eye centre x (scaled pixels, relative to the origin).
   * @param {number} y - Eye centre y.
   * @param {Object} data - Appearance object; eyeShape and eyeColor are read.
   * @param {number} s - Scale factor.
   * @param {boolean} isRight - True for the character's right-hand (screen right) eye; only the
   *   'cat' shape uses it to mirror the tilt.
   */
  _drawEye(ctx, x, y, data, s, isRight) {
    const shape = data.eyeShape;

    // 'closed-happy' is a special case: a smiling arc with two lash dots and no iris, so it returns early.
    if (shape === 'closed-happy') {
      ctx.strokeStyle = '#2c2c3a';
      ctx.lineWidth = 2.5*s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y, 9*s, 0.65*Math.PI, 0.35*Math.PI, true);
      ctx.stroke();
      // Lash dots
      ctx.fillStyle = '#2c2c3a';
      ctx.beginPath(); ctx.arc(x - 8*s, y - 2*s, 1.2*s, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 8*s, y - 2*s, 1.2*s, 0, Math.PI*2); ctx.fill();
      return;
    }

    // Eye size by shape (horizontal ew, vertical eh): 'big' is largest, 'almond' wide but short,
    // 'cat' a bit narrower and taller than round; anything else is the default 12x12.
    const ew = shape === 'big' ? 15*s : shape === 'almond' ? 14*s : shape === 'cat' ? 13*s : 12*s;
    const eh = shape === 'almond' ? 9*s : shape === 'cat' ? 10*s : shape === 'big' ? 15*s : 12*s;

    // Cat eyes are tilted ±0.12 radians (about 7 degrees), mirrored left/right.
    const tilt = shape === 'cat' ? (isRight ? -0.12 : 0.12) : 0;

    // Sclera (white of the eye) with a very light lavender edge so it is not harsh white.
    // White sclera with subtle gradient
    const scleraGrad = ctx.createRadialGradient(x, y, 0, x, y, ew);
    scleraGrad.addColorStop(0, '#ffffff');
    scleraGrad.addColorStop(0.8, '#f8f4ff');
    scleraGrad.addColorStop(1, '#e8e0f0');
    ctx.fillStyle = scleraGrad;
    ctx.beginPath(); ctx.ellipse(x, y, ew, eh, tilt, 0, Math.PI*2); ctx.fill();

    // Stroke the ellipse path that was just filled to outline it (the path is still current).
    // Soft outline
    ctx.strokeStyle = 'rgba(60,40,80,0.2)';
    ctx.lineWidth = 1*s;
    ctx.stroke();

    // Iris: a radial gradient from a lighter centre (+20 lightness) to the base colour to a darker
    // rim (-20). `ir` is the iris radius; it is nudged 1 px right and 0.5 px down from the eye centre
    // so the gaze looks slightly forward rather than dead centre.
    // Iris — gradient orb
    const ir = shape === 'big' ? 10*s : 8*s;
    const irisGrad = ctx.createRadialGradient(x, y - ir*0.15, ir*0.2, x, y, ir);
    const [eH,eS,eL] = U.hexToHsl(data.eyeColor);
    irisGrad.addColorStop(0, U.hslToHex(eH, eS, Math.min(100,eL+20)));
    irisGrad.addColorStop(0.5, data.eyeColor);
    irisGrad.addColorStop(1, U.hslToHex(eH, eS, Math.max(0,eL-20)));
    ctx.fillStyle = irisGrad;
    ctx.beginPath(); ctx.arc(x + 1*s, y + 0.5*s, ir, 0, Math.PI*2); ctx.fill();

    // Faint darker ring inside the iris for detail.
    // Iris ring detail
    ctx.strokeStyle = U.hslToHex(eH, eS, Math.max(0,eL-15));
    ctx.lineWidth = 0.5*s;
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.arc(x + 1*s, y + 0.5*s, ir*0.75, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;

    // Pupil: a near-black dot at 42% of the iris radius.
    // Pupil
    ctx.fillStyle = '#15102a';
    ctx.beginPath(); ctx.arc(x + 1*s, y + 0.5*s, ir*0.42, 0, Math.PI*2); ctx.fill();

    // Three white highlights of decreasing size and opacity (92%, 60%, 40%) at different positions
    // give the glossy, doll-like look.
    // Main sparkle (big)
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.arc(x - 2.5*s, y - 3*s, ir*0.32, 0, Math.PI*2); ctx.fill();
    // Secondary sparkle
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(x + 3*s, y + 2.5*s, ir*0.18, 0, Math.PI*2); ctx.fill();
    // Tiny third sparkle
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(x - 1*s, y + 3*s, ir*0.1, 0, Math.PI*2); ctx.fill();

    // Soft shadow along the lower lid.
    // Bottom eyelid shadow
    ctx.fillStyle = 'rgba(60,40,80,0.06)';
    ctx.beginPath(); ctx.ellipse(x, y + eh*0.3, ew*0.8, eh*0.3, 0, 0, Math.PI); ctx.fill();
  },

  // Hair behind the body.
  /* ===== HAIR BACK ===== */
  /**
   * Paints the hair layers that sit behind the head and body (long hair, braids, ponytail).
   * @param {CanvasRenderingContext2D} ctx - Target context.
   * @param {Object} data - Appearance object; hairColor and hairStyle are read.
   * @param {number} headR - Head radius in scaled pixels.
   * @param {number} headY - Head centre y in scaled pixels.
   * @param {number} s - Scale factor.
   */
  _drawHairBack(ctx, data, headR, headY, s) {
    ctx.fillStyle = data.hairColor;
    const style = data.hairStyle;
    const [hH,hS,hL] = U.hexToHsl(data.hairColor);
    const hairDark = U.hslToHex(hH,hS,Math.max(0,hL-12));

    // 'long', 'wavy' and 'straight' share one back shape: a curtain from the temples down to about
    // 2.2 head radii below the head centre, with a curved hem. Other styles have no back hair
    // unless handled below.
    if (['long','wavy','straight'].includes(style)) {
      ctx.beginPath();
      ctx.moveTo(-headR*0.95, headY);
      ctx.quadraticCurveTo(-headR*1.1, headY + headR*1.4, -headR*0.65, headY + headR*2.2);
      ctx.quadraticCurveTo(0, headY + headR*2.5, headR*0.65, headY + headR*2.2);
      ctx.quadraticCurveTo(headR*1.1, headY + headR*1.4, headR*0.95, headY);
      ctx.closePath();
      ctx.fill();

      // Two faint lighter streaks (30% opacity) as hair shine.
      // Hair shine streak
      ctx.strokeStyle = U.hslToHex(hH, Math.max(0,hS-15), Math.min(100,hL+18));
      ctx.lineWidth = 2*s;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(-headR*0.4, headY + headR*0.5);
      ctx.quadraticCurveTo(-headR*0.35, headY + headR*1.2, -headR*0.45, headY + headR*1.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(headR*0.2, headY + headR*0.5);
      ctx.quadraticCurveTo(headR*0.25, headY + headR*1.2, headR*0.15, headY + headR*1.8);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Braids: two columns of overlapping small ellipses with a slight sine-wave wobble (by*0.08 radians
    // of phase per pixel, 3 px amplitude), one every 10 px, ending in a pink tie.
    if (style === 'braids') {
      [-30*s, 30*s].forEach(bx => {
        ctx.fillStyle = data.hairColor;
        for (let by = headY + headR*0.5; by < headY + headR*2.4; by += 10*s) {
          const wobble = Math.sin(by*0.08)*3*s;
          ctx.beginPath();
          ctx.ellipse(bx + wobble, by, 8*s, 6*s, wobble*0.05, 0, Math.PI*2);
          ctx.fill();
        }
        // Braid ties
        ctx.fillStyle = '#FF69B4';
        ctx.beginPath(); ctx.arc(bx, headY + headR*2.3, 4*s, 0, Math.PI*2); ctx.fill();
      });
    }

    // Ponytail: a tapered shape swinging out from the upper right with a pink tie at the gather point.
    if (style === 'ponytail') {
      ctx.beginPath();
      ctx.moveTo(8*s, headY - headR*0.6);
      ctx.quadraticCurveTo(headR*1.4, headY - headR*0.3, headR*0.8, headY + headR*1.5);
      ctx.quadraticCurveTo(headR*0.4, headY + headR*1.8, 8*s, headY + headR*0.5);
      ctx.closePath();
      ctx.fill();
      // Hair tie
      ctx.fillStyle = '#FF69B4';
      ctx.beginPath(); ctx.arc(10*s, headY - headR*0.55, 5*s, 0, Math.PI*2); ctx.fill();
    }
  },

  /* ===== HAIR FRONT ===== */
  /**
   * Paints the hair layers in front of the head: the cap over the forehead and style-specific parts.
   * @param {CanvasRenderingContext2D} ctx - Target context.
   * @param {Object} data - Appearance object; hairColor and hairStyle are read.
   * @param {number} headR - Head radius in scaled pixels.
   * @param {number} headY - Head centre y in scaled pixels.
   * @param {number} s - Scale factor.
   */
  _drawHairFront(ctx, data, headR, headY, s) {
    ctx.fillStyle = data.hairColor;
    const style = data.hairStyle;
    const [hH,hS,hL] = U.hexToHsl(data.hairColor);
    const hairShine = U.hslToHex(hH, Math.max(0,hS-15), Math.min(100,hL+20));

    // Every style gets a smooth half-ellipse cap across the top of the head (centre 0.38 radii above
    // the head centre, 1.1 wide by 0.52 tall). The `true` flag draws the arc counter-clockwise so it forms the
    // upper half.
    // Hair cap — all styles get a smooth top
    ctx.beginPath();
    ctx.ellipse(0, headY - headR*0.38, headR*1.1, headR*0.52, 0, Math.PI, 0, true);
    ctx.fill();
    // Fill gap - removed as it caused a "visor" band across the forehead

    // A lighter, translucent oval on the cap acts as the hair highlight.
    // Shine on hair cap
    ctx.fillStyle = hairShine;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.ellipse(-headR*0.15, headY - headR*0.65, headR*0.5, headR*0.18, -0.15, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = data.hairColor;

    // 'bob': two short side panels hanging past the cheeks to about chin level.
    if (style === 'bob') {
      // Side panels
      ctx.beginPath();
      ctx.moveTo(-headR*0.98, headY - headR*0.1);
      ctx.quadraticCurveTo(-headR*1.12, headY + headR*0.35, -headR*0.7, headY + headR*0.6);
      ctx.quadraticCurveTo(-headR*0.6, headY + headR*0.55, -headR*0.55, headY);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(headR*0.98, headY - headR*0.1);
      ctx.quadraticCurveTo(headR*1.12, headY + headR*0.35, headR*0.7, headY + headR*0.6);
      ctx.quadraticCurveTo(headR*0.6, headY + headR*0.55, headR*0.55, headY);
      ctx.closePath();
      ctx.fill();
    }

    // 'pixie': a swept fringe across the forehead.
    if (style === 'pixie') {
      ctx.beginPath();
      ctx.moveTo(-headR*0.5, headY - headR*0.35);
      ctx.quadraticCurveTo(headR*0.3, headY - headR*0.95, headR*0.8, headY - headR*0.15);
      ctx.lineTo(headR*0.4, headY - headR*0.05);
      ctx.lineTo(-headR*0.1, headY - headR*0.1);
      ctx.closePath();
      ctx.fill();
    }

    // 'curly' and 'afro': a ring of overlapping circles around the upper head (angles from 0 down to
    // -pi, i.e. the top half) plus one circle on each side. The afro uses a larger ring (1.32 vs
    // 1.15 head radii) so it is fluffier.
    if (style === 'curly' || style === 'afro') {
      const extraR = style === 'afro' ? 1.32 : 1.15;
      for (let a = 0; a > -Math.PI; a -= 0.3) {
        ctx.beginPath();
        ctx.arc(Math.cos(a)*headR*extraR, headY + Math.sin(a)*headR*extraR, headR*0.28, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.beginPath(); ctx.arc(-headR*extraR, headY + 12*s, headR*0.26, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(headR*extraR, headY + 12*s, headR*0.26, 0, Math.PI*2); ctx.fill();
    }

    // 'buns': two circles on top with small highlights. The fillStyle is reset at the end because the
    // highlight changed it.
    if (style === 'buns') {
      ctx.beginPath(); ctx.arc(-headR*0.52, headY - headR*0.82, headR*0.3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(headR*0.52, headY - headR*0.82, headR*0.3, 0, Math.PI*2); ctx.fill();
      // Bun shine
      ctx.fillStyle = hairShine;
      ctx.globalAlpha = 0.25;
      ctx.beginPath(); ctx.arc(-headR*0.55, headY - headR*0.88, headR*0.12, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(headR*0.49, headY - headR*0.88, headR*0.12, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = data.hairColor;
    }

    // 'mohawk': five circles in a row above the head whose heights follow a sine curve for a
    // rippled crest.
    if (style === 'mohawk') {
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const mx = (i-2)*headR*0.24;
        const my = headY - headR*0.7 - Math.sin(i*0.8+0.5)*14*s;
        ctx.arc(mx, my, headR*0.2, 0, Math.PI*2);
        ctx.fill();
      }
    }

    // 'sidepart': a fringe swept from one side of the forehead across to the other.
    if (style === 'sidepart') {
      ctx.beginPath();
      ctx.moveTo(-headR*0.85, headY - headR*0.3);
      ctx.quadraticCurveTo(-headR*0.2, headY - headR*0.75, headR*0.5, headY - headR*0.25);
      ctx.lineTo(headR*0.3, headY - headR*0.05);
      ctx.lineTo(-headR*0.4, headY - headR*0.02);
      ctx.closePath();
      ctx.fill();
    }

    // Faint strand arc for styles with smooth hair (15% opacity) to avoid a flat look.
    // Subtle hair strand lines for polish
    if (['long','wavy','straight','sidepart','bob'].includes(style)) {
      ctx.strokeStyle = this._darken(data.hairColor, 10);
      ctx.lineWidth = 1*s;
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.arc(0, headY - headR*0.05, headR*0.88, 0.8*Math.PI, 0.2*Math.PI, true);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },

  /**
   * Returns a darker version of a colour.
   * @param {string} hex - Colour as "#rrggbb".
   * @param {number} amount - Lightness points (0-100 scale) to subtract; the result is floored at 0.
   * @returns {string} The darker "#rrggbb" colour (hue and saturation unchanged).
   */
  _darken(hex, amount) {
    const [h, s, l] = U.hexToHsl(hex);
    return U.hslToHex(h, s, Math.max(0, l - amount));
  },

  /**
   * Returns a deep copy of the appearance data (via JSON round trip) so saved state and the live
   * object do not share references; Game.finishCharacter() stores this copy in the save file.
   * @returns {Object} New object shaped like Character.data.
   */
  getData() { return JSON.parse(JSON.stringify(this.data)); },

  /**
   * Restores the factory-default appearance (the literal at the top of this object). Called by Game.newGame()
   * so a new game does not inherit the previous game's avatar. Replaces this.data with a fresh deep copy of
   * DEFAULTS, so the object saved in Game.state.character is never mutated through it later.
   */
  reset() { this.data = JSON.parse(JSON.stringify(this.DEFAULTS)); },

  /**
   * Replaces the appearance data wholesale (for example when loading a saved game) and refreshes
   * the creator UI and canvas. Note that Game.init() assigns Character.data directly instead of
   * calling this.
   * @param {Object} d - Appearance object shaped like Character.data (not copied; the caller
   *   should not keep editing it).
   */
  setData(d) {
    this.data = d;
    this._buildOptions();
    this.render();
  }
};

// Snapshot of the default look, taken right after the object literal above is created (before any edit can
// happen). reset() clones it; keeping one snapshot avoids duplicating the default literal in two places.
Character.DEFAULTS = JSON.parse(JSON.stringify(Character.data));
