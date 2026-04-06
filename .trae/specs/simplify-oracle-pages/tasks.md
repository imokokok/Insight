# Tasks

## 阶段一：删除十个预言机专属页面目录

- [ ] Task 1: 删除 API3 页面目录
  - [ ] SubTask 1.1: 删除 `src/app/[locale]/api3/components/` 目录
  - [ ] SubTask 1.2: 删除 `src/app/[locale]/api3/hooks/` 目录
  - [ ] SubTask 1.3: 删除 `src/app/[locale]/api3/page.tsx`
  - [ ] SubTask 1.4: 删除 `src/app/[locale]/api3/types.ts`

- [ ] Task 2: 删除 Band Protocol 页面目录
  - [ ] SubTask 2.1: 删除 `src/app/[locale]/band-protocol/components/` 目录
  - [ ] SubTask 2.2: 删除 `src/app/[locale]/band-protocol/hooks/` 目录
  - [ ] SubTask 2.3: 删除 `src/app/[locale]/band-protocol/page.tsx`
  - [ ] SubTask 2.4: 删除 `src/app/[locale]/band-protocol/types.ts`

- [ ] Task 3: 删除 Chainlink 页面目录
  - [ ] SubTask 3.1: 删除 `src/app/[locale]/chainlink/components/` 目录
  - [ ] SubTask 3.2: 删除 `src/app/[locale]/chainlink/hooks/` 目录
  - [ ] SubTask 3.3: 删除 `src/app/[locale]/chainlink/services/` 目录
  - [ ] SubTask 3.4: 删除 `src/app/[locale]/chainlink/utils/` 目录
  - [ ] SubTask 3.5: 删除 `src/app/[locale]/chainlink/data/` 目录
  - [ ] SubTask 3.6: 删除 `src/app/[locale]/chainlink/page.tsx`
  - [ ] SubTask 3.7: 删除 `src/app/[locale]/chainlink/types.ts`

- [ ] Task 4: 删除 Chronicle 页面目录
  - [ ] SubTask 4.1: 删除 `src/app/[locale]/chronicle/components/` 目录
  - [ ] SubTask 4.2: 删除 `src/app/[locale]/chronicle/hooks/` 目录
  - [ ] SubTask 4.3: 删除 `src/app/[locale]/chronicle/page.tsx`
  - [ ] SubTask 4.4: 删除 `src/app/[locale]/chronicle/types.ts`

- [ ] Task 5: 删除 DIA 页面目录
  - [ ] SubTask 5.1: 删除 `src/app/[locale]/dia/components/` 目录
  - [ ] SubTask 5.2: 删除 `src/app/[locale]/dia/hooks/` 目录
  - [ ] SubTask 5.3: 删除 `src/app/[locale]/dia/page.tsx`
  - [ ] SubTask 5.4: 删除 `src/app/[locale]/dia/types.ts`

- [ ] Task 6: 删除 Pyth 页面目录
  - [ ] SubTask 6.1: 删除 `src/app/[locale]/pyth/components/` 目录
  - [ ] SubTask 6.2: 删除 `src/app/[locale]/pyth/hooks/` 目录
  - [ ] SubTask 6.3: 删除 `src/app/[locale]/pyth/page.tsx`
  - [ ] SubTask 6.4: 删除 `src/app/[locale]/pyth/types.ts`

- [ ] Task 7: 删除 RedStone 页面目录
  - [ ] SubTask 7.1: 删除 `src/app/[locale]/redstone/components/` 目录
  - [ ] SubTask 7.2: 删除 `src/app/[locale]/redstone/hooks/` 目录
  - [ ] SubTask 7.3: 删除 `src/app/[locale]/redstone/context/` 目录
  - [ ] SubTask 7.4: 删除 `src/app/[locale]/redstone/page.tsx`
  - [ ] SubTask 7.5: 删除 `src/app/[locale]/redstone/types.ts`

- [ ] Task 8: 删除 Tellor 页面目录
  - [ ] SubTask 8.1: 删除 `src/app/[locale]/tellor/components/` 目录
  - [ ] SubTask 8.2: 删除 `src/app/[locale]/tellor/hooks/` 目录
  - [ ] SubTask 8.3: 删除 `src/app/[locale]/tellor/TellorPageClient.tsx`
  - [ ] SubTask 8.4: 删除 `src/app/[locale]/tellor/page.tsx`
  - [ ] SubTask 8.5: 删除 `src/app/[locale]/tellor/types.ts`

- [ ] Task 9: 删除 UMA 页面组件（保留数据获取功能）
  - [ ] SubTask 9.1: 删除 `src/app/[locale]/uma/components/` 目录
  - [ ] SubTask 9.2: 删除 `src/app/[locale]/uma/hooks/` 目录
  - [ ] SubTask 9.3: 删除 `src/app/[locale]/uma/page.tsx`
  - [ ] SubTask 9.4: 删除 `src/app/[locale]/uma/types.ts`
  - [ ] SubTask 9.5: 保留 `src/lib/services/oracle/clients/uma.ts` 中的数据获取方法

