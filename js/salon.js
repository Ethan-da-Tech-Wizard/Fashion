/* ===== HAIR SALON ===== */
const Salon = {
  hairColor: '#3d2b1f',
  hairStyle: 'long',
  tinselColor: '#ffd700',
  tinselOn: false,
  _baseImage: null,

  init() {
    const c = document.getElementById('salon-canvas');
    if (!c) return;
    const parent = c.parentElement;
    const rect = parent.getBoundingClientRect();
    c.width = Math.min(rect.width - 290, 700);
    c.height = Math.min(rect.height, 500);

    // Copy character's current hair
    if (Game.state.character) {
      this.hairColor = Game.state.character.hairColor || '#3d2b1f';
      this.hairStyle = Game.state.character.hairStyle || 'long';
    }
    this.tinselOn = false;

    this._buildTools();
    this._buildSidePanel();
    this._drawHead();
  },

  /* ===== TOOL PANEL ===== */
  _buildTools() {
    const tools = document.getElementById('salon-tools');
    if (!tools) return;
    tools.innerHTML = '';

    const toolList = [
      { id: 'style', icon: '✂️', label: 'Style' },
      { id: 'dye', icon: '🎨', label: 'Dye' },
      { id: 'highlights', icon: '🖌️', label: 'Highlights' },
      { id: 'tinsel', icon: '✨', label: 'Tinsel' },
      { id: 'accessories', icon: '🎀', label: 'Clips' },
      { id: 'freehand', icon: '🖊️', label: 'Draw' },
      { id: 'eraser', icon: '🧹', label: 'Undo' },
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

    this._onToolChange('style');
  },

  _onToolChange(toolId) {
    const side = document.getElementById('salon-side');
    if (!side) return;
    side.innerHTML = '';

    if (toolId === 'style') {
      this._buildStylePanel(side);
    } else if (toolId === 'dye') {
      this._buildDyePanel(side);
    } else if (toolId === 'highlights') {
      this._buildHighlightsPanel(side);
    } else if (toolId === 'tinsel') {
      this._buildTinselPanel(side);
    } else if (toolId === 'accessories') {
      this._buildAccessoriesPanel(side);
    } else if (toolId === 'freehand') {
      this._buildFreehandPanel(side);
      Tools.currentTool = 'dye';
      Tools.setup('salon-canvas');
    } else if (toolId === 'eraser') {
      // Reset to base
      this._drawHead();
      Sound.play('whoosh');
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
  _buildStylePanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Hair Style';
    side.appendChild(h4);

    const grid = document.createElement('div');
    grid.className = 'item-grid';
    const hairEmojis = { bob:'✂️', long:'👩', pixie:'💇', curly:'🌀', braids:'🎀', ponytail:'👧',
      buns:'🍡', mohawk:'⚡', wavy:'〰️', afro:'🟤', straight:'📏', sidepart:'↗️' };
    HAIR_STYLES.forEach(h => {
      const cell = document.createElement('div');
      cell.className = 'item-cell' + (this.hairStyle === h ? ' active' : '');
      cell.innerHTML = `<div style="text-align:center"><div style="font-size:22px">${hairEmojis[h]||'💇'}</div><div style="font-size:9px;color:var(--text-muted)">${h}</div></div>`;
      cell.onclick = () => {
        this.hairStyle = h;
        grid.querySelectorAll('.item-cell').forEach(c => c.classList.remove('active'));
        cell.classList.add('active');
        Sound.play('snip');
        this._drawHead();
      };
      grid.appendChild(cell);
    });
    side.appendChild(grid);
  },

  /* ===== DYE PANEL ===== */
  _buildDyePanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Hair Color';
    side.appendChild(h4);

    const colorBtn = document.createElement('div');
    colorBtn.className = 'color-pick-btn';
    colorBtn.style.background = this.hairColor;
    colorBtn.onclick = () => {
      ColorWheel.setFromHex(this.hairColor);
      ColorWheel.open('hair dye', hex => {
        this.hairColor = hex;
        colorBtn.style.background = hex;
        this._drawHead();
      });
    };
    side.appendChild(colorBtn);

    // Preset hair colors
    const label2 = document.createElement('h4');
    label2.textContent = 'Presets';
    label2.style.marginTop = '12px';
    side.appendChild(label2);

    const presets = document.createElement('div');
    presets.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;';
    const colors = ['#1a1a2e','#3d2b1f','#6b3a2a','#8B4513','#CD853F','#DAA520','#FFD700',
      '#FF69B4','#E0115F','#9370DB','#1E90FF','#00CED1','#90EE90','#FF4500','#C0C0C0','#F0F0F0'];
    colors.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'cw-recent-swatch';
      sw.style.background = c;
      sw.style.cursor = 'pointer';
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
  _buildHighlightsPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Highlights Color';
    side.appendChild(h4);

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

    // Size slider
    const label = document.createElement('h4');
    label.textContent = 'Brush Size';
    label.style.marginTop = '12px';
    side.appendChild(label);
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = '2'; slider.max = '20'; slider.value = '6';
    slider.style.cssText = 'width:100%;accent-color:var(--accent-pink);';
    slider.oninput = () => { Tools.brushSize = parseInt(slider.value); };
    side.appendChild(slider);

    const p = document.createElement('p');
    p.style.cssText = 'font-size:11px;color:var(--text-muted);margin-top:8px;';
    p.textContent = 'Paint highlights directly on the hair!';
    side.appendChild(p);

    Tools.currentTool = 'dye';
    Tools.brushSize = 6;
    Tools.setup('salon-canvas');
  },

  /* ===== TINSEL PANEL ===== */
  _buildTinselPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Tinsel';
    side.appendChild(h4);

    const colorBtn = document.createElement('div');
    colorBtn.className = 'color-pick-btn';
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

    // Add tinsel button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-accent';
    addBtn.style.cssText = 'margin-top:14px;width:100%;';
    addBtn.textContent = '✨ Add Tinsel Strands';
    addBtn.onclick = () => {
      this.tinselOn = true;
      this._drawTinsel();
      Sound.play('sparkle');
    };
    side.appendChild(addBtn);

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
  _buildAccessoriesPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Hair Accessories';
    side.appendChild(h4);

    const accessories = ['🎀','🌸','🦋','💎','⭐','🌺','💫','👑','🌙','❤️','🍓','🌈'];
    const grid = document.createElement('div');
    grid.className = 'item-grid';
    accessories.forEach(a => {
      const cell = document.createElement('div');
      cell.className = 'item-cell';
      cell.textContent = a;
      cell.onclick = () => {
        Tools.currentSticker = a;
        Tools.currentTool = 'sticker';
        Tools.brushSize = 8;
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
  _buildSidePanel() {
    this._onToolChange('style');
  },

  /* ===== DRAW HEAD & HAIR ===== */
  _drawHead() {
    const c = document.getElementById('salon-canvas');
    if (!c) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w/2, cy = h/2 + 20;
    const headR = 90;
    const charData = Game.state.character || Character.data;
    const skinColor = charData.skinTone || '#FDDBB4';

    // Neck
    ctx.fillStyle = skinColor;
    ctx.fillRect(cx - 15, cy + headR*0.65, 30, 60);

    // Shoulders hint
    ctx.fillStyle = charData.outfit?.top || '#ff69b4';
    ctx.beginPath();
    ctx.ellipse(cx, cy + headR + 50, 70, 30, 0, 0, Math.PI*2);
    ctx.fill();

    // Hair back
    this._drawSalonHairBack(ctx, cx, cy, headR);

    // Head
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(cx, cy, headR, 0, Math.PI*2);
    ctx.fill();

    // Ears
    ctx.beginPath();
    ctx.ellipse(cx - headR*0.92, cy + 5, 10, 14, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + headR*0.92, cy + 5, 10, 14, 0, 0, Math.PI*2);
    ctx.fill();

    // Simple eyes
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

    // Nose
    const skinDark = Character._darken(skinColor, 12);
    ctx.fillStyle = skinDark;
    ctx.beginPath(); ctx.arc(cx, cy + 22, 4, 0, Math.PI*2); ctx.fill();

    // Mouth
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy + 38, 12, 0.15*Math.PI, 0.85*Math.PI);
    ctx.stroke();

    // Blush
    ctx.fillStyle = 'rgba(255,150,170,0.2)';
    ctx.beginPath(); ctx.ellipse(cx - 35, cy + 25, 12, 7, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 35, cy + 25, 12, 7, 0, 0, Math.PI*2); ctx.fill();

    // Eyebrows
    ctx.strokeStyle = Character._darken(this.hairColor, 10);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx-35, eyeY-18); ctx.quadraticCurveTo(cx-25, eyeY-24, cx-15, eyeY-18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+15, eyeY-18); ctx.quadraticCurveTo(cx+25, eyeY-24, cx+35, eyeY-18); ctx.stroke();

    // Hair front
    this._drawSalonHairFront(ctx, cx, cy, headR);

    // Tinsel overlay
    if (this.tinselOn) {
      this._drawTinsel();
    }
  },

  _drawSalonHairBack(ctx, cx, cy, r) {
    ctx.fillStyle = this.hairColor;
    const s = this.hairStyle;

    if (['long','wavy','straight'].includes(s)) {
      ctx.beginPath();
      ctx.moveTo(cx - r*0.95, cy - r*0.1);
      ctx.quadraticCurveTo(cx - r*1.1, cy + r*1.5, cx - r*0.5, cy + r*2.2);
      ctx.quadraticCurveTo(cx, cy + r*2.5, cx + r*0.5, cy + r*2.2);
      ctx.quadraticCurveTo(cx + r*1.1, cy + r*1.5, cx + r*0.95, cy - r*0.1);
      ctx.closePath();
      ctx.fill();
    }
    if (s === 'braids') {
      [-35, 35].forEach(bx => {
        for (let by = cy + r*0.5; by < cy + r*2.5; by += 14) {
          ctx.beginPath();
          ctx.arc(cx + bx + Math.sin(by*0.08)*5, by, 9, 0, Math.PI*2);
          ctx.fill();
        }
      });
    }
    if (s === 'ponytail') {
      ctx.beginPath();
      ctx.moveTo(cx + 8, cy - r*0.7);
      ctx.quadraticCurveTo(cx + r*1.3, cy - r*0.4, cx + r*0.8, cy + r*1.5);
      ctx.quadraticCurveTo(cx + r*0.3, cy + r*2, cx + 8, cy + r*0.5);
      ctx.closePath();
      ctx.fill();
    }
  },

  _drawSalonHairFront(ctx, cx, cy, r) {
    ctx.fillStyle = this.hairColor;
    const s = this.hairStyle;

    // Hair cap — sits above eyebrow line
    ctx.beginPath();
    ctx.ellipse(cx, cy - r*0.38, r*1.08, r*0.52, 0, Math.PI, 0, true);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(cx - r*1.08, cy - r*0.38, r*2.16, r*0.12);
    ctx.fill();

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
    if (s === 'pixie') {
      ctx.beginPath();
      ctx.moveTo(cx - r*0.6, cy - r*0.35);
      ctx.quadraticCurveTo(cx + r*0.2, cy - r*0.9, cx + r*0.7, cy - r*0.2);
      ctx.lineTo(cx + r*0.3, cy); ctx.lineTo(cx - r*0.2, cy - r*0.1);
      ctx.closePath(); ctx.fill();
    }
    if (s === 'curly' || s === 'afro') {
      const er = s === 'afro' ? 1.35 : 1.15;
      for (let a = -0.3; a > -Math.PI - 0.3; a -= 0.35) {
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a)*r*er, cy + Math.sin(a)*r*er, r*0.3, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.beginPath(); ctx.arc(cx - r*er, cy + 12, r*0.28, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + r*er, cy + 12, r*0.28, 0, Math.PI*2); ctx.fill();
    }
    if (s === 'buns') {
      ctx.beginPath(); ctx.arc(cx - r*0.5, cy - r*0.85, r*0.28, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + r*0.5, cy - r*0.85, r*0.28, 0, Math.PI*2); ctx.fill();
    }
    if (s === 'mohawk') {
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(cx + (i-2)*r*0.25, cy - r*0.65 - Math.sin(i*0.9+0.5)*14, r*0.2, 0, Math.PI*2);
        ctx.fill();
      }
    }
    if (s === 'sidepart') {
      ctx.beginPath();
      ctx.moveTo(cx - r*0.8, cy - r*0.3);
      ctx.quadraticCurveTo(cx - r*0.1, cy - r*0.7, cx + r*0.4, cy - r*0.25);
      ctx.lineTo(cx + r*0.6, cy - r*0.05); ctx.lineTo(cx - r*0.4, cy + r*0.05);
      ctx.closePath(); ctx.fill();
    }

    // Hair detail line
    if (['long','wavy','straight','sidepart','bob'].includes(s)) {
      ctx.strokeStyle = Character._darken(this.hairColor, 12);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy - r*0.05, r*0.88, 0.82*Math.PI, 0.18*Math.PI, true);
      ctx.stroke();
    }
  },

  /* ===== TINSEL ===== */
  _drawTinsel() {
    const c = document.getElementById('salon-canvas');
    if (!c) return;
    const ctx = c.getContext('2d');
    const cx = c.width/2, cy = c.height/2 + 20;
    const r = 90;

    ctx.strokeStyle = this.tinselColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7;

    for (let i = 0; i < 12; i++) {
      const startAngle = -Math.PI*0.2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const sx = cx + Math.cos(startAngle) * r * 0.7;
      const sy = cy + Math.sin(startAngle) * r * 0.4 - r*0.2;
      const len = 40 + Math.random() * 60;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      let px = sx, py = sy;
      for (let j = 0; j < 8; j++) {
        px += (Math.random()-0.5) * 12;
        py += len / 8;
        ctx.lineTo(px, py);
      }
      ctx.stroke();

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
  finish() {
    // Save hair changes to character
    if (Game.state.character) {
      Game.state.character.hairColor = this.hairColor;
      Game.state.character.hairStyle = this.hairStyle;
      Character.data.hairColor = this.hairColor;
      Character.data.hairStyle = this.hairStyle;
    }

    // Save salon result to closet
    const c = document.getElementById('salon-canvas');
    if (c) {
      const imageData = c.toDataURL('image/png');
      Game.addToCloset({
        id: Date.now(),
        type: 'hair',
        subtype: this.hairStyle,
        name: this.hairStyle.charAt(0).toUpperCase() + this.hairStyle.slice(1) + ' Hairstyle',
        image: imageData,
        createdAt: Date.now(),
      });
    }

    Sound.play('complete');
    Game.addXP(60);
    Game.save();
    if (Game.checkLevelUp()) Game.goTo('levelup');
    else Game.goTo('workshop');
  }
};
