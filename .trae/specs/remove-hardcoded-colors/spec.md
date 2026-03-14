# 移除颜色硬编码 Spec

## Why
项目中存在大量硬编码的颜色值（如 `#3b82f6`, `#10b981` 等），分散在 50+ 个文件中。虽然已有统一的颜色配置文件 `src/lib/config/colors.ts`，但许多组件仍在直接使用硬编码颜色值，导致：
- 颜色管理分散，难以统一修改主题
- 不同组件可能使用略有差异的相同语义颜色
- 品牌一致性难以保证
- 未来实现暗色模式或主题切换困难

## What Changes
- 将所有硬编码的颜色值替换为从 `@/lib/config/colors` 导入的常量
- 扩展 `colors.ts` 配置文件，补充缺失的颜色定义
- 统一所有图表、组件的颜色使用
- 确保所有颜色值都有语义化的命名

## Impact
- Affected specs: UI 组件、图表组件、样式系统
- Affected code:
  - `src/components/oracle/charts/*.tsx` - 多个图表组件
  - `src/components/oracle/panels/*.tsx` - 面板组件
  - `src/components/oracle/common/*.tsx` - 通用组件
  - `src/components/oracle/indicators/*.tsx` - 指标组件
  - `src/components/oracle/forms/*.tsx` - 表单组件
  - `src/lib/oracles/uma/types.ts` - UMA 类型定义
  - `src/lib/services/marketData/*.ts` - 市场数据服务
  - `src/lib/config/colors.ts` - 需要扩展

---

## ADDED Requirements

### Requirement: 统一颜色配置使用

系统 SHALL 所有颜色值都从 `@/lib/config/colors` 导入，禁止在组件中直接使用硬编码颜色值。

#### Scenario: 图表组件使用统一颜色
- **WHEN** 图表组件需要设置颜色
- **THEN** 从 `chartColors` 对象获取颜色
- **AND** 不使用任何硬编码的 hex 或 rgb 值

#### Scenario: 状态颜色使用语义化定义
- **WHEN** 组件需要显示成功、警告、错误等状态
- **THEN** 使用 `semanticColors` 对象的颜色
- **AND** 不直接使用 `#10b981`、`#ef4444` 等硬编码值

#### Scenario: 预言机品牌色统一管理
- **WHEN** 显示不同预言机的数据
- **THEN** 使用 `chartColors.oracle` 或 `getOracleColor()` 函数
- **AND** 所有预言机颜色定义保持一致

---

### Requirement: 扩展颜色配置文件

系统 SHALL 在 `colors.ts` 中补充所有缺失的颜色定义，确保覆盖所有使用场景。

#### Scenario: 补充图表网格和轴线颜色
- **WHEN** 图表需要网格线和轴线颜色
- **THEN** 使用 `chartColors.grid` 或 `chartColors.lineChart` 定义
- **AND** 不再使用 `#e5e7eb`、`#9ca3af` 等硬编码值

#### Scenario: 补充 Recharts 专用颜色
- **WHEN** Recharts 组件需要颜色配置
- **THEN** 使用 `chartColors.recharts` 对象
- **AND** 所有 Recharts 相关颜色集中管理

#### Scenario: 补充跨链面板颜色
- **WHEN** 跨链面板需要不同链的颜色
- **THEN** 在 `colors.ts` 中定义 `chainColors` 对象
- **AND** 移除组件内的硬编码链颜色映射

---

### Requirement: 验证者类型和地区颜色统一

系统 SHALL 统一管理验证者类型和地区的颜色定义。

#### Scenario: 验证者类型颜色
- **WHEN** 显示验证者类型（机构、独立、社区）
- **THEN** 使用 `chartColors.validator` 定义
- **AND** 不在组件内定义局部颜色映射

#### Scenario: 地区颜色
- **WHEN** 显示地区数据
- **THEN** 使用 `chartColors.region` 定义
- **AND** 颜色与配置文件保持一致

---

### Requirement: Canvas 绑定颜色统一

系统 SHALL 将 Canvas 绑定操作（如 `ctx.fillStyle`）中的硬编码颜色替换为配置常量。

#### Scenario: 导出功能颜色统一
- **WHEN** 使用 Canvas API 绑定颜色
- **THEN** 使用 `exportColors` 或其他配置对象
- **AND** 不直接使用字符串形式的颜色值

---

### Requirement: 渐变色统一管理

系统 SHALL 所有渐变色定义都使用 `gradients` 对象或通过配置生成。

#### Scenario: 使用预定义渐变
- **WHEN** 组件需要渐变背景
- **THEN** 使用 `gradients` 对象中的定义
- **AND** 不在样式或组件中硬编码渐变字符串

---

## MODIFIED Requirements

### Requirement: 颜色配置文件完整性

系统 SHALL 确保 `colors.ts` 包含所有项目需要的颜色定义。

原有配置已包含基础颜色、语义颜色、图表颜色等，现需补充：
- 跨链颜色配置
- 更多 Recharts 专用颜色
- Canvas 导出专用颜色
- 确保所有颜色都有语义化命名

---

## REMOVED Requirements

### Requirement: 组件内局部颜色定义

**Reason**: 导致颜色管理分散，难以维护一致性

**Migration**: 所有局部颜色定义迁移到 `colors.ts`，组件从配置导入
