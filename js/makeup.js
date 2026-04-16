/* ===== MAKEUP STUDIO ===== */
const Makeup = {
  // Current makeup state
  blushColor: '#FFB6C1',
  blushOpacity: 0,
  shadowColor: '#9370DB',
  shadowOpacity: 0,
  lipColor: '#DC143C',
  lipOpacity: 0,
  linerColor: '#1a1a2e',
  linerOn: false,
  lashesOn: false,
  highlightOn: false,

  // Custom makeup palette
  customPalette: [],

  init() {
    const c = document.getElementById('makeup-canvas');
    if (!c) return;
    const parent = c.parentElement;
    const rect = parent.getBoundingClientRect();
    c.width = Math.min(rect.width - 290, 700);
    c.height = Math.min(rect.height, 500);

    // Reset makeup state
    this.blushOpacity = 0;
    this.shadowOpacity = 0;
    this.lipOpacity = 0;
    this.linerOn = false;
    this.lashesOn = false;
    this.highlightOn = false;

    this._buildTools();
    this._drawFace();
  },

  /* ===== TOOL PANEL ===== */
  _buildTools() {
    const tools = document.getElementById('makeup-tools');
    if (!tools) return;
    tools.innerHTML = '';

    const toolList = [
      { id: 'blush', icon: '🌸', label: 'Blush' },
      { id: 'shadow', icon: '🎨', label: 'Shadow' },
      { id: 'lipstick', icon: '💄', label: 'Lips' },
      { id: 'liner', icon: '🖊️', label: 'Liner' },
      { id: 'lashes', icon: '👁️', label: 'Lashes' },
      { id: 'highlight', icon: '✨', label: 'Glow' },
      { id: 'custom', icon: '🧪', label: 'Custom' },
      { id: 'freehand', icon: '🖌️', label: 'Paint' },
      { id: 'eraser', icon: '🧹', label: 'Reset' },
    ];

    toolList.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn' + (i === 0 ? ' active' : '');
      btn.innerHTML = `${t.icon}<span class="tool-label">${t.label}</span>`;
      btn.style.flexDirection = 'column';
      btn.title = t.label;
      btn.onclick = () => {
        tools.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Sound.play('click');
        this._onToolChange(t.id);
      };
      tools.appendChild(btn);
    });

    this._onToolChange('blush');
  },

  _onToolChange(toolId) {
    const side = document.getElementById('makeup-side');
    if (!side) return;
    side.innerHTML = '';

    switch(toolId) {
      case 'blush': this._buildBlushPanel(side); break;
      case 'shadow': this._buildShadowPanel(side); break;
      case 'lipstick': this._buildLipPanel(side); break;
      case 'liner': this._buildLinerPanel(side); break;
      case 'lashes': this._buildLashesPanel(side); break;
      case 'highlight': this._buildHighlightPanel(side); break;
      case 'custom': this._buildCustomPanel(side); break;
      case 'freehand': this._buildFreehandPanel(side); break;
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
  _buildBlushPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Blush';
    side.appendChild(h4);

    // Color picker
    const colorBtn = this._makeColorBtn(this.blushColor, hex => {
      this.blushColor = hex;
      colorBtn.style.background = hex;
      this._drawFace();
    });
    side.appendChild(colorBtn);

    // Quick colors
    const colors = ['#FFB6C1','#FF69B4','#FF1493','#E8967A','#F4A460','#DEB887','#CD5C5C','#FF7F7F','#FFA07A','#DB7093'];
    side.appendChild(this._makeSwatchGrid(colors, c => {
      this.blushColor = c; colorBtn.style.background = c; this._drawFace();
    }));

    // Intensity slider
    side.appendChild(this._makeSlider('Intensity', this.blushOpacity * 100, 0, 100, v => {
      this.blushOpacity = v / 100;
      this._drawFace();
    }));
  },

  /* ===== EYESHADOW PANEL ===== */
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
  _buildLashesPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Lashes';
    side.appendChild(h4);

    const p = document.createElement('p');
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
  _buildCustomPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Custom Makeup';
    side.appendChild(h4);

    const p = document.createElement('p');
    p.style.cssText = 'font-size:12px;color:var(--text-muted);margin-bottom:10px;';
    p.textContent = 'Mix your own colors! Tap "Create" to add a custom shade.';
    side.appendChild(p);

    // Color mixer
    const mixerRow = document.createElement('div');
    mixerRow.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:10px;';

    const mixColor = document.createElement('div');
    mixColor.className = 'color-pick-btn';
    mixColor.style.background = '#FF69B4';
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
        sw.title = 'Click to use as blush/shadow/lip';
        sw.onclick = () => {
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

    Tools.currentTool = 'dye';
    Tools.brushSize = 4;
    Tools.setup('makeup-canvas');
  },

  /* ===== UI HELPERS ===== */
  _makeColorBtn(color, onChange) {
    const btn = document.createElement('div');
    btn.className = 'color-pick-btn';
    btn.style.background = color;
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

  _makeSlider(label, value, min, max, onChange) {
    const wrap = document.createElement('div');
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
    slider.oninput = () => { onChange(parseInt(slider.value)); };
    wrap.appendChild(slider);
    return wrap;
  },

  /* ===== DRAW THE FACE ===== */
  _drawFace() {
    const c = document.getElementById('makeup-canvas');
    if (!c) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w/2, cy = h/2;
    const r = 120; // face radius
    const charData = Game.state.character || Character.data;
    const skinColor = charData.skinTone || '#FDDBB4';
    const skinDark = Character._darken(skinColor, 12);
    const hairColor = charData.hairColor || '#3d2b1f';
    const eyeColor = charData.eyeColor || '#4a90d9';

    // Neck
    ctx.fillStyle = skinColor;
    ctx.fillRect(cx - 20, cy + r*0.75, 40, 60);

    // Shoulders
    ctx.fillStyle = charData.outfit?.top || '#ff69b4';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r + 55, 90, 35, 0, 0, Math.PI*2);
    ctx.fill();

    // Hair back (behind face)
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 5, r*1.15, r*1.25, 0, 0, Math.PI*2);
    ctx.fill();

    // Face
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fill();

    // Ears
    ctx.beginPath();
    ctx.ellipse(cx - r*0.94, cy + 5, 12, 16, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + r*0.94, cy + 5, 12, 16, 0, 0, Math.PI*2);
    ctx.fill();

    // ===== MAKEUP: EYESHADOW =====
    if (this.shadowOpacity > 0) {
      ctx.fillStyle = this.shadowColor;
      ctx.globalAlpha = this.shadowOpacity * 0.55;
      // Left eye shadow
      ctx.beginPath();
      ctx.ellipse(cx - 32, cy - 15, 28, 16, -0.15, 0, Math.PI*2);
      ctx.fill();
      // Right eye shadow
      ctx.beginPath();
      ctx.ellipse(cx + 32, cy - 15, 28, 16, 0.15, 0, Math.PI*2);
      ctx.fill();

      // Gradient fade
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

    // ===== EYES =====
    const eyeY = cy + 2;
    const eyeSpacing = 32;
    [-1, 1].forEach(dir => {
      const ex = cx + dir * eyeSpacing;

      // Whites
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 16, 14, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

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
        ctx.lineTo(ex + dir*23, eyeY - 10);
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Lashes
      if (this.lashesOn) {
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
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

      // Iris
      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.arc(ex + dir, eyeY, 10, 0, Math.PI*2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(ex + dir, eyeY, 5, 0, Math.PI*2);
      ctx.fill();

      // Highlights
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(ex - 3, eyeY - 4, 3.5, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(ex + 4, eyeY + 2, 2, 0, Math.PI*2);
      ctx.fill();
    });

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

    // ===== MAKEUP: BLUSH =====
    if (this.blushOpacity > 0) {
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

    // Nose
    ctx.fillStyle = skinDark;
    ctx.beginPath();
    ctx.arc(cx, cy + 30, 5, 0, Math.PI*2);
    ctx.fill();
    // Nose shine
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(cx - 1, cy + 28, 2.5, 0, Math.PI*2);
    ctx.fill();

    // ===== MAKEUP: LIPS =====
    if (this.lipOpacity > 0) {
      ctx.fillStyle = this.lipColor;
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
      ctx.moveTo(cx - 14, cy + 50);
      ctx.quadraticCurveTo(cx, cy + 58, cx + 14, cy + 50);
      ctx.quadraticCurveTo(cx, cy + 54, cx - 14, cy + 50);
      ctx.closePath();
      ctx.fill();
    }

    // ===== MAKEUP: HIGHLIGHT/GLOW =====
    if (this.highlightOn) {
      ctx.globalAlpha = 0.35;
      const grad = ctx.createRadialGradient(cx, cy - r*0.55, 0, cx, cy - r*0.55, 40);
      grad.addColorStop(0, 'rgba(255,255,240,0.8)');
      grad.addColorStop(1, 'rgba(255,255,240,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy - r*0.55, 40, 0, Math.PI*2);
      ctx.fill();

      // Cheek glow
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
      const g3 = ctx.createRadialGradient(cx, cy+20, 0, cx, cy+20, 12);
      g3.addColorStop(0, 'rgba(255,255,240,0.5)');
      g3.addColorStop(1, 'rgba(255,255,240,0)');
      ctx.fillStyle = g3;
      ctx.beginPath();
      ctx.arc(cx, cy+20, 12, 0, Math.PI*2);
      ctx.fill();

      ctx.globalAlpha = 1;
    }

    // ===== HAIR FRONT (bangs, sits on top) =====
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy - r*0.38, r*1.1, r*0.55, 0, Math.PI, 0, true);
    ctx.fill();
    ctx.beginPath();
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
  finish() {
    // Save makeup look to closet
    const c = document.getElementById('makeup-canvas');
    if (c) {
      const imageData = c.toDataURL('image/png');
      const lookName = [];
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
