import { type NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('DeFiLlamaProxyAPI');

const DEFILLAMA_API_BASE = 'https://api.llama.fi';

/**
 * DeFiLlama API 代理路由
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
    const targetUrl = new URL(`${DEFILLAMA_API_BASE}/${pathStr}`);
    searchParams.forEach((value, key) => {
      targetUrl.searchParams.append(key, value);
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
