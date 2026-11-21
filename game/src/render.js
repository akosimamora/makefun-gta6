// Drawing only: the world state and the current screen in, pixels out. The
// 1280x720 logical view is scaled to fit the window and centred; the camera
// follows Mara and pulls back a little when she drives fast. The city is drawn
// sun-soaked: warm sand, terracotta roofs, a blue bay, palms, and buildings
// with a lit top face and a shaded side so the blocks read as solid. The HUD
// (cash, standing, wanted stars, health, objective) and the minimap are drawn
// in screen space, so they are crisp in a screenshot.

import { BAY_W, BEACH_W, DISTRICTS, ROAD_ASPHALT, ROAD_W, WORLD_H, WORLD_W } from './config.js';
import { districtAt, onRoad } from './city.js';
import { missionTarget } from './missions.js';
import { playerDistrict } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_DONE = 'done';

const VIEW_W = 1280;
const VIEW_H = 720;
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const MINIMAP_W = 220;
const MINIMAP_H = 168;

// Lighten or darken a hex colour by a fraction (-1 to 1).
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * (1 + f))));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * (1 + f))));
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * (1 + f))));
  return `rgb(${r},${g},${b})`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const w = Math.round(window.innerWidth * ratio);
    const h = Math.round(window.innerHeight * ratio);
    canvas.width = w;
    canvas.height = h;
    view.scale = Math.min(w / VIEW_W, h / VIEW_H);
    view.x = (w - VIEW_W * view.scale) / 2;
    view.y = (h - VIEW_H * view.scale) / 2;
  }

  function text(value, x, y, size, color, align = 'left', weight = 'bold') {
    const key = `${weight}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight} ${size}px ${FONT}`);
    ctx.font = fonts.get(key);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function panel(x, y, w, h, fill = 'rgba(12,14,20,0.82)') {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  }

  // --- the city ------------------------------------------------------------
  function drawCity(world) {
    const city = world.city;
    const cam = world.camera;
    // The visible world rect, for culling.
    const vw = VIEW_W / cam.zoom;
    const vh = VIEW_H / cam.zoom;
    const vx0 = cam.x - vw / 2 - 60;
    const vy0 = cam.y - vh / 2 - 60;
    const vx1 = cam.x + vw / 2 + 60;
    const vy1 = cam.y + vh / 2 + 60;

    // Ground: warm sand everywhere; the districts tint it.
    ctx.fillStyle = '#d9c49a';
    ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
    // District ground tints.
    for (const d of DISTRICTS) {
      ctx.fillStyle = shade(d.road, 0.55);
      ctx.fillRect(Math.max(d.x, vx0), Math.max(d.y, vy0), Math.min(d.x + d.w, vx1) - Math.max(d.x, vx0), Math.min(d.y + d.h, vy1) - Math.max(d.y, vy0));
    }
    // The bay and the beach.
    ctx.fillStyle = '#2e7f9e';
    ctx.fillRect(0, vy0, BAY_W, vy1 - vy0);
    ctx.fillStyle = '#3a94b5';
    for (let y = Math.floor(vy0 / 46) * 46; y < vy1; y += 46) {
      ctx.fillRect(18, y, 60, 3);
      ctx.fillRect(150, y + 22, 70, 3);
    }
    ctx.fillStyle = '#e8d5a0';
    ctx.fillRect(BAY_W, vy0, BEACH_W, vy1 - vy0);
    // Boats in the bay.
    for (const boat of city.boats) {
      if (boat.x < vx0 || boat.x > vx1 || boat.y < vy0 || boat.y > vy1) continue;
      ctx.save();
      ctx.translate(boat.x, boat.y);
      ctx.rotate(boat.angle);
      ctx.fillStyle = '#f2f2f2';
      ctx.fillRect(-boat.len / 2, -7, boat.len, 14);
      ctx.fillStyle = '#c94a4a';
      ctx.fillRect(-boat.len / 2 + 6, -4, 12, 8);
      ctx.restore();
    }
    // Roads: sidewalk band, then asphalt, then a centre line.
    for (const rx of city.vertical) {
      if (rx < vx0 - ROAD_W || rx > vx1 + ROAD_W) continue;
      ctx.fillStyle = '#b8b0a0';
      ctx.fillRect(rx - ROAD_W / 2, vy0, ROAD_W, vy1 - vy0);
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(rx - ROAD_ASPHALT / 2, vy0, ROAD_ASPHALT, vy1 - vy0);
      ctx.fillStyle = '#f2c94c';
      for (let y = Math.floor(vy0 / 44) * 44; y < vy1; y += 44) ctx.fillRect(rx - 1.5, y, 3, 22);
    }
    for (const ry of city.horizontal) {
      if (ry < vy0 - ROAD_W || ry > vy1 + ROAD_W) continue;
      ctx.fillStyle = '#b8b0a0';
      ctx.fillRect(vx0, ry - ROAD_W / 2, vx1 - vx0, ROAD_W);
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(vx0, ry - ROAD_ASPHALT / 2, vx1 - vx0, ROAD_ASPHALT);
      ctx.fillStyle = '#f2c94c';
      for (let x = Math.floor(vx0 / 44) * 44; x < vx1; x += 44) ctx.fillRect(x, ry - 1.5, 22, 3);
    }
    // Buildings: a lit top face, a shaded side for height, a darker roof edge.
    for (const b of city.buildings) {
      if (b.x > vx1 || b.x + b.w < vx0 || b.y > vy1 || b.y + b.h < vy0) continue;
      const h = b.height * 7;
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(b.x + h * 0.7, b.y + h * 0.7, b.w, b.h);
      ctx.fillStyle = shade(b.color, -0.18);
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w - h * 0.4, b.h - h * 0.4);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - h * 0.4, b.h - h * 0.4);
      if (b.name) {
        text(b.name, b.x + b.w / 2, b.y + b.h / 2, 13, 'rgba(255,255,255,0.85)', 'center');
      }
      if (b.kind === 'casino') {
        // Neon trim on the casino.
        ctx.fillStyle = '#e83e8a';
        ctx.fillRect(b.x + 6, b.y + b.h - 12, b.w - 12, 5);
      }
    }
    // Trees and lamps.
    for (const t of city.trees) {
      if (t.x < vx0 || t.x > vx1 || t.y < vy0 || t.y > vy1) continue;
      ctx.fillStyle = '#2e6b34';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a9e55';
      ctx.beginPath();
      ctx.arc(t.x - 3, t.y - 3, t.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const l of city.lamps) {
      if (l.x < vx0 || l.x > vx1 || l.y < vy0 || l.y > vy1) continue;
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(l.x - 1.5, l.y - 1.5, 3, 3);
      ctx.fillStyle = 'rgba(242,201,76,0.5)';
      ctx.beginPath();
      ctx.arc(l.x, l.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- entities ------------------------------------------------------------
  function drawCarShape(car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    const len = car.kind === 'van' ? 68 : 58;
    const wid = car.kind === 'van' ? 32 : 30;
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-len / 2 + 3, -wid / 2 + 3, len, wid);
    // Body.
    ctx.fillStyle = car.wrecked ? '#2e2e2e' : car.color;
    ctx.beginPath();
    ctx.roundRect(-len / 2, -wid / 2, len, wid, 8);
    ctx.fill();
    // Windshield and roof.
    ctx.fillStyle = car.wrecked ? '#1a1a1a' : '#20242e';
    ctx.fillRect(-len / 2 + 10, -wid / 2 + 4, 14, wid - 8);
    ctx.fillStyle = shade(car.color, 0.25);
    ctx.fillRect(-len / 2 + 28, -wid / 2 + 5, 16, wid - 10);
    // Headlights.
    ctx.fillStyle = '#f2e9a0';
    ctx.fillRect(len / 2 - 3, -wid / 2 + 3, 3, 6);
    ctx.fillRect(len / 2 - 3, wid / 2 - 9, 3, 6);
    if (car.isPolice) {
      // Light bar, flashing red and blue.
      const phase = Math.floor(performance.now() / 180) % 2 === 0;
      ctx.fillStyle = phase ? '#e53e3e' : '#2e6fd9';
      ctx.fillRect(-6, -wid / 2 + 2, 12, 7);
      ctx.fillStyle = phase ? '#2e6fd9' : '#e53e3e';
      ctx.fillRect(-6, wid / 2 - 9, 12, 7);
      text('POLICE', 0, 4, 8, '#ffffff', 'center');
    }
    if (car.isPlayer) {
      ctx.strokeStyle = '#f2c94c';
      ctx.lineWidth = 2;
      ctx.strokeRect(-len / 2 - 3, -wid / 2 - 3, len + 6, wid + 6);
    }
    ctx.restore();
  }

  function drawPerson(x, y, angle, color, isCop) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(2, 2, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isCop ? '#2e4a7a' : color;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isCop ? '#1e3355' : shade(color, -0.3);
    ctx.beginPath();
    ctx.arc(6, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawWorld(world) {
    drawCity(world);
    // The mission marker: a pulsing diamond and a light pillar.
    const target = missionTarget(world);
    if (target) {
      const pulse = 1 + 0.18 * Math.sin(world.time * 4);
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#f2c94c';
      ctx.fillRect(target.x - 4, target.y - 260, 8, 260);
      ctx.restore();
      ctx.save();
      ctx.translate(target.x, target.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#f2c94c';
      ctx.strokeStyle = '#7a5c00';
      ctx.lineWidth = 2;
      const s = 16 * pulse;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.strokeRect(-s / 2, -s / 2, s, s);
      ctx.restore();
      text(target.label, target.x, target.y - 34, 14, '#ffffff', 'center');
    }
    // Cars, sorted so the player's is on top.
    const cars = [...world.cars].sort((a, b) => (a.isPlayer ? 1 : 0) - (b.isPlayer ? 1 : 0));
    for (const car of cars) drawCarShape(car);
    // Pedestrians and cops.
    for (const ped of world.peds) drawPerson(ped.x, ped.y, ped.angle, ped.color, false);
    for (const cop of world.cops) drawPerson(cop.x, cop.y, cop.angle, '#2e4a7a', true);
    // Mara, on foot: a figure with a jacket and a direction.
    const p = world.player;
    if (p.onFoot) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.arc(2, 2, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d9381e';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2d5a0';
      ctx.beginPath();
      ctx.arc(7, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      // The pistol, pointing where she aims.
      ctx.fillStyle = '#20242e';
      ctx.fillRect(8, -2, 12, 4);
      ctx.restore();
    }
    // The helicopter and its searchlight.
    const h = world.heli;
    if (h.active) {
      const dx = p.x - h.x;
      const dy = p.y - h.y;
      const dist = Math.hypot(dx, dy);
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = '#fff8c9';
      ctx.beginPath();
      ctx.moveTo(h.x, h.y);
      ctx.arc(h.x, h.y, dist + 60, Math.atan2(dy, dx) - 0.22, Math.atan2(dy, dx) + 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.fillStyle = '#2e4a7a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 26, 14, h.angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-30, 0);
      ctx.lineTo(30, 0);
      ctx.stroke();
      ctx.restore();
    }
    // Tracers and particles.
    for (const t of world.tracers) {
      ctx.strokeStyle = 'rgba(242,201,76,0.9)';
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
  }

  // --- the minimap ------------------------------------------------------------
  function drawMinimap(world) {
    const mx = VIEW_W - MINIMAP_W - 16;
    const my = 16;
    const sx = MINIMAP_W / WORLD_W;
    const sy = MINIMAP_H / WORLD_H;
    panel(mx - 4, my - 4, MINIMAP_W + 8, MINIMAP_H + 8);
    ctx.save();
    ctx.beginPath();
    ctx.rect(mx, my, MINIMAP_W, MINIMAP_H);
    ctx.clip();
    // Ground and districts, tinted gold by Mara's standing there.
    ctx.fillStyle = '#d9c49a';
    ctx.fillRect(mx, my, MINIMAP_W, MINIMAP_H);
    for (const d of DISTRICTS) {
      const rep = world.districtRep?.[d.id] ?? 0;
      const gold = Math.min(1, rep / 60);
      ctx.fillStyle = gold > 0 ? `rgb(${Math.round(201 + 54 * gold)},${Math.round(196 - 60 * gold)},${Math.round(154 - 90 * gold)})` : '#c9b896';
      ctx.fillRect(mx + d.x * sx, my + d.y * sy, d.w * sx, d.h * sy);
    }
    // Water.
    ctx.fillStyle = '#2e7f9e';
    ctx.fillRect(mx, my, BAY_W * sx, MINIMAP_H);
    // Roads.
    ctx.fillStyle = '#3a3a3a';
    for (const rx of world.city.vertical) ctx.fillRect(mx + rx * sx - 1, my, 2, MINIMAP_H);
    for (const ry of world.city.horizontal) ctx.fillRect(mx, my + ry * sy - 1, MINIMAP_W, 2);
    // The mission marker.
    const target = missionTarget(world);
    if (target) {
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath();
      ctx.arc(mx + target.x * sx, my + target.y * sy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7a5c00';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // Police, then Mara.
    for (const car of world.cars) {
      if (!car.isPolice || car.wrecked) continue;
      ctx.fillStyle = '#2e6fd9';
      ctx.beginPath();
      ctx.arc(mx + car.x * sx, my + car.y * sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#d9381e';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mx + world.player.x * sx, my + world.player.y * sy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // The helicopter.
    if (world.heli.active) {
      ctx.fillStyle = '#2e4a7a';
      ctx.beginPath();
      ctx.arc(mx + world.heli.x * sx, my + world.heli.y * sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    text('SOLMARA', mx, my + MINIMAP_H + 18, 12, '#ffffff', 'left');
    text(playerDistrict(world), mx + MINIMAP_W, my + MINIMAP_H + 18, 12, '#f2c94c', 'right');
  }

  // --- the HUD ------------------------------------------------------------------
  function drawHud(world, best) {
    const p = world.player;
    const w = world.wanted;
    // Top-left: cash, standing, wanted stars, health, ammo.
    panel(16, 16, 300, 118);
    text(`$${Math.floor(p.cash).toLocaleString('en-US')}`, 30, 48, 26, '#7be382', 'left');
    text(`REP ${Math.floor(p.rep)}`, 30, 76, 17, '#f2c94c', 'left');
    const stars = Math.round(w.stars);
    let starText = '';
    for (let i = 0; i < 5; i++) starText += i < stars ? '★' : '☆';
    text(starText, 30, 104, 22, stars > 0 ? '#e5534b' : '#8b93a3', 'left');
    if (w.cooling && stars > 0) text('cooling down…', 150, 104, 13, '#8b93a3', 'left');
    // Health bar.
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(170, 60, 130, 12);
    ctx.fillStyle = p.health > 50 ? '#7be382' : p.health > 25 ? '#f2c94c' : '#e5534b';
    ctx.fillRect(170, 60, 130 * Math.max(0, p.health / 100), 12);
    text('HP', 152, 72, 12, '#ffffff', 'right');
    text(`Ammo ${p.ammo}`, 170, 96, 14, '#ffffff', 'left');
    text(`Best $${Math.floor(best).toLocaleString('en-US')}`, 170, 120, 13, '#8b93a3', 'left');
    // Objective, bottom-left.
    const obj = world.mission.objective || 'Free roam — find the K marker to start a job.';
    panel(16, VIEW_H - 64, 560, 48);
    text('◈ ' + obj, 30, VIEW_H - 34, 16, '#ffffff', 'left');
    // Speed and car health, bottom-right, when driving.
    if (!p.onFoot) {
      const car = world.cars.find((c) => c.id === p.carId);
      panel(VIEW_W - 216, VIEW_H - 64, 200, 48);
      text(`${Math.round((p.speed * 0.36) * 10) / 10} km/h`, VIEW_W - 30, VIEW_H - 34, 20, '#ffffff', 'right');
      if (car) {
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(VIEW_W - 200, VIEW_H - 52, 168, 7);
        ctx.fillStyle = car.health > 50 ? '#7be382' : '#e5534b';
        ctx.fillRect(VIEW_W - 200, VIEW_H - 52, 168 * Math.max(0, car.health / 100), 7);
      }
    }
    // A message, centre-top.
    if (world.message) {
      const mw = ctx.measureText(world.message).width + 36;
      panel((VIEW_W - mw) / 2, 150, mw, 40, 'rgba(12,14,20,0.88)');
      text(world.message, VIEW_W / 2, 177, 16, '#f2c94c', 'center');
    }
    // Controls hint, bottom-centre, small.
    text('WASD move · Shift run · E enter car · Click shoot · Space brake · P pause · M mute', VIEW_W / 2, VIEW_H - 8, 12, 'rgba(255,255,255,0.55)', 'center', 'normal');
    drawMinimap(world);
  }

  // --- screens ------------------------------------------------------------------
  function drawTitle(world, best) {
    // The city pans slowly behind the title.
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#1a140d';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
    panel(VIEW_W / 2 - 330, 120, 660, 420);
    text('SOLMARA', VIEW_W / 2, 200, 84, '#f2c94c', 'center');
    text('A SUN-SOAKED CRIME STORY', VIEW_W / 2, 236, 20, '#e8b48a', 'center');
    text('Mara Voss owes a debt to the fixer Elias Kross.', VIEW_W / 2, 300, 18, '#ffffff', 'center', 'normal');
    text('Four jobs across five districts will pay it off —', VIEW_W / 2, 328, 18, '#ffffff', 'center', 'normal');
    text('if the Solmara police let her.', VIEW_W / 2, 356, 18, '#ffffff', 'center', 'normal');
    text('WASD move · Shift run · E steal & drive · Click shoot', VIEW_W / 2, 410, 16, '#8b93a3', 'center', 'normal');
    text('Space brake · P pause · M mute', VIEW_W / 2, 436, 16, '#8b93a3', 'center', 'normal');
    text(`Best cash $${Math.floor(best).toLocaleString('en-US')} · Jobs done ${world.mission.done}/4`, VIEW_W / 2, 478, 16, '#f2c94c', 'center', 'normal');
    text('PRESS ENTER TO START', VIEW_W / 2, 522, 22, '#7be382', 'center');
  }

  function drawOverlay(title, lines, prompt) {
    panel(VIEW_W / 2 - 300, VIEW_H / 2 - 150, 600, 300);
    text(title, VIEW_W / 2, VIEW_H / 2 - 70, 52, '#ffffff', 'center');
    lines.forEach((line, i) => {
      text(line, VIEW_W / 2, VIEW_H / 2 - 10 + i * 32, 18, '#c9c9c9', 'center', 'normal');
    });
    text(prompt, VIEW_W / 2, VIEW_H / 2 + 110, 20, '#7be382', 'center');
  }

  // --- the frame ------------------------------------------------------------------
  function draw(world, screen, best) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#141210';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cam = world.camera;
    const scale = view.scale * cam.zoom;
    const shakeX = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake * view.scale : 0;
    const shakeY = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake * view.scale : 0;
    ctx.setTransform(
      scale, 0, 0, scale,
      view.x + VIEW_W * view.scale / 2 - cam.x * scale + shakeX,
      view.y + VIEW_H * view.scale / 2 - cam.y * scale + shakeY,
    );
    drawWorld(world);
    // HUD and screens live in the 1280x720 logical view.
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    if (screen === SCREEN_TITLE) {
      drawTitle(world, best);
      return;
    }
    drawHud(world, best);
    if (screen === SCREEN_PAUSED) {
      drawOverlay('PAUSED', ['The city waits for you.', `Cash $${Math.floor(world.player.cash).toLocaleString('en-US')} · REP ${Math.floor(world.player.rep)} · Jobs ${world.mission.done}/4`], 'Press P to resume');
    } else if (screen === SCREEN_BUSTED) {
      drawOverlay('BUSTED', ['The Solmara police caught Mara.', 'They took $200 and your heat is gone.'], 'Press Enter to walk free');
    } else if (screen === SCREEN_WASTED) {
      drawOverlay('WASTED', ['Mara went down in Solmara.', 'The hospital bill was $200.'], 'Press Enter to get back up');
    } else if (screen === SCREEN_DONE) {
      drawOverlay('THE DEBT IS PAID', ['Mara Voss owns Solmara now.', `Cash $${Math.floor(world.player.cash).toLocaleString('en-US')} · REP ${Math.floor(world.player.rep)}`], 'Press Enter to keep playing');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
