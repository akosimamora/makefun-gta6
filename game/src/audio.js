// Tiny WebAudio synth: no audio files, every sound is an oscillator
// shaped in code. Silent until the first user gesture (browsers block
// audio before interaction), and safe to call before init.
let ctx = null;
let master = null;
let sirenTimer = null;

function ensure() {
  if (ctx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
    return true;
  } catch (err) {
    return false;
  }
}

function tone(freq, dur, type = 'sine', vol = 1, slideTo = null) {
  if (!ensure() || ctx.state === 'suspended') return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur, vol = 1, lowpass = 1200) {
  if (!ensure() || ctx.state === 'suspended') return;
  const t0 = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t0);
}

export const sound = {
  // Call from any user gesture (start button, key press) to unlock audio.
  unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume();
  },
  shoot() { noise(0.12, 0.9, 3000); tone(180, 0.08, 'square', 0.5, 60); },
  hit() { tone(140, 0.1, 'sawtooth', 0.5, 70); },
  pickup() { tone(660, 0.09, 'sine', 0.6); tone(990, 0.14, 'sine', 0.6); },
  crash() { noise(0.25, 0.8, 700); },
  door() { tone(220, 0.07, 'triangle', 0.5, 160); },
  mission() { tone(523, 0.12, 'sine', 0.6); tone(659, 0.12, 'sine', 0.6); tone(784, 0.2, 'sine', 0.6); },
  busted() { tone(392, 0.25, 'sawtooth', 0.5, 196); tone(311, 0.4, 'sawtooth', 0.5, 155); },
  siren(on) {
    if (on && !sirenTimer) {
      let hi = false;
      sirenTimer = setInterval(() => {
        tone(hi ? 950 : 700, 0.28, 'sine', 0.22);
        hi = !hi;
      }, 300);
    } else if (!on && sirenTimer) {
      clearInterval(sirenTimer);
      sirenTimer = null;
    }
  },
  engine(on) {
    // Engine hum is a low sawtooth loop driven by the render loop's
    // speed; here we just blip it — the loop calls engineTick.
    if (on) tone(55, 0.1, 'sawtooth', 0.12, 90);
  },
};
