/* ===== SOUND EFFECTS (Web Audio API) ===== */
const Sound = {
  ctx: null,
  enabled: true,

  init() {
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  },

  toggle() {
    this.enabled = !this.enabled;
    document.getElementById('setting-sound').checked = this.enabled;
  },

  play(type) {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      switch(type) {
        case 'click': this._tone(800, 0.06, 'sine', 0.15); break;
        case 'select': this._tone(600, 0.08, 'sine', 0.12); this._tone(900, 0.08, 'sine', 0.12, 0.06); break;
        case 'snip': this._noise(0.08, 0.2); break;
        case 'spray': this._noise(0.15, 0.1); break;
        case 'sparkle': this._tone(1200, 0.1, 'sine', 0.08); this._tone(1600, 0.1, 'sine', 0.08, 0.05); this._tone(2000, 0.1, 'sine', 0.08, 0.1); break;
        case 'place': this._tone(500, 0.05, 'triangle', 0.15); break;
        case 'levelup':
          [523,659,784,1047].forEach((f,i) => this._tone(f, 0.2, 'sine', 0.12, i*0.12));
          break;
        case 'coin': this._tone(1000, 0.08, 'square', 0.06); this._tone(1500, 0.08, 'square', 0.06, 0.08); break;
        case 'whoosh':
          this._sweep(300, 1200, 0.15, 0.08); break;
        case 'pop': this._tone(400, 0.04, 'sine', 0.2); break;
        case 'paint': this._noise(0.06, 0.08); this._tone(300, 0.06, 'sine', 0.04); break;
        case 'error': this._tone(200, 0.15, 'sawtooth', 0.08); break;
        case 'complete':
          [660,880,1100,1320].forEach((f,i) => this._tone(f, 0.25, 'sine', 0.1, i*0.1));
          break;
        case 'sell':
          this._tone(800, 0.06, 'square', 0.08);
          this._tone(1200, 0.06, 'square', 0.08, 0.06);
          this._tone(1600, 0.08, 'sine', 0.1, 0.12);
          break;
        case 'unlock':
          [440,554,659,880].forEach((f,i) => this._tone(f, 0.15, 'sine', 0.08, i*0.08));
          break;
        case 'challenge':
          this._sweep(200, 1400, 0.25, 0.06);
          this._tone(1400, 0.15, 'sine', 0.1, 0.25);
          break;
        case 'stamp':
          this._tone(150, 0.06, 'square', 0.15);
          this._noise(0.04, 0.1);
          break;
      }
    } catch(e) {}
  },

  _tone(freq, dur, type, vol, delay=0) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(this.ctx.currentTime + delay);
    o.stop(this.ctx.currentTime + delay + dur + 0.01);
  },

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
    src.connect(g); g.connect(this.ctx.destination);
    src.start(); src.stop(this.ctx.currentTime + dur + 0.01);
  },

  _sweep(f1, f2, dur, vol) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f1, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(f2, this.ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + dur + 0.01);
  }
};
