/**
 * Jest Test Setup
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:'; // Use in-memory database for tests

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce test noise (optional)
// Uncomment if you want cleaner test output
/*
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};
*/
