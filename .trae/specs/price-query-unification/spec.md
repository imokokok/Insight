# 喂价查询功能统一整合 - Product Requirement Document

## Overview
- **Summary**: 创建一个统一的喂价查询入口页面，整合现有的喂价查询功能，提供灵活的多维度查询能力，并保留所有现有页面功能不变。
- **Purpose**: 解决现有喂价查询功能分散、用户体验不连贯的问题，提供一站式查询入口，让用户可以灵活选择任意预言机、任意链、任意交易对进行查询。
- **Target Users**: 区块链开发者、DeFi分析师、预言机研究者、数据分析师等需要查询预言机喂价数据的用户。

## Goals
- 创建统一的喂价查询入口页面（/price-query）
- 支持灵活的多维度查询：任意预言机组合、任意链组合、任意交易对选择
- 提供快速跳转到现有专用页面的入口
- 保留所有现有页面（/chainlink、/cross-chain、/cross-oracle等）功能完全不变
- 提供实时价格展示、历史价格图表、数据导出等核心功能

## Non-Goals (Out of Scope)
- 不删除或修改现有任何页面
- 不改变现有的数据获取逻辑
- 不修改预言机客户端的实现
- 不添加新的数据源或预言机提供商
- 不改变现有的国际化文件结构

## Background & Context
- 当前项目在多个页面中分散提供了喂价查询功能：
  - 单个预言机页面（/chainlink、/api3等）：展示单个预言机的基本信息和价格
  - 跨链比较页面（/cross-chain）：单个预言机在不同链上的价格比较
  - 跨预言机比较页面（/cross-oracle）：多个预言机在同一条链上的价格比较
- 用户需要根据查询目的切换不同页面，体验不连贯
- 缺少一个可以灵活组合查询条件的统一入口
- 项目使用Next.js 16 + Tailwind CSS 4 + Recharts 3.8.0技术栈

## Functional Requirements
- **FR-1**: 创建新的统一喂价查询页面（/price-query）
- **FR-2**: 支持多选预言机提供商（Chainlink、Band Protocol、UMA、Pyth Network、API3）
- **FR-3**: 支持多选区块链（Ethereum、Arbitrum、Optimism、Polygon、Solana）
- **FR-4**: 支持选择交易对（BTC、ETH、SOL、USDC等）
- **FR-5**: 展示查询结果的实时价格表格
- **FR-6**: 展示历史价格趋势图表
- **FR-7**: 提供数据导出功能（CSV和JSON格式）
- **FR-8**: 提供快速跳转按钮到现有专用页面
- **FR-9**: 在导航栏中添加新页面的入口

## Non-Functional Requirements
- **NFR-1**: 页面加载性能不低于现有页面
- **NFR-2**: 响应式设计，适配移动端和桌面端
- **NFR-3**: 保持无障碍访问性
- **NFR-4**: 代码结构清晰，复用现有组件
- **NFR-5**: 动画过渡自然流畅

## Constraints
- **Technical**: 继续使用Next.js 16、Tailwind CSS 4、Recharts 3.8.0
- **Business**: 必须保留所有现有页面功能完全不变
- **Dependencies**: 复用现有的预言机客户端和组件库

## Assumptions
- 现有数据获取逻辑稳定可靠
- 用户已熟悉现有功能布局
- 浏览器支持现代CSS特性
- 现有组件库可以满足新页面的需求

## Acceptance Criteria

### AC-1: 新页面创建
- **Given**: 项目代码库
- **When**: 完成新页面开发
- **Then**: /price-query 页面可以正常访问
- **Verification**: `programmatic`

### AC-2: 多维度选择器
- **Given**: 用户访问 /price-query 页面
- **When**: 页面加载完成
- **Then**: 用户可以多选预言机、多选链、选择交易对
- **Verification**: `human-judgment`

### AC-3: 实时价格展示
- **Given**: 用户选择了查询条件
- **When**: 点击查询按钮
- **Then**: 显示所有匹配条件的实时价格数据表格
- **Verification**: `human-judgment`

### AC-4: 历史价格图表
- **Given**: 用户选择了查询条件且有历史数据
- **When**: 查看图表区域
- **Then**: 显示所有选中预言机和链的历史价格趋势图表
- **Verification**: `human-judgment`

### AC-5: 数据导出
- **Given**: 查询结果已加载
- **When**: 用户点击导出按钮
- **Then**: 可以成功导出CSV和JSON格式的数据
- **Verification**: `programmatic`

### AC-6: 快速跳转
- **Given**: 用户在 /price-query 页面
- **When**: 查看页面顶部
- **Then**: 有清晰的按钮可以跳转到现有专用页面
- **Verification**: `human-judgment`

### AC-7: 导航栏更新
- **Given**: 用户访问任何页面
- **When**: 查看导航栏
- **Then**: 导航栏中包含 /price-query 页面的入口
- **Verification**: `human-judgment`

### AC-8: 现有页面保持不变
- **Given**: 完成新功能开发
- **When**: 用户访问现有任何页面
- **Then**: 所有现有页面功能和外观完全保持不变
- **Verification**: `human-judgment`

### AC-9: 响应式设计
- **Given**: 用户在不同设备上访问新页面
- **When**: 调整窗口大小或使用不同设备
- **Then**: 页面在移动端、平板和桌面端都有良好的显示效果
- **Verification**: `human-judgment`

## Open Questions
- 无
