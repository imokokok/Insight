'use client';

import { useState, useMemo, useRef } from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, ArrowUpDown, Activity, Award, TrendingUp, Shield, Eye } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type PythPublishersViewProps, type PublisherData } from '../types';
import { PublisherDetailModal } from './PublisherDetailModal';

type SortField = 'stake' | 'accuracy' | 'name';
type SortOrder = 'asc' | 'desc';

export function PythPublishersView({ publishers, isLoading }: PythPublishersViewProps) {
  const t = useTranslations();
  const [sortField, setSortField] = useState<SortField>('stake');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPublisher, setSelectedPublisher] = useState<PublisherData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePublisherClick = (publisher: PublisherData) => {
    setSelectedPublisher(publisher);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPublisher(null);
  };

  const filteredPublishers = useMemo(() => {
    return publishers
      .filter((publisher) => publisher.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'stake':
            comparison = (a.stake ?? 0) - (b.stake ?? 0);
            break;
          case 'accuracy':
            comparison = (a.accuracy ?? 0) - (b.accuracy ?? 0);
            break;
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [publishers, sortField, sortOrder, searchQuery]);

  const totalStake = publishers.reduce((sum, p) => sum + (p.stake ?? 0), 0);
  const avgAccuracy = publishers.length
    ? (publishers.reduce((sum, p) => sum + (p.accuracy ?? 0), 0) / publishers.length).toFixed(1)
    : 0;
  const topPublisher = publishers.sort((a, b) => (b.stake ?? 0) - (a.stake ?? 0))[0];

  const parentRef = useRef<HTMLDivElement>(null);
  const shouldUseVirtualScroll = filteredPublishers.length > 50;

  const virtualizer = useVirtualizer({
    count: filteredPublishers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 57,
    overscan: 5,
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-8">
      {/* 统计概览 - 行内展示 */}
      <div className="flex flex-wrap items-center gap-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {t('pyth.publishers.total') || 'Total Publishers'}
          </span>
          <span className="text-lg font-semibold text-gray-900">{publishers.length}</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {t('pyth.publishers.totalStaked') || 'Total Staked'}
          </span>
          <span className="text-lg font-semibold text-gray-900">
            {(totalStake / 1e9).toFixed(2)}B PYTH
          </span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {t('pyth.publishers.avgAccuracy') || 'Avg Accuracy'}
          </span>
          <span className="text-lg font-semibold text-emerald-600">{avgAccuracy}%</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {t('pyth.publishers.topPublisher') || 'Top Publisher'}
          </span>
          <span className="text-lg font-semibold text-gray-900">{topPublisher?.name || '-'}</span>
        </div>
      </div>

      {/* 搜索和排序控制 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('pyth.publishers.searchPlaceholder') || 'Search publishers...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSort('name')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
              sortField === 'name'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {t('pyth.publishers.sortByName') || 'Name'}
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleSort('stake')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
              sortField === 'stake'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {t('pyth.publishers.sortByStake') || 'Stake'}
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleSort('accuracy')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
              sortField === 'accuracy'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {t('pyth.publishers.sortByAccuracy') || 'Accuracy'}
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {shouldUseVirtualScroll ? (
          <div ref={parentRef} className="h-[600px] overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                    {t('pyth.publishers.rank') || 'Rank'}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                    {t('pyth.publishers.name') || 'Name'}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                    {t('pyth.publishers.stake') || 'Stake'}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                    {t('pyth.publishers.contribution') || 'Contribution'}
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">
                    {t('pyth.publishers.accuracy') || 'Accuracy'}
                  </th>
                </tr>
              </thead>
              <tbody
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                  display: 'block',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const publisher = filteredPublishers[virtualItem.index];
                  return (
                    <tr
                      key={publisher.id}
                      data-index={virtualItem.index}
                      ref={virtualizer.measureElement}
                      onClick={() => handlePublisherClick(publisher)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualItem.start}px)`,
                        display: 'flex',
                      }}
                      className="border-b border-gray-100 hover:bg-violet-50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 flex-none w-[10%]">
                        <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                          {virtualItem.index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 flex-none w-[25%]">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{publisher.name}</span>
                          <Eye className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </td>
                      <td className="py-3 px-4 flex-none w-[25%]">
                        <div className="space-y-1">
                          <span className="text-sm text-gray-900">
                            {((publisher.stake ?? 0) / 1e6).toFixed(1)}M PYTH
                          </span>
                          <div className="w-32 bg-gray-100 rounded-full h-1.5">
                            <div
                              className="bg-violet-500 h-1.5 rounded-full"
                              style={{
                                width: `${Math.min(((publisher.stake ?? 0) / (topPublisher?.stake || 1)) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 flex-none w-[20%]">
                        {(((publisher.stake ?? 0) / (totalStake || 1)) * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-right flex-none w-[20%]">
                        <span
                          className={`text-sm font-medium ${
                            (publisher.accuracy ?? 0) >= 99 ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {(publisher.accuracy ?? 0).toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                  {t('pyth.publishers.rank') || 'Rank'}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                  {t('pyth.publishers.name') || 'Name'}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                  {t('pyth.publishers.stake') || 'Stake'}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                  {t('pyth.publishers.contribution') || 'Contribution'}
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">
                  {t('pyth.publishers.accuracy') || 'Accuracy'}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPublishers.map((publisher, index) => (
                <tr
                  key={publisher.id}
                  onClick={() => handlePublisherClick(publisher)}
                  className="border-b border-gray-100 hover:bg-violet-50 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{publisher.name}</span>
                      <Eye className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <span className="text-sm text-gray-900">
                        {((publisher.stake ?? 0) / 1e6).toFixed(1)}M PYTH
                      </span>
                      <div className="w-32 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-violet-500 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(((publisher.stake ?? 0) / (topPublisher?.stake || 1)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {(((publisher.stake ?? 0) / (totalStake || 1)) * 100).toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`text-sm font-medium ${
                        (publisher.accuracy ?? 0) >= 99 ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {(publisher.accuracy ?? 0).toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 空状态 */}
      {filteredPublishers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">
            {t('pyth.publishers.noResults') || 'No publishers found'}
          </p>
        </div>
      )}

      {/* 发布者详情弹窗 */}
      {selectedPublisher && (
        <PublisherDetailModal
          publisher={selectedPublisher}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
