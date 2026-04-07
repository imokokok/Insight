'use client';

import { cn } from '@/lib/utils';

/**
 * 预言机代币价格骨架屏组件
 */
export default function OracleTokenPricesSkeleton() {
  return (
    <div className="w-full">
      {/* 标题骨架 */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
        <div className="flex items-center gap-3">
          <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
          <div className="h-7 w-7 bg-gray-200 rounded-md animate-pulse" />
        </div>
      </div>

      {/* 价格卡片骨架网格 */}
      <div
        className={cn(
          // 与主组件相同的网格布局
          'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
          'gap-3'
        )}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div
            key={i}
            className={cn(
              // 与主组件卡片相同的样式结构
              'bg-white rounded-lg border border-gray-200 p-4',
              'shadow-sm'
            )}
          >
            {/* Logo 和代币符号骨架 */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Logo 骨架 */}
                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                {/* 代币信息骨架 */}
                <div className="flex flex-col gap-1.5">
                  <div className="h-4 w-14 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>

            {/* 价格骨架 */}
            <div className="mb-3">
              <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
            </div>

            {/* 涨跌幅 Pill 骨架 */}
            <div className="inline-flex">
              <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
            </div>

            {/* 24h 高/低和成交量骨架 */}
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
              <div className="flex justify-between items-center">
                <div className="h-3.5 w-10 bg-gray-200 rounded animate-pulse" />
                <div className="h-3.5 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="flex justify-between items-center">
                <div className="h-3.5 w-10 bg-gray-200 rounded animate-pulse" />
                <div className="h-3.5 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="flex justify-between items-center">
                <div className="h-3.5 w-10 bg-gray-200 rounded animate-pulse" />
                <div className="h-3.5 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
