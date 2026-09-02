module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server/src', '<rootDir>/tests'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'server/src/**/*.ts',
    '!server/src/**/*.d.ts',
    '!server/src/main.ts',
    '!server/src/**/*.interface.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/server/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/server/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/server/src/infrastructure/$1',
    '^@api/(.*)$': '<rootDir>/server/src/api/$1',
    '^@shared/(.*)$': '<rootDir>/server/src/shared/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
  verbose: true
};
