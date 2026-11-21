// Tiny WebAudio synth: no audio files, every sound is an oscillator.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }
  ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  blip(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol || 0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur);
  }
  shoot() { this.blip(880, 0.09, 'square', 0.1); }
  reload() { this.blip(330, 0.07, 'triangle', 0.08); this.blip(495, 0.07, 'triangle', 0.08); }
  pickup() { this.blip(660, 0.08, 'sine', 0.1); this.blip(990, 0.12, 'sine', 0.1); }
  siren() { this.blip(720, 0.16, 'sawtooth', 0.04); }
  crash() { this.blip(140, 0.2, 'sawtooth', 0.12); }
  cash() { this.blip(1320, 0.1, 'sine', 0.1); this.blip(1760, 0.16, 'sine', 0.1); }
}
