/* ===== TECH WORKSHOP ===== */
const Tech = {
  deviceType: null,
  deviceColor: '#1a1a2e',
  screenColor: '#111827',

  init() {
    const c = document.getElementById('tech-canvas');
    if (!c) return;
    const parent = c.parentElement;
    const rect = parent.getBoundingClientRect();
    c.width = Math.min(rect.width - 290, 700);
    c.height = Math.min(rect.height, 500);

    this.deviceType = null;
    this._buildTools();
    this._buildSidePanel('pick');
  },

  /* ===== TOOLS ===== */
  _buildTools() {
    const tools = document.getElementById('tech-tools');
    if (!tools) return;
    tools.innerHTML = '';

    const toolList = [
      { id: 'pick', icon: 'tech', label: 'Device' },
      { id: 'color', icon: 'palette', label: 'Color' },
      { id: 'spray', icon: 'brush', label: 'Spray' },
      { id: 'sticker', icon: 'star', label: 'Sticker' },
      { id: 'glitter', icon: 'sparkles', label: 'Glitter' },
      { id: 'dye', icon: 'brush', label: 'Paint' },
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
    const side = document.getElementById('tech-side');
    if (!side) return;
    side.innerHTML = '';

    if (toolId === 'pick') {
      const h4 = document.createElement('h4');
      h4.textContent = 'Choose Device';
      side.appendChild(h4);

      const grid = document.createElement('div');
      grid.className = 'item-grid';
      DEVICE_TYPES.forEach(d => {
        const cell = document.createElement('div');
        cell.className = 'item-cell' + (this.deviceType === d.id ? ' active' : '');
        cell.innerHTML = `<div style="text-align:center"><div>${Icons.get(d.id, 26)}</div><div style="font-size:10px;color:var(--text-muted);margin-top:4px;">${d.name}</div></div>`;
        cell.onclick = () => {
          this.deviceType = d.id;
          grid.querySelectorAll('.item-cell').forEach(c => c.classList.remove('active'));
          cell.classList.add('active');
          Sound.play('select');
          this._drawDevice();
        };
        grid.appendChild(cell);
      });
      side.appendChild(grid);

      if (!this.deviceType) {
        this._drawPlaceholder('Pick a device →');
      }
    } else if (toolId === 'color') {
      const h4 = document.createElement('h4');
      h4.textContent = 'Device Color';
      side.appendChild(h4);

      const colorBtn = document.createElement('div');
      colorBtn.className = 'color-pick-btn';
      colorBtn.style.background = this.deviceColor;
      colorBtn.onclick = () => {
        ColorWheel.setFromHex(this.deviceColor);
        ColorWheel.open('device', hex => {
          this.deviceColor = hex;
          colorBtn.style.background = hex;
          this._drawDevice();
        });
      };
      side.appendChild(colorBtn);

      const colors = ['#1a1a2e','#F5F5F5','#FFD700','#FF69B4','#1E90FF','#9370DB','#2E8B57','#FF4500','#C0C0C0','#8B0000','#000000','#87CEEB'];
      const qg = document.createElement('div');
      qg.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;';
      colors.forEach(c => {
        const sw = document.createElement('div');
        sw.className = 'cw-recent-swatch';
        sw.style.background = c;
        sw.onclick = () => { this.deviceColor = c; colorBtn.style.background = c; this._drawDevice(); Sound.play('click'); };
        qg.appendChild(sw);
      });
      side.appendChild(qg);

      // Screen color
      const h4b = document.createElement('h4');
      h4b.textContent = 'Screen Color';
      h4b.style.marginTop = '12px';
      side.appendChild(h4b);

      const presets = ['#111827','#0f172a','#1e1b4b','#14532d','#7c2d12','#1a1a2e','#4a044e','#172554'];
      const sg = document.createElement('div');
      sg.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
      presets.forEach(c => {
        const sw = document.createElement('div');
        sw.className = 'cw-recent-swatch';
        sw.style.background = c;
        sw.onclick = () => { this.screenColor = c; this._drawDevice(); Sound.play('click'); };
        sg.appendChild(sw);
      });
      side.appendChild(sg);
    } else if (toolId === 'spray') {
      this._buildPaintPanel(side, 'Spray Paint');
      Tools.currentTool = 'spray';
      Tools.setup('tech-canvas');
    } else if (toolId === 'sticker') {
      const h4 = document.createElement('h4');
      h4.textContent = 'Stickers';
      side.appendChild(h4);
      const techStickers = ['📱','💻','🎮','🎧','📷','🔋','📡','💡','⚡','🔌',
        '🎵','🎶','🌟','💎','🦋','🌸','❤️','⭐','🔥','💜'];
      const grid = document.createElement('div');
      grid.className = 'item-grid';
      techStickers.forEach(s => {
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
      Tools.setup('tech-canvas');
    } else if (toolId === 'glitter') {
      this._buildPaintPanel(side, 'Glitter');
      Tools.currentTool = 'glitter';
      Tools.setup('tech-canvas');
    } else if (toolId === 'dye') {
      this._buildPaintPanel(side, 'Paint');
      Tools.currentTool = 'dye';
      Tools.setup('tech-canvas');
    } else if (toolId === 'eraser') {
      Tools.currentTool = 'eraser';
      Tools.brushSize = 15;
      Tools.setup('tech-canvas');
      const h4 = document.createElement('h4');
      h4.textContent = 'Eraser';
      side.appendChild(h4);
      const p = document.createElement('p');
      p.style.cssText = 'font-size:12px;color:var(--text-muted);';
      p.textContent = 'Draw over areas to erase them.';
      side.appendChild(p);
      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn btn-ghost';
      resetBtn.style.cssText = 'width:100%;margin-top:12px;';
      resetBtn.textContent = '🔄 Reset Device';
      resetBtn.onclick = () => { this._drawDevice(); Sound.play('whoosh'); };
      side.appendChild(resetBtn);
    }
  },

  _buildPaintPanel(side, label) {
    const h4 = document.createElement('h4');
    h4.textContent = label + ' Color';
    side.appendChild(h4);

    const colorBtn = document.createElement('div');
    colorBtn.className = 'color-pick-btn';
    colorBtn.style.background = Tools.currentColor;
    colorBtn.onclick = () => {
      Tools.openColorPicker(hex => { colorBtn.style.background = hex; });
    };
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

    // Size slider
    const slbl = document.createElement('h4');
    slbl.textContent = 'Size';
    slbl.style.marginTop = '10px';
    side.appendChild(slbl);
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = '2'; slider.max = '30'; slider.value = Tools.brushSize;
    slider.style.cssText = 'width:100%;accent-color:var(--accent-pink);';
    slider.oninput = () => { Tools.brushSize = parseInt(slider.value); };
    side.appendChild(slider);
  },

  /* ===== DRAW ===== */
  _drawPlaceholder(msg) {
    const c = document.getElementById('tech-canvas');
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.font = '18px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(msg, c.width/2, c.height/2);
  },

  _drawDevice() {
    const c = document.getElementById('tech-canvas');
    if (!c || !this.deviceType) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w/2, cy = h/2;
    const d = DEVICE_TYPES.find(t => t.id === this.deviceType);
    if (!d) return;

    const sw = d.w, sh = d.h;

    if (this.deviceType === 'phone') {
      this._drawPhone(ctx, cx, cy, sw, sh);
    } else if (this.deviceType === 'tablet') {
      this._drawTablet(ctx, cx, cy, sw, sh);
    } else if (this.deviceType === 'airpods') {
      this._drawAirpods(ctx, cx, cy);
    }
  },

  _drawPhone(ctx, cx, cy, sw, sh) {
    const r = 16;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    this._roundRect(ctx, cx - sw/2 + 4, cy - sh/2 + 4, sw, sh, r);
    ctx.fill();

    // Body
    ctx.fillStyle = this.deviceColor;
    this._roundRect(ctx, cx - sw/2, cy - sh/2, sw, sh, r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Screen
    const margin = 12;
    ctx.fillStyle = this.screenColor;
    this._roundRect(ctx, cx - sw/2 + margin, cy - sh/2 + margin + 8, sw - margin*2, sh - margin*2 - 16, 8);
    ctx.fill();

    // Screen shine
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.moveTo(cx - sw/2 + margin, cy - sh/2 + margin + 8);
    ctx.lineTo(cx + sw/2 - margin, cy - sh/2 + margin + 8);
    ctx.lineTo(cx - sw/2 + margin, cy + sh/4);
    ctx.closePath();
    ctx.fill();

    // Camera dot
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(cx, cy - sh/2 + 10, 3, 0, Math.PI*2);
    ctx.fill();

    // Bottom bar
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    this._roundRect(ctx, cx - 20, cy + sh/2 - 14, 40, 4, 2);
    ctx.fill();

    // Metallic edge
    const [dh,ds,dl] = U.hexToHsl(this.deviceColor);
    ctx.strokeStyle = U.hslToHex(dh, ds, Math.min(100, dl + 15));
    ctx.lineWidth = 2;
    this._roundRect(ctx, cx - sw/2 + 1, cy - sh/2 + 1, sw - 2, sh - 2, r);
    ctx.stroke();
  },

  _drawTablet(ctx, cx, cy, sw, sh) {
    const r = 14;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    this._roundRect(ctx, cx - sw/2 + 4, cy - sh/2 + 4, sw, sh, r);
    ctx.fill();

    ctx.fillStyle = this.deviceColor;
    this._roundRect(ctx, cx - sw/2, cy - sh/2, sw, sh, r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const margin = 10;
    ctx.fillStyle = this.screenColor;
    this._roundRect(ctx, cx - sw/2 + margin, cy - sh/2 + margin, sw - margin*2, sh - margin*2, 6);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.moveTo(cx - sw/2 + margin, cy - sh/2 + margin);
    ctx.lineTo(cx + sw/2 - margin, cy - sh/2 + margin);
    ctx.lineTo(cx - sw/2 + margin, cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(cx, cy - sh/2 + 6, 2, 0, Math.PI*2);
    ctx.fill();

    const [dh,ds,dl] = U.hexToHsl(this.deviceColor);
    ctx.strokeStyle = U.hslToHex(dh, ds, Math.min(100, dl + 15));
    ctx.lineWidth = 2;
    this._roundRect(ctx, cx - sw/2 + 1, cy - sh/2 + 1, sw - 2, sh - 2, r);
    ctx.stroke();
  },

  _drawAirpods(ctx, cx, cy) {
    // Case
    const caseW = 90, caseH = 100, caseR = 20;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    this._roundRect(ctx, cx - caseW/2 + 3, cy - caseH/2 + 3, caseW, caseH, caseR);
    ctx.fill();

    ctx.fillStyle = this.deviceColor;
    this._roundRect(ctx, cx - caseW/2, cy - caseH/2, caseW, caseH, caseR);
    ctx.fill();

    // Hinge line
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - caseW/2 + 5, cy - 8);
    ctx.lineTo(cx + caseW/2 - 5, cy - 8);
    ctx.stroke();

    // LED indicator
    ctx.fillStyle = '#32CD32';
    ctx.beginPath();
    ctx.arc(cx, cy + caseH/2 - 15, 3, 0, Math.PI*2);
    ctx.fill();

    // Metallic edging
    const [dh,ds,dl] = U.hexToHsl(this.deviceColor);
    ctx.strokeStyle = U.hslToHex(dh, ds, Math.min(100, dl + 15));
    ctx.lineWidth = 2;
    this._roundRect(ctx, cx - caseW/2 + 1, cy - caseH/2 + 1, caseW - 2, caseH - 2, caseR);
    ctx.stroke();

    // Airpod outlines inside
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    [-18, 18].forEach(dx => {
      ctx.beginPath();
      ctx.ellipse(cx + dx, cy - 22, 12, 20, 0, 0, Math.PI*2);
      ctx.fill();
      // Stem
      ctx.fillRect(cx + dx - 3, cy - 5, 6, 15);
    });
  },

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  /* ===== FINISH ===== */
  finish() {
    const c = document.getElementById('tech-canvas');
    if (c && this.deviceType) {
      const imageData = c.toDataURL('image/png');
      const d = DEVICE_TYPES.find(t => t.id === this.deviceType);
      Game.addToCloset({
        id: Date.now(),
        type: 'tech',
        subtype: this.deviceType,
        name: (d ? d.name : 'Device') + ' Design',
        image: imageData,
        createdAt: Date.now(),
      });
    }

    Sound.play('complete');
    Game.addXP(50);
    Game.save();
    if (Game.checkLevelUp()) Game.goTo('levelup');
    else Game.goTo('workshop');
  }
};
