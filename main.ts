// Pack Solmara for judging: copy the game and its screenshots into the
// output folder, then emit the dossier the make.fun library builds.
import { cpSync as copyTree, mkdirSync as makeDir, readdirSync as listDir, statSync as fileInfo, writeFileSync as saveFile } from 'node:fs';
import { dirname as dirOf, join as joinPath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const workDir = dirOf(fileURLToPath(import.meta.url));
const outPath = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail early with a plain message when the screenshots break the entry
// rules, instead of letting the dossier reject the whole entry later.
function validateImages(folder: string): void {
  const shotDir = joinPath(workDir, folder);
  const shotNames = listDir(shotDir).filter((name) => /\.(jpe?g|png)$/i.test(name));
  if (shotNames.length > 4) {
    throw new Error(`too many screenshots: ${shotNames.length} (max 4): ${shotNames.join(', ')}`);
  }
  for (const name of shotNames) {
    const fileSize = fileInfo(joinPath(shotDir, name)).size;
    if (fileSize > 262144) {
      throw new Error(`screenshot ${name} is ${fileSize} bytes (max 262144)`);
    }
  }
}

validateImages('screenshots');

makeDir(outPath, { recursive: true });
copyTree(joinPath(workDir, 'game'), joinPath(outPath, 'game'), { recursive: true });
copyTree(joinPath(workDir, 'screenshots'), joinPath(outPath, 'screenshots'), { recursive: true });
saveFile(joinPath(outPath, 'dossier.json'), buildDossier(workDir, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 } }));
