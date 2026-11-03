import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { format, resolveConfig } from 'prettier';

import { getToolDefinitions } from '../src/mcp/tools';

const repositoryRoot = new URL('../', import.meta.url);
const catalogPath = fileURLToPath(new URL('src/mcp/tools/generatedCatalog.json', repositoryRoot));
const serverCardPath = fileURLToPath(
  new URL('public/.well-known/mcp/server-card.json', repositoryRoot)
);

const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const check = args.has('--check');

if (write === check || [...args].some((arg) => arg !== '--write' && arg !== '--check')) {
  throw new Error('Use exactly one supported option: --write or --check');
}

type ServerCard = Record<string, unknown> & { tools?: unknown };

function catalogSource(catalog: ReturnType<typeof getToolDefinitions>): string {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

async function writeOrCheck(path: string, expected: string): Promise<boolean> {
  let current: string | null = null;
  try {
    current = await readFile(path, 'utf8');
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
      throw error;
    }
  }

  if (current === expected) return false;
  if (check) return true;
  await writeFile(path, expected, 'utf8');
  return false;
}

async function formatArtifact(source: string, path: string): Promise<string> {
  const config = await resolveConfig(path);
  return format(source, { ...(config ?? {}), filepath: path });
}

const catalog = getToolDefinitions();
const serverCard = JSON.parse(await readFile(serverCardPath, 'utf8')) as ServerCard;
serverCard.tools = catalog;

const stale = await Promise.all([
  writeOrCheck(catalogPath, await formatArtifact(catalogSource(catalog), catalogPath)),
  writeOrCheck(
    serverCardPath,
    await formatArtifact(`${JSON.stringify(serverCard, null, 2)}\n`, serverCardPath)
  ),
]);

if (check && stale.some(Boolean)) {
  throw new Error(
    'MCP catalog artifacts are stale; run `npm run generate:mcp-catalog` and commit the results.'
  );
}
