import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  {
    plugins: {
      prettier: prettierPlugin,
      import: importPlugin,
    },
    rules: {
      // Prettier 集成
      'prettier/prettier': 'error',

      // TypeScript 规则
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-empty-interface': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],

      // React Hooks 规则
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // React Compiler 规则 - 暂时禁用或降级为警告
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',

      // Import 排序规则
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          pathGroups: [
            {
              pattern: 'react',
              group: 'builtin',
              position: 'before',
            },
            {
              pattern: 'next/**',
              group: 'builtin',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['react', 'next'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-duplicates': 'error',
      'import/first': 'error',
      'import/newline-after-import': 'error',
      // Import-cycle radar is deliberately NOT part of the default lint run.
      // It walks the whole module graph per file: measured at ~507s of a ~530s
      // lint pass (>94% of lint time) while only ever emitting warnings, so it
      // cannot gate a merge and must not sit on the critical path. The installed
      // eslint-plugin-import has no allowTypes option and the remaining cycles
      // are all type-only back-edges (erased at compile time). Run it on demand
      // with `npm run lint:cycles`; fix new runtime cycles on sight.

      // 通用代码质量规则
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-unused-expressions': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      complexity: ['error', 50],
      'max-lines': ['error', { max: 2000, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 500 }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // `preTradeSafetyCheck` is a product use case shared by HTTP, MCP and
      // guards; it is not an API implementation detail. Keep callers on its
      // canonical application boundary so a new adapter cannot reintroduce the
      // old transport-to-domain dependency by accident.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/api/services/preTradeSafetyService',
              message: 'Import from @/lib/safety/preTrade instead.',
            },
            {
              name: '@/lib/api/services/preTradeSafetyContract',
              message: 'Import contract types from @/lib/safety/preTrade instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/lib/safety/**/*Policy.ts'],
    rules: {
      // Policies stay deterministic and reusable: orchestration, transport and
      // persistence belong to the application/infrastructure layers.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/**', '@/mcp/**', '@/lib/api/**', '@/lib/supabase/**', 'next/**'],
              message:
                'Safety policy modules must remain free of transport and persistence imports.',
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Additional ignores:
    'node_modules/**',
    'coverage/**',
    'dist/**',
    '**/dist/**',
    '.worktrees/**',
    '.local/**',
    '.github/cron-dist/**',
    'workers/**/worker-configuration.d.ts',
    'playwright-report/**',
    'test-results/**',
    'ml/.venv/**',
    'integrations/**',
    '*.config.{js,mjs,ts}',
    'scripts/**',
  ]),
]);

export default eslintConfig;
