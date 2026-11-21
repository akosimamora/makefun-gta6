// Tiny WebAudio synth: gunshots, sirens, pickups and engine hum, no audio files.
export function createAudio() {
  let ctx = null;
  let sirenOn = false;
  let sirenNodes = null;

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    const c = ensure();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.08, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + dur);
  }

  return {
    unlock() { ensure(); },
    shot() { tone(900, 0.12, 'square', 0.12, 120); },
    reload() { tone(500, 0.08, 'square', 0.06); tone(700, 0.08, 'square', 0.06); },
    pickup() { tone(660, 0.1, 'sine', 0.1); setTimeout(() => tone(880, 0.14, 'sine', 0.1), 90); },
    crash() { tone(140, 0.25, 'sawtooth', 0.14, 60); },
    busted() { tone(440, 0.5, 'sawtooth', 0.1, 220); },
    missionDone() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'sine', 0.1), i * 110)); },
    siren(on) {
      if (on === sirenOn) return;
      sirenOn = on;
      const c = ensure();
      if (!c) return;
      if (on) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine'; o.frequency.value = 700;
        g.gain.value = 0.025;
        const lfo = c.createOscillator();
        lfo.frequency.value = 0.8;
        const lg = c.createGain();
        lg.gain.value = 250;
        lfo.connect(lg); lg.connect(o.frequency);
        o.connect(g); g.connect(c.destination);
        o.start(); lfo.start();
        sirenNodes = { o, lfo, g };
      } else if (sirenNodes) {
        try { sirenNodes.o.stop(); sirenNodes.lfo.stop(); } catch (e) {}
        sirenNodes = null;
      }
    },
  };
}
