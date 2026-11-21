// Boot + loop: canvas, state machine, mouse-to-world aiming, the shot hook
// the screenshot script calls, and the per-frame update/render.
window.SOL = window.SOL || {};
SOL.boot = function () {
  const cfg = SOL.config;
  const canvas = document.getElementById('game');
  canvas.width = cfg.viewW; canvas.height = cfg.viewH;
  const ctx = canvas.getContext('2d');
  const world = SOL.createWorld(cfg);
  SOL.input.attach(canvas);
  // Screenshot hook: ?shot=chase|city|heist|start stages a fixed scene.
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  let last = performance.now();
  function mouseWorld() {
    const camX = SOL.clamp(world.cam.x - cfg.viewW / 2, 0, cfg.worldW - cfg.viewW);
    const camY = SOL.clamp(world.cam.y - cfg.viewH / 2, 0, cfg.worldH - cfg.viewH);
    return { x: camX + SOL.input.mouse.x, y: camY + SOL.input.mouse.y };
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const input = SOL.input;
    if (world.mode === 'title' && (input.hit('Enter') || input.click())) {
      world.mode = 'playing';
      world.message = 'Job 1: Wheels — steal a car, reach the Marina pickup';
      world.messageMs = 3400;
      SOL.audio.ensure();
    } else if (world.mode === 'playing' && input.hit('KeyP')) {
      world.mode = 'paused';
    } else if (world.mode === 'paused' && input.hit('KeyP')) {
      world.mode = 'playing';
    } else if ((world.mode === 'busted' || world.mode === 'wasted' || world.mode === 'done') && input.hit('Enter')) {
      const fresh = SOL.createWorld(cfg);
      fresh.best = world.best;
      Object.assign(world, fresh);
      world.mode = 'playing';
    }
    SOL.updateWorld(world, dt, input, mouseWorld());
    SOL.render(ctx, world);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  if (shot) {
    SOL.stageShot(world, shot);
    if (shot !== 'start') world.mode = 'playing';
    // Frozen scene: paint without simulating, so the staged cops, heli and
    // car never move and the chase can never turn into a bust.
    const paint = () => {
      SOL.render(ctx, world);
      window.__solmaraReady = true;
    };
    requestAnimationFrame(paint);
    (function keepPainting() {
      SOL.render(ctx, world);
      requestAnimationFrame(keepPainting);
    })();
  } else {
    requestAnimationFrame(frame);
  }
  window.__solmara = world;
  return world;
};
document.addEventListener('DOMContentLoaded', () => SOL.boot());
