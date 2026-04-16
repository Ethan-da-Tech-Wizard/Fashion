/* ===== CHARACTER CREATION & RENDERING (Overhaul v2) ===== */
const Character = {
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

  init() {
    this._buildOptions();
    this._setupColorCallbacks();
    this.render();
  },

  _buildOptions() {
    // Face shapes
    const faceRow = document.getElementById('face-shapes');
    if (!faceRow) return;
    faceRow.innerHTML = '';
    const faceLabels = { round: 'Round', oval: 'Oval', heart: 'Heart', square: 'Soft' };
    FACE_SHAPES.forEach(f => {
      const btn = document.createElement('button');
      btn.className = 'opt-btn' + (this.data.faceShape === f ? ' active' : '');
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
      btn.onclick = () => {
        this.data.faceShape = f;
        faceRow.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Sound.play('click');
        this.render();
      };
      faceRow.appendChild(btn);
    });

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

    // Set color buttons
    document.getElementById('skin-color-pick').style.background = this.data.skinTone;
    document.getElementById('hair-color-pick').style.background = this.data.hairColor;
    document.getElementById('eye-color-pick').style.background = this.data.eyeColor;
  },

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

  _drawMiniEyePreview(ctx, shape, cx, cy) {
    ctx.fillStyle = '#fff';
    if (shape === 'closed-happy') {
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0.7*Math.PI, 0.3*Math.PI, true); ctx.stroke();
      return;
    }
    const ew = shape === 'big' ? 10 : shape === 'cat' ? 9 : 8;
    const eh = shape === 'big' ? 10 : shape === 'almond' ? 6 : 8;
    const tilt = shape === 'cat' ? 0.2 : 0;
    ctx.beginPath(); ctx.ellipse(cx, cy, ew, eh, tilt, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#4a90d9'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(cx-2, cy-2, 1.8, 0, Math.PI*2); ctx.fill();
  },

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

  randomize() {
    this.data.skinTone = U.pick(SKIN_PRESETS);
    this.data.hairColor = U.pick(HAIR_COLOR_PRESETS);
    this.data.hairStyle = U.pick(HAIR_STYLES);
    this.data.eyeShape = U.pick(EYE_SHAPES);
    this.data.eyeColor = U.pick(['#4a90d9','#2ecc71','#8b4513','#1a1a2e','#9b59b6','#e74c3c','#3498db','#795548','#27ae60','#6c5ce7']);
    this.data.faceShape = U.pick(FACE_SHAPES);
    this.data.outfit.top = U.hslToHex(U.rand(0,360), U.rand(50,100), U.rand(45,70));
    this.data.outfit.bottom = U.hslToHex(U.rand(0,360), U.rand(50,100), U.rand(30,60));
    Sound.play('sparkle');
    this._buildOptions();
    this.render();
  },

  mystery() {
    this.randomize();
    const c = document.getElementById('character-canvas');
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(0, 0, c.width, c.height);
    setTimeout(() => this.render(), 300);
    Sound.play('sparkle');
  },

  render(canvasId = 'character-canvas', scale = 1) {
    const c = document.getElementById(canvasId);
    if (!c) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);
    this.drawCharacter(ctx, this.data, w/2, h * 0.50, scale, w, h);
  },

  /* ============================
     MAIN CHARACTER DRAW
     ============================ */
  drawCharacter(ctx, data, cx, cy, scale, canvasW, canvasH) {
    const s = scale;
    ctx.save();
    ctx.translate(cx, cy);

    const skinColor = data.skinTone;
    const [skinH, skinS, skinL] = U.hexToHsl(skinColor);
    const skinHighlight = U.hslToHex(skinH, Math.max(0,skinS-5), Math.min(100,skinL+8));
    const skinShadow = U.hslToHex(skinH, Math.min(100,skinS+5), Math.max(0,skinL-12));
    const headR = 65 * s;
    const headY = -75 * s;

    // ===== 1. LEGS =====
    const legColor = data.outfit.bottom || '#9370db';
    const [lgH,lgS,lgL] = U.hexToHsl(legColor);
    const legDark = U.hslToHex(lgH,lgS,Math.max(0,lgL-12));
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
    // Leg shading
    ctx.fillStyle = legDark;
    ctx.globalAlpha = 0.15;
    ctx.beginPath(); ctx.ellipse(-16*s, 78*s, 4*s, 20*s, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(16*s, 78*s, 4*s, 20*s, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

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
    // Shoe shine
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.ellipse(-18*s, 108*s, 6*s, 3*s, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(14*s, 108*s, 6*s, 3*s, 0, 0, Math.PI*2); ctx.fill();
    // Little heel detail
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.arc(-16*s, 112*s, 3*s, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(16*s, 112*s, 3*s, 0, Math.PI*2); ctx.fill();

    // ===== 3. HAIR BACK LAYER =====
    this._drawHairBack(ctx, data, headR, headY, s);

    // ===== 4. TORSO =====
    const topColor = data.outfit.top || '#ff69b4';
    const [tH,tS,tL] = U.hexToHsl(topColor);
    const topLight = U.hslToHex(tH, Math.max(0,tS-10), Math.min(100,tL+12));
    const topDark = U.hslToHex(tH, Math.min(100,tS+5), Math.max(0,tL-15));
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
    // Torso highlight
    const topGrad = ctx.createLinearGradient(-20*s, -10*s, 20*s, 40*s);
    topGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
    topGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
    topGrad.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = topGrad;
    ctx.fill();
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

    // ===== 6. NECK =====
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.moveTo(-9*s, -12*s);
    ctx.quadraticCurveTo(-10*s, -22*s, -8*s, -28*s);
    ctx.lineTo(8*s, -28*s);
    ctx.quadraticCurveTo(10*s, -22*s, 9*s, -12*s);
    ctx.closePath();
    ctx.fill();
    // Neck shadow
    ctx.fillStyle = skinShadow;
    ctx.globalAlpha = 0.1;
    ctx.beginPath(); ctx.ellipse(0, -15*s, 8*s, 4*s, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

    // ===== 7. HEAD =====
    this._drawHead(ctx, data, skinColor, skinHighlight, skinShadow, headR, headY, s);

    // ===== 8. FACE FEATURES =====
    const eyeY = headY + 6*s;
    const eyeSpacing = 22*s;

    // Eyes
    this._drawEye(ctx, -eyeSpacing, eyeY, data, s, false);
    this._drawEye(ctx, eyeSpacing, eyeY, data, s, true);

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

    // Cheek blush — soft pink circles
    const blushColor = 'rgba(255,140,160,0.18)';
    ctx.fillStyle = blushColor;
    ctx.beginPath(); ctx.ellipse(-28*s, headY + 20*s, 12*s, 7*s, -0.1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(28*s, headY + 20*s, 12*s, 7*s, 0.1, 0, Math.PI*2); ctx.fill();
    // Blush sparkle
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(-30*s, headY + 18*s, 1.5*s, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(26*s, headY + 18*s, 1.5*s, 0, Math.PI*2); ctx.fill();

    // ===== 9. HAIR FRONT =====
    this._drawHairFront(ctx, data, headR, headY, s);

    ctx.restore();
  },

  /* ===== HEAD SHAPE ===== */
  _drawHead(ctx, data, skinColor, skinHighlight, skinShadow, headR, headY, s) {
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
    // Head highlight — soft light from upper-left
    const headGrad = ctx.createRadialGradient(-headR*0.3, headY - headR*0.4, 0, 0, headY, headR);
    headGrad.addColorStop(0, skinHighlight);
    headGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
    headGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = headGrad;
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.arc(0, headY, headR, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

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

  /* ===== EYES (Luminous Doll-Style) ===== */
  _drawEye(ctx, x, y, data, s, isRight) {
    const shape = data.eyeShape;
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

    const ew = shape === 'big' ? 15*s : shape === 'almond' ? 14*s : shape === 'cat' ? 13*s : 12*s;
    const eh = shape === 'almond' ? 9*s : shape === 'cat' ? 10*s : shape === 'big' ? 15*s : 12*s;
    const tilt = shape === 'cat' ? (isRight ? -0.12 : 0.12) : 0;

    // White sclera with subtle gradient
    const scleraGrad = ctx.createRadialGradient(x, y, 0, x, y, ew);
    scleraGrad.addColorStop(0, '#ffffff');
    scleraGrad.addColorStop(0.8, '#f8f4ff');
    scleraGrad.addColorStop(1, '#e8e0f0');
    ctx.fillStyle = scleraGrad;
    ctx.beginPath(); ctx.ellipse(x, y, ew, eh, tilt, 0, Math.PI*2); ctx.fill();

    // Soft outline
    ctx.strokeStyle = 'rgba(60,40,80,0.2)';
    ctx.lineWidth = 1*s;
    ctx.stroke();

    // Iris — gradient orb
    const ir = shape === 'big' ? 10*s : 8*s;
    const irisGrad = ctx.createRadialGradient(x, y - ir*0.15, ir*0.2, x, y, ir);
    const [eH,eS,eL] = U.hexToHsl(data.eyeColor);
    irisGrad.addColorStop(0, U.hslToHex(eH, eS, Math.min(100,eL+20)));
    irisGrad.addColorStop(0.5, data.eyeColor);
    irisGrad.addColorStop(1, U.hslToHex(eH, eS, Math.max(0,eL-20)));
    ctx.fillStyle = irisGrad;
    ctx.beginPath(); ctx.arc(x + 1*s, y + 0.5*s, ir, 0, Math.PI*2); ctx.fill();

    // Iris ring detail
    ctx.strokeStyle = U.hslToHex(eH, eS, Math.max(0,eL-15));
    ctx.lineWidth = 0.5*s;
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.arc(x + 1*s, y + 0.5*s, ir*0.75, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;

    // Pupil
    ctx.fillStyle = '#15102a';
    ctx.beginPath(); ctx.arc(x + 1*s, y + 0.5*s, ir*0.42, 0, Math.PI*2); ctx.fill();

    // Main sparkle (big)
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.arc(x - 2.5*s, y - 3*s, ir*0.32, 0, Math.PI*2); ctx.fill();
    // Secondary sparkle
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(x + 3*s, y + 2.5*s, ir*0.18, 0, Math.PI*2); ctx.fill();
    // Tiny third sparkle
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(x - 1*s, y + 3*s, ir*0.1, 0, Math.PI*2); ctx.fill();

    // Bottom eyelid shadow
    ctx.fillStyle = 'rgba(60,40,80,0.06)';
    ctx.beginPath(); ctx.ellipse(x, y + eh*0.3, ew*0.8, eh*0.3, 0, 0, Math.PI); ctx.fill();
  },

  /* ===== HAIR BACK ===== */
  _drawHairBack(ctx, data, headR, headY, s) {
    ctx.fillStyle = data.hairColor;
    const style = data.hairStyle;
    const [hH,hS,hL] = U.hexToHsl(data.hairColor);
    const hairDark = U.hslToHex(hH,hS,Math.max(0,hL-12));

    if (['long','wavy','straight'].includes(style)) {
      ctx.beginPath();
      ctx.moveTo(-headR*0.95, headY);
      ctx.quadraticCurveTo(-headR*1.1, headY + headR*1.4, -headR*0.65, headY + headR*2.2);
      ctx.quadraticCurveTo(0, headY + headR*2.5, headR*0.65, headY + headR*2.2);
      ctx.quadraticCurveTo(headR*1.1, headY + headR*1.4, headR*0.95, headY);
      ctx.closePath();
      ctx.fill();
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
  _drawHairFront(ctx, data, headR, headY, s) {
    ctx.fillStyle = data.hairColor;
    const style = data.hairStyle;
    const [hH,hS,hL] = U.hexToHsl(data.hairColor);
    const hairShine = U.hslToHex(hH, Math.max(0,hS-15), Math.min(100,hL+20));

    // Hair cap — all styles get a smooth top
    ctx.beginPath();
    ctx.ellipse(0, headY - headR*0.38, headR*1.1, headR*0.52, 0, Math.PI, 0, true);
    ctx.fill();
    // Fill gap - removed as it caused a "visor" band across the forehead

    // Shine on hair cap
    ctx.fillStyle = hairShine;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.ellipse(-headR*0.15, headY - headR*0.65, headR*0.5, headR*0.18, -0.15, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = data.hairColor;

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
    if (style === 'pixie') {
      ctx.beginPath();
      ctx.moveTo(-headR*0.5, headY - headR*0.35);
      ctx.quadraticCurveTo(headR*0.3, headY - headR*0.95, headR*0.8, headY - headR*0.15);
      ctx.lineTo(headR*0.4, headY - headR*0.05);
      ctx.lineTo(-headR*0.1, headY - headR*0.1);
      ctx.closePath();
      ctx.fill();
    }
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
    if (style === 'mohawk') {
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const mx = (i-2)*headR*0.24;
        const my = headY - headR*0.7 - Math.sin(i*0.8+0.5)*14*s;
        ctx.arc(mx, my, headR*0.2, 0, Math.PI*2);
        ctx.fill();
      }
    }
    if (style === 'sidepart') {
      ctx.beginPath();
      ctx.moveTo(-headR*0.85, headY - headR*0.3);
      ctx.quadraticCurveTo(-headR*0.2, headY - headR*0.75, headR*0.5, headY - headR*0.25);
      ctx.lineTo(headR*0.3, headY - headR*0.05);
      ctx.lineTo(-headR*0.4, headY - headR*0.02);
      ctx.closePath();
      ctx.fill();
    }

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

  _darken(hex, amount) {
    const [h, s, l] = U.hexToHsl(hex);
    return U.hslToHex(h, s, Math.max(0, l - amount));
  },

  getData() { return JSON.parse(JSON.stringify(this.data)); },

  setData(d) {
    this.data = d;
    this._buildOptions();
    this.render();
  }
};
