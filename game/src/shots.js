// Deterministic scene setups for the four screenshots. Each one puts the
// player, the police and the mission into a fixed, readable state.
window.SOL = window.SOL || {};
SOL.stageShot = function (w, name) {
  const p = w.player, cfg = w.cfg;
  w.mode = 'playing';
  w.messageMs = 0; w.mess = 0;
  // Clear roaming cops; each scene places its own.
  w.cops.length = 0;
  if (name === 'chase') {
    // Cover: red car mid-chase at an intersection, heli overhead, 3 stars.
    p.onFoot = false; p.carId = 0; p.speed = 168; p.angle = Math.PI / 2;
    p.x = 1200; p.y = 1200; p.wanted = 3; p.hp = 100; p.ammo = 12;
    const car = w.cars[0];
    car.traffic = false; car.parked = false; car.color = '#c0392b';
    car.x = p.x; car.y = p.y; car.angle = p.angle; car.speed = p.speed; car.hp = 88;
    w.cars[1].traffic = false; w.cars[1].x = 1200; w.cars[1].y = 1060; w.cars[1].angle = Math.PI / 2; w.cars[1].color = '#0f172a';
    w.cars[2].traffic = false; w.cars[2].x = 1140; w.cars[2].y = 1330; w.cars[2].angle = Math.PI / 2; w.cars[2].color = '#0f172a';
    w.cops.push({ x: 1200, y: 1060, angle: Math.PI / 2, speed: 0, hp: 100, car: true });
    w.cops.push({ x: 1140, y: 1330, angle: Math.PI / 2, speed: 0, hp: 100, car: true });
    w.heli.active = true; w.heli.x = 1200; w.heli.y = 1150;
    w.missionIndex = 3;
    w.cam.x = p.x; w.cam.y = p.y;
  } else if (name === 'city') {
    // On foot in Palmera Heights, traffic and pedestrians around.
    p.onFoot = true; p.carId = -1; p.speed = 0; p.angle = -Math.PI / 2;
    p.x = 600; p.y = 900; p.wanted = 0; p.hp = 100; p.ammo = 12;
    w.heli.active = false;
    w.missionIndex = 0;
    w.cam.x = p.x; w.cam.y = p.y;
  } else if (name === 'heist') {
    // At the Golden Palm vault marker, two foot cops closing in, 2 stars.
    p.onFoot = true; p.carId = -1; p.speed = 0; p.angle = Math.PI / 2;
    p.x = 1000; p.y = 1650; p.wanted = 2; p.hp = 88; p.ammo = 10;
    w.heli.active = false;
    w.cops.push({ x: 880, y: 1560, angle: 0.6, speed: 0, hp: 100, car: false });
    w.cops.push({ x: 1120, y: 1540, angle: 2.4, speed: 0, hp: 100, car: false });
    w.missionIndex = 1;
    w.cam.x = p.x; w.cam.y = p.y;
  } else if (name === 'start') {
    w.mode = 'title';
  }
  return w;
};
