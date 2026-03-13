# Tasks

- [x] Task 1: 扩展 UMA 数据模型 - 添加争议类型和链上链接字段
  - [x] SubTask 1.1: 更新 DisputeData 接口，添加 type 和 transactionHash 字段
  - [x] SubTask 1.2: 更新 ValidatorData 接口，添加 address 字段
  - [x] SubTask 1.3: 添加争议类型枚举定义

- [x] Task 2: 增强 UMAClient - 添加历史数据获取方法
  - [x] SubTask 2.1: 实现 getDisputesWithType() 方法
  - [x] SubTask 2.2: 实现 getValidatorHistory() 方法
  - [x] SubTask 2.3: 实现收益计算相关方法

- [x] Task 3: 优化争议解决面板 - 添加类型分类和链上链接
  - [x] SubTask 3.1: 在争议表格中添加类型列
  - [x] SubTask 3.2: 添加类型筛选器
  - [x] SubTask 3.3: 添加链上交易链接列
  - [x] SubTask 3.4: 更新争议趋势图，按类型分组显示

- [x] Task 4: 创建质押收益计算器组件
  - [x] SubTask 4.1: 创建 StakingCalculator 组件
  - [x] SubTask 4.2: 实现收益计算逻辑
  - [x] SubTask 4.3: 添加收益可视化图表
  - [x] SubTask 4.4: 添加参数调整控件

- [x] Task 5: 增强验证者分析面板 - 添加历史趋势
  - [x] SubTask 5.1: 创建 ValidatorHistoryChart 组件
  - [x] SubTask 5.2: 实现成功率趋势图
  - [x] SubTask 5.3: 实现响应时间趋势图
  - [x] SubTask 5.4: 实现声誉变化曲线
  - [x] SubTask 5.5: 集成收益计算器到验证者面板

- [x] Task 6: 更新导出和类型定义
  - [x] SubTask 6.1: 更新组件索引文件
  - [x] SubTask 6.2: 更新类型定义文件
  - [x] SubTask 6.3: 更新国际化文本

# Task Dependencies

- Task 3 依赖 Task 1 和 Task 2
- Task 4 依赖 Task 2
- Task 5 依赖 Task 2 和 Task 4
- Task 6 依赖 Task 3、Task 4 和 Task 5
