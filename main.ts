// Solmara for make.fun's gta6-01 (Node 22, standard library only). The game is
// the game/ folder beside this file — plain static files a desktop browser
// loads offline (game/index.html and its ES modules, no library, no network
// request) — and this program hands it in. It copies game/ and screenshots/
// into the output directory and writes dossier.json, the summary the judge
// reads, using the vendored make.fun library. The caps are the scorer's own
// (from the competition's gate.json): text_max_bytes shapes the dossier's
// text; the rest refuse an entry the scorer would refuse.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the game itself with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Resolve against this file, never the working directory: the grader runs
// from its own directory, and a relative path would point nowhere.
const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's caps (reference/gate.json): at most 4 screenshots of 256 KiB
// each; game/ at most 993 files and directories and 48 MiB in all, no path
// over 1000 bytes; the dossier's text at most 160 KiB. Passing them here
// makes this program fail exactly where the scorer would.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
