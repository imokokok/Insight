'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import { 
  ArrowRight, 
  BookOpen, 
  MessageCircle, 
  Mail, 
  Sparkles,
  Search,
  GitCompare,
  Globe,
  History,
  Users,
  Handshake,
  TrendingUp,
  Shield,
  Zap
} from 'lucide-react';

const features = [
  { icon: Search, label: 'priceQuery', labelZh: '价格查询' },
  { icon: GitCompare, label: 'crossOracle', labelZh: '跨预言机比较' },
  { icon: Globe, label: 'crossChain', labelZh: '跨链比较' },
  { icon: History, label: 'historical', labelZh: '历史分析' },
];

const stats = [
  { icon: Users, value: '50K+', label: 'activeUsers', labelZh: '活跃用户' },
  { icon: Globe, value: '15+', label: 'supportedChains', labelZh: '支持链数' },
  { icon: Handshake, value: '50+', label: 'partners', labelZh: '合作伙伴' },
  { icon: TrendingUp, value: '10K+', label: 'dailyRequests', labelZh: '日请求量' },
];

const partners = [
  { name: 'Chainlink', color: '#375bd2' },
  { name: 'Pyth', color: '#8b5cf6' },
  { name: 'Band', color: '#10b981' },
  { name: 'API3', color: '#f59e0b' },
  { name: 'UMA', color: '#ec4899' },
  { name: 'Ethereum', color: '#627eea' },
];

export default function ProfessionalCTA() {
  const { t, language } = useI18n();

  return (
    <section className="py-20 bg-gradient-to-b from-blue-50/30 to-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 xl:px-20">
        {/* Platform Capabilities Section */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full mb-4">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-600">
                {language === 'zh' ? '核心功能' : 'Core Capabilities'}
              </span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              {language === 'zh' ? '全方位数据分析能力' : 'Comprehensive Data Analytics'}
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {language === 'zh' 
                ? '提供专业的预言机数据分析工具，助力您做出明智的决策'
                : 'Professional oracle data analysis tools to help you make informed decisions'}
            </p>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={feature.label}
                  className="flex items-center gap-3 px-5 py-3 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
                >
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-700">
                    {language === 'zh' ? feature.labelZh : feature.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats & Partners Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Stats Grid */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              {language === 'zh' ? '社区与生态' : 'Community & Ecosystem'}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div 
                    key={stat.label}
                    className="p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-blue-600" />
                      <span className="text-xs text-gray-500 uppercase">
                        {language === 'zh' ? stat.labelZh : stat.label}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Partners */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Handshake className="w-5 h-5 text-violet-600" />
              {language === 'zh' ? '合作伙伴' : 'Partners'}
            </h4>
            <div className="grid grid-cols-3 gap-4">
              {partners.map((partner) => (
                <div
                  key={partner.name}
                  className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-all cursor-pointer"
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: partner.color }}
                  >
                    {partner.name.slice(0, 2)}
                  </div>
                  <span className="text-xs text-gray-600 font-medium">{partner.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main CTA Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-8 md:p-16">
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          </div>

          <div className="relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">
                {language === 'zh' ? '开始您的数据之旅' : 'Start Your Data Journey'}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 max-w-3xl">
              {language === 'zh' 
                ? '准备好探索预言机数据了吗？' 
                : 'Ready to Explore Oracle Data?'}
            </h2>

            {/* Description */}
            <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl">
              {language === 'zh'
                ? '立即开始使用 Insight 平台，获取全面、准确、实时的预言机数据分析'
                : 'Start using the Insight platform today for comprehensive, accurate, and real-time oracle data analysis'}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 mb-12">
              <Link
                href="/price-query"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 hover:shadow-xl transition-all duration-300 group"
              >
                {language === 'zh' ? '免费开始使用' : 'Get Started Free'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                <Mail className="w-5 h-5" />
                {language === 'zh' ? '联系销售' : 'Contact Sales'}
              </Link>
            </div>

            {/* Secondary Links */}
            <div className="flex flex-wrap items-center gap-6 text-blue-200">
              <Link href="#docs" className="flex items-center gap-2 hover:text-white transition-colors">
                <BookOpen className="w-4 h-4" />
                <span>{language === 'zh' ? '文档中心' : 'Documentation'}</span>
              </Link>
              <Link href="#community" className="flex items-center gap-2 hover:text-white transition-colors">
                <MessageCircle className="w-4 h-4" />
                <span>{language === 'zh' ? '社区讨论' : 'Community'}</span>
              </Link>
              <span className="hidden md:inline">|</span>
              <Link href="#privacy" className="hover:text-white transition-colors">
                {language === 'zh' ? '隐私政策' : 'Privacy Policy'}
              </Link>
              <Link href="#terms" className="hover:text-white transition-colors">
                {language === 'zh' ? '服务条款' : 'Terms of Service'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
