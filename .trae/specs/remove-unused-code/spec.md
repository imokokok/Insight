# 删除未使用代码规范

## Why
项目中可能存在未使用的代码，包括未使用的组件、函数、类型、变量等。这些代码会增加代码库的维护成本、混淆开发者，并可能影响构建性能。定期清理未使用代码是保持代码库健康的重要实践。

## What Changes
- 识别并删除未使用的导出函数、组件和类型
- 识别并删除未使用的变量和常量
- 识别并删除未使用的导入语句
- 识别并删除未使用的文件
- 更新相关的索引文件（index.ts）

## Impact
- Affected specs: 无直接影响其他规范
- Affected code: 整个 `src/` 目录下的 TypeScript/TSX 文件

## ADDED Requirements

### Requirement: 未使用代码检测
系统 SHALL 使用 TypeScript 编译器和 ESLint 规则来检测未使用的代码。

#### Scenario: 检测未使用的变量
- **WHEN** TypeScript 编译器扫描代码
- **THEN** 应标记所有已声明但未使用的变量、函数、类型和导入

#### Scenario: 检测未使用的导出
- **WHEN** 使用 `ts-unused-exports` 或类似工具分析
- **THEN** 应识别所有未被其他文件引用的导出

### Requirement: 安全删除流程
系统 SHALL 遵循安全删除流程，确保不破坏现有功能。

#### Scenario: 删除前验证
- **WHEN** 准备删除某个导出
- **THEN** 必须确认该导出确实没有被任何地方使用（包括动态导入、反射等）

#### Scenario: 保留必要代码
- **WHEN** 代码被标记为未使用
- **BUT** 该代码是公共 API 的一部分或将被外部使用
- **THEN** 应保留该代码并添加注释说明

### Requirement: 代码清理范围
系统 SHALL 按以下优先级清理未使用代码：

1. **高优先级**：
   - 未使用的导入语句
   - 未使用的局部变量
   - 未使用的函数参数（以下划线开头的除外）

2. **中优先级**：
   - 未使用的导出函数
   - 未使用的导出组件
   - 未使用的类型定义

3. **低优先级**：
   - 未使用的文件
   - 未使用的常量文件

### Requirement: 测试文件处理
系统 SHALL 正确处理测试文件中的未使用代码检测。

#### Scenario: 测试工具函数
- **WHEN** 测试文件中导入的函数仅用于测试
- **THEN** 不应将其标记为未使用

### Requirement: 索引文件更新
系统 SHALL 在删除导出后更新相应的索引文件。

#### Scenario: 更新 index.ts
- **WHEN** 从模块中删除导出
- **THEN** 必须同时更新该模块的 index.ts 文件

## MODIFIED Requirements
无

## REMOVED Requirements
无
