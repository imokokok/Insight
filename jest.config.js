const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  maxWorkers: '50%',
  workerIdleMemoryLimit: '4GB',
  testTimeout: 15000,
  slowTestThreshold: 10000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock next-intl modules
    '^next-intl$': '<rootDir>/src/__mocks__/next-intl.ts',
    '^next-intl/server$': '<rootDir>/src/__mocks__/next-intl-server.ts',
    '^next-intl/routing$': '<rootDir>/src/__mocks__/next-intl-routing.ts',
    '^use-intl$': '<rootDir>/src/__mocks__/use-intl.ts',
  },
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}', '<rootDir>/src/**/*.spec.{ts,tsx}'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
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
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@vercel/analytics|@vercel/speed-insights|next-intl|use-intl|@pythnetwork|@tanstack/react-query|viem|@wagmi))',
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx|mjs)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
        useESM: true,
      },
    ],
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
      useESM: true,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
