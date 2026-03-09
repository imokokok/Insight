# 跨链比较功能专业增强 - 实施计划

## [x] Task 1: 添加高级统计指标（价差标准差、变异系数、价格一致性评分）
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 实现价差标准差和变异系数的计算函数
  - 添加价格一致性评级逻辑（基于价差标准差大小）
  - 在统计卡片区域显示这些新指标
  - 添加相应的国际化文本
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `programmatic` TR-1.1: 价差标准差和变异系数计算正确
  - `programmatic` TR-1.2: 价格一致性评级根据价差标准差正确显示（优秀/良好/一般/较差）
  - `human-judgement` TR-1.3: 统计卡片布局美观，新指标清晰可见
- **Notes**: 价差标准差阈值建议：<0.1%优秀，0.1%-0.3%良好，0.3%-0.5%一般，>0.5%较差

## [x] Task 2: 实现跨链价格稳定性与同步性分析
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 实现各链价格波动率计算函数（标准差/变异系数）
  - 实现价格更新延迟分析（与基准链对比）
  - 在专门的分析区域显示稳定性与同步性指标
  - 添加稳定性评级（稳定/一般/不稳定）
  - 添加相应的国际化文本
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `programmatic` TR-2.1: 各链价格波动率计算正确
  - `programmatic` TR-2.2: 价格更新延迟分析正确
  - `programmatic` TR-2.3: 稳定性评级根据波动率正确显示
  - `human-judgement` TR-2.4: 稳定性与同步性分析区域布局美观，指标清晰可见
- **Notes**: 波动率阈值建议：<0.1%稳定，0.1%-0.3%一般，>0.3%不稳定

## [x] Task 3: 添加自定义基准链选择功能
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 添加基准链选择器 UI 组件
  - 实现基于新基准链的价差重新计算逻辑
  - 更新表格表头的基准链信息显示
  - 添加相应的国际化文本
- **Acceptance Criteria Addressed**: [AC-7]
- **Test Requirements**:
  - `programmatic` TR-7.1: 切换基准链时价差重新计算正确
  - `programmatic` TR-7.2: 表头基准链信息正确更新
  - `human-judgement` TR-7.3: 基准链选择器 UI 美观，交互流畅
- **Notes**: 默认基准链为列表中的第一条链

## [x] Task 4: 添加数据导出功能（CSV/JSON）
- **Priority**: P1
- **Depends On**: None
- **Description**: 
  - 添加导出按钮和格式选择器
  - 实现 CSV 导出功能（包含当前价格和历史数据）
  - 实现 JSON 导出功能
  - 添加下载文件的命名逻辑
  - 添加相应的国际化文本
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `programmatic` TR-5.1: CSV 文件格式正确，包含所有必要数据
  - `programmatic` TR-5.2: JSON 文件格式正确，结构完整
  - `programmatic` TR-5.3: 文件下载功能正常工作
  - `human-judgement` TR-5.4: 导出按钮位置合理，易于发现
- **Notes**: 导出文件命名建议包含日期时间戳和交易对信息

## [x] Task 5: 添加时间范围选择器
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

## [x] Task 6: 实现跨链价格波动热力图
- **Priority**: P1
- **Depends On**: Task 5
- **Description**: 
  - 设计热力图数据结构
  - 实现热力图渲染（使用 Recharts 或自定义组件）
  - 配置颜色编码方案（绿色-黄色-红色表示价差大小）
  - 添加热力图 tooltip 显示详细信息
  - 添加相应的国际化文本
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `human-judgement` TR-3.1: 热力图布局美观，颜色编码清晰
  - `human-judgement` TR-3.2: tooltip 信息丰富且排版美观
  - `human-judgement` TR-3.3: 热力图渲染流畅，不卡顿
- **Notes**: 热力图显示两两链之间的价差关系

## [ ] Task 7: 添加链性能监控（Gas 价格、区块确认时间）
- **Priority**: P1
- **Depends On**: None
- **Description**: 
  - 研究并实现各链 Gas 价格获取方法
  - 研究并实现区块确认时间估算
  - 在链列表或表格中显示性能指标
  - 添加性能状态指示器（颜色编码）
  - 添加相应的国际化文本
- **Acceptance Criteria Addressed**: [AC-8]
- **Test Requirements**:
  - `programmatic` TR-8.1: Gas 价格和确认时间正确获取和显示
  - `human-judgement` TR-8.2: 性能状态指示器清晰直观
  - `human-judgement` TR-8.3: 性能信息不干扰主要数据展示
- **Notes**: 性能数据可能需要使用第三方 API

## [ ] Task 8: 添加价格偏差警报阈值设置
- **Priority**: P2
- **Depends On**: Task 3
- **Description**: 
  - 添加阈值设置 UI 组件
  - 实现阈值检查逻辑
  - 当超过阈值时高亮显示相应链
  - 添加相应的国际化文本
- **Acceptance Criteria Addressed**: [AC-9]
- **Test Requirements**:
  - `programmatic` TR-9.1: 阈值设置正确保存和应用
  - `programmatic` TR-9.2: 超过阈值的链被正确高亮
  - `human-judgement` TR-9.3: 阈值设置界面直观易用
- **Notes**: 默认阈值设为 0.5%

## [ ] Task 9: 实现链间价格相关性分析
- **Priority**: P2
- **Depends On**: Task 5
- **Description**: 
  - 实现皮尔逊相关系数计算函数
  - 生成链间价格相关系数矩阵
  - 设计相关性矩阵可视化（热力图或表格）
  - 添加相应的国际化文本
- **Acceptance Criteria Addressed**: [AC-10]
- **Test Requirements**:
  - `programmatic` TR-10.1: 相关系数计算正确
  - `human-judgement` TR-10.2: 相关性矩阵可视化清晰直观
- **Notes**: 相关性范围 -1 到 1，颜色编码表示正负相关

## [ ] Task 10: 添加历史时间段对比分析
- **Priority**: P2
- **Depends On**: Task 5
- **Description**: 
  - 添加时间段选择器（两个时间段）
  - 实现两个时间段的价差统计对比
  - 设计对比分析可视化（并排图表或表格）
  - 添加相应的国际化文本
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `programmatic` TR-4.1: 两个时间段的统计数据正确计算
  - `human-judgement` TR-4.2: 对比分析可视化清晰直观
  - `human-judgement` TR-4.3: 时间段选择器 UI 美观，交互流畅
- **Notes**: 默认对比当前时间段和前一个相同长度的时间段

## [ ] Task 11: 优化图表交互和显示
- **Priority**: P2
- **Depends On**: Task 5
- **Description**: 
  - 添加数据点标注
  - 优化图表区域选择
  - 改进 tooltip 显示内容（增加更多信息）
  - 添加图表全屏查看功能（可选）
- **Acceptance Criteria Addressed**: [AC-6]
- **Test Requirements**:
  - `human-judgement` TR-11.1: 数据点标注清晰可见
  - `human-judgement` TR-11.2: 图表交互流畅自然
  - `human-judgement` TR-11.3: tooltip 信息丰富且排版美观
