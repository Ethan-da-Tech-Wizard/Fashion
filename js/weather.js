// ==============================================================================
// Program: weather.js
// Programmer: Ethan-da-Tech-Wizard
// Last Modified: November 19, 2026
// Purpose: Full-viewport atmospheric weather simulation and particle physics system.
//          Animates angled rain streaks with linear velocity, drifting snowflakes
//          with harmonic sinusoidal horizontal wobble, and solar gradient flares
//          on a high-performance requestAnimationFrame canvas loop.
// ==============================================================================

/* ===== ATMOSPHERIC WEATHER SIMULATOR ===== */
const Weather = {
  current: 'sunny',
  particles: [],
  canvas: null,
  ctx: null,
  _raf: null,

  /**
   * Initializes fullscreen canvas buffer, binds resize listeners, and starts animation loop.
   */
  init() {
    this.canvas = document.getElementById('weather-canvas');
    this.ctx = this.canvas.getContext('2d');
    this._resize();
    window.addEventListener('resize', () => this._resize());
    this.set('sunny');
    this._loop();
  },

  /**
   * Adjusts particle canvas buffer dimensions to match live window viewport extents.
   */
  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  /**
   * Activates specified weather preset ('sunny', 'rainy', 'snowy') and populates particle pool.
   *
   * @param {string} type - Weather preset name.
   */
  set(type) {
    this.current = type;
    this.particles = [];
    const select = document.getElementById('setting-weather');
    if (select) select.value = type;
    const btn = document.getElementById('weather-btn');
    if (btn) {
      btn.textContent = type === 'sunny' ? '☀️' : type === 'rainy' ? '🌧️' : '❄️';
    }
    // Pre-populate particles distributed across screen height to avoid initial empty burst
    const count = type === 'sunny' ? 0 : type === 'rainy' ? 120 : 80;
    for (let i = 0; i < count; i++) {
      this.particles.push(this._newParticle(true));
    }
  },

  /**
   * Cycles sequentially to next weather condition preset.
   */
  cycle() {
    const types = ['sunny', 'rainy', 'snowy'];
    const idx = (types.indexOf(this.current) + 1) % types.length;
    this.set(types[idx]);
    Sound.play('whoosh');
  },

  /**
   * Constructs a single particle data model with physical velocity and visual properties.
   *
   * @param {boolean} [randomY=false] - Whether to randomize initial vertical position.
   * @returns {Object} Particle descriptor object.
   */
  _newParticle(randomY = false) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (this.current === 'rainy') {
      return {
        x: Math.random() * w,
        y: randomY ? Math.random() * h : -10,
        speed: U.randFloat(6, 14),
        length: U.randFloat(15, 30),
        opacity: U.randFloat(0.15, 0.4),
      };
    } else if (this.current === 'snowy') {
      return {
        x: Math.random() * w,
        y: randomY ? Math.random() * h : -10,
        speed: U.randFloat(0.5, 2),
        size: U.randFloat(2, 5),
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: U.randFloat(0.01, 0.03),
        opacity: U.randFloat(0.3, 0.7),
      };
    }
    return {};
  },

  /**
   * Continuous requestAnimationFrame render loop updating physics state and repainting frame.
   */
  _loop() {
    this._update();
    this._draw();
    this._raf = requestAnimationFrame(() => this._loop());
  },

  /**
   * Advances particle simulation by one step, recycling particles falling below viewport floor.
   */
  _update() {
    if (this.current === 'sunny') return;
    const h = this.canvas.height;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (this.current === 'rainy') {
        p.y += p.speed;
        p.x += 1.5; // Fixed wind velocity slant
        if (p.y > h + 20) {
          this.particles[i] = this._newParticle();
        }
      } else if (this.current === 'snowy') {
        p.y += p.speed;
        p.wobble += p.wobbleSpeed;
        p.x += Math.sin(p.wobble) * 0.5; // Sinusoidal harmonic horizontal drift
        if (p.y > h + 10) {
          this.particles[i] = this._newParticle();
        }
      }
    }
  },

  /**
   * Draws weather particles or ambient sunlight radial gradients onto the 2D surface.
   */
  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.current === 'sunny') {
      // Subtle warm sunbeam flare overlay in upper right quadrant
      const g = ctx.createRadialGradient(
        this.canvas.width * 0.8, 50, 0,
        this.canvas.width * 0.8, 50, 300
      );
      g.addColorStop(0, 'rgba(255,215,0,0.04)');
      g.addColorStop(1, 'rgba(255,215,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    if (this.current === 'rainy') {
      // Render angled rain streaks with varying opacity
      this.particles.forEach(p => {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 1.5, p.y + p.length);
        ctx.strokeStyle = `rgba(150,180,255,${p.opacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    } else if (this.current === 'snowy') {
      // Render soft circular snowflakes with gentle opacity
      this.particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
        ctx.fill();
      });
    }
  }
};
