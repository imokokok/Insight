# Contributing to Insight Oracle Data Analytics Platform

Thank you for your interest in contributing to Insight! This document provides guidelines and instructions for contributing to the Oracle Data Analytics Platform.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Component Guidelines](#component-guidelines)
- [Testing](#testing)
- [Git Workflow](#git-workflow)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Code Review Checklist](#code-review-checklist)
- [Reporting Issues](#reporting-issues)

## Development Setup

### Prerequisites

- **Node.js**: Version 20.x or higher
- **npm**: Version 10.x or higher (comes with Node.js)
- **yarn**: Optional, but supported as an alternative to npm
- **Supabase Account**: Required for database and authentication features
- **Git**: Version control system

### Fork and Clone Repository

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/insight.git
   cd insight
   ```
3. Add the upstream repository as a remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/insight.git
   ```

### Install Dependencies

```bash
npm install
```

### Environment Variables Setup

Create a `.env.local` file in the root directory with the following variables:

| Variable                                    | Description                               | Required |
| ------------------------------------------- | ----------------------------------------- | -------- |
| `NEXT_PUBLIC_SUPABASE_URL`                  | Supabase project URL                      | Yes      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`             | Supabase anonymous key                    | Yes      |
| `NEXT_PUBLIC_APP_URL`                       | Application base URL                      | No       |
| `NEXT_PUBLIC_WS_URL`                        | WebSocket server URL                      | No       |
| `NEXT_PUBLIC_ENABLE_REALTIME`               | Enable real-time features (default: true) | No       |
| `NEXT_PUBLIC_ENABLE_ANALYTICS`              | Enable Vercel Analytics                   | No       |
| `NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING` | Enable performance monitoring             | No       |

Example `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_ENABLE_REALTIME=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
```

### Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Project Structure

```
insight/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── [locale]/           # Internationalized pages (next-intl)
│   │   │   ├── alerts/         # Alerts page
│   │   │   ├── auth/           # Authentication pages
│   │   │   │   ├── forgot-password/
│   │   │   │   ├── reset-password/
│   │   │   │   ├── resend-verification/
│   │   │   │   └── verify-email/
│   │   │   ├── cross-chain/    # Cross-chain analysis page
│   │   │   ├── cross-oracle/   # Cross-oracle comparison page
│   │   │   ├── docs/           # Documentation page
│   │   │   ├── favorites/      # User favorites page
│   │   │   ├── home-components/# Homepage components
│   │   │   ├── login/          # Login page
│   │   │   ├── price-query/    # Price query page
│   │   │   ├── register/       # Registration page
│   │   │   └── settings/       # User settings page
│   │   ├── api/                # API endpoints
│   │   │   ├── alerts/         # Price alerts API
│   │   │   ├── auth/           # Authentication callbacks
│   │   │   ├── favorites/      # User favorites API
│   │   │   ├── health/         # Health check API
│   │   │   ├── oracles/        # Oracle data API
│   │   │   └── prices/         # Prices API
│   │   └── layout.tsx          # Root layout
│   ├── components/             # React components
│   │   ├── accessibility/      # Accessibility components
│   │   ├── alerts/             # Alert components
│   │   ├── charts/             # Chart components
│   │   ├── data-transparency/  # Data transparency components
│   │   ├── error-boundary/     # Error boundary components
│   │   ├── export/             # Export components
│   │   ├── favorites/          # Favorite components
│   │   ├── navigation/         # Navigation components
│   │   ├── realtime/           # Real-time components
│   │   ├── search/             # Search components
│   │   ├── settings/           # Settings components
│   │   ├── shortcuts/          # Keyboard shortcuts
│   │   └── ui/                 # Reusable UI components
│   ├── hooks/                  # Custom React hooks
│   │   ├── data/               # Data fetching hooks
│   │   ├── oracles/            # Oracle-specific hooks
│   │   ├── ui/                 # UI hooks
│   │   └── utils/              # Utility hooks
│   ├── i18n/                   # Internationalization
│   │   ├── messages/           # Translation messages
│   │   │   ├── en/             # English translations
│   │   │   └── zh-CN/          # Chinese translations
│   │   ├── config.ts
│   │   ├── generated-types.ts
│   │   ├── request.ts
│   │   ├── routing.ts
│   │   └── types.ts
│   ├── lib/                    # Core libraries
│   │   ├── analytics/          # Analytics utilities
│   │   ├── api/                # API utilities (client, middleware, versioning, validation, response)
│   │   ├── config/             # Configuration files
│   │   ├── constants/          # Application constants
│   │   ├── di/                 # Dependency injection
│   │   ├── errors/             # Error handling (AppError, BusinessErrors)
│   │   ├── export/             # Data export utilities
│   │   ├── i18n/               # i18n provider
│   │   ├── indicators/         # Technical indicators
│   │   ├── logger/             # Logging utilities
│   │   ├── monitoring/         # Performance monitoring (webVitals)
│   │   ├── oracles/            # Oracle client implementations
│   │   │   ├── api3/           # API3 client and services
│   │   │   ├── base/           # Base oracle client
│   │   │   ├── constants/      # Oracle constants
│   │   │   ├── pyth/           # Pyth client and services
│   │   │   ├── api3.ts         # API3 client
│   │   │   ├── base.ts         # BaseOracleClient abstract class
│   │   │   ├── chainlink.ts    # Chainlink client
│   │   │   ├── dia.ts          # DIA client
│   │   │   ├── factory.ts      # Oracle factory
│   │   │   ├── redstone.ts     # RedStone client
│   │   │   ├── supra.ts         # Supra client
│   │   ├── twap.ts           # TWAP client (Uniswap V3 TWAP)
│   │   └── winklink.ts     # WINkLink client
│   │   ├── queries/            # React Query keys and client
│   │   ├── realtime/           # Real-time communication (WebSocket)
│   │   ├── security/           # Security utilities
│   │   ├── services/           # External services (marketData, oracle)
│   │   ├── snapshots/          # Snapshot management
│   │   ├── supabase/           # Supabase client and utilities
│   │   ├── utils/              # Utility functions
│   │   └── validation/         # Validation utilities
│   ├── stores/                 # Zustand stores
│   │   ├── authStore.ts        # Authentication state
│   │   ├── crossChainConfigStore.ts  # Cross-chain config state
│   │   ├── crossChainDataStore.ts    # Cross-chain data state
│   │   ├── crossChainSelectorStore.ts # Cross-chain selector state
│   │   ├── crossChainUIStore.ts      # Cross-chain UI state
│   │   ├── notificationStore.ts      # Notification state
│   │   ├── realtimeStore.ts    # Real-time state
│   │   ├── timeRangeStore.ts   # Time range state
│   │   └── uiStore.ts          # UI state
│   └── types/                  # TypeScript type definitions
├── e2e/                        # E2E tests
├── public/                     # Static assets
├── scripts/                    # Utility scripts
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── eslint.config.mjs           # ESLint configuration
├── jest.config.js              # Jest configuration
├── playwright.config.ts        # Playwright configuration
└── .prettierrc                 # Prettier configuration
```

## Coding Standards

### TypeScript

- **Strict Mode**: TypeScript strict mode is enabled. All code must pass strict type checking
- **No `any` Types**: Avoid using `any` type. Use `unknown` or proper type definitions
- **Explicit Return Types**: Consider adding explicit return types for complex functions
- **Interface vs Type**: Use `interface` for object shapes, `type` for unions/intersections
- **Import Order**: Follow import order - React/Next.js → Third-party libraries → Internal modules → Type definitions

### Code Quality Check Process

Before submitting code, run the following checks:

```bash
# 1. Run ESLint check
npm run lint

# 2. Run type check
npm run typecheck

# 3. Run all tests
npm run test

# 4. Run full validation (includes all above)
npm run validate
```

### Naming Convention Check

```bash
# Check file and directory naming conventions
npm run naming:check
```

Naming convention requirements:

- **Component files**: PascalCase (e.g., `PriceChart.tsx`)
- **Utility files**: camelCase (e.g., `formatDate.ts`)
- **Type files**: PascalCase (e.g., `OracleTypes.ts`)
- **Constants**: SCREAMING_SNAKE_CASE
- **Test files**: Same name as tested file + `.test.ts`

### Pre-commit Checklist

- [ ] Code passes ESLint check (no errors)
- [ ] Code passes TypeScript type check
- [ ] All tests pass
- [ ] New features include tests
- [ ] Naming conventions follow project requirements
- [ ] No unused imports or variables
- [ ] No `console.log` debug statements

### ESLint Configuration

The project uses ESLint with the following configuration:

- `eslint-config-next` (core-web-vitals and typescript)
- `eslint-config-prettier`
- `eslint-plugin-prettier`

Run linting:

```bash
npm run lint
```

### Prettier Formatting

Configuration (`.prettierrc`):

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

Format your code before committing:

```bash
npx prettier --write .
```

### Component Naming Conventions

- **Components**: PascalCase (e.g., `PriceChart.tsx`, `AlertConfig.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useOracleData.ts`, `usePriceHistory.ts`)
- **Utilities**: camelCase (e.g., `format.ts`, `timestamp.ts`)
- **Types**: PascalCase with descriptive names (e.g., `OracleTypes.ts`, `Snapshot.ts`)
- **Constants**: SCREAMING_SNAKE_CASE for constants, camelCase for config objects

### File Organization

- One component per file
- Group related components in directories with `index.ts` for exports
- Place tests in `__tests__` directories or alongside the tested file with `.test.ts(x)` suffix
- Keep components small and focused on a single responsibility

## Component Guidelines

### Use TypeScript for All Components

All components must be written in TypeScript with proper type definitions:

```tsx
interface PriceChartProps {
  symbol: string;
  data: PriceData[];
  isLoading?: boolean;
}

export function PriceChart({ symbol, data, isLoading = false }: PriceChartProps) {
  // Component implementation
}
```

### Follow Existing Component Patterns

Refer to existing components for patterns:

- [PriceChart.tsx](src/app/[locale]/price-query/components/PriceChart.tsx) for chart components
- [AlertConfig.tsx](src/components/alerts/AlertConfig.tsx) for form components

### Use Tailwind CSS for Styling

- Use Tailwind utility classes for all styling
- Follow the existing color palette defined in the configuration
- Use responsive prefixes for mobile-first design (`sm:`, `md:`, `lg:`)
- Extract common styles into component-level constants when needed

### Implement Proper Error Boundaries

Wrap components that may fail with error boundaries:

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary fallback={<ErrorFallback />}>
  <ChartComponent />
</ErrorBoundary>;
```

### Add Loading States

Always provide loading states for async operations:

```tsx
if (isLoading) {
  return <ChartSkeleton />;
}

if (error) {
  return <ErrorState message={error.message} />;
}

return <Chart data={data} />;
```

## Testing

### Jest Configuration

The project uses Jest with the following setup:

- Test environment: `jsdom`
- Module mapper: `@/*` maps to `src/*`
- Coverage threshold: 70% for all metrics (branches, functions, lines, statements)

### Run Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run e2e tests
npm run test:e2e

# Run e2e tests with UI
npm run test:e2e:ui
```

### Test File Location

Place test files in one of these locations:

1. `__tests__` directories: `src/hooks/__tests__/useOracleData.test.ts`
2. Alongside source files: `src/lib/utils/format.test.ts`

### Writing Unit Tests

Follow the existing test patterns:

```tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePriceData } from '../useOracleData';

describe('usePriceData', () => {
  it('should fetch price data successfully', async () => {
    const { result } = renderHook(() => usePriceData(client, { symbol: 'BTC' }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price).not.toBeNull();
    expect(result.current.error).toBeNull();
  });
});
```

### Test Coverage Requirements

- Minimum coverage threshold: 50% (branches, functions, lines, statements)
- Aim for higher coverage on critical business logic
- Include tests for edge cases and error scenarios

## Git Workflow

### Create Feature Branch from Main

```bash
# Fetch latest changes
git fetch upstream

# Create feature branch
git checkout -b feature/amazing-feature upstream/main
```

Branch naming conventions:

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions or modifications

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:

```
feat(oracles): add support for new price feed
fix(alerts): resolve duplicate alert notification issue
docs(readme): update installation instructions
refactor(hooks): simplify useOracleData implementation
```

### Push Changes

```bash
git push origin feature/amazing-feature
```

### Create Pull Request

1. Go to GitHub and create a Pull Request from your fork
2. Fill out the PR template completely
3. Link any related issues
4. Request review from maintainers

## Pull Request Guidelines

### PR Description Template

```markdown
## Description

[Describe the changes made in this PR]

## Related Issues

Closes #[issue number]

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?

[Describe the tests you ran]

## Screenshots (if applicable)

[Add screenshots for UI changes]

## Checklist

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Link Related Issues

Reference issues in your PR:

- `Closes #123` - Will close the issue when merged
- `Fixes #123` - Will close the issue when merged
- `Related to #123` - Links but doesn't close

### Add Screenshots for UI Changes

Include before/after screenshots for any visual changes:

- Use consistent browser window size
- Capture both desktop and mobile views if responsive
- Highlight the changed areas

### Ensure Tests Pass

Before submitting:

```bash
# Run linting
npm run lint

# Run tests
npm run test

# Build the project
npm run build
```

### Code Review Process

1. At least one approval from a maintainer is required
2. All CI checks must pass
3. Resolve all review comments
4. Squash commits before merging (if requested)

## Code Review Checklist

Before requesting review, ensure:

- [ ] Code follows style guidelines (ESLint passes)
- [ ] TypeScript strict mode checks pass
- [ ] Tests are included for new functionality
- [ ] All existing tests pass
- [ ] Documentation is updated (if applicable)
- [ ] No `console.log` statements in production code
- [ ] No hardcoded secrets or API keys
- [ ] Error handling is implemented properly
- [ ] Loading states are provided for async operations
- [ ] Components are properly typed
- [ ] Accessibility considerations are addressed

## Reporting Issues

### Bug Report Template

```markdown
## Description

[Clear and concise description of the bug]

## Steps to Reproduce

1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior

[What you expected to happen]

## Actual Behavior

[What actually happened]

## Screenshots

[If applicable, add screenshots]

## Environment

- OS: [e.g., macOS, Windows, Linux]
- Browser: [e.g., Chrome, Firefox, Safari]
- Node.js version: [e.g., 18.17.0]
- npm version: [e.g., 9.6.7]

## Additional Context

[Any other context about the problem]
```

### Feature Request Template

```markdown
## Problem Statement

[Clear description of the problem or limitation]

## Proposed Solution

[Description of the proposed feature]

## Alternatives Considered

[Description of alternative solutions]

## Additional Context

[Any other context, screenshots, or examples]

## Would you be willing to submit a PR?

[Yes/No]
```

### Use GitHub Issues

1. Check existing issues before creating a new one
2. Use the appropriate template
3. Add relevant labels
4. Provide as much detail as possible

---

Thank you for contributing to Insight! Your efforts help make oracle data analytics more accessible and reliable for everyone.
