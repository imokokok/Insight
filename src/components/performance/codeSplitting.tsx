'use client';

import { ComponentType, lazy, Suspense, ReactNode } from 'react';
import dynamic from 'next/dynamic';

// ============================================================================
// Types
// ============================================================================

export interface CodeSplittingOptions {
  /** Whether to enable SSR for this component */
  ssr?: boolean;
  /** Loading component to show while loading */
  loading?: ReactNode;
  /** Delay before showing loading state (ms) */
  loadingDelay?: number;
  /** Retry count for failed loads */
  retryCount?: number;
  /** Retry delay in ms */
  retryDelay?: number;
}

export interface DynamicComponentOptions extends CodeSplittingOptions {
  /** Component name for debugging */
  name?: string;
  /** Preload priority */
  priority?: 'high' | 'low' | 'auto';
}

// ============================================================================
// Loading Placeholder Component
// ============================================================================

interface LoadingPlaceholderProps {
  delay?: number;
  fallback?: ReactNode;
}

function LoadingPlaceholder({ delay = 200, fallback }: LoadingPlaceholderProps) {
  // Simple loading placeholder that respects delay
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="animate-pulse bg-gray-200 rounded-md h-32 w-full">
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    </div>
  );
}

// ============================================================================
// Error Boundary for Dynamic Components
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

class DynamicComponentErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">Failed to load component</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 text-sm text-red-700 underline"
            >
              Retry
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Need to import React for class component
import React from 'react';

// ============================================================================
// withCodeSplitting HOC
// ============================================================================

/**
 * Higher-order component that wraps a component with code splitting
 * @param importFn - Dynamic import function
 * @param options - Code splitting options
 */
export function withCodeSplitting<T extends Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: CodeSplittingOptions = {}
): ComponentType<T> {
  const { ssr = false, loading, loadingDelay = 200 } = options;

  const LazyComponent = lazy(importFn);

  return function CodeSplitComponent(props: T) {
    return (
      <DynamicComponentErrorBoundary>
        <Suspense fallback={<LoadingPlaceholder delay={loadingDelay} fallback={loading} />}>
          <LazyComponent {...props} />
        </Suspense>
      </DynamicComponentErrorBoundary>
    );
  };
}

// ============================================================================
// withPreload HOC
// ============================================================================

/**
 * Creates a component with preload capability
 * @param importFn - Dynamic import function
 * @param options - Dynamic component options
 */
export function withPreload<T extends Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: DynamicComponentOptions = {}
): ComponentType<T> & { preload: () => Promise<void> } {
  const { ssr = false, loading, name = 'Component' } = options;

  let preloadPromise: Promise<void> | null = null;

  const Component = dynamic(importFn, {
    ssr,
    loading: () => <LoadingPlaceholder fallback={loading} />,
  }) as ComponentType<T> & { preload: () => Promise<void> };

  Component.preload = async () => {
    if (!preloadPromise) {
      preloadPromise = importFn().then(() => undefined);
    }
    await preloadPromise;
  };

  return Component;
}

// ============================================================================
// createDynamicComponent
// ============================================================================

/**
 * Creates a dynamic component with advanced options
 * @param importFn - Dynamic import function
 * @param options - Dynamic component options
 */
export function createDynamicComponent<T extends Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: DynamicComponentOptions = {}
): ComponentType<T> & { preload: () => Promise<void> } {
  const {
    ssr = false,
    loading,
    name = 'DynamicComponent',
    priority = 'auto',
    retryCount = 3,
    retryDelay = 1000,
  } = options;

  let preloadPromise: Promise<void> | null = null;
  let retryAttempts = 0;

  const loadComponent = async (): Promise<{ default: ComponentType<T> }> => {
    try {
      const module = await importFn();
      retryAttempts = 0;
      return module;
    } catch (error) {
      if (retryAttempts < retryCount) {
        retryAttempts++;
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return loadComponent();
      }
      throw error;
    }
  };

  const Component = dynamic(() => loadComponent(), {
    ssr,
    loading: () => <LoadingPlaceholder fallback={loading} />,
  }) as ComponentType<T> & { preload: () => Promise<void> };

  Component.preload = async () => {
    if (!preloadPromise) {
      preloadPromise = loadComponent().then(() => undefined);
    }
    await preloadPromise;
  };

  // Auto-preload if priority is high
  if (priority === 'high' && typeof window !== 'undefined') {
    // Use requestIdleCallback for non-critical preloading
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => Component.preload(), { timeout: 2000 });
    } else {
      setTimeout(() => Component.preload(), 1000);
    }
  }

  return Component;
}

// ============================================================================
// Preload Utilities
// ============================================================================

/**
 * Preload multiple components in parallel
 * @param components - Array of components with preload method
 */
