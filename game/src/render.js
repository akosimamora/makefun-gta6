// Everything the player sees: the city, the cars and people in it, the
// police and the helicopter, then the HUD and the live minimap on top.
// The camera is centred on the player; the canvas is 1280x720.
import { WORLD, DISTRICTS, ROADS_X, ROADS_Y, ROAD_W, COLORS, PLAYER } from './config.js';
import { missionAt } from './missions.js';

const VW = 1280;
const VH = 720;

function drawCar(ctx, x, y, angle, color, w = 46, h = 22) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#111';
  ctx.fillRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
  ctx.fillStyle = color;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = 'rgba(180,220,255,0.85)';
  ctx.fillRect(w / 2 - 12, -h / 2 + 3, 8, h - 6);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(w / 2 - 2, -h / 2 + 2, 2, 4);
  ctx.fillRect(w / 2 - 2, h / 2 - 6, 2, 4);
  ctx.restore();
}

function drawPerson(ctx, x, y, color, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c1c1c';
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();
}

export function drawWorld(ctx, world, save) {
  const cam = world.cam;
  const ox = VW / 2 - cam.x;
  const oy = VH / 2 - cam.y;
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, VW, VH);
  ctx.save();
  ctx.translate(ox, oy);
  // Water + sand on the north-east edge (the Marina coast).
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(2880, 0, WORLD.w - 2880, 700);
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(2840, 0, 40, 700);
  // District ground tints.
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.color;
    ctx.globalAlpha = 0.16;
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = d.accent;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.globalAlpha = 0.75;
    ctx.fillText(d.name.toUpperCase(), d.x + 24, d.y + 44);
    ctx.globalAlpha = 1;
  }
  // Roads.
  ctx.fillStyle = COLORS.asphalt;
  for (const rx of ROADS_X) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD.h);
  for (const ry of ROADS_Y) ctx.fillRect(0, ry - ROAD_W / 2, WORLD.w, ROAD_W);
  ctx.strokeStyle = COLORS.roadLine;
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 22]);
  ctx.beginPath();
  for (const rx of ROADS_X) { ctx.moveTo(rx, 0); ctx.lineTo(rx, WORLD.h); }
  for (const ry of ROADS_Y) { ctx.moveTo(0, ry); ctx.lineTo(WORLD.w, ry); }
  ctx.stroke();
  ctx.setLineDash([]);
  // Sidewalks.
  ctx.strokeStyle = COLORS.sidewalk;
  ctx.lineWidth = 10;
  for (const rx of ROADS_X) {
    ctx.beginPath(); ctx.moveTo(rx - ROAD_W / 2 - 5, 0); ctx.lineTo(rx - ROAD_W / 2 - 5, WORLD.h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx + ROAD_W / 2 + 5, 0); ctx.lineTo(rx + ROAD_W / 2 + 5, WORLD.h); ctx.stroke();
  }
  for (const ry of ROADS_Y) {
    ctx.beginPath(); ctx.moveTo(0, ry - ROAD_W / 2 - 5); ctx.lineTo(WORLD.w, ry - ROAD_W / 2 - 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, ry + ROAD_W / 2 + 5); ctx.lineTo(WORLD.w, ry + ROAD_W / 2 + 5); ctx.stroke();
  }
  // Buildings + landmarks.
  for (const b of world.city.buildings) {
    ctx.fillStyle = b.hue;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, 10);
    if (b.tall) {
      ctx.fillStyle = 'rgba(255,220,120,0.7)';
      for (let i = 0; i < 4; i++) ctx.fillRect(b.x + 12 + i * 18, b.y + 26, 10, 12);
    }
  }
  for (const l of world.city.landmarks) {
    ctx.fillStyle = l.color;
    ctx.fillRect(l.x - l.w / 2, l.y - l.h / 2, l.w, l.h);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(l.name, l.x, l.y + 5);
    ctx.textAlign = 'left';
  }
  // Mission target: a gold pillar of light + a marker.
  const m = missionAt(world.missionIndex);
  if (m && world.phase === 'play') {
    const pulse = 0.35 + 0.2 * Math.sin(world.time * 4);
    ctx.fillStyle = `rgba(255,215,80,${pulse})`;
    ctx.fillRect(m.target.x - 26, m.target.y - 160, 52, 160);
    ctx.fillStyle = '#ffd750';
    ctx.beginPath();
    ctx.arc(m.target.x, m.target.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', m.target.x, m.target.y + 8);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd750';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(m.targetLabel, m.target.x - 46, m.target.y - 170);
  }
  // Pedestrians.
  for (const ped of world.peds) drawPerson(ctx, ped.x, ped.y, ped.color, ped.angle);
  // Traffic + parked cars.
  for (const c of world.cars) {
    if (world.player.inCar === c) continue;
    drawCar(ctx, c.x, c.y, c.angle, c.color);
  }
  // Police.
  for (const cop of world.cops) {
    if (cop.kind === 'foot') {
      drawPerson(ctx, cop.x, cop.y, '#2f6fe0', Math.atan2(world.player.y - cop.y, world.player.x - cop.x));
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillText('PD', cop.x - 7, cop.y - 12);
    } else {
      drawCar(ctx, cop.x, cop.y, cop.angle, cop.color);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText('POLICE', cop.x - 20, cop.y - 16);
    }
  }
  // Helicopter + spotlight.
  if (world.heli) {
    const h = world.heli;
    const gx = h.x + Math.cos(h.angle) * 40;
    const gy = h.y + Math.sin(h.angle) * 40;
    const grad = ctx.createRadialGradient(world.player.x, world.player.y, 10, world.player.x, world.player.y, 190);
    grad.addColorStop(0, 'rgba(255,250,200,0.34)');
    grad.addColorStop(1, 'rgba(255,250,200,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(world.player.x, world.player.y, 190, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,250,200,0.10)';
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    ctx.lineTo(world.player.x - 70, world.player.y - 70);
    ctx.lineTo(world.player.x + 70, world.player.y + 70);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.heli;
    ctx.beginPath();
    ctx.ellipse(h.x, h.y, 26, 15, h.angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(h.x - 34, h.y);
    ctx.lineTo(h.x + 34, h.y);
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('PD HELI', h.x - 24, h.y - 22);
  }
  // Player (on foot, or the car they drive).
  const p = world.player;
  if (p.inCar) {
    drawCar(ctx, p.inCar.x, p.inCar.y, p.inCar.angle, p.inCar.color, 52, 24);
  } else {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.fillRect(6, -3, 12, 6);
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('MARA', p.x - 16, p.y - 20);
  }
  ctx.restore();
  drawHud(ctx, world, save);
}

function drawHud(ctx, world, save) {
  // The title screen stands alone: no HUD panels or minimap behind it,
  // just the dark overlay and the title text.
  if (world.phase === 'title') {
    drawTitle(ctx, save);
    return;
  }
  const p = world.player;
  const m = missionAt(world.missionIndex);
  // Top-left: title + cash + jobs.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(14, 12, 300, 64);
  ctx.fillStyle = '#ffd750';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('SOLMARA', 26, 38);
  ctx.fillStyle = '#fff';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText(`$${world.cash}  ·  Jobs done ${world.missionIndex}/4`, 26, 62);
  // Wanted stars, top-right.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(VW - 218, 12, 204, 46);
  ctx.fillStyle = world.wanted > 0 ? '#ff5a4d' : '#ffd750';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('★'.repeat(world.wanted) + '☆'.repeat(5 - world.wanted), VW - 204, 44);
  // Objective bar, bottom-left.
  if (m && world.phase === 'play') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(14, VH - 64, 560, 50);
    ctx.fillStyle = '#ffd750';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(`${m.title}: ${m.brief}`, 26, VH - 34);
  }
  // Health + ammo, bottom-right.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(VW - 218, VH - 64, 204, 50);
  ctx.fillStyle = '#fff';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText(`HP ${Math.max(0, Math.round(p.hp))}   Ammo ${p.ammo}/${PLAYER.pistolAmmo}`, VW - 204, VH - 34);
  // CAR panel (speed + car health) when driving.
  if (p.inCar) {
    const kmh = Math.round(Math.abs(p.speed) * 0.9);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(VW - 218, VH - 128, 204, 50);
    ctx.fillStyle = '#7fd4f0';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`CAR  ${kmh} km/h`, VW - 204, VH - 106);
    ctx.fillStyle = p.inCar.hp > 40 ? '#7fe07a' : '#ff5a4d';
    ctx.fillRect(VW - 204, VH - 96, 176 * Math.max(0, p.inCar.hp / 100), 8);
  }
  // Toast message.
  if (world.messageTimer > 0 && world.message) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(VW / 2 - 260, 76, 520, 40);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.message, VW / 2, 102);
    ctx.textAlign = 'left';
  }
  drawMinimap(ctx, world);
  // Screens.
  if (world.phase === 'paused') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VW / 2, VH / 2);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('Press P to keep playing', VW / 2, VH / 2 + 36);
    ctx.textAlign = 'left';
  }
  if (world.phase === 'busted' || world.phase === 'wasted') {
    ctx.fillStyle = 'rgba(20,0,0,0.72)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#ff5a4d';
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.phase === 'busted' ? 'BUSTED' : 'WASTED', VW / 2, VH / 2 - 10);
    ctx.fillStyle = '#fff';
    ctx.font = '19px system-ui, sans-serif';
    ctx.fillText('Press Enter to try again', VW / 2, VH / 2 + 34);
    ctx.textAlign = 'left';
  }
  if (world.phase === 'done') {
    ctx.fillStyle = 'rgba(0,20,0,0.72)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#ffd750';
    ctx.font = 'bold 46px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SOLMARA IS YOURS', VW / 2, VH / 2 - 20);
    ctx.fillStyle = '#fff';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(`All 4 jobs done · $${world.cash} · getaway ${world.getaway || 'CLEAN'}`, VW / 2, VH / 2 + 22);
    ctx.fillText('Press Enter to play again', VW / 2, VH / 2 + 56);
    ctx.textAlign = 'left';
  }
}

