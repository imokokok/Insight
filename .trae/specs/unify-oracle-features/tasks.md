# 任务列表：预言机页面功能完善

## 任务一：更新预言机配置文件

- [x] 为 Pyth 添加 `risk` 和 `cross-oracle` 标签
- [x] 为 Band Protocol 添加 `risk` 标签
- [x] 为 UMA 添加 `risk` 标签
- [x] 为 RedStone 添加 `cross-oracle` 标签

## 任务二：更新 Pyth Network 页面

- [x] 添加 `risk` 标签处理逻辑
- [x] 添加 `cross-oracle` 标签处理逻辑
- [x] 集成 CrossOracleComparison 组件
- [x] 创建并使用 PythRiskAssessmentPanel 组件

## 任务三：更新 RedStone 页面

- [x] 添加 `cross-oracle` 标签处理逻辑
- [x] 集成 CrossOracleComparison 组件
- [x] 创建 RedStoneRiskAssessmentPanel 组件替换简单实现
- [x] 更新 `risk` 标签使用新的风险评估面板

## 任务四：重构 Band Protocol 页面

- [x] 创建完整的 Band Protocol 独立页面
- [x] 添加 `risk` 标签处理逻辑
- [x] 创建并使用 BandRiskAssessmentPanel 组件
- [x] 保留现有模板页面的功能

## 任务五：重构 UMA 页面

- [x] 创建完整的 UMA 独立页面
- [x] 添加 `risk` 标签处理逻辑
- [x] 创建并使用 UMARiskAssessmentPanel 组件
- [x] 保留现有模板页面的功能

## 任务六：创建风险评估面板组件

- [x] 创建 PythRiskAssessmentPanel 组件
  - [x] 发布者集中度风险评估
  - [x] 数据质量风险评估
  - [x] 跨链风险评估
  - [x] 质押风险评估
  - [x] 综合风险评分
- [x] 创建 RedStoneRiskAssessmentPanel 组件
  - [x] 数据流风险评估
  - [x] 提供商风险评估
  - [x] 模块化风险评估
  - [x] 综合风险评分
- [x] 创建 BandRiskAssessmentPanel 组件
  - [x] 验证者集中度风险评估
  - [x] 跨链风险评估
  - [x] 质押风险评估
  - [x] 综合风险评分
- [x] 创建 UMARiskAssessmentPanel 组件
  - [x] 争议解决风险评估
  - [x] 验证者风险评估
  - [x] 治理风险评估
  - [x] 综合风险评分

## 任务七：验证与测试

- [x] 验证所有页面的标签显示正确
- [x] 验证风险评估功能正常工作
- [x] 验证跨预言机对比功能正常工作（Pyth、RedStone）
- [x] 检查 TypeScript 类型错误
- [x] 检查 lint 错误

# 任务依赖关系

```
任务一 (配置更新)
    │
    ├──→ 任务二 (Pyth 页面更新)
    │
    ├──→ 任务三 (RedStone 页面更新)
    │
    ├──→ 任务四 (Band Protocol 页面重构)
    │
    └──→ 任务五 (UMA 页面重构)
             │
             └──→ 任务六 (创建风险评估面板)
                      │
                      └──→ 任务七 (验证测试)
```

# 优先级说明

- **高优先级**: 任务一、任务二、任务三
  - 这些任务影响现有独立页面，需要优先完成
- **中优先级**: 任务四、任务五
  - 重构模板页面需要更多工作量，但影响现有功能较少
- **低优先级**: 任务六
  - 创建风险评估面板可以并行进行
- **最后执行**: 任务七
  - 所有功能完成后进行统一验证
