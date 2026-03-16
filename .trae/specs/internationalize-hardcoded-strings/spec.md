# 硬编码国际化 Spec

## Why
代码库中存在大量硬编码的中文文本字符串，这些字符串分散在各个组件、hooks 和工具函数中。为了实现完整的多语言支持（英文和简体中文），需要将这些硬编码字符串提取到国际化资源文件中，使用 `t()` 函数进行引用。

## What Changes
- 提取所有硬编码中文文本到 `src/i18n/en.json` 和 `src/i18n/zh-CN.json`
- 在组件中使用 `useI18n()` hook 替换硬编码字符串
- 更新相关类型定义以支持新的国际化键
- **BREAKING**: 部分组件的 props 可能需要调整以支持动态语言切换

## Impact
- Affected specs: i18n 系统、UI 组件、图表组件、Hooks
- Affected code: 
  - `src/components/oracle/**/*` - 大量图表和面板组件
  - `src/components/settings/**/*` - 设置面板
  - `src/hooks/**/*` - 多个自定义 hooks
  - `src/i18n/*.json` - 国际化资源文件

## ADDED Requirements

### Requirement: 中文硬编码提取
The system SHALL 将所有硬编码中文文本提取到国际化资源文件中

#### Scenario: 组件中的中文文本
- **GIVEN** 组件中存在硬编码中文（如 `'价格偏高'`、`'导出数据'`）
- **WHEN** 用户切换语言
- **THEN** 文本应根据当前语言显示对应翻译

#### Scenario: Hooks 中的中文文本
- **GIVEN** hooks 中存在硬编码中文（如 `'刷新数据'`、`'用户未登录'`）
- **WHEN** 调用相关函数
- **THEN** 返回的文本应根据当前语言显示对应翻译

#### Scenario: 图表标签和提示
- **GIVEN** 图表组件中存在硬编码中文标签（如 `'准确性'`、`'可用性'`）
- **WHEN** 渲染图表
- **THEN** 图表标签应根据当前语言显示对应翻译

### Requirement: 时间格式化国际化
The system SHALL 将时间相关的中文文本国际化

#### Scenario: 相对时间显示
- **GIVEN** 存在 `'秒前'`、`'分钟前'`、`'小时前'` 等相对时间文本
- **WHEN** 显示相对时间
- **THEN** 应根据当前语言显示对应翻译

#### Scenario: 时间范围选择
- **GIVEN** 存在 `'1 小时'`、`'6 小时'`、`'24 小时'` 等时间范围文本
- **WHEN** 显示时间范围选项
- **THEN** 应根据当前语言显示对应翻译

### Requirement: 状态和等级文本国际化
The system SHALL 将状态和等级相关的中文文本国际化

#### Scenario: 异常等级
- **GIVEN** 存在 `'低'`、`'中'`、`'高'`、`'严重'` 等等级文本
- **WHEN** 显示异常等级
- **THEN** 应根据当前语言显示对应翻译

#### Scenario: 状态标签
- **GIVEN** 存在 `'正常'`、`'警告'`、`'异常'` 等状态文本
- **WHEN** 显示状态标签
- **THEN** 应根据当前语言显示对应翻译

### Requirement: 操作和反馈文本国际化
The system SHALL 将操作按钮和反馈消息国际化

#### Scenario: 操作按钮
- **GIVEN** 存在 `'支持'`、`'反对'`、`'弃权'` 等操作文本
- **WHEN** 显示操作按钮
- **THEN** 应根据当前语言显示对应翻译

#### Scenario: 反馈消息
- **GIVEN** 存在 `'删除账户失败，请重试'`、`'导出失败，请重试'` 等反馈文本
- **WHEN** 显示反馈消息
- **THEN** 应根据当前语言显示对应翻译

## MODIFIED Requirements

### Requirement: i18n 资源文件结构
The system SHALL 扩展现有的 i18n 资源文件结构以支持新键

#### Scenario: 键命名规范
- **GIVEN** 需要添加新的国际化键
- **WHEN** 定义键名
- **THEN** 应遵循 `category.subCategory.key` 的命名规范

### Requirement: useI18n Hook 使用
The system SHALL 在所有需要国际化的组件中使用 `useI18n` hook

#### Scenario: 函数组件
- **GIVEN** 函数组件需要国际化
- **WHEN** 使用 `const { t } = useI18n()`
- **THEN** 可以通过 `t('key')` 获取翻译文本

## REMOVED Requirements
无移除的需求
