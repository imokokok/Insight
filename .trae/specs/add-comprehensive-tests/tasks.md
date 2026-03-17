# Tasks

## P0 - 核心算法测试（必须立即补充）

- [ ] Task 1: 异常检测模块测试 - `src/lib/analytics/__tests__/anomalyDetection.test.ts`
  - [ ] SubTask 1.1: 测试 `calculateStdDevDetection` - 标准差计算正确性、边界条件（空数组、单元素）
  - [ ] SubTask 1.2: 测试 `detectPriceAnomalies` - 价格异常检测、收益率计算、异常等级判定
  - [ ] SubTask 1.3: 测试 `detectTrendBreak` - CUSUM算法、趋势方向判定、突变点检测
  - [ ] SubTask 1.4: 测试 `detectVolatilityAnomalies` - 滚动波动率计算、年化处理
  - [ ] SubTask 1.5: 测试 `detectVolumeAnomalies` - 成交量异常检测
  - [ ] SubTask 1.6: 测试 `detectAllAnomalies` - 综合检测集成测试

- [ ] Task 2: 风险指标模块测试 - `src/lib/analytics/__tests__/riskMetrics.test.ts`
  - [ ] SubTask 2.1: 测试 `calculateHHI` - HHI指数计算、风险等级划分、CR4集中度
  - [ ] SubTask 2.2: 测试 `calculateDiversificationScore` - 多元化评分、各维度权重
  - [ ] SubTask 2.3: 测试 `calculateVolatilityIndex` - 波动率指数、年化计算
  - [ ] SubTask 2.4: 测试 `calculateCorrelationRisk` - 相关性矩阵处理、高相关性对识别
  - [ ] SubTask 2.5: 测试 `calculateRiskMetrics` - 综合风险指标集成测试

- [ ] Task 3: 技术指标模块测试 - `src/lib/indicators/__tests__/calculations.test.ts`
  - [ ] SubTask 3.1: 测试 `calculateSMA` / `calculateSMAWithNull` - 简单移动平均
  - [ ] SubTask 3.2: 测试 `calculateEMA` / `calculateEMAWithNull` - 指数移动平均
  - [ ] SubTask 3.3: 测试 `calculateRSI` / `calculateRSIFromData` - RSI计算、边界值（0, 100）
  - [ ] SubTask 3.4: 测试 `calculateMACD` / `calculateMACDExtended` - MACD线、信号线、柱状图、金叉死叉信号
  - [ ] SubTask 3.5: 测试 `calculateBollingerBands` 系列 - 布林带上中下轨、带宽、位置
  - [ ] SubTask 3.6: 测试 `calculateATR` - 真实波幅、平均真实波幅
  - [ ] SubTask 3.7: 测试 `calculateVolatility` / `calculateROC` - 波动率和变化率

- [ ] Task 4: 统计函数模块测试 - `src/lib/utils/__tests__/statistics.test.ts`
  - [ ] SubTask 4.1: 测试 `calculateCDF` - 累积分布函数、概率值范围
  - [ ] SubTask 4.2: 测试 `calculatePercentile` - 分位数计算、插值方法
  - [ ] SubTask 4.3: 测试 `calculateQuantiles` - 常用分位数（P50/P90/P95/P99/P99.9）
  - [ ] SubTask 4.4: 测试 `calculateHistogram` - 直方图分箱、百分比计算

## P1 - 数据处理层测试（高优先级）

- [ ] Task 5: WebSocket模块测试 - `src/lib/realtime/__tests__/websocket.test.ts`
  - [ ] SubTask 5.1: 测试连接管理 - connect/disconnect/reconnect状态转换
  - [ ] SubTask 5.2: 测试心跳机制 - ping/pong、超时处理
  - [ ] SubTask 5.3: 测试消息订阅 - subscribe/unsubscribe、消息分发
  - [ ] SubTask 5.4: 测试重连机制 - 指数退避、最大重试次数
  - [ ] SubTask 5.5: 测试消息队列 - 离线消息缓存、连接后刷新
  - [ ] SubTask 5.6: 测试MockWebSocketManager - 模拟数据生成

- [ ] Task 6: 扩展现有告警检测测试 - `src/lib/alerts/__tests__/detector.test.ts`
  - [ ] SubTask 6.1: 添加边界条件测试 - 零价格、负价格、极大值
  - [ ] SubTask 6.2: 添加并发告警测试 - 多告警同时触发
  - [ ] SubTask 6.3: 添加格式化函数测试 - 国际化消息格式

