# 首页探索搜索框优化 Spec

## Why
当前首页的搜索框功能过于简单，仅支持输入币种符号后跳转到价格查询页面。参考 Dune Analytics、DeFiLlama、Nansen 等主流数据分析平台的探索框设计，需要增强搜索框的功能，提供更直观的币种选择、热门搜索推荐和快捷跳转，提升用户体验。

## What Changes
- **增强搜索框交互**: 添加搜索建议下拉框，支持币种快捷选择
- **热门币种展示**: 在搜索框下方展示热门/常用币种标签，支持一键选择
- **搜索历史**: 显示用户最近的搜索记录（基于本地存储）
- **快捷跳转优化**: 支持回车搜索、点击建议项跳转等多种交互方式
- **视觉优化**: 搜索框聚焦时展开更多功能，保持界面简洁

## Impact
- Affected specs: 首页 ProfessionalHero 组件
- Affected code: 
  - `/src/app/[locale]/home-components/ProfessionalHero.tsx`
  - 可能需要新增搜索建议相关的 hooks 或工具函数

## ADDED Requirements

### Requirement: 搜索建议下拉框
The system SHALL provide a search suggestion dropdown when user focuses on the search input.

#### Scenario: 用户聚焦搜索框
- **WHEN** 用户点击或聚焦到搜索框
- **THEN** 显示下拉建议框，包含热门币种和最近搜索历史

#### Scenario: 用户输入搜索内容
- **WHEN** 用户在搜索框中输入内容
- **THEN** 实时过滤显示匹配的币种列表
- **AND** 高亮匹配的文字部分

#### Scenario: 用户选择建议项
- **WHEN** 用户点击下拉框中的币种或使用键盘选择
- **THEN** 自动填充搜索框并跳转到价格查询页面

### Requirement: 热门币种快捷标签
The system SHALL display popular token tags below the search box for quick selection.

#### Scenario: 展示热门币种
- **WHEN** 页面加载完成
- **THEN** 在搜索框下方显示 6-8 个热门币种标签（BTC, ETH, SOL, AVAX, LINK, UNI 等）

#### Scenario: 点击热门币种
- **WHEN** 用户点击热门币种标签
- **THEN** 直接跳转到该币种的价格查询页面

### Requirement: 搜索历史功能
The system SHALL display recent search history in the suggestion dropdown.

#### Scenario: 显示搜索历史
- **WHEN** 用户聚焦搜索框且有搜索历史
- **THEN** 在下拉框顶部显示最近 3-5 条搜索记录
- **AND** 提供清除历史按钮

#### Scenario: 保存搜索历史
- **WHEN** 用户成功执行一次搜索
- **THEN** 将搜索的币种保存到本地存储
- **AND** 去重，最多保存 10 条记录

### Requirement: 键盘交互支持
The system SHALL support keyboard navigation in the search suggestion dropdown.

#### Scenario: 键盘上下导航
- **WHEN** 用户按下上下方向键
- **THEN** 在建议项之间移动焦点

#### Scenario: 回车确认
- **WHEN** 用户按下回车键
- **THEN** 选中的建议项或当前输入内容执行搜索

#### Scenario: ESC 关闭
- **WHEN** 用户按下 ESC 键
- **THEN** 关闭下拉建议框

## MODIFIED Requirements
无

## REMOVED Requirements
无
