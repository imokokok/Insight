import { type NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('DeFiLlamaProxyAPI');

const DEFILLAMA_API_BASE = 'https://api.llama.fi';

const ALLOWED_PATHS = [
  'protocols',
  'protocol',
  'chains',
  'chain',
  'stablecoins',
  'stablecoin',
  'yields',
  'chart',
  'summary',
  'tvl',
  'fees',
  'revenue',
];

const BLOCKED_PATTERNS = [
  /\.\./,
  /@/,
  /\.\//,
  /\.\.\//,
  /%2e%2e/i,
  /%40/i,
  /localhost/i,
  /127\.0\.0\.1/i,
  /192\.168\./i,
  /10\.\d+\.\d+\.\d+/i,
  /172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+/i,
];

function isPathAllowed(pathStr: string): boolean {
  const normalizedPath = pathStr.toLowerCase().trim();

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalizedPath)) {
      return false;
    }
  }

  const pathParts = normalizedPath.split('/');
  if (pathParts.length > 0) {
    const basePath = pathParts[0];
    for (const allowed of ALLOWED_PATHS) {
      if (basePath === allowed.toLowerCase()) {
        return true;
      }
    }
  }

  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const pathStr = path.join('/');

    if (!isPathAllowed(pathStr)) {
      logger.warn(`Blocked unauthorized proxy path: ${pathStr}`);
      return NextResponse.json({ error: 'Path not allowed' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    const targetUrl = new URL(`${DEFILLAMA_API_BASE}/${pathStr}`);
    searchParams.forEach((value, key) => {
      if (key && value && !key.includes('..') && !value.includes('..')) {
        targetUrl.searchParams.append(key, value);
      }
    });

    logger.info(`Proxying request to DeFiLlama: ${pathStr}`);

    const response = await fetch(targetUrl.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      logger.error(`DeFiLlama API error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `DeFiLlama API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    logger.error(
      'DeFiLlama proxy error:',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      {
        error: 'Failed to fetch data from DeFiLlama',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
