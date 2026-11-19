// ==============================================================================
// Program: books.js
// Programmer: Ethan-da-Tech-Wizard
// Last Modified: November 19, 2026
// Purpose: Publishing lookbook design station and hardcover literature crafting engine.
//          Renders dimensional hardcover books with spine creases, gilded filigree
//          borders, embossed genre cover art, customizable typography, and sticker
//          stamps for resale in the player's fashion boutique.
// FILE OVERVIEW
// books.js is the Book Shop station (#books-screen in index.html): the player picks a genre, a
// cover colour and accent colour, a title, optional paint/glitter/stickers on the cover, or lets the
// game roll a random book. "Done" saves a picture of the book in the closet so it can be sold to
// customers.
//
// Who calls it: Game.goTo('books') calls Books.init(); the screen's Done button calls Books.finish().
// It uses Tools (painting on #books-canvas), ColorWheel, Icons, Sound, U (random picks, colour maths),
// BOOK_GENRES and BOOK_TITLES_RANDOM (utils.js) and Game (addToCloset, addXP, save, checkLevelUp, goTo).
//
// Layout: the usual three columns: #books-tools (tool buttons), #books-canvas (the book) and
// #books-side (options). _buildTools creates the buttons; _buildSidePanel(toolId) picks one of the
// panel builders (create, cover, decorate, sticker, title, random).
//
// State on Books: bookTitle (text, up to 30 characters), bookGenre (one of BOOK_GENRES or null until
// chosen), bookColor (cover), bookAccentColor (border, ornaments and title text) and isRandom. The book
// picture needs a genre, so nothing is drawn until one is chosen. _drawBook() repaints the book from
// this state and wipes any paint or stickers.
//
// Known limits / things to watch:
//   - (Fixed) Tools.setup() used to swap the canvas for a blank clone, so opening the Decorate or Sticker panel
//     blanked the book until _drawBook() ran again; the canvas element is now kept and its pixels persist.
//   - Every genre cell shows the same 'books' icon; the genreEmojis table is defined but not shown.
//   - The title is typed by the player. It is drawn with fillText (safe), but it is also saved as the item's
//     name, which Game._serveCustomer later inserts as HTML (now escaped with U.escapeHtml).
//   - `isRandom` is set but never read.
// How to test: Game.goTo('books'); Books.bookGenre = 'Fantasy'; Books.bookTitle = 'Test'; Books._drawBook() in the console.
// ==============================================================================
/* ===== BOOK SHOP WORKSTATION ===== */
// Singleton controller for the Book Shop station.
const Books = {
  // Title text, empty until typed or chosen. If empty when saved, the closet name becomes "The <Genre> Book".
  bookTitle: '',

  // Genre chosen from BOOK_GENRES; null means no book has been started (nothing is drawn and Done is refused).
  bookGenre: null,

  // Cover colour (default saddle brown, like a leather-bound book).
  bookColor: '#8B4513',

  // Accent colour used for the border, corner dots, title and genre label (default gold).
  bookAccentColor: '#FFD700',

  // Set to true by the Random tool; never read by any other code.
  isRandom: false,

  /**
   * Initializes Book Shop workstation canvas, resets literature attributes, and loads tools.
   */
  init() {
    // Looked up by id on each call (cheap, and robust if the element is ever replaced).
    const c = document.getElementById('books-canvas');
    if (!c) return;
    const parent = c.parentElement;
    const rect = parent.getBoundingClientRect();

    // Fit the canvas into the space beside the side panels (70 px tool column + 220 px options panel = 290 px), at most 700 x 500. This also clears it.
    c.width = Math.min(rect.width - 290, 700);
    c.height = Math.min(rect.height, 500);

    // Each visit starts a new, empty book; colours are remembered from the last visit.
    this.bookTitle = '';
    this.bookGenre = null;
    this.isRandom = false;
    this._buildTools();
    this._buildSidePanel('create');
  },

  /* ===== TOOLS ===== */
  // Creates the tool buttons in #books-tools: Create (genre), Cover (colours), Decorate (paint), Sticker, Title and Random.
  _buildTools() {
    const tools = document.getElementById('books-tools');
    if (!tools) return;

    // Clear first: init() runs on every visit and must not stack duplicate buttons.
    tools.innerHTML = '';

    // Each entry: id (passed to _buildSidePanel), icon (a key in Icons.paths) and label.
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

      // Icon above its label (.tool-btn defaults to a row).
      btn.style.flexDirection = 'column';
      btn.title = t.label;

      // Select the tool: move the highlight, click sound, and rebuild the options panel.
      btn.onclick = () => {
        tools.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Sound.play('click');
        this._buildSidePanel(t.id);
      };
      tools.appendChild(btn);
    });
  },

  // Rebuilds #books-side for the selected tool.
  // @param {string} toolId - 'create', 'cover', 'decorate', 'sticker', 'title' or 'random'.
  _buildSidePanel(toolId) {
    const side = document.getElementById('books-side');
    if (!side) return;

    // Discard the previous tool's panel before building the new one.
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
  // Genre picker: one cell per entry in BOOK_GENRES. Choosing one draws the book straight away.
  // @param {HTMLElement} side - The #books-side element to fill.
  _buildCreatePanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Book Genre';
    side.appendChild(h4);

    // .item-grid fits as many cells as the 220 px panel allows.
    const grid = document.createElement('div');
    grid.className = 'item-grid';

    // An emoji per genre. Defined for a nicer genre picker but not used by the code below, which shows the same book icon in every cell.
    const genreEmojis = {
      Fantasy: '🧙', Romance: '💕', Mystery: '🔍', 'Sci-Fi': '🚀',
      Adventure: '⛰️', Cooking: '🍳', Art: '🎨', Poetry: '📝',
      Comics: '💥', Fashion: '👗'
    };

    // One cell per genre; the current genre is highlighted.
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

    // Until a genre is chosen, show a hint on the cleared canvas.
    if (!this.bookGenre) {
      // Placeholder hint drawn directly because no book exists yet (_drawBook returns early without a genre).
      const c = document.getElementById('books-canvas');
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.font = '18px Outfit'; ctx.textAlign = 'center';
      ctx.fillText('Pick a genre to start →', c.width/2, c.height/2);
    }
  },

  /* ===== COVER PANEL ===== */
  // Two colour pickers: the cover colour (button + 16 quick colours: browns, dark jewel tones, brights, creams, silver) and the accent colour (button + 8 quick colours). Each change redraws the book.
  // @param {HTMLElement} side - The #books-side element to fill.
  _buildCoverPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Cover Color';
    side.appendChild(h4);

    const colorBtn = document.createElement('div');
    colorBtn.className = 'color-pick-btn';
    colorBtn.style.background = this.bookColor;

    // Opens the wheel on the current cover colour; the callback stores the pick and repaints the book.
    colorBtn.onclick = () => {
      ColorWheel.setFromHex(this.bookColor);
      ColorWheel.open('book cover', hex => {
        this.bookColor = hex;
        colorBtn.style.background = hex;
        this._drawBook();
      });
    };
    side.appendChild(colorBtn);

    // Sixteen cover colours: leather brown, midnight, burgundy, forest green, navy, indigo, crimson, pink, gold, turquoise, sea green, orange-red, cream, silver, cinnamon and white.
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

    // The accent colour is used for the border, the corner dots, the title and the genre label.
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

    // Eight accent colours that contrast with most covers: gold, silver, white, pink, turquoise, orange-red, purple, green.
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
  // Paint on the cover: colour button, 10 quick colours, a choice of brush, glitter or eraser, and a brush-size slider (2-20 px).
  // It then attaches Tools to the canvas, which keeps the drawing (Tools.setup no longer blanks the canvas).
  // @param {HTMLElement} side - The #books-side element to fill.
  _buildDecoratePanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Paint on Cover';
    side.appendChild(h4);

    const colorBtn = document.createElement('div');
    colorBtn.className = 'color-pick-btn';
    colorBtn.style.background = Tools.currentColor;
    colorBtn.onclick = () => { Tools.openColorPicker(hex => { colorBtn.style.background = hex; }); };
    side.appendChild(colorBtn);

    // Ten paint colours, starting with gold and white, which show up on most covers.
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

    // Brush / glitter / eraser buttons. Clicking one sets Tools.currentTool and shows it as the primary (highlighted) button. No button is highlighted when
    // the panel first opens, although the brush is already selected.
    // Tool sub-selection
    const h4b = document.createElement('h4');
    h4b.textContent = 'Tool';
    h4b.style.marginTop = '10px';
    side.appendChild(h4b);

    // The three paint sub-tools and the Tools tool ids they select ('dye' is the round brush).
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

        // Reset every sub-tool button to its unselected (ghost) style, then mark the clicked one as selected (primary style). The inline sizing set on each button is not touched by className changes.
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

    // Size 2-20 px, starting at the current Tools.brushSize.
    slider.type = 'range'; slider.min = '2'; slider.max = '20'; slider.value = Tools.brushSize;
    slider.style.cssText = 'width:100%;accent-color:var(--accent-pink);';
    slider.oninput = () => { Tools.brushSize = parseInt(slider.value); };
    side.appendChild(slider);

    // Start with the round brush at a fine size (5 px) and attach the mouse handlers to the book canvas.
    Tools.currentTool = 'dye';
    Tools.brushSize = 5;
    Tools.setup('books-canvas');
  },

  /* ===== STICKER PANEL ===== */
  // Sticker grid: 24 book- and decoration-themed emoji. Picking one sets Tools.currentSticker; the player clicks on the cover to place it (24 px).
  // @param {HTMLElement} side - The #books-side element to fill.
  _buildStickerPanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Book Stickers';
    side.appendChild(h4);

    // Twenty-four emoji: book colours and bookmarks first, then stars, gems, crown, butterfly, flowers, hearts of each colour, flame and rainbow.
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

    // Brush size 8 gives 24 px stickers.
    Tools.brushSize = 8;
    Tools.setup('books-canvas');
  },

  /* ===== TITLE PANEL ===== */
  // Title editor: a text field (max 30 characters) that redraws the book on every keystroke, and four genre-based title suggestions to click.
  // @param {HTMLElement} side - The #books-side element to fill.
  _buildTitlePanel(side) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Book Title';
    side.appendChild(h4);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter book title...';
    input.value = this.bookTitle;

    // Titles are limited to 30 characters so they fit on the cover (it wraps at about 120 px per line).
    input.maxLength = 30;
    input.style.cssText = 'width:100%;padding:8px 12px;border:1px solid rgba(255,255,255,0.15);border-radius:8px;background:rgba(255,255,255,0.05);color:#fff;font-family:var(--font-display);font-size:14px;margin-bottom:10px;box-sizing:border-box;';

    // Update live: store the text and repaint the book so the title appears as it is typed.
    // `oninput` fires on every keystroke, so the cover shows the title while the player types.
    input.oninput = () => {
      this.bookTitle = input.value;
      this._drawBook();
    };
    side.appendChild(input);

    // Clicking a suggestion fills the field and the book title together.
    // Quick title suggestions based on genre
    const h4b = document.createElement('h4');
    h4b.textContent = 'Suggestions';
    h4b.style.marginTop = '8px';
    side.appendChild(h4b);

    // Buttons for four ideas matching the current genre; clicking one also fills the text field.
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

  // Returns four title ideas for the current genre (a fixed table), or the first four random titles if no genre is chosen yet.
  // @returns {string[]} Four title strings.
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
  // The Random tool: picks a random genre, title and colours, shows a summary and a re-roll button, and draws the result. Calling it again (Roll Again) re-rolls
  // and re-draws the summary; the old summary is not removed first, so repeated rolls stack summaries in the panel.
  // @param {HTMLElement} side - The #books-side element to fill.
  _generateRandom(side) {
    // Set but never read by other code.
    this.isRandom = true;
    this.bookGenre = U.pick(BOOK_GENRES);
    this.bookTitle = U.pick(BOOK_TITLES_RANDOM);

    // Random cover from eight dark or rich colours and a random accent from five light ones, so the title stays readable.
    // Dark covers only, so the accent (always light) stays readable.
    this.bookColor = U.pick(['#8B4513','#1a1a2e','#800020','#006400','#191970','#4B0082','#DC143C','#FF69B4']);
    this.bookAccentColor = U.pick(['#FFD700','#C0C0C0','#FFFFFF','#FF69B4','#00CED1']);

    // Replace, don't append: Roll Again calls this function on the SAME panel, and every call appends a heading,
    // summary and button, so without clearing first each roll stacked another copy (two Roll Again buttons after
    // one reroll). _buildSidePanel already clears before the first call; this covers the re-rolls.
    side.innerHTML = '';

    const h4 = document.createElement('h4');
    h4.textContent = '🎲 Random Book!';
    side.appendChild(h4);

    const info = document.createElement('div');

    // A small rounded panel summarising the roll.
    info.style.cssText = 'padding:12px;background:rgba(255,255,255,0.05);border-radius:8px;margin-top:8px;';

    // Summary of the rolled book. The values inserted come from the game's own constant lists, not from user input, so they are safe to put in HTML.
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

    // Roll again: play a sound and call this function again on the same panel.
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
  // Repaints the book from the current state: shadow, page edges, cover, a subtle gradient, spine highlight, a decorative border with corner dots, the wrapped title,
  // the genre label and a lighter outline. Does nothing until a genre is chosen. Everything is positioned relative to the canvas centre; the book is 160 x 220 px.
  _drawBook() {
    const c = document.getElementById('books-canvas');
    if (!c || !this.bookGenre) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;

    // Repaint from scratch: removes earlier paint and stickers.
    ctx.clearRect(0, 0, w, h);

    const cx = w/2, cy = h/2;

    // Book width and height in pixels, chosen so the book fits the 500 px canvas height with room for the shadow.
    const bw = 160, bh = 220; // book dimensions

    // A translucent black copy of the cover shape offset 6 px down and right.
    // Book shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';

    // Corner radius 4 px for the book shape (a hardcover has only slightly rounded corners).
    this._roundRect(ctx, cx - bw/2 + 6, cy - bh/2 + 6, bw, bh, 4);
    ctx.fill();

    // The page block: a cream strip along the left edge with faint lines (every 4 px) to suggest stacked pages.
    // Book pages (side)
    ctx.fillStyle = '#F5F0E8';
    ctx.fillRect(cx - bw/2 + 3, cy - bh/2 + 5, 8, bh - 10);
    // Page lines
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 0.5;

    // Page lines: a short horizontal tick every 4 px down the page strip.
    for (let y = cy - bh/2 + 15; y < cy + bh/2 - 10; y += 4) {
      ctx.beginPath();
      ctx.moveTo(cx - bw/2 + 4, y);
      ctx.lineTo(cx - bw/2 + 10, y);
      ctx.stroke();
    }

    // Cover in the book colour. `bkh, bks, bkl` are its hue, saturation and lightness, used at the end for the edge highlight.
    // Book cover - main
    const [bkh, bks, bkl] = U.hexToHsl(this.bookColor);
    ctx.fillStyle = this.bookColor;
    this._roundRect(ctx, cx - bw/2, cy - bh/2, bw, bh, 4);
    ctx.fill();

    // A diagonal gradient from slightly lighter (top left) to slightly darker (bottom right) adds depth.
    // Cover texture - subtle gradient
    const grad = ctx.createLinearGradient(cx - bw/2, cy - bh/2, cx + bw/2, cy + bh/2);
    grad.addColorStop(0, 'rgba(255,255,255,0.08)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = grad;
    this._roundRect(ctx, cx - bw/2, cy - bh/2, bw, bh, 4);
    ctx.fill();

    // A faint light strip down the left edge represents the book's spine.
    // Spine highlight
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(cx - bw/2, cy - bh/2, 12, bh);

    // A rounded rectangle border in the accent colour 12 px inside the cover edge, with a dot in each corner.
    // Decorative border
    ctx.strokeStyle = this.bookAccentColor;
    ctx.lineWidth = 2;

    // The border sits 12 px inside the cover edge (the same width as the spine strip).
    this._roundRect(ctx, cx - bw/2 + 12, cy - bh/2 + 12, bw - 24, bh - 24, 2);
    ctx.stroke();

    // Corner ornaments
    ctx.fillStyle = this.bookAccentColor;

    // Centres of the four corner dots, 16 px in from each corner.
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

    // Title text: bold 16 px, centred (shifted 4 px right to compensate for the spine on the left), with simple word wrapping.
    // Title
    if (this.bookTitle) {
      ctx.fillStyle = this.bookAccentColor;

      // The title uses the game's display font; measureText below measures with this font, so it must be set first.
      ctx.font = 'bold 16px Fredoka';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Word wrap: add words to the current line until its measured width would exceed the available width (cover width minus 40 px); then start a new line. A single
      // word longer than the width is kept on its own line (it can overflow).
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

      // Lines are 20 px apart and the block is centred vertically around 30 px below the book's centre, so the title sits below the middle (leaving the top for decorations).
      const lineH = 20;

      // Vertical start so that the block of lines is centred on y = cy + 30, whatever the number of lines.
      const startY = cy + 30 - ((lines.length - 1) * lineH) / 2;
      lines.forEach((line, i) => {
        // Text is shifted 4 px right of the canvas centre to account for the spine on the left of the cover.
        ctx.fillText(line, cx + 4, startY + i * lineH);
      });
    }

    // Small, half-transparent genre name near the bottom edge.
    // Genre label at bottom
    ctx.fillStyle = this.bookAccentColor;
    ctx.globalAlpha = 0.5;
    ctx.font = '10px Outfit';
    ctx.fillText(this.bookGenre || '', cx + 4, cy + bh/2 - 22);
    ctx.globalAlpha = 1;

    // A thin outline in the cover colour made 20 lightness points lighter, like a polished edge.
    // Shiny edge effect
    ctx.strokeStyle = U.hslToHex(bkh, bks, Math.min(100, bkl + 20));
    ctx.lineWidth = 1;
    this._roundRect(ctx, cx - bw/2 + 1, cy - bh/2 + 1, bw - 2, bh - 2, 4);
    ctx.stroke();
  },

  // Builds (does not fill or stroke) a rounded-rectangle path from four arcTo corners. Callers choose fill or stroke.
  // @param {CanvasRenderingContext2D} ctx - Target context.
  // @param {number} x - Left edge.
  // @param {number} y - Top edge.
  // @param {number} w - Width.
  // @param {number} h - Height.
  // @param {number} r - Corner radius (must not exceed half the width or height).
  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();

    // Start on the top edge after the corner, then four arcTo calls round the corners clockwise.
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  /* ===== FINISH ===== */
  // "Done": saves a picture of the book in the closet (type 'books', with the genre), awards 35 XP, saves, and leaves (the level-up screen if a level was gained, otherwise the workshop).
  finish() {
    // Refuse to finish without a genre (error sound, stay on the screen) because there would be no book to save.
    if (!this.bookGenre) {
      Sound.play('error');
      return;
    }

    // Capture the canvas as it is now (including any paint and stickers).
    const c = document.getElementById('books-canvas');
    if (c) {
      const imageData = c.toDataURL('image/png');
      Game.addToCloset({
        id: Date.now(),
        type: 'books',
        subtype: this.bookGenre,

        // The closet name is the title, or "The <Genre> Book" if the title is empty.
        name: this.bookTitle || ('The ' + this.bookGenre + ' Book'),
        image: imageData,
        genre: this.bookGenre,
        createdAt: Date.now(),
      });
    }

    // Reward feedback: jingle plus 35 XP.
    Sound.play('complete');
    Game.addXP(35);
    Game.save();
    if (Game.checkLevelUp()) Game.goTo('levelup');
    else Game.goTo('workshop');
  }
};
