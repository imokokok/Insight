import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

import { sanitizeChain } from '@/lib/security/inputSanitizer';

/**
 * Guard for chain values shown in docs and worked examples.
 *
 * Docs are customer-facing API contracts: a copy/pasted `"chain":"hyperevm"`
 * example must actually pass the same validation the endpoint applies. This
 * test scans the docs trees for `chain` assignments and fails on any value
 * that `sanitizeChain` would reject, so an unimplemented chain name cannot
 * reach the docs ahead of the implementation again.
 */
const DOC_ROOTS = ['src/app/docs', 'docs'] as const;
const EXTRA_DOC_FILES = ['public/llms.txt', 'public/openapi.yaml'] as const;
const DOC_EXTENSIONS = new Set(['.tsx', '.md', '.mdx']);

/** `chain: "base"`, `"chain":"base"`, `chain='base'` (escaped JSON included). */
const CHAIN_ASSIGNMENT = /\bchain\s*["']?\s*[:=]\s*["']([A-Za-z0-9_-]+)["']/g;
/** Query-string form used in curl examples: `?chain=base` / `&chain=base`. */
const CHAIN_QUERY = /[?&]chain=([A-Za-z0-9_-]+)/g;

export function extractChainValues(source: string): string[] {
  // TSX examples embed JSON in string literals; normalise \" so one pattern covers both.
  const normalised = source.replace(/\\"/g, '"');
  return [...normalised.matchAll(CHAIN_ASSIGNMENT), ...normalised.matchAll(CHAIN_QUERY)].map(
    (match) => match[1]
  );
}

function listDocFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      listDocFiles(full, acc);
    } else if (DOC_EXTENSIONS.has(extname(entry.name))) {
      acc.push(full);
    }
  }
  return acc;
}

interface ChainValue {
  file: string;
  line: number;
  value: string;
}

function collectChainValues(): ChainValue[] {
  const root = process.cwd();
  const files = [
    ...DOC_ROOTS.filter((dir) => existsSync(join(root, dir))).flatMap((dir) =>
      listDocFiles(join(root, dir))
    ),
    ...EXTRA_DOC_FILES.filter((file) => existsSync(join(root, file))).map((file) =>
      join(root, file)
    ),
  ];

  const found: ChainValue[] = [];
  for (const file of files) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((text, index) => {
        for (const value of extractChainValues(text)) {
          found.push({ file: file.slice(root.length + 1), line: index + 1, value });
        }
      });
  }
  return found;
}

describe('docs chain values', () => {
  const chainValues = collectChainValues();

  it('scans the docs trees and the x402 reference page', () => {
    expect(chainValues.length).toBeGreaterThan(0);
    expect(chainValues.some(({ file }) => file === 'src/app/docs/x402/page.tsx')).toBe(true);
  });

  it('uses only chain values sanitizeChain accepts', () => {
    const offenders = chainValues
      .filter(({ value }) => sanitizeChain(value) === '')
      .map(({ file, line, value }) => `${file}:${line} chain="${value}"`);
    expect(offenders).toEqual([]);
  });

  it('can go red: the extractor finds an unshipped chain name', () => {
    expect(extractChainValues('{"symbol":"BTC","chain":"hyperevm"}')).toEqual(['hyperevm']);
    expect(extractChainValues("chain: 'base'")).toEqual(['base']);
    expect(extractChainValues('?chain=monad')).toEqual(['monad']);
    expect(sanitizeChain('hyperevm')).toBe('');
    expect(sanitizeChain('base')).toBe('base');
  });
});
