// Drawing: the city, everything in it, the HUD, the minimap and the menus.
// It only reads the world; the simulation lives in world.js.

import {
  WORLD_W, WORLD_H, ROAD_W, ROAD_XS, ROAD_YS, DISTRICTS,
  WATER, BEACH, CAR, PLAYER, KMH, PLACES,
} from './config.js';
import { districtAt } from './city.js';
import { missionText, missionMarker } from './missions.js';
import { playerDistrict } from './world.js';

function drawStar(ctx, cx, cy, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCarShape(ctx, car, isPlayer) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const w = 44;
  const h = 22;
  if (car.wrecked) {
    ctx.fillStyle = '#2e2e2e';
    roundRect(ctx, -w / 2, -h / 2, w, h, 5);
    ctx.fill();
    ctx.fillStyle = '#555';
    ctx.fillRect(-w / 2 + 6, -h / 2 + 4, 10, 6);
    ctx.restore();
    return;
  }
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  roundRect(ctx, -w / 2 + 3, -h / 2 + 4, w, h, 6);
  ctx.fill();
  // body
  ctx.fillStyle = car.color;
  roundRect(ctx, -w / 2, -h / 2, w, h, 6);
  ctx.fill();
  // windshield + roof
  ctx.fillStyle = 'rgba(20,30,40,0.85)';
  ctx.fillRect(-w / 2 + 12, -h / 2 + 3, 9, h - 6);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(-w / 2 + 24, -h / 2 + 3, 8, h - 6);
  // wheels
  ctx.fillStyle = '#181818';
  ctx.fillRect(-w / 2 + 4, -h / 2 - 3, 9, 4);
  ctx.fillRect(-w / 2 + 4, h / 2 - 1, 9, 4);
  ctx.fillRect(w / 2 - 13, -h / 2 - 3, 9, 4);
  ctx.fillRect(w / 2 - 13, h / 2 - 1, 9, 4);
  if (car.kind === 'police') {
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(-6, -h / 2, 12, h);
    ctx.fillStyle = '#101418';
    ctx.font = 'bold 7px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.rotate(0);
    ctx.fillText('POLICE', 0, 0);
    ctx.restore();
  }
  if (isPlayer) {
    ctx.strokeStyle = '#ffd23a';
    ctx.lineWidth = 2;
    roundRect(ctx, -w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 8);
    ctx.stroke();
  }
  ctx.restore();
}

