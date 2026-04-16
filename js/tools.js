/* ===== DRAWING TOOLS ===== */
const Tools = {
  currentTool: null,
  currentColor: '#ff69b4',
  brushSize: 8,
  _painting: false,
  _lastX: 0,
  _lastY: 0,
  _placedItems: [], // stickers, badges, pearls placed on current canvas
  _glitterParticles: [],

  /* Setup canvas interaction for a given canvas */
  setup(canvasId) {
    const c = document.getElementById(canvasId);
    if (!c) return;

    // Remove old listeners by cloning
    const newC = c.cloneNode(true);
    c.parentNode.replaceChild(newC, c);

    newC.addEventListener('mousedown', e => this._onDown(e, newC));
    newC.addEventListener('mousemove', e => this._onMove(e, newC));
    newC.addEventListener('mouseup', () => this._painting = false);
    newC.addEventListener('mouseleave', () => this._painting = false);
  },

  _getPos(e, c) {
    const rect = c.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (c.width / rect.width),
      y: (e.clientY - rect.top) * (c.height / rect.height)
    };
  },

  _onDown(e, c) {
    const pos = this._getPos(e, c);
    this._painting = true;
    this._lastX = pos.x;
    this._lastY = pos.y;
    const ctx = c.getContext('2d');

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
        this._floodFill(ctx, c, Math.round(pos.x), Math.round(pos.y), this.currentColor);
        Sound.play('paint');
        break;
    }
  },

  _onMove(e, c) {
    if (!this._painting) return;
    const pos = this._getPos(e, c);
    const ctx = c.getContext('2d');

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
    this._lastX = pos.x;
    this._lastY = pos.y;
  },

  /* ===== BRUSH ===== */
  _drawBrush(ctx, x, y) {
    ctx.fillStyle = this.currentColor;
    ctx.beginPath();
    ctx.arc(x, y, this.brushSize, 0, Math.PI*2);
    ctx.fill();
  },

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

  /* ===== SPRAY PAINT ===== */
  _drawSpray(ctx, x, y) {
    const density = 30;
    const radius = this.brushSize * 3;
    ctx.fillStyle = this.currentColor;
    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      const size = Math.random() * 1.5 + 0.5;
      ctx.globalAlpha = Math.random() * 0.3 + 0.1;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  /* ===== GLITTER ===== */
  _drawGlitter(ctx, x, y) {
    const count = 15;
    const radius = this.brushSize * 2.5;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      const size = Math.random() * 3 + 1;
      const hue = (U.hexToHsl(this.currentColor)[0] + Math.random()*30 - 15 + 360) % 360;
      ctx.fillStyle = U.hslToHex(hue, 100, 50 + Math.random()*30);
      ctx.globalAlpha = Math.random() * 0.6 + 0.4;

      // Draw tiny star/diamond shape
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.random() * Math.PI);
      ctx.beginPath();
      for (let j = 0; j < 4; j++) {
        const a = j * Math.PI / 2;
        const r = j % 2 === 0 ? size : size * 0.4;
        if (j === 0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
        else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },

  /* ===== STICKER ===== */
  currentSticker: '⭐',
  _placeSticker(ctx, x, y) {
    const size = this.brushSize * 3;
    ctx.font = `${size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.currentSticker, x, y);
    this._placedItems.push({ type:'sticker', emoji: this.currentSticker, x, y, size });
  },

  /* ===== BADGE ===== */
  currentBadge: '🏆',
  _placeBadge(ctx, x, y) {
    const size = this.brushSize * 4;
    ctx.font = `${size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.currentBadge, x, y);
    this._placedItems.push({ type:'badge', emoji: this.currentBadge, x, y, size });
  },

  /* ===== PEARL ===== */
  _drawPearl(ctx, x, y) {
    const size = this.brushSize * 0.6;
    // Pearl with shine
    const grad = ctx.createRadialGradient(x - size*0.3, y - size*0.3, 0, x, y, size);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.3, this.currentColor);
    grad.addColorStop(1, U.hslToHex(...U.hexToHsl(this.currentColor).map((v,i) => i===2 ? v*0.6 : v)));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI*2);
    ctx.fill();
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(x - size*0.25, y - size*0.25, size*0.3, 0, Math.PI*2);
    ctx.fill();
  },

  /* ===== CUT TOOL ===== */
  _drawCut(ctx, x, y) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(this._lastX, this._lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.setLineDash([]);
  },

  /* ===== STENCIL ===== */
  currentStencil: 0,
  stencilColors: ['#ff69b4', '#ffd700', '#3edbd5', '#b36bff'],
  _drawStencil(ctx, x, y) {
    if (STENCIL_SETS[this.currentStencil]) {
      // Use up to 4 colors
      const colors = this.stencilColors;
      const stencil = STENCIL_SETS[this.currentStencil];
      ctx.fillStyle = colors[0] || this.currentColor;
      stencil.draw(ctx, x, y, this.brushSize * 2);
    }
  },

  /* ===== ERASER ===== */
  _erase(ctx, x, y) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, this.brushSize * 2, 0, Math.PI*2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  },

  /* ===== FLOOD FILL ===== */
  _floodFill(ctx, canvas, startX, startY, fillColor) {
    const w = canvas.width, h = canvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const [fr, fg, fb] = U.hexToRgb(fillColor);
    const startIdx = (startY * w + startX) * 4;
    const tr = data[startIdx], tg = data[startIdx+1], tb = data[startIdx+2], ta = data[startIdx+3];

    if (tr === fr && tg === fg && tb === fb) return;

    const stack = [[startX, startY]];
    const visited = new Set();
    const tolerance = 30;

    const match = (idx) => {
      return Math.abs(data[idx] - tr) < tolerance &&
             Math.abs(data[idx+1] - tg) < tolerance &&
             Math.abs(data[idx+2] - tb) < tolerance &&
             Math.abs(data[idx+3] - ta) < tolerance;
    };

    let count = 0;
    while (stack.length > 0 && count < 100000) {
      const [x, y] = stack.pop();
      const key = y * w + x;
      if (visited.has(key)) continue;
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      const idx = key * 4;
      if (!match(idx)) continue;
      visited.add(key);
      data[idx] = fr; data[idx+1] = fg; data[idx+2] = fb; data[idx+3] = 255;
      stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
      count++;
    }
    ctx.putImageData(imageData, 0, 0);
  },

  /* ===== UTILITY ===== */
  clearPlaced() { this._placedItems = []; },

  setColor(hex) {
    this.currentColor = hex;
  },

  openColorPicker(callback) {
    ColorWheel.setFromHex(this.currentColor);
    ColorWheel.open('tool color', hex => {
      this.currentColor = hex;
      if (callback) callback(hex);
    });
  }
};
