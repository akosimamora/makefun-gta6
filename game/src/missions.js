// Missions: four chained jobs from fixer Elias Kross, given to Mara
// Voss. Each mission has an objective line for the HUD, a target
// anchor in the city, and a cash payout. Finishing one starts the
// next; finishing all four ends the run with a getaway rating.
export const MISSIONS = [
  {
    id: 'wheels',
    title: 'Wheels',
    giver: 'Elias Kross',
    text: 'Drive the car to the Marina pickup',
    detail: 'Elias needs wheels. Steal a car (E) and bring it to the Marina pickup — fast and quiet if you can.',
    anchor: 'marinaPickup',
    payout: 250,
    district: 'marina',
  },
  {
    id: 'vault',
    title: 'Grab the vault cash',
    giver: 'Elias Kross',
    text: 'Grab the vault cash at the Golden Palm',
    detail: 'The Golden Palm casino keeps its cash downstairs. Walk into the vault marker and take it — the alarm will bring heat.',
    anchor: 'casinoVault',
    payout: 900,
    district: 'palm',
    needsOnFoot: true,
  },
  {
    id: 'drop',
    title: 'The Drop',
    giver: 'Elias Kross',
    text: 'Deliver the cash to Dock 9',
    detail: 'The cash is hot. Get it to the Dock 9 drop before the cops box you in. A car helps.',
    anchor: 'dockDrop',
    payout: 600,
    district: 'docks',
  },
  {
    id: 'bigone',
    title: 'The Big One',
    giver: 'Elias Kross',
    text: 'Escape to the safehouse — lose the cops!',
    detail: 'Last job. The whole city is looking for you. Reach the safehouse with the cops off your tail.',
    anchor: 'safehouse',
    payout: 1500,
    district: 'palmera',
    needsEscape: true,
  },
];

export function createMissionState() {
  return {
    index: 0,          // which mission is active (0..3), 4 = all done
    cash: 0,           // cash earned this run
    heatAtStart: 0,    // wanted heat when the current mission began
    maxHeat: 0,        // highest heat reached during the current mission
    done: false,
    rating: null,      // CLEAN / MESSY / CHAOS once all four are done
  };
}

export function currentMission(state) {
  return state.index < MISSIONS.length ? MISSIONS[state.index] : null;
}

// Getaway rating from the heat the player carried through the run.
export function getawayRating(maxHeatSeen) {
  if (maxHeatSeen < 20) return 'CLEAN';
  if (maxHeatSeen < 60) return 'MESSY';
  return 'CHAOS';
}

// Complete the active mission: pay out, mark its district REP gold,
// advance to the next mission (or finish the run).
export function completeMission(state, rep) {
  const m = currentMission(state);
  if (!m) return null;
  state.cash += m.payout;
  rep[m.district] = true;
  state.index += 1;
  state.maxHeat = 0;
  if (state.index >= MISSIONS.length) {
    state.done = true;
  }
  return m;
}
