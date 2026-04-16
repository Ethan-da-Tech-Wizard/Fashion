/* ===== MAIN GAME ENGINE ===== */
const Game = {
  state: {
    level: 1,
    xp: 0,
    coins: 0,
    closet: [],
    character: null,
    weather: 'sunny',
    soundOn: true,
    hasStarted: false,
  },

  currentScreen: 'menu',

  init() {
    // Init audio context on first user interaction
    document.addEventListener('click', () => {
      if (!Sound.ctx) Sound.init();
    }, { once: true });

    // Init subsystems
    ColorWheel.init();
    Weather.init();

    // Load saved state
    const saved = U.load('state');
    if (saved) {
      this.state = { ...this.state, ...saved };
      Weather.set(this.state.weather);
      if (this.state.character) {
        Character.data = this.state.character;
      }
    }

    // Update UI
    this._updateHUD();

    // Check continue button
    if (!this.state.hasStarted) {
      document.getElementById('btn-continue').style.opacity = '0.4';
      document.getElementById('btn-continue').style.pointerEvents = 'none';
    }

    // Add confetti canvas
    if (!document.getElementById('confetti-canvas')) {
      const cc = document.createElement('canvas');
      cc.id = 'confetti-canvas';
      document.body.appendChild(cc);
      cc.width = window.innerWidth;
      cc.height = window.innerHeight;
      window.addEventListener('resize', () => {
        cc.width = window.innerWidth;
        cc.height = window.innerHeight;
      });
    }

    console.log('✨ Fashion Game initialized!');
  },

  /* ===== NAVIGATION ===== */
  goTo(screen) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    // Show target
    const el = document.getElementById(screen + '-screen');
    if (el) {
      el.classList.add('active');
      this.currentScreen = screen;

      // Initialize screen-specific logic
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

      Sound.play('whoosh');
    }
  },

  /* ===== GAME FLOW ===== */
  newGame() {
    this.state = {
      level: 1, xp: 0, coins: 0,
      closet: [], character: null,
      weather: 'sunny', soundOn: true, hasStarted: true,
    };
    this.save();
    this.goTo('character');
  },

  continueGame() {
    if (!this.state.hasStarted) return;
    if (this.state.character) {
      Character.data = this.state.character;
    }
    this.goTo('workshop');
  },

  finishCharacter() {
    this.state.character = Character.getData();
    this.state.hasStarted = true;
    this.save();
    Sound.play('complete');
    this.goTo('workshop');
  },

  /* ===== STATE MANAGEMENT ===== */
  save() {
    U.save('state', this.state);
  },

  addToCloset(item) {
    this.state.closet.push(item);
    this.save();
  },

  addXP(amount) {
    this.state.xp += amount;
    this._updateHUD();
    this.save();
    Sound.play('coin');
  },

  checkLevelUp() {
    const nextLevel = LEVEL_DATA.find(l => l.lvl === this.state.level + 1);
    if (nextLevel && this.state.xp >= nextLevel.xp) {
      this.state.level++;
      this.save();
      return true;
    }
    return false;
  },

  addCoins(amount) {
    this.state.coins += amount;
    this._updateHUD();
    this.save();
  },

  /* ===== UI UPDATES ===== */
  _updateHUD() {
    const levelBadge = document.getElementById('level-badge');
    const xpText = document.getElementById('xp-text');
    const coinsDisplay = document.getElementById('coins-display');
    const workshopCoins = document.getElementById('workshop-coins');

    if (levelBadge) levelBadge.textContent = `Lv ${this.state.level}`;
    if (xpText) {
      const nextLevel = LEVEL_DATA.find(l => l.lvl === this.state.level + 1);
      const nextXP = nextLevel ? nextLevel.xp : '∞';
      xpText.textContent = `${this.state.xp} / ${nextXP} XP`;
    }
    if (coinsDisplay) coinsDisplay.textContent = `🪙 ${this.state.coins}`;
    if (workshopCoins) workshopCoins.textContent = `🪙 ${this.state.coins}`;
  },

  _updateCardLocks() {
    const lvl = this.state.level;
    // Salon unlocks at level 3, Makeup at 4, Tech at 5, Decor at 6, Books at 7
    const locks = { salon: 3, makeup: 4, tech: 5, decor: 6, books: 7 };
    Object.entries(locks).forEach(([station, reqLvl]) => {
      const card = document.getElementById('card-' + station);
      if (card) {
        if (lvl >= reqLvl) {
          card.classList.remove('locked');
        } else {
          card.classList.add('locked');
          card.onclick = () => { Sound.play('error'); };
        }
      }
    });
  },

  _renderWorkshopChar() {
    const c = document.getElementById('workshop-char-canvas');
    if (!c || !this.state.character) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    Character.drawCharacter(ctx, this.state.character, c.width/2, c.height*0.45, 0.55, c.width, c.height);
  },

  /* ===== LEVEL UP ===== */
  _renderLevelUp() {
    document.getElementById('levelup-level').textContent = `Level ${this.state.level}`;

    const levelData = LEVEL_DATA.find(l => l.lvl === this.state.level);
    const container = document.getElementById('levelup-unlocks');
    container.innerHTML = '';

    if (levelData) {
      levelData.unlocks.forEach((unlock, i) => {
        const badge = document.createElement('div');
        badge.className = 'unlock-badge';
        badge.textContent = '🔓 ' + unlock;
        badge.style.animationDelay = (i * 0.15) + 's';
        container.appendChild(badge);
      });
    }

    Sound.play('levelup');
    this._fireConfetti();
  },

  _fireConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const particles = [];
    const colors = ['#ff69b4','#ffd700','#3edbd5','#b36bff','#ff7b7b','#90ee90','#87ceeb'];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width/2 + (Math.random()-0.5) * 200,
        y: canvas.height * 0.4,
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
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        if (p.life <= 0) return;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
        p.rotation += p.rotSpeed;
        p.life -= 0.008;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
        ctx.restore();
      });

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
  _renderCustomers() {
    const queue = document.getElementById('customer-queue');
    const detail = document.getElementById('customer-detail');
    if (!queue) return;
    queue.innerHTML = '';

    // Update coins display
    const coinsEl = document.getElementById('coins-display');
    if (coinsEl) coinsEl.textContent = `🪙 ${this.state.coins}`;

    const closetCount = this.state.closet.length;
    const customerCount = Math.min(Math.floor(closetCount / 2) + 1, 8);

    if (closetCount === 0) {
      detail.innerHTML = '<p class="empty-msg">Create items in the workshop to attract customers!</p>';
      return;
    }

    const wantTypes = ['clothes','hair','makeup','tech','decor','books','all'];
    const wantLabels = { clothes:'👗 Clothes', hair:'💇 Hair Style', makeup:'💄 Makeup', tech:'📱 Tech', decor:'🛋️ Decor', books:'📚 Books', all:'✨ Anything' };
    const traits = ['Picky','Trendy','Budget','VIP','Mystery','Cheerful','Bold','Chill'];
    const traitColors = { Picky:'#FF6347', Trendy:'#FF69B4', Budget:'#32CD32', VIP:'#FFD700', Mystery:'#9370DB', Cheerful:'#FFA500', Bold:'#DC143C', Chill:'#00CED1' };

    for (let i = 0; i < customerCount; i++) {
      const name = U.pick(CUSTOMER_NAMES);
      const wants = U.pick(wantTypes);
      const trait = U.pick(traits);
      const isMystery = trait === 'Mystery';
      const skinTone = U.pick(SKIN_PRESETS);
      const hairColor = U.pick(HAIR_COLOR_PRESETS);

      const card = document.createElement('div');
      card.className = 'customer-card';

      // Mini character canvas
      const miniCanvas = document.createElement('canvas');
      miniCanvas.width = 60;
      miniCanvas.height = 75;
      miniCanvas.style.cssText = 'margin:0 auto 4px;display:block;';
      card.appendChild(miniCanvas);

      // Draw mini character
      const mctx = miniCanvas.getContext('2d');
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
        mctx.fillStyle = skinTone;
        mctx.beginPath(); mctx.arc(30, 22, 14, 0, Math.PI*2); mctx.fill();
        // Head highlight
        mctx.fillStyle = 'rgba(255,255,255,0.15)';
        mctx.beginPath(); mctx.arc(27, 18, 6, 0, Math.PI*2); mctx.fill();
        // Hair top
        mctx.fillStyle = hairColor;
        mctx.beginPath(); mctx.ellipse(30, 14, 16, 10, 0, Math.PI, 0, true); mctx.fill();
        mctx.fillRect(14, 14, 32, 3);
        // Eyes — big sparkly
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

      card.onclick = () => {
        this._serveCustomer(isMystery ? '???' : name, wants, trait, detail, card);
        Sound.play('select');
      };
      queue.appendChild(card);
    }
  },

  _serveCustomer(name, wants, trait, detailEl, cardEl) {
    const items = this.state.closet.filter(i => {
      if (wants === 'all') return true;
      return i.type === wants;
    });

    if (items.length === 0) {
      const wantLabels = { clothes:'clothes', hair:'a hair style', makeup:'makeup', tech:'tech gadgets', decor:'decor items', books:'books', all:'something' };
      detailEl.innerHTML = `<p class="empty-msg">${name} wants ${wantLabels[wants] || wants}, but you don't have any! Create some in the workshop.</p>`;
      return;
    }

    const item = U.pick(items);
    // Coins based on trait
    let coinMult = 1;
    if (trait === 'VIP') coinMult = 2.5;
    if (trait === 'Mystery') coinMult = 3;
    if (trait === 'Budget') coinMult = 0.7;
    if (trait === 'Trendy') coinMult = 1.5;
    const coins = Math.round(U.rand(10, 30) * this.state.level * coinMult);

    const reactions = ['loves', 'adores', 'is obsessed with', 'can\'t stop looking at', 'is thrilled by'];
    const quotes = [
      `"This ${item.name} is absolutely perfect!"`,
      `"I've never seen anything so beautiful!"`,
      `"This is exactly what I was looking for!"`,
      `"You're so talented! I love this!"`,
      `"My friends will be so jealous!"`,
      `"This is the best ${item.type} I've ever seen!"`,
    ];

    const traitBonus = trait === 'VIP' ? '<div style="font-size:12px;color:#FFD700;margin:4px 0;">✨ VIP Bonus: 2.5x coins!</div>'
      : trait === 'Mystery' ? '<div style="font-size:12px;color:#9370DB;margin:4px 0;">🔮 Mystery Bonus: 3x coins!</div>'
      : '';

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
    if (cardEl) {
      cardEl.style.opacity = '0.5';
      cardEl.style.pointerEvents = 'none';
    }
  },

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
  startFreestyle() {
    const stations = ['studio','salon','makeup','tech','decor','books'];
    const stationNames = { studio:'Fashion Studio', salon:'Hair Salon', makeup:'Makeup Studio', tech:'Tech Workshop', decor:'Home Decor', books:'Book Shop' };
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
    const locks = { salon: 3, makeup: 4, tech: 5, decor: 6, books: 7 };
    const available = stations.filter(s => !locks[s] || lvl >= locks[s]);
    const station = U.pick(available);
    const challenge = U.pick(challenges);
    const bonusXP = 25;

    // Show challenge toast then navigate
    this._showToast(`🎲 Freestyle: ${stationNames[station]}!`, challenge, () => {
      this.goTo(station);
    });
    Sound.play('challenge');
  },

  _showToast(title, message, onDismiss) {
    // Create toast overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);animation:fadeIn 0.3s ease;';

    const toast = document.createElement('div');
    toast.style.cssText = 'background:linear-gradient(135deg,rgba(30,15,60,0.95),rgba(20,10,40,0.98));border:1px solid rgba(255,105,180,0.3);border-radius:20px;padding:30px 40px;text-align:center;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,0.5),0 0 40px rgba(255,105,180,0.15);animation:popIn 0.4s ease;';

    toast.innerHTML = `
      <div style="font-size:42px;margin-bottom:12px;">🎲</div>
      <h3 style="font-family:var(--font-display);font-size:22px;color:var(--accent-pink);margin-bottom:8px;">${title}</h3>
      <p style="color:var(--text-secondary);font-size:14px;margin-bottom:20px;line-height:1.5;">${message}</p>
      <button class="btn btn-primary" style="min-width:140px;">Let's Go! ✨</button>
    `;

    toast.querySelector('button').onclick = () => {
      overlay.remove();
      if (onDismiss) onDismiss();
    };

    overlay.appendChild(toast);
    overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); if (onDismiss) onDismiss(); } };
    document.body.appendChild(overlay);
  },

  /* ===== SETTINGS ===== */
  showSettings() {
    document.getElementById('settings-modal').classList.add('active');
    Sound.play('click');
  },

  closeSettings() {
    document.getElementById('settings-modal').classList.remove('active');
    this.state.weather = Weather.current;
    this.state.soundOn = Sound.enabled;
    this.save();
  },

  resetGame() {
    if (confirm('Are you sure? This will delete all progress!')) {
      localStorage.removeItem('fashion_state');
      location.reload();
    }
  },
};

/* ===== INIT ON LOAD ===== */
window.addEventListener('DOMContentLoaded', () => {
  Game.init();
});
