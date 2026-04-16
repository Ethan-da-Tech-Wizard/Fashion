/* ===== FASHION STUDIO STATION ===== */
const Stations = {
  currentStep: 0,
  steps: ['type','fabric','cut','decorate','preview'],
  garmentType: null,
  fabricPattern: null,
  fabricColor: '#ff69b4',
  decorCanvas: null,

  init(step) {
    this.currentStep = step || 0;
    this._resizeCanvas();
    this._renderStep();
  },

  _resizeCanvas() {
    const c = document.getElementById('studio-canvas');
    if (!c) return;
    const parent = c.parentElement;
    const rect = parent.getBoundingClientRect();
    c.width = Math.min(rect.width - 290, 700);
    c.height = Math.min(rect.height, 500);
  },

  nextStep() {
    if (this.currentStep === 0 && !this.garmentType) {
      Sound.play('error');
      return;
    }
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this._renderStep();
      Sound.play('whoosh');
    } else {
      // Save to closet
      this._saveToCloset();
    }
  },

  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this._renderStep();
      Sound.play('whoosh');
    }
  },

  _renderStep() {
    // Update step indicators
    document.querySelectorAll('#studio-steps .step').forEach((el, i) => {
      el.classList.remove('active', 'done');
      if (i === this.currentStep) el.classList.add('active');
      else if (i < this.currentStep) el.classList.add('done');
    });

    const step = this.steps[this.currentStep];
    switch(step) {
      case 'type': this._renderTypeStep(); break;
      case 'fabric': this._renderFabricStep(); break;
      case 'cut': this._renderCutStep(); break;
      case 'decorate': this._renderDecorateStep(); break;
      case 'preview': this._renderPreviewStep(); break;
    }

    // Show/hide buttons
    document.getElementById('studio-prev').style.visibility = this.currentStep > 0 ? 'visible' : 'hidden';
    document.getElementById('studio-next').textContent = this.currentStep === this.steps.length - 1 ? 'Save to Closet ✓' : 'Next →';
  },

  /* ===== TYPE STEP ===== */
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
      cell.innerHTML = `<div style="text-align:center"><div style="font-size:28px">${g.emoji}</div><div style="font-size:10px;color:var(--text-muted)">${g.name}</div></div>`;
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

    if (this.garmentType) this._drawGarmentOutline();
    else this._drawPlaceholder('Pick a garment type →');
  },

  _drawPlaceholder(msg) {
    const c = document.getElementById('studio-canvas');
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.font = '18px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(msg, c.width/2, c.height/2);
  },

  _drawGarmentOutline() {
    const c = document.getElementById('studio-canvas');
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
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

  _drawGarmentPath(ctx, type, cx, cy, scale) {
    const s = scale;
    ctx.beginPath();
    switch(type) {
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
      case 'headband':
        ctx.ellipse(cx, cy, 50*s, 30*s, 0, 0, Math.PI*2);
        ctx.moveTo(cx + 50*s, cy);
        ctx.ellipse(cx, cy, 45*s, 25*s, 0, 0, Math.PI*2);
        break;
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
  _renderFabricStep() {
    const tools = document.getElementById('studio-tools');
    tools.innerHTML = '';

    const side = document.getElementById('studio-side');
    side.innerHTML = '<h4>Choose Fabric</h4>';

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

    if (!this.fabricPattern) this.fabricPattern = 'solid';
    this._drawFabric();
  },

  _drawFabric() {
    const c = document.getElementById('studio-canvas');
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w/2, cy = h/2;

    // Fill garment shape with fabric
    ctx.save();
    this._drawGarmentPath(ctx, this.garmentType, cx, cy, 1);
    ctx.clip();

    // Base color
    ctx.fillStyle = this.fabricColor;
    ctx.fillRect(0, 0, w, h);

    // Pattern overlay
    const [ph, ps, pl] = U.hexToHsl(this.fabricColor);
    const patternColor = U.hslToHex(ph, ps, Math.max(0, pl - 20));
    const patternLight = U.hslToHex(ph, ps, Math.min(100, pl + 15));

    ctx.fillStyle = patternColor;
    ctx.strokeStyle = patternColor;

    switch(this.fabricPattern) {
      case 'stripes':
        ctx.lineWidth = 6;
        for (let x = -h; x < w + h; x += 20) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + h, h);
          ctx.stroke();
        }
        break;
      case 'polka':
        for (let y = 0; y < h; y += 25) {
          for (let x = (y % 50 === 0 ? 0 : 12); x < w; x += 25) {
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI*2);
            ctx.fill();
          }
        }
        break;
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
      case 'stars':
        for (let y = 20; y < h; y += 40) {
          for (let x = (y % 80 < 40 ? 20 : 40); x < w; x += 40) {
            ctx.fillStyle = patternLight;
            U.drawStar(ctx, x, y, 8, 5);
          }
        }
        break;
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

    ctx.restore();

    // Outline
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    this._drawGarmentPath(ctx, this.garmentType, cx, cy, 1);
    ctx.stroke();
  },

  /* ===== CUT STEP ===== */
  _renderCutStep() {
    const tools = document.getElementById('studio-tools');
    tools.innerHTML = `
      <button class="tool-btn active" title="Scissors">✂️</button>
    `;

    const side = document.getElementById('studio-side');
    side.innerHTML = '<h4>Cut Along the Lines!</h4><p style="font-size:12px;color:var(--text-muted)">Trace the dotted outline with your mouse to cut the fabric</p>';

    Tools.currentTool = 'cut';
    Tools.setup('studio-canvas');

    // Draw the fabric with cut guides
    this._drawFabric();

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
    c.style.cursor = 'crosshair';
  },

  /* ===== DECORATE STEP ===== */
  _renderDecorateStep() {
    // Save current fabric as base
    const c = document.getElementById('studio-canvas');
    this._drawFabric();

    // Setup tools
    const tools = document.getElementById('studio-tools');
    tools.innerHTML = '';

    const toolList = [
      { id: 'dye', icon: '🎨', label: 'Dye' },
      { id: 'fill', icon: '🪣', label: 'Fill' },
      { id: 'glitter', icon: '✨', label: 'Glitter' },
      { id: 'sticker', icon: '⭐', label: 'Sticker' },
      { id: 'badge', icon: '🏅', label: 'Badge' },
      { id: 'pearl', icon: '🫧', label: 'Pearl' },
      { id: 'eraser', icon: '🧹', label: 'Eraser' },
    ];

    toolList.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn' + (Tools.currentTool === t.id ? ' active' : '');
      btn.innerHTML = `${t.icon}<span class="tool-label">${t.label}</span>`;
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

    Tools.currentTool = 'dye';
    Tools.setup('studio-canvas');
    tools.querySelector('.tool-btn').classList.add('active');
    this._updateSidePanel('dye');
  },

  _updateSidePanel(toolId) {
    const side = document.getElementById('studio-side');
    side.innerHTML = '';

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
  _saveToCloset() {
    const c = document.getElementById('studio-canvas');
    const imageData = c.toDataURL('image/png');
    const item = {
      id: Date.now(),
      type: 'clothes',
      subtype: this.garmentType,
      name: GARMENT_TYPES.find(g => g.id === this.garmentType)?.name || 'Item',
      image: imageData,
      fabricColor: this.fabricColor,
      fabricPattern: this.fabricPattern,
      createdAt: Date.now(),
    };

    Game.addToCloset(item);
    Game.addXP(50);
    Sound.play('complete');

    // Reset for next item
    this.currentStep = 0;
    this.garmentType = null;
    this.fabricPattern = 'solid';

    // Check level up
    if (Game.checkLevelUp()) {
      Game.goTo('levelup');
    } else {
      Game.goTo('workshop');
    }
  }
};








/* ===== CLOSET ===== */
const Closet = {
  currentFilter: 'all',

  filterTab(tab) {
    this.currentFilter = tab;
    document.querySelectorAll('.closet-tabs .tab').forEach(t => {
      t.classList.toggle('active', t.textContent.trim() === tab || (tab === 'all' && t.textContent.includes('All')));
    });
    this.render();
    Sound.play('click');
  },

  render() {
    const grid = document.getElementById('closet-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let items = Game.state.closet || [];
    if (this.currentFilter !== 'all') {
      items = items.filter(i => i.type === this.currentFilter);
    }

    // Item count
    const countEl = document.createElement('div');
    countEl.style.cssText = 'grid-column:1/-1;text-align:center;font-size:13px;color:var(--text-muted);padding:4px;';
    const total = (Game.state.closet || []).length;
    countEl.textContent = this.currentFilter === 'all'
      ? `${total} item${total !== 1 ? 's' : ''} in your closet`
      : `${items.length} ${this.currentFilter} item${items.length !== 1 ? 's' : ''}`;
    grid.appendChild(countEl);

    if (items.length === 0) {
      grid.innerHTML += '<p class="empty-msg" style="grid-column:1/-1;">Your closet is empty! Create some items in the workshop.</p>';
      return;
    }

    const typeEmojis = { clothes: '👗', hair: '💇', makeup: '💄', tech: '📱', decor: '🛋️', books: '📚' };

    items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'closet-item';
      card.style.position = 'relative';

      // Type badge
      const badge = document.createElement('div');
      badge.style.cssText = 'position:absolute;top:6px;left:6px;font-size:14px;background:rgba(0,0,0,0.4);border-radius:6px;padding:2px 6px;z-index:2;';
      badge.textContent = typeEmojis[item.type] || '✨';
      card.appendChild(badge);

      if (item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.style.cssText = 'width:100%;height:100px;object-fit:contain;border-radius:8px;';
        card.appendChild(img);
      } else {
        const emoji = document.createElement('div');
        emoji.style.cssText = 'font-size:48px;padding:20px;';
        emoji.textContent = GARMENT_TYPES.find(g => g.id === item.subtype)?.emoji || typeEmojis[item.type] || '✨';
        card.appendChild(emoji);
      }

      const name = document.createElement('div');
      name.className = 'item-name';
      name.textContent = item.name;
      card.appendChild(name);

      // Delete button
      const del = document.createElement('button');
      del.style.cssText = 'position:absolute;top:6px;right:6px;background:rgba(220,20,60,0.6);border:none;color:#fff;border-radius:50%;width:20px;height:20px;font-size:10px;cursor:pointer;display:none;z-index:2;';
      del.textContent = '✕';
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
