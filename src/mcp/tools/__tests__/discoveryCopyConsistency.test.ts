/**
 * @jest-environment node
 */

/**
 * Guards every agent-facing discovery surface against drift from the live MCP
 * catalog. The failure mode this test targets is real: the tool code and
 * `tools/list` moved to the consolidated 20-name catalog and the
 * PASS/CAUTION/DANGER/BLOCK verdicts, while static copy (agent card, skill
 * manual, x402 manifest, server card, 402 bazaar descriptions) kept the older
 * pre-merge names and verdicts.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { getX402Config } from '@/lib/api/x402/config';
import { buildX402DiscoveryManifest } from '@/lib/api/x402/discoveryManifest';

import catalog from '../generatedCatalog.json';

type CatalogEntry = {
  deprecated?: { sunset: string; replacedBy: string; preferredOp?: string };
  description: string;
  name: string;
  pricing?: { credits: number; usd: string };
};

const entries = catalog as CatalogEntry[];

const PRODUCT_NAMES = ['trade_guard', 'trade_proof', 'oracle_watch_window', 'position_lifecycle'];

const ALIAS_NAMES = [
  'get_oracle_price',
  'get_price_analytics',
  'get_oracle_health',
  'search_oracle_registry',
  'get_market_quote',
  'check_trade_safety',
  'begin_trade_evidence',
  'prepare_swap',
  'prepare_perp_order',
  'issue_execution_receipt',
  'verify_evidence',
  'oracle_watch',
  'oracle_watch_window_begin',
  'oracle_watch_window_control',
  'position_lifecycle_begin',
  'position_lifecycle_step',
];

const ALL_NAMES = [...PRODUCT_NAMES, ...ALIAS_NAMES];
const SUNSET = '2027-01-06';

function readPublicFile(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function entryByName(name: string): CatalogEntry {
  const found = entries.find((entry) => entry.name === name);
  if (!found) throw new Error(`Missing catalog entry: ${name}`);
  return found;
}

function expectNoStaleSafetyVerdicts(text: string, surface: string): void {
  expect({ surface, warn: /\bWARN\b/.test(text) }).toEqual({ surface, warn: false });
  expect({ surface, allow: /\bALLOW\b/.test(text) }).toEqual({ surface, allow: false });
  expect({ surface, ready: /\bREADY\b/.test(text) }).toEqual({ surface, ready: false });
}

describe('MCP catalog shape', () => {
  it('exposes exactly 20 discoverable names: 4 products plus 16 aliases', () => {
    expect(entries).toHaveLength(20);
    expect(entries.map((entry) => entry.name).sort()).toEqual([...ALL_NAMES].sort());
    expect(
      entries
        .filter((entry) => !entry.deprecated)
        .map((entry) => entry.name)
        .sort()
    ).toEqual([...PRODUCT_NAMES].sort());
    expect(entries.filter((entry) => entry.deprecated)).toHaveLength(16);
  });

  it('sets the same sunset date on every alias and names its replacement', () => {
    for (const alias of ALIAS_NAMES) {
      const entry = entryByName(alias);
      expect(entry.deprecated?.sunset).toBe(SUNSET);
      expect(PRODUCT_NAMES).toContain(entry.deprecated?.replacedBy);
    }
  });

  it('prices the four MCP products without the REST C3 $0.02 price', () => {
    expect(PRODUCT_NAMES.map((name) => entryByName(name).pricing?.usd)).toEqual([
      '0.040',
      '0.040',
      '0.500',
      '0.550',
    ]);
    for (const name of PRODUCT_NAMES) {
      expect(entryByName(name).pricing?.usd).not.toBe('0.02');
    }
  });

  it('describes check_safety with PASS/CAUTION/DANGER/BLOCK only', () => {
    for (const name of ['trade_guard', 'check_trade_safety']) {
      const { description } = entryByName(name);
      expect(description).toContain('PASS/CAUTION/DANGER/BLOCK');
      expectNoStaleSafetyVerdicts(description, `catalog:${name}`);
    }
  });

  it('keeps the generated server card in sync with the catalog descriptions', () => {
    const serverCard = JSON.parse(readPublicFile('public/.well-known/mcp/server-card.json')) as {
      tools: Array<{ description: string; name: string }>;
    };
    expect(serverCard.tools.map((tool) => tool.name).sort()).toEqual([...ALL_NAMES].sort());
    for (const tool of serverCard.tools) {
      expect(tool.description).toBe(entryByName(tool.name).description);
    }
    expect(serverCard.tools.find((tool) => tool.name === 'trade_guard')?.description).not.toContain(
      'READY/CAUTION/BLOCK'
    );
  });
});

describe('static discovery surfaces', () => {
  it('agent card carries the 20 names, sunset, verdicts and REST-only $0.02 label', () => {
    const raw = readPublicFile('public/.well-known/agent-card.json');
    expect(raw).not.toMatch(/\bWARN\b/);
    expect(raw).toContain(SUNSET);
    for (const name of ALL_NAMES) {
      expect(raw).toContain(name);
    }

    const card = JSON.parse(raw) as {
      description: string;
      skills: Array<{ description: string; id: string }>;
    };
    expect(card.description).toContain('PASS/CAUTION/DANGER/BLOCK');
    const preTrade = card.skills.find((skill) => skill.id === 'pre_trade_safety_check');
    expect(preTrade?.description).toContain('PASS/CAUTION/DANGER/BLOCK');
    expect(preTrade?.description).toContain('REST route /api/v1/safety/pre-trade');
    expect(preTrade?.description).toContain('$0.040');
    if (preTrade) expectNoStaleSafetyVerdicts(preTrade.description, 'agent-card:pre_trade');
  });

  it('skill manual carries the 20 names, sunset and PASS/CAUTION/DANGER/BLOCK', () => {
    const raw = readPublicFile('public/skill.md');
    expect(raw).not.toMatch(/\bWARN\b/);
    expect(raw).toContain('PASS / CAUTION / DANGER / BLOCK');
    expect(raw).toContain(SUNSET);
    for (const name of ALL_NAMES) {
      expect(raw).toContain(name);
    }
    expect(raw).toContain('not the MCP `trade_guard` price');
  });

  it('x402 manifest advertises the consolidated catalog, not the pre-merge alias', () => {
    const manifest = JSON.parse(
      readPublicFile('src/lib/api/x402/discoveryManifest.template.json')
    ) as {
      resources: Array<{ accepts: Array<{ amount: string }>; description: string; url: string }>;
    };
    const mcp = manifest.resources.find((resource) => resource.url.endsWith('/api/mcp'));
    expect(mcp).toBeDefined();
    const description = mcp?.description ?? '';
    expect(description).not.toContain('prepare_base_agent_swap_guard');
    expect(description).not.toContain('C3 anchor');
    expect(description).not.toMatch(/\bALLOW\b/);
    expect(description).toContain('PASS, CAUTION, DANGER or BLOCK');
    expect(description).toContain(SUNSET);
    expect(description).toContain('not the MCP trade_guard safety-op price');
    // The shelf quote is the flagship check_safety op (C4, $0.040), not C3.
    expect(mcp?.accepts[0]?.amount).toBe('40000');
  });

  it('runtime discovery manifest quotes the /api/mcp shelf at $0.040, not the C3 default', () => {
    const config = getX402Config({
      X402_ENABLED: 'true',
      X402_PAY_TO: '0x5FBbbCbF2Ade44F5c604E5E55f11945E1ADdD231',
      X402_NETWORK: 'eip155:8453',
      X402_AMOUNT: '0.02',
    } as NodeJS.ProcessEnv);
    const manifest = buildX402DiscoveryManifest(config) as {
      resources: Array<{
        accepts: Array<{ amount: string; assetDecimals: number }>;
        url: string;
      }>;
    };
    const mcp = manifest.resources.find((resource) => resource.url.endsWith('/api/mcp'));
    expect(mcp).toBeDefined();
    expect(mcp?.accepts.length).toBeGreaterThan(0);
    for (const accept of mcp?.accepts ?? []) {
      expect(Number(accept.amount) / 10 ** accept.assetDecimals).toBeCloseTo(0.04, 9);
    }
  });

  it('/pricing states the MCP batch cap and the actual settlement rails', () => {
    const raw = readPublicFile('src/app/pricing/page.tsx');
    expect(raw).toContain('MCP accepts at most 10 assets');
    expect(raw).not.toContain('20-asset cap costs 40');
    expect(raw).not.toContain('settled in USDC on Base');
    expect(raw).toContain('eip155:999');
    expect(raw).toContain('eip155:8453');
    expect(raw).toContain('Solana mainnet');
  });

  it('README does not present a single settlement rail as the current one', () => {
    const raw = readPublicFile('README.md');
    expect(raw).not.toContain('Current x402 rail:');
    expect(raw).toContain('the live 402 `accepts[]` is authoritative');
  });

  it('402 bazaar description for check_safety uses the product description', () => {
    // The live challenge copies trade_guard.description into the MCP discovery
    // extension, so the generated catalog text is the bazaar surface.
    const description = entryByName('trade_guard').description;
    expect(description).toContain(
      'PASS/CAUTION/DANGER/BLOCK verdict with reasons for check_safety'
    );
    expect(description).not.toContain('READY/CAUTION/BLOCK');
  });
});
