// Rendering: top-down camera that follows the player, the city,
// cars, people, police and helicopter, then the HUD (health, wanted
// stars, cash, ammo, objective, speed), a live minimap, and the
// start / pause / busted / wasted / done screens.
import { WORLD_W, WORLD_H, ROAD_W, ROAD_X, ROAD_Y, COLORS, CAR_MAX_SPEED } from './config.js';
import { starsFromHeat } from './world.js';
import { currentMission } from './missions.js';

const VIEW_W = 1280;
const VIEW_H = 720;

function drawCar(ctx, x, y, angle, color, isPlayer, isPolice) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#111';
  ctx.fillRect(-16, -9, 32, 18);
  ctx.fillStyle = color;
  ctx.fillRect(-15, -8, 30, 16);
  ctx.fillStyle = 'rgba(180,220,255,0.85)';
  ctx.fillRect(2, -7, 7, 14);
  ctx.fillStyle = '#111';
  ctx.fillRect(-13, -9, 5, 3);
  ctx.fillRect(-13, 6, 5, 3);
  ctx.fillRect(8, -9, 5, 3);
  ctx.fillRect(8, 6, 5, 3);
  if (isPolice) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-6, -8, 12, 4);
    ctx.fillStyle = '#e53e3e';
    ctx.fillRect(-6, -8, 6, 4);
    ctx.fillStyle = '#2b6cb0';
    ctx.fillRect(0, -8, 6, 4);
  }
  if (isPlayer) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-17, -10, 34, 20);
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a202c';
  ctx.beginPath();
  ctx.arc(4, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function render(ctx, view) {
  const { world, city, screen, missionState, save, cam } = view;
  const p = world.player;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  // --- Camera: follow the player, clamped to the city.
  cam.x = Math.max(VIEW_W / 2, Math.min(WORLD_W - VIEW_W / 2, p.x));
  cam.y = Math.max(VIEW_H / 2, Math.min(WORLD_H - VIEW_H / 2, p.y));
  const ox = cam.x - VIEW_W / 2;
  const oy = cam.y - VIEW_H / 2;

  // --- Ground.
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Marina water strip on the east edge.
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(3040 - ox, 0, 160, VIEW_H);

  // --- Roads.
  ctx.fillStyle = COLORS.road;
  for (const rx of ROAD_X) ctx.fillRect(rx - ROAD_W / 2 - ox, -oy, ROAD_W, WORLD_H);
  for (const ry of ROAD_Y) ctx.fillRect(-ox, ry - ROAD_W / 2 - oy, WORLD_W, ROAD_W);
  ctx.strokeStyle = COLORS.roadLine;
  ctx.lineWidth = 3;
  ctx.setLineDash([24, 20]);
  ctx.beginPath();
  for (const rx of ROAD_X) { ctx.moveTo(rx - ox, -oy); ctx.lineTo(rx - ox, WORLD_H - oy); }
  for (const ry of ROAD_Y) { ctx.moveTo(-ox, ry - oy); ctx.lineTo(WORLD_W - ox, ry - oy); }
  ctx.stroke();
  ctx.setLineDash([]);

  // --- District tint + labels.
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const d of city.districts || []) {
    ctx.fillStyle = d.color + '22';
    ctx.fillRect(d.x - ox, d.y - oy, d.w, d.h);
  }

  // --- Buildings.
  for (const b of city.buildings) {
    ctx.fillStyle = b.landmark ? '#6b4fa1' : COLORS.building;
    ctx.fillRect(b.x - ox, b.y - oy, b.w, b.h);
    ctx.fillStyle = COLORS.buildingRoof;
    ctx.fillRect(b.x + 6 - ox, b.y + 6 - oy, b.w - 12, b.h - 12);
    if (b.landmark) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.name, b.x + b.w / 2 - ox, b.y + b.h / 2 + 7 - oy);
    }
  }

  // --- Mission anchor: pulsing marker + light pillar.
  const mission = currentMission(missionState);
  if (mission && screen === 'playing') {
    const a = city.anchors[mission.anchor];
    const pulse = 1 + Math.sin(world.time * 4) * 0.15;
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#f6e05e';
    ctx.fillRect(a.x - 14 - ox, a.y - 400 - oy, 28, 400);
    ctx.restore();
    ctx.save();
    ctx.translate(a.x - ox, a.y - oy);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = '#f6e05e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f6e05e';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#f6e05e';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(a.name, a.x - ox, a.y - 52 - oy);
  }

  // --- Pedestrians.
  for (const ped of world.peds) {
    drawPerson(ctx, ped.x - ox, ped.y - oy, ped.angle, COLORS.ped);
  }

  // --- Cars (traffic, police, player).
  for (const car of world.cars) {
    drawCar(ctx, car.x - ox, car.y - oy, car.angle, car.color, car.kind === 'player', car.kind === 'police');
  }

  // --- Foot cops.
  for (const cop of world.cops) {
    drawPerson(ctx, cop.x - ox, cop.y - oy, cop.angle, '#2b6cb0');
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', cop.x - ox, cop.y - 14 - oy);
  }

  // --- Bullets.
  ctx.fillStyle = '#f6e05e';
  for (const b of world.bullets) {
    ctx.beginPath();
    ctx.arc(b.x - ox, b.y - oy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Particles.
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x - ox, pt.y - oy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // --- Helicopter + spotlight.
  if (world.heli.active) {
    const hx = world.heli.x - ox;
    const hy = world.heli.y - oy;
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#fefcbf';
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.arc(p.x - ox, p.y - oy, 120, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(world.heli.angle);
    ctx.fillStyle = COLORS.heli;
    ctx.fillRect(-22, -8, 44, 16);
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(-8, -26, 16, 52);
    ctx.fillStyle = '#e53e3e';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HELI', hx, hy - 32);
  }

  // --- Player on foot.
  if (!p.inCar) {
    drawPerson(ctx, p.x - ox, p.y - oy, p.angle, COLORS.player);
    // Aim line.
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x - ox, p.y - oy);
    ctx.lineTo(p.x + Math.cos(p.aimAngle || 0) * 46 - ox, p.y + Math.sin(p.aimAngle || 0) * 46 - oy);
    ctx.stroke();
  }

  // --- "E to steal" prompt.
  if (!p.inCar && screen === 'playing') {
    const near = world.cars.find((c) => c.kind === 'traffic' && Math.hypot(c.x - p.x, c.y - p.y) < 70);
    if (near) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(p.x - 70 - ox, p.y - 52 - oy, 140, 26);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press E — steal car', p.x - ox, p.y - 34 - oy);
    }
  }

  drawHud(ctx, view);
  drawMinimap(ctx, view);

  if (screen === 'start') drawStart(ctx, view);
  if (screen === 'paused') drawPaused(ctx);
  if (screen === 'busted') drawEnd(ctx, 'BUSTED', 'The cops caught Mara. The run ends here — try again.', '#2b6cb0');
  if (screen === 'wasted') drawEnd(ctx, 'WASTED', 'Mara is down. The run ends here — try again.', '#e53e3e');
  if (screen === 'done') drawDone(ctx, view);
}

