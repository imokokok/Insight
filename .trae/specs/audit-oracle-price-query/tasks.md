# Tasks

## 高优先级任务

- [x] Task 1: 修复 BandProtocolClient.getPrice 返回无效默认数据问题
  - [x] SubTask 1.1: 修改 getPrice 方法，在无法获取价格时抛出 OracleError
  - [x] SubTask 1.2: 更新相关单元测试以验证新的错误处理行为
  - [x] SubTask 1.3: 检查并更新调用方代码以处理新的异常行为

- [x] Task 2: 修复 RedStoneClient 双重 fallback 调用问题
  - [x] SubTask 2.1: 重构 getPrice 方法，移除 catch 块中的重复 Binance fallback 调用
  - [x] SubTask 2.2: 确保错误处理流程清晰，避免重复请求

- [x] Task 3: 修复 DIA Client 错误处理不完整问题
  - [x] SubTask 3.1: 重构 getPrice 方法，确保 Binance 失败时的错误信息被正确传递
  - [x] SubTask 3.2: 添加明确的错误日志记录

## 中优先级任务

- [x] Task 4: 统一各 Oracle Client 的错误处理策略
  - [x] SubTask 4.1: 在 BaseOracleClient 中定义统一的错误处理规范
  - [x] SubTask 4.2: 更新所有 Client 以遵循统一的错误处理规范
  - [x] SubTask 4.3: 创建错误处理文档说明

- [x] Task 5: 修复方法命名和日志信息错误
  - [x] SubTask 5.1: 重命名 ChainlinkClient.getHistoricalPricesFromCoinGecko 为更准确的名称
  - [x] SubTask 5.2: 修复 PythClient 中的日志信息错误
  - [x] SubTask 5.3: 修复 ChainlinkClient 中的日志信息错误

- [x] Task 6: 统一缓存策略
  - [x] SubTask 6.1: 评估各 Client 的缓存实现，确定统一方案
  - [x] SubTask 6.2: 将 RedStoneClient 的缓存逻辑迁移到基类或统一服务
  - [x] SubTask 6.3: 更新 DIA DataService 以使用统一的缓存策略

- [x] Task 7: 改进 Binance Market Service 数据验证
  - [x] SubTask 7.1: 添加 API 响应数据验证
  - [x] SubTask 7.2: 对于不可用的字段，返回 null 而非 0
  - [x] SubTask 7.3: 添加价格合理性检查（非零、非负、非 NaN）

## 低优先级任务

- [x] Task 8: 提取硬编码值为配置常量
  - [x] SubTask 8.1: 创建 oracle-config.ts 配置文件
  - [x] SubTask 8.2: 提取 confidence 默认值
  - [x] SubTask 8.3: 提取超时配置
  - [x] SubTask 8.4: 提取重试配置

- [x] Task 9: 改进 Pyth 置信区间生成
  - [x] SubTask 9.1: 重新设计置信区间生成算法
  - [x] SubTask 9.2: 基于实际市场数据计算合理的置信区间

- [x] Task 10: 清理冗余代码
  - [x] SubTask 10.1: 移除 RedStone Client 中未使用的时间戳转换函数
  - [x] SubTask 10.2: 清理其他冗余代码

# Task Dependencies

- Task 4 依赖 Task 1, Task 2, Task 3（需要先修复具体问题，再统一策略）
- Task 6 依赖 Task 4（统一错误处理后更容易统一缓存策略）
- Task 5 可以独立进行
- Task 7 可以独立进行
- Task 8, Task 9, Task 10 可以并行进行
