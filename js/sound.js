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
// FILE OVERVIEW
// sound.js is the game's audio engine. It ships no audio files: every effect is
// synthesised at run time with the Web Audio API (oscillators for tones, a random-sample
// buffer for noise), which keeps the project asset-free and offline-friendly.
//
// Who calls it: any module that wants feedback calls Sound.play('name'), for example
// Game.goTo plays 'whoosh', the tools play 'snip', 'spray' or 'paint', and the customer
// screen plays 'sell'. Game.init() calls Sound.init() on the first click anywhere. The
// settings checkbox (#setting-sound in index.html) calls Sound.toggle(). It calls only
// the browser's AudioContext; it depends on no other game module.
//
// Key design decisions:
//   - Browsers refuse to start audio before a user gesture, so the AudioContext is created
//     lazily on the first click (see Game.init) rather than at load. Until then
//     Sound.play() silently does nothing because `ctx` is null.
//   - All audio calls are wrapped in try/catch: a failure in sound must never break
//     gameplay, and old browsers without Web Audio simply get a silent game.
//   - Every sound is a short note or noise burst whose volume decays exponentially to near
//     silence, which avoids the audible "click" that stopping an oscillator abruptly causes.
//
// Persistence: the on/off preference is written to Game.state.soundOn when settings
// close, and Game.init() now reads it back into Sound.enabled (and the checkbox) on load.
// Known limits: nothing here unlocks a suspended AudioContext (a context created
// inside a click handler normally starts running, so this works in practice).
// How to test: open the page, click once anywhere, then run Sound.play('levelup') in the
// console and listen for a four-note rising arpeggio.

