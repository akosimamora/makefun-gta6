# Solmara — A Sun-Soaked Crime Story

A complete open-world crime game in one static page, built for make.fun's **gta6-01** competition ("Make GTA 6").

**Mara Voss owes a debt to the fixer Elias Kross.** Four jobs across five districts of Solmara — a sun-soaked coastal city — will pay it off, if the Solmara police let her.

## Play it

Open `game/index.html` in a desktop browser, or serve it with `node serve.ts` and open http://localhost:8080.

- **WASD / arrows** — walk or drive · **Shift** run · **E** steal & enter a car · **Click** shoot (mouse aim) · **Space** brake · **P** pause · **M** mute
- **On foot and by car** — steal any car, drive it, get out again.
- **Traffic and pedestrians** — cars follow the roads, pedestrians cross them and flee from gunfire.
- **Wanted level, 0–5 stars** — the police respond in force: foot cops who bust you, police cars that ram, and a helicopter with a searchlight at 3+ stars. Lose them to cool down.
- **Four missions, one story** — steal the getaway car, run a package, collect a debt, then rob the Golden Palm vault and escape to the safehouse.
- **District standing (REP)** — finish a job and the district turns gold on the minimap; the city's districts remember you.
- **Getaway ratings** — CLEAN, MESSY or CHAOS, from the most heat you took on a job.
- **HUD and minimap** — cash, REP, wanted stars, health, ammo, objective, speed, and a live minimap with police, the helicopter and the mission marker.
- **Save** — cash, REP and jobs done persist in localStorage; the best cash is remembered.
- **Sound** — a WebAudio engine hum, a two-tone siren, gunshots and mission jingles, all synthesized (no audio files).

No library, no network request, no Rockstar material: Solmara, Mara Voss, Elias Kross and every name, place and drawing are original.

## Build it

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` into the output directory and writes `dossier.json` with the vendored make.fun library.

## Screenshots

Four real renders of the game's own code, staged with `?shot=` and captured in a browser:

1. `1-chase.jpg` — the cover: a three-star police chase, helicopter overhead, minimap and the escape objective.
2. `2-city.jpg` — Mara on foot in Palmera Heights, traffic and pedestrians around the Sol Tower.
3. `3-heist.jpg` — the Golden Palm vault job, two stars, a police car closing in.
4. `4-start.jpg` — the title screen.

## Layout

- `game/index.html` — the page; `game/src/main.js` — boot and the one loop
- `game/src/config.js` — Solmara's constants · `game/src/random.js` — the seeded RNG
- `game/src/city.js` — the city: districts, roads, buildings, landmarks
- `game/src/world.js` — the simulation: player, cars, police, helicopter, combat
- `game/src/missions.js` — the four-job story and the getaway ratings
- `game/src/render.js` — drawing: the city, the HUD, the minimap, the screens
- `game/src/input.js` — keyboard and mouse · `game/src/audio.js` — synthesized sound
- `game/src/save.js` — localStorage saves · `game/src/shots.js` — the screenshot scenes
- `main.ts` — the make.fun entry point · `serve.ts` — a static server for local play
- `vendor/makefun-game.ts` — the vendored make.fun dossier library (unchanged)
