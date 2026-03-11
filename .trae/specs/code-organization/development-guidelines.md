# Oracle 预言机数据可视化平台开发规范

## 1. 组件开发规范

### 1.1 组件命名规范

| 类型 | 命名规则 | 示例 |
|------|----------|------|
| 页面组件 | PascalCase，以Page结尾 | `ChainlinkPage`, `BandProtocolPage` |
| 布局组件 | PascalCase | `OraclePageTemplate`, `DashboardCard` |
| 功能组件 | PascalCase | `PriceChart`, `TabNavigation` |
| UI基础组件 | PascalCase | `Button`, `Input`, `Modal` |
| 图表组件 | PascalCase，以Chart/Graph结尾 | `PriceChart`, `CorrelationMatrix` |

### 1.2 组件结构规范

```tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/context';

interface ComponentNameProps {
  className?: string;
  onAction?: () => void;
}

export function ComponentName({ className = '', onAction }: ComponentNameProps) {
  const { t } = useI18n();
  const [state, setState] = useState<Type>(initialValue);

  const computedValue = useMemo(() => {
    return state * 2;
  }, [state]);

  const handleAction = useCallback(() => {
    onAction?.();
  }, [onAction]);

  return (
    <div className={className}>
      {/* component content */}
    </div>
  );
}
```

### 1.3 Props定义规范

```typescript
interface MyComponentProps {
  requiredProp: string;
  optionalProp?: number;
  callbackProp?: (value: string) => void;
  className?: string;
  children?: React.ReactNode;
}
```

### 1.4 样式规范

- 使用Tailwind CSS进行样式管理
- 组件根元素接受 `className` prop
- 响应式设计：移动优先，使用 `sm:` `md:` `lg:` `xl:` 前缀
- 颜色使用语义化命名（text-primary, bg-success, border-danger）
- 使用 `cn()` 或 `clsx` 工具类合并className

### 1.5 组件文件组织

```
src/components/oracle/
├── ComponentName.tsx        # 主组件
├── ComponentName.module.css # 样式文件（如果需要）
└── index.ts                # 导出入口
```

## 2. 类型定义规范

### 2.1 类型命名规范

| 类型 | 命名规则 | 示例 |
|------|----------|------|
| 枚举 | PascalCase | `OracleProvider`, `Blockchain` |
| 接口 | PascalCase | `PriceData`, `ValidatorInfo` |
| 类型别名 | PascalCase | `PublisherStatus`, `TimeRange` |
| 泛型类型 | PascalCase，使用T/U/K等 | `Response<T>`, `Result<K, V>` |

### 2.2 接口 vs 类型别名使用场景

**使用接口的场景：**
- 对象结构定义
- 需要扩展或继承的类型
- 类实现

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

interface Admin extends User {
  role: 'admin';
  permissions: string[];
}
```

**使用类型别名的场景：**
- 联合类型
- 元组类型
- 函数类型
- 基础类型别名

```typescript
type Status = 'active' | 'inactive' | 'pending';
type Coordinates = [number, number];
type Handler = (event: Event) => void;
```

### 2.3 泛型使用规范

```typescript
function fetchData<T>(url: string): Promise<T> {
  return fetch(url).then(res => res.json());
}

interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}
```

### 2.4 统一类型定义位置

所有Oracle相关的类型定义应放在 `src/lib/types/` 目录下：
- `oracleTypes.ts` - 核心Oracle类型
- `snapshot.ts` - 快照相关类型

## 3. Hooks使用规范

### 3.1 Hooks命名规范

- 自定义Hooks以 `use` 开头
- 使用驼峰命名
- 文件名与函数名保持一致

```typescript
// src/hooks/useOracleData.ts
export function useOracleData() { }
```

### 3.2 状态管理规范

```typescript
export function useComponentState(initialValue: Type) {
  const [state, setState] = useState<Type>(initialValue);
  
  const reset = useCallback(() => {
    setState(initialValue);
  }, [initialValue]);
  
  return { state, setState, reset };
}
```

### 3.3 副作用处理规范

```typescript
useEffect(() => {
  let mounted = true;
  
  async function fetchData() {
    try {
      const data = await api.getData();
      if (mounted) {
        setData(data);
      }
    } catch (error) {
      if (mounted) {
        setError(error);
      }
    }
  }
  
  fetchData();
  
  return () => {
    mounted = false;
  };
}, [dependency]);
```

## 4. 图表组件规范

### 4.1 统一颜色配置

使用 `src/lib/utils/chartSharedUtils.ts` 中的颜色配置：

```typescript
import { chartColors, getStatusColor } from '@/lib/utils/chartSharedUtils';

// 价格线颜色
const priceColor = chartColors.price;

// 状态颜色
const statusColor = getStatusColor('warning');
```

### 4.2 响应式图表

```typescript
import { getResponsiveSettings } from '@/lib/utils/chartSharedUtils';

function MyChart() {
  const settings = getResponsiveSettings(window.innerWidth);
  
  return (
    <ResponsiveContainer>
      <LineChart>
        <XAxis tick={{ fontSize: settings.fontSize }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

## 5. 页面结构规范

### 5.1 Oracle页面模板

所有Oracle页面应使用 `OraclePageTemplate`：

```typescript
import { OraclePageTemplate } from '@/components/oracle/OraclePageTemplate';

export default function ProviderPage() {
  return (
    <OraclePageTemplate
      provider={OracleProvider.CHAINLINK}
      tabs={customTabs}
    >
      <Content />
    </OraclePageTemplate>
  );
}
```

### 5.2 Tab导航配置

```typescript
const tabs: TabItem[] = [
  { id: 'market', label: t('menu.marketData'), icon: <MarketIcon /> },
  { id: 'network', label: t('menu.network'), icon: <NetworkIcon /> },
];
```

## 6. 代码质量规范

### 6.1 ESLint规则

- 启用 `react-hooks/exhaustive-deps`
- 启用 `typescript/no-unused-vars`
- 禁用 `no-console`（开发环境除外）

### 6.2 导入顺序

```typescript
// 1. React/Next.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. 第三方库
import { LineChart, Line } from 'recharts';
import { useQuery } from '@tanstack/react-query';

// 3. 内部模块
import { OracleProvider } from '@/lib/types/oracleTypes';
import { PageHeader } from '@/components/oracle/PageHeader';

// 4. 工具函数
import { formatPrice } from '@/lib/utils/format';
```

### 6.3 常量定义

- 页面级常量使用 `const` 在组件外部定义
- 共享常量放在 `src/lib/config/` 目录
- 使用 TypeScript 枚举定义相关常量组
