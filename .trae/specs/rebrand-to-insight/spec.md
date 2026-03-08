# Insight 品牌重命名规范

## Why
将项目从"Oracle Analytics Platform"重命名为"Insight"，以建立更简洁、更易识别的品牌形象。

## What Changes
- 将 package.json 中的项目名称从"oracle-analytics-platform"改为"insight"
- 将页面标题和元数据从"Oracle Analytics Platform"改为"Insight"
- 更新国际化文件中的品牌名称引用
- 更新 README.md 中的项目描述

## Impact
- 受影响的功能：品牌展示、页面标题、元数据
- 受影响的代码：package.json, layout.tsx, 国际化文件，README.md

## ADDED Requirements
### Requirement: 品牌名称更新
系统 SHALL 在所有用户可见的位置使用"Insight"作为项目名称

#### Scenario: 成功情况
- **WHEN** 用户访问网站
- **THEN** 在浏览器标签页、页面标题、导航栏等位置看到"Insight"品牌

## MODIFIED Requirements
### Requirement: 项目名称
package.json 中的 name 字段应从"oracle-analytics-platform"修改为"insight"

### Requirement: 页面元数据
layout.tsx 中的 metadata 字段应更新为使用"Insight"品牌

## REMOVED Requirements
### Requirement: 旧品牌名称
**Reason**: 品牌升级，需要统一使用新名称"Insight"
**Migration**: 无需迁移，直接替换为新名称
