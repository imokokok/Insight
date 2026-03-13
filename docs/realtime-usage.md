# Supabase Realtime 实时订阅功能使用示例

本示例展示如何使用实时订阅功能。

## 实时价格订阅

```tsx
import { useRealtimePrice } from '@/hooks/useRealtimePrice';

export function RealtimePriceDisplay() {
  const { priceData, connectionStatus, lastUpdate } = useRealtimePrice({
    provider: 'chainlink',
    symbol: 'BTC',
    enabled: true,
    onPriceUpdate: (data) => {
      console.log('价格更新:', data);
    },
  });

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-2">BTC 实时价格</h3>
      {connectionStatus === 'connected' ? (
        <div className="flex items-center gap-2 mb-2">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span className="text-sm text-green-600">已连接</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 mb-2">
          <span className="text-gray-500">连接中...</span>
        </div>
      )}
      
      {priceData ? (
        <div className="mt-4">
          <p className="text-3xl font-bold text-gray-900">
            ${priceData.price.toLocaleString()}
          <span className="text-sm text-gray-500">
            {priceData.provider}
          </span>
          </p>
          <p className="text-sm text-gray-500">
            最后更新: {lastUpdate?.toLocaleTimeString()}
          </p>
        </div>
      ) : (
        <div className="text-gray-400 text-sm">
          等待价格更新...
        </div>
      )}
    </div>
  );
}