/* ===== SOUND EFFECTS (Web Audio API) ===== */
// Singleton audio manager (plain object, no class, since there is only one speaker).
const Sound = {
  // The shared AudioContext; null until init() runs. play() checks it, so every effect is a
  // safe no-op before the first user gesture.
  ctx: null,

  // Master mute switch. Flipped by toggle(); play() returns early when false. Persisted by
  // Game.closeSettings() and restored by Game.init() (see "Persistence" above).
  enabled: true,

  /**
   * Initializes the browser AudioContext on first user interaction gesture.
   */
  init() {
    // try/catch because constructing an AudioContext can throw in locked-down browsers; the
    // `webkitAudioContext` fallback covers older Safari.
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {}
  },

  /**
   * Toggles global audio playback state and updates settings UI checkbox.
   */
  toggle() {
    // Flip the mute flag.
    this.enabled = !this.enabled;

    // Re-sync the checkbox because toggle() can also be called from code (not only from the
    // checkbox's own onchange), and the visible state must always match `enabled`. The element
    // may not exist if the settings modal markup is removed, hence the null check.
    const checkbox = document.getElementById('setting-sound');
    if (checkbox) checkbox.checked = this.enabled;
  },

  /**
   * Dispatches procedural acoustic synthesizer routines for specific game event cues.
   *
   * @param {string} type - Audio effect cue identifier (e.g. 'click', 'snip', 'coin', 'levelup').
   */
  play(type) {
    // Guard: do nothing when muted or before the AudioContext exists. Every caller can
    // therefore call play() unconditionally.
    if (!this.enabled || !this.ctx) return;

    // Any synthesis error (for example a closed context) is swallowed in the catch below so a
    // broken sound can never stop the game loop.
    try {
      // Each case below is one sound "recipe". The arguments of _tone are
      // (frequency Hz, duration s, waveform, peak volume 0-1, start delay s); _noise takes
      // (duration s, volume) and _sweep takes (start Hz, end Hz, duration s, volume). Volumes are
      // kept low (0.04-0.2) because several effects can overlap and the sum must not clip.
      // Unknown cue names fall through the switch and make no sound.
      switch(type) {
        case 'click':
          // Subtle high-pitch click
          // 800 Hz for 60 ms is a short, high tick that reads as a button click without being annoying
          // when pressed repeatedly.
          this._tone(800, 0.06, 'sine', 0.15);
          break;
        case 'select':
          // Two-tone ascending selection chime
          // Two sine notes a fifth apart (600 then 900 Hz, the second delayed by 60 ms) overlap
          // slightly so they sound like one rising "ding".
          this._tone(600, 0.08, 'sine', 0.12);
          this._tone(900, 0.08, 'sine', 0.12, 0.06);
          break;
        case 'snip':
          // White noise scissor cut transient
          // Noise has no pitch, so a very short burst (80 ms) sounds like a blade snicking shut.
          this._noise(0.08, 0.2);
          break;
        case 'spray':
          // Sustained aerosol spray burst
          // Longer (150 ms) and quieter than the snip so it sounds like a hiss of spray.
          this._noise(0.15, 0.1);
          break;
        case 'sparkle':
          // Tri-tone sparkling arpeggio
          // Three quick rising sine tones (1200, 1600, 2000 Hz) 50 ms apart: high frequencies and a
          // fast stagger give a "glittery" feel.
          this._tone(1200, 0.1, 'sine', 0.08);
          this._tone(1600, 0.1, 'sine', 0.08, 0.05);
          this._tone(2000, 0.1, 'sine', 0.08, 0.1);
          break;
        case 'place':
          // Soft placement thud
          // Triangle waves are softer than sine at low pitch; 500 Hz for 50 ms is a dull tap for
          // placing an item.
          this._tone(500, 0.05, 'triangle', 0.15);
          break;
        case 'levelup':
          // Ascending C-E-G-C major quad chord
          // The frequencies 523, 659, 784 and 1047 Hz are the notes C5, E5, G5 and C6 (a C major
          // arpeggio), started 0.12 s apart by the `i * 0.12` delay so they climb like a fanfare.
          [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.2, 'sine', 0.12, i * 0.12));
          break;
        case 'coin':
          // Bright retro 8-bit square wave coin pickup
          // Square waves have the buzzy timbre of 8-bit games; the two tones (1000 then 1500 Hz) mimic
          // the classic coin pickup. Quiet (0.06) because square waves are loud for their amplitude.
          this._tone(1000, 0.08, 'square', 0.06);
          this._tone(1500, 0.08, 'square', 0.06, 0.08);
          break;
        case 'whoosh':
          // Dynamic frequency upward sweep
          // A 300 to 1200 Hz sweep in 150 ms; the rising pitch suggests movement, so it is used
          // for every screen transition.
          this._sweep(300, 1200, 0.15, 0.08);
          break;
        case 'pop':
          // Bubble pop transient
          // A single very short (40 ms) 400 Hz blip at higher volume, like a bubble.
          this._tone(400, 0.04, 'sine', 0.2);
          break;
        case 'paint':
          // Blended noise and low tonal brush stroke
          // Brush stroke: a faint noise burst plus a soft low tone; quieter than snip/spray because
          // it can fire many times per second while dragging.
          this._noise(0.06, 0.08);
          this._tone(300, 0.06, 'sine', 0.04);
          break;
        case 'error':
          // Low buzzing sawtooth error alert
          // A low 200 Hz sawtooth (harsh timbre) signals "not allowed", for example clicking a
          // locked station.
          this._tone(200, 0.15, 'sawtooth', 0.08);
          break;
        case 'complete':
          // Celebratory harmonic sequence
          // Four rising notes (660, 880, 1100, 1320 Hz) 0.1 s apart, slightly slower and longer than
          // the coin sound to feel like an achievement.
          [660, 880, 1100, 1320].forEach((f, i) => this._tone(f, 0.25, 'sine', 0.1, i * 0.1));
          break;
        case 'sell':
          // Register cash chime
          // Cash register: two square blips (800, 1200 Hz) then a sine "ring" at 1600 Hz.
          this._tone(800, 0.06, 'square', 0.08);
          this._tone(1200, 0.06, 'square', 0.08, 0.06);
          this._tone(1600, 0.08, 'sine', 0.1, 0.12);
          break;
        case 'unlock':
          // Progressive achievement chime
          // 440, 554, 659 and 880 Hz are A4, C#5, E5 and A5 (an A major arpeggio), faster than the
          // level-up chime so unlocking feels quick.
          [440, 554, 659, 880].forEach((f, i) => this._tone(f, 0.15, 'sine', 0.08, i * 0.08));
          break;
        case 'challenge':
          // Rising excitement glissando
          // A 200 to 1400 Hz sweep over 250 ms then a held 1400 Hz note starting exactly when the
          // sweep ends (delay 0.25), for a "rising excitement" cue on the freestyle challenge.
          this._sweep(200, 1400, 0.25, 0.06);
          this._tone(1400, 0.15, 'sine', 0.1, 0.25);
          break;
        case 'stamp':
          // Tactile rubber stamp impact
          // A 150 Hz thump plus a noise burst imitates the impact of a rubber stamp.
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
    // Web Audio graph for one note: oscillator -> gain -> speakers. A new oscillator and gain
    // node are created for every note because oscillators are single-use (cannot be restarted).
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;

    // Gain schedule: start at `vol` when the note begins, then ramp exponentially to 0.001 at the
    // end. An exponential ramp cannot reach exactly 0 (it is mathematically undefined), which is
    // why the target is 0.001, about -60 dB and inaudible.
    g.gain.setValueAtTime(vol, this.ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + dur);

    // Connect oscillator -> gain -> destination (the speakers).
    o.connect(g);
    g.connect(this.ctx.destination);

    // Start and stop times are absolute context times, so `delay` lets several notes be queued at
    // once to form chords and arpeggios. Stopping 10 ms after the envelope ends lets the tail
    // finish and lets the browser garbage collect the nodes automatically.
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
    // One mono channel with one sample per frame: sampleRate (typically 44100 or 48000) times the
    // duration in seconds. Fractional sizes are truncated by createBuffer.
    const bufSize = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);

    // Fill with uniform random values in [-1, 1): that is white noise (equal energy at all
    // frequencies).
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    src.buffer = buf;

    // Same decaying-envelope idea as _tone so the noise fades out instead of cutting off.
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    src.connect(g);
    g.connect(this.ctx.destination);

    // Unlike oscillators a buffer source plays from its own start, so start() needs no argument
    // here; it stops just after the envelope has finished.
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

    // Pitch glide: starts at f1 and moves exponentially (equal musical intervals per unit time)
    // to f2. Exponential ramps need both values > 0, which holds for the calls in play().
    o.frequency.setValueAtTime(f1, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(f2, this.ctx.currentTime + dur);

    // Volume envelope identical to the one in _tone.
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    o.stop(this.ctx.currentTime + dur + 0.01);
  }
};
