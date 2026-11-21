// World state and simulation: player, traffic, pedestrians, police,
// helicopter, bullets, wanted level, missions, getaway rating.
import { CONFIG } from './config.js';
import { mulberry32, range, intRange, pick } from './random.js';
import { buildCity, districtAt, onRoad } from './city.js';
import { missionFor, rateGetaway } from './missions.js';

const CAR_COLORS = ['#c0392b', '#2980b9', '#f1c40f', '#7f8c8d', '#e67e22', '#8e44ad', '#16a085'];

export class World {
  constructor(save, audio) {
    this.city = buildCity();
    this.audio = audio;
    this.save = save;
    this.rng = mulberry32(777);
    this.player = {
      x: this.city.spawn.x, y: this.city.spawn.y, angle: -Math.PI / 2,
      hp: CONFIG.playerHp, ammo: CONFIG.pistolAmmo, onFoot: true, car: null,
      speed: 0, moving: false,
    };
    this.cars = this.city.carSpawns.map((s, i) => ({
      x: s.x, y: s.y, angle: (i % 2 ? 0 : Math.PI / 2), color: CAR_COLORS[i % CAR_COLORS.length],
      parked: true, speed: 0, driver: false,
    }));
    this.traffic = [];
    for (let i = 0; i < CONFIG.trafficCount; i++) this.traffic.push(this.spawnTrafficCar());
    this.peds = [];
    for (let i = 0; i < CONFIG.pedCount; i++) this.peds.push(this.spawnPed());
    this.cops = [];
    this.heli = { x: 0, y: 0, active: false, angle: 0 };
    this.bullets = [];
    this.wanted = 0;
    this.wantedPeak = 0;
    this.wantedTimer = 0;
    this.tookDamage = false;
    this.missionIndex = save.jobsDone;
    this.mission = this.missionIndex < 4 ? missionFor(this.missionIndex) : null;
    this.missionDone = false;
    this.message = this.mission ? `${this.mission.giver}: ${this.mission.text}` : 'All jobs done. Solmara is yours.';
    this.messageTimer = 6;
    this.cashFlash = 0;
    this.frozen = false;
    this.time = 0;
  }

