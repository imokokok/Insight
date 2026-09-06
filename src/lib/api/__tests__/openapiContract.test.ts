import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const ROUTES_ROOT = join(ROOT, 'src/app/api/v1');

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function actualPaths(): string[] {
  return walk(ROUTES_ROOT)
    .filter((path) => path.endsWith(`${sep}route.ts`))
    .map((path) => {
      const route = relative(ROUTES_ROOT, path)
        .slice(0, -`${sep}route.ts`.length)
        .split(sep)
        .map((part) => part.replace(/^\[(.+)\]$/, '{$1}'))
        .join('/');
      return `/${route}`;
    })
    .sort();
}

function documentedPaths(spec: string): string[] {
  return [...spec.matchAll(/^  (\/[^:]+):$/gm)].map((match) => match[1]).sort();
}

describe('OpenAPI contract', () => {
  const spec = readFileSync(join(ROOT, 'public/openapi.yaml'), 'utf8');

  it('documents every production v1 route', () => {
    const explicitlyInternalSamples = new Set([
      '/execution/attestation/sample',
      '/market-reference/sample',
      '/oracle-watch/attestation/sample',
      '/safety/attestation/sample',
    ]);
    const productionPaths = actualPaths().filter((path) => !explicitlyInternalSamples.has(path));
    expect(documentedPaths(spec)).toEqual(productionPaths);
  });

  it('states the same external authentication contract as the v1 middleware', () => {
    expect(spec).toContain('External v1 endpoints accept API keys only');
    expect(spec).not.toContain('Both methods are accepted on most endpoints');
    expect(spec.match(/^\s+- bearer: \[\]$/gm)).toHaveLength(2);
    expect(spec).not.toMatch(/- apiKey: \[\]\n\s+- bearer: \[\]/);
  });
});
