// Synthesised sound, no audio files: an engine hum, a two-tone siren,
// gunshots and mission jingles, all from the Web Audio API. Everything is
// a no-op until a user gesture creates the context, and nothing here ever
// throws into the game loop.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenPhase = false;
  let sirenTimer = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  /** Call on any gesture; creates the context so later sounds play. */
  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  /** Engine hum: pitch and loudness follow the car's speed (0..1). */
  function setEngine(speed01, driving) {
    if (!ensure()) return;
    try {
      if (!driving) {
        if (engineGain) engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        return;
      }
      if (!engineOsc) {
        engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineFilter = ctx.createBiquadFilter();
        engineFilter.type = 'lowpass';
        engineFilter.frequency.value = 420;
        engineGain = ctx.createGain();
        engineGain.gain.value = 0;
        engineOsc.connect(engineFilter);
        engineFilter.connect(engineGain);
        engineGain.connect(master);
        engineOsc.start();
      }
      const f = 55 + speed01 * 135;
      engineOsc.frequency.setTargetAtTime(f, ctx.currentTime, 0.08);
      engineGain.gain.setTargetAtTime(0.05 + speed01 * 0.06, ctx.currentTime, 0.1);
    } catch { /* sound is never fatal */ }
  }

  /** Two-tone siren while police are close; call every frame with on/off. */
  function setSiren(on) {
    if (!ensure()) return;
    try {
      if (!on) {
        if (sirenGain) sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
        return;
      }
      if (!sirenOsc) {
        sirenOsc = ctx.createOscillator();
        sirenOsc.type = 'triangle';
        sirenOsc.frequency.value = 660;
        sirenGain = ctx.createGain();
        sirenGain.gain.value = 0;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(master);
        sirenOsc.start();
      }
      sirenGain.gain.setTargetAtTime(0.045, ctx.currentTime, 0.1);
      sirenTimer += 1 / 60;
      if (sirenTimer > 0.42) {
        sirenTimer = 0;
        sirenPhase = !sirenPhase;
        sirenOsc.frequency.setTargetAtTime(sirenPhase ? 880 : 660, ctx.currentTime, 0.02);
      }
    } catch { /* ignore */ }
  }

  /** One gunshot: a short noise burst plus a low thump. */
  function gunshot() {
    if (!ensure()) return;
    try {
      const len = Math.floor(ctx.sampleRate * 0.09);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = 0.5;
      src.connect(g);
      g.connect(master);
      src.start();
      const thump = ctx.createOscillator();
      thump.type = 'sine';
      thump.frequency.setValueAtTime(140, ctx.currentTime);
      thump.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.09);
      const tg = ctx.createGain();
      tg.gain.setValueAtTime(0.5, ctx.currentTime);
      tg.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      thump.connect(tg);
      tg.connect(master);
      thump.start();
      thump.stop(ctx.currentTime + 0.11);
    } catch { /* ignore */ }
  }

  /** Mission-complete jingle: four rising notes. */
  function jingle() {
    if (!ensure()) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const t = ctx.currentTime + i * 0.11;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + 0.35);
      });
    } catch { /* ignore */ }
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }

  return { unlock, setEngine, setSiren, gunshot, jingle, toggleMute, isMuted: () => muted };
}
