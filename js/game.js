// ==============================================================================
// Program: game.js
// Programmer: Ethan-da-Tech-Wizard
// Last Modified: November 19, 2026
// Purpose: Central game loop, scene coordinator, economy system, and progression engine.
//          Orchestrates screen transitions across 10 specialized design stations,
//          manages player leveling thresholds (XP, unlocks), currency transactions,
//          NPC customer generation with randomized fashion demands, confetti particle bursts,
// FILE OVERVIEW
// game.js is the application's central controller. It holds the player's saved state, switches
// between screens, runs the economy (XP, levels, coins), generates the customers that buy
// closet items, shows the level-up celebration and the freestyle challenge, and loads/saves
// progress to localStorage. Every other module reports back to it.
//
// Who calls it: index.html buttons call Game.* directly through onclick attributes (newGame,
// continueGame, goTo, finishCharacter, showSettings, closeSettings, resetGame, startFreestyle).
// Station modules call Game.addToCloset(), addXP(), checkLevelUp() and goTo() when an item is
// finished. It starts itself: the DOMContentLoaded listener at the bottom of the file calls
// Game.init(). It calls into every other module: Sound, ColorWheel, Weather, Character, Stations,
// Salon, Makeup, Tech, Decor, Books, Closet, plus the utils (U) and the constant tables.
//
// Save-file shape (Game.state, stored as JSON under localStorage key "fashion_state", see
// U.save in utils.js):
//   level (1-10), xp (running total), coins, closet (array of item objects, see stations.js),
//   character (Character.data copy or null), weather ('sunny'|'rainy'|'snowy'),
//   soundOn (boolean), hasStarted (true once a game has been created; enables Continue).
//
// Screens: a screen is a <div id="NAME-screen" class="screen"> in index.html. goTo('NAME')
// shows exactly one. The screen ids handled specially by goTo are character, workshop, studio,
// salon, makeup, tech, decor, books, closet, customers and levelup (menu has no setup).
//
// Design decisions:
//   - A single mutable `state` object with an explicit save() after each change; no framework,
//     no events. Methods that change state call save() themselves, so callers do not have to.
//   - Customers are generated on demand each time the customers screen opens and are not saved,
//     which keeps the save file small and the screen lively but means a customer cannot be
//     "kept waiting".
//   - Level gating is done in two places (card locks in the workshop and the freestyle picker)
//     rather than in each station.
//
// Known limits / things to watch (found while reading, not changed here):
//   - _updateCardLocks assigns an onclick that plays the error sound to locked cards and never
//     restores the original handler, so a station that unlocks during the same page session can
//     keep playing the error sound until the page is reloaded. [inferred from the code]
//   - checkLevelUp() raises the level by at most one per call even if the XP would pass two
//     thresholds.
//   - The saved soundOn flag is never applied to Sound.enabled at start-up (see sound.js).
//   - startFreestyle() declares `bonusXP` but never awards it.
// How to test: open the page, click New Game, then in the console run Game.addXP(300);
// Game.checkLevelUp(); Game.goTo('workshop') and look at the badge (should show level 2 or 3).
//          and localStorage state persistence.
// ==============================================================================
/* ===== MAIN GAME ENGINE ===== */
// Singleton controller object; everything else in the game talks to this one global.
const Game = {
  // Global player progress and economy state
  // The persisted state (shape described in the file overview). These are the defaults for a fresh
  // game; init() overlays any saved values on top.
  state: {
    // Current level, 1 to 10 (see LEVEL_DATA in utils.js).
    level: 1,

    // Total experience points earned so far (not reset on level-up; thresholds are cumulative).
    xp: 0,

    // Currency earned by selling items to customers; shown in the workshop and customers screens.
    coins: 0,

    // Finished items waiting to be sold or admired (objects built by each station).
    closet: [],

    // Saved avatar appearance (a copy of Character.data) or null before the first character is created.
    character: null,

    // Last weather preset chosen by the player.
    weather: 'sunny',

    // Whether sound effects are enabled; written when settings close.
    soundOn: true,

    // False on a brand-new browser profile; the Continue button is disabled until a game exists.
    hasStarted: false,
  },

  // Name of the screen shown now (the part before "-screen" in its element id). Starts on the menu,
  // matching the one screen that has class "active" in index.html.
  currentScreen: 'menu',

  /**
   * Bootstraps core subsystems, binds AudioContext listeners, and restores saved state.
   */
  init() {
    // Browsers block audio until the user interacts with the page, so the AudioContext is created on the
    // first click anywhere (`once: true` removes the listener after it fires).
    // Init audio context on first user interaction
    document.addEventListener('click', () => {
      if (!Sound.ctx) Sound.init();
    }, { once: true });

    // Init subsystems
    // Start the subsystems that need the DOM and draw their first frame: the colour wheel canvas,
    // the weather canvas and its animation loop, and the floating background particles.
    ColorWheel.init();
    Weather.init();
    this._initParticles();

    // Load saved state
    // Restore progress. U.load returns null for a missing or unreadable save; otherwise the saved fields are
    // merged over the defaults with the spread operator, so fields added in newer versions of the game get
    // their default values instead of being undefined.
    const saved = U.load('state');
    if (saved) {
      this.state = { ...this.state, ...saved };

      // Apply the saved weather and, if a character exists, give Character its saved appearance (it is
      // the same object, not a copy, so later edits in the creator change the saved state directly).
      Weather.set(this.state.weather);
      if (this.state.character) {
        Character.data = this.state.character;
      }
    }

    // Update UI
    // Fill the level, XP and coin read-outs from the loaded state.
    this._updateHUD();

    // Check continue button
    // Grey out and disable Continue when there is no saved game (opacity 0.4 and pointer-events none; there
    // is no disabled attribute on that button).
    if (!this.state.hasStarted) {
      document.getElementById('btn-continue').style.opacity = '0.4';
      document.getElementById('btn-continue').style.pointerEvents = 'none';
    }

    // Add confetti canvas
    // Create the full-window confetti canvas used by the level-up screen (it is not in index.html). The
    // guard keeps this from creating a second canvas if init() ever runs twice.
    if (!document.getElementById('confetti-canvas')) {
      const cc = document.createElement('canvas');
      cc.id = 'confetti-canvas';
      document.body.appendChild(cc);
      cc.width = window.innerWidth;
      cc.height = window.innerHeight;

      // Keep the canvas pixel size in step with the window so confetti covers the whole screen.
      window.addEventListener('resize', () => {
        cc.width = window.innerWidth;
        cc.height = window.innerHeight;
      });
    }

    console.log('✨ Fashion Game initialized!');
  },

  // Generates randomized floating emoji particle elements with variable speed, scale, and animation delay
  _initParticles() {
    const pContainer = document.getElementById('particles-container');
    if (!pContainer) return;
    const types = ['✨', '💖', '⭐', '🫧'];

    // 35 floating emoji is a balance between a lively background and a smooth frame rate; they are
    // ordinary DOM elements animated by CSS (.particle, keyframes float-up), not canvas drawings.
    const count = 35; // A good number of floating particles

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.textContent = U.pick(types);
      
      // Per-particle randomness: size in rem, horizontal position in vw, animation duration 8-20 s and a
      // negative delay of 0-15 s. A negative animation-delay starts the animation part-way through, so
      // the particles are already spread over the screen when the page opens instead of all starting at the bottom.
      const size = U.randFloat(0.8, 1.8);
      const left = U.rand(0, 100);
      const duration = U.randFloat(8, 20);
      const delay = U.randFloat(0, 15);
      
      // Inline style (rather than a CSS class) because every particle needs different values.
      p.style.cssText = `
        left: ${left}vw;
        font-size: ${size}rem;
        animation-duration: ${duration}s;
        animation-delay: -${delay}s;
        filter: drop-shadow(0 0 10px rgba(255,255,255,0.6));
      `;
      pContainer.appendChild(p);
    }
  },

  /* ===== NAVIGATION ===== */
  // Executes stateful scene transitions, updating DOM screen visibility and orchestrating subsystem focus
  // Switches to the screen named `screen` and runs that screen's setup code.
  // @param {string} screen - Screen name: 'menu', 'character', 'workshop', 'studio', 'salon', 'makeup',
  //   'tech', 'decor', 'books', 'closet', 'customers' or 'levelup'.
  goTo(screen) {
    // Hide all screens
    // Hide every screen first so only one is ever visible.
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    // Show target
    // Find the target by id convention. An unknown name does nothing (the old screen has already been
    // hidden, so the page would go blank; callers only pass known names).
    const el = document.getElementById(screen + '-screen');
    if (el) {
      el.classList.add('active');
      this.currentScreen = screen;

      // Initialize screen-specific logic
      // Per-screen entry hooks: the station modules rebuild their panels (their init() runs every time
      // the screen opens, so state from a previous visit is reset or refreshed there), the workshop refreshes
      // its read-outs and locks, the closet and customer screens rebuild their lists, and the level-up
      // screen fills its text and starts the confetti.
      switch(screen) {
        case 'character':
          Character.init();
          break;
        case 'workshop':
          this._updateHUD();
          this._renderWorkshopChar();
          this._updateCardLocks();
          break;
        case 'studio':
          Stations.init(0);
          break;
        case 'salon':
          Salon.init();
          break;
        case 'makeup':
          Makeup.init();
          break;
        case 'tech':
          Tech.init();
          break;
        case 'decor':
          Decor.init();
          break;
        case 'books':
          Books.init();
          break;
        case 'closet':
          Closet.render();
          break;
        case 'customers':
          this._renderCustomers();
          break;
        case 'levelup':
          this._renderLevelUp();
          break;
      }

      // Transition sound; also plays for the first screen change after the page loads (the AudioContext
      // may not exist yet, in which case it is silent).
      Sound.play('whoosh');
    }
  },

  /* ===== GAME FLOW ===== */
  // Starts a fresh game: resets all state to the defaults (with hasStarted true so Continue works), saves
  // it immediately (overwriting any old save), and opens the character creator. Called by the New Game button;
  // there is no confirmation prompt.
  newGame() {
    this.state = {
      // Same defaults as the initial `state`, except hasStarted is true.
      level: 1, xp: 0, coins: 0,
      closet: [], character: null,
      weather: 'sunny', soundOn: true, hasStarted: true,
    };
    this.save();
    this.goTo('character');
  },

  // Resumes a saved game: re-attaches the saved avatar to Character and opens the workshop. Called by the
  // Continue button; does nothing if there is no game.
  continueGame() {
    if (!this.state.hasStarted) return;
    if (this.state.character) {
      Character.data = this.state.character;
    }
    this.goTo('workshop');
  },

  // Called by the "Done" button of the creator: copies the avatar into the save file (getData makes a deep
  // copy so later edits do not alter the saved copy), marks the game as started, saves and enters the workshop.
  finishCharacter() {
    this.state.character = Character.getData();
    this.state.hasStarted = true;
    this.save();
    Sound.play('complete');
    this.goTo('workshop');
  },

  /* ===== STATE MANAGEMENT ===== */
  // Writes the whole state to localStorage (U.save swallows storage errors, so a full disk or private
  // browsing means progress is lost silently).
  save() {
    U.save('state', this.state);
  },

  // Adds a finished item to the closet and saves. `item` is an object made by a station (see stations.js for the
  // fields; the closet screen needs `type`, `name`, and optionally `image` and `subtype`).
  addToCloset(item) {
    this.state.closet.push(item);
    this.save();
  },

  // Adds experience points, updates the HUD, saves, and plays a coin sound. It does not check for a level-up;
  // the station that awarded the XP calls checkLevelUp() afterwards.
  // @param {number} amount - XP to add (stations award 20-50).
  addXP(amount) {
    this.state.xp += amount;
    this._updateHUD();
    this.save();
    Sound.play('coin');
  },

  // Looks up the next level's entry in LEVEL_DATA and, if the player has reached its XP threshold, raises the level
  // by one and saves. Returns true when a level was gained (the caller then shows the level-up screen). Only one
  // level per call, so a very large XP jump would need repeated calls.
  // @returns {boolean} True if the level increased.
  checkLevelUp() {
    const nextLevel = LEVEL_DATA.find(l => l.lvl === this.state.level + 1);
    if (nextLevel && this.state.xp >= nextLevel.xp) {
      this.state.level++;
      this.save();
      return true;
    }
    return false;
  },

  // Adds coins (the currency) to the balance, refreshes the display and saves.
  // @param {number} amount - Coins to add (may be fractional only if the caller allows it; sales are rounded).
  addCoins(amount) {
    this.state.coins += amount;
    this._updateHUD();
    this.save();
  },

  /* ===== UI UPDATES ===== */
  // Writes the level, XP and coin numbers into the page. Each element lookup is null-checked because
  // some of these elements exist only on one screen (the level badge is in the workshop header and the coin
  // display in the customers header).
  _updateHUD() {
    const levelBadge = document.getElementById('level-badge');
    const xpText = document.getElementById('xp-text');
    const coinsDisplay = document.getElementById('coins-display');
    const workshopCoins = document.getElementById('workshop-coins');

    if (levelBadge) levelBadge.textContent = `Lv ${this.state.level}`;
    if (xpText) {
      const nextLevel = LEVEL_DATA.find(l => l.lvl === this.state.level + 1);

      // At the maximum level there is no next threshold, so the text shows an infinity symbol.
      const nextXP = nextLevel ? nextLevel.xp : '∞';
      xpText.textContent = `${this.state.xp} / ${nextXP} XP`;
    }
    if (coinsDisplay) coinsDisplay.textContent = `🪙 ${this.state.coins}`;
    if (workshopCoins) workshopCoins.textContent = `🪙 ${this.state.coins}`;
  },

  // Greys out workshop station cards the player has not unlocked yet. Called every time the workshop opens.
  _updateCardLocks() {
    const lvl = this.state.level;
    // Salon unlocks at level 3, Makeup at 4, Tech at 5, Decor at 6, Books at 7
    // Required level per station (station id -> level). The Fashion Studio is not listed, so it is always open.
    // These numbers must match the strings in LEVEL_DATA and startFreestyle().
    const locks = { salon: 3, makeup: 4, tech: 5, decor: 6, books: 7 };
    Object.entries(locks).forEach(([station, reqLvl]) => {
      const card = document.getElementById('card-' + station);
      if (card) {
        if (lvl >= reqLvl) {
          card.classList.remove('locked');
        } else {
          // The 'locked' class dims the card and disables mouse events through CSS (pointer-events: none), so the
          // handler below can never actually run while the card is locked; and it replaces the card's original inline
          // onclick, which is never put back when the level rises (see the note in the file overview).
          card.classList.add('locked');
          card.onclick = () => { Sound.play('error'); };
        }
      }
    });
  },

  // Draws the saved avatar on the small workshop canvas (200x300). The scale 0.55 and centre at 45% of the height are
  // tuned so the whole figure fits in the frame. Does nothing before a character has been created.
  _renderWorkshopChar() {
    const c = document.getElementById('workshop-char-canvas');
    if (!c || !this.state.character) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    Character.drawCharacter(ctx, this.state.character, c.width/2, c.height*0.45, 0.55, c.width, c.height);
  },

  /* ===== LEVEL UP ===== */
  // Fills in the level-up screen: the new level and a list of the features unlocked at that level.
  _renderLevelUp() {
    document.getElementById('levelup-level').textContent = `Level ${this.state.level}`;

    // Find this level's entry; the unlock names are display text only.
    const levelData = LEVEL_DATA.find(l => l.lvl === this.state.level);
    const container = document.getElementById('levelup-unlocks');
    container.innerHTML = '';

    if (levelData) {
      levelData.unlocks.forEach((unlock, i) => {
        const badge = document.createElement('div');
        badge.className = 'unlock-badge';
        badge.textContent = '🔓 ' + unlock;

        // Stagger the pop-in animation 0.15 s per badge so they appear one after another.
        badge.style.animationDelay = (i * 0.15) + 's';
        container.appendChild(badge);
      });
    }

    // Celebrate: fanfare sound and confetti.
    Sound.play('levelup');
    this._fireConfetti();
  },

  // Confetti burst on the full-window canvas. 80 coloured rectangles are launched upward from near the middle of the
  // screen and fall under gravity, fading out. The animation runs by itself until all pieces have faded or 200 frames
  // have passed (about 3.3 s at 60 fps), then clears the canvas.
  _fireConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const particles = [];

    // Palette: pink, gold, turquoise, purple, coral, light green and sky blue (the game's colours).
    const colors = ['#ff69b4','#ffd700','#3edbd5','#b36bff','#ff7b7b','#90ee90','#87ceeb'];

    for (let i = 0; i < 80; i++) {
      particles.push({
        // Start position: horizontally within 100 px of the centre, vertically 40% down the screen.
        x: canvas.width/2 + (Math.random()-0.5) * 200,
        y: canvas.height * 0.4,

        // Initial velocity in pixels per frame: sideways -6..+6, upward (negative y) 4..16 so pieces burst upward and
        // spread. rotSpeed is radians per frame (spin); life goes from 1 to 0 and drives the fade-out.
        vx: (Math.random()-0.5) * 12,
        vy: -Math.random() * 12 - 4,
        color: U.pick(colors),
        size: Math.random() * 8 + 3,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random()-0.5) * 0.3,
        life: 1,
      });
    }

    let frame = 0;

    // One animation frame: clear, move each piece, draw it, and schedule the next frame while any piece is alive.
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        if (p.life <= 0) return;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;

        // Gravity: add 0.25 px/frame to the downward speed every frame, which gives the arc.
        p.vy += 0.25;
        p.rotation += p.rotSpeed;

        // Fade at 0.8% per frame: a piece lives about 125 frames (~2 s).
        p.life -= 0.008;

        // Draw each piece rotated about its own centre: translate to it, rotate, then draw a rectangle centred on the
        // origin (the rectangle is 60% as tall as it is wide). save/restore stop the transform and alpha leaking.
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
        ctx.restore();
      });

      // Keep animating while something is visible, with a 200-frame cap as a safety net; then wipe the canvas.
      if (alive && frame < 200) {
        frame++;
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    animate();
  },

  /* ===== CUSTOMERS (Expanded) ===== */
  // Builds the customer queue. How many customers appear depends on the closet: one per two items plus one,
  // at most 8. Every visit creates new random customers (name, what they want, personality trait, look).
  _renderCustomers() {
    const queue = document.getElementById('customer-queue');
    const detail = document.getElementById('customer-detail');
    if (!queue) return;
    queue.innerHTML = '';

    // Update coins display
    const coinsEl = document.getElementById('coins-display');
    if (coinsEl) coinsEl.textContent = `🪙 ${this.state.coins}`;

    // Number of customers: floor(items / 2) + 1, capped at 8. With an empty closet no queue is shown, only a hint.
    const closetCount = this.state.closet.length;
    const customerCount = Math.min(Math.floor(closetCount / 2) + 1, 8);

    if (closetCount === 0) {
      detail.innerHTML = '<p class="empty-msg">Create items in the workshop to attract customers!</p>';
      return;
    }

    // Customer data: what category they want (or 'all'), the labels shown on the cards, the personality traits and the
    // colour used for each trait label. The trait also sets the payout multiplier in _serveCustomer().
    const wantTypes = ['clothes','hair','makeup','tech','decor','books','all'];
    const wantLabels = { clothes:'👗 Clothes', hair:'💇 Hair Style', makeup:'💄 Makeup', tech:'📱 Tech', decor:'🛋️ Decor', books:'📚 Books', all:'✨ Anything' };
    const traits = ['Picky','Trendy','Budget','VIP','Mystery','Cheerful','Bold','Chill'];
    const traitColors = { Picky:'#FF6347', Trendy:'#FF69B4', Budget:'#32CD32', VIP:'#FFD700', Mystery:'#9370DB', Cheerful:'#FFA500', Bold:'#DC143C', Chill:'#00CED1' };

    for (let i = 0; i < customerCount; i++) {
      const name = U.pick(CUSTOMER_NAMES);
      const wants = U.pick(wantTypes);
      const trait = U.pick(traits);

      // Mystery customers hide their name and look (a purple silhouette with a question mark) and pay triple.
      const isMystery = trait === 'Mystery';
      const skinTone = U.pick(SKIN_PRESETS);
      const hairColor = U.pick(HAIR_COLOR_PRESETS);

      const card = document.createElement('div');

      card.className = 'customer-card';

      // Mini character canvas
      // Each card has a tiny 60x75 canvas on which a simple cartoon character is drawn (not the full Character renderer,
      // which is too detailed for this size).
      const miniCanvas = document.createElement('canvas');
      miniCanvas.width = 60;
      miniCanvas.height = 75;
      miniCanvas.style.cssText = 'margin:0 auto 4px;display:block;';
      card.appendChild(miniCanvas);

      // Draw mini character
      const mctx = miniCanvas.getContext('2d');

      // Mystery silhouette: head circle, body shape, a gold question mark and two sparkles, with a vertical purple gradient.
      if (isMystery) {
        // Mystery silhouette — gradient purple
        const mg = mctx.createLinearGradient(30, 5, 30, 65);
        mg.addColorStop(0, '#b36bff'); mg.addColorStop(1, '#6c3fa0');
        mctx.fillStyle = mg;
        mctx.beginPath(); mctx.arc(30, 22, 15, 0, Math.PI*2); mctx.fill();
        mctx.beginPath();
        mctx.moveTo(20, 34); mctx.quadraticCurveTo(17, 55, 20, 62);
        mctx.lineTo(40, 62); mctx.quadraticCurveTo(43, 55, 40, 34);
        mctx.closePath(); mctx.fill();
        // Question mark
        mctx.fillStyle = '#FFD700';
        mctx.font = 'bold 16px Fredoka'; mctx.textAlign = 'center';
        mctx.fillText('?', 30, 28);
        // Sparkles
        mctx.fillStyle = '#FFD700'; mctx.globalAlpha = 0.7;
        mctx.beginPath(); mctx.arc(14, 12, 2, 0, Math.PI*2); mctx.fill();
        mctx.beginPath(); mctx.arc(46, 18, 1.5, 0, Math.PI*2); mctx.fill();
        mctx.globalAlpha = 1;
      } else {
        // A normal customer: random top colour, then body, optional long hair behind, head, hair on top, eyes, blush
        // and smile are drawn back to front.
        const topColor = U.pick(['#FF69B4','#1E90FF','#FFD700','#32CD32','#9370DB','#FF6347','#00CED1','#ff6eb4','#b36bff']);
        // Body
        mctx.fillStyle = topColor;
        mctx.beginPath();
        mctx.moveTo(21, 36); mctx.quadraticCurveTo(18, 50, 20, 62);
        mctx.quadraticCurveTo(30, 66, 40, 62);
        mctx.quadraticCurveTo(42, 50, 39, 36);
        mctx.closePath(); mctx.fill();
        // Body shading
        mctx.fillStyle = 'rgba(0,0,0,0.08)';
        mctx.beginPath(); mctx.ellipse(28, 52, 5, 10, 0, 0, Math.PI*2); mctx.fill();
        // Hair back
        // Draw long hair strands behind the body only when a randomly picked style is long (about a quarter of the
        // time, since three of the twelve styles qualify).
        if (['long','straight','wavy'].includes(U.pick(HAIR_STYLES))) {
          mctx.fillStyle = hairColor;
          mctx.beginPath();
          mctx.moveTo(16, 18); mctx.quadraticCurveTo(14, 40, 18, 55);
          mctx.lineTo(20, 36); mctx.closePath(); mctx.fill();
          mctx.beginPath();
          mctx.moveTo(44, 18); mctx.quadraticCurveTo(46, 40, 42, 55);
          mctx.lineTo(40, 36); mctx.closePath(); mctx.fill();
        }
        // Head
        // Head and a faint highlight.
        mctx.fillStyle = skinTone;
        mctx.beginPath(); mctx.arc(30, 22, 14, 0, Math.PI*2); mctx.fill();
        // Head highlight
        mctx.fillStyle = 'rgba(255,255,255,0.15)';
        mctx.beginPath(); mctx.arc(27, 18, 6, 0, Math.PI*2); mctx.fill();
        // Hair top
        // Hair on the top of the head (a half ellipse plus a flat fringe rectangle).
        mctx.fillStyle = hairColor;
        mctx.beginPath(); mctx.ellipse(30, 14, 16, 10, 0, Math.PI, 0, true); mctx.fill();
        mctx.fillRect(14, 14, 32, 3);
        // Eyes — big sparkly
        // Eyes: for each side, white, blue iris, dark pupil and a small highlight.
        [-5,5].forEach(dx => {
          mctx.fillStyle = '#fff';
          mctx.beginPath(); mctx.ellipse(30+dx, 22, 4, 3.5, 0, 0, Math.PI*2); mctx.fill();
          mctx.fillStyle = '#4a90d9';
          mctx.beginPath(); mctx.arc(30+dx, 22.5, 2.5, 0, Math.PI*2); mctx.fill();
          mctx.fillStyle = '#15102a';
          mctx.beginPath(); mctx.arc(30+dx, 22.5, 1.2, 0, Math.PI*2); mctx.fill();
          mctx.fillStyle = 'rgba(255,255,255,0.9)';
          mctx.beginPath(); mctx.arc(30+dx-1, 21, 1, 0, Math.PI*2); mctx.fill();
        });
        // Blush
        mctx.fillStyle = 'rgba(255,140,160,0.2)';
        mctx.beginPath(); mctx.ellipse(22, 26, 4, 2, 0, 0, Math.PI*2); mctx.fill();
        mctx.beginPath(); mctx.ellipse(38, 26, 4, 2, 0, 0, Math.PI*2); mctx.fill();
        // Tiny smile
        // A small smile: a short arc at the bottom of the face.
        mctx.strokeStyle = '#e8888a'; mctx.lineWidth = 1.2; mctx.lineCap = 'round';
        mctx.beginPath(); mctx.arc(30, 28, 3, 0.15*Math.PI, 0.85*Math.PI); mctx.stroke();
      }

      const nameEl = document.createElement('div');
      nameEl.className = 'cust-name';
      nameEl.textContent = isMystery ? '???' : name;
      card.appendChild(nameEl);

      const traitEl = document.createElement('div');
      traitEl.style.cssText = `font-size:10px;color:${traitColors[trait]};font-weight:600;margin:2px 0;`;
      traitEl.textContent = trait;
      card.appendChild(traitEl);

      const wantsEl = document.createElement('div');
      wantsEl.className = 'cust-wants';
      wantsEl.textContent = wantLabels[wants] || wants;
      card.appendChild(wantsEl);

      // Selecting a customer shows their reaction (and a Sell button) in the detail pane.
      card.onclick = () => {
        this._serveCustomer(isMystery ? '???' : name, wants, trait, detail, card);
        Sound.play('select');
      };
      queue.appendChild(card);
    }
  },

  // Shows what the chosen customer wants and what they will pay.
  // @param {string} name - Display name ('???' for a mystery customer).
  // @param {string} wants - Category wanted ('clothes', 'hair', ..., or 'all').
  // @param {string} trait - Personality trait (decides the payout multiplier).
  // @param {HTMLElement} detailEl - The #customer-detail pane to fill.
  // @param {HTMLElement} cardEl - The customer's card, dimmed once served.
  _serveCustomer(name, wants, trait, detailEl, cardEl) {
    // Items this customer would buy: any item for 'all', otherwise items whose `type` equals the wanted category.
    const items = this.state.closet.filter(i => {
      if (wants === 'all') return true;
      return i.type === wants;
    });

    if (items.length === 0) {
      const wantLabels = { clothes:'clothes', hair:'a hair style', makeup:'makeup', tech:'tech gadgets', decor:'decor items', books:'books', all:'something' };
      detailEl.innerHTML = `<p class="empty-msg">${name} wants ${wantLabels[wants] || wants}, but you don't have any! Create some in the workshop.</p>`;
      return;
    }

    // The customer buys a random matching item (the player does not choose).
    const item = U.pick(items);
    // Coins based on trait
    // Payout multiplier by trait: VIP 2.5, Mystery 3, Trendy 1.5, Budget 0.7, everyone else 1. The base is a random
    // 10 to 30 coins per player level, so rewards grow as the player levels up; the result is rounded to a whole number.
    let coinMult = 1;
    if (trait === 'VIP') coinMult = 2.5;
    if (trait === 'Mystery') coinMult = 3;
    if (trait === 'Budget') coinMult = 0.7;
    if (trait === 'Trendy') coinMult = 1.5;
    const coins = Math.round(U.rand(10, 30) * this.state.level * coinMult);

    // Random flavour text for the reaction line and the quote.
    const reactions = ['loves', 'adores', 'is obsessed with', 'can\'t stop looking at', 'is thrilled by'];
    const quotes = [
      `"This ${item.name} is absolutely perfect!"`,
      `"I've never seen anything so beautiful!"`,
      `"This is exactly what I was looking for!"`,
      `"You're so talented! I love this!"`,
      `"My friends will be so jealous!"`,
      `"This is the best ${item.type} I've ever seen!"`,
    ];

    // Extra line announcing the bonus for VIP and Mystery customers; empty for the others.
    const traitBonus = trait === 'VIP' ? '<div style="font-size:12px;color:#FFD700;margin:4px 0;">✨ VIP Bonus: 2.5x coins!</div>'
      : trait === 'Mystery' ? '<div style="font-size:12px;color:#9370DB;margin:4px 0;">🔮 Mystery Bonus: 3x coins!</div>'
      : '';

    // Builds the detail pane as an HTML string. The item name and id come from the player's own saved items,
    // and the Sell button's inline onclick embeds the amount and the item id, so _completeSale() receives them
    // as arguments. The name is NOT escaped: book titles are typed by the player (up to 30 characters) and are
    // saved as the item name, so markup typed into a title would be interpreted here. Only the player's own browser
    // is affected (there is no shared data), but it is a self-injection bug.
    detailEl.innerHTML = `
      <div style="text-align:center">
        <div style="font-size:64px;margin-bottom:12px;">🤩</div>
        <h3 style="font-family:var(--font-display);margin-bottom:6px;">${name} ${U.pick(reactions)} it!</h3>
        <p style="color:var(--text-secondary);font-style:italic;">${U.pick(quotes)}</p>
        ${item.image ? `<img src="${item.image}" style="width:80px;height:80px;object-fit:contain;margin:10px auto;display:block;border-radius:8px;border:1px solid rgba(255,255,255,0.1);">` : ''}
        <div style="font-size:11px;color:var(--text-muted);margin:4px 0;">Buying: ${item.name}</div>
        ${traitBonus}
        <div style="font-size:32px;color:var(--accent-gold);font-family:var(--font-display);margin:12px 0;">+${coins} 🪙</div>
        <button class="btn btn-primary" onclick="Game._completeSale(${coins}, '${item.id}'); Sound.play('sell');">Sell Item</button>
      </div>
    `;

    // Fade out the card
    // Dim the card and stop it from being clicked again so the same customer cannot be served twice.
    if (cardEl) {
      cardEl.style.opacity = '0.5';
      cardEl.style.pointerEvents = 'none';
    }
  },

  // Completes a sale: pays the coins, adds 20 XP, removes the sold item from the closet and shows a thank-you
  // message. Called by the Sell button created in _serveCustomer(); note that it does not call checkLevelUp(),
  // so selling alone never triggers the level-up screen (the next finished item will).
  // @param {number} coins - Coins to pay.
  // @param {string} itemId - Id of the sold closet item (compared as a string because it was written into
  //   an onclick attribute).
  _completeSale(coins, itemId) {
    this.addCoins(coins);
    this.addXP(20);
    // Remove sold item from closet
    this.state.closet = this.state.closet.filter(i => String(i.id) !== String(itemId));
    this.save();
    const detail = document.getElementById('customer-detail');
    if (detail) {
      detail.innerHTML = '<div style="text-align:center"><div style="font-size:48px;margin:20px;">✨</div><p class="empty-msg">Customer served! Great sale!</p></div>';
    }
  },

  /* ===== FREESTYLE CHALLENGE ===== */
  // The "Freestyle Challenge" button: picks a random unlocked station and a random theme prompt, shows it in a popup,
  // then opens that station when the player dismisses it.
  startFreestyle() {
    const stations = ['studio','salon','makeup','tech','decor','books'];
    const stationNames = { studio:'Fashion Studio', salon:'Hair Salon', makeup:'Makeup Studio', tech:'Tech Workshop', decor:'Home Decor', books:'Book Shop' };

    // Theme prompts shown to the player. They are suggestions only; nothing checks that the design follows them.
    const challenges = [
      'Create something using only warm colors! 🔥',
      'Use glitter on EVERYTHING! ✨',
      'Make it as colorful as possible! 🌈',
      'Create a monochrome masterpiece! ⬛',
      'Go wild with stickers! ⭐',
      'Design something for a princess! 👸',
      'Create a spooky design! 🎃',
      'Make something sparkly & glam! 💎',
      'Design for a rock star! 🎸',
      'Create an ocean theme! 🌊',
      'Design something galactic! 🚀',
      'Make a floral fantasy! 🌸',
      'Create a candy-themed design! 🍬',
      'Design something minimalist! 🤍',
      'Go full rainbow chaos! 🦄',
    ];

    // Pick random station (only unlocked ones)
    const lvl = this.state.level;

    // Same unlock table as _updateCardLocks (duplicated); only stations the player has unlocked can be picked.
    const locks = { salon: 3, makeup: 4, tech: 5, decor: 6, books: 7 };
    const available = stations.filter(s => !locks[s] || lvl >= locks[s]);
    const station = U.pick(available);
    const challenge = U.pick(challenges);

    // Declared but never used (no bonus is awarded).
    const bonusXP = 25;

    // Show challenge toast then navigate
    this._showToast(`🎲 Freestyle: ${stationNames[station]}!`, challenge, () => {
      this.goTo(station);
    });
    Sound.play('challenge');
  },

  // Shows a modal popup (a dark overlay with a centred card) built entirely with inline styles, because it is created
  // dynamically and not defined in index.html. Uses the CSS animations fadeIn and popIn from style.css.
  // @param {string} title - Heading text (inserted as HTML).
  // @param {string} message - Body text (inserted as HTML).
  // @param {Function} [onDismiss] - Called once when the player closes the popup.
  _showToast(title, message, onDismiss) {
    // Create toast overlay
    const overlay = document.createElement('div');

    // Fixed full-screen overlay above everything (z-index 10000, higher than the modals at 100).
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);animation:fadeIn 0.3s ease;';

    const toast = document.createElement('div');
    toast.style.cssText = 'background:linear-gradient(135deg,rgba(30,15,60,0.95),rgba(20,10,40,0.98));border:1px solid rgba(255,105,180,0.3);border-radius:20px;padding:30px 40px;text-align:center;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,0.5),0 0 40px rgba(255,105,180,0.15);animation:popIn 0.4s ease;';

    toast.innerHTML = `
      <div style="font-size:42px;margin-bottom:12px;">🎲</div>
      <h3 style="font-family:var(--font-display);font-size:22px;color:var(--accent-pink);margin-bottom:8px;">${title}</h3>
      <p style="color:var(--text-secondary);font-size:14px;margin-bottom:20px;line-height:1.5;">${message}</p>
      <button class="btn btn-primary" style="min-width:140px;">Let's Go! ✨</button>
    `;

    // Closing: remove the overlay and run the callback. Clicking the dark background (not the card) does the same, which
    // is why the handler checks e.target === overlay.
    toast.querySelector('button').onclick = () => {
      overlay.remove();
      if (onDismiss) onDismiss();
    };

    overlay.appendChild(toast);
    overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); if (onDismiss) onDismiss(); } };
    document.body.appendChild(overlay);
  },

  /* ===== SETTINGS ===== */
  // Opens the settings modal (adds the CSS class "active") and clicks.
  showSettings() {
    document.getElementById('settings-modal').classList.add('active');
    Sound.play('click');
  },

  // Closes the settings modal and saves the chosen weather and sound setting into the state, which is how settings persist.
  closeSettings() {
    document.getElementById('settings-modal').classList.remove('active');
    this.state.weather = Weather.current;
    this.state.soundOn = Sound.enabled;
    this.save();
  },

  // Deletes all progress after a confirmation dialog and reloads the page so the game restarts from a clean state.
  // The key name is the 'fashion_' prefix that U.save adds plus 'state'.
  resetGame() {
    if (confirm('Are you sure? This will delete all progress!')) {
      localStorage.removeItem('fashion_state');
      location.reload();
    }
  },
};

// Wait for the DOM so every element that init() looks up exists. This is the only place the game starts itself;
// there is no explicit "start" call elsewhere.
/* ===== INIT ON LOAD ===== */
window.addEventListener('DOMContentLoaded', () => {
  Game.init();
});
