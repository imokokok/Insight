'use client';

import { useState } from 'react';

import {
  Download,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Github,
  Box,
  Info,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

interface SdkInfo {
  id: string;
  name: string;
  language: string;
  version: string;
  description: string;
  installCommand: string;
  npmUrl: string;
  githubUrl: string;
  docsUrl: string;
  features: string[];
  status: 'stable' | 'beta' | 'alpha';
}

const sdks: SdkInfo[] = [
  {
    id: 'javascript',
    name: '@api3/contracts',
    language: 'JavaScript/TypeScript',
    version: 'v2.0.0',
    description: 'API3 智能合约 SDK，包含所有合约接口和工具函数',
    installCommand: 'npm install @api3/contracts',
    npmUrl: 'https://www.npmjs.com/package/@api3/contracts',
    githubUrl: 'https://github.com/api3dao/contracts',
    docsUrl: 'https://docs.api3.org/reference/contracts/',
    features: [
      '完整的合约类型定义',
      'TypeScript 支持',
      'Hardhat 插件集成',
      '合约部署脚本',
    ],
    status: 'stable',
  },
  {
    id: 'airnode',
    name: '@api3/airnode-protocol',
    language: 'JavaScript/TypeScript',
    version: 'v0.11.0',
    description: 'Airnode 协议 SDK，用于部署和管理 Airnode',
    installCommand: 'npm install @api3/airnode-protocol',
    npmUrl: 'https://www.npmjs.com/package/@api3/airnode-protocol',
    githubUrl: 'https://github.com/api3dao/airnode',
    docsUrl: 'https://docs.api3.org/airnode/',
    features: [
      'Airnode 部署工具',
      '配置管理',
      'OIS 模板',
      '监控集成',
    ],
    status: 'stable',
  },
  {
    id: 'python',
    name: 'api3-python',
    language: 'Python',
    version: 'v1.2.0',
    description: 'Python SDK，用于与 API3 合约交互',
    installCommand: 'pip install api3-python',
    npmUrl: 'https://pypi.org/project/api3-python/',
    githubUrl: 'https://github.com/api3dao/api3-python',
    docsUrl: 'https://docs.api3.org/reference/python-sdk/',
    features: [
      'Web3.py 集成',
      '异步支持',
      '合约 ABI 封装',
      '类型提示',
    ],
    status: 'stable',
  },
  {
    id: 'go',
    name: 'go-api3',
    language: 'Go',
    version: 'v0.3.0',
    description: 'Go 语言 SDK，用于构建高性能应用',
    installCommand: 'go get github.com/api3dao/go-api3',
    npmUrl: '',
    githubUrl: 'https://github.com/api3dao/go-api3',
    docsUrl: 'https://docs.api3.org/reference/go-sdk/',
    features: [
      '原生 Go 实现',
      '并发安全',
      'ethclient 集成',
      'ABI 编码/解码',
    ],
    status: 'beta',
  },
  {
    id: 'rust',
    name: 'api3-rs',
    language: 'Rust',
    version: 'v0.2.0',
    description: 'Rust SDK，用于构建安全可靠的应用',
    installCommand: 'api3-rs = "0.2"',
    npmUrl: 'https://crates.io/crates/api3-rs',
    githubUrl: 'https://github.com/api3dao/api3-rs',
    docsUrl: 'https://docs.api3.org/reference/rust-sdk/',
    features: [
      '零成本抽象',
      '异步运行时',
      '类型安全',
      'no_std 支持',
    ],
    status: 'alpha',
  },
];

const getStatusBadge = (status: SdkInfo['status']) => {
  switch (status) {
    case 'stable':
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded">
          Stable
        </span>
      );
    case 'beta':
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded">
          Beta
        </span>
      );
    case 'alpha':
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 rounded">
          Alpha
        </span>
      );
  }
};

export function API3SdkDownloads() {
  const t = useTranslations();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (command: string, id: string) => {
    await navigator.clipboard.writeText(command);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-600" />
            {t('api3.developer.sdk.title') || 'SDK 下载'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('api3.developer.sdk.description') || '选择适合您技术栈的 SDK，快速集成 API3'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sdks.map((sdk) => (
            <div key={sdk.id} className="bg-white border border-gray-100 rounded-lg p-4 hover:border-emerald-200 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{sdk.name}</h3>
                    {getStatusBadge(sdk.status)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{sdk.language}</p>
                </div>
                <span className="text-xs font-mono text-gray-400">{sdk.version}</span>
              </div>

              <p className="text-sm text-gray-600 mb-3">{sdk.description}</p>

              <div className="relative bg-gray-900 rounded-lg p-3 mb-3">
                <button
                  onClick={() => handleCopy(sdk.installCommand, sdk.id)}
                  className="absolute top-2 right-2 p-1 rounded hover:bg-gray-700 transition-colors"
                >
                  {copiedId === sdk.id ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <code className="text-sm text-gray-100 font-mono">{sdk.installCommand}</code>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {sdk.features.map((feature, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 text-xs bg-gray-50 text-gray-600 rounded"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                {sdk.npmUrl && (
                  <a
                    href={sdk.npmUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600"
                  >
                    <Box className="w-3.5 h-3.5" />
                    Package
                  </a>
                )}
                <a
                  href={sdk.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600"
                >
                  <Github className="w-3.5 h-3.5" />
                  GitHub
                </a>
                <a
                  href={sdk.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Docs
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('api3.developer.sdk.additionalTools.title') || '附加工具'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-100 rounded-lg p-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">Hardhat 插件</h3>
            <p className="text-xs text-gray-500 mt-1">
              用于部署和测试 API3 合约的 Hardhat 插件
            </p>
            <div className="mt-3 bg-gray-900 rounded p-2">
              <code className="text-xs text-gray-100 font-mono">npm install @api3/hardhat-plugin</code>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-lg p-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
              <Box className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">Foundry 组件</h3>
            <p className="text-xs text-gray-500 mt-1">
              用于 Foundry 项目的合约组件库
            </p>
            <div className="mt-3 bg-gray-900 rounded p-2">
              <code className="text-xs text-gray-100 font-mono">forge install api3dao/contracts</code>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-lg p-4">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
              <Github className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">示例代码库</h3>
            <p className="text-xs text-gray-500 mt-1">
              包含各种集成场景的示例代码
            </p>
            <a
              href="https://github.com/api3dao/examples"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 mt-3"
            >
              查看示例 <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section className="flex items-start gap-4 py-2">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('api3.developer.sdk.support.title') || '需要帮助？'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {t('api3.developer.sdk.support.description') ||
              '如果您在集成过程中遇到问题，可以通过以下渠道获取支持'}
          </p>
          <div className="flex gap-4 mt-2">
            <a
              href="https://discord.gg/api3"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-600 hover:text-emerald-700"
            >
              Discord 社区
            </a>
            <a
              href="https://github.com/api3dao"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-600 hover:text-emerald-700"
            >
              GitHub Issues
            </a>
            <a
              href="https://docs.api3.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-600 hover:text-emerald-700"
            >
              官方文档
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
