# SOLMARA — A Sun-Soaked Crime Story

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/akosimamora/makefun-gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/akosimamora/makefun-gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmara is a top-down open-world crime game: Mara Voss comes home to take her coastal city back from fixer Elias Kross. Walk the streets or steal a car, outrun the Solmara PD through five districts, and run four chained jobs — Wheels, The Vault, The Drop and The Big One — while the wanted level climbs from one star to five, patrol cars ram you and a helicopter pins you in its spotlight.

What is in the game: a 3200×2400 city with five named districts, AI traffic (22 cars) and pedestrians (28), foot cops and patrol cars that chase by wanted level, a helicopter from 3 stars, pistol combat with ammo and reload, district reputation that turns gold on the live minimap, getaway ratings (CLEAN / MESSY / CHAOS), a HUD with cash, wanted stars, ammo, health and a CAR speed panel, start / pause / busted / wasted / done screens, a localStorage save of best cash and jobs done, and synthesized WebAudio sounds (shots, sirens, pickups, crashes) with no audio files.

## Controls

WASD / arrows — move and drive · E — steal a car / get out · Click / Space — shoot · R — reload · P — pause · Enter — start / retry

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/dossier.json plus the game and screenshots
```

`main.ts` runs on Node 22, standard library only, no network. It resolves paths against its own directory, never the working directory, and writes byte-identical output on every run. Open `game/index.html` in a browser to play (or `node serve.ts` for a local static server).

---

<sub>Entered on [make.fun](https://make.fun/?ref=1nmmcbpw&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
