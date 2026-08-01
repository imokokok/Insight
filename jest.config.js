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
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  coverageReporters: ['text', 'text-summary', 'lcov'],
  // MCP integration tests under src/mcp/__tests__ spawn a real MCP server
  // (stdio + http) and require SUPABASE_SERVICE_ROLE_KEY + live oracle/RPC
  // data. They are not unit tests and must not run as part of the default
  // `npm test` / CI gate. Run them explicitly via `npm run test:mcp:e2e`
  // (which loads .env.local and runs them in band).
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/src/mcp/__tests__/',
  ],
};

module.exports = createJestConfig(customJestConfig);
