import { type NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('BinanceProxyAPI');

const BINANCE_API_BASE = 'https://api.binance.com';

/**
 * Binance API 代理路由
 * 解决浏览器 CORS 限制问题
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const pathStr = path.join('/');
    const { searchParams } = new URL(request.url);

    // 构建目标 URL
    const targetUrl = new URL(`${BINANCE_API_BASE}/${pathStr}`);
    searchParams.forEach((value, key) => {
      targetUrl.searchParams.append(key, value);
    });

    logger.info(`Proxying request to Binance: ${pathStr}`);

    const response = await fetch(targetUrl.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      logger.error(`Binance API error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Binance API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Binance proxy error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      {
        error: 'Failed to fetch data from Binance',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
