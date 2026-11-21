// Solmara delivery script: it packs the playable game and its screenshots
// into the folder the grader reads, then builds the dossier file that
// describes the entry. Every path is worked out from this file's own
// location, so it does not matter where you run it from.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const destDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Look at the screenshots before anything is copied: the dossier refuses
// an entry with more than four shots or any shot bigger than 256 KiB, so
// it is better to stop here with a plain message than to copy everything
// and only fail at the dossier step.
function checkShots(folder: string): void {
  const shotList = fs.readdirSync(folder).filter((name) => /\.(jpe?g|png)$/i.test(name));
  if (shotList.length > 4) {
    throw new Error(`found ${shotList.length} screenshots in ${folder}, but only 4 are allowed: ${shotList.join(', ')}`);
  }
  for (const name of shotList) {
    const size = fs.statSync(path.join(folder, name)).size;
    if (size > 262144) {
      throw new Error(`screenshot ${name} is ${size} bytes, over the 262144 byte limit`);
    }
  }
}

checkShots(path.join(projectDir, 'screenshots'));

fs.mkdirSync(destDir, { recursive: true });
fs.cpSync(path.join(projectDir, 'game'), path.join(destDir, 'game'), { recursive: true });
fs.cpSync(path.join(projectDir, 'screenshots'), path.join(destDir, 'screenshots'), { recursive: true });

const dossierBytes = buildDossier(projectDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
});
fs.writeFileSync(path.join(destDir, 'dossier.json'), dossierBytes);
