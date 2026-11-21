# SOLMARA

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/akosimamora/makefun-gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/akosimamora/makefun-gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game for make.fun's **gta6-01** ("Make GTA 6"), running entirely from static files in a desktop browser. No libraries, no network, no build step — just a canvas, a city, and a debt to pay.

## The story

Mara Voss owes the fixer Elias Kross. Four jobs across Solmara's five districts will clear the debt — if the Solmara police let her. Steal a getaway car, run a package to the Golden Palm casino, collect a debt at the Dockside warehouse, then rob the casino vault and lose a three-star chase on the way to the safehouse.

## The city

Solmara is a sun-soaked coastal city, 3200 by 2400, built from one seed so it is the same every time you load it. Five districts, each with its own ground and building colours: Marina del Sol by the bay (boats, beach), Palmera Heights (the Sol Tower), Neon Mile (the Golden Palm casino), Calle Sol, and Dockside (warehouses). A grid of streets carries traffic and pedestrians; about seventy buildings, trees and street lamps fill the blocks.

## What is in it

- **On foot and by car** — walk, run, steal any car with E, drive it with real-ish physics (acceleration, braking, steering, drift on Space), get out again.
- **Traffic and pedestrians** — cars follow the streets and turn at intersections, slowing for the car ahead; pedestrians cross the streets and run from gunfire.
- **Wanted, 0–5 stars** — shooting, stealing in front of witnesses and killing draw the law. Foot cops chase and bust, police cars chase and ram, and at three stars a helicopter joins with a searchlight. Stay quiet and out of sight and the heat cools, one star at a time.
- **Combat** — a pistol, mouse aim, hit-scan shots with tracers, impact sparks and screen shake. Cars take damage and can be wrecked (smoke, then an explosion).
- **Four missions, one story** — each with its own objective line, a marker on the minimap and a light pillar in the world.
- **District standing (REP)** — finish a job and its district turns gold on the minimap. The city remembers what Mara did where.
- **Getaway ratings** — every job is rated CLEAN, MESSY or CHAOS from the most heat Mara took while doing it.
- **HUD and minimap** — cash, REP, wanted stars, health, ammo and best cash; a live minimap with the police, the helicopter and the mission marker; speed and car health while driving.
- **Start, pause, busted, wasted and done screens, plus a save** — cash, REP, the current job and the best cash persist in localStorage.
- **Sound, synthesised** — an engine hum that follows speed, a two-tone siren when the police are close, gunshots and mission jingles, all from the Web Audio API. M mutes.

## Play it

Open `game/index.html` in a desktop browser, or serve the game folder and open it:

```sh
node serve.ts
# then open http://localhost:8080
```

Controls: **WASD / arrows** walk or drive · **Shift** run · **E** steal & enter a car · **Click** shoot (mouse aim) · **Space** brake · **P** pause · **M** mute · **R** reload.

## Build the entry

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` into the output directory and writes `dossier.json` with the vendored make.fun library. It resolves everything against its own directory, never the working directory, and writes byte-identical output on every run.

## Screenshots

Four real renders of the game's own code in a browser, staged with `?shot=`:

1. `1-chase.jpg` — the cover: a three-star police chase at full speed, helicopter overhead, minimap and the escape objective.
2. `2-city.jpg` — Mara on foot in Palmera Heights, traffic and pedestrians by the Sol Tower.
3. `3-heist.jpg` — the Golden Palm vault job, two stars, a police car closing in.
4. `4-start.jpg` — the title screen.

## Files

- `game/index.html` — the page; `game/src/main.js` — boot and the one loop
- `game/src/config.js` — every tuning number · `game/src/random.js` — the seeded RNG
- `game/src/city.js` — the city: districts, streets, buildings, landmarks
- `game/src/world.js` — the simulation: Mara, cars, police, helicopter, combat
- `game/src/missions.js` — the four-job story, REP and the getaway ratings
- `game/src/render.js` — drawing: the city, the HUD, the minimap, the menus
- `game/src/input.js` — keyboard and mouse · `game/src/audio.js` — synthesised sound
- `game/src/save.js` — localStorage saves · `game/src/shots.js` — the screenshot scenes
- `main.ts` — the make.fun entry point · `serve.ts` — a static server for local play
- `vendor/makefun-game.ts` — the vendored make.fun dossier library (unchanged)

Solmara, Mara Voss, Elias Kross and every name, place and drawing here are original.

---

<sub>Entered on [make.fun](https://make.fun/?ref=1nmmcbpw&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
