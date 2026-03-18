# 国际化优化与重复键清理 Spec

## Why
当前国际化方案存在以下问题：
1. **重复键问题**：i18n 文件中存在大量重复或相似的翻译键（如 `crossOracle.consistency.*` 和 `crossChain.consistency.*`），导致维护困难
2. **预言机页面硬编码**：`cross-oracle` 页面及其组件存在大量硬编码中文文本，未使用国际化
3. **语言切换逻辑**：当前实现是中文用户显示中文，其他语言用户显示英文，但部分页面未正确支持

## What Changes
- 提取并统一重复的翻译键到共享命名空间
- 将 `cross-oracle` 页面及组件中的硬编码文本国际化
- 优化 i18n 文件结构，建立清晰的命名规范
- **BREAKING**: 部分翻译键路径将变更，需要更新引用

## Impact
- Affected specs: i18n 系统、cross-oracle 页面、预言机组件
- Affected code:
  - `src/i18n/en.json` - 国际化资源文件
  - `src/i18n/zh-CN.json` - 国际化资源文件
  - `src/app/[locale]/cross-oracle/**/*` - 跨预言机页面
  - `src/components/oracle/**/*` - 预言机组件

## ADDED Requirements

### Requirement: 重复键合并与共享命名空间
The system SHALL 将重复的翻译键合并到共享命名空间

#### Scenario: 一致性评级
- **GIVEN** 存在 `crossOracle.consistency.*` 和 `crossChain.consistency.*` 相同的翻译
- **WHEN** 需要显示一致性评级
- **THEN** 应使用共享的 `common.consistency.*` 键

#### Scenario: 通用操作文本
- **GIVEN** 存在多个页面重复的"刷新"、"加载中"等文本
- **WHEN** 显示这些通用文本
- **THEN** 应使用共享的 `common.*` 键

### Requirement: cross-oracle 页面硬编码国际化
The system SHALL 将 cross-oracle 页面的硬编码文本国际化

#### Scenario: 页面主内容
- **GIVEN** `cross-oracle/page.tsx` 中存在硬编码中文（如"平均价格"、"标准差"）
- **WHEN** 渲染页面
- **THEN** 文本应根据当前语言显示对应翻译

#### Scenario: 筛选面板
- **GIVEN** `FilterPanel.tsx` 中存在硬编码中文（如"当前筛选"、"清除全部"）
- **WHEN** 显示筛选面板
- **THEN** 文本应根据当前语言显示对应翻译

#### Scenario: 常量文件
- **GIVEN** `constants.tsx` 中存在硬编码的相对时间文本（如"刚刚"、"秒前"）
- **WHEN** 显示相对时间
- **THEN** 文本应根据当前语言显示对应翻译

### Requirement: PairSelector 组件国际化
The system SHALL 将 PairSelector 组件的硬编码文本国际化

#### Scenario: 分类标签
- **GIVEN** 存在硬编码的分类标签（如"全部"、"主流币"、"稳定币"）
- **WHEN** 显示分类选项
- **THEN** 文本应根据当前语言显示对应翻译

### Requirement: i18n 文件结构优化
The system SHALL 优化 i18n 文件结构

#### Scenario: 命名规范
- **GIVEN** 需要添加新的翻译键
- **WHEN** 定义键名
- **THEN** 应遵循以下结构：
  - `common.*` - 通用文本（按钮、状态、时间等）
  - `errors.*` - 错误消息
  - `validation.*` - 验证消息
  - `[page].*` - 页面特定文本
  - `[oracle].*` - 预言机特定文本

#### Scenario: 共享键引用
- **GIVEN** 多个页面使用相同文本
- **WHEN** 引用翻译
- **THEN** 应使用共享键而非重复定义

## MODIFIED Requirements

### Requirement: 翻译键路径更新
The system SHALL 更新受影响组件的翻译键引用

#### Scenario: 组件更新
- **GIVEN** 组件使用旧的翻译键路径
- **WHEN** 加载组件
- **THEN** 应使用新的共享键路径

## REMOVED Requirements

### Requirement: 重复翻译键
**Reason**: 合并到共享命名空间
**Migration**: 更新引用到新的共享键路径
