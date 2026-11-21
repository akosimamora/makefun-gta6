// Four chained jobs: Mara Voss against fixer Elias Kross. Each job hands
// its cash to the next and raises the heat.
window.SOL = window.SOL || {};
SOL.missionList = [
  {
    id: 'wheels', title: 'Wheels',
    brief: 'Elias Kross owns this town. Steal a car and reach the Marina pickup.',
    objective: 'Steal a car (E), then drive to the Marina pickup',
    target: { x: 1400, y: 200, r: 90, label: 'Marina pickup' },
    needCar: true, cash: 250,
  },
  {
    id: 'vault', title: 'The Vault',
    brief: 'The Golden Palm counts its take at midnight. Grab the vault cash.',
    objective: 'Reach the Golden Palm and grab the vault cash',
    target: { x: 1000, y: 1800, r: 110, label: 'Golden Palm vault' },
    needCar: false, cash: 1200,
  },
  {
    id: 'drop', title: 'The Drop',
    brief: 'Cops are circling. Carry the cash across town to the safehouse.',
    objective: 'Deliver the cash to the Safehouse',
    target: { x: 2600, y: 2200, r: 100, label: 'Safehouse' },
    needCar: false, cash: 800,
  },
  {
    id: 'bigone', title: 'The Big One',
    brief: 'One last score, then vanish. Lose the cops and reach the safehouse.',
    objective: 'Escape to the safehouse — lose the cops!',
    target: { x: 2600, y: 2200, r: 100, label: 'Safehouse' },
    needCar: false, cash: 5000, loseCops: true,
  },
];
SOL.missionAt = function (index) { return SOL.missionList[Math.min(index, SOL.missionList.length - 1)]; };
