# 硬编码文本国际化 Spec

## Why
项目中存在大量硬编码的中文和英文文本，这些文本分散在各个组件中，无法通过语言切换功能进行多语言展示。为了提升用户体验并支持国际化，需要将所有硬编码的文本提取到 i18n 翻译文件中。

## What Changes
- 扫描并识别所有包含硬编码文本的组件文件
- 将硬编码的中文和英文文本提取到 i18n 翻译文件 (en.json, zh-CN.json)
- 使用 `useI18n` hook 替换组件中的硬编码文本
- 确保所有新增翻译键值对在中英文翻译文件中保持一致

## Impact
- 受影响文件: 约 100+ 个组件文件包含硬编码文本
- 主要涉及: UI 标签、按钮文本、提示信息、图表标题、表格列名等
- i18n 翻译文件: en.json, zh-CN.json 将大幅扩展

## ADDED Requirements

### Requirement: 硬编码文本识别与提取
系统 SHALL 识别并提取所有组件中的硬编码文本到 i18n 翻译文件。

#### Scenario: 组件包含硬编码中文
- **GIVEN** 组件中存在硬编码中文字符串
- **WHEN** 执行国际化提取
- **THEN** 将中文文本添加到 zh-CN.json 和 en.json
- **AND** 使用 `t('key')` 替换组件中的硬编码文本

#### Scenario: 组件包含硬编码英文
- **GIVEN** 组件中存在硬编码英文字符串
- **WHEN** 执行国际化提取
- **THEN** 将英文文本添加到 en.json 和 zh-CN.json
- **AND** 使用 `t('key')` 替换组件中的硬编码文本

#### Scenario: 时间格式化函数
- **GIVEN** PageHeader 等组件包含时间格式化函数 (formatLastUpdate)
- **WHEN** 执行国际化提取
- **THEN** 将时间单位文本（秒、分钟、小时等）提取到翻译文件
- **AND** 保持格式化逻辑不变

#### Scenario: 图表和表格标签
- **GIVEN** 图表和表格组件包含硬编码标签
- **WHEN** 执行国际化提取
- **THEN** 将所有标签文本提取到翻译文件
- **AND** 确保图表和表格正确显示翻译后的文本

## MODIFIED Requirements
无

## REMOVED Requirements
无
