import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const maxGzipKb = Number(process.env.HOME_JS_BUDGET_KB ?? 375);
// CI sets this so a Next.js output-layout change can never silently drop the
// gate. Deploy-target builds (Vercel) only warn: a reporting script must not
// be able to block a production release on its own.
const requireArtifact = process.env.HOME_JS_BUDGET_REQUIRE_ARTIFACT === '1';

function collectRouteCacheHomepages(directory, depth = 0) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  if (depth > 6) return [];

  const results = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectRouteCacheHomepages(path, depth + 1));
      continue;
    }
    if (entry.name !== 'index.html' && entry.name !== 'index.body') continue;
    // Only the root route's artifact: either directly under route-cache or
    // inside the "$" segment, depending on the Next.js version.
    const dirs = relative('.next/server/route-cache', path).split(sep).slice(0, -1);
    if (dirs.length === 0 || dirs[0] === '$') results.push(path);
  }
  return results;
}

// ISR pages may be written under .next/server/route-cache instead of
// .next/server/app, and deploy targets relocate the build output again.
const routeCacheHomepages = collectRouteCacheHomepages('.next/server/route-cache');
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
  const layout = ['.next/server/app', '.next/server/route-cache']
    .map((dir) => {
      try {
        return `${dir}: ${readdirSync(dir).slice(0, 20).join(', ')}`;
      } catch {
        return `${dir}: (absent)`;
      }
    })
    .join('\n  ');
  const message = `Bundle budget could not find the homepage HTML in ${htmlCandidates.join(', ')}.\n  ${layout}`;
  if (requireArtifact) {
    console.error(message);
    process.exit(1);
  }
  console.warn(
    `[warn] ${message}\n[warn] Skipping the homepage bundle budget for this build; CI enforces it.`
  );
  process.exit(0);
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