export function preloadComponents(
  components: Array<{ preload: () => Promise<void> }>
): Promise<void> {
  return Promise.all(components.map((c) => c.preload())).then(() => undefined);
}

/**
 * Preload components on hover
 * @param component - Component with preload method
 * @returns Mouse event handlers
 */
export function preloadOnHover<T extends { preload: () => Promise<void> }>(component: T) {
  return {
    onMouseEnter: () => component.preload(),
    onFocus: () => component.preload(),
    onTouchStart: () => component.preload(),
  };
}

/**
 * Preload components when browser is idle
 * @param components - Array of components to preload
 * @param timeout - Maximum time to wait for idle
 */
export function preloadWhenIdle(
  components: Array<{ preload: () => Promise<void> }>,
  timeout = 2000
): void {
  if (typeof window === 'undefined') return;

  const doPreload = () => {
    preloadComponents(components);
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(doPreload, { timeout });
  } else {
    setTimeout(doPreload, timeout);
  }
}

// ============================================================================
// Route-based Code Splitting
// ============================================================================

interface RouteComponent {
  path: string;
  component: ComponentType<unknown> & { preload: () => Promise<void> };
}

/**
 * Create route-based code splitting configuration
 * @param routes - Route configurations
 */
export function createRouteSplitting(routes: RouteComponent[]) {
  const routeMap = new Map(routes.map((r) => [r.path, r.component]));

  return {
    getComponent: (path: string) => routeMap.get(path),
    preloadRoute: (path: string) => {
      const component = routeMap.get(path);
      if (component) {
        return component.preload();
      }
      return Promise.resolve();
    },
    preloadRoutes: (paths: string[]) => {
      return Promise.all(paths.map((path) => {
        const component = routeMap.get(path);
        return component ? component.preload() : Promise.resolve();
      }));
    },
    preloadAll: () => {
      return preloadComponents(Array.from(routeMap.values()));
    },
  };
}

// ============================================================================
// Component Visibility-based Loading
// ============================================================================

interface VisibilityOptions {
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
}

/**
 * Creates a component that loads when it becomes visible
 * @param importFn - Dynamic import function
 * @param visibilityOptions - Intersection observer options
 */
export function createVisibilityLoadedComponent<T extends Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  visibilityOptions: VisibilityOptions = {}
): ComponentType<T> {
  const { rootMargin = '50px', threshold = 0.1, triggerOnce = true } = visibilityOptions;

  return function VisibilityLoadedComponent(props: T) {
    const [isVisible, setIsVisible] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const element = containerRef.current;
      if (!element) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (triggerOnce) {
              observer.disconnect();
            }
          } else if (!triggerOnce) {
            setIsVisible(false);
          }
        },
        { rootMargin, threshold }
      );

      observer.observe(element);
      return () => observer.disconnect();
    }, []);

    const LazyComponent = React.useMemo(
      () => lazy(importFn),
      []
    );

    return (
      <div ref={containerRef}>
        {isVisible ? (
          <Suspense fallback={<LoadingPlaceholder />}>
            <LazyComponent {...props} />
          </Suspense>
        ) : (
          <LoadingPlaceholder />
        )}
      </div>
    );
  };
}

// ============================================================================
// Priority Loading Queue
// ============================================================================

interface LoadQueueItem {
  id: string;
  load: () => Promise<void>;
  priority: number;
}

class PriorityLoadQueue {
  private queue: LoadQueueItem[] = [];
  private isProcessing = false;
  private concurrency: number;

  constructor(concurrency = 2) {
    this.concurrency = concurrency;
  }

  add(id: string, load: () => Promise<void>, priority = 0): void {
    // Remove existing item with same id
    this.queue = this.queue.filter((item) => item.id !== id);
    
    // Add new item
    this.queue.push({ id, load, priority });
    
    // Sort by priority (higher first)
    this.queue.sort((a, b) => b.priority - a.priority);
    
    // Start processing if not already
    if (!this.isProcessing) {
      this.process();
    }
  }

  private async process(): Promise<void> {
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.concurrency);
      await Promise.all(batch.map((item) => item.load()));
    }

    this.isProcessing = false;
  }

  clear(): void {
    this.queue = [];
  }
}

// Global load queue instance
const globalLoadQueue = new PriorityLoadQueue(2);

/**
 * Add a component to the priority load queue
 * @param id - Unique identifier
 * @param component - Component with preload method
 * @param priority - Priority level (higher = loaded first)
 */
export function queueComponentLoad(
  id: string,
  component: { preload: () => Promise<void> },
  priority = 0
): void {
  globalLoadQueue.add(id, () => component.preload(), priority);
}

/**
 * Clear the load queue
 */
export function clearLoadQueue(): void {
  globalLoadQueue.clear();
}
