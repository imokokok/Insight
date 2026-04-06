# Checklist

## 阶段一：删除十个预言机专属页面目录

- [x] API3 页面目录已删除
  - [x] `src/app/[locale]/api3/components/` 目录已删除
  - [x] `src/app/[locale]/api3/hooks/` 目录已删除
  - [x] `src/app/[locale]/api3/page.tsx` 已删除
  - [x] `src/app/[locale]/api3/types.ts` 已删除

- [x] Band Protocol 页面目录已删除
  - [x] `src/app/[locale]/band-protocol/components/` 目录已删除
  - [x] `src/app/[locale]/band-protocol/hooks/` 目录已删除
  - [x] `src/app/[locale]/band-protocol/page.tsx` 已删除
  - [x] `src/app/[locale]/band-protocol/types.ts` 已删除

- [x] Chainlink 页面目录已删除
  - [x] `src/app/[locale]/chainlink/components/` 目录已删除
  - [x] `src/app/[locale]/chainlink/hooks/` 目录已删除
  - [x] `src/app/[locale]/chainlink/services/` 目录已删除
  - [x] `src/app/[locale]/chainlink/utils/` 目录已删除
  - [x] `src/app/[locale]/chainlink/data/` 目录已删除
  - [x] `src/app/[locale]/chainlink/page.tsx` 已删除
  - [x] `src/app/[locale]/chainlink/types.ts` 已删除

- [x] Chronicle 页面目录已删除
  - [x] `src/app/[locale]/chronicle/components/` 目录已删除
  - [x] `src/app/[locale]/chronicle/hooks/` 目录已删除
  - [x] `src/app/[locale]/chronicle/page.tsx` 已删除
  - [x] `src/app/[locale]/chronicle/types.ts` 已删除

- [x] DIA 页面目录已删除
  - [x] `src/app/[locale]/dia/components/` 目录已删除
  - [x] `src/app/[locale]/dia/hooks/` 目录已删除
  - [x] `src/app/[locale]/dia/page.tsx` 已删除
  - [x] `src/app/[locale]/dia/types.ts` 已删除

- [x] Pyth 页面目录已删除
  - [x] `src/app/[locale]/pyth/components/` 目录已删除
  - [x] `src/app/[locale]/pyth/hooks/` 目录已删除
  - [x] `src/app/[locale]/pyth/page.tsx` 已删除
  - [x] `src/app/[locale]/pyth/types.ts` 已删除

- [x] RedStone 页面目录已删除
  - [x] `src/app/[locale]/redstone/components/` 目录已删除
  - [x] `src/app/[locale]/redstone/hooks/` 目录已删除
  - [x] `src/app/[locale]/redstone/context/` 目录已删除
  - [x] `src/app/[locale]/redstone/page.tsx` 已删除
  - [x] `src/app/[locale]/redstone/types.ts` 已删除

- [x] Tellor 页面目录已删除
  - [x] `src/app/[locale]/tellor/components/` 目录已删除
  - [x] `src/app/[locale]/tellor/hooks/` 目录已删除
  - [x] `src/app/[locale]/tellor/TellorPageClient.tsx` 已删除
  - [x] `src/app/[locale]/tellor/page.tsx` 已删除
  - [x] `src/app/[locale]/tellor/types.ts` 已删除

- [x] UMA 页面组件已删除（数据获取保留）
  - [x] `src/app/[locale]/uma/components/` 目录已删除
  - [x] `src/app/[locale]/uma/hooks/` 目录已删除
  - [x] `src/app/[locale]/uma/page.tsx` 已删除
  - [x] `src/app/[locale]/uma/types.ts` 已删除

- [x] Winklink 页面目录已删除
  - [x] `src/app/[locale]/winklink/components/` 目录已删除
  - [x] `src/app/[locale]/winklink/hooks/` 目录已删除
  - [x] `src/app/[locale]/winklink/page.tsx` 已删除
  - [x] `src/app/[locale]/winklink/types.ts` 已删除

## 阶段二：简化 Oracle Client

- [x] API3Client 已简化
  - [x] 保留 getPrice 方法
  - [x] 保留 getHistoricalPrices 方法
  - [x] 删除其他特性方法

- [x] BandProtocolClient 已简化
  - [x] 保留 getPrice 方法
  - [x] 保留 getHistoricalPrices 方法
  - [x] 删除其他特性方法

- [x] ChainlinkClient 已简化
  - [x] 保留 getPrice 方法
  - [x] 保留 getHistoricalPrices 方法
  - [x] 删除其他特性方法

- [x] DIAClient 已简化
  - [x] 保留 getPrice 方法
  - [x] 保留 getHistoricalPrices 方法
  - [x] 删除其他特性方法

- [x] PythClient 已简化
  - [x] 保留 getPrice 方法
  - [x] 保留 getHistoricalPrices 方法
  - [x] 删除其他特性方法

- [x] RedStoneClient 已简化
  - [x] 保留 getPrice 方法
  - [x] 保留 getHistoricalPrices 方法
  - [x] 删除其他特性方法

- [x] TellorClient 已简化
  - [x] 保留 getPrice 方法
  - [x] 保留 getHistoricalPrices 方法
  - [x] 删除其他特性方法

- [x] WinklinkClient 已简化
  - [x] 保留 getPrice 方法
  - [x] 保留 getHistoricalPrices 方法
  - [x] 删除其他特性方法

- [x] UMAClient 保留所有方法（特殊处理）
  - [x] 保留 getPrice 方法
  - [x] 保留 getHistoricalPrices 方法
  - [x] 保留其他特性方法

## 阶段三：清理相关 hooks 和组件

- [x] oracle 相关 hooks 已清理
  - [x] 删除不再需要的 hooks
  - [x] 保留价格查询相关的 hooks

- [x] oracle 共享组件已清理
  - [x] 删除仅被已删除页面使用的组件
  - [x] 保留价格查询和对比功能使用的组件

## 阶段四：验证和测试

- [x] 价格查询功能正常
  - [x] API3Client.getPrice 正常工作
  - [x] BandProtocolClient.getPrice 正常工作
  - [x] ChainlinkClient.getPrice 正常工作
  - [x] DIAClient.getPrice 正常工作
  - [x] PythClient.getPrice 正常工作
  - [x] RedStoneClient.getPrice 正常工作
  - [x] TellorClient.getPrice 正常工作
  - [x] UMAClient.getPrice 正常工作
  - [x] WinklinkClient.getPrice 正常工作

- [x] 历史价格获取功能正常
  - [x] 所有 OracleClient.getHistoricalPrices 正常工作

- [x] Binance API 调用正常
  - [x] binanceMarketService.getTokenMarketData 正常工作
  - [x] binanceMarketService.getHistoricalPrices 正常工作

- [x] UMA 数据获取功能正常
  - [x] UMAClient 所有方法仍然可用

- [x] 构建无错误
  - [x] TypeScript 类型检查通过
  - [x] 构建命令成功完成