- [ ] Task 10: 删除 Winklink 页面目录
  - [ ] SubTask 10.1: 删除 `src/app/[locale]/winklink/components/` 目录
  - [ ] SubTask 10.2: 删除 `src/app/[locale]/winklink/hooks/` 目录
  - [ ] SubTask 10.3: 删除 `src/app/[locale]/winklink/page.tsx`
  - [ ] SubTask 10.4: 删除 `src/app/[locale]/winklink/types.ts`

## 阶段二：简化 Oracle Client（只保留价格获取方法）

- [ ] Task 11: 简化 API3Client
  - [ ] SubTask 11.1: 保留 getPrice 和 getHistoricalPrices 方法
  - [ ] SubTask 11.2: 删除其他特性方法（getAirnodeNetworkStats, getDapiCoverage, getStakingData 等）
  - [ ] SubTask 11.3: 保留 Binance API 调用

- [ ] Task 12: 简化 BandProtocolClient
  - [ ] SubTask 12.1: 保留 getPrice 和 getHistoricalPrices 方法
  - [ ] SubTask 12.2: 删除其他特性方法
  - [ ] SubTask 12.3: 保留 Binance API 调用

- [ ] Task 13: 简化 ChainlinkClient
  - [ ] SubTask 13.1: 保留 getPrice 和 getHistoricalPrices 方法
  - [ ] SubTask 13.2: 删除其他特性方法
  - [ ] SubTask 13.3: 保留 Binance API 调用

- [ ] Task 14: 简化 ChronicleClient
  - [ ] SubTask 14.1: 保留 getPrice 和 getHistoricalPrices 方法
  - [ ] SubTask 14.2: 删除其他特性方法
  - [ ] SubTask 14.3: 保留 Binance API 调用

- [ ] Task 15: 简化 DIAClient
  - [ ] SubTask 15.1: 保留 getPrice 和 getHistoricalPrices 方法
  - [ ] SubTask 15.2: 删除其他特性方法
  - [ ] SubTask 15.3: 保留 Binance API 调用

- [ ] Task 16: 简化 PythClient
  - [ ] SubTask 16.1: 保留 getPrice 和 getHistoricalPrices 方法
  - [ ] SubTask 16.2: 删除其他特性方法
  - [ ] SubTask 16.3: 保留 Binance API 调用

- [ ] Task 17: 简化 RedStoneClient
  - [ ] SubTask 17.1: 保留 getPrice 和 getHistoricalPrices 方法
  - [ ] SubTask 17.2: 删除其他特性方法
  - [ ] SubTask 17.3: 保留 Binance API 调用

- [ ] Task 18: 简化 TellorClient
  - [ ] SubTask 18.1: 保留 getPrice 和 getHistoricalPrices 方法
  - [ ] SubTask 18.2: 删除其他特性方法
  - [ ] SubTask 18.3: 保留 Binance API 调用

- [ ] Task 19: 简化 WinklinkClient
  - [ ] SubTask 19.1: 保留 getPrice 和 getHistoricalPrices 方法
  - [ ] SubTask 19.2: 删除其他特性方法
  - [ ] SubTask 19.3: 保留 Binance API 调用

- [ ] Task 20: UMAClient 特殊处理（保留所有方法）
  - [ ] SubTask 20.1: 保留所有现有方法（包括价格获取和特性方法）
  - [ ] SubTask 20.2: 保留 Binance API 调用

## 阶段三：清理相关 hooks 和组件

- [ ] Task 21: 清理 oracle 相关 hooks
  - [ ] SubTask 21.1: 检查 `src/hooks/oracles/` 目录，删除不再需要的 hooks
  - [ ] SubTask 21.2: 保留价格查询相关的 hooks

- [ ] Task 22: 清理 oracle 共享组件
  - [ ] SubTask 22.1: 检查 `src/components/oracle/` 目录
  - [ ] SubTask 22.2: 删除仅被已删除页面使用的组件
  - [ ] SubTask 22.3: 保留价格查询和对比功能使用的组件

## 阶段四：验证和测试

- [ ] Task 23: 验证价格查询功能
  - [ ] SubTask 23.1: 验证所有 OracleClient 的 getPrice 方法正常工作
  - [ ] SubTask 23.2: 验证所有 OracleClient 的 getHistoricalPrices 方法正常工作
  - [ ] SubTask 23.3: 验证 Binance API 调用正常工作

- [ ] Task 24: 验证 UMA 数据获取功能
  - [ ] SubTask 24.1: 验证 UMAClient 的所有方法仍然可用
  - [ ] SubTask 24.2: 验证 UMA 价格获取正常工作

- [ ] Task 25: 构建验证
  - [ ] SubTask 25.1: 运行 TypeScript 类型检查
  - [ ] SubTask 25.2: 运行构建命令，确保无错误

# Task Dependencies

- 阶段一的任务（Task 1-10）可以并行执行
- 阶段二的任务（Task 11-20）可以并行执行
- 阶段三的任务（Task 21-22）依赖于阶段一完成
- 阶段四的任务（Task 23-25）依赖于阶段二和阶段三完成
