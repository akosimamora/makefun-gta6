// The story and the mission chain of Solmara. Mara Voss, a getaway driver,
// owes a debt to the fixer Elias Kross. Four jobs pay it off and build her
// standing in the city's districts. Each mission is a list of steps; a step is
// a place to reach, a car to get into, or an escape. Finishing a job pays cash
// and standing, and earns a getaway rating: CLEAN, MESSY or CHAOS, from the
// worst wanted level the job reached.

import { MISSION_CASH, REP_PER_MISSION } from './config.js';
import { addWanted, showMessage } from './world.js';

// A step: reach a point (radius), get into the getaway car, or escape to a
// point while the heat is on.
function reach(x, y, text, radius = 46) {
  return { type: 'reach', x, y, text, radius };
}
function car(text) {
  return { type: 'car', text };
}

// The four jobs. Positions come from the city's spots, so a mission always
// has somewhere real to go.
export function missionDefs(city) {
  const s = city.spots;
  return [
    {
      id: 'wheels',
      name: 'Wheels',
      giver: 'Elias Kross',
      briefing: 'Kross needs a driver. Take the red sports car by the garage, then bring it to the Marina. Do not attract attention.',
      district: 'marina',
      steps: [
        car('Get in the red sports car by the garage (E)'),
        reach(s.marinaPickup.x, s.marinaPickup.y, 'Drive the car to the Marina pickup'),
      ],
    },
    {
      id: 'package',
      name: 'The Package',
      giver: 'Elias Kross',
      briefing: 'A package is waiting at the Marina. Pick it up and deliver it to the Golden Palm on Neon Mile. The cops watch the Mile at night.',
      district: 'neon',
      steps: [
        reach(s.marinaPickup.x, s.marinaPickup.y, 'Pick up the package at the Marina'),
        reach(s.neonCasino.x, s.neonCasino.y, 'Deliver the package to the Golden Palm'),
      ],
    },
    {
      id: 'debt',
      name: 'The Debt',
      giver: 'Elias Kross',
      briefing: 'A dockside crew owes Kross. Go to Dockside and collect. They keep armed guards — be ready.',
      district: 'docks',
      steps: [
        reach(s.dockDebt.x, s.dockDebt.y, 'Reach the debtor in Dockside'),
        reach(s.dockDebt.x, s.dockDebt.y, 'Collect the debt (watch the guards)', 40),
      ],
    },
    {
      id: 'bigone',
      name: 'The Big One',
      giver: 'Elias Kross',
      briefing: 'The Golden Palm vault. Grab the cash, then lose the heat and get back to the safehouse. This one pays the debt off.',
      district: 'neon',
      steps: [
        reach(s.neonCasino.x, s.neonCasino.y, 'Reach the Golden Palm casino'),
        reach(s.neonCasino.x, s.neonCasino.y, 'Grab the vault cash', 40),
        reach(s.safehouse.x, s.safehouse.y, 'Escape to the safehouse — lose the cops!', 60),
      ],
    },
  ];
}

export function createMissionState(missionsDone = 0) {
  return {
    index: Math.min(missionsDone, 4), // which job is current (4 = story done)
    step: 0,
    done: missionsDone,
    allDone: missionsDone >= 4,
    objective: '',
    target: null, // {x, y, label} for the marker and the minimap
    rating: null, // the last job's getaway rating
    maxWantedAtStart: 0,
    guardsSpawned: false,
    started: false,
  };
}

// The current job and step, or null when the story is done.
export function currentMission(world) {
  const defs = missionDefs(world.city);
  const m = world.mission;
  if (m.index >= defs.length) return null;
  const def = defs[m.index];
  const step = def.steps[Math.min(m.step, def.steps.length - 1)];
  return { def, step, stepIndex: m.step };
}

// A getaway rating from the worst wanted level a job reached.
function ratingFor(maxWanted) {
  if (maxWanted <= 1) return 'CLEAN';
  if (maxWanted <= 2) return 'MESSY';
  return 'CHAOS';
}

function completeMission(world) {
  const m = world.mission;
  const defs = missionDefs(world.city);
  const def = defs[m.index];
  const cash = MISSION_CASH[m.index] ?? 1000;
  const rep = REP_PER_MISSION[m.index] ?? 20;
  const rating = ratingFor(world.stats.maxWanted - m.maxWantedAtStart);
  world.player.cash += cash;
  world.player.rep += rep;
  m.rating = rating;
  m.done += 1;
  m.index += 1;
  m.step = 0;
  m.guardsSpawned = false;
  // Standing rises in the district the job was in; the minimap tints it gold.
  if (world.districtRep && def.district) {
    world.districtRep[def.district] = (world.districtRep[def.district] ?? 0) + rep;
  }
  showMessage(world, `${def.name} complete — $${cash} and +${rep} standing. Getaway: ${rating}.`, 4);
  if (m.index >= defs.length) {
    m.allDone = true;
    m.objective = 'Story complete — Solmara is yours. Free roam.';
    m.target = null;
    showMessage(world, 'The debt is paid. Solmara is yours, Mara.', 5);
  }
}

export function updateMissions(world, dt) {
  void dt;
  const m = world.mission;
  const cur = currentMission(world);
  if (!cur) {
    if (!m.objective) m.objective = 'Story complete — Solmara is yours. Free roam.';
    return;
  }
  const { def, step } = cur;
  if (!m.started) {
    m.started = true;
    m.maxWantedAtStart = world.stats.maxWanted;
    showMessage(world, `${def.name} — ${def.giver}: ${def.briefing}`, 5);
  }
  m.objective = `${def.name}: ${step.text}`;
  const p = world.player;
  if (step.type === 'car') {
    // The getaway car is the red sports car by the garage.
    const car = world.cars.find((c) => c.kind === 'sports' && c.id === 1000);
    if (car) {
      m.target = { x: car.x, y: car.y, label: 'Getaway car' };
      if (!p.onFoot && p.carId === 1000) {
        m.step += 1;
        m.started = false;
      }
    }
  } else if (step.type === 'reach' || step.type === 'escape') {
    m.target = { x: step.x, y: step.y, label: def.name };
    const d = Math.hypot(p.x - step.x, p.y - step.y);
    if (d < step.radius) {
      // The debt job's guards arrive when Mara reaches the debtor.
      if (def.id === 'debt' && m.step === 0 && !m.guardsSpawned) {
        m.guardsSpawned = true;
        for (let i = 0; i < 2; i++) {
          world.cops.push({
            x: step.x + (i === 0 ? -90 : 90), y: step.y + 60,
            angle: 0, speed: 150, health: 100, shootCooldown: 0.8,
          });
        }
        addWanted(world, 1, 'The debtor called his guards!');
      }
      // The casino vault trips the alarm.
      if (def.id === 'bigone' && m.step === 1) {
        addWanted(world, 3, 'The vault alarm is screaming!');
      }
      m.step += 1;
      m.started = false;
      if (m.step >= def.steps.length) completeMission(world);
    }
  }
}

// The marker the renderer and the minimap draw, or null.
export function missionTarget(world) {
  return world.mission.target;
}
