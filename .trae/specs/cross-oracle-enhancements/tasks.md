# 跨预言机比较功能专业增强 - 实施计划

## [x] Task 1: 添加高级统计指标（标准差、方差、一致性评级）
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 实现标准差和方差的计算函数
  - 添加一致性评级逻辑（基于标准差大小）
  - 在统计卡片区域显示这些新指标
  - 添加相应的国际化文本
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `programmatic` TR-1.1: 标准差和方差计算正确
  - `programmatic` TR-1.2: 一致性评级根据标准差正确显示（优秀/良好/一般/较差）
  - `human-judgement` TR-1.3: 统计卡片布局美观，指标清晰可见
- **Notes**: 标准差阈值建议：<0.1%优秀，0.1%-0.3%良好，0.3%-0.5%一般，>0.5%较差

## [x] Task 2: 实现价格异常检测和高亮功能
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 实现 Z-score 异常检测算法
  - 在价格表格中高亮显示异常价格
  - 添加异常标记图标
  - 添加相应的国际化文本
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `programmatic` TR-2.1: Z-score 计算正确
  - `programmatic` TR-2.2: 异常价格被正确识别和高亮
  - `human-judgement` TR-2.3: 异常标记清晰可见，不干扰正常数据阅读
- **Notes**: Z-score 阈值设为 ±2

## [x] Task 3: 实现基于置信度的加权平均计算
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 实现加权平均计算函数
  - 在平均价格统计卡片中同时显示简单平均和加权平均
  - 添加权重来源说明
  - 更新国际化文本
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `programmatic` TR-3.1: 加权平均计算正确（基于置信度）
  - `human-judgement` TR-3.2: 两种平均值都清晰显示，易于区分
- **Notes**: 没有置信度数据的预言机默认权重为 1

## [x] Task 4: 添加数据导出功能（CSV/JSON）
- **Priority**: P1
- **Depends On**: None
- **Description**: 
  - 添加导出按钮和格式选择器
  - 实现 CSV 导出功能
  - 实现 JSON 导出功能
  - 添加下载文件的命名逻辑
  - 添加相应的国际化文本
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `programmatic` TR-5.1: CSV 文件格式正确，包含所有必要数据
  - `programmatic` TR-5.2: JSON 文件格式正确，结构完整
  - `programmatic` TR-5.3: 文件下载功能正常工作
  - `human-judgement` TR-5.4: 导出按钮位置合理，易于发现
- **Notes**: 导出文件命名建议包含日期时间戳

## [ ] Task 5: 添加时间范围选择器
- **Priority**: P1
- **Depends On**: None
- **Description**: 
  - 添加时间范围选择器 UI 组件
  - 实现历史数据请求参数调整
  - 更新图表数据展示逻辑
  - 添加相应的国际化文本
- **Acceptance Criteria Addressed**: [AC-6]
- **Test Requirements**:
  - `programmatic` TR-6.1: 时间范围选择器选项正确显示
  - `programmatic` TR-6.2: 选择不同时间范围时图表数据正确更新
  - `human-judgement` TR-6.3: 时间范围选择器 UI 美观，交互流畅
- **Notes**: 时间范围选项：1小时/6小时/24小时/7天

## [ ] Task 6: 添加预言机健康状态监控
- **Priority**: P1
- **Depends On**: None
- **Description**: 
  - 记录各预言机的响应时间
  - 跟踪预言机的可用性统计
  - 在预言机列表或表格中显示健康状态
  - 添加健康状态指示器（颜色编码）
  - 添加相应的国际化文本
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `programmatic` TR-4.1: 响应时间正确记录和显示
  - `human-judgement` TR-4.2: 健康状态指示器清晰直观
  - `human-judgement` TR-4.3: 健康状态信息不干扰主要数据展示
- **Notes**: 健康状态基于响应时间和成功率综合评估

## [ ] Task 7: 实现自定义权重配置面板
- **Priority**: P2
- **Depends On**: Task 3
- **Description**: 
  - 添加权重配置面板 UI
  - 实现权重调整交互（滑块或输入框）
  - 根据自定义权重重新计算加权平均
  - 支持重置为默认权重
  - 添加相应的国际化文本
- **Acceptance Criteria Addressed**: [AC-7]
- **Test Requirements**:
  - `programmatic` TR-7.1: 自定义权重正确应用于加权平均计算
  - `programmatic` TR-7.2: 重置功能正常工作
  - `human-judgement` TR-7.3: 权重配置面板 UI 美观，交互流畅
- **Notes**: 权重范围 0-10，总和不需要强制为 10

## [ ] Task 8: 添加价格偏差警报阈值设置
- **Priority**: P2
- **Depends On**: Task 2
- **Description**: 
  - 添加阈值设置 UI 组件
  - 实现阈值检查逻辑
  - 当超过阈值时高亮显示相应预言机
  - 添加相应的国际化文本
- **Acceptance Criteria Addressed**: [AC-8]
- **Test Requirements**:
  - `programmatic` TR-8.1: 阈值设置正确保存和应用
  - `programmatic` TR-8.2: 超过阈值的预言机被正确高亮
  - `human-judgement` TR-8.3: 阈值设置界面直观易用
- **Notes**: 默认阈值设为 0.5%

## [ ] Task 9: 实现预言机可靠性评分系统
- **Priority**: P2
- **Depends On**: Task 6
- **Description**: 
  - 设计可靠性评分算法（基于响应时间、可用性、置信度等）
  - 计算并显示各预言机的可靠性评分（1-10分）
  - 添加评分可视化指示器
  - 添加相应的国际化文本
- **Acceptance Criteria Addressed**: [AC-9]
- **Test Requirements**:
  - `programmatic` TR-9.1: 可靠性评分计算正确
  - `human-judgement` TR-9.2: 评分显示清晰直观
- **Notes**: 评分算法需要综合考虑多个因素

## [ ] Task 10: 优化图表交互和显示
- **Priority**: P2
- **Depends On**: Task 5
- **Description**: 
  - 添加数据点标注
  - 优化图表区域选择
  - 改进 tooltip 显示内容
  - 添加图表全屏查看功能（可选）
- **Acceptance Criteria Addressed**: [AC-6, AC-8]
- **Test Requirements**:
  - `human-judgement` TR-10.1: 数据点标注清晰可见
  - `human-judgement` TR-10.2: 图表交互流畅自然
  - `human-judgement` TR-10.3: tooltip 信息丰富且排版美观