- [ ] Task 7: Oracle客户端测试 - `src/lib/oracles/__tests__/`
  - [ ] SubTask 7.1: 测试Chainlink客户端 - `chainlink.test.ts`
  - [ ] SubTask 7.2: 测试Pyth客户端 - `pythNetwork.test.ts`
  - [ ] SubTask 7.3: 测试Band Protocol客户端 - `bandProtocol.test.ts`
  - [ ] SubTask 7.4: 测试API3客户端 - `api3.test.ts`
  - [ ] SubTask 7.5: 测试RedStone客户端 - `redstone.test.ts`
  - [ ] SubTask 7.6: 测试Tellor客户端 - `tellor.test.ts`
  - [ ] SubTask 7.7: 测试DIA客户端 - `dia.test.ts`
  - [ ] SubTask 7.8: 测试Chronicle客户端 - `chronicle.test.ts`
  - [ ] SubTask 7.9: 测试UMA客户端 - `uma/client.test.ts`
  - [ ] SubTask 7.10: 测试WINkLink客户端 - `winklink.test.ts`

## P2 - API层测试（中优先级）

- [ ] Task 8: Oracle API集成测试 - `src/app/api/oracles/__tests__/route.test.ts`
  - [ ] SubTask 8.1: 测试GET请求 - 参数验证、价格查询、历史数据查询
  - [ ] SubTask 8.2: 测试POST请求 - 批量价格查询
  - [ ] SubTask 8.3: 测试错误响应 - 无效provider、缺失参数、无效period
  - [ ] SubTask 8.4: 测试中间件 - 日志记录、限流

- [ ] Task 9: Alerts API集成测试 - `src/app/api/alerts/__tests__/route.test.ts`
  - [ ] SubTask 9.1: 测试CRUD操作 - 创建、读取、更新、删除告警
  - [ ] SubTask 9.2: 测试告警事件 - 事件列表、确认操作
  - [ ] SubTask 9.3: 测试权限验证 - 用户认证、资源所有权

- [ ] Task 10: Auth API集成测试 - `src/app/api/auth/__tests__/`
  - [ ] SubTask 10.1: 测试OAuth回调 - `callback/route.test.ts`
  - [ ] SubTask 10.2: 测试用户资料 - `profile/route.test.ts`

- [ ] Task 11: 其他API端点测试
  - [ ] SubTask 11.1: Favorites API - `src/app/api/favorites/__tests__/route.test.ts`
  - [ ] SubTask 11.2: Snapshots API - `src/app/api/snapshots/__tests__/route.test.ts`
  - [ ] SubTask 11.3: Health API - `src/app/api/health/__tests__/route.test.ts`
  - [ ] SubTask 11.4: Cron cleanup API - `src/app/api/cron/cleanup/__tests__/route.test.ts`

## P3 - UI层测试（低优先级）

- [ ] Task 12: React Hooks测试扩展
  - [ ] SubTask 12.1: 测试 `useRealtimePrice` - `src/hooks/realtime/__tests__/useRealtimePrice.test.ts`
  - [ ] SubTask 12.2: 测试 `useRealtimeAlerts` - `src/hooks/realtime/__tests__/useRealtimeAlerts.test.ts`
  - [ ] SubTask 12.3: 测试 `useFavorites` - `src/hooks/__tests__/useFavorites.test.ts`
  - [ ] SubTask 12.4: 测试 `useChartExport` - `src/hooks/__tests__/useChartExport.test.ts`
  - [ ] SubTask 12.5: 测试 `useKeyboardShortcuts` - `src/hooks/__tests__/useKeyboardShortcuts.test.ts`

- [ ] Task 13: 测试工具和配置优化
  - [ ] SubTask 13.1: 创建测试数据工厂 - `src/lib/__tests__/fixtures/`
  - [ ] SubTask 13.2: 创建测试工具函数 - `src/lib/__tests__/utils/testUtils.ts`
  - [ ] SubTask 13.3: 更新Jest配置 - 提高覆盖率阈值
  - [ ] SubTask 13.4: 添加测试脚本 - CI/CD集成

## P4 - 组件测试（可选）

- [ ] Task 14: 关键组件测试
  - [ ] SubTask 14.1: 测试图表组件 - `src/components/oracle/charts/`
  - [ ] SubTask 14.2: 测试告警组件 - `src/components/alerts/`
  - [ ] SubTask 14.3: 测试表单组件 - `src/components/oracle/forms/`

# Task Dependencies
- [Task 5] depends on [Task 1] (WebSocket测试需要理解异常检测数据格式)
- [Task 8] depends on [Task 7] (API测试需要Oracle客户端正常工作)
- [Task 12] depends on [Task 5] (Hooks测试依赖WebSocket模块)
- [Task 13] 应该在其他任务之前或并行完成