function drawHud(ctx, view) {
  const { world, missionState } = view;
  const p = world.player;
  const stars = starsFromHeat(world.wantedHeat);
  const mission = currentMission(missionState);

  // Top-left: wanted stars + cash.
  ctx.textAlign = 'left';
  ctx.font = 'bold 30px system-ui, sans-serif';
  let starText = '';
  for (let i = 0; i < 5; i++) starText += i < stars ? '★' : '☆';
  ctx.fillStyle = stars > 0 ? '#e53e3e' : 'rgba(255,255,255,0.55)';
  ctx.fillText(starText, 18, 44);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(`$${missionState.cash.toLocaleString()}`, 18, 76);

  // Top-center: mission objective.
  if (mission) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const label = `${mission.title}: ${mission.text}`;
    const w = ctx.measureText(label).width + 36;
    ctx.fillRect(VIEW_W / 2 - w / 2, 12, w, 34);
    ctx.fillStyle = '#f6e05e';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(label, VIEW_W / 2, 36);
  }

  // Bottom-left: health bar + ammo.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(18, VIEW_H - 64, 220, 46);
  ctx.fillStyle = '#e53e3e';
  ctx.fillRect(28, VIEW_H - 54, 140 * Math.max(0, p.hp) / 100, 14);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(28, VIEW_H - 54, 140, 14);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`HP ${Math.ceil(Math.max(0, p.hp))}`, 28, VIEW_H - 24);
  ctx.fillText(`Ammo ${p.ammo}`, 178, VIEW_H - 24);

  // Bottom-right: CAR panel when driving (speed + car health).
  if (p.inCar) {
    const car = p.inCar;
    const kmh = Math.abs(Math.round((p.speed / CAR_MAX_SPEED) * 151));
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(VIEW_W - 238, VIEW_H - 64, 220, 46);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('CAR', VIEW_W - 228, VIEW_H - 40);
    ctx.fillStyle = '#68d391';
    ctx.fillRect(VIEW_W - 178, VIEW_H - 54, 100 * Math.max(0, car.hp) / 100, 14);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(VIEW_W - 178, VIEW_H - 54, 100, 14);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${kmh} km/h`, VIEW_W - 18, VIEW_H - 24);
    ctx.textAlign = 'left';
  }
}

function drawMinimap(ctx, view) {
  const { world, city, missionState } = view;
  const p = world.player;
  const MW = 210;
  const MH = 158;
  const mx = VIEW_W - MW - 16;
  const my = 56;
  const sx = MW / WORLD_W;
  const sy = MH / WORLD_H;

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(mx - 6, my - 6, MW + 12, MH + 12);
  ctx.fillStyle = '#1d4a2f';
  ctx.fillRect(mx, my, MW, MH);
  ctx.strokeStyle = '#4a5568';
  ctx.lineWidth = 1;
  for (const rx of ROAD_X) {
    ctx.beginPath(); ctx.moveTo(mx + rx * sx, my); ctx.lineTo(mx + rx * sx, my + MH); ctx.stroke();
  }
  for (const ry of ROAD_Y) {
    ctx.beginPath(); ctx.moveTo(mx, my + ry * sy); ctx.lineTo(mx + MW, my + ry * sy); ctx.stroke();
  }
  // District REP: gold once a job there is done.
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const d of city.districts || []) {
    if (missionState.rep && missionState.rep[d.id]) {
      ctx.fillStyle = '#f6e05e';
      ctx.fillText('★', mx + (d.x + d.w / 2) * sx, my + (d.y + d.h / 2) * sy + 3);
    }
  }
  // Mission marker.
  const mission = currentMission(missionState);
  if (mission) {
    const a = city.anchors[mission.anchor];
    ctx.fillStyle = '#f6e05e';
    ctx.beginPath();
    ctx.arc(mx + a.x * sx, my + a.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police dots, then the player.
  ctx.fillStyle = '#63b3ed';
  for (const cop of world.cops) {
    ctx.fillRect(mx + cop.x * sx - 2, my + cop.y * sy - 2, 4, 4);
  }
  for (const car of world.cars) {
    if (car.kind === 'police') {
      ctx.fillStyle = '#63b3ed';
      ctx.fillRect(mx + car.x * sx - 2, my + car.y * sy - 2, 4, 4);
    }
  }
  ctx.fillStyle = '#e53e3e';
  ctx.beginPath();
  ctx.arc(mx + p.x * sx, my + p.y * sy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SOLMARA — Palmera Heights', mx - 6, my + MH + 22);
}

function drawStart(ctx, view) {
  const { save } = view;
  ctx.fillStyle = 'rgba(10,12,18,0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f6e05e';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.fillText('SOLMARA', VIEW_W / 2, 190);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('A sun-soaked open-world crime story', VIEW_W / 2, 232);
  ctx.fillStyle = '#cbd5e0';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('Mara Voss is back in Solmara — and fixer Elias Kross has four jobs for her.', VIEW_W / 2, 280);
  ctx.fillText('Steal cars, dodge the cops, run the Golden Palm vault, and get out clean.', VIEW_W / 2, 308);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('WASD move / drive  ·  E steal or enter a car  ·  Mouse aim, Click / Space shoot', VIEW_W / 2, 372);
  ctx.fillText('R reload  ·  P pause  ·  wanted stars bring foot cops, patrol cars and the heli', VIEW_W / 2, 400);
  ctx.fillStyle = '#f6e05e';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(`Best cash $${(save.bestCash || 0).toLocaleString()}  ·  Jobs done ${save.jobsDone || 0}/4`, VIEW_W / 2, 462);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px system-ui, sans-serif';
  const blink = Math.sin(Date.now() / 350) > 0 ? 1 : 0.25;
  ctx.globalAlpha = blink;
  ctx.fillText('PRESS ENTER TO START', VIEW_W / 2, 540);
  ctx.globalAlpha = 1;
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(10,12,18,0.7)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 10);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Press P to resume', VIEW_W / 2, VIEW_H / 2 + 30);
}

function drawEnd(ctx, title, sub, color) {
  ctx.fillStyle = 'rgba(10,12,18,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = 'bold 72px system-ui, sans-serif';
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 20);
  ctx.fillStyle = '#fff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText(sub, VIEW_W / 2, VIEW_H / 2 + 24);
  ctx.fillText('Press Enter to try again', VIEW_W / 2, VIEW_H / 2 + 58);
}

function drawDone(ctx, view) {
  const { missionState } = view;
  ctx.fillStyle = 'rgba(10,12,18,0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f6e05e';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('THE BIG ONE — DONE', VIEW_W / 2, 240);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(`Getaway rating: ${missionState.rating || 'CLEAN'}`, VIEW_W / 2, 300);
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText(`Cash earned: $${missionState.cash.toLocaleString()}`, VIEW_W / 2, 340);
  ctx.fillText('Mara walks away from Solmara — this time.', VIEW_W / 2, 390);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Press Enter to play again', VIEW_W / 2, 450);
}
