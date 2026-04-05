# 大文件拆分检查清单

## api3.ts 拆分检查

- [x] `src/hooks/oracles/api3/` 目录已创建
- [x] `types.ts` 包含所有共享类型定义
- [x] `useAPI3Price.ts` 包含价格相关 hooks
- [x] `useAPI3Historical.ts` 包含历史数据 hooks
- [x] `useAPI3Alerts.ts` 包含告警相关 hooks
- [x] `useAPI3Quality.ts` 包含质量指标 hooks
- [x] `useAPI3Staking.ts` 包含质押相关 hooks
- [x] `useAPI3Coverage.ts` 包含覆盖池 hooks
- [x] `useAPI3OEV.ts` 包含 OEV 相关 hooks
- [x] `useAPI3Network.ts` 包含网络状态 hooks
- [x] `useAPI3Cache.ts` 包含缓存相关 hooks
- [x] `index.ts` 正确导出所有 hooks
- [x] 原 `api3.ts` 文件已删除
- [x] 所有导入路径已更新

## cross-chain/utils.ts 拆分检查

- [x] `src/app/[locale]/cross-chain/utils/` 目录已创建
- [x] `colorUtils.ts` 包含所有颜色相关工具函数
- [x] `statisticsUtils.ts` 包含统计计算工具函数
- [x] `outlierUtils.ts` 包含异常检测工具函数
- [x] `correlationUtils.ts` 包含相关性计算工具函数
- [x] `volatilityUtils.ts` 包含波动率计算工具函数
- [x] `index.ts` 正确导出所有工具函数
- [x] 原 `utils.ts` 文件已删除
- [x] `useCrossChainData.ts` 导入路径已更新

## defiLlamaApi.ts 拆分检查

- [x] `src/lib/services/marketData/defiLlamaApi/` 目录已创建
- [x] `types.ts` 包含所有类型定义
- [x] `client.ts` 包含基础客户端和错误处理
- [x] `oracles.ts` 包含 Oracle 数据获取函数
- [x] `assets.ts` 包含资产数据获取函数
- [x] `chains.ts` 包含链相关数据函数
- [x] `protocols.ts` 包含协议详情函数
- [x] `comparison.ts` 包含对比分析函数
- [x] `index.ts` 正确导出所有函数和类型
- [x] 原 `defiLlamaApi.ts` 文件已删除
- [x] 所有导入路径已更新

## pythDataService.ts 拆分检查

- [x] `src/lib/oracles/pyth/` 目录已创建
- [x] `types.ts` 包含所有类型定义
- [x] `pythWebSocket.ts` 包含 WebSocket 管理逻辑
- [x] `pythCache.ts` 包含缓存管理逻辑
- [x] `pythParser.ts` 包含数据解析逻辑
- [x] `PythDataService.ts` 是精简后的核心服务类
- [x] `index.ts` 正确导出服务和类型
- [x] 原 `pythDataService.ts` 文件已删除
- [x] 所有导入路径已更新

## 代码质量检查

- [x] TypeScript 编译通过，无类型错误
- [x] ESLint 检查通过，无 lint 错误
- [x] 所有测试通过
- [x] 无循环依赖
- [x] 所有导入使用别名 `@/`
- [x] 每个拆分后的文件行数在合理范围内（< 800 行）

## 向后兼容性检查

- [x] 原有导入路径仍然有效（通过 index.ts 重导出）
- [x] 无破坏性变更
- [x] API 签名保持一致
