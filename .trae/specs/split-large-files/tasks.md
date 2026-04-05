# Tasks

## 高优先级任务

- [x] Task 1: 拆分 api3.ts hooks 文件
  - [x] SubTask 1.1: 创建 `src/hooks/oracles/api3/` 目录结构
  - [x] SubTask 1.2: 提取共享类型到 `types.ts`
  - [x] SubTask 1.3: 拆分价格相关 hooks 到 `useAPI3Price.ts`
  - [x] SubTask 1.4: 拆分历史数据 hooks 到 `useAPI3Historical.ts`
  - [x] SubTask 1.5: 拆分告警相关 hooks 到 `useAPI3Alerts.ts`
  - [x] SubTask 1.6: 拆分质量指标 hooks 到 `useAPI3Quality.ts`
  - [x] SubTask 1.7: 拆分质押相关 hooks 到 `useAPI3Staking.ts`
  - [x] SubTask 1.8: 拆分覆盖池 hooks 到 `useAPI3Coverage.ts`
  - [x] SubTask 1.9: 拆分 OEV 相关 hooks 到 `useAPI3OEV.ts`
  - [x] SubTask 1.10: 拆分网络状态 hooks 到 `useAPI3Network.ts`
  - [x] SubTask 1.11: 拆分缓存相关 hooks 到 `useAPI3Cache.ts`
  - [x] SubTask 1.12: 创建 `index.ts` 统一导出所有 hooks
  - [x] SubTask 1.13: 更新 `src/hooks/oracles/index.ts` 的导入路径
  - [x] SubTask 1.14: 删除原 `api3.ts` 文件

- [x] Task 2: 拆分 cross-chain/utils.ts 工具文件
  - [x] SubTask 2.1: 创建 `src/app/[locale]/cross-chain/utils/` 目录结构
  - [x] SubTask 2.2: 提取颜色工具到 `colorUtils.ts`
  - [x] SubTask 2.3: 提取统计计算工具到 `statisticsUtils.ts`
  - [x] SubTask 2.4: 提取异常检测工具到 `outlierUtils.ts`
  - [x] SubTask 2.5: 提取相关性计算工具到 `correlationUtils.ts`
  - [x] SubTask 2.6: 提取波动率计算工具到 `volatilityUtils.ts`
  - [x] SubTask 2.7: 创建 `index.ts` 统一导出所有工具函数
  - [x] SubTask 2.8: 更新 `useCrossChainData.ts` 的导入路径
  - [x] SubTask 2.9: 删除原 `utils.ts` 文件

- [x] Task 3: 拆分 defiLlamaApi.ts 服务文件
  - [x] SubTask 3.1: 创建 `src/lib/services/marketData/defiLlamaApi/` 目录结构
  - [x] SubTask 3.2: 提取类型定义到 `types.ts`
  - [x] SubTask 3.3: 提取基础客户端和错误处理到 `client.ts`
  - [x] SubTask 3.4: 提取 Oracle 数据获取到 `oracles.ts`
  - [x] SubTask 3.5: 提取资产数据获取到 `assets.ts`
  - [x] SubTask 3.6: 提取链相关数据到 `chains.ts`
  - [x] SubTask 3.7: 提取协议详情到 `protocols.ts`
  - [x] SubTask 3.8: 提取对比分析到 `comparison.ts`
  - [x] SubTask 3.9: 创建 `index.ts` 统一导出
  - [x] SubTask 3.10: 更新所有导入路径
  - [x] SubTask 3.11: 删除原 `defiLlamaApi.ts` 文件

## 中优先级任务

- [x] Task 4: 拆分 pythDataService.ts 服务文件
  - [x] SubTask 4.1: 创建 `src/lib/oracles/pyth/` 目录结构
  - [x] SubTask 4.2: 提取类型定义到 `types.ts`
  - [x] SubTask 4.3: 提取 WebSocket 管理到 `pythWebSocket.ts`
  - [x] SubTask 4.4: 提取缓存管理到 `pythCache.ts`
  - [x] SubTask 4.5: 提取数据解析到 `pythParser.ts`
  - [x] SubTask 4.6: 精简核心服务类 `PythDataService.ts`
  - [x] SubTask 4.7: 创建 `index.ts` 统一导出
  - [x] SubTask 4.8: 更新所有导入路径
  - [x] SubTask 4.9: 删除原 `pythDataService.ts` 文件

## 验证任务

- [x] Task 5: 验证拆分结果
  - [x] SubTask 5.1: 运行 TypeScript 编译检查
  - [x] SubTask 5.2: 运行 ESLint 检查
  - [x] SubTask 5.3: 运行测试套件
  - [x] SubTask 5.4: 验证所有导入路径正确

# Task Dependencies

- Task 2 依赖 Task 1 完成（避免同时修改过多文件）
- Task 3 依赖 Task 2 完成
- Task 4 可以与 Task 1-3 并行执行
- Task 5 依赖 Task 1-4 全部完成
