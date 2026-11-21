// Canvas rendering: the city, every entity, HUD, minimap, and menus.
import { CONFIG } from './config.js';
import { districtAt } from './city.js';

function star(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawWorld(ctx, world, cam, screen) {
  const city = world.city;
  const p = world.player;
  // ground: grass base; beach and water are drawn in world space below
  ctx.fillStyle = '#3f7a3a';
  ctx.fillRect(cam.x, cam.y, CONFIG.viewW, CONFIG.viewH);
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  ctx.fillStyle = '#e8d28a';
  ctx.fillRect(90, 0, 110, CONFIG.worldH);
  ctx.fillStyle = '#2a7ab8';
  ctx.fillRect(0, 0, 90, CONFIG.worldH);
  ctx.fillStyle = '#7ec8f0';
  for (let y = 40; y < CONFIG.worldH; y += 160) {
    ctx.fillRect(18, y, 54, 8);
  }
  // districts
  for (const d of CONFIG.districts) {
    ctx.fillStyle = d.tint;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.globalAlpha = 1;
  }
  // plaza
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(city.plaza.x, city.plaza.y, city.plaza.w, city.plaza.h);
  // roads
  ctx.fillStyle = '#333333';
  for (const r of city.roads) {
    if (r.vertical) ctx.fillRect(r.x1 - 42, 0, 84, CONFIG.worldH);
    else ctx.fillRect(0, r.y1 - 42, CONFIG.worldW, 84);
  }
  ctx.strokeStyle = '#e8c832';
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 22]);
  for (const r of city.roads) {
    ctx.beginPath();
    ctx.moveTo(r.x1, r.y1);
    ctx.lineTo(r.x2, r.y2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // buildings
  for (const b of city.buildings) {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, 10);
    if (b.landmark) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.landmark, b.x + b.w / 2, b.y + b.h / 2);
    }
  }
  // mission marker
  if (world.mission) {
    const t = world.mission.target;
    const pulse = 26 + Math.sin(world.time * 5) * 6;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // pedestrians
  for (const pd of world.peds) {
    ctx.fillStyle = pd.color;
    ctx.beginPath();
    ctx.arc(pd.x, pd.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // parked + traffic cars
  const drawCar = (c, w, h) => {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);
    ctx.fillStyle = c.color;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = '#1c2733';
    ctx.fillRect(-w * 0.18, -h / 2 + 3, w * 0.36, h - 6);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(w / 2 - 4, -h / 2 + 4, 4, 6);
    ctx.fillRect(w / 2 - 4, h / 2 - 10, 4, 6);
    ctx.restore();
  };
  for (const c of world.cars) drawCar(c, 52, 26);
  for (const t of world.traffic) drawCar(t, 52, 26);
  // cops
  for (const c of world.cops) {
    if (c.kind === 'foot') {
      ctx.fillStyle = '#1f3a93';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PD', c.x, c.y + 3);
    } else {
      drawCar(c, 56, 28);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('POLICE', c.x, c.y - 20);
    }
  }
  // bullets
  ctx.fillStyle = '#ffe95e';
  for (const b of world.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // player
  if (p.onFoot) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(8, -3, 16, 6);
    ctx.restore();
  }
  // helicopter + spotlight
  if (world.heli.active) {
    const h = world.heli;
    ctx.fillStyle = 'rgba(255, 255, 180, 0.16)';
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    ctx.lineTo(p.x - 60, p.y - 60);
    ctx.lineTo(p.x + 60, p.y + 60);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(h.x, h.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(h.x - 26, h.y);
    ctx.lineTo(h.x + 26, h.y);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HELI', h.x, h.y - 24);
  }
  ctx.restore();
  drawHud(ctx, world, screen);
  drawMinimap(ctx, world);
}

function drawHud(ctx, world, screen) {
  const p = world.player;
  ctx.textAlign = 'left';
  // top-left: cash + district
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(12, 12, 250, 64);
  ctx.fillStyle = world.cashFlash > 0 ? '#7CFC00' : '#7CFC00';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`$${world.save.cash.toLocaleString()}`, 24, 44);
  const d = districtAt(p.x, p.y);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.fillText(d.name, 24, 66);
  // top-right: wanted stars
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(CONFIG.viewW - 218, 12, 206, 48);
  for (let i = 0; i < CONFIG.maxWanted; i++) {
    star(ctx, CONFIG.viewW - 192 + i * 38, 36, 13, i < world.wanted ? '#ff2e2e' : '#555');
  }
  // bottom-left: HP + ammo
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(12, CONFIG.viewH - 76, 250, 64);
  ctx.fillStyle = '#ff5a5a';
  ctx.fillRect(24, CONFIG.viewH - 62, 150 * Math.max(0, p.hp / 100), 16);
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(24, CONFIG.viewH - 62, 150, 16);
  ctx.fillStyle = '#fff';
  ctx.font = '15px sans-serif';
  ctx.fillText(`HP ${Math.max(0, Math.ceil(p.hp))}`, 182, CONFIG.viewH - 48);
  ctx.fillText(`AMMO ${p.ammo}/${CONFIG.pistolAmmo}  [R] reload`, 24, CONFIG.viewH - 24);
  // mission objective
  if (world.mission) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const w = 430;
    ctx.fillRect((CONFIG.viewW - w) / 2, 12, w, 52);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${world.mission.title} — $${world.mission.payout.toLocaleString()}`, CONFIG.viewW / 2, 34);
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    ctx.fillText(world.mission.text, CONFIG.viewW / 2, 54);
    ctx.textAlign = 'left';
  }
  // message line
  if (world.messageTimer > 0 && world.message) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(12, CONFIG.viewH - 120, 640, 34);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '15px sans-serif';
    ctx.fillText(world.message.slice(0, 90), 24, CONFIG.viewH - 97);
  }
  // CAR panel
  if (!p.onFoot && p.car) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(CONFIG.viewW - 218, CONFIG.viewH - 76, 206, 64);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('CAR', CONFIG.viewW - 206, CONFIG.viewH - 50);
    ctx.font = '16px sans-serif';
    ctx.fillText(`${Math.round(p.speed)} km/h`, CONFIG.viewW - 206, CONFIG.viewH - 26);
    ctx.fillText('[E] exit', CONFIG.viewW - 120, CONFIG.viewH - 26);
  }
  // screen overlays
  if (screen === 'start') {
    ctx.fillStyle = 'rgba(10,10,24,0.72)';
    ctx.fillRect(0, 0, CONFIG.viewW, CONFIG.viewH);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 84px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SOLMARA', CONFIG.viewW / 2, 220);
    ctx.fillStyle = '#ffd700';
    ctx.font = '22px sans-serif';
    ctx.fillText('A sun-soaked crime story — Mara Voss vs Elias Kross', CONFIG.viewW / 2, 262);
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.fillText('WASD move · E steal / exit car · Click / Space shoot · R reload', CONFIG.viewW / 2, 330);
    ctx.fillText('4 jobs. 5 districts. Wanted 0–5 stars. Lose the cops, keep the cash.', CONFIG.viewW / 2, 360);
    ctx.fillStyle = '#7CFC00';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`Best cash $${world.save.cash.toLocaleString()} · Jobs done ${world.save.jobsDone}/4`, CONFIG.viewW / 2, 410);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('PRESS ENTER TO START', CONFIG.viewW / 2, 480);
    ctx.textAlign = 'left';
  } else if (screen === 'paused') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CONFIG.viewW, CONFIG.viewH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', CONFIG.viewW / 2, 360);
    ctx.font = '20px sans-serif';
    ctx.fillText('Press P to resume', CONFIG.viewW / 2, 400);
    ctx.textAlign = 'left';
  } else if (screen === 'busted') {
    ctx.fillStyle = 'rgba(20,0,40,0.7)';
    ctx.fillRect(0, 0, CONFIG.viewW, CONFIG.viewH);
    ctx.fillStyle = '#c9a0ff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BUSTED', CONFIG.viewW / 2, 340);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('The cops got you. Press Enter to try again.', CONFIG.viewW / 2, 390);
    ctx.textAlign = 'left';
  } else if (screen === 'wasted') {
    ctx.fillStyle = 'rgba(40,0,0,0.7)';
    ctx.fillRect(0, 0, CONFIG.viewW, CONFIG.viewH);
    ctx.fillStyle = '#ff5a5a';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WASTED', CONFIG.viewW / 2, 340);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('Mara went down. Press Enter to try again.', CONFIG.viewW / 2, 390);
    ctx.textAlign = 'left';
  } else if (screen === 'done') {
    ctx.fillStyle = 'rgba(0,30,10,0.72)';
    ctx.fillRect(0, 0, CONFIG.viewW, CONFIG.viewH);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SOLMARA IS YOURS', CONFIG.viewW / 2, 320);
    ctx.fillStyle = '#fff';
    ctx.font = '22px sans-serif';
    ctx.fillText(`All 4 jobs done · $${world.save.cash.toLocaleString()} banked · Best getaway ${world.save.bestGetaway || '—'}`, CONFIG.viewW / 2, 370);
    ctx.fillText('Press Enter to play again.', CONFIG.viewW / 2, 410);
    ctx.textAlign = 'left';
  }
}

function drawMinimap(ctx, world) {
  const mw = 220;
  const mh = 165;
  const mx = CONFIG.viewW - mw - 12;
  const my = 92;
  const sx = mw / CONFIG.worldW;
  const sy = mh / CONFIG.worldH;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  for (const d of CONFIG.districts) {
    const gold = world.save.rep[d.id];
    ctx.fillStyle = gold ? '#ffd700' : d.tint;
    ctx.fillRect(mx + d.x * sx, my + d.y * sy, d.w * sx, d.h * sy);
  }
  ctx.fillStyle = '#333';
  for (const r of world.city.roads) {
    if (r.vertical) ctx.fillRect(mx + r.x1 * sx - 1, my, 2, mh);
    else ctx.fillRect(mx, my + r.y1 * sy - 1, mw, 2);
  }
  if (world.mission) {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(mx + world.mission.target.x * sx, my + world.mission.target.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const c of world.cops) {
    ctx.fillStyle = '#ff2e2e';
    ctx.fillRect(mx + c.x * sx - 2, my + c.y * sy - 2, 4, 4);
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(mx + world.player.x * sx, my + world.player.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(mx + world.player.x * sx - 5, my + world.player.y * sy - 5, 10, 10);
}
