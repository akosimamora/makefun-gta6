// Tiny WebAudio synth: no audio files, every sound is built from
// oscillators and noise at runtime. Created lazily on first user gesture
// (browsers block audio before that).
let ctx = null;
let master = null;
let muted = false;

function ensure() {
  if (ctx) return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.25;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.5, slideTo = null) {
  if (muted) return;
  const c = ensure();
  if (!c || !master) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo !== null) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), c.currentTime + dur);
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g);
  g.connect(master);
  o.start();
  o.stop(c.currentTime + dur);
}

function noise(dur, vol = 0.4, lowpass = 1200) {
  if (muted) return;
  const c = ensure();
  if (!c || !master) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lowpass;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start();
}

export const sfx = {
  unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
  shoot() { noise(0.12, 0.5, 2600); tone(180, 0.08, 'square', 0.25, 60); },
  reload() { tone(520, 0.07, 'triangle', 0.3); setTimeout(() => tone(760, 0.07, 'triangle', 0.3), 90); },
  pickup() { tone(660, 0.09, 'sine', 0.4); setTimeout(() => tone(990, 0.14, 'sine', 0.4), 90); },
  steal() { tone(300, 0.1, 'sawtooth', 0.3, 520); },
  crash() { noise(0.25, 0.55, 700); },
  siren() { tone(720, 0.35, 'sine', 0.14, 980); },
  mission() { tone(523, 0.12, 'sine', 0.4); setTimeout(() => tone(659, 0.12, 'sine', 0.4), 120); setTimeout(() => tone(784, 0.22, 'sine', 0.4), 240); },
  busted() { tone(392, 0.25, 'sawtooth', 0.3, 196); },
  toggleMute() { muted = !muted; return muted; },
  get isMuted() { return muted; },
};
