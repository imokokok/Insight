# Tasks

## P0 紧急修复

- [x] Task 1: 修复getHistoricalPrices逻辑错误
  - [x] SubTask 1.1: 重写getHistoricalPrices方法，使用价格波动模拟生成真实历史数据
  - [x] SubTask 1.2: 添加价格波动参数配置（波动范围、趋势等）
  - [x] SubTask 1.3: 确保生成的数据符合金融数据特征

## P1 高优先级修复

- [x] Task 2: 统一DIANetworkStats类型定义
  - [x] SubTask 2.1: 删除src/app/[locale]/dia/types.ts中的重复定义
  - [x] SubTask 2.2: 更新所有导入语句使用统一类型
  - [x] SubTask 2.3: 确保类型定义完整包含所有必要字段

- [x] Task 3: 移除DIAMarketView硬编码数据
  - [x] SubTask 3.1: 移除硬编码的交易量和流动性数据
  - [x] SubTask 3.2: 使用config或API数据替代
  - [x] SubTask 3.3: 添加数据缺失时的降级显示

- [x] Task 4: 移除DIAHero硬编码数据
  - [x] SubTask 4.1: 移除硬编码的统计数据（活跃数据源、质押量等）
  - [x] SubTask 4.2: 使用动态数据源
  - [x] SubTask 4.3: 保持UI一致性

- [x] Task 5: 移除DIAEcosystemView硬编码数据
  - [x] SubTask 5.1: 移除硬编码的TVL趋势数据
  - [x] SubTask 5.2: 移除硬编码的项目分布数据
  - [x] SubTask 5.3: 使用API或动态生成数据

## P2 中优先级修复

- [x] Task 6: 提取重复的工具函数
  - [x] SubTask 6.1: 创建src/lib/utils/oracle-helpers.ts文件
  - [x] SubTask 6.2: 提取formatTVL函数
  - [x] SubTask 6.3: 提取getChainLabel和getChainBadgeColor函数
  - [x] SubTask 6.4: 更新所有组件使用共享函数

- [x] Task 7: 修复全局单例问题
  - [x] SubTask 7.1: 移除模块顶层的diaClient实例
  - [x] SubTask 7.2: 在hooks内部创建实例或使用useMemo
  - [x] SubTask 7.3: 确保测试兼容性

## P3 低优先级修复

- [x] Task 8: 清理未使用的变量
  - [x] SubTask 8.1: 移除useDIAPage中未使用的client变量
  - [x] SubTask 8.2: 移除或使用dataFreshnessStatus变量

# Task Dependencies
- [Task 2] 需要先完成，因为其他任务可能依赖类型定义 ✅
- [Task 6] 可以与Task 3-5并行执行 ✅
- [Task 7] 可以与Task 3-5并行执行 ✅
- [Task 8] 可以最后执行 ✅