/** Draw the whole frame: world, then HUD, then any menu. */
export function render(ctx, world, viewport) {
  const vw = viewport.w;
  const vh = viewport.h;
  const camX = world.camera.x;
  const camY = world.camera.y;
  const shX = world.shake > 0 ? (Math.random() - 0.5) * world.shake : 0;
  const shY = world.shake > 0 ? (Math.random() - 0.5) * world.shake : 0;

  ctx.clearRect(0, 0, vw, vh);
  ctx.fillStyle = '#1a1d24';
  ctx.fillRect(0, 0, vw, vh);

  ctx.save();
  ctx.translate(-camX + shX, -camY + shY);

  // --- ground: districts, water, beach ---
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0);
  }
  // Subtle block checker so the ground reads as streets, not flat colour.
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let x = 200; x < WORLD_W; x += 800) {
    for (let y = 200; y < WORLD_H; y += 800) {
      ctx.fillRect(x, y, 344, 344);
    }
  }
  ctx.fillStyle = '#2f7fae';
  ctx.fillRect(WATER.x0, 0, WATER.x1 - WATER.x0, WORLD_H);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(WATER.x0 + 60, 0, 26, WORLD_H);
  ctx.fillStyle = '#e8d9a8';
  ctx.fillRect(BEACH.x0, 0, BEACH.x1 - BEACH.x0, WORLD_H);

  // --- roads: asphalt, then dashed centrelines in view ---
  ctx.fillStyle = '#33333c';
  for (const rx of ROAD_XS) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD_H);
  for (const ry of ROAD_YS) ctx.fillRect(0, ry - ROAD_W / 2, WORLD_W, ROAD_W);
  ctx.fillStyle = '#c8a93a';
  const vx0 = camX - 40;
  const vx1 = camX + vw + 40;
  const vy0 = camY - 40;
  const vy1 = camY + vh + 40;
  for (const rx of ROAD_XS) {
    if (rx < vx0 || rx > vx1) continue;
    for (let y = Math.max(0, Math.floor(vy0 / 44) * 44); y < Math.min(WORLD_H, vy1); y += 44) {
      ctx.fillRect(rx - 2, y, 4, 22);
    }
  }
  for (const ry of ROAD_YS) {
    if (ry < vy0 || ry > vy1) continue;
    for (let x = Math.max(0, Math.floor(vx0 / 44) * 44); x < Math.min(WORLD_W, vx1); x += 44) {
      ctx.fillRect(x, ry - 2, 22, 4);
    }
  }

  // --- boats in the bay ---
  for (const b of world.city.boats) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, b.len / 2, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f5a7a';
    ctx.fillRect(-6, -3, 12, 6);
    ctx.restore();
  }

  // --- buildings: shadow, body, and a name for landmarks ---
  for (const b of world.city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(b.x, b.y, b.w, 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w, b.h);
    if (b.name) {
      ctx.fillStyle = 'rgba(20,20,24,0.75)';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(b.name).width + 12;
      ctx.fillRect(b.x + b.w / 2 - tw / 2, b.y + b.h / 2 - 11, tw, 22);
      ctx.fillStyle = '#fff';
      ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2 + 1);
    }
  }

  // --- trees and lamps ---
  for (const t of world.city.trees) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.arc(t.x + 2, t.y + 3, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(t.x - 3, t.y - 3, t.r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#3a3f46';
  for (const l of world.city.lamps) {
    ctx.fillRect(l.x - 1, l.y - 1, 3, 3);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(l.x, l.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a3f46';
  }

  // --- mission marker: a light pillar and a diamond on the ground ---
  const marker = missionMarker(world);
  if (marker) {
    const pulse = 0.5 + 0.3 * Math.sin(world.time * 3);
    ctx.fillStyle = `rgba(255,210,58,${0.10 + pulse * 0.10})`;
    ctx.fillRect(marker.x - 16, marker.y - 260, 32, 260);
    ctx.fillStyle = '#ffd23a';
    ctx.save();
    ctx.translate(marker.x, marker.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-9, -9, 18, 18);
    ctx.restore();
    ctx.strokeStyle = '#7a5a00';
    ctx.lineWidth = 2;
    ctx.save();
    ctx.translate(marker.x, marker.y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeRect(-9, -9, 18, 18);
    ctx.restore();
  }

  // --- pedestrians, cops, guards ---
  for (const ped of world.peds) {
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.arc(ped.x, ped.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(ped.x + Math.cos(ped.angle) * 5, ped.y + Math.sin(ped.angle) * 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cop of world.cops) {
    ctx.fillStyle = '#2e5aa8';
    ctx.beginPath();
    ctx.arc(cop.x, cop.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f2a5a';
    ctx.beginPath();
    ctx.arc(cop.x, cop.y - 3, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd23a';
    ctx.fillRect(cop.x - 7, cop.y + 6, 14, 3);
  }
  for (const g of world.guards) {
    ctx.fillStyle = '#7a1f1f';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1c1c1c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.angle) * 20, g.y + Math.sin(g.angle) * 20);
    ctx.stroke();
  }

  // --- cars (traffic, police, Mara's) ---
  for (const car of world.cars) {
    drawCarShape(ctx, car, car === world.player.car);
  }

  // --- Mara on foot ---
  const p = world.player;
  if (!p.car) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(p.x + 2, p.y + 4, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d83232';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2d8a8';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1c1c1c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22);
    ctx.stroke();
  }

  // --- helicopter and its searchlight ---
  if (world.heli) {
    const h = world.heli;
    ctx.fillStyle = 'rgba(255,240,170,0.13)';
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    ctx.lineTo(p.x - 46, p.y + 30);
    ctx.lineTo(p.x + 46, p.y + 30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,240,170,0.20)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 52, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.fillStyle = '#22262e';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-30, -3, 14, 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    const rotor = world.time * 9;
    ctx.beginPath();
    ctx.moveTo(Math.cos(rotor) * 34, Math.sin(rotor) * 6);
    ctx.lineTo(-Math.cos(rotor) * 34, -Math.sin(rotor) * 6);
    ctx.stroke();
    ctx.restore();
  }

  // --- tracers and particles ---
  for (const t of world.tracers) {
    ctx.strokeStyle = `rgba(255,230,120,${t.life / t.maxLife})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(t.x1, t.y1);
    ctx.lineTo(t.x2, t.y2);
    ctx.stroke();
  }
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // ================= HUD (screen space) =================
  const repTotal = Object.values(world.rep).reduce((a, b) => a + b, 0);
  ctx.textBaseline = 'alphabetic';

  // Top-left panel: cash, REP, stars, HP, ammo, best.
  ctx.fillStyle = 'rgba(12,14,18,0.78)';
  roundRect(ctx, 12, 12, 268, 118, 8);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#7ee787';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(`$${world.cash}`, 26, 44);
  ctx.fillStyle = '#ffd23a';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`REP ${repTotal}`, 26, 68);
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, 34 + i * 24, 88, 9, i < world.wanted ? '#ff3b30' : 'rgba(255,255,255,0.25)');
  }
  ctx.fillStyle = '#e8e8e8';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('HP', 132, 68);
  ctx.fillStyle = '#2a2e36';
  ctx.fillRect(158, 56, 108, 12);
  ctx.fillStyle = p.hp > 30 ? '#7ee787' : '#ff3b30';
  ctx.fillRect(158, 56, 108 * Math.max(0, p.hp / 100), 12);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(`Ammo ${p.ammo}`, 132, 92);
  ctx.fillStyle = '#9a9a9a';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`Best $${world.bestCash}`, 132, 112);

  // Minimap, top right.
  const mmW = 216;
  const mmH = 162;
  const mmX = vw - mmW - 12;
  const mmY = 12;
  const mmS = Math.min(mmW / WORLD_W, mmH / WORLD_H);
  ctx.fillStyle = 'rgba(12,14,18,0.78)';
  roundRect(ctx, mmX - 6, mmY - 6, mmW + 12, mmH + 26, 8);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(mmX, mmY, mmW, mmH);
  ctx.clip();
  for (const d of DISTRICTS) {
    ctx.fillStyle = world.rep[d.id] ? '#d8a920' : d.ground;
    ctx.fillRect(mmX + d.x0 * mmS, mmY + d.y0 * mmS, (d.x1 - d.x0) * mmS, (d.y1 - d.y0) * mmS);
  }
  ctx.fillStyle = '#2f7fae';
  ctx.fillRect(mmX + WATER.x0 * mmS, mmY, (WATER.x1 - WATER.x0) * mmS, mmH);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  for (const rx of ROAD_XS) {
    ctx.beginPath();
    ctx.moveTo(mmX + rx * mmS, mmY);
    ctx.lineTo(mmX + rx * mmS, mmY + mmH);
    ctx.stroke();
  }
  for (const ry of ROAD_YS) {
    ctx.beginPath();
    ctx.moveTo(mmX, mmY + ry * mmS);
    ctx.lineTo(mmX + mmW, mmY + ry * mmS);
    ctx.stroke();
  }
  if (marker) {
    ctx.fillStyle = '#ffd23a';
    ctx.save();
    ctx.translate(mmX + marker.x * mmS, mmY + marker.y * mmS);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }
  for (const car of world.cars) {
    if (car.kind !== 'police' || car.wrecked) continue;
    ctx.fillStyle = '#5a9ae8';
    ctx.beginPath();
    ctx.arc(mmX + car.x * mmS, mmY + car.y * mmS, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (world.heli) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(mmX + world.heli.x * mmS, mmY + world.heli.y * mmS, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath();
  ctx.arc(mmX + p.x * mmS, mmY + p.y * mmS, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(mmX + p.x * mmS, mmY + p.y * mmS, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#e8e8e8';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  const pd = playerDistrict(world);
  ctx.fillText(`SOLMARA — ${pd.name}`, mmX - 2, mmY + mmH + 16);

  // Objective, bottom left.
  ctx.fillStyle = 'rgba(12,14,18,0.78)';
  const obj = missionText(world);
  ctx.font = 'bold 16px system-ui, sans-serif';
  const objW = ctx.measureText(obj).width + 52;
  roundRect(ctx, 12, vh - 52, objW, 36, 8);
  ctx.fill();
  ctx.fillStyle = '#ffd23a';
  ctx.fillText('◆', 26, vh - 28);
  ctx.fillStyle = '#fff';
  ctx.fillText(obj, 48, vh - 28);

  // Speed, bottom right (when driving).
  if (p.car) {
    ctx.fillStyle = 'rgba(12,14,18,0.78)';
    roundRect(ctx, vw - 190, vh - 52, 178, 36, 8);
    ctx.fill();
    ctx.fillStyle = '#7ee787';
    ctx.fillRect(vw - 178, vh - 44, 154 * Math.abs(p.car.speed) / 335, 6);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(Math.abs(p.car.speed) * KMH)} km/h`, vw - 24, vh - 26);
    ctx.textAlign = 'left';
    // Car health: its own panel above the speed box, a bar instead of faint text.
    ctx.fillStyle = 'rgba(12,14,18,0.78)';
    roundRect(ctx, vw - 190, vh - 84, 178, 24, 8);
    ctx.fill();
    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('CAR', vw - 178, vh - 67);
    ctx.fillStyle = '#2a2e36';
    ctx.fillRect(vw - 138, vh - 76, 114, 8);
    ctx.fillStyle = p.car.hp > 30 ? '#7ee787' : '#ff3b30';
    ctx.fillRect(vw - 138, vh - 76, 114 * Math.max(0, p.car.hp / 100), 8);
  }

  // Controls hint, bottom centre.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WASD move · Shift run · E enter car · Click shoot · Space brake · P pause · M mute', vw / 2, vh - 8);

  // Toast (mission complete).
  if (world.toast) {
    ctx.fillStyle = 'rgba(12,14,18,0.85)';
    ctx.font = 'bold 18px system-ui, sans-serif';
    const tw = ctx.measureText(world.toast.text).width + 36;
    roundRect(ctx, vw / 2 - tw / 2, 66, tw, 38, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd23a';
    ctx.textAlign = 'center';
    ctx.fillText(world.toast.text, vw / 2, 91);
  }

  // Damage vignette when hurt.
  if (p.hurtT > 0) {
    const a = Math.min(0.4, p.hurtT * 0.25);
    const grad = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.35, vw / 2, vh / 2, vh * 0.75);
    grad.addColorStop(0, 'rgba(200,30,30,0)');
    grad.addColorStop(1, `rgba(200,30,30,${a})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vw, vh);
  }

  // ================= menus =================
  if (world.state === 'start') drawStart(ctx, world, vw, vh);
  else if (world.state === 'paused') drawOverlay(ctx, vw, vh, 'PAUSED', 'P or Enter to keep playing.');
  else if (world.state === 'busted') drawOverlay(ctx, vw, vh, 'BUSTED', `The Solmara police caught Mara. -$${world.bustedLost}. Enter to walk free.`);
  else if (world.state === 'wasted') drawOverlay(ctx, vw, vh, 'WASTED', `Mara didn't make it. -$${world.wastedLost}. Enter to try again.`);
  else if (world.state === 'done') drawDone(ctx, world, vw, vh);
}

function drawStart(ctx, world, vw, vh) {
  ctx.fillStyle = 'rgba(10,10,14,0.72)';
  ctx.fillRect(0, 0, vw, vh);
  const bw = 620;
  const bh = 430;
  const bx = vw / 2 - bw / 2;
  const by = vh / 2 - bh / 2;
  ctx.fillStyle = 'rgba(16,18,26,0.96)';
  roundRect(ctx, bx, by, bw, bh, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,58,0.5)';
  ctx.lineWidth = 1;
  roundRect(ctx, bx, by, bw, bh, 10);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23a';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('SOLMARA', vw / 2, by + 82);
  ctx.fillStyle = '#f2c14e';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('A SUN-SOAKED CRIME STORY', vw / 2, by + 114);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Mara Voss owes a debt to the fixer Elias Kross.', vw / 2, by + 158);
  ctx.fillText('Four jobs across five districts will pay it off —', vw / 2, by + 182);
  ctx.fillText('if the Solmara police let her.', vw / 2, by + 206);
  ctx.fillStyle = '#b8b8b8';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('WASD move · Shift run · E steal & drive · Click shoot', vw / 2, by + 248);
  ctx.fillText('Space brake · P pause · M mute', vw / 2, by + 272);
  ctx.fillStyle = '#ffd23a';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`Best cash $${world.bestCash} · Jobs done ${Math.min(4, world.missionIndex)}/4`, vw / 2, by + 312);
  ctx.fillStyle = '#7ee787';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('PRESS ENTER TO START', vw / 2, by + 362);
}

function drawOverlay(ctx, vw, vh, title, sub) {
  ctx.fillStyle = 'rgba(10,10,14,0.62)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23a';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText(title, vw / 2, vh / 2 - 8);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText(sub, vw / 2, vh / 2 + 30);
}

function drawDone(ctx, world, vw, vh) {
  ctx.fillStyle = 'rgba(10,10,14,0.72)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23a';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText('THE BIG ONE — COMPLETE', vw / 2, vh / 2 - 66);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('Mara paid Elias Kross. Solmara is hers now.', vw / 2, vh / 2 - 26);
  ctx.fillStyle = '#7ee787';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`Last getaway: ${world.lastRating || 'CLEAN'} · Best cash $${world.bestCash}`, vw / 2, vh / 2 + 14);
  ctx.fillStyle = '#b8b8b8';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Press Enter to keep playing — free roam.', vw / 2, vh / 2 + 52);
}
