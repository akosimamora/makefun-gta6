// Everything the player sees: the city, the chase, the HUD and the minimap.
import { WORLD_W, WORLD_H, VIEW_W, VIEW_H } from './config.js';
import { districtAt } from './city.js';

function drawCar(ctx, x, y, angle, color, police) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = police ? '#14142a' : color;
  ctx.fillRect(-16, -9, 32, 18);
  ctx.fillStyle = police ? '#e8e8f0' : 'rgba(255,255,255,0.35)';
  ctx.fillRect(-6, -8, 12, 16);
  if (police) {
    ctx.fillStyle = '#ff2d2d';
    ctx.fillRect(-14, -9, 6, 4);
    ctx.fillStyle = '#2d7dff';
    ctx.fillRect(8, -9, 6, 4);
  }
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
  ctx.fillStyle = '#222';
  ctx.fillRect(4, -2, 8, 4);
  ctx.restore();
}

export function render(ctx, world, city, missions, view, save) {
  const p = world.player;
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Ground: district tint + beach strip on the west edge.
  for (const d of city.districts) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(d.x - view.x, d.y - view.y, d.w, d.h);
  }
  ctx.fillStyle = '#e8d8a8';
  ctx.fillRect(0 - view.x, 0 - view.y, 60, WORLD_H);
  ctx.fillStyle = '#3f7ea6';
  ctx.fillRect(-140 - view.x, 0 - view.y, 140, WORLD_H);

  // Roads.
  ctx.fillStyle = '#2b2f36';
  for (const r of city.roads) ctx.fillRect(r.x - view.x, r.y - view.y, r.w, r.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 16]);
  for (const r of city.roads) {
    ctx.beginPath();
    if (r.vertical) { ctx.moveTo(r.x + 17 - view.x, r.y - view.y); ctx.lineTo(r.x + 17 - view.x, r.y + r.h - view.y); }
    else { ctx.moveTo(r.x - view.x, r.y + 17 - view.y); ctx.lineTo(r.x + r.w - view.x, r.y + 17 - view.y); }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Buildings and landmarks.
  for (const b of city.buildings) {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - view.x, b.y - view.y, b.w, b.h);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x - view.x, b.y - view.y + b.h - 8, b.w, 8);
    if (b.tall) {
      ctx.fillStyle = 'rgba(255,255,200,0.5)';
      for (let wy = b.y + 12; wy < b.y + b.h - 12; wy += 22) {
        for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += 20) ctx.fillRect(wx - view.x, wy - view.y, 8, 10);
      }
    }
  }
  for (const lm of city.landmarks) {
    ctx.fillStyle = lm.color;
    ctx.fillRect(lm.x - view.x, lm.y - view.y, lm.w, lm.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(lm.name, lm.x - view.x + 4, lm.y - view.y - 6);
  }

  // Mission beacon.
  const m = missions.current();
  if (m) {
    const t = m.target;
    const pulse = 1 + Math.sin(world.time * 4) * 0.15;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(t.x - view.x, t.y - view.y, 46 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(t.x - view.x, t.y - view.y - 60);
    ctx.lineTo(t.x - view.x - 10, t.y - view.y - 38);
    ctx.lineTo(t.x - view.x + 10, t.y - view.y - 38);
    ctx.closePath();
    ctx.fill();
  }

  // Pedestrians, traffic, police.
  for (const pd of world.peds) drawPerson(ctx, pd.x - view.x, pd.y - view.y, pd.color, pd.angle);
  for (const c of world.cars) drawCar(ctx, c.x - view.x, c.y - view.y, c.angle, c.color, false);
  for (const cop of world.cops) drawPerson(ctx, cop.x - view.x, cop.y - view.y, '#14142a', cop.angle);
  for (const cc of world.copCars) drawCar(ctx, cc.x - view.x, cc.y - view.y, cc.angle, cc.color, true);

  // Player.
  if (p.onFoot) {
    drawPerson(ctx, p.x - view.x, p.y - view.y, '#e8b13c', p.angle);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x - view.x, p.y - view.y);
    ctx.lineTo(p.x - view.x + Math.cos(p.aim) * 30, p.y - view.y + Math.sin(p.aim) * 30);
    ctx.stroke();
  }
  // Bullets.
  ctx.fillStyle = '#ffe14d';
  for (const s of world.shots) {
    ctx.beginPath();
    ctx.arc(s.x - view.x, s.y - view.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Helicopter + spotlight.
  if (world.heli.active) {
    const hx = world.heli.x - view.x, hy = world.heli.y - view.y;
    const grad = ctx.createRadialGradient(hx, hy, 10, hx, hy, 260);
    grad.addColorStop(0, 'rgba(255,255,180,0.28)');
    grad.addColorStop(1, 'rgba(255,255,180,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(hx, hy, 260, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(hx, hy, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#666';
    ctx.fillRect(hx - 20, hy - 3, 40, 6);
  }

  drawHud(ctx, world, city, missions, save);
  drawMinimap(ctx, world, city, missions, view);
}

function drawHud(ctx, world, city, missions, save) {
  const p = world.player;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(12, 12, 300, 86);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`$${p.cash.toLocaleString()}`, 24, 40);
  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  ctx.fillText(`HP ${Math.ceil(p.hp)}   Ammo ${p.ammo}/12`, 24, 62);
  const m = missions.current();
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(m ? `JOB ${m.num}/${m.total}: ${m.name} — $${m.payout}` : 'ALL JOBS DONE', 24, 84);

  // Wanted stars.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(VIEW_W - 190, 12, 178, 40);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < p.wanted ? '#ff2d2d' : 'rgba(255,255,255,0.25)';
    ctx.font = '26px sans-serif';
    ctx.fillText('★', VIEW_W - 178 + i * 34, 42);
  }

  // Car panel.
  if (!p.onFoot && p.car) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(VIEW_W - 190, 60, 178, 52);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('CAR', VIEW_W - 178, 82);
    const kmh = Math.round(Math.abs(p.speed) * 0.45);
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`${kmh} km/h`, VIEW_W - 178, 106);
  }

  // District + save line.
  const here = districtAt(city, p.x, p.y).name;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(12, VIEW_H - 34, 360, 24);
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.fillText(`${here}   •   Best cash $${(save.bestCash || 0).toLocaleString()} · Jobs done ${save.jobsDone}/4`, 20, VIEW_H - 17);
}

