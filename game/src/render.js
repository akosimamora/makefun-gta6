// Everything on screen: the city, the people, the HUD, the live minimap
// and the menu screens. The camera trails the player.
window.SOL = window.SOL || {};
SOL.render = function (ctx, w) {
  const cfg = w.cfg, p = w.player;
  const vw = cfg.viewW, vh = cfg.viewH;
  ctx.clearRect(0, 0, vw, vh);
  if (w.mode === 'title') { SOL.drawTitle(ctx, w); return; }

  const shakeX = w.shake ? (Math.random() - 0.5) * w.shake : 0;
  const shakeY = w.shake ? (Math.random() - 0.5) * w.shake : 0;
  const camX = SOL.clamp(w.cam.x - vw / 2 + shakeX, 0, cfg.worldW - vw);
  const camY = SOL.clamp(w.cam.y - vh / 2 + shakeY, 0, cfg.worldH - vh);
  ctx.save();
  ctx.translate(-camX, -camY);

  // Ground + district tint.
  ctx.fillStyle = '#1d2b1f'; ctx.fillRect(camX, camY, vw, vh);
  for (const d of cfg.districts) { ctx.fillStyle = d.color + '33'; ctx.fillRect(d.x, d.y, d.w, d.h); }
  // Roads.
  ctx.fillStyle = '#2c2f36';
  for (const rx of w.city.roadsV) ctx.fillRect(rx - cfg.roadHalf, 0, cfg.roadHalf * 2, cfg.worldH);
  for (const ry of w.city.roadsH) ctx.fillRect(0, ry - cfg.roadHalf, cfg.worldW, cfg.roadHalf * 2);
  ctx.strokeStyle = '#c8a227'; ctx.lineWidth = 2; ctx.setLineDash([26, 22]);
  ctx.beginPath();
  for (const rx of w.city.roadsV) { ctx.moveTo(rx, 0); ctx.lineTo(rx, cfg.worldH); }
  for (const ry of w.city.roadsH) { ctx.moveTo(0, ry); ctx.lineTo(cfg.worldW, ry); }
  ctx.stroke(); ctx.setLineDash([]);
  // Buildings + landmarks.
  for (const b of w.city.buildings) {
    ctx.fillStyle = b.tone; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(b.x, b.y, b.w, 8);
  }
  for (const l of w.city.landmarks) {
    ctx.fillStyle = l.color; ctx.fillRect(l.x, l.y, l.w, l.h);
    ctx.fillStyle = '#101418'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(l.name, l.x + l.w / 2, l.y + l.h / 2 + 5);
  }
  // Mission target beacon.
  const m = SOL.missionAt(w.missionIndex);
  if (w.mode === 'playing') {
    const pulse = 0.5 + 0.5 * Math.sin(w.time / 180);
    ctx.strokeStyle = `rgba(255,215,0,${0.5 + pulse * 0.5})`; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(m.target.x, m.target.y, m.target.r * (0.55 + pulse * 0.2), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(m.target.label, m.target.x, m.target.y - m.target.r - 10);
  }
  // Pedestrians.
  for (const pd of w.peds) {
    ctx.fillStyle = pd.color;
    ctx.beginPath(); ctx.arc(pd.x, pd.y, 6, 0, Math.PI * 2); ctx.fill();
  }
  // Traffic + player car.
  for (const c of w.cars) SOL.drawCar(ctx, c.x, c.y, c.angle, c.color, c.id === p.carId && !p.onFoot);
  // Foot cops + patrol cars.
  for (const c of w.cops) {
    if (c.car) { SOL.drawCar(ctx, c.x, c.y, c.angle, '#1c2733', false, true); }
    else {
      ctx.fillStyle = '#16222e';
      ctx.beginPath(); ctx.arc(c.x, c.y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3b82f6'; ctx.fillRect(c.x - 9, c.y - 13, 18, 5);
    }
  }
  // Player on foot.
  if (p.onFoot) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    ctx.fillStyle = '#e11d48';
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(6, -3, 12, 6);
    ctx.restore();
  }
  // Helicopter + spotlight.
  if (w.heli.active) {
    const hx = w.heli.x, hy = w.heli.y;
    ctx.fillStyle = 'rgba(255,255,180,0.10)';
    ctx.beginPath(); ctx.arc(p.x, p.y, 150, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,180,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.fillStyle = '#20262e';
    ctx.beginPath(); ctx.arc(hx, hy, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.beginPath(); ctx.arc(hx, hy, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  SOL.drawHud(ctx, w, vw, vh);
  SOL.drawMinimap(ctx, w, vw, vh);
  if (w.mode === 'paused') SOL.drawOverlay(ctx, vw, vh, 'PAUSED', 'Press P to keep playing');
  if (w.mode === 'busted') SOL.drawOverlay(ctx, vw, vh, 'BUSTED', 'The Solmara PD caught Mara. Press Enter to try again.');
  if (w.mode === 'wasted') SOL.drawOverlay(ctx, vw, vh, 'WASTED', 'Mara went down. Press Enter to try again.');
  if (w.mode === 'done') {
    SOL.drawOverlay(ctx, vw, vh, 'SOLMARA IS YOURS',
      `All 4 jobs done — $${p.cash} banked · getaway ${SOL.getawayRating(w)} · press Enter to run it back`);
  }
};

SOL.drawCar = function (ctx, x, y, angle, color, isPlayer, isCop) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillStyle = isCop ? '#0f172a' : color;
  ctx.fillRect(-20, -10, 40, 20);
  ctx.fillStyle = 'rgba(180,220,255,0.85)';
  ctx.fillRect(-6, -9, 12, 18);
  if (isCop) { ctx.fillStyle = '#ef4444'; ctx.fillRect(-20, -10, 8, 4); ctx.fillStyle = '#3b82f6'; ctx.fillRect(-20, 6, 8, 4); }
  if (isPlayer) { ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 3; ctx.strokeRect(-22, -12, 44, 24); }
  ctx.restore();
};

SOL.drawHud = function (ctx, w, vw, vh) {
  const p = w.player, m = SOL.missionAt(w.missionIndex);
  ctx.fillStyle = 'rgba(8,12,10,0.72)';
  ctx.fillRect(12, 12, 300, 86);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(`$${p.cash}`, 24, 40);
  ctx.font = '14px sans-serif'; ctx.fillStyle = '#ffd700';
  ctx.fillText(`${m.title}: ${m.objective}`, 24, 62);
  ctx.fillStyle = '#9fb3a8'; ctx.font = '13px sans-serif';
  ctx.fillText(`HP ${Math.max(0, Math.round(p.hp))}  ·  Ammo ${p.ammo}${p.reloading > 0 ? ' (reloading…)' : ''}`, 24, 84);
  // Wanted stars.
  ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'right';
  for (let i = 0; i < w.cfg.maxWanted; i++) {
    ctx.fillStyle = i < p.wanted ? '#ef4444' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', vw - 24 - i * 30, 44);
  }
  // CAR panel while driving.
  if (!p.onFoot) {
    const car = w.cars[p.carId];
    ctx.fillStyle = 'rgba(8,12,10,0.72)';
    ctx.fillRect(12, vh - 74, 240, 62);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('CAR', 24, vh - 48);
    ctx.font = '20px sans-serif';
    ctx.fillText(`${Math.round(Math.abs(p.speed) * 0.9)} km/h`, 24, vh - 24);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(150, vh - 56, 90 * Math.max(0, (car ? car.hp : 0) / 100), 10);
    ctx.strokeStyle = '#fff'; ctx.strokeRect(150, vh - 56, 90, 10);
  }
  if (w.messageMs > 0) {
    ctx.fillStyle = 'rgba(8,12,10,0.8)';
    const tw = ctx.measureText(w.message).width + 28;
    ctx.fillRect((vw - tw) / 2, vh - 120, tw, 34);
    ctx.fillStyle = '#ffd700'; ctx.font = '15px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(w.message, vw / 2, vh - 98);
  }
};

SOL.drawMinimap = function (ctx, w, vw, vh) {
  const cfg = w.cfg, p = w.player;
  const mw = 210, mh = 158, mx = vw - mw - 14, my = vh - mh - 14;
  const sx = mw / cfg.worldW, sy = mh / cfg.worldH;
  ctx.fillStyle = 'rgba(8,12,10,0.78)';
  ctx.fillRect(mx - 6, my - 6, mw + 12, mh + 12);
  for (const d of cfg.districts) {
    const gold = (w.rep[d.id] || 0) > 0;
    ctx.fillStyle = gold ? '#ffd700' : d.color;
    ctx.fillRect(mx + d.x * sx, my + d.y * sy, d.w * sx, d.h * sy);
  }
  const m = SOL.missionAt(w.missionIndex);
  ctx.fillStyle = '#ffd700';
  ctx.beginPath(); ctx.arc(mx + m.target.x * sx, my + m.target.y * sy, 5, 0, Math.PI * 2); ctx.fill();
  for (const c of w.cops) {
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(mx + c.x * sx - 2, my + c.y * sy - 2, 4, 4);
  }
  ctx.fillStyle = '#e11d48';
  ctx.beginPath(); ctx.arc(mx + p.x * sx, my + p.y * sy, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
  ctx.strokeRect(mx - 6, my - 6, mw + 12, mh + 12);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('SOLMARA — ' + SOL.districtAt(cfg, p.x, p.y).name, mx, my - 10);
};

SOL.drawOverlay = function (ctx, vw, vh, title, sub) {
  ctx.fillStyle = 'rgba(5,8,7,0.72)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(title, vw / 2, vh / 2 - 10);
  ctx.fillStyle = '#ffd700'; ctx.font = '17px sans-serif';
  ctx.fillText(sub, vw / 2, vh / 2 + 26);
};

SOL.drawTitle = function (ctx, w) {
  const vw = w.cfg.viewW, vh = w.cfg.viewH;
  const g = ctx.createLinearGradient(0, 0, 0, vh);
  g.addColorStop(0, '#0f2027'); g.addColorStop(0.55, '#203a43'); g.addColorStop(1, '#2c5364');
  ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath(); ctx.arc(vw - 220, 150, 90, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 84px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('SOLMARA', vw / 2, 250);
  ctx.fillStyle = '#ffd700'; ctx.font = '20px sans-serif';
  ctx.fillText('A sun-soaked open-world crime story', vw / 2, 292);
  ctx.fillStyle = '#e8f0ec'; ctx.font = '16px sans-serif';
  ctx.fillText('Mara Voss came home to take her city back from fixer Elias Kross.', vw / 2, 340);
  ctx.fillText('Steal cars. Dodge the law. Run four jobs across five districts.', vw / 2, 366);
  ctx.fillStyle = '#9fb3a8'; ctx.font = '15px sans-serif';
  ctx.fillText('WASD / arrows — move & drive · E — steal / exit car · Click / Space — shoot · R — reload · P — pause', vw / 2, 430);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 17px sans-serif';
  ctx.fillText(`Best cash $${w.best.bestCash} · Jobs done ${w.best.jobsDone}/4`, vw / 2, 480);
  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 22px sans-serif';
  const blink = 0.6 + 0.4 * Math.sin(w.time / 300);
  ctx.globalAlpha = blink;
  ctx.fillText('PRESS ENTER TO START', vw / 2, 540);
  ctx.globalAlpha = 1;
};
