// Sound for Solmara, all synthesized with WebAudio: no audio files, no
// network. An engine hum that follows the car's speed, a two-tone police
// siren while the heat is on, a gunshot, a pickup chime and a mission jingle.
// Audio starts on the first user gesture (a browser rule) and M mutes it.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let sirenOn = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      // The engine: a low sawtooth whose pitch follows speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      // The siren: a square wave that swings between two notes.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'square';
      sirenOsc.frequency.value = 660;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    try {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      // Sound is garnish: a failure never stops the game.
    }
  }

  return {
    // Call on the first user gesture; also resumes a suspended context.
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted: () => muted,
    // The engine hum, called every frame with the car's speed (0 on foot).
    engine(speed) {
      if (!ensure()) return;
      const target = speed > 20 ? 0.05 + Math.min(0.09, speed / 520 * 0.09) : 0;
      engineGain.gain.setTargetAtTime(muted ? 0 : target, ctx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(55 + speed * 0.16, ctx.currentTime, 0.08);
    },
    // The siren, on while the heat is 1 star or more.
    siren(on) {
      if (!ensure()) return;
      sirenOn = on;
      sirenGain.gain.setTargetAtTime(on && !muted ? 0.035 : 0, ctx.currentTime, 0.1);
      if (on) {
        const t = ctx.currentTime;
        sirenOsc.frequency.setValueAtTime(660, t);
        sirenOsc.frequency.linearRampToValueAtTime(880, t + 0.45);
        sirenOsc.frequency.linearRampToValueAtTime(660, t + 0.9);
      }
    },
    isSirenOn: () => sirenOn,
    gunshot() { blip(220, 0.12, 'square', 0.22, 60); },
    pickup() { blip(880, 0.12, 'sine', 0.2, 1320); },
    cash() { blip(660, 0.1, 'sine', 0.18, 990); blip(990, 0.16, 'sine', 0.18, 1320); },
    crash() { blip(90, 0.3, 'sawtooth', 0.25, 40); },
    busted() { blip(440, 0.4, 'sawtooth', 0.2, 220); },
    missionDone() {
      blip(523, 0.14, 'sine', 0.2);
      setTimeout(() => blip(659, 0.14, 'sine', 0.2), 130);
      setTimeout(() => blip(784, 0.24, 'sine', 0.22), 260);
    },
  };
}
