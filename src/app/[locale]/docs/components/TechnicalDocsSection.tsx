'use client';

import Link from 'next/link';

import { Code, BookOpen, Server, Database, ArrowRight, Layers, Zap } from 'lucide-react';

import { useTranslations } from '@/i18n';

export default function TechnicalDocsSection() {
  const t = useTranslations();

  const docs = [
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: t('docs.technical.methodology.title') || '数据方法论',
      description:
        t('docs.technical.methodology.description') ||
        '了解我们如何聚合、验证和计算价格数据的完整方法论',
      href: '#methodology',
      tags: [
        t('docs.technical.methodology.tag1') || '价格聚合',
        t('docs.technical.methodology.tag2') || '异常检测',
      ],
    },
    {
      icon: <Server className="w-6 h-6" />,
      title: t('docs.technical.api.title') || 'API 文档',
      description:
        t('docs.technical.api.description') ||
        '查看完整的 API 接口文档，包括价格查询、历史数据等接口',
      href: '#api',
      tags: [
        t('docs.technical.api.tag1') || 'REST API',
        t('docs.technical.api.tag2') || 'WebSocket',
      ],
    },
    {
      icon: <Layers className="w-6 h-6" />,
      title: t('docs.technical.architecture.title') || '系统架构',
      description:
        t('docs.technical.architecture.description') ||
        '了解平台的技术架构设计，包括数据流、缓存策略等',
      href: '#architecture',
      tags: [
        t('docs.technical.architecture.tag1') || '前端架构',
        t('docs.technical.architecture.tag2') || '数据层',
      ],
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: t('docs.technical.dataSources.title') || '数据源',
      description:
        t('docs.technical.dataSources.description') || '查看支持的所有预言机和区块链网络列表',
      href: '#datasources',
      tags: [
        t('docs.technical.dataSources.tag1') || '预言机',
        t('docs.technical.dataSources.tag2') || '区块链',
      ],
    },
  ];

  return (
    <section id="technical" className="py-16 scroll-mt-20 border-t border-gray-200">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <Code className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t('docs.technical.title') || '技术文档'}
          </h2>
        </div>
        <p className="text-gray-600 leading-relaxed">
          {t('docs.technical.description') || '了解 Insight 平台的技术实现细节。'}
        </p>
      </div>

      {/* Technical Docs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {docs.map((doc, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 flex-shrink-0">
                {doc.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{doc.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{doc.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {doc.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <Link
                  href={doc.href}
                  className="inline-flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
                >
                  {t('docs.technical.readMore') || '查看详情'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* API Preview */}
      <div className="mt-8 bg-gray-900 rounded-xl p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h3 className="text-white font-semibold">
              {t('docs.technical.apiPreview.title') || 'API 示例'}
            </h3>
          </div>
          <Link href="#api" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            {t('docs.technical.apiPreview.viewAll') || '查看全部'}
          </Link>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-400">{t('docs.technical.apiPreview.method') || 'GET'}</span>
            <span className="text-blue-400">
              {t('docs.technical.apiPreview.endpoint') || '/api/prices?symbol=ETH/USD'}
            </span>
          </div>
          <div className="text-gray-400 mb-2">
            {t('docs.technical.apiPreview.description') || '获取指定交易对的实时价格数据'}
          </div>
          <pre className="text-gray-300">
            {`{
  "symbol": "ETH/USD",
  "price": 3456.78,
  "timestamp": "2024-01-15T10:30:00Z",
  "source": "chainlink",
  "confidence": 0.98,
  "change24h": 2.45
}`}
          </pre>
        </div>
      </div>
    </section>
  );
}
