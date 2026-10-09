import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const maxGzipKb = Number(process.env.HOME_JS_BUDGET_KB ?? 375);

function findRouteCacheHomepages(directory) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries.flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findRouteCacheHomepages(path);
    return path.endsWith(`${sep}$${sep}index.body`) ? [path] : [];
  });
}

const routeCacheHomepages = findRouteCacheHomepages('.next/server/route-cache');
const htmlCandidates = [
  '.next/server/app/index.html',
  '.next/server/app/index.body',
  ...routeCacheHomepages,
  '.vercel/output/static/index.html',
  '.vercel/output/functions/index.prerender-fallback.html',
  '.vercel/output/functions/index.prerender-fallback.body',
];
const htmlPath = htmlCandidates.find((path) => existsSync(path));

if (!htmlPath) {
  console.error(
    `Bundle budget could not find the homepage HTML in ${htmlCandidates.join(', ')}. Run the production build first.`
  );
  process.exit(1);
}

const html = readFileSync(htmlPath, 'utf8');

const chunkUrls = [
  ...new Set(
    [...html.matchAll(/src="\/_next\/(static\/chunks\/[^"?]+\.js)/g)].map((match) => match[1])
  ),
];

const chunkPaths = chunkUrls.map((url) => {
  const candidates = [`.next/${url}`, `.vercel/output/static/_next/${url}`];
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) {
    console.error(
      `Bundle budget could not find homepage chunk ${url} in ${candidates.join(', ')}.`
    );
    process.exit(1);
  }
  return path;
});

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
