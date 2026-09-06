import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const htmlPath = '.next/server/app/index.html';
const maxGzipKb = Number(process.env.HOME_JS_BUDGET_KB ?? 375);

let html;
try {
  html = readFileSync(htmlPath, 'utf8');
} catch {
  console.error(`Bundle budget could not read ${htmlPath}. Run the production build first.`);
  process.exit(1);
}

const chunkPaths = [
  ...new Set(
    [...html.matchAll(/src="\/_next\/(static\/chunks\/[^"?]+\.js)/g)].map(
      (match) => `.next/${match[1]}`
    )
  ),
];

const gzipBytes = chunkPaths.reduce(
  (total, path) => total + gzipSync(readFileSync(path), { level: 9 }).length,
  0
);
const gzipKb = Math.round(gzipBytes / 1024);

console.log(`Homepage initial JavaScript: ${gzipKb} KB gzip across ${chunkPaths.length} chunks`);

if (gzipKb > maxGzipKb) {
  console.error(`Homepage JavaScript exceeds the ${maxGzipKb} KB gzip budget.`);
  process.exit(1);
}
