# 跨链比较页面数据深度改进任务清单

## 任务总览
基于专业评估报告，将综合评分从7.4/10提升至8.5+。

---

## P0 - 高优先级任务

### 任务1: 相关系数显著性检验 ✅
- [x] 为Pearson相关系数计算p-value
- [x] 在相关性矩阵中显示显著性标记（* p<0.05, ** p<0.01）
- [x] 添加样本数量(n)显示
- [x] 相关文件: CorrelationMatrix.tsx, utils.ts

### 任务2: 动态异常检测阈值 ✅
- [x] 基于历史波动率计算自适应阈值
- [x] 实现ATR(Average True Range)动态阈值
- [x] 添加阈值类型切换（固定/动态）
- [x] 相关文件: useCrossChainData.ts, PriceComparisonTable.tsx, CrossChainFilters.tsx

### 任务3: 协整分析功能 ✅
- [x] 实现Engle-Granger协整检验
- [x] 添加协整关系可视化（价差序列图）
- [x] 显示协整系数和残差标准差
- [x] 相关文件: 新增 cointegration.ts, CointegrationAnalysis.tsx, page.tsx

---

## P1 - 中优先级任务

### 任务4: 波动率GARCH模型
- [ ] 实现简易GARCH(1,1)波动率预测
- [ ] 添加波动率锥(Volatility Cone)图表
- [ ] 显示条件波动率序列
- [ ] 相关文件: 新增 volatilityModel.ts

### 任务5: 扩展分位数分析
- [ ] 添加10th/90th/95th/99th分位数计算
- [ ] 实现分位数表格展示
- [ ] 添加VaR(Value at Risk)估算
- [ ] 相关文件: utils.ts, page.tsx

### 任务6: 热力图历史切片
- [ ] 支持选择历史时间点查看热力图
- [ ] 添加时间滑块控件
- [ ] 实现热力图变化动画
- [ ] 相关文件: PriceSpreadHeatmap.tsx

---

## P2 - 低优先级任务

### 任务7: 格兰杰因果检验
- [ ] 实现双变量格兰杰因果检验
- [ ] 添加因果方向可视化
- [ ] 显示F统计量和p-value
- [ ] 相关文件: 新增 grangerCausality.ts

### 任务8: 主成分分析(PCA)
- [ ] 实现价格数据的PCA降维
- [ ] 添加解释方差比例图表
- [ ] 显示主成分载荷矩阵
- [ ] 相关文件: 新增 pcaAnalysis.ts

### 任务9: ML异常检测
- [ ] 实现Isolation Forest算法
- [ ] 与现有规则检测对比展示
- [ ] 添加异常分数排名
- [ ] 相关文件: 新增 mlAnomalyDetection.ts

---

## 任务依赖关系

```
任务3 (协整分析)
    └── 依赖 任务2 (动态阈值) - 共享波动率计算逻辑

任务4 (GARCH)
    └── 依赖 任务2 (动态阈值) - 共享历史数据接口

任务6 (热力图历史)
    └── 依赖 现有历史数据API

任务7 (格兰杰因果)
    └── 依赖 任务1 (显著性检验) - 共享统计检验框架
```

---

## 验收标准

### 功能验收
- [ ] P0任务全部完成
- [ ] 新增指标通过单元测试
- [ ] 性能无明显下降（页面加载<2s）

### 专业度验收
- [ ] 统计方法有文献/标准支撑
- [ ] 指标计算结果与Python statsmodels一致
- [ ] 通过统计学合理性review
