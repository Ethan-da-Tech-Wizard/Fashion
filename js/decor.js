/* ===== HOME DECOR STUDIO ===== */
const Decor = {
  decorType: null,
  baseColor: '#9370DB',
  patternType: 'solid',
  tassels: false,
  fringe: false,

  init() {
    const c = document.getElementById('decor-canvas');
    if (!c) return;
    const parent = c.parentElement;
    const rect = parent.getBoundingClientRect();
    c.width = Math.min(rect.width - 290, 700);
    c.height = Math.min(rect.height, 500);

    this.decorType = null;
    this.tassels = false;
    this.fringe = false;
    this._buildTools();
    this._buildSidePanel('pick');
  },

  /* ===== TOOLS ===== */
  _buildTools() {
    const tools = document.getElementById('decor-tools');
    if (!tools) return;
    tools.innerHTML = '';

    const toolList = [
      { id: 'pick', icon: 'decor', label: 'Item' },
      { id: 'fabric', icon: 'fabric', label: 'Fabric' },
      { id: 'pattern', icon: 'square', label: 'Pattern' },
      { id: 'dye', icon: 'palette', label: 'Paint' },
      { id: 'sticker', icon: 'star', label: 'Sticker' },
      { id: 'glitter', icon: 'sparkles', label: 'Glitter' },
      { id: 'extras', icon: 'bow', label: 'Extras' },
      { id: 'eraser', icon: 'eraser', label: 'Eraser' },
    ];

    toolList.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn' + (i === 0 ? ' active' : '');
      btn.innerHTML = `${Icons.get(t.icon)}<span class="tool-label">${t.label}</span>`;
      btn.style.flexDirection = 'column';
      btn.title = t.label;
      btn.onclick = () => {
        tools.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Sound.play('click');
        this._buildSidePanel(t.id);
      };
      tools.appendChild(btn);
    });
  },

  _buildSidePanel(toolId) {
    const side = document.getElementById('decor-side');
    if (!side) return;
    side.innerHTML = '';

    switch(toolId) {
      case 'pick': this._buildPickPanel(side); break;
      case 'fabric': this._buildFabricPanel(side); break;
      case 'pattern': this._buildPatternPanel(side); break;
      case 'dye': this._buildPaintPanel(side); Tools.currentTool = 'dye'; Tools.setup('decor-canvas'); break;
      case 'sticker': this._buildStickerPanel(side); break;
      case 'glitter': this._buildGlitterPanel(side); break;
      case 'extras': this._buildExtrasPanel(side); break;
      case 'eraser':
        Tools.currentTool = 'eraser'; Tools.brushSize = 15; Tools.setup('decor-canvas');
        const h4 = document.createElement('h4'); h4.textContent = 'Eraser'; side.appendChild(h4);
        const p = document.createElement('p');
        p.style.cssText = 'font-size:12px;color:var(--text-muted);';
        p.textContent = 'Erase decorations from the item.';
        side.appendChild(p);
        const resetBtn = document.createElement('button');
        resetBtn.className = 'btn btn-ghost'; resetBtn.style.cssText = 'width:100%;margin-top:12px;';
        resetBtn.textContent = '🔄 Reset Item';
        resetBtn.onclick = () => { this._drawDecorItem(); Sound.play('whoosh'); };
        side.appendChild(resetBtn);
        break;
    }
  },

  /* ===== PICK PANEL ===== */
  _buildPickPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Choose Item';
    side.appendChild(h4);

    const grid = document.createElement('div');
    grid.className = 'item-grid';
      DECOR_TYPES.forEach(d => {
      const cell = document.createElement('div');
      cell.className = 'item-cell' + (this.decorType === d.id ? ' active' : '');
      cell.innerHTML = `<div style="text-align:center"><div>${Icons.get(d.id, 24)}</div><div style="font-size:10px;color:var(--text-muted);margin-top:4px;">${d.name}</div></div>`;
      cell.onclick = () => {
        this.decorType = d.id;
        grid.querySelectorAll('.item-cell').forEach(c => c.classList.remove('active'));
        cell.classList.add('active');
        Sound.play('select');
        this._drawDecorItem();
      };
      grid.appendChild(cell);
    });
    side.appendChild(grid);

    if (!this.decorType) {
      const c = document.getElementById('decor-canvas');
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.font = '18px Outfit'; ctx.textAlign = 'center';
      ctx.fillText('Pick a decor item →', c.width/2, c.height/2);
    }
  },

  /* ===== FABRIC PANEL ===== */
  _buildFabricPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Base Color';
    side.appendChild(h4);

    const colorBtn = document.createElement('div');
    colorBtn.className = 'color-pick-btn';
    colorBtn.style.background = this.baseColor;
    colorBtn.onclick = () => {
      ColorWheel.setFromHex(this.baseColor);
      ColorWheel.open('decor fabric', hex => {
        this.baseColor = hex;
        colorBtn.style.background = hex;
        this._drawDecorItem();
      });
    };
    side.appendChild(colorBtn);

    const colors = ['#9370DB','#FF69B4','#FFD700','#1E90FF','#2E8B57','#FF6347','#00CED1',
      '#F5F5DC','#DEB887','#FFC0CB','#E6E6FA','#F0E68C','#B0E0E6','#D2691E','#FFFACD','#F5F5F5'];
    const qg = document.createElement('div');
    qg.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;';
    colors.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'cw-recent-swatch';
      sw.style.background = c;
      sw.onclick = () => { this.baseColor = c; colorBtn.style.background = c; this._drawDecorItem(); Sound.play('click'); };
      qg.appendChild(sw);
    });
    side.appendChild(qg);
  },

  /* ===== PATTERN PANEL ===== */
  _buildPatternPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Pattern';
    side.appendChild(h4);

    const patterns = [
      { id: 'solid', name: 'Solid' },
      { id: 'stripes', name: 'Stripes' },
      { id: 'polka', name: 'Polka' },
      { id: 'plaid', name: 'Plaid' },
      { id: 'chevron', name: 'Chevron' },
      { id: 'diamonds', name: 'Diamonds' },
      { id: 'floral', name: 'Floral' },
      { id: 'stars', name: 'Stars' },
    ];

    const grid = document.createElement('div');
    grid.className = 'item-grid';
    patterns.forEach(p => {
      const cell = document.createElement('div');
      cell.className = 'item-cell' + (this.patternType === p.id ? ' active' : '');
      cell.style.fontSize = '11px';
      cell.textContent = p.name;
      cell.onclick = () => {
        this.patternType = p.id;
        grid.querySelectorAll('.item-cell').forEach(c => c.classList.remove('active'));
        cell.classList.add('active');
        Sound.play('select');
        this._drawDecorItem();
      };
      grid.appendChild(cell);
    });
    side.appendChild(grid);
  },

  /* ===== PAINT PANEL ===== */
  _buildPaintPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Paint Color';
    side.appendChild(h4);

    const colorBtn = document.createElement('div');
    colorBtn.className = 'color-pick-btn';
    colorBtn.style.background = Tools.currentColor;
    colorBtn.onclick = () => { Tools.openColorPicker(hex => { colorBtn.style.background = hex; }); };
    side.appendChild(colorBtn);

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

    const slbl = document.createElement('h4');
    slbl.textContent = 'Size'; slbl.style.marginTop = '10px';
    side.appendChild(slbl);
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = '2'; slider.max = '30'; slider.value = Tools.brushSize;
    slider.style.cssText = 'width:100%;accent-color:var(--accent-pink);';
    slider.oninput = () => { Tools.brushSize = parseInt(slider.value); };
    side.appendChild(slider);
  },

  /* ===== STICKER PANEL ===== */
  _buildStickerPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Stickers';
    side.appendChild(h4);

    const decorStickers = ['🌸','🌺','🌹','🌻','🦋','🐱','🐶','🌈','☁️','🍀',
      '⭐','💎','❤️','🎀','🌙','🔥','❄️','🍓','🧁','💐'];
    const grid = document.createElement('div');
    grid.className = 'item-grid';
    decorStickers.forEach(s => {
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
    Tools.brushSize = 8;
    Tools.setup('decor-canvas');
  },

  /* ===== GLITTER PANEL ===== */
  _buildGlitterPanel(side) {
    this._buildPaintPanel(side);
    Tools.currentTool = 'glitter';
    Tools.setup('decor-canvas');
  },

  /* ===== EXTRAS PANEL ===== */
  _buildExtrasPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Extra Details';
    side.appendChild(h4);

    // Tassels toggle
    const tasselBtn = document.createElement('button');
    tasselBtn.className = 'btn ' + (this.tassels ? 'btn-primary' : 'btn-ghost');
    tasselBtn.style.cssText = 'width:100%;margin-bottom:8px;';
    tasselBtn.textContent = this.tassels ? '✓ Tassels ON' : '🎀 Add Tassels';
    tasselBtn.onclick = () => {
      this.tassels = !this.tassels;
      tasselBtn.className = 'btn ' + (this.tassels ? 'btn-primary' : 'btn-ghost');
      tasselBtn.textContent = this.tassels ? '✓ Tassels ON' : '🎀 Add Tassels';
      Sound.play('click');
      this._drawDecorItem();
    };
    side.appendChild(tasselBtn);

    // Fringe toggle
    const fringeBtn = document.createElement('button');
    fringeBtn.className = 'btn ' + (this.fringe ? 'btn-primary' : 'btn-ghost');
    fringeBtn.style.cssText = 'width:100%;margin-bottom:8px;';
    fringeBtn.textContent = this.fringe ? '✓ Fringe ON' : '〰️ Add Fringe';
    fringeBtn.onclick = () => {
      this.fringe = !this.fringe;
      fringeBtn.className = 'btn ' + (this.fringe ? 'btn-primary' : 'btn-ghost');
      fringeBtn.textContent = this.fringe ? '✓ Fringe ON' : '〰️ Add Fringe';
      Sound.play('click');
      this._drawDecorItem();
    };
    side.appendChild(fringeBtn);

    // Pearl border
    const pearlBtn = document.createElement('button');
    pearlBtn.className = 'btn btn-ghost';
    pearlBtn.style.cssText = 'width:100%;margin-bottom:8px;';
    pearlBtn.textContent = '🫧 Add Pearl Border';
    pearlBtn.onclick = () => {
      this._drawPearlBorder();
      Sound.play('sparkle');
    };
    side.appendChild(pearlBtn);
  },

  /* ===== DRAWING ===== */
  _drawDecorItem() {
    const c = document.getElementById('decor-canvas');
    if (!c || !this.decorType) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w/2, cy = h/2;
    const d = DECOR_TYPES.find(t => t.id === this.decorType);
    if (!d) return;

    const dw = d.w, dh = d.h;

    // Draw base shape
    ctx.save();
    this._getDecorPath(ctx, this.decorType, cx, cy, dw, dh);
    ctx.clip();

    // Base color
    ctx.fillStyle = this.baseColor;
    ctx.fillRect(cx - dw, cy - dh, dw*2, dh*2);

    // Pattern
    const [ph, ps, pl] = U.hexToHsl(this.baseColor);
    const patDark = U.hslToHex(ph, ps, Math.max(0, pl - 18));
    const patLight = U.hslToHex(ph, ps, Math.min(100, pl + 15));
    this._drawPattern(ctx, cx - dw, cy - dh, dw*2, dh*2, patDark, patLight);

    ctx.restore();

    // Outline
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    this._getDecorPath(ctx, this.decorType, cx, cy, dw, dh);
    ctx.stroke();

    // Extras
    if (this.tassels) this._drawTassels(ctx, cx, cy, dw, dh);
    if (this.fringe) this._drawFringe(ctx, cx, cy, dw, dh);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + dh/2 + 15, dw*0.6, 8, 0, 0, Math.PI*2);
    ctx.fill();

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '14px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(d.name, cx, cy + dh/2 + 35);
  },

  _getDecorPath(ctx, type, cx, cy, w, h) {
    ctx.beginPath();
    switch(type) {
      case 'blanket':
        // Soft rectangle with slightly rounded corners
        const br = 12;
        ctx.moveTo(cx - w/2 + br, cy - h/2);
        ctx.arcTo(cx + w/2, cy - h/2, cx + w/2, cy + h/2, br);
        ctx.arcTo(cx + w/2, cy + h/2, cx - w/2, cy + h/2, br);
        ctx.arcTo(cx - w/2, cy + h/2, cx - w/2, cy - h/2, br);
        ctx.arcTo(cx - w/2, cy - h/2, cx + w/2, cy - h/2, br);
        ctx.closePath();
        break;
      case 'pillow':
        // Puffy shape
        ctx.moveTo(cx - w/2 + 15, cy - h/2 + 5);
        ctx.quadraticCurveTo(cx, cy - h/2 - 10, cx + w/2 - 15, cy - h/2 + 5);
        ctx.quadraticCurveTo(cx + w/2 + 10, cy, cx + w/2 - 15, cy + h/2 - 5);
        ctx.quadraticCurveTo(cx, cy + h/2 + 10, cx - w/2 + 15, cy + h/2 - 5);
        ctx.quadraticCurveTo(cx - w/2 - 10, cy, cx - w/2 + 15, cy - h/2 + 5);
        ctx.closePath();
        break;
      case 'rug':
        // Oval
        ctx.ellipse(cx, cy, w/2, h/2, 0, 0, Math.PI*2);
        break;
    }
  },

  _drawPattern(ctx, x, y, w, h, dark, light) {
    ctx.fillStyle = dark;
    ctx.strokeStyle = dark;

    switch(this.patternType) {
      case 'stripes':
        ctx.lineWidth = 8;
        for (let dx = -h; dx < w + h; dx += 24) {
          ctx.beginPath(); ctx.moveTo(x + dx, y); ctx.lineTo(x + dx + h, y + h); ctx.stroke();
        }
        break;
      case 'polka':
        for (let dy = 0; dy < h; dy += 28) {
          for (let dx = (dy % 56 < 28 ? 0 : 14); dx < w; dx += 28) {
            ctx.beginPath(); ctx.arc(x + dx, y + dy, 5, 0, Math.PI*2); ctx.fill();
          }
        }
        break;
      case 'plaid':
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 10;
        for (let dx = 0; dx < w; dx += 35) { ctx.beginPath(); ctx.moveTo(x+dx, y); ctx.lineTo(x+dx, y+h); ctx.stroke(); }
        for (let dy = 0; dy < h; dy += 35) { ctx.beginPath(); ctx.moveTo(x, y+dy); ctx.lineTo(x+w, y+dy); ctx.stroke(); }
        ctx.globalAlpha = 1;
        break;
      case 'chevron':
        ctx.strokeStyle = dark;
        ctx.lineWidth = 4;
        for (let dy = 0; dy < h; dy += 20) {
          ctx.beginPath();
          for (let dx = 0; dx < w; dx += 30) {
            ctx.moveTo(x + dx, y + dy + 10);
            ctx.lineTo(x + dx + 15, y + dy);
            ctx.lineTo(x + dx + 30, y + dy + 10);
          }
          ctx.stroke();
        }
        break;
      case 'diamonds':
        for (let dy = 0; dy < h; dy += 30) {
          for (let dx = (dy % 60 < 30 ? 0 : 15); dx < w; dx += 30) {
            ctx.fillStyle = dark;
            ctx.save(); ctx.translate(x + dx, y + dy); ctx.rotate(Math.PI/4);
            ctx.fillRect(-6, -6, 12, 12);
            ctx.restore();
          }
        }
        break;
      case 'floral':
        for (let dy = 25; dy < h; dy += 55) {
          for (let dx = (dy % 110 < 55 ? 25 : 50); dx < w; dx += 55) {
            ctx.fillStyle = light;
            for (let p = 0; p < 5; p++) {
              const a = p * Math.PI * 2 / 5;
              ctx.beginPath(); ctx.arc(x+dx+Math.cos(a)*7, y+dy+Math.sin(a)*7, 5, 0, Math.PI*2); ctx.fill();
            }
            ctx.fillStyle = dark;
            ctx.beginPath(); ctx.arc(x+dx, y+dy, 3, 0, Math.PI*2); ctx.fill();
          }
        }
        break;
      case 'stars':
        for (let dy = 20; dy < h; dy += 45) {
          for (let dx = (dy % 90 < 45 ? 20 : 42); dx < w; dx += 45) {
            ctx.fillStyle = light;
            U.drawStar(ctx, x+dx, y+dy, 9, 5);
          }
        }
        break;
    }
  },

  _drawTassels(ctx, cx, cy, w, h) {
    const corners = [
      [cx - w/2, cy - h/2],
      [cx + w/2, cy - h/2],
      [cx - w/2, cy + h/2],
      [cx + w/2, cy + h/2],
    ];
    corners.forEach(([tx, ty]) => {
      ctx.strokeStyle = this.baseColor;
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 0.5 + Math.PI*0.25;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + Math.cos(angle) * (12 + Math.random()*8), ty + Math.sin(angle) * (12 + Math.random()*8));
        ctx.stroke();
      }
      // Knot
      const [bh,bs,bl] = U.hexToHsl(this.baseColor);
      ctx.fillStyle = U.hslToHex(bh, bs, Math.max(0, bl - 15));
      ctx.beginPath(); ctx.arc(tx, ty, 4, 0, Math.PI*2); ctx.fill();
    });
  },

  _drawFringe(ctx, cx, cy, w, h) {
    const [bh,bs,bl] = U.hexToHsl(this.baseColor);
    ctx.strokeStyle = U.hslToHex(bh, bs, Math.max(0, bl - 10));
    ctx.lineWidth = 1.5;
    const bottom = cy + h/2;
    for (let x = cx - w/2 + 5; x < cx + w/2; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, bottom);
      ctx.lineTo(x + (Math.random()-0.5)*3, bottom + 10 + Math.random()*8);
      ctx.stroke();
    }
  },

  _drawPearlBorder() {
    const c = document.getElementById('decor-canvas');
    if (!c || !this.decorType) return;
    const ctx = c.getContext('2d');
    const cx = c.width/2, cy = c.height/2;
    const d = DECOR_TYPES.find(t => t.id === this.decorType);
    if (!d) return;

    const w = d.w, h = d.h;
    const pearlSize = 4;

    // Draw pearls around shape border
    let points = [];
    if (this.decorType === 'blanket') {
      for (let x = cx-w/2; x <= cx+w/2; x += 14) { points.push([x, cy-h/2]); points.push([x, cy+h/2]); }
      for (let y = cy-h/2; y <= cy+h/2; y += 14) { points.push([cx-w/2, y]); points.push([cx+w/2, y]); }
    } else if (this.decorType === 'pillow') {
      for (let a = 0; a < Math.PI*2; a += 0.25) {
        points.push([cx + Math.cos(a)*w/2*0.9, cy + Math.sin(a)*h/2*0.9]);
      }
    } else if (this.decorType === 'rug') {
      for (let a = 0; a < Math.PI*2; a += 0.2) {
        points.push([cx + Math.cos(a)*w/2, cy + Math.sin(a)*h/2]);
      }
    }

    points.forEach(([px, py]) => {
      const grad = ctx.createRadialGradient(px-1, py-1, 0, px, py, pearlSize);
      grad.addColorStop(0, '#fff');
      grad.addColorStop(0.4, '#f0e8f0');
      grad.addColorStop(1, '#c0b0c8');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(px, py, pearlSize, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.arc(px - 1, py - 1, 1.5, 0, Math.PI*2); ctx.fill();
    });
  },

  /* ===== FINISH ===== */
  finish() {
    const c = document.getElementById('decor-canvas');
    if (c && this.decorType) {
      const imageData = c.toDataURL('image/png');
      const d = DECOR_TYPES.find(t => t.id === this.decorType);
      Game.addToCloset({
        id: Date.now(),
        type: 'decor',
        subtype: this.decorType,
        name: (d ? d.name : 'Decor') + ' Design',
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
