// Assemble the Solmara submission: stage the game and screenshots, then write the dossier.
import { cpSync as duplicate, mkdirSync as ensureDir, readdirSync as readNames, statSync as statOf, writeFileSync as writeOut } from 'node:fs';
import { dirname as parentOf, join as joinPath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const srcRoot = parentOf(fileURLToPath(import.meta.url));
const destPath = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Pre-flight check: at most 4 screenshots, each at most 256 KiB.
function auditScreenshots(folder: string): string[] {
  const imageFiles = readNames(folder).filter((name) => /\.(png|jpe?g)$/i.test(name)).sort();
  if (imageFiles.length === 0) throw new Error(`no screenshots found in ${folder}`);
  if (imageFiles.length > 4) throw new Error(`${imageFiles.length} screenshots in ${folder}, at most 4 allowed`);
  for (const name of imageFiles) {
    const byteCount = statOf(joinPath(folder, name)).size;
    if (byteCount > 262144) throw new Error(`screenshot ${name} is ${byteCount} bytes, over the 256 KiB limit`);
  }
  return imageFiles;
}

function main(): void {
  ensureDir(destPath, { recursive: true });
  duplicate(joinPath(srcRoot, 'game'), joinPath(destPath, 'game'), { recursive: true });
  const imageDir = joinPath(srcRoot, 'screenshots');
  const imageFiles = auditScreenshots(imageDir);
  for (const name of imageFiles) {
    duplicate(joinPath(imageDir, name), joinPath(destPath, name));
  }
  const dossier = buildDossier(srcRoot, {
    text_max_bytes: 100000,
    screenshots: { max: 4, max_bytes: 262144 },
    game_path_max_bytes: 1000,
  });
  writeOut(joinPath(destPath, 'dossier.json'), dossier);
}

main();
