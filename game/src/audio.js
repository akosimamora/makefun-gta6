// Tiny WebAudio synth: no audio files, every sound is an oscillator.
window.SOL = window.SOL || {};
SOL.audio = {
  ctx: null,
  muted: false,
  ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone(freq, dur, type, vol, slideTo) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.05, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  },
  shot() { this.tone(880, 0.09, 'square', 0.06, 120); },
  pickup() { this.tone(520, 0.12, 'sine', 0.07, 1040); },
  coin() { this.tone(1320, 0.1, 'sine', 0.06); this.tone(1760, 0.14, 'sine', 0.05); },
  siren() { this.tone(660, 0.5, 'sawtooth', 0.03, 990); },
  crash() { this.tone(140, 0.25, 'sawtooth', 0.08, 50); },
  mission() { this.tone(392, 0.15, 'triangle', 0.07); setTimeout(() => this.tone(523, 0.2, 'triangle', 0.07), 140); },
  busted() { this.tone(220, 0.5, 'sawtooth', 0.07, 110); },
};
