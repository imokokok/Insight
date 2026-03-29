import HomeContent from './HomeContent';

import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isZh = locale === 'zh-CN';

  return {
    title: isZh ? 'Insight - 预言机数据平台' : 'Insight - Oracle Data Platform',
    description: isZh
      ? '全面分析和比较主流预言机协议。实时监控价格数据，评估协议性能，助力 Web3 开发者和分析师做出明智决策。'
      : 'Comprehensive analysis and comparison of major oracle protocols. Real-time price monitoring, protocol performance evaluation for Web3 developers and analysts.',
    keywords: isZh
      ? ['预言机', 'oracle', 'chainlink', 'pyth', '价格数据', '区块链', 'DeFi', '数据分析']
      : ['oracle', 'chainlink', 'pyth', 'price data', 'blockchain', 'DeFi', 'data analytics'],
    openGraph: {
      title: isZh ? 'Insight - 预言机数据平台' : 'Insight - Oracle Data Platform',
      description: isZh
        ? '全面分析和比较主流预言机协议。实时监控价格数据，评估协议性能。'
        : 'Comprehensive analysis and comparison of major oracle protocols.',
      type: 'website',
      locale: isZh ? 'zh_CN' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: isZh ? 'Insight - 预言机数据平台' : 'Insight - Oracle Data Platform',
      description: isZh
        ? '全面分析和比较主流预言机协议。实时监控价格数据，评估协议性能。'
        : 'Comprehensive analysis and comparison of major oracle protocols.',
    },
  };
}

export default function HomePage() {
  return <HomeContent />;
}
