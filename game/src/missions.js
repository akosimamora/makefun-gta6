// The four-job story: Mara Voss owes the fixer Elias Kross, and four jobs
// across five districts will pay it off. Finishing a job pays cash, turns
// its district gold on the minimap (REP), and earns a getaway rating from
// the most heat Mara took on that job: CLEAN, MESSY or CHAOS.

import { PLACES } from './config.js';

export const MISSIONS = [
  {
    id: 'wheels', name: 'Wheels', district: 'marina', reward: 250,
    briefing: 'Elias Kross needs a getaway car. Steal one, then bring it to the Marina pickup.',
    stages: [
      { kind: 'enterCar', text: 'Steal a car' },
      { kind: 'goto', x: PLACES.marinaPickup.x, y: PLACES.marinaPickup.y, r: 80, text: 'Drive the car to the Marina pickup' },
    ],
  },
  {
    id: 'package', name: 'The Package', district: 'neon', reward: 400,
    briefing: 'A package is waiting in Calle Sol. Pick it up and run it to the Golden Palm.',
    stages: [
      { kind: 'goto', x: PLACES.packagePickup.x, y: PLACES.packagePickup.y, r: 60, text: 'Pick up the package in Calle Sol' },
      { kind: 'goto', x: PLACES.goldenPalm.x, y: PLACES.goldenPalm.y, r: 110, text: 'Deliver the package to the Golden Palm' },
    ],
  },
  {
    id: 'debt', name: 'The Debt', district: 'dockside', reward: 600,
    briefing: 'A debtor hides at the Dockside warehouse with two armed guards. Collect what he owes.',
    stages: [
      { kind: 'goto', x: PLACES.dockside.x, y: PLACES.dockside.y, r: 140, text: 'Go to the Dockside warehouse' },
      { kind: 'defeat', count: 2, text: 'Deal with the two armed guards' },
      { kind: 'goto', x: PLACES.dockside.x, y: PLACES.dockside.y, r: 90, text: 'Collect the debt' },
    ],
  },
  {
    id: 'bigone', name: 'The Big One', district: 'calle', reward: 1500,
    briefing: 'The Golden Palm vault. Grab the cash, then lose the cops and reach the safehouse.',
    stages: [
      { kind: 'goto', x: PLACES.goldenPalm.x, y: PLACES.goldenPalm.y, r: 110, text: 'Go to the Golden Palm vault' },
      { kind: 'grab', x: PLACES.goldenPalm.x, y: PLACES.goldenPalm.y, r: 90, text: 'Grab the vault cash' },
      { kind: 'escape', x: PLACES.safehouse.x, y: PLACES.safehouse.y, r: 90, text: 'Escape to the safehouse — lose the cops!' },
    ],
  },
];

export function currentMission(world) {
  if (world.missionIndex >= MISSIONS.length) return null;
  return MISSIONS[world.missionIndex];
}

/** The objective line the HUD shows. */
export function missionText(world) {
  const m = currentMission(world);
  if (!m) return 'Free roam — Solmara remembers Mara.';
  const stage = m.stages[world.missionStage];
  if (!stage) return m.name;
  return `${m.name}: ${stage.text}`;
}

/** The map marker for the current stage, or null when it has none. */
export function missionMarker(world) {
  const m = currentMission(world);
  if (!m) return null;
  const stage = m.stages[world.missionStage];
  if (!stage || stage.x === undefined) return null;
  return { x: stage.x, y: stage.y };
}

/** Called when a stage begins (first stage included): stage-specific setup. */
export function stageStarted(world, mission, stageIdx) {
  const stage = mission.stages[stageIdx];
  if (!stage) return;
  if (stage.kind === 'defeat' && world.guards.length === 0) {
    const spots = [
      { x: PLACES.dockside.x - 70, y: PLACES.dockside.y - 40 },
      { x: PLACES.dockside.x + 70, y: PLACES.dockside.y + 50 },
    ];
    for (const s of spots) {
      world.guards.push({ x: s.x, y: s.y, hp: 2, shootT: 1 + Math.random(), angle: 0 });
    }
    world.guardsSpawned = (world.guardsSpawned || 0) + spots.length;
  }
}

function stageDone(world, stage) {
  const p = world.player;
  const px = p.car ? p.car.x : p.x;
  const py = p.car ? p.car.y : p.y;
  if (stage.kind === 'enterCar') return p.car !== null;
  if (stage.kind === 'goto' || stage.kind === 'grab' || stage.kind === 'escape') {
    const dx = px - stage.x;
    const dy = py - stage.y;
    return dx * dx + dy * dy < stage.r * stage.r;
  }
  if (stage.kind === 'defeat') return world.guardsDefeated >= stage.count;
  return false;
}

/**
 * Advance the mission when its stage is done. Returns an event
 * ({type: 'stage' | 'mission' | 'storyDone'}) or null.
 */
export function updateMission(world) {
  const m = currentMission(world);
  if (!m) return null;
  if (world.wanted > world.missionMaxHeat) world.missionMaxHeat = world.wanted;
  const stage = m.stages[world.missionStage];
  if (!stage) return null;
  if (!stageDone(world, stage)) return null;

  // Grabbing the vault trips the alarm: three stars, right now.
  if (stage.kind === 'grab') {
    world.wanted = 3;
    world.heat = 3;
    world.coolT = 0;
  }

  world.missionStage += 1;
  if (world.missionStage < m.stages.length) {
    stageStarted(world, m, world.missionStage);
    return { type: 'stage' };
  }

  // Job done: pay, REP the district, rate the getaway.
  const rating = world.missionMaxHeat === 0 ? 'CLEAN' : world.missionMaxHeat <= 2 ? 'MESSY' : 'CHAOS';
  world.cash += m.reward;
  world.rep[m.district] = 1;
  if (world.cash > world.bestCash) world.bestCash = world.cash;
  world.lastRating = rating;
  world.lastReward = m.reward;
  world.toast = { text: `${m.name} complete — ${rating} getaway, +$${m.reward}`, t: 4 };
  world.missionIndex += 1;
  world.missionStage = 0;
  world.missionMaxHeat = 0;
  world.guardsDefeated = 0;
  if (world.missionIndex >= MISSIONS.length) {
    world.storyDone = true;
    return { type: 'storyDone', rating, reward: m.reward };
  }
  stageStarted(world, MISSIONS[world.missionIndex], 0);
  return { type: 'mission', rating, reward: m.reward };
}
