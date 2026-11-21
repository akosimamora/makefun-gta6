// Bundle Solmara for the judges: stage the game, check the screenshots, write the dossier.
import { existsSync, mkdirSync, cpSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const baseDir = dirname(fileURLToPath(import.meta.url));
const targetDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Guard the screenshots before anything is copied: the folder must exist,
// hold 1-4 pictures, and every picture must fit the 256 KiB cap.
function checkPictures(folder: string): void {
  if (!existsSync(folder)) throw new Error(`checkPictures: no screenshots folder at ${folder}`);
  const pictureFiles = readdirSync(folder).filter((name) => /\.(png|jpe?g)$/i.test(name));
  if (pictureFiles.length === 0) throw new Error('checkPictures: no screenshots found');
  if (pictureFiles.length > 4) throw new Error(`checkPictures: ${pictureFiles.length} screenshots, at most 4 allowed`);
  for (const name of pictureFiles) {
    const sizeBytes = statSync(join(folder, name)).size;
    if (sizeBytes > 262144) throw new Error(`checkPictures: ${name} is ${sizeBytes} bytes, over the 262144-byte cap`);
  }
}

const pictureDir = join(baseDir, 'screenshots');
checkPictures(pictureDir);

mkdirSync(targetDir, { recursive: true });
cpSync(join(baseDir, 'game'), join(targetDir, 'game'), { recursive: true });
cpSync(join(baseDir, 'screenshots'), join(targetDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(targetDir, {
  text_max_bytes: 200000,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
});
writeFileSync(join(targetDir, 'dossier.json'), dossier);
console.log(`wrote ${join(targetDir, 'dossier.json')} (${dossier.length} bytes)`);
