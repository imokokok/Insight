# 测试代码补充验收清单

## P0 - 核心算法测试验收

### 异常检测模块
- [ ] `calculateStdDevDetection` 测试覆盖：均值、标准差、上下界、异常点识别
- [ ] `detectPriceAnomalies` 测试覆盖：收益率计算、异常类型判定、等级划分
- [ ] `detectTrendBreak` 测试覆盖：CUSUM算法、趋势方向、突变点检测
- [ ] `detectVolatilityAnomalies` 测试覆盖：滚动窗口、年化波动率
- [ ] `detectVolumeAnomalies` 测试覆盖：成交量异常检测
- [ ] 边界条件测试：空数组、单元素、全零值、极大/极小值
- [ ] 测试覆盖率 ≥ 90%

### 风险指标模块
- [ ] `calculateHHI` 测试覆盖：指数计算、风险等级、CR4集中度
- [ ] `calculateDiversificationScore` 测试覆盖：各维度评分、加权计算
- [ ] `calculateVolatilityIndex` 测试覆盖：对数收益率、年化处理
- [ ] `calculateCorrelationRisk` 测试覆盖：矩阵处理、高相关性对识别
- [ ] `calculateRiskMetrics` 集成测试覆盖：综合评分计算
- [ ] 边界条件测试：空数据、单元素、负值处理
- [ ] 测试覆盖率 ≥ 90%

### 技术指标模块
- [ ] `calculateSMA` / `calculateSMAWithNull` 测试覆盖
- [ ] `calculateEMA` / `calculateEMAWithNull` 测试覆盖
- [ ] `calculateRSI` 测试覆盖：边界值(0,100)、平均涨跌计算
- [ ] `calculateMACD` 测试覆盖：DIF、DEA、柱状图、信号识别
- [ ] `calculateBollingerBands` 测试覆盖：上中下轨、带宽、位置
- [ ] `calculateATR` 测试覆盖：真实波幅、平均计算
- [ ] 使用已知数据集验证计算结果
- [ ] 测试覆盖率 ≥ 90%

### 统计函数模块
- [ ] `calculateCDF` 测试覆盖：概率分布、分位数
- [ ] `calculatePercentile` 测试覆盖：插值计算、边界值
- [ ] `calculateQuantiles` 测试覆盖：P50/P90/P95/P99/P99.9
- [ ] `calculateHistogram` 测试覆盖：分箱、百分比
- [ ] 测试覆盖率 ≥ 90%

## P1 - 数据处理层测试验收

### WebSocket模块
- [ ] 连接状态转换测试：connecting → connected → disconnected
- [ ] 重连机制测试：指数退避、最大重试次数
- [ ] 心跳机制测试：ping/pong、超时处理
- [ ] 消息订阅/取消订阅测试
- [ ] 消息队列测试：离线缓存、连接后刷新
- [ ] MockWebSocketManager测试覆盖
- [ ] 测试覆盖率 ≥ 85%

### 告警检测模块
- [ ] 扩展边界条件测试
- [ ] 并发告警测试
- [ ] 格式化函数测试
- [ ] 测试覆盖率 ≥ 85%

### Oracle客户端
- [ ] Chainlink客户端测试
- [ ] Pyth客户端测试
- [ ] Band Protocol客户端测试
- [ ] API3客户端测试
- [ ] RedStone客户端测试
- [ ] Tellor客户端测试
- [ ] DIA客户端测试
- [ ] Chronicle客户端测试
- [ ] UMA客户端测试
- [ ] WINkLink客户端测试
- [ ] 测试覆盖率 ≥ 80%

## P2 - API层测试验收

### Oracle API
- [ ] GET请求参数验证测试
- [ ] GET价格查询测试
- [ ] GET历史数据查询测试
- [ ] POST批量查询测试
- [ ] 错误响应格式测试
- [ ] 中间件测试（日志、限流）
- [ ] 测试覆盖率 ≥ 80%

### Alerts API
- [ ] CRUD操作测试
- [ ] 告警事件测试
- [ ] 权限验证测试
- [ ] 测试覆盖率 ≥ 80%

### Auth API
- [ ] OAuth回调测试
- [ ] 用户资料测试
- [ ] 测试覆盖率 ≥ 80%

### 其他API
- [ ] Favorites API测试
- [ ] Snapshots API测试
- [ ] Health API测试
- [ ] Cron cleanup API测试

## P3 - UI层测试验收

### React Hooks
- [ ] useRealtimePrice测试
- [ ] useRealtimeAlerts测试
- [ ] useFavorites测试
- [ ] useChartExport测试
- [ ] useKeyboardShortcuts测试
- [ ] 测试覆盖率 ≥ 75%

## 测试基础设施验收

### 测试工具
- [ ] 测试数据工厂创建完成
- [ ] 测试工具函数创建完成
- [ ] Mock数据生成器配置完成

### 配置和CI/CD
- [ ] Jest配置更新（覆盖率阈值）
- [ ] 测试脚本添加到package.json
- [ ] CI/CD集成测试命令

## 整体验收标准

- [ ] 整体测试覆盖率 ≥ 70%
- [ ] 所有测试通过（npm run test）
- [ ] 无TypeScript类型错误
- [ ] 测试执行时间合理（< 60秒）
- [ ] 测试代码遵循项目代码规范
