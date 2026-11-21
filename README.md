# SOLMARA — A Sun-Soaked Crime Story

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/akosimamora/makefun-gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/akosimamora/makefun-gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game set in Solmara, a sun-soaked coastal city of five
districts. You are Mara Voss, a getaway driver taking on fixer Elias Kross
across four chained jobs: courier runs, a vault heist at the Golden Palm, a
three-star getaway to the Marina safehouse, and the big one at Sol Tower.

Walk the streets or steal any car you see (E), dodge traffic and pedestrians,
and watch the wanted level: foot cops at one star, patrol cars at two, and the
police helicopter with its spotlight at three and up. Shoot with the mouse
(ammo 12, R reloads), lose the tail, and bank the payout. Districts you finish
turn gold on the live minimap, and every run is rated CLEAN, MESSY or CHAOS.

The game is plain JavaScript and Canvas — no build step, no assets to
download. Open `game/index.html` in a browser, or serve the `game/` folder.

## Run it

```sh
mkdir -p /tmp/solmara-out && MAKEFUN_OUTPUT_DIR=/tmp/solmara-out node main.ts
# writes /tmp/solmara-out/dossier.json plus the game and screenshots
```

## Controls

- WASD / arrows — walk or drive
- E — steal a nearby car / get out
- Mouse aim, Click / Space — shoot
- R — reload
- P — pause, Enter — start / play again

## Layout

- `game/src/config.js` — tuning and districts
- `game/src/random.js` — seeded RNG for the city
- `game/src/city.js` — districts, roads, buildings, landmarks
- `game/src/input.js` — keyboard and mouse, edge-triggered
- `game/src/audio.js` — WebAudio synth sounds
- `game/src/save.js` — localStorage best-run records
- `game/src/missions.js` — the four chained jobs
- `game/src/world.js` — player, traffic, police, wanted system
- `game/src/render.js` — city, chase, HUD and minimap
- `game/src/shots.js` — frozen staged scenes for screenshots
- `game/src/main.js` — game loop and screens
