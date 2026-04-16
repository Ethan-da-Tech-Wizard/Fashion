/* ===== COLOR WHEEL ===== */
const ColorWheel = {
  canvas: null, ctx: null,
  hue: 330, sat: 100, light: 50,
  callback: null,
  target: null,
  recentColors: [],
  _dragging: false,

  init() {
    this.canvas = document.getElementById('cw-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.addEventListener('mousedown', e => this._onDown(e));
    this.canvas.addEventListener('mousemove', e => this._onMove(e));
    this.canvas.addEventListener('mouseup', () => this._dragging = false);
    this.canvas.addEventListener('mouseleave', () => this._dragging = false);
    this._drawWheel();
  },

  open(target, callback) {
    this.target = target;
    this.callback = callback;
    document.getElementById('cw-title').textContent = 'Pick a Color — ' + target;
    document.getElementById('colorwheel-modal').classList.add('active');
    this._loadPresets(target);
    this._drawWheel();
    this._updatePreview();
  },

  close() {
    document.getElementById('colorwheel-modal').classList.remove('active');
  },

  confirm() {
    const hex = this.getHex();
    if (!this.recentColors.includes(hex)) {
      this.recentColors.unshift(hex);
      if (this.recentColors.length > 12) this.recentColors.pop();
    }
    this._renderRecent();
    if (this.callback) this.callback(hex);
    Sound.play('select');
    this.close();
  },

  getHex() {
    return U.hslToHex(this.hue, this.sat, this.light);
  },

  getHSL() {
    return { h: this.hue, s: this.sat, l: this.light };
  },

  update() {
    this.light = parseInt(document.getElementById('cw-brightness').value);
    this.sat = parseInt(document.getElementById('cw-saturation').value);
    this._drawWheel();
    this._updatePreview();
  },

  fromHex() {
    const hex = document.getElementById('cw-hex').value;
    if (/^#[0-9a-f]{6}$/i.test(hex)) {
      const [h, s, l] = U.hexToHsl(hex);
      this.hue = h; this.sat = s; this.light = l;
      document.getElementById('cw-brightness').value = l;
      document.getElementById('cw-saturation').value = s;
      this._drawWheel();
      this._updatePreview();
    }
  },

  setFromHex(hex) {
    const [h, s, l] = U.hexToHsl(hex);
    this.hue = h; this.sat = s; this.light = l;
    document.getElementById('cw-brightness').value = l;
    document.getElementById('cw-saturation').value = s;
    this._drawWheel();
    this._updatePreview();
  },

  _drawWheel() {
    const c = this.canvas, ctx = this.ctx;
    const cx = c.width/2, cy = c.height/2;
    const outerR = cx - 4, innerR = outerR - 36;

    ctx.clearRect(0, 0, c.width, c.height);

    // Draw hue ring
    for (let a = 0; a < 360; a += 1) {
      const startA = (a - 1) * Math.PI / 180;
      const endA = (a + 1) * Math.PI / 180;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startA, endA);
      ctx.arc(cx, cy, innerR, endA, startA, true);
      ctx.closePath();
      ctx.fillStyle = `hsl(${a}, ${this.sat}%, ${this.light}%)`;
      ctx.fill();
    }

    // Draw indicator on ring
    const indA = this.hue * Math.PI / 180;
    const indR = (outerR + innerR) / 2;
    const indX = cx + Math.cos(indA) * indR;
    const indY = cy + Math.sin(indA) * indR;
    ctx.beginPath();
    ctx.arc(indX, indY, 10, 0, Math.PI*2);
    ctx.fillStyle = this.getHex();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw saturation/brightness gradient in center
    const gradR = innerR - 10;
    const imgData = ctx.createImageData(c.width, c.height);
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < gradR) {
          const s = ((x - (cx - gradR)) / (gradR * 2)) * 100;
          const l = 100 - ((y - (cy - gradR)) / (gradR * 2)) * 100;
          const [r, g, b] = U.hslToRgb(this.hue, U.clamp(s,0,100), U.clamp(l,0,100));
          const idx = (y * c.width + x) * 4;
          imgData.data[idx] = r;
          imgData.data[idx+1] = g;
          imgData.data[idx+2] = b;
          imgData.data[idx+3] = 255;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Redraw ring on top (since putImageData overwrites)
    for (let a = 0; a < 360; a += 1) {
      const startA = (a - 1) * Math.PI / 180;
      const endA = (a + 1) * Math.PI / 180;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startA, endA);
      ctx.arc(cx, cy, innerR, endA, startA, true);
      ctx.closePath();
      ctx.fillStyle = `hsl(${a}, ${this.sat}%, ${this.light}%)`;
      ctx.fill();
    }

    // Redraw indicator
    ctx.beginPath();
    ctx.arc(indX, indY, 10, 0, Math.PI*2);
    ctx.fillStyle = this.getHex();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
  },

  _onDown(e) {
    this._dragging = true;
    this._pick(e);
  },

  _onMove(e) {
    if (this._dragging) this._pick(e);
  },

  _pick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const outerR = cx - 4, innerR = outerR - 36;
    const gradR = innerR - 10;

    if (dist >= innerR && dist <= outerR) {
      // Picking hue from ring
      this.hue = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
      this._drawWheel();
      this._updatePreview();
    } else if (dist < gradR) {
      // Picking from center gradient
      this.sat = U.clamp(((x - (cx - gradR)) / (gradR * 2)) * 100, 0, 100);
      this.light = U.clamp(100 - ((y - (cy - gradR)) / (gradR * 2)) * 100, 0, 100);
      document.getElementById('cw-brightness').value = Math.round(this.light);
      document.getElementById('cw-saturation').value = Math.round(this.sat);
      this._updatePreview();
    }
  },

  _updatePreview() {
    const hex = this.getHex();
    document.getElementById('cw-preview').style.background = hex;
    document.getElementById('cw-hex').value = hex;
    // Update the color picker button that triggered this
    if (this.target === 'skin') {
      document.getElementById('skin-color-pick').style.background = hex;
    } else if (this.target === 'hair') {
      document.getElementById('hair-color-pick').style.background = hex;
    } else if (this.target === 'eyes') {
      document.getElementById('eye-color-pick').style.background = hex;
    }
  },

  _renderRecent() {
    const cont = document.getElementById('cw-recent');
    cont.innerHTML = '';
    this.recentColors.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'cw-recent-swatch';
      sw.style.background = c;
      sw.onclick = () => { this.setFromHex(c); };
      cont.appendChild(sw);
    });
  },

  _loadPresets(target) {
    const cont = document.getElementById('cw-presets');
    cont.innerHTML = '';
    let presets = [];
    if (target === 'skin') presets = SKIN_PRESETS;
    else if (target === 'hair') presets = HAIR_COLOR_PRESETS;
    else presets = ['#FF69B4','#FF6347','#FFD700','#32CD32','#1E90FF','#9370DB','#FF1493','#00CED1','#FFA500','#8B0000','#000000','#FFFFFF'];

    presets.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'cw-recent-swatch';
      sw.style.background = c;
      sw.onclick = () => { this.setFromHex(c); };
      cont.appendChild(sw);
    });
  }
};
