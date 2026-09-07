/**
 * Pobiera grafiki kafli używanych przez generator do web/tiles/.
 * Grafiki pochodzą z repozytorium AsyncTI4 (te same, których używa bot społeczności).
 *
 *   node scripts/fetch-tile-images.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'web', 'tiles');
const BASE = 'https://raw.githubusercontent.com/AsyncTI4/TI4_map_generator_bot/master/src/main/resources/tiles/';
const CONCURRENCY = 8;

const systems = JSON.parse(fs.readFileSync(path.join(ROOT, 'web', 'data', 'systems.json'), 'utf8'));
const wanted = [...new Set(systems.map((s) => s.image).filter(Boolean))];

fs.mkdirSync(OUT, { recursive: true });

let done = 0, skipped = 0, failed = [];

async function one(name) {
  const dest = path.join(OUT, name);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) { skipped++; return; }
  try {
    const res = await fetch(BASE + encodeURIComponent(name));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    done++;
  } catch (e) {
    failed.push(`${name}: ${e.message}`);
  }
  if ((done + skipped + failed.length) % 25 === 0) {
    process.stdout.write(`\r  ${done + skipped + failed.length}/${wanted.length}`);
  }
}

const queue = wanted.slice();
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await one(queue.pop());
  }),
);

console.log(`\npobrano ${done}, pominięto ${skipped}, błędów ${failed.length}`);
if (failed.length) console.log(failed.slice(0, 20).join('\n'));
