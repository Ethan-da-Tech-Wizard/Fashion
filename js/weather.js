// ==============================================================================
// Program: weather.js
// Programmer: Ethan-da-Tech-Wizard
// Last Modified: November 19, 2026
// Purpose: Full-viewport atmospheric weather simulation and particle physics system.
//          Animates angled rain streaks with linear velocity, drifting snowflakes
//          with harmonic sinusoidal horizontal wobble, and solar gradient flares
//          on a high-performance requestAnimationFrame canvas loop.
// ==============================================================================
// FILE OVERVIEW
// weather.js draws the ambient weather effect behind the whole UI: nothing on a sunny day
// (just a faint warm glow), falling rain streaks, or drifting snow. It owns the full-window
// <canvas id="weather-canvas"> in index.html, which is positioned fixed, pointer-events:none
// and under the screens, so it is purely cosmetic and never blocks clicks.
//
// Who calls it: Game.init() calls Weather.init() and later Weather.set(savedWeather); the
// workshop's weather button calls Weather.cycle(); the settings dropdown calls
// Weather.set(value); Game.closeSettings() reads Weather.current to save it. It calls
// Sound.play('whoosh') in cycle() and U.randFloat for random particle properties.
//
// Design decisions:
//   - One requestAnimationFrame loop that runs forever (_loop), even on a sunny day, because
//     switching weather is just a change of `current`; no loop restart logic is needed.
//   - Particles are plain objects in an array, recycled in place when they fall off the
//     bottom instead of being deleted and re-created, which avoids garbage and keeps the count
//     constant (120 raindrops or 80 snowflakes).
//   - Physics is frame-based (pixels per frame, not per second), so on a 120 Hz display the
//     weather moves twice as fast as on a 60 Hz display. Acceptable for decoration.
//
// Known limits: the canvas is resized to the window on every resize event but the existing
// particles are not repositioned, so after enlarging the window some area is empty until
// particles recycle. Weather.set() replaces the text of #weather-btn with an emoji, which
// removes the SVG icon that Icons.init() put there.
// How to test: open the page and run Weather.set('rainy') or Weather.set('snowy') in the
// console; Weather.particles.length should become 120 or 80.

/* ===== ATMOSPHERIC WEATHER SIMULATOR ===== */
// Singleton object holding all weather state.
const Weather = {
  // Name of the active preset: 'sunny', 'rainy' or 'snowy'. Read by Game.closeSettings() so
  // the choice is saved in the player's save file.
  current: 'sunny',

  // Live particles. Empty on sunny days. Shape depends on the preset (see _newParticle).
  particles: [],

  // The weather <canvas> element and its 2D context, set in init().
  canvas: null,
  ctx: null,

  // Handle of the pending animation frame. Stored so the loop could be cancelled; nothing
  // cancels it currently.
  _raf: null,

  /**
   * Initializes fullscreen canvas buffer, binds resize listeners, and starts animation loop.
   */
  // Called once by Game.init() after the DOM exists (the canvas must be in the page).
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
  // Match the canvas pixel buffer to the window so particles cover the whole viewport and
  // are not stretched by CSS. Assigning width/height also clears the canvas, which is fine
  // because the loop repaints every frame.
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
    // Switch preset and discard all old particles so rain never mixes with snow.
    this.current = type;
    this.particles = [];

    // Keep the settings dropdown in sync when weather is changed from the workshop button
    // instead of from the dropdown.
    const select = document.getElementById('setting-weather');
    if (select) select.value = type;

    // Update the workshop's weather button face to match the active preset. This uses
    // textContent, which replaces the SVG that Icons.init() inserted for data-icon="weather".
    const btn = document.getElementById('weather-btn');
    if (btn) {
      btn.textContent = type === 'sunny' ? '☀️' : type === 'rainy' ? '🌧️' : '❄️';
    }

    // Pre-fill the sky: randomY = true scatters particles over the full height, so rain or snow
    // is already falling everywhere the moment the preset changes, instead of starting as a
    // single line at the top. Counts: 120 raindrops (fast, thin) or 80 snowflakes (slow, bigger);
    // sunny uses none. These numbers are a visual balance, not tied to anything else.
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
    // Cycle order is fixed; indexOf of the current value plus one, wrapped with modulo, wraps
    // snowy back to sunny. An unknown current value gives index -1, so the cycle restarts at sunny.
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
    // The canvas size is read at creation time so new particles spawn within the current width.
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Rain: long thin streaks. speed 6-14 px per frame (fast), length 15-30 px, low opacity
    // 0.15-0.4 so it stays background. Spawns just above the top edge (y = -10) unless the
    // caller asks for a random height.
    if (this.current === 'rainy') {
      return {
        x: Math.random() * w,
        y: randomY ? Math.random() * h : -10,
        speed: U.randFloat(6, 14),
        length: U.randFloat(15, 30),
        opacity: U.randFloat(0.15, 0.4),
      };

    // Snow: slow (0.5-2 px/frame), radius 2-5 px. `wobble` is a random starting phase (0 to 2 pi
    // radians) and `wobbleSpeed` how fast that phase advances each frame; together they make each
    // flake sway left and right at its own pace. Opacity 0.3-0.7.
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

    // Sunny has no particles, so an empty object is returned and never used (set() creates
    // zero of them).
    return {};
  },

  /**
   * Continuous requestAnimationFrame render loop updating physics state and repainting frame.
   */
  _loop() {
    // Update then draw each frame, then schedule the next frame. Calling _loop from init() starts it.
    this._update();
    this._draw();
    this._raf = requestAnimationFrame(() => this._loop());
  },

  /**
   * Advances particle simulation by one step, recycling particles falling below viewport floor.
   */
  _update() {
    // Sunny has nothing to move, so skip the work.
    if (this.current === 'sunny') return;
    const h = this.canvas.height;

    // Iterate backwards so replacing an element in the array (below) can never skip one.
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (this.current === 'rainy') {
        // Rain falls straight down at its own speed and drifts right a constant 1.5 px per frame, a
        // simple wind effect.
        p.y += p.speed;
        p.x += 1.5; // Fixed wind velocity slant

        // Recycle: once a drop is 20 px below the bottom edge (so it is fully off screen) replace
        // it with a fresh one at the top. The replaced particle has a new random x, which also stops
        // the rightward drift from pushing drops off the right side forever.
        if (p.y > h + 20) {
          this.particles[i] = this._newParticle();
        }
      } else if (this.current === 'snowy') {
        // Snow: fall at the flake's own speed and advance its sway phase.
        p.y += p.speed;
        p.wobble += p.wobbleSpeed;

        // Horizontal drift is sin(phase) * 0.5 px per frame: it oscillates between -0.5 and +0.5, so
        // flakes sway around their x position instead of moving steadily sideways.
        p.x += Math.sin(p.wobble) * 0.5; // Sinusoidal harmonic horizontal drift

        // Off-screen margin is 10 px (flakes are small, at most 5 px radius).
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

    // Clear the whole previous frame; the canvas is transparent so the page shows through.
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Sunny: no particles, only a very faint (4% opacity) golden radial glow centred 80% across
    // and 50 px down, fading to nothing at 300 px, to suggest sunlight from the upper right. It
    // returns early because the particle branches below do not apply.
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
      // Rain streaks: each is a line from the drop's position to 1.5 px right (matching the wind
      // drift) and `length` px down, in a light blue at the drop's own opacity.
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
      // Snow: filled white circles, translucent so overlapping flakes look soft.
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
