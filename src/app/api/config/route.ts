import { NextResponse } from 'next/server';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ConfigAPI');

// 服务端配置 - 这些不会暴露给客户端
const SERVER_CONFIG = {
  // Alchemy RPC 端点
  alchemy: {
    ethereum: process.env.ALCHEMY_ETHEREUM_RPC || '',
    arbitrum: process.env.ALCHEMY_ARBITRUM_RPC || '',
    polygon: process.env.ALCHEMY_POLYGON_RPC || '',
    base: process.env.ALCHEMY_BASE_RPC || '',
    optimism: process.env.ALCHEMY_OPTIMISM_RPC || '',
    solana: process.env.ALCHEMY_SOLANA_RPC || '',
    bnb: process.env.ALCHEMY_BNB_RPC || '',
  },
  // TRON 配置
  tron: {
    rpcUrl: process.env.TRON_RPC_URL || 'https://api.trongrid.io',
    solidityRpc: process.env.TRON_SOLIDITY_RPC || 'https://api.trongrid.io/walletsolidity',
    fullnodeRpc: process.env.TRON_FULLNODE_RPC || 'https://api.trongrid.io/wallet',
    apiKey: process.env.TRONGRID_API_KEY || '',
  },
  // The Graph 配置
  thegraph: {
    apiKey: process.env.THEGRAPH_API_KEY || '',
  },
  // UMA 配置
  uma: {
    subgraphApiKey: process.env.UMA_SUBGRAPH_API_KEY || '',
  },
  // API3 配置
  api3: {
    marketApiUrl: process.env.API3_MARKET_API_URL || 'https://market.api3.org/api/v1',
    daoApiUrl: process.env.API3_DAO_API_URL || 'https://api.api3.org',
    wsUrl: process.env.API3_WS_URL || 'wss://ws.api3.org',
  },
  // 功能开关
  features: {
    useRealWinklinkData: process.env.USE_REAL_WINKLINK_DATA === 'true',
    useRealChainlinkData: process.env.USE_REAL_CHAINLINK_DATA === 'true',
    useRealTellorData: process.env.USE_REAL_TELLOR_DATA === 'true',
    useRealChronicleData: process.env.USE_REAL_CHRONICLE_DATA === 'true',
    useRealUmaData: process.env.USE_REAL_UMA_DATA === 'true',
    useRealApi3Data: process.env.USE_REAL_API3_DATA === 'true',
  },
  // 缓存配置
  cache: {
    winklinkTtl: parseInt(process.env.WINKLINK_CACHE_TTL || '30000', 10),
    tellorTtl: parseInt(process.env.TELLOR_CACHE_TTL || '60000', 10),
    umaTtl: parseInt(process.env.UMA_CACHE_TTL || '30000', 10),
    chainlinkPriceTtl: parseInt(process.env.CHAINLINK_PRICE_CACHE_TTL || '30000', 10),
    api3PriceTtl: parseInt(process.env.API3_PRICE_CACHE_TTL || '30000', 10),
  },
};

// 客户端可以访问的公开配置
const PUBLIC_CONFIG = {
  features: SERVER_CONFIG.features,
  cache: SERVER_CONFIG.cache,
  api3: {
    marketApiUrl: SERVER_CONFIG.api3.marketApiUrl,
    daoApiUrl: SERVER_CONFIG.api3.daoApiUrl,
    wsUrl: SERVER_CONFIG.api3.wsUrl,
  },
  tron: {
    rpcUrl: SERVER_CONFIG.tron.rpcUrl,
    solidityRpc: SERVER_CONFIG.tron.solidityRpc,
    fullnodeRpc: SERVER_CONFIG.tron.fullnodeRpc,
    // 注意：apiKey 不会暴露
  },
};

/**
 * 获取服务端配置（仅限服务端使用）
 * 这个函数只在服务端组件或 API 路由中使用
 */
export function getServerConfig() {
  return SERVER_CONFIG;
}

/**
 * 获取客户端配置
 * 这个端点返回可以安全暴露给客户端的配置
 */
export async function GET() {
  try {
    logger.info('Fetching public config');

    return NextResponse.json({
      success: true,
      config: PUBLIC_CONFIG,
    });
  } catch (error) {
    logger.error(
      'Failed to fetch config',
      error instanceof Error ? error : new Error(String(error))
    );

    return NextResponse.json({ success: false, error: 'Failed to fetch config' }, { status: 500 });
  }
}
