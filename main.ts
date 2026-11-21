// Entry point: hand the game in. Copy game/ and screenshots/ from this
// repository to the output directory and write dossier.json with the
// make.fun library. Paths resolve against this file, never the cwd.
import { cpSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Pre-flight check: fail fast with a clear error instead of letting the
// dossier reject the entry after copying (the first build shipped 7
// screenshots and died on screenshots.max). Screenshots are the image
// files in screenshots/: at most 4, each at most 256 KiB (262144 bytes).
const shotsDir = join(repoRoot, 'screenshots');
const shotFiles = readdirSync(shotsDir).filter((f) => /\.(jpe?g|png)$/i.test(f));
if (shotFiles.length > 4) {
  throw new Error(
    `too many screenshots: ${shotFiles.length} (max 4): ${shotFiles.join(', ')}`,
  );
}
for (const f of shotFiles) {
  const bytes = statSync(join(shotsDir, f)).size;
  if (bytes > 262144) {
    throw new Error(`screenshot ${f} is ${bytes} bytes (max 262144)`);
  }
}

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  }),
);
