# 代码风格指南

> Insight 项目代码规范与风格

## 目录

- [TypeScript 规范](#typescript-规范)
- [React 组件规范](#react-组件规范)
- [样式规范](#样式规范)
- [命名约定](#命名约定)

## TypeScript 规范

### 严格模式

项目启用 TypeScript Strict Mode，必须遵守：

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 类型定义

```typescript
// ✅ 使用 interface 定义对象形状
interface PriceData {
  provider: OracleProvider;
  symbol: string;
  price: number;
  timestamp: number;
}

// ✅ 使用 type 定义联合类型
type ExportFormat = 'csv' | 'json' | 'excel';
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// ❌ 避免使用 any
function processData(data: any): any { }

// ✅ 使用 unknown + 类型守卫
function processData(data: unknown): number {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    const value = (data as { value: unknown }).value;
    if (typeof value === 'number') {
      return value;
    }
  }
  throw new Error('Invalid data format');
}
```

## React 组件规范

### 组件文件结构

```typescript
// 1. 导入（按类型分组）
import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { usePriceData } from '@/hooks/usePriceData';
import type { PriceData } from '@/types/oracle';

// 2. Props 接口定义
interface PriceCardProps {
  symbol: string;
  provider: OracleProvider;
  showChange?: boolean;
  onClick?: (data: PriceData) => void;
}

// 3. 组件实现
export function PriceCard({
  symbol,
  provider,
  showChange = true,
  onClick,
}: PriceCardProps) {
  // 4. Hooks
  const { data, isLoading } = usePriceData(provider, symbol);
  const [isExpanded, setIsExpanded] = useState(false);

  // 5. 回调函数
  const handleClick = useCallback(() => {
    if (data && onClick) {
      onClick(data);
    }
  }, [data, onClick]);

  // 6. 渲染
  if (isLoading) {
    return <PriceCardSkeleton />;
  }

  return (
    <Card onClick={handleClick}>
      {/* ... */}
    </Card>
  );
}
```

### Server vs Client Components

```typescript
// ✅ Server Component - 用于静态内容、数据获取
export default async function OraclePage() {
  const price = await fetchPrice();
  return <PriceDisplay data={price} />;
}

// ✅ Client Component - 用于交互式组件
'use client';

export function InteractiveChart({ symbol }: { symbol: string }) {
  const [data, setData] = useState<ChartData[]>([]);
  // ...
}
```

## 样式规范

### Tailwind CSS 类名顺序

```typescript
// ✅ 按以下顺序组织 Tailwind 类名：
// 1. 布局 (display, position, flex, grid)
// 2. 尺寸 (width, height, padding, margin)
// 3. 背景 (background-color, background-image)
// 4. 边框 (border, border-radius)
// 5. 文字 (font-size, font-weight, color)
// 6. 效果 (shadow, opacity, transition)
// 7. 交互 (hover, focus, active)
// 8. 响应式 (sm:, md:, lg:)

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="
      flex flex-col
      w-full p-4
      bg-white
      rounded-lg border border-gray-200
      text-sm text-gray-900
      shadow-sm transition-all duration-200
      hover:border-gray-300 hover:shadow-md
      sm:p-6 md:p-8
    ">
      {children}
    </div>
  );
}
```

### 使用 clsx 和 tailwind-merge

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 使用示例
function Button({
  variant = 'primary',
  size = 'medium',
  className,
  children,
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-md transition-all',
        variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
        variant === 'secondary' && 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        size === 'small' && 'px-3 py-1.5 text-sm',
        size === 'medium' && 'px-4 py-2 text-base',
        size === 'large' && 'px-6 py-3 text-lg',
        className
      )}
    >
      {children}
    </button>
  );
}
```

## 命名约定

### 文件命名

| 类型 | 命名方式 | 示例 |
|------|----------|------|
| 组件 | PascalCase | `PriceCard.tsx` |
| Hooks | camelCase + use | `usePriceData.ts` |
| 工具函数 | camelCase | `formatPrice.ts` |
| 类型定义 | PascalCase | `OracleTypes.ts` |
| 常量 | SCREAMING_SNAKE_CASE | `ORACLE_PROVIDERS.ts` |

### 变量命名

```typescript
// ✅ 布尔值使用 is/has/should 前缀
const isLoading = true;
const hasError = false;
const shouldRefresh = true;

// ✅ 数组使用复数形式
const