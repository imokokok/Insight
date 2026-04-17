# UI Type Definitions

This directory contains all UI-related type definitions for the Insight project, organized by functional module.

## Directory Structure

```
src/types/ui/
├── index.ts       # Unified export of all UI types
├── components.ts  # Common component Props types
├── layout.ts      # Layout-related types
├── theme.ts       # Theme/design system types
└── charts.ts      # Chart component types
```

## Usage Examples

### Import Component Types

```typescript
import type { CardProps, ButtonProps, StatCardProps, DashboardCardProps } from '@/types/ui';

interface MyCardProps extends CardProps {
  customField: string;
}
```

### Import Layout Types

```typescript
import type { PageHeaderProps, HeroProps, TabNavigationProps, UITimeRange } from '@/types/ui';

const timeRange: UITimeRange = '24H';
```

### Import Theme Types

```typescript
import type { ThemeColor, CardVariant, ChangeType, RadiusSize } from '@/types/ui';

const variant: CardVariant = 'elevated';
const changeType: ChangeType = 'positive';
```

### Import Chart Types

```typescript
import type { ChartDataPoint, PriceChartProps, LineChartProps, TooltipPayload } from '@/types/ui';

const data: ChartDataPoint[] = [
  { x: '2024-01-01', y: 100, label: 'Jan 1' },
  { x: '2024-01-02', y: 120, label: 'Jan 2' },
];
```

## Type Naming Conventions

- **Component Props**: `ComponentNameProps` (e.g., `CardProps`, `ButtonProps`)
- **Component Variants**: `ComponentNameVariant` (e.g., `CardVariant`, `ButtonVariant`)
- **Component Sizes**: `ComponentNameSize` (e.g., `CardSize`, `ButtonSize`)
- **Event Types**: `EventNameEvent` (e.g., `ChartClickEvent`, `TabChangeEvent`)
- **State Types**: `FeatureState` (e.g., `UIAsyncState`, `LoadingState`)

## Notes

1. **Avoid Circular Dependencies**: Type definitions should not have circular references
2. **Backward Compatibility**: Modifications to existing types should maintain backward compatibility
3. **Documentation Comments**: All type definitions should include JSDoc comments
4. **Unified Export**: All types are exported through `index.ts`

## Relationship with Other Type Directories

- `src/types/oracle/`: Oracle domain types
- `src/types/api/`: API-related types
- `src/types/common/`: Common utility types
- `src/types/ui/`: UI component types (this directory)

## Changelog

- 2024-03-26: Created UI types directory, consolidated scattered component type definitions
