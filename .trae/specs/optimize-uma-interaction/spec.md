# UMA页面交互优化建议 Spec

## Why
UMA页面作为预言机数据分析平台，当前已具备完善的数据可视化功能，但在交互细节上存在一些影响专业用户体验的问题。需要在不过度设计的前提下，针对数据分析的核心需求进行适度优化。

## What Changes
- 验证者表格添加搜索筛选和分页功能
- 争议列表添加搜索功能和完整分页控件
- 添加数据最后更新时间显示和自动刷新提示
- 热力图添加时间范围选择（24H/7D）
- 验证者对比添加快速选择功能（Top 3/随机）

## Impact
- Affected specs: UMA页面交互体验
- Affected code:
  - `src/components/oracle/ValidatorAnalyticsPanel.tsx`
  - `src/components/oracle/DisputeResolutionPanel.tsx`
  - `src/components/oracle/ValidatorPerformanceHeatmap.tsx`
  - `src/components/oracle/ValidatorComparison.tsx`

## ADDED Requirements

### Requirement: 验证者表格搜索与分页
系统应为验证者表格提供搜索筛选和分页功能，便于用户快速定位目标验证者。

#### Scenario: 搜索验证者
- **WHEN** 用户在搜索框输入验证者名称或ID
- **THEN** 系统实时过滤表格，显示匹配的验证者
- **AND** 搜索支持模糊匹配

#### Scenario: 分页浏览验证者
- **WHEN** 验证者数量超过每页显示数量（默认10条）
- **THEN** 系统显示分页控件
- **AND** 用户可以切换页码或调整每页显示数量

### Requirement: 争议列表搜索与分页
系统应为争议列表提供搜索功能和完整分页控件。

#### Scenario: 搜索争议
- **WHEN** 用户在搜索框输入争议ID
- **THEN** 系统过滤列表，显示匹配的争议记录
- **AND** 支持按ID精确匹配

#### Scenario: 分页浏览争议
- **WHEN** 争议数量超过每页显示数量
- **THEN** 系统显示完整分页控件（首页、上一页、页码、下一页、末页）
- **AND** 显示总记录数和当前页范围

### Requirement: 数据更新时间显示
系统应显示数据最后更新时间，并提供刷新状态提示。

#### Scenario: 查看数据更新时间
- **WHEN** 用户访问验证者分析或争议解决页面
- **THEN** 系统在页面顶部显示"最后更新: XX秒前"
- **AND** 数据刷新时显示加载状态指示器

#### Scenario: 自动刷新提示
- **WHEN** 数据自动刷新完成
- **THEN** 系统显示简短的刷新成功提示（如Toast通知）
- **AND** 更新"最后更新时间"

### Requirement: 热力图时间范围选择
系统应支持热力图时间范围选择，允许用户查看不同时间段的数据。

#### Scenario: 切换热力图时间范围
- **WHEN** 用户点击时间范围选择按钮（24H/7D）
- **THEN** 系统更新热力图显示对应时间段的数据
- **AND** 7D视图按天聚合显示数据

### Requirement: 验证者快速选择
系统应为验证者对比功能提供快速选择功能。

#### Scenario: 快速选择Top 3验证者
- **WHEN** 用户点击"Top 3"按钮
- **THEN** 系统自动选择声誉排名前三的验证者
- **AND** 显示对比图表

#### Scenario: 随机选择验证者
- **WHEN** 用户点击"随机选择"按钮
- **THEN** 系统随机选择4个验证者
- **AND** 显示对比图表

## MODIFIED Requirements
无修改的需求。

## REMOVED Requirements
无移除的需求。
