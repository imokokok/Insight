# 专业级首页设计 Spec

## Why
当前 Insight 首页虽然功能完整，但呈现方式过于简单，缺乏专业数据分析平台的视觉层次感和品牌质感。参考 Dune Analytics、Nansen、DeFiLlama、Glassnode 等顶级平台，首页应该具备：清晰的信息架构、精致的视觉设计、流畅的交互体验、以及突出平台核心价值的布局。

## What Changes - 专业级首页架构

### 整体设计理念
- **浅色主题**: 保持与现有页面一致的浅色主题（蓝白配色）
- **玻璃态设计**: 使用毛玻璃效果增加层次感和现代感
- **微交互动画**: 精致的悬停、滚动动画提升用户体验
- **数据驱动**: 让数据本身成为视觉焦点
- **呼吸感**: 充足的留白，避免信息过载

### 1. Hero 区域 - 沉浸式数据大屏
**参考**: Dune Analytics 首页
- 全屏浅色渐变背景
- 居中大标题 + 副标题
- 实时滚动的关键数据指标（跑马灯效果）
- 搜索框 prominently placed（类似 Dune 的 "Discover dashboards"）
- 渐变 CTA 按钮

### 2. 实时数据流 - 横向滚动展示
**参考**: Nansen 首页的实时活动展示
- 横向自动滚动的数据卡片
- 展示：最新价格更新、异常告警、大额交易等
- 玻璃态卡片设计
- 悬停暂停滚动

### 3. 核心指标仪表盘 - Bento Grid 布局
**参考**: Apple 产品页 + DeFiLlama
- 不规则网格布局（Bento Grid）
- 大卡片展示核心指标：TVS、活跃预言机、数据源数量
- 小卡片展示趋势图表
- 每个卡片都有精致的悬停效果

### 4. 预言机市场概览 - 交互式图表区
**参考**: DeFiLlama 的协议对比
- 市场份额饼图/环形图（可交互）
- TVS 趋势对比折线图
- 支持链数量对比柱状图
- 时间范围选择器（1D/7D/30D/ALL）

### 5. 跨链套利机会 - 实时热力图
**参考**: TradingView 的市场概览
- 实时更新的价格差异热力图
- 突出显示套利机会（闪烁效果）
- 快速交易对切换
- 简洁的图例说明

### 6. 精选 Dashboard 预览 - 内容展示
**参考**: Dune Analytics 的 Discover 页面
- 网格展示热门 Dashboard 预览
- 每个预览包含：缩略图、标题、创建者、数据指标
- 悬停放大效果
- "查看全部" 入口

### 7. 平台能力展示 - 特性卡片
**参考**: Nansen 的 Features 区域
- 3-4 个核心能力卡片横向排列
- 每个卡片：图标、标题、描述、数据亮点
- 精致的图标动画

### 8. 社区与生态 - 社交证明
**参考**: Glassnode 的社区展示
- 用户数量、支持的链、合作伙伴 Logo 墙
- 渐变背景 + 玻璃态卡片
- 数据统计动画（数字滚动）

### 9. CTA 区域 - 最终行动召唤
**参考**: Linear 的简洁 CTA
- 简洁有力的文案
- 主 CTA 按钮 + 次要链接

## Impact
- Affected specs: 首页整体视觉重构
- Affected code:
  - `src/app/page.tsx` - 完全重写
  - `src/app/home-components/` - 全部替换为新设计组件
  - `src/i18n/zh-CN.json` 和 `en.json` - 更新翻译

## ADDED Requirements

### Requirement: 专业级浅色主题
The system SHALL provide a professional light theme for the homepage, consistent with other pages.

#### Scenario: 用户访问首页
- **WHEN** 用户进入首页
- **THEN** 看到与现有页面一致的浅色主题界面
- **AND** 使用蓝白配色方案
- **AND** 数据可视化清晰突出

### Requirement: 玻璃态设计元素
The system SHALL use glassmorphism design for cards and overlays.

#### Scenario: 用户浏览页面
- **WHEN** 用户查看卡片组件
- **THEN** 看到半透明毛玻璃效果
- **AND** 背景有微妙的模糊效果
- **AND** 边框有细腻的发光效果

### Requirement: 实时数据流展示
The system SHALL display a horizontally scrolling real-time data feed.

#### Scenario: 用户查看实时数据
- **WHEN** 用户浏览页面
- **THEN** 看到横向自动滚动的数据卡片
- **AND** 包含最新价格、异常、交易等信息
- **AND** 悬停时暂停滚动

### Requirement: Bento Grid 布局
The system SHALL use Bento Grid layout for key metrics display.

#### Scenario: 用户查看核心指标
- **WHEN** 用户查看指标区域
- **THEN** 看到不规则网格布局
- **AND** 大小卡片错落有致
- **AND** 视觉层次清晰

### Requirement: 微交互动画
The system SHALL provide subtle micro-interactions and animations.

#### Scenario: 用户与页面交互
- **WHEN** 用户悬停在卡片上
- **THEN** 看到平滑的放大/阴影效果
- **AND** 数字有滚动动画
- **AND** 图表有过渡动画

## MODIFIED Requirements

### Requirement: 首页主题
**Current**: 简单的浅色主题
**Modified**:
- 保持与现有页面一致的浅色主题
- 使用蓝白配色方案
- 添加精致的阴影和渐变效果

## REMOVED Requirements
- 移除现有的简单卡片堆叠布局
- 移除基础的动画效果
