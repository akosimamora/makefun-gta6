// The story: Mara Voss, a wheelwoman fresh out of the Marina, takes four
// jobs from the fixer Elias Kross. Each mission is a target point plus a
// condition; finishing one unlocks the next and turns its district gold
// on the minimap.
export const MISSIONS = [
  {
    id: 'wheels',
    title: 'Wheels',
    brief: 'Kross needs a driver. Steal a car, then bring it to the Marina pickup.',
    target: { x: 2720, y: 480 },
    targetLabel: 'Marina pickup',
    district: 'marina',
    needsCar: true,
    cash: 250,
  },
  {
    id: 'vault',
    title: 'Grab the vault cash',
    brief: 'The Golden Palm counts its take at midnight. Walk in, grab the bag, walk out.',
    target: { x: 640, y: 1920 },
    targetLabel: 'Golden Palm vault',
    district: 'golden',
    needsCar: false,
    cash: 600,
  },
  {
    id: 'bigone',
    title: 'The Big One',
    brief: 'Kross set you up. The cops are coming — lose them and reach the Docks safehouse.',
    target: { x: 2560, y: 1920 },
    targetLabel: 'Docks safehouse',
    district: 'docks',
    needsCar: false,
    cash: 1200,
    heat: 3,
  },
  {
    id: 'kross',
    title: 'Settle with Kross',
    brief: 'One last drive to Sol Tower. End it with Elias Kross, face to face.',
    target: { x: 1600, y: 1200 },
    targetLabel: 'Sol Tower',
    district: 'downtown',
    needsCar: false,
    cash: 2500,
  },
];

export function missionAt(index) {
  return MISSIONS[index] ?? null;
}

export function getawayLabel(wanted, damageTaken) {
  if (wanted === 0 && damageTaken === 0) return 'CLEAN';
  if (wanted <= 2 && damageTaken < 40) return 'MESSY';
  return 'CHAOS';
}