function drawMinimap(ctx, world) {
  const mw = 210;
  const mh = 158;
  const mx = VW - mw - 14;
  const my = 70;
  const sx = mw / WORLD.w;
  const sy = mh / WORLD.h;
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(mx - 6, my - 6, mw + 12, mh + 12);
  for (const d of DISTRICTS) {
    const gold = world.doneDistricts.includes(d.id);
    ctx.fillStyle = gold ? '#ffd750' : d.color;
    ctx.globalAlpha = gold ? 0.95 : 0.7;
    ctx.fillRect(mx + d.x * sx, my + d.y * sy, d.w * sx, d.h * sy);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#c8b45a';
  for (const rx of ROADS_X) ctx.fillRect(mx + rx * sx - 1, my, 2, mh);
  for (const ry of ROADS_Y) ctx.fillRect(mx, my + ry * sy - 1, mw, 2);
  const m = missionAt(world.missionIndex);
  if (m && world.phase === 'play') {
    ctx.fillStyle = '#ffd750';
    ctx.beginPath();
    ctx.arc(mx + m.target.x * sx, my + m.target.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cop of world.cops) {
    ctx.fillStyle = '#5a9dff';
    ctx.fillRect(mx + cop.x * sx - 2, my + cop.y * sy - 2, 4, 4);
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(mx + world.player.x * sx, my + world.player.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd750';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('SOLMARA', mx + 2, my - 10);
}

function drawTitle(ctx, save) {
  ctx.fillStyle = 'rgba(8,10,18,0.78)';
  ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = '#ffd750';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SOLMARA', VW / 2, 210);
  ctx.fillStyle = '#fff';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('A sun-soaked open-world crime story', VW / 2, 252);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Mara Voss takes four jobs from the fixer Elias Kross —', VW / 2, 310);
  ctx.fillText('steal cars, dodge the police, and settle the score.', VW / 2, 336);
  ctx.fillStyle = '#c9c9c9';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('WASD move / drive · E steal car · Click / Space shoot · R reload · P pause · M mute', VW / 2, 400);
  ctx.fillStyle = '#ffd750';
  ctx.font = 'bold 21px system-ui, sans-serif';
  ctx.fillText(`Best cash $${save.bestCash}  ·  Jobs done ${save.jobsDone}/4`, VW / 2, 452);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('PRESS ENTER TO START', VW / 2, 520);
  ctx.textAlign = 'left';
}