function drawMinimap(ctx, world, city, missions, view) {
  const S = 150;
  const x0 = VIEW_W - S - 14, y0 = VIEW_H - S - 14;
  const sx = S / WORLD_W, sy = S / WORLD_H;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x0 - 4, y0 - 4, S + 8, S + 8);
  for (const d of city.districts) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(x0 + d.x * sx, y0 + d.y * sy, d.w * sx, d.h * sy);
  }
  ctx.fillStyle = '#2b2f36';
  for (const r of city.roads) ctx.fillRect(x0 + r.x * sx, y0 + r.y * sy, Math.max(1, r.w * sx), Math.max(1, r.h * sy));
  // Gold REP: districts whose jobs are done glow gold.
  const doneCount = missions.jobsDone();
  ctx.fillStyle = '#ffd700';
  for (let i = 0; i < doneCount && i < city.districts.length; i++) {
    const d = city.districts[i];
    ctx.globalAlpha = 0.55;
    ctx.fillRect(x0 + d.x * sx, y0 + d.y * sy, d.w * sx, d.h * sy);
    ctx.globalAlpha = 1;
  }
  const m = missions.current();
  if (m) {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(x0 + m.target.x * sx, y0 + m.target.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ff2d2d';
  for (const cc of world.copCars) {
    ctx.beginPath();
    ctx.arc(x0 + cc.x * sx, y0 + cc.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Viewport frame.
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + view.x * sx, y0 + view.y * sy, VIEW_W * sx, VIEW_H * sy);
  // Player dot.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x0 + world.player.x * sx, y0 + world.player.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
}
