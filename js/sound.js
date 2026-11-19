// ==============================================================================
// Program: sound.js
// Programmer: Ethan-da-Tech-Wizard
// Last Modified: November 19, 2026
// Purpose: Web Audio API sound synthesis and procedural audio effect manager.
//          Generates zero-asset sound effects using OscillatorNodes (sine, triangle,
//          square, sawtooth) and white noise buffer sources with exponential gain
//          envelopes for scissors snipping, coins clinking, level-up arpeggios,
//          and frequency sweeps.
// ==============================================================================

/* ===== SOUND EFFECTS (Web Audio API) ===== */
const Sound = {
  ctx: null,
  enabled: true,

  /**
   * Initializes the browser AudioContext on first user interaction gesture.
   */
  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {}
  },

  /**
   * Toggles global audio playback state and updates settings UI checkbox.
   */
  toggle() {
    this.enabled = !this.enabled;
    const checkbox = document.getElementById('setting-sound');
    if (checkbox) checkbox.checked = this.enabled;
  },

  /**
   * Dispatches procedural acoustic synthesizer routines for specific game event cues.
   *
   * @param {string} type - Audio effect cue identifier (e.g. 'click', 'snip', 'coin', 'levelup').
   */
  play(type) {
    if (!this.enabled || !this.ctx) return;
    try {
      switch(type) {
        case 'click':
          // Subtle high-pitch click
          this._tone(800, 0.06, 'sine', 0.15);
          break;
        case 'select':
          // Two-tone ascending selection chime
          this._tone(600, 0.08, 'sine', 0.12);
          this._tone(900, 0.08, 'sine', 0.12, 0.06);
          break;
        case 'snip':
          // White noise scissor cut transient
          this._noise(0.08, 0.2);
          break;
        case 'spray':
          // Sustained aerosol spray burst
          this._noise(0.15, 0.1);
          break;
        case 'sparkle':
          // Tri-tone sparkling arpeggio
          this._tone(1200, 0.1, 'sine', 0.08);
          this._tone(1600, 0.1, 'sine', 0.08, 0.05);
          this._tone(2000, 0.1, 'sine', 0.08, 0.1);
          break;
        case 'place':
          // Soft placement thud
          this._tone(500, 0.05, 'triangle', 0.15);
          break;
        case 'levelup':
          // Ascending C-E-G-C major quad chord
          [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.2, 'sine', 0.12, i * 0.12));
          break;
        case 'coin':
          // Bright retro 8-bit square wave coin pickup
          this._tone(1000, 0.08, 'square', 0.06);
          this._tone(1500, 0.08, 'square', 0.06, 0.08);
          break;
        case 'whoosh':
          // Dynamic frequency upward sweep
          this._sweep(300, 1200, 0.15, 0.08);
          break;
        case 'pop':
          // Bubble pop transient
          this._tone(400, 0.04, 'sine', 0.2);
          break;
        case 'paint':
          // Blended noise and low tonal brush stroke
          this._noise(0.06, 0.08);
          this._tone(300, 0.06, 'sine', 0.04);
          break;
        case 'error':
          // Low buzzing sawtooth error alert
          this._tone(200, 0.15, 'sawtooth', 0.08);
          break;
        case 'complete':
          // Celebratory harmonic sequence
          [660, 880, 1100, 1320].forEach((f, i) => this._tone(f, 0.25, 'sine', 0.1, i * 0.1));
          break;
        case 'sell':
          // Register cash chime
          this._tone(800, 0.06, 'square', 0.08);
          this._tone(1200, 0.06, 'square', 0.08, 0.06);
          this._tone(1600, 0.08, 'sine', 0.1, 0.12);
          break;
        case 'unlock':
          // Progressive achievement chime
          [440, 554, 659, 880].forEach((f, i) => this._tone(f, 0.15, 'sine', 0.08, i * 0.08));
          break;
        case 'challenge':
          // Rising excitement glissando
          this._sweep(200, 1400, 0.25, 0.06);
          this._tone(1400, 0.15, 'sine', 0.1, 0.25);
          break;
        case 'stamp':
          // Tactile rubber stamp impact
          this._tone(150, 0.06, 'square', 0.15);
          this._noise(0.04, 0.1);
          break;
      }
    } catch(e) {}
  },

  /**
   * Synthesizes a discrete pitched tone with exponential gain decay.
   *
   * @param {number} freq - Pitch frequency in Hertz.
   * @param {number} dur - Sound duration in seconds.
   * @param {OscillatorType} type - Waveform shape ('sine', 'square', 'triangle', 'sawtooth').
   * @param {number} vol - Peak volume amplitude.
   * @param {number} [delay=0] - Trigger delay offset in seconds.
   */
  _tone(freq, dur, type, vol, delay = 0) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + dur);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(this.ctx.currentTime + delay);
    o.stop(this.ctx.currentTime + delay + dur + 0.01);
  },

  /**
   * Generates a burst of white noise using an AudioBuffer of random float amplitudes.
   *
   * @param {number} dur - Sound duration in seconds.
   * @param {number} vol - Peak volume amplitude.
   */
  _noise(dur, vol) {
    const bufSize = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    src.connect(g);
    g.connect(this.ctx.destination);
    src.start();
    src.stop(this.ctx.currentTime + dur + 0.01);
  },

  /**
   * Synthesizes a continuous pitch sweep (glissando) between two frequencies.
   *
   * @param {number} f1 - Starting frequency in Hz.
   * @param {number} f2 - Target end frequency in Hz.
   * @param {number} dur - Transition duration in seconds.
   * @param {number} vol - Peak volume amplitude.
   */
  _sweep(f1, f2, dur, vol) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f1, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(f2, this.ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    o.stop(this.ctx.currentTime + dur + 0.01);
  }
};
