# 国际化长期可维护性提升 Spec

## Why

当前国际化架构已完成模块化拆分，但仍存在以下影响长期可维护性的问题：

1. **类型安全不足**: 翻译键没有 TypeScript 类型检查，拼写错误只能在运行时发现
2. **新旧文件并存**: `zh-CN.json` 和 `en.json` 大文件仍然存在，可能造成维护混乱
3. **加载逻辑重复**: `request.ts` 中存在大量重复的 try-catch 块
4. **访问方式不一致**: `t('actions.close')` 和 `t('common.actions.close')` 都能工作，造成混乱
5. **缺少翻译键验证**: 没有工具检测缺失或未使用的翻译键

## What Changes

### 1. 类型安全增强
- 配置 `next-intl` 的类型安全功能
- 生成翻译键的 TypeScript 类型定义
- 提供翻译键的 IDE 自动补全支持

### 2. 清理遗留文件
- 删除旧的 `src/i18n/zh-CN.json` 和 `src/i18n/en.json` 大文件
- 确保所有翻译键引用指向新的模块化文件

### 3. 重构加载逻辑
- 简化 `request.ts` 中的重复代码
- 使用配置驱动的方式加载翻译文件

### 4. 统一访问方式
- 确定统一的翻译键访问规范
- 更新 `common.json` 的加载方式，避免双重合并

### 5. 添加验证工具
- 添加翻译键完整性检查脚本
- 添加未使用翻译键检测

## Impact

- Affected specs: 无
- Affected code:
  - `src/i18n/types.ts` - 类型定义
  - `src/i18n/request.ts` - 加载逻辑
  - `src/i18n/config.ts` - 配置
  - `src/lib/i18n/provider.tsx` - Provider
  - `package.json` - 添加验证脚本

## ADDED Requirements

### Requirement: 类型安全翻译键

系统 SHALL 提供翻译键的 TypeScript 类型检查，确保编译时发现拼写错误。

#### Scenario: 使用正确的翻译键
- **WHEN** 开发者使用 `t('navbar.menu')`
- **THEN** TypeScript 编译通过，IDE 提供自动补全

#### Scenario: 使用错误的翻译键
- **WHEN** 开发者使用 `t('navbar.nonexistent')`
- **THEN** TypeScript 编译报错，提示翻译键不存在

### Requirement: 翻译键访问规范

系统 SHALL 提供统一的翻译键访问方式，避免同一翻译键有多种访问路径。

#### Scenario: 访问 common 模块的翻译键
- **WHEN** 开发者访问 common 模块的翻译
- **THEN** 只能使用 `t('actions.close')` 或 `t('status.loading')` 格式
- **AND** 不能使用 `t('common.actions.close')` 格式

### Requirement: 翻译文件加载配置化

系统 SHALL 使用配置驱动的方式加载翻译文件，避免重复代码。

#### Scenario: 添加新的翻译模块
- **WHEN** 开发者需要添加新的翻译模块
- **THEN** 只需在配置数组中添加模块名称
- **AND** 无需修改加载逻辑代码

### Requirement: 翻译键完整性验证

系统 SHALL 提供脚本验证翻译键的完整性。

#### Scenario: 运行翻译键验证
- **WHEN** 开发者运行 `npm run i18n:check`
- **THEN** 系统检查所有翻译键是否存在
- **AND** 报告缺失的翻译键
- **AND** 报告未使用的翻译键

## MODIFIED Requirements

### Requirement: 翻译文件结构

系统 SHALL 只保留模块化的翻译文件结构，删除旧的大文件。

#### 原状态
```
src/i18n/
├── zh-CN.json          # 旧的大文件 (保留)
├── en.json             # 旧的大文件 (保留)
└── messages/           # 新的模块化结构
```

#### 新状态
```
src/i18n/
└── messages/           # 只保留模块化结构
    ├── en/
    └── zh-CN/
```

## REMOVED Requirements

### Requirement: 翻译键双重访问方式

**Reason**: 造成访问方式混乱，增加维护成本

**Migration**: 统一使用根级别访问方式，如 `t('actions.close')` 而非 `t('common.actions.close')`
