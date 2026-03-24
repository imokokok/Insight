'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { SegmentedControl } from '@/components/ui/selectors';
import { PythPublishersViewProps } from '../types';

type SortField = 'stake' | 'accuracy' | 'name';
type SortOrder = 'asc' | 'desc';

interface FlatStatItemProps {
  label: string;
  value: string | number;
  className?: string;
}

function FlatStatItem({ label, value, className = '' }: FlatStatItemProps) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

export function PythPublishersView({ publishers, isLoading }: PythPublishersViewProps) {
  const t = useTranslations();
  const [sortField, setSortField] = useState<SortField>('stake');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPublishers = useMemo(() => {
    return publishers
      .filter((publisher) =>
        publisher.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'stake':
            comparison = a.stake - b.stake;
            break;
          case 'accuracy':
            comparison = a.accuracy - b.accuracy;
            break;
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [publishers, sortField, sortOrder, searchQuery]);

  const totalStake = publishers.reduce((sum, p) => sum + p.stake, 0);
  const avgAccuracy = publishers.length
    ? (publishers.reduce((sum, p) => sum + p.accuracy, 0) / publishers.length).toFixed(1)
    : 0;
  const topPublisher = publishers.sort((a, b) => b.stake - a.stake)[0];

  return (
    <div className="space-y-4">
      {/* Search and Sort Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('pyth.publishers.searchPlaceholder') || '搜索发布者...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <SegmentedControl
              options={[
                { value: 'stake', label: t('pyth.publishers.sortByStake') || '按质押排序' },
                { value: 'accuracy', label: t('pyth.publishers.sortByAccuracy') || '按准确率排序' },
                { value: 'name', label: t('pyth.publishers.sortByName') || '按名称排序' },
              ]}
              value={sortField}
              onChange={(value) => setSortField(value as SortField)}
              size="sm"
            />
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Publisher Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-gray-200 rounded-lg bg-white">
        <FlatStatItem
          label={t('pyth.publishers.totalPublishers') || '发布者总数'}
          value={publishers.length || 0}
          className="px-4 py-4 border-r border-gray-200"
        />
        <FlatStatItem
          label={t('pyth.publishers.totalStaked') || '总质押'}
          value={`${(totalStake / 1e9).toFixed(2)}B`}
          className="px-4 py-4 border-r border-gray-200"
        />
        <FlatStatItem
          label={t('pyth.publishers.avgAccuracy') || '平均准确率'}
          value={`${avgAccuracy}%`}
          className="px-4 py-4 border-r border-gray-200"
        />
        <FlatStatItem
          label={t('pyth.publishers.topPublisher') || '头部发布者'}
          value={topPublisher?.name || '-'}
          className="px-4 py-4"
        />
      </div>

      {/* Publisher Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPublishers.map((publisher, index) => (
          <div
            key={publisher.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:border-violet-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">{publisher.name}</h4>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                #{index + 1}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t('pyth.publishers.stake')}</span>
                <span className="text-sm font-medium text-gray-900">
                  {(publisher.stake / 1e6).toFixed(1)}M PYTH
                </span>
              </div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full">
                <div
                  className="bg-violet-500 h-1.5 rounded-full"
                  style={{
                    width: `${Math.min((publisher.stake / (topPublisher?.stake || 1)) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t('pyth.publishers.accuracy')}</span>
                <span
                  className={`text-sm font-medium ${
                    publisher.accuracy >= 99 ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {publisher.accuracy}%
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="text-sm text-gray-600">
                  {t('pyth.publishers.contribution') || '贡献度'}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {((publisher.stake / (totalStake || 1)) * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
