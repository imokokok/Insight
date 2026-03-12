# 首页功能更新规格说明

## Why
当前首页展示的是通用的预言机数据仪表盘，但用户希望首页能够展示项目实际拥有的功能模块，并提供跳转到相应页面的入口。这样可以提升用户体验，让用户更直观地了解平台提供的各项功能。

## What Changes
- **修改首页 Hero 区域**: 将现有的通用描述改为项目功能导航入口
- **添加功能卡片网格**: 展示项目所有可用功能模块
- **添加快速跳转链接**: 每个功能卡片可点击跳转到对应页面
- **保留数据概览**: 保留关键数据统计展示

## Impact
- Affected specs: 首页用户体验
- Affected code: 
  - `src/app/page.tsx` - 首页主组件
  - 可能需要更新 i18n 翻译文件

## ADDED Requirements

### Requirement: 功能导航展示
首页 SHALL 展示项目所有可用功能模块的导航入口。

#### Scenario: 功能卡片展示
- **GIVEN** 用户访问首页
- **WHEN** 页面加载完成
- **THEN** 展示以下功能模块卡片：
  1. 价格查询 - 多预言机价格对比查询
  2. 跨预言机对比 - 不同预言机数据对比分析
  3. 跨链价格监控 - 多链价格差异监控
  4. Chainlink - Chainlink 预言机详情
  5. Band Protocol - Band Protocol 预言机详情
  6. UMA - UMA 预言机详情
  7. Pyth Network - Pyth Network 预言机详情
  8. API3 - API3 预言机详情

#### Scenario: 功能卡片交互
- **GIVEN** 用户看到功能卡片
- **WHEN** 用户点击卡片
- **THEN** 跳转到对应的功能页面

#### Scenario: 数据统计保留
- **GIVEN** 用户访问首页
- **WHEN** 页面加载完成
- **THEN** 保留展示关键数据统计（总数据源、活跃预言机、24h更新数、平均响应时间）

## MODIFIED Requirements
无

## REMOVED Requirements
无
