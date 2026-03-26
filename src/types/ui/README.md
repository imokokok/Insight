# UI 类型定义

本目录包含 Insight 项目的所有 UI 相关类型定义，按照功能模块进行组织。

## 目录结构

```
src/types/ui/
├── index.ts       # 统一导出所有 UI 类型
├── components.ts  # 通用组件 Props 类型
├── layout.ts      # 布局相关类型
├── theme.ts       # 主题/设计系统类型
└── charts.ts      # 图表组件类型
```

## 使用示例

### 导入组件类型

```typescript
import type {
  CardProps,
  ButtonProps,
  StatCardProps,
  DashboardCardProps,
} from '@/types/ui';

// 使用示例
interface MyCardProps extends CardProps {
  customField: string;
}
```

### 导入布局类型

```typescript
import type {
  PageHeaderProps,
  HeroProps,
  TabNavigationProps,
  UITimeRange,
} from '@/types/ui';

// 使用示例
const timeRange: UITimeRange = '24H';
```

### 导入主题类型

```typescript
import type {
  ThemeColor,
  CardVariant,
  ChangeType,
  RadiusSize,
} from '@/types/ui';

// 使用示例
const variant: CardVariant = 'elevated';
const changeType: ChangeType = 'positive';
```

### 导入图表类型

```typescript
import type {
  ChartDataPoint,
  PriceChartProps,
  LineChartProps,
  TooltipPayload,
} from '@/types/ui';

// 使用示例
const data: ChartDataPoint[] = [
  { x: '2024-01-01', y: 100, label: 'Jan 1' },
  { x: '2024-01-02', y: 120, label: 'Jan 2' },
];
```

## 类型命名规范

- **组件 Props**: `ComponentNameProps` (e.g., `CardProps`, `ButtonProps`)
- **组件变体**: `ComponentNameVariant` (e.g., `CardVariant`, `ButtonVariant`)
- **组件尺寸**: `ComponentNameSize` (e.g., `CardSize`, `ButtonSize`)
- **事件类型**: `EventNameEvent` (e.g., `ChartClickEvent`, `TabChangeEvent`)
- **状态类型**: `FeatureState` (e.g., `UIAsyncState`, `LoadingState`)

## 注意事项

1. **避免循环依赖**: 类型定义之间应避免循环引用
2. **向后兼容**: 修改现有类型时应保持向后兼容
3. **文档注释**: 所有类型定义都应包含 JSDoc 注释
4. **统一导出**: 所有类型都通过 `index.ts` 统一导出

## 与现有类型的关系

- `src/types/oracle/`: 预言机领域类型
- `src/types/api/`: API 相关类型
- `src/types/common/`: 通用工具类型
- `src/types/ui/`: UI 组件类型（本目录）

## 更新记录

- 2024-03-26: 创建 UI 类型目录，整合分散的组件类型定义
