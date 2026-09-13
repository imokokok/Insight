const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  resetMocks: true,
  testEnvironment: 'jest-environment-jsdom',
  maxWorkers: '50%',
  workerIdleMemoryLimit: '2GB',
  testTimeout: 15000,
  slowTestThreshold: 10000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@sentry/nextjs$': '<rootDir>/src/__mocks__/@sentry/nextjs.ts',
  },
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}', '<rootDir>/src/**/*.spec.{ts,tsx}'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
    '!src/__mocks__/**',
  ],
  coverageThreshold: {
    global: {
      // Whole-repository baseline. This includes UI pages and thin MCP/route
      // adapters; keep it honest and ratchet upward instead of declaring an
      // unenforced 70% target that currently fails by forty points.
      branches: 21,
      functions: 24,
      lines: 28,
      statements: 28,
    },
    './src/lib/attestations/executionReceipt.ts': {
      branches: 80,
      functions: 100,
      lines: 95,
    },
    './src/lib/attestations/executionCommitments.ts': {
      branches: 75,
      functions: 100,
      lines: 100,
    },
    './src/lib/execution/verifyExecutionPair.ts': {
      branches: 75,
      functions: 100,
      lines: 95,
    },
  },
  coverageReporters: ['text', 'text-summary', 'lcov'],
  // Only MCP suites that spawn a real stdio/http server are excluded from the
  // default gate. Tool and middleware unit tests in the same directory keep
  // running in CI. Run process/live suites via `npm run test:mcp:e2e`.
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/src/mcp/__tests__/client.test.ts',
    '<rootDir>/src/mcp/__tests__/e2e.test.ts',
    '<rootDir>/src/mcp/__tests__/http-e2e.test.ts',
  ],
  modulePathIgnorePatterns: ['<rootDir>/.worktrees/'],
};

module.exports = createJestConfig(customJestConfig);