  spawnTrafficCar() {
    const vertical = this.rng() < 0.5;
    const road = pick(this.rng, this.city.roads.filter((r) => r.vertical === vertical));
    const along = range(this.rng, 100, vertical ? CONFIG.worldH - 100 : CONFIG.worldW - 100);
    return {
      x: vertical ? road.x1 + (this.rng() < 0.5 ? -14 : 14) : along,
      y: vertical ? along : road.y1 + (this.rng() < 0.5 ? -14 : 14),
      angle: vertical ? (this.rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (this.rng() < 0.5 ? 0 : Math.PI),
      color: pick(this.rng, CAR_COLORS),
      speed: range(this.rng, 110, 190),
    };
  }

  spawnPed() {
    return {
      x: range(this.rng, 260, CONFIG.worldW - 60),
      y: range(this.rng, 60, CONFIG.worldH - 60),
      angle: range(this.rng, 0, Math.PI * 2),
      speed: range(this.rng, 22, 48),
      color: pick(this.rng, ['#ecf0f1', '#f39c12', '#1abc9c', '#e74c3c', '#9b59b6']),
      turnIn: range(this.rng, 2, 6),
    };
  }

  addWanted(n) {
    this.wanted = Math.min(CONFIG.maxWanted, this.wanted + n);
    this.wantedPeak = Math.max(this.wantedPeak, this.wanted);
    this.wantedTimer = CONFIG.wantedDecayMs / 1000;
    if (this.wanted >= 1 && this.cops.length === 0) this.spawnCops();
  }

  spawnCops() {
    const p = this.player;
    for (let i = 0; i < CONFIG.copFootCount; i++) {
      this.cops.push({ kind: 'foot', x: p.x + (i - 1) * 160, y: p.y - 260, speed: 210, hp: 60 });
    }
    for (let i = 0; i < CONFIG.copCarCount; i++) {
      this.cops.push({ kind: 'car', x: p.x + (i - 1) * 320, y: p.y + 320, angle: 0, speed: 0, color: '#2c3e50' });
    }
  }

  nearestCar(maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const c of this.cars) {
      if (c.driver) continue;
      const d = Math.hypot(c.x - this.player.x, c.y - this.player.y);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  enterCar(car) {
    car.parked = false;
    car.driver = true;
    this.player.car = car;
    this.player.onFoot = false;
    this.addWanted(CONFIG.stealWanted);
    this.audio.pickup();
  }

  exitCar() {
    const car = this.player.car;
    if (!car) return;
    car.driver = false;
    car.parked = true;
    this.player.x = car.x + 34;
    this.player.y = car.y;
    this.player.car = null;
    this.player.onFoot = true;
  }

  shoot() {
    const p = this.player;
    if (p.ammo <= 0) { this.audio.reload(); return; }
    p.ammo -= 1;
    const a = p.angle;
    this.bullets.push({ x: p.x + Math.cos(a) * 26, y: p.y + Math.sin(a) * 26, vx: Math.cos(a) * 720, vy: Math.sin(a) * 720, life: 0.7 });
    this.audio.shoot();
    this.addWanted(CONFIG.shotWanted);
  }

  reload() {
    this.player.ammo = CONFIG.pistolAmmo;
    this.audio.reload();
  }

  finishMission() {
    const m = this.mission;
    if (!m) return;
    const rating = rateGetaway(this.wantedPeak, this.tookDamage);
    this.save.cash += m.payout;
    this.save.jobsDone += 1;
    const d = districtAt(m.target.x, m.target.y);
    this.save.rep[d.id] = true;
    if (!this.save.bestGetaway || rating === 'CLEAN') this.save.bestGetaway = rating;
    this.message = `Job done — ${m.title}: $${m.payout.toLocaleString()} · getaway ${rating}`;
    this.messageTimer = 6;
    this.cashFlash = 2;
    this.audio.cash();
    this.missionIndex += 1;
    this.mission = this.missionIndex < 4 ? missionFor(this.missionIndex) : null;
    this.missionDone = true;
    this.wantedPeak = 0;
    this.tookDamage = false;
  }

  update(dt, input) {
    if (this.frozen) return;
    this.time += dt;
    const p = this.player;
    const ax = input.axis();
    p.moving = ax.x !== 0 || ax.y !== 0;
    // aim: mouse in screen space is converted by main.js into world angle
    if (input.consumeClick() || input.pressed('Space')) {
      if (p.onFoot) this.shoot();
    }
    if (input.consumePressed('KeyR')) this.reload();
    if (input.consumePressed('KeyE')) {
      if (p.onFoot) {
        const car = this.nearestCar(70);
        if (car) this.enterCar(car);
      } else {
        this.exitCar();
      }
    }

    if (p.onFoot) {
      const len = Math.hypot(ax.x, ax.y) || 1;
      p.x += (ax.x / len) * CONFIG.walkSpeed * dt * (p.moving ? 1 : 0);
      p.y += (ax.y / len) * CONFIG.walkSpeed * dt * (p.moving ? 1 : 0);
      if (p.moving) p.angle = Math.atan2(ax.y, ax.x);
    } else if (p.car) {
      const car = p.car;
      const fwd = ax.y < 0 ? 1 : ax.y > 0 ? -0.4 : 0;
      car.speed += fwd * CONFIG.carAccel * dt;
      car.speed *= Math.pow(0.4, dt);
      if (Math.abs(car.speed) < 4) car.speed = 0;
      car.speed = Math.max(-CONFIG.carReverse, Math.min(CONFIG.carSpeed, car.speed));
      car.angle += ax.x * (car.speed / CONFIG.carSpeed) * 2.4 * dt;
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      p.x = car.x;
      p.y = car.y;
      p.angle = car.angle;
      p.speed = Math.abs(car.speed) * 0.36;
      if (Math.abs(car.speed) > 300 && this.rng() < dt * 0.4) this.audio.siren();
    }
    p.x = Math.max(100, Math.min(CONFIG.worldW - 20, p.x));
    p.y = Math.max(20, Math.min(CONFIG.worldH - 20, p.y));

    // traffic: cruise along roads, wrap around the city edge
    for (const t of this.traffic) {
      t.x += Math.cos(t.angle) * t.speed * dt;
      t.y += Math.sin(t.angle) * t.speed * dt;
      if (t.x < -40) t.x = CONFIG.worldW + 40;
      if (t.x > CONFIG.worldW + 40) t.x = -40;
      if (t.y < -40) t.y = CONFIG.worldH + 40;
      if (t.y > CONFIG.worldH + 40) t.y = -40;
    }
    // pedestrians: wander, turn sometimes
    for (const pd of this.peds) {
      pd.turnIn -= dt;
      if (pd.turnIn <= 0) { pd.angle = range(this.rng, 0, Math.PI * 2); pd.turnIn = range(this.rng, 2, 6); }
      pd.x += Math.cos(pd.angle) * pd.speed * dt;
      pd.y += Math.sin(pd.angle) * pd.speed * dt;
      pd.x = Math.max(220, Math.min(CONFIG.worldW - 20, pd.x));
      pd.y = Math.max(20, Math.min(CONFIG.worldH - 20, pd.y));
      if (!p.onFoot && p.car && Math.abs(p.car.speed) > 120 && Math.hypot(pd.x - p.x, pd.y - p.y) < 30) {
        pd.x += (pd.x - p.x) * 0.4;
        pd.y += (pd.y - p.y) * 0.4;
        this.addWanted(CONFIG.runoverWanted);
      }
    }
    // bullets
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      for (const c of this.cops) {
        if (c.hp > 0 && Math.hypot(c.x - b.x, c.y - b.y) < 26) { c.hp -= CONFIG.pistolDamage; b.life = 0; }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
    // police: foot cops chase, cars ram, heli circles at wanted 3+
    for (const c of this.cops) {
      if (c.hp <= 0) continue;
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      const a = Math.atan2(p.y - c.y, p.x - c.x);
      if (c.kind === 'foot') {
        c.x += Math.cos(a) * c.speed * dt;
        c.y += Math.sin(a) * c.speed * dt;
        if (d < 26) { p.hp -= 26 * dt; this.tookDamage = true; }
      } else {
        c.angle += (a - c.angle) * Math.min(1, dt * 2);
        c.speed = Math.min(520, c.speed + 420 * dt);
        c.x += Math.cos(c.angle) * c.speed * dt;
        c.y += Math.sin(c.angle) * c.speed * dt;
        if (d < 44) { p.hp -= 30 * dt; this.tookDamage = true; this.audio.crash(); }
      }
    }
    this.cops = this.cops.filter((c) => c.hp > 0);
    if (this.wanted >= CONFIG.heliAtWanted) {
      this.heli.active = true;
      this.heli.angle += dt * 0.9;
      this.heli.x = p.x + Math.cos(this.heli.angle) * 190;
      this.heli.y = p.y + Math.sin(this.heli.angle) * 190 - 90;
    } else {
      this.heli.active = false;
    }
    // wanted decays when the player stays clean
    if (this.wanted > 0) {
      this.wantedTimer -= dt;
      if (this.wantedTimer <= 0) {
        this.wanted -= 1;
        this.wantedTimer = CONFIG.wantedDecayMs / 1000;
        if (this.wanted === 0) this.cops = [];
      }
    }
    // mission: reach the marker
    if (this.mission) {
      const t = this.mission.target;
      if (Math.hypot(p.x - t.x, p.y - t.y) < 70) this.finishMission();
    }
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (this.cashFlash > 0) this.cashFlash -= dt;
  }
}
