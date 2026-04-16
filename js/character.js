/* ===== CHARACTER CREATION & RENDERING ===== */
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
    FACE_SHAPES.forEach(f => {
      const btn = document.createElement('button');
      btn.className = 'opt-btn' + (this.data.faceShape === f ? ' active' : '');
      btn.textContent = f === 'round' ? '⭕' : f === 'oval' ? '🥚' : f === 'heart' ? '💜' : '⬜';
      btn.title = f;
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
    const hairEmojis = { bob:'✂️', long:'👩', pixie:'💇', curly:'🌀', braids:'🎀', ponytail:'👧',
      buns:'🍡', mohawk:'⚡', wavy:'〰️', afro:'🟤', straight:'📏', sidepart:'↗️' };
    HAIR_STYLES.forEach(h => {
      const btn = document.createElement('button');
      btn.className = 'opt-btn' + (this.data.hairStyle === h ? ' active' : '');
      btn.textContent = hairEmojis[h] || '💇';
      btn.title = h;
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
    const eyeEmojis = { round:'👁️', almond:'👀', cat:'🐱', big:'🔵', 'closed-happy':'😊' };
    EYE_SHAPES.forEach(e => {
      const btn = document.createElement('button');
      btn.className = 'opt-btn' + (this.data.eyeShape === e ? ' active' : '');
      btn.textContent = eyeEmojis[e] || '👁️';
      btn.title = e;
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

  _setupColorCallbacks() {
    // Override color wheel open to set proper callbacks
    const origOpen = ColorWheel.open.bind(ColorWheel);
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
    this.data.eyeColor = U.pick(['#4a90d9','#2ecc71','#8b4513','#1a1a2e','#9b59b6','#e74c3c','#3498db','#795548']);
    this.data.faceShape = U.pick(FACE_SHAPES);
    this.data.outfit.top = U.hslToHex(U.rand(0,360), U.rand(50,100), U.rand(40,70));
    this.data.outfit.bottom = U.hslToHex(U.rand(0,360), U.rand(50,100), U.rand(30,60));
    Sound.play('sparkle');
    this._buildOptions();
    this.render();
  },

  mystery() {
    this.randomize();
    // Flash effect on canvas
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
    this.drawCharacter(ctx, this.data, w/2, h * 0.52, scale, w, h);
  },

  drawCharacter(ctx, data, cx, cy, scale, canvasW, canvasH) {
    const s = scale;
    ctx.save();
    ctx.translate(cx, cy);

    const skinColor = data.skinTone;
    const skinDark = this._darken(skinColor, 15);
    const headR = 60 * s;
    const headY = -70 * s;

    // ===== 1. LEGS (bottom-most) =====
    ctx.fillStyle = data.outfit.bottom || '#9370db';
    ctx.beginPath();
    ctx.ellipse(-18*s, 75*s, 15*s, 40*s, -0.05, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(18*s, 75*s, 15*s, 40*s, 0.05, 0, Math.PI*2);
    ctx.fill();

    // ===== 2. SHOES =====
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.ellipse(-18*s, 115*s, 17*s, 8*s, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(18*s, 115*s, 17*s, 8*s, 0, 0, Math.PI*2);
    ctx.fill();
    // Shoe highlight
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.ellipse(-18*s, 113*s, 10*s, 4*s, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(18*s, 113*s, 10*s, 4*s, 0, 0, Math.PI*2);
    ctx.fill();

    // ===== 3. HAIR BACK LAYER (behind head) =====
    this._drawHairBack(ctx, data, headR, headY, s);

    // ===== 4. TORSO =====
    ctx.fillStyle = data.outfit.top || '#ff69b4';
    ctx.beginPath();
    ctx.ellipse(0, 20*s, 32*s, 38*s, 0, 0, Math.PI*2);
    ctx.fill();
    // Collar detail
    ctx.strokeStyle = this._darken(data.outfit.top || '#ff69b4', 15);
    ctx.lineWidth = 1.5*s;
    ctx.beginPath();
    ctx.arc(0, -12*s, 14*s, 0.15*Math.PI, 0.85*Math.PI);
    ctx.stroke();

    // ===== 5. ARMS =====
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(-40*s, 18*s, 10*s, 32*s, 0.25, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(40*s, 18*s, 10*s, 32*s, -0.25, 0, Math.PI*2);
    ctx.fill();

    // Hands
    ctx.beginPath();
    ctx.arc(-40*s, 48*s, 8*s, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(40*s, 48*s, 8*s, 0, Math.PI*2);
    ctx.fill();

    // ===== 6. NECK =====
    ctx.fillStyle = skinColor;
    ctx.fillRect(-8*s, -20*s, 16*s, 18*s);

    // ===== 7. HEAD =====
    ctx.fillStyle = skinColor;
    if (data.faceShape === 'round') {
      ctx.beginPath();
      ctx.arc(0, headY, headR, 0, Math.PI*2);
      ctx.fill();
    } else if (data.faceShape === 'oval') {
      ctx.beginPath();
      ctx.ellipse(0, headY, headR * 0.88, headR * 1.08, 0, 0, Math.PI*2);
      ctx.fill();
    } else if (data.faceShape === 'heart') {
      ctx.beginPath();
      ctx.moveTo(0, headY + headR*0.85);
      ctx.quadraticCurveTo(-headR*0.9, headY + headR*0.3, -headR*0.7, headY - headR*0.2);
      ctx.quadraticCurveTo(-headR*0.5, headY - headR*0.8, 0, headY - headR*0.6);
      ctx.quadraticCurveTo(headR*0.5, headY - headR*0.8, headR*0.7, headY - headR*0.2);
      ctx.quadraticCurveTo(headR*0.9, headY + headR*0.3, 0, headY + headR*0.85);
      ctx.closePath();
      ctx.fill();
    } else { // square
      const sqW = headR*0.82, sqH = headR*0.9, sqRad = headR*0.18;
      ctx.beginPath();
      ctx.moveTo(-sqW + sqRad, headY - sqH);
      ctx.arcTo(sqW, headY - sqH, sqW, headY + sqH, sqRad);
      ctx.arcTo(sqW, headY + sqH, -sqW, headY + sqH, sqRad);
      ctx.arcTo(-sqW, headY + sqH, -sqW, headY - sqH, sqRad);
      ctx.arcTo(-sqW, headY - sqH, sqW, headY - sqH, sqRad);
      ctx.closePath();
      ctx.fill();
    }

    // ===== 8. EARS =====
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(-headR*0.9, headY + 2*s, 7*s, 10*s, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headR*0.9, headY + 2*s, 7*s, 10*s, 0, 0, Math.PI*2);
    ctx.fill();
    // Inner ear
    ctx.fillStyle = this._darken(skinColor, 8);
    ctx.beginPath();
    ctx.ellipse(-headR*0.9, headY + 2*s, 4*s, 6*s, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headR*0.9, headY + 2*s, 4*s, 6*s, 0, 0, Math.PI*2);
    ctx.fill();

    // ===== 9. EYES =====
    const eyeY = headY + 4*s;
    const eyeSpacing = 20*s;
    this._drawEye(ctx, -eyeSpacing, eyeY, data, s, false);
    this._drawEye(ctx, eyeSpacing, eyeY, data, s, true);

    // ===== 10. EYEBROWS =====
    ctx.strokeStyle = this._darken(data.hairColor, 10);
    ctx.lineWidth = 2.5 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-eyeSpacing - 9*s, eyeY - 15*s);
    ctx.quadraticCurveTo(-eyeSpacing, eyeY - 20*s, -eyeSpacing + 9*s, eyeY - 15*s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(eyeSpacing - 9*s, eyeY - 15*s);
    ctx.quadraticCurveTo(eyeSpacing, eyeY - 20*s, eyeSpacing + 9*s, eyeY - 15*s);
    ctx.stroke();

    // ===== 11. NOSE =====
    ctx.fillStyle = skinDark;
    ctx.beginPath();
    ctx.arc(0, headY + 16*s, 3*s, 0, Math.PI*2);
    ctx.fill();

    // ===== 12. MOUTH =====
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2.5 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, headY + 28*s, 10*s, 0.15*Math.PI, 0.85*Math.PI);
    ctx.stroke();
    // Lip shine
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, headY + 26*s, 5*s, 2*s, 0, 0, Math.PI*2);
    ctx.fill();

    // ===== 13. BLUSH =====
    ctx.fillStyle = 'rgba(255,150,170,0.22)';
    ctx.beginPath();
    ctx.ellipse(-26*s, headY + 18*s, 10*s, 6*s, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(26*s, headY + 18*s, 10*s, 6*s, 0, 0, Math.PI*2);
    ctx.fill();

    // ===== 14. HAIR FRONT (bangs only — must not cover face) =====
    this._drawHairFront(ctx, data, headR, headY, s);

    ctx.restore();
  },

  _drawEye(ctx, x, y, data, s, isRight) {
    const shape = data.eyeShape;
    if (shape === 'closed-happy') {
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 2.5*s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y, 8*s, 0.7*Math.PI, 0.3*Math.PI, true);
      ctx.stroke();
      return;
    }
    // White sclera
    ctx.fillStyle = '#fff';
    const ew = shape === 'big' ? 14*s : shape === 'almond' ? 13*s : 11*s;
    const eh = shape === 'almond' ? 8*s : shape === 'cat' ? 9*s : shape === 'big' ? 14*s : 11*s;
    const tilt = shape === 'cat' ? (isRight ? -0.15 : 0.15) : 0;
    ctx.beginPath();
    ctx.ellipse(x, y, ew, eh, tilt, 0, Math.PI*2);
    ctx.fill();
    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1*s;
    ctx.stroke();

    // Iris
    const ir = shape === 'big' ? 9*s : 7*s;
    ctx.fillStyle = data.eyeColor;
    ctx.beginPath();
    ctx.arc(x + 1*s, y, ir, 0, Math.PI*2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(x + 1*s, y, ir*0.5, 0, Math.PI*2);
    ctx.fill();

    // Highlights
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x - 2*s, y - 3*s, ir*0.32, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(x + 3*s, y + 2*s, ir*0.18, 0, Math.PI*2);
    ctx.fill();
  },

  _drawHairBack(ctx, data, headR, headY, s) {
    ctx.fillStyle = data.hairColor;
    const style = data.hairStyle;

    if (['long','wavy','straight'].includes(style)) {
      ctx.beginPath();
      ctx.moveTo(-headR*0.95, headY - headR*0.1);
      ctx.quadraticCurveTo(-headR*1.05, headY + headR*1.2, -headR*0.6, headY + headR*1.8);
      ctx.quadraticCurveTo(0, headY + headR*2, headR*0.6, headY + headR*1.8);
      ctx.quadraticCurveTo(headR*1.05, headY + headR*1.2, headR*0.95, headY - headR*0.1);
      ctx.closePath();
      ctx.fill();
    }
    if (style === 'braids') {
      [-28*s, 28*s].forEach(bx => {
        for (let by = headY + headR*0.5; by < headY + headR*2.2; by += 11*s) {
          ctx.beginPath();
          ctx.arc(bx + Math.sin(by*0.1)*4*s, by, 7*s, 0, Math.PI*2);
          ctx.fill();
        }
      });
    }
    if (style === 'ponytail') {
      ctx.beginPath();
      ctx.moveTo(5*s, headY - headR*0.7);
      ctx.quadraticCurveTo(headR*1.2, headY - headR*0.5, headR*0.7, headY + headR*1.2);
      ctx.quadraticCurveTo(headR*0.3, headY + headR*1.5, 5*s, headY + headR*0.4);
      ctx.closePath();
      ctx.fill();
    }
  },

  _drawHairFront(ctx, data, headR, headY, s) {
    ctx.fillStyle = data.hairColor;
    const style = data.hairStyle;

    // Hair top cap (all styles — sits on top of head above eyebrow line)
    ctx.beginPath();
    ctx.ellipse(0, headY - headR*0.42, headR*1.08, headR*0.48, 0, Math.PI, 0, true);
    ctx.fill();
    // Fill gap between cap and head top
    ctx.beginPath();
    ctx.rect(-headR*1.08, headY - headR*0.42, headR*2.16, headR*0.15);
    ctx.fill();

    // Style-specific bangs/details
    if (style === 'bob') {
      // Side hair
      ctx.beginPath();
      ctx.moveTo(-headR*0.95, headY - headR*0.15);
      ctx.quadraticCurveTo(-headR*1.1, headY + headR*0.4, -headR*0.65, headY + headR*0.55);
      ctx.lineTo(-headR*0.55, headY - headR*0.05);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(headR*0.95, headY - headR*0.15);
      ctx.quadraticCurveTo(headR*1.1, headY + headR*0.4, headR*0.65, headY + headR*0.55);
      ctx.lineTo(headR*0.55, headY - headR*0.05);
      ctx.closePath();
      ctx.fill();
    }
    if (style === 'pixie') {
      ctx.beginPath();
      ctx.moveTo(-headR*0.6, headY - headR*0.4);
      ctx.quadraticCurveTo(headR*0.2, headY - headR*0.85, headR*0.7, headY - headR*0.25);
      ctx.lineTo(headR*0.3, headY - headR*0.05);
      ctx.lineTo(-headR*0.2, headY - headR*0.15);
      ctx.closePath();
      ctx.fill();
    }
    if (style === 'curly' || style === 'afro') {
      const extraR = style === 'afro' ? 1.3 : 1.12;
      // Only draw curls in upper half + sides, not over face
      for (let a = -0.3; a > -Math.PI - 0.3; a -= 0.35) {
        ctx.beginPath();
        ctx.arc(
          Math.cos(a) * headR * extraR,
          headY + Math.sin(a) * headR * extraR,
          headR * 0.3, 0, Math.PI*2
        );
        ctx.fill();
      }
      // Side puffs
      ctx.beginPath();
      ctx.arc(-headR*extraR, headY + 10*s, headR*0.28, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(headR*extraR, headY + 10*s, headR*0.28, 0, Math.PI*2);
      ctx.fill();
    }
    if (style === 'buns') {
      ctx.beginPath();
      ctx.arc(-headR*0.5, headY - headR*0.82, headR*0.28, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(headR*0.5, headY - headR*0.82, headR*0.28, 0, Math.PI*2);
      ctx.fill();
    }
    if (style === 'mohawk') {
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const mx = (i - 2) * headR * 0.25;
        const my = headY - headR * 0.65 - Math.sin(i*0.9 + 0.5) * 12*s;
        ctx.arc(mx, my, headR*0.18, 0, Math.PI*2);
        ctx.fill();
      }
    }
    if (style === 'sidepart') {
      ctx.beginPath();
      ctx.moveTo(-headR*0.8, headY - headR*0.35);
      ctx.quadraticCurveTo(-headR*0.1, headY - headR*0.7, headR*0.4, headY - headR*0.3);
      ctx.lineTo(headR*0.6, headY - headR*0.1);
      ctx.lineTo(-headR*0.4, headY);
      ctx.closePath();
      ctx.fill();
    }

    // Detail line on bangs
    if (['long','wavy','straight','sidepart','bob'].includes(style)) {
      ctx.strokeStyle = this._darken(data.hairColor, 12);
      ctx.lineWidth = 1.2*s;
      ctx.beginPath();
      ctx.arc(0, headY - headR*0.1, headR*0.85, 0.82*Math.PI, 0.18*Math.PI, true);
      ctx.stroke();
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
