'use client';

import { useState } from 'react';

import Link from 'next/link';

import {
  Wrench,
  Code2,
  FileCode,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

export default function DeveloperResourcesSection() {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  const codeExample = `// ${t('docs.developer.codeExample.comment') || '获取 ETH/USD 价格数据'}
const response = await fetch(
  '/api/prices?symbol=ETH/USD&providers=chainlink,pyth'
);
const data = await response.json();

console.log(data.price); // 3456.78
console.log(data.change24h); // 2.45`;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resources = [
    {
      icon: <Code2 className="w-6 h-6" />,
      title: t('docs.developer.integration.title') || '集成指南',
      description:
        t('docs.developer.integration.description') ||
        '了解如何将 Insight API 集成到您的应用程序中',
      href: '#integration',
      external: false,
    },
    {
      icon: <FileCode className="w-6 h-6" />,
      title: t('docs.developer.examples.title') || '代码示例',
      description:
        t('docs.developer.examples.description') || '查看各种编程语言的 API 调用示例代码',
      href: '#examples',
      external: false,
    },
    {
      icon: <HelpCircle className="w-6 h-6" />,
      title: t('docs.developer.faq.title') || '常见问题',
      description: t('docs.developer.faq.description') || '查看开发者常见问题和解决方案',
      href: '#faq',
      external: false,
    },
  ];

  const faqs = [
    {
      question: t('docs.developer.faq.q1.question') || 'API 调用频率限制是多少？',
      answer:
        t('docs.developer.faq.q1.answer') ||
        '免费用户每分钟最多 100 次请求，专业用户每分钟 1000 次请求。如需更高配额，请联系我们。',
    },
    {
      question: t('docs.developer.faq.q2.question') || '支持哪些数据格式返回？',
      answer:
        t('docs.developer.faq.q2.answer') ||
        'API 默认返回 JSON 格式数据。部分接口支持通过 Accept 头指定 CSV 格式。',
    },
    {
      question: t('docs.developer.faq.q3.question') || '如何获取 API 密钥？',
      answer:
        t('docs.developer.faq.q3.answer') ||
        '注册账号后，在设置页面的 API 密钥部分可以生成和管理您的 API 密钥。',
    },
  ];

  return (
    <section id="developer" className="py-16 scroll-mt-20 border-t border-gray-200">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Wrench className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t('docs.developer.title') || '开发者资源'}
          </h2>
        </div>
        <p className="text-gray-600 leading-relaxed">
          {t('docs.developer.description') || '为开发者提供的集成指南和技术支持。'}
        </p>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {resources.map((resource, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
          >
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4">
              {resource.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{resource.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{resource.description}</p>
            <Link
              href={resource.href}
              className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
            >
              {t('docs.developer.learnMore') || '了解更多'}
              {resource.external ? (
                <ExternalLink className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </Link>
          </div>
        ))}
      </div>

      {/* Code Example */}
      <div className="bg-gray-900 rounded-xl p-6 mb-10 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-semibold">
              {t('docs.developer.codeExample.title') || '代码示例'}
            </h3>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-400">{t('docs.developer.copied') || '已复制'}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>{t('docs.developer.copy') || '复制'}</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <pre className="text-gray-300">
            <code>{codeExample}</code>
          </pre>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {t('docs.developer.faq.title') || '常见问题'}
        </h3>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
              <h4 className="font-medium text-gray-900 mb-2">{faq.question}</h4>
              <p className="text-sm text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
