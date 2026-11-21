# SOLMARA — A Sun-Soaked Crime Story

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/akosimamora/makefun-gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/akosimamora/makefun-gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game set in Solmara, a sun-soaked coastal city with five districts. You are Mara Voss, a wheelwoman who takes four jobs from the fixer Elias Kross: steal a car and bring it to the Marina, grab the Golden Palm's vault cash, lose a three-star police chase on the way to the Docks safehouse, and finally settle things with Kross himself at Sol Tower.

## How it plays

- **On foot or by car** — walk the streets with WASD, press E near any car to steal it, then drive with the same keys.
- **Traffic and pedestrians** — 22 AI cars cruise the road grid and 28 pedestrians walk the sidewalks.
- **Wanted level** — stealing cars and firing your pistol raises the heat from 0 to 5 stars. Foot cops come first, patrol cars join at two stars, and a police helicopter with a spotlight hunts you from three stars up.
- **Combat** — click or press Space to shoot (12 rounds, R reloads).
- **Missions and story** — four chained jobs with a gold target pillar on the map; finishing a job turns its district gold on the minimap and rates your getaway CLEAN, MESSY or CHAOS.
- **HUD and minimap** — cash, jobs done, health, ammo, a live minimap with the mission marker and police blips, and a CAR panel with speed and car health while driving.
- **Save** — best cash and jobs done persist in localStorage; WebAudio synth sounds throughout (M mutes).

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/dossier.json plus the game and screenshots
```

Serve `game/` over any static server for the playable build (for example `npx serve game`), or open `game/index.html` through a local server. Node 22, standard library only, no network. Screenshot scenes are staged with `?shot=chase|city|heist|start`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=1nmmcbpw&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
