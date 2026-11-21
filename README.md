# SOLMARA — A Sun-Soaked Crime Story

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/akosimamora/makefun-gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/akosimamora/makefun-gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game set in Solmara, a sun-soaked coastal city of five districts. You are Mara Voss, back in town with nowhere to go — and fixer Elias Kross has four jobs for you. Steal cars, dodge the cops, run the Golden Palm vault, and get out clean.

## What is in the game

- **A city to drive and walk**: 3200×2400 of streets, five districts (Palmera Heights, Marina, Old Town, Golden Palm, Docks), 22 AI traffic cars and 28 pedestrians going about their day.
- **Steal and drive anything**: walk up to a car, press E, and it is yours — with the heat that comes with it. Cars have health; wreck one and you are on foot again.
- **Wanted level that fights back**: 0–5 stars. Foot cops chase and shoot, patrol cars ram you off the road, and at 3 stars the helicopter arrives with a spotlight. Heat only cools when no police can see you — that is how you lose them.
- **Four chained missions**: steal wheels for the Marina pickup, grab the vault cash at the Golden Palm, deliver it to Dock 9, then the big one — escape to the safehouse with the whole city looking for you. Each district you finish a job in turns gold on the minimap.
- **Combat**: a pistol with mouse aim, 12 rounds, reload with R. Shooting near witnesses raises heat; taking down a cop raises it more.
- **Getaway rating**: finish all four jobs and the run is graded CLEAN, MESSY or CHAOS by how much heat you carried.
- **HUD, minimap, save and sound**: health and ammo, wanted stars, cash, mission objective, live minimap with police dots and the mission marker, a CAR panel with speed and car health while driving, best cash and jobs done kept in localStorage, and WebAudio synth sounds (gunshots, sirens, pickups, engine).

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# copies game/ + screenshots/ to out/ and writes out/dossier.json
```

Or play it directly: serve `game/` over HTTP (for example `node serve.ts`) and open `http://localhost:8080/` in a desktop browser. WASD to move and drive, E to steal or enter a car, mouse to aim, click or Space to shoot, R to reload, P to pause, Enter to start.

`main.ts` runs on Node 22, standard library only, no network. It resolves paths against its own file, never the working directory, and writes byte-identical output on every run. The city is built from a fixed seed, so every run plays the same Solmara.

---

<sub>Entered on [make.fun](https://make.fun/?ref=1nmmcbpw&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
