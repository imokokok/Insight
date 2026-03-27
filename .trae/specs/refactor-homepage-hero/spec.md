# 首页 Hero 区域重构规范

## Why
当前首页 Hero 区域作为预言机技术分析平台的核心入口，设计过于简单，缺乏专业数据分析平台的视觉冲击力和信息密度。需要重构以：
- 提升专业感和平台可信度
- 增加信息密度，展示平台核心价值
- 丰富视觉层次，增强用户体验
- 保持现有搜索功能不变

## What Changes

### 视觉重构
- **背景增强**：从简单网格升级为多层次动态渐变 + 粒子效果 + 数据流动画
- **布局优化**：采用左右分栏布局（左侧文案+搜索，右侧实时数据展示）
- **去除卡片堆叠**：用横向数据流和集成式指标展示替代卡片式布局
- **颜色保留**：维持现有蓝紫色调（primary: #3b82f6, accent: #8b5cf6）

### 功能增强
- **实时数据展示**：右侧增加实时价格滚动条和关键指标
- **动态背景**：添加微妙的粒子网络动画，象征区块链连接
- **数据流动效果**：背景添加数据流线条动画
- **搜索框保留**：保持现有搜索功能和交互

### 信息架构
- **主标题区**：平台定位 + 核心价值主张
- **搜索区**：保留现有搜索框，增加热门搜索标签
- **实时指标区**：TVS、活跃预言机数、支持交易对、API调用量
- **信任背书**：底部展示合作链和协议数量

## Impact
- **受影响文件**：
  - `src/app/[locale]/home-components/ProfessionalHero.tsx`
  - `src/app/[locale]/home-components/HeroBackground.tsx`
- **新增组件**：
  - `ParticleNetwork` - 粒子网络背景
  - `DataFlowLines` - 数据流动画
  - `LiveMetricsTicker` - 实时指标滚动
- **保留功能**：搜索框、热门币种标签、CTA按钮

## ADDED Requirements

### Requirement: 动态粒子网络背景
The system SHALL provide an animated particle network background that:
- 在背景层渲染动态粒子
- 粒子之间在一定距离内自动连线
- 连线颜色和透明度随距离变化
- 粒子缓慢随机移动，模拟数据流动
- 性能优化：使用 requestAnimationFrame，限制粒子数量（50-80个）

#### Scenario: 页面加载
- **WHEN** 用户访问首页
- **THEN** 背景显示粒子网络动画
- **AND** 粒子缓慢移动并相互连线

### Requirement: 数据流动画效果
The system SHALL display animated data flow lines that:
- 在背景中添加水平流动的线条
- 线条代表数据传输，颜色使用主题色（蓝紫色）
- 不同线条有不同的流动速度和透明度
- 线条从屏幕一侧流向另一侧，循环播放

#### Scenario: 背景视觉增强
- **WHEN** 页面加载完成
- **THEN** 背景显示多条数据流动线
- **AND** 线条以不同速度流动，营造数据感

### Requirement: 实时指标展示面板
The system SHALL display a live metrics panel on the right side that:
- 展示 4-6 个核心平台指标
- 指标包括：TVS、活跃预言机、支持交易对、API调用量、准确率、响应时间
- 每个指标显示当前值和变化趋势
- 使用迷你走势图展示 24h 趋势
- 数据每 5 秒自动刷新一次

#### Scenario: 指标展示
- **WHEN** 用户查看首页
- **THEN** 右侧显示实时指标面板
- **AND** 指标值动态更新

### Requirement: 增强型搜索体验
The system SHALL maintain and enhance the search functionality:
- 保留现有搜索框位置和交互
- 搜索框增加发光效果（focus 状态）
- 热门搜索标签改为横向滚动展示
- 搜索结果下拉框样式优化

#### Scenario: 搜索交互
- **WHEN** 用户点击搜索框
- **THEN** 搜索框显示发光效果
- **AND** 下拉框显示搜索历史和热门币种

### Requirement: 信任指标横幅
The system SHALL display a trust metrics banner at the bottom that:
- 展示平台核心数据：支持链数、合作伙伴、API调用量、正常运行时间
- 使用横向排列，无卡片背景
- 数字使用大字体，标签使用小字体
- 添加微妙的悬停效果

#### Scenario: 信任展示
- **WHEN** 用户滚动到 Hero 底部
- **THEN** 显示信任指标横幅
- **AND** 指标以简洁方式展示

## MODIFIED Requirements

### Requirement: ProfessionalHero 组件重构
**现有功能**：简单的居中布局，卡片式指标展示
**修改后**：
- 采用左右分栏布局（60% 左侧文案，40% 右侧数据）
- 移除卡片式指标堆叠
- 集成新的背景组件
- 保留搜索功能和 CTA 按钮

#### Scenario: 布局重构
- **WHEN** 页面渲染 Hero 区域
- **THEN** 使用新的左右分栏布局
- **AND** 左侧显示文案和搜索
- **AND** 右侧显示实时数据面板

### Requirement: HeroBackground 组件增强
**现有功能**：静态渐变和网格背景
**修改后**：
- 添加 ParticleNetwork 组件
- 添加 DataFlowLines 组件
- 保留现有渐变效果作为底层
- 增加层次感：渐变 → 粒子 → 数据流

#### Scenario: 背景渲染
- **WHEN** 背景组件渲染
- **THEN** 显示多层背景效果
- **AND** 各层动画独立运行

## REMOVED Requirements

### Requirement: 卡片式指标展示
**Reason**：与专业数据分析平台风格不符，信息密度低
**Migration**：指标数据迁移到右侧实时面板和底部信任横幅

### Requirement: 静态背景
**Reason**：过于简单，缺乏视觉吸引力
**Migration**：替换为动态粒子网络和数据流背景
