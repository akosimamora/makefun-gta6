# SOLMARA — A Sun-Soaked Crime Story

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/akosimamora/makefun-gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/akosimamora/makefun-gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmara is a playable open-world crime game in the browser: a coastal city of five districts that Mara Voss, wheelwoman for hire, works on foot and behind the wheel. Steal cars, outrun the police, dodge the helicopter spotlight, and run four chained jobs for the fixer Elias Kross — from a quiet courier run in Marina Bay to the Golden Palm vault heist.

## What is in the city

- **Five districts** (Palmera Heights, Marina Bay, Golden Palm, Dockside, Sol Tower) on a 3200×2400 map with a beach and water on the west edge, a grid of avenues, and a plaza under Sol Tower.
- **On foot and by car**: walk with WASD, press E to steal the nearest car and drive it, E again to step out. Cars accelerate, turn, and reverse; traffic cruises the avenues.
- **Living streets**: 22 traffic cars and 28 pedestrians wander the city; running one over in a stolen car raises the heat.
- **Wanted 0–5**: stealing, shooting, and hit-and-runs raise your stars. Foot cops chase you down, patrol cars ram, and at 3 stars a helicopter circles overhead with a spotlight. Lay low and the heat decays.
- **Combat**: click or Space to fire the pistol (12 rounds, R reloads). Cops go down, but every shot is a star.
- **Four chained missions**: The Courier, Dockside Pickup, The Tail, and The Big One — each with a payout, a gold marker on the map, and a getaway rating (CLEAN / MESSY / CHAOS) based on how hot you ran.
- **HUD + minimap**: cash, district name, wanted stars, HP and ammo, the current job, a live CAR panel with speed, and a minimap where finished districts turn gold with REP.
- **Save**: cash, jobs done, best getaway, and district REP persist in localStorage.
- **Sound**: every effect is a WebAudio synth — no audio files.

## Controls

WASD / arrows — move or drive · Mouse — aim · Click / Space — shoot · E — steal / exit car · R — reload · P — pause · Enter — start / retry

## Run it

```sh
mkdir -p /tmp/solmara-out && MAKEFUN_OUTPUT_DIR=/tmp/solmara-out node main.ts
# writes /tmp/solmara-out/dossier.json plus the game and screenshots
```

`main.ts` runs on Node 22, standard library only, no network. It resolves the game and screenshots against its own directory, never the working directory, and writes byte-identical output on every run. Serve `game/` over HTTP (for example `python3 -m http.server`) and open `game/index.html` to play.

---

<sub>Entered on [make.fun](https://make.fun/?ref=1nmmcbpw&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
