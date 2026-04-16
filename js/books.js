/* ===== BOOK SHOP ===== */
const Books = {
  bookTitle: '',
  bookGenre: null,
  bookColor: '#8B4513',
  bookAccentColor: '#FFD700',
  isRandom: false,

  init() {
    const c = document.getElementById('books-canvas');
    if (!c) return;
    const parent = c.parentElement;
    const rect = parent.getBoundingClientRect();
    c.width = Math.min(rect.width - 290, 700);
    c.height = Math.min(rect.height, 500);

    this.bookTitle = '';
    this.bookGenre = null;
    this.isRandom = false;
    this._buildTools();
    this._buildSidePanel('create');
  },

  /* ===== TOOLS ===== */
  _buildTools() {
    const tools = document.getElementById('books-tools');
    if (!tools) return;
    tools.innerHTML = '';

    const toolList = [
      { id: 'create', icon: 'books', label: 'Create' },
      { id: 'cover', icon: 'palette', label: 'Cover' },
      { id: 'decorate', icon: 'sparkles', label: 'Decorate' },
      { id: 'sticker', icon: 'star', label: 'Sticker' },
      { id: 'title', icon: 'edit', label: 'Title' },
      { id: 'random', icon: 'dice', label: 'Random' },
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
    const side = document.getElementById('books-side');
    if (!side) return;
    side.innerHTML = '';

    switch(toolId) {
      case 'create': this._buildCreatePanel(side); break;
      case 'cover': this._buildCoverPanel(side); break;
      case 'decorate': this._buildDecoratePanel(side); break;
      case 'sticker': this._buildStickerPanel(side); break;
      case 'title': this._buildTitlePanel(side); break;
      case 'random': this._generateRandom(side); break;
    }
  },

  /* ===== CREATE PANEL ===== */
  _buildCreatePanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Book Genre';
    side.appendChild(h4);

    const grid = document.createElement('div');
    grid.className = 'item-grid';
    const genreEmojis = {
      Fantasy: '🧙', Romance: '💕', Mystery: '🔍', 'Sci-Fi': '🚀',
      Adventure: '⛰️', Cooking: '🍳', Art: '🎨', Poetry: '📝',
      Comics: '💥', Fashion: '👗'
    };

    BOOK_GENRES.forEach(g => {
      const cell = document.createElement('div');
      cell.className = 'item-cell' + (this.bookGenre === g ? ' active' : '');
      cell.innerHTML = `<div style="text-align:center"><div>${Icons.get('books', 20)}</div><div style="font-size:9px;color:var(--text-muted);margin-top:4px;">${g}</div></div>`;
      cell.onclick = () => {
        this.bookGenre = g;
        grid.querySelectorAll('.item-cell').forEach(c => c.classList.remove('active'));
        cell.classList.add('active');
        Sound.play('select');
        this._drawBook();
      };
      grid.appendChild(cell);
    });
    side.appendChild(grid);

    if (!this.bookGenre) {
      const c = document.getElementById('books-canvas');
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.font = '18px Outfit'; ctx.textAlign = 'center';
      ctx.fillText('Pick a genre to start →', c.width/2, c.height/2);
    }
  },

  /* ===== COVER PANEL ===== */
  _buildCoverPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Cover Color';
    side.appendChild(h4);

    const colorBtn = document.createElement('div');
    colorBtn.className = 'color-pick-btn';
    colorBtn.style.background = this.bookColor;
    colorBtn.onclick = () => {
      ColorWheel.setFromHex(this.bookColor);
      ColorWheel.open('book cover', hex => {
        this.bookColor = hex;
        colorBtn.style.background = hex;
        this._drawBook();
      });
    };
    side.appendChild(colorBtn);

    const colors = ['#8B4513','#1a1a2e','#800020','#006400','#191970','#4B0082',
      '#DC143C','#FF69B4','#FFD700','#00CED1','#2E8B57','#FF4500',
      '#F5F5DC','#C0C0C0','#D2691E','#F0F0F0'];
    const qg = document.createElement('div');
    qg.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;';
    colors.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'cw-recent-swatch';
      sw.style.background = c;
      sw.onclick = () => { this.bookColor = c; colorBtn.style.background = c; this._drawBook(); Sound.play('click'); };
      qg.appendChild(sw);
    });
    side.appendChild(qg);

    // Accent color
    const h4b = document.createElement('h4');
    h4b.textContent = 'Accent Color';
    h4b.style.marginTop = '12px';
    side.appendChild(h4b);

    const accBtn = document.createElement('div');
    accBtn.className = 'color-pick-btn';
    accBtn.style.background = this.bookAccentColor;
    accBtn.onclick = () => {
      ColorWheel.setFromHex(this.bookAccentColor);
      ColorWheel.open('accent', hex => {
        this.bookAccentColor = hex;
        accBtn.style.background = hex;
        this._drawBook();
      });
    };
    side.appendChild(accBtn);

    const accents = ['#FFD700','#C0C0C0','#FFFFFF','#FF69B4','#00CED1','#FF4500','#9370DB','#2E8B57'];
    const ag = document.createElement('div');
    ag.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;';
    accents.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'cw-recent-swatch';
      sw.style.background = c;
      sw.onclick = () => { this.bookAccentColor = c; accBtn.style.background = c; this._drawBook(); Sound.play('click'); };
      ag.appendChild(sw);
    });
    side.appendChild(ag);
  },

  /* ===== DECORATE PANEL ===== */
  _buildDecoratePanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Paint on Cover';
    side.appendChild(h4);

    const colorBtn = document.createElement('div');
    colorBtn.className = 'color-pick-btn';
    colorBtn.style.background = Tools.currentColor;
    colorBtn.onclick = () => { Tools.openColorPicker(hex => { colorBtn.style.background = hex; }); };
    side.appendChild(colorBtn);

    const quickColors = ['#FFD700','#FF69B4','#FFFFFF','#000000','#FF6347','#1E90FF','#32CD32','#9370DB','#FF4500','#00CED1'];
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

    // Tool sub-selection
    const h4b = document.createElement('h4');
    h4b.textContent = 'Tool';
    h4b.style.marginTop = '10px';
    side.appendChild(h4b);

    const subTools = [
      { id: 'dye', label: '🖌️ Brush' },
      { id: 'glitter', label: '✨ Glitter' },
      { id: 'eraser', label: '🧹 Eraser' },
    ];

    const toolRow = document.createElement('div');
    toolRow.style.cssText = 'display:flex;gap:4px;';
    subTools.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost';
      btn.style.cssText = 'flex:1;font-size:12px;padding:6px;';
      btn.textContent = t.label;
      btn.onclick = () => {
        Tools.currentTool = t.id;
        toolRow.querySelectorAll('.btn').forEach(b => b.className = 'btn btn-ghost');
        btn.className = 'btn btn-primary';
        btn.style.cssText = 'flex:1;font-size:12px;padding:6px;';
        Sound.play('click');
      };
      toolRow.appendChild(btn);
    });
    side.appendChild(toolRow);

    // Brush size
    const slbl = document.createElement('h4');
    slbl.textContent = 'Size'; slbl.style.marginTop = '8px';
    side.appendChild(slbl);
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = '2'; slider.max = '20'; slider.value = Tools.brushSize;
    slider.style.cssText = 'width:100%;accent-color:var(--accent-pink);';
    slider.oninput = () => { Tools.brushSize = parseInt(slider.value); };
    side.appendChild(slider);

    Tools.currentTool = 'dye';
    Tools.brushSize = 5;
    Tools.setup('books-canvas');
  },

  /* ===== STICKER PANEL ===== */
  _buildStickerPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Book Stickers';
    side.appendChild(h4);

    const bookStickers = ['📚','📖','📕','📗','📘','📙','🔖','🏷️',
      '⭐','💫','✨','🌟','💎','👑','🦋','🌸',
      '❤️','💜','💙','💚','💛','🧡','🔥','🌈'];
    const grid = document.createElement('div');
    grid.className = 'item-grid';
    bookStickers.forEach(s => {
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
    Tools.setup('books-canvas');
  },

  /* ===== TITLE PANEL ===== */
  _buildTitlePanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Book Title';
    side.appendChild(h4);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter book title...';
    input.value = this.bookTitle;
    input.maxLength = 30;
    input.style.cssText = 'width:100%;padding:8px 12px;border:1px solid rgba(255,255,255,0.15);border-radius:8px;background:rgba(255,255,255,0.05);color:#fff;font-family:var(--font-display);font-size:14px;margin-bottom:10px;box-sizing:border-box;';
    input.oninput = () => {
      this.bookTitle = input.value;
      this._drawBook();
    };
    side.appendChild(input);

    // Quick title suggestions based on genre
    const h4b = document.createElement('h4');
    h4b.textContent = 'Suggestions';
    h4b.style.marginTop = '8px';
    side.appendChild(h4b);

    const suggestions = this._getTitleSuggestions();
    suggestions.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost';
      btn.style.cssText = 'width:100%;margin-bottom:4px;font-size:11px;text-align:left;padding:6px 10px;';
      btn.textContent = '📝 ' + t;
      btn.onclick = () => {
        this.bookTitle = t;
        input.value = t;
        this._drawBook();
        Sound.play('click');
      };
      side.appendChild(btn);
    });
  },

  _getTitleSuggestions() {
    const genreTitles = {
      Fantasy: ['The Crystal Kingdom', 'Dragon\'s Gift', 'Enchanted Threads', 'Moonlit Spells'],
      Romance: ['Heart of Silk', 'Love in Bloom', 'Velvet Kisses', 'The Rose Garden'],
      Mystery: ['The Hidden Stitch', 'Shadow Couture', 'Vanishing Act', 'The Lost Button'],
      'Sci-Fi': ['Neon Threads', 'Galaxy Weaver', 'Chrome Dreams', 'The Fabric of Time'],
      Adventure: ['The Fashion Quest', 'Runway Explorer', 'Bold Horizons', 'The Golden Needle'],
      Cooking: ['Recipes in Style', 'The Fashion Chef', 'Sweet Creations', 'Flavor & Flair'],
      Art: ['Colors Unleashed', 'The Art of Style', 'Painted Dreams', 'Canvas & Cloth'],
      Poetry: ['Silk Sonnets', 'Threaded Verses', 'Whispers of Color', 'Lyrical Design'],
      Comics: ['Super Stylist', 'Fashion Force', 'The Style Squad', 'Glitter Galaxy'],
      Fashion: ['The Runway Bible', 'Style Secrets', 'Fashion Forward', 'Trend Setter'],
    };
    return genreTitles[this.bookGenre] || BOOK_TITLES_RANDOM.slice(0, 4);
  },

  /* ===== RANDOM BOOK ===== */
  _generateRandom(side) {
    this.isRandom = true;
    this.bookGenre = U.pick(BOOK_GENRES);
    this.bookTitle = U.pick(BOOK_TITLES_RANDOM);
    this.bookColor = U.pick(['#8B4513','#1a1a2e','#800020','#006400','#191970','#4B0082','#DC143C','#FF69B4']);
    this.bookAccentColor = U.pick(['#FFD700','#C0C0C0','#FFFFFF','#FF69B4','#00CED1']);

    const h4 = document.createElement('h4');
    h4.textContent = '🎲 Random Book!';
    side.appendChild(h4);

    const info = document.createElement('div');
    info.style.cssText = 'padding:12px;background:rgba(255,255,255,0.05);border-radius:8px;margin-top:8px;';
    info.innerHTML = `
      <div style="font-size:13px;margin-bottom:6px;"><strong>Genre:</strong> ${this.bookGenre}</div>
      <div style="font-size:13px;margin-bottom:6px;"><strong>Title:</strong> ${this.bookTitle}</div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:8px;">
        <div style="width:24px;height:24px;border-radius:4px;background:${this.bookColor};"></div>
        <span style="font-size:11px;color:var(--text-muted)">Cover</span>
        <div style="width:24px;height:24px;border-radius:4px;background:${this.bookAccentColor};"></div>
        <span style="font-size:11px;color:var(--text-muted)">Accent</span>
      </div>
    `;
    side.appendChild(info);

    // Re-roll button
    const reroll = document.createElement('button');
    reroll.className = 'btn btn-accent';
    reroll.style.cssText = 'width:100%;margin-top:12px;';
    reroll.textContent = '🎲 Roll Again';
    reroll.onclick = () => {
      Sound.play('whoosh');
      this._generateRandom(side);
    };
    side.appendChild(reroll);

    this._drawBook();
    Sound.play('sparkle');
  },

  /* ===== DRAW BOOK ===== */
  _drawBook() {
    const c = document.getElementById('books-canvas');
    if (!c || !this.bookGenre) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w/2, cy = h/2;
    const bw = 160, bh = 220; // book dimensions

    // Book shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    this._roundRect(ctx, cx - bw/2 + 6, cy - bh/2 + 6, bw, bh, 4);
    ctx.fill();

    // Book pages (side)
    ctx.fillStyle = '#F5F0E8';
    ctx.fillRect(cx - bw/2 + 3, cy - bh/2 + 5, 8, bh - 10);
    // Page lines
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 0.5;
    for (let y = cy - bh/2 + 15; y < cy + bh/2 - 10; y += 4) {
      ctx.beginPath();
      ctx.moveTo(cx - bw/2 + 4, y);
      ctx.lineTo(cx - bw/2 + 10, y);
      ctx.stroke();
    }

    // Book cover - main
    const [bkh, bks, bkl] = U.hexToHsl(this.bookColor);
    ctx.fillStyle = this.bookColor;
    this._roundRect(ctx, cx - bw/2, cy - bh/2, bw, bh, 4);
    ctx.fill();

    // Cover texture - subtle gradient
    const grad = ctx.createLinearGradient(cx - bw/2, cy - bh/2, cx + bw/2, cy + bh/2);
    grad.addColorStop(0, 'rgba(255,255,255,0.08)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = grad;
    this._roundRect(ctx, cx - bw/2, cy - bh/2, bw, bh, 4);
    ctx.fill();

    // Spine highlight
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(cx - bw/2, cy - bh/2, 12, bh);

    // Decorative border
    ctx.strokeStyle = this.bookAccentColor;
    ctx.lineWidth = 2;
    this._roundRect(ctx, cx - bw/2 + 12, cy - bh/2 + 12, bw - 24, bh - 24, 2);
    ctx.stroke();

    // Corner ornaments
    ctx.fillStyle = this.bookAccentColor;
    const corners = [
      [cx - bw/2 + 16, cy - bh/2 + 16],
      [cx + bw/2 - 16, cy - bh/2 + 16],
      [cx - bw/2 + 16, cy + bh/2 - 16],
      [cx + bw/2 - 16, cy + bh/2 - 16],
    ];
    corners.forEach(([ox, oy]) => {
      ctx.beginPath();
      ctx.arc(ox, oy, 3, 0, Math.PI*2);
      ctx.fill();
    });

    // Title
    if (this.bookTitle) {
      ctx.fillStyle = this.bookAccentColor;
      ctx.font = 'bold 16px Fredoka';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Word wrap
      const words = this.bookTitle.split(' ');
      const maxWidth = bw - 40;
      let lines = [];
      let currentLine = '';
      words.forEach(word => {
        const test = currentLine ? currentLine + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = test;
        }
      });
      if (currentLine) lines.push(currentLine);

      const lineH = 20;
      const startY = cy + 30 - ((lines.length - 1) * lineH) / 2;
      lines.forEach((line, i) => {
        ctx.fillText(line, cx + 4, startY + i * lineH);
      });
    }

    // Genre label at bottom
    ctx.fillStyle = this.bookAccentColor;
    ctx.globalAlpha = 0.5;
    ctx.font = '10px Outfit';
    ctx.fillText(this.bookGenre || '', cx + 4, cy + bh/2 - 22);
    ctx.globalAlpha = 1;

    // Shiny edge effect
    ctx.strokeStyle = U.hslToHex(bkh, bks, Math.min(100, bkl + 20));
    ctx.lineWidth = 1;
    this._roundRect(ctx, cx - bw/2 + 1, cy - bh/2 + 1, bw - 2, bh - 2, 4);
    ctx.stroke();
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
    if (!this.bookGenre) {
      Sound.play('error');
      return;
    }

    const c = document.getElementById('books-canvas');
    if (c) {
      const imageData = c.toDataURL('image/png');
      Game.addToCloset({
        id: Date.now(),
        type: 'books',
        subtype: this.bookGenre,
        name: this.bookTitle || ('The ' + this.bookGenre + ' Book'),
        image: imageData,
        genre: this.bookGenre,
        createdAt: Date.now(),
      });
    }

    Sound.play('complete');
    Game.addXP(35);
    Game.save();
    if (Game.checkLevelUp()) Game.goTo('levelup');
    else Game.goTo('workshop');
  }
};
