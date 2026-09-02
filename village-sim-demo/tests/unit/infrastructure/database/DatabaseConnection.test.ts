/**
 * DatabaseConnection Tests
 * Phase 1 (v0.2) - Unit tests for database connection module
 */

import { DatabaseConnection, getDefaultDatabaseConfig } from '@infrastructure/database/connection';
import fs from 'fs';
import path from 'path';

describe('DatabaseConnection', () => {
  // Clean up after each test
  afterEach(() => {
    DatabaseConnection.resetInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple getInstance calls', () => {
      const config = { path: ':memory:' };
      const instance1 = DatabaseConnection.getInstance(config);
      const instance2 = DatabaseConnection.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should throw error if getInstance called without config when not initialized', () => {
      expect(() => {
        DatabaseConnection.getInstance();
      }).toThrow('DatabaseConnection: config required for first initialization');
    });

    it('should reset instance and allow re-initialization', () => {
      const config1 = { path: ':memory:' };
      const instance1 = DatabaseConnection.getInstance(config1);
      instance1.connect();

      DatabaseConnection.resetInstance();

      const config2 = { path: ':memory:' };
      const instance2 = DatabaseConnection.getInstance(config2);

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Connection Management', () => {
    it('should connect to in-memory database', () => {
      const config = { path: ':memory:' };
      const connection = DatabaseConnection.getInstance(config);
      const db = connection.connect();

      expect(db).toBeDefined();
      expect(connection.isConnected()).toBe(true);
    });

    it('should return existing connection on multiple connect calls', () => {
      const config = { path: ':memory:' };
      const connection = DatabaseConnection.getInstance(config);
      const db1 = connection.connect();
      const db2 = connection.connect();

      expect(db1).toBe(db2);
    });

    it('should throw error when getting connection before connecting', () => {
      const config = { path: ':memory:' };
      const connection = DatabaseConnection.getInstance(config);

      expect(() => {
        connection.getConnection();
      }).toThrow('Database not connected. Call connect() first.');
    });

    it('should close connection successfully', () => {
      const config = { path: ':memory:' };
      const connection = DatabaseConnection.getInstance(config);
      connection.connect();

      expect(connection.isConnected()).toBe(true);

      connection.close();

      expect(connection.isConnected()).toBe(false);
    });

    it('should enable foreign keys on connection', () => {
      const config = { path: ':memory:' };
      const connection = DatabaseConnection.getInstance(config);
      connection.connect();

      const db = connection.getConnection();
      const result = db.pragma('foreign_keys', { simple: true });

      expect(result).toBe(1); // 1 = enabled
    });
  });

  describe('File-based Database', () => {
    const testDbPath = './data/test-db.db';

    afterEach(() => {
      // Clean up test database
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    });

    it('should create database file if it does not exist', () => {
      const config = { path: testDbPath };
      const connection = DatabaseConnection.getInstance(config);
      connection.connect();

      expect(fs.existsSync(testDbPath)).toBe(true);
    });

    it('should create parent directory if it does not exist', () => {
      const nestedPath = './data/nested/test-db.db';
      const config = { path: nestedPath };
      const connection = DatabaseConnection.getInstance(config);
      connection.connect();

      expect(fs.existsSync(nestedPath)).toBe(true);

      // Cleanup
      fs.unlinkSync(nestedPath);
      fs.rmdirSync(path.dirname(nestedPath));
    });
  });

  describe('Transaction Support', () => {
    it('should execute transaction successfully', () => {
      const config = { path: ':memory:' };
      const connection = DatabaseConnection.getInstance(config);
      connection.connect();

      // Create a test table
      connection.exec(`
        CREATE TABLE test_table (id INTEGER PRIMARY KEY, value TEXT);
      `);

      // Execute transaction
      const result = connection.transaction(db => {
        db.prepare('INSERT INTO test_table (value) VALUES (?)').run('test1');
        db.prepare('INSERT INTO test_table (value) VALUES (?)').run('test2');
        return db.prepare('SELECT COUNT(*) as count FROM test_table').get() as {
          count: number;
        };
      });

      expect(result.count).toBe(2);
    });

    it('should rollback transaction on error', () => {
      const config = { path: ':memory:' };
      const connection = DatabaseConnection.getInstance(config);
      connection.connect();

      connection.exec(`
        CREATE TABLE test_table (id INTEGER PRIMARY KEY, value TEXT NOT NULL);
      `);

      // This should fail and rollback
      expect(() => {
        connection.transaction(db => {
          db.prepare('INSERT INTO test_table (value) VALUES (?)').run('test1');
          db.prepare('INSERT INTO test_table (value) VALUES (?)').run(null); // This will fail
        });
      }).toThrow();

      // Verify rollback - no rows should exist
      const db = connection.getConnection();
      const result = db.prepare('SELECT COUNT(*) as count FROM test_table').get() as {
        count: number;
      };
      expect(result.count).toBe(0);
    });
  });

  describe('Health Check', () => {
    it('should return healthy when connected', () => {
      const config = { path: ':memory:' };
      const connection = DatabaseConnection.getInstance(config);
      connection.connect();

      const health = connection.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.message).toBe('Database is healthy');
    });

    it('should return unhealthy when not connected', () => {
      const config = { path: ':memory:' };
      const connection = DatabaseConnection.getInstance(config);

      const health = connection.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.message).toBe('Database not connected');
    });
  });

  describe('Statistics', () => {
    it('should return connection stats for in-memory database', () => {
      const config = { path: ':memory:' };
      const connection = DatabaseConnection.getInstance(config);
      connection.connect();

      const stats = connection.getStats();

      expect(stats.path).toBe(':memory:');
      expect(stats.isConnected).toBe(true);
      expect(stats.size).toBeUndefined(); // No size for in-memory
    });

    it('should return file size for file-based database', () => {
      const testDbPath = './data/test-stats.db';
      const config = { path: testDbPath };
      const connection = DatabaseConnection.getInstance(config);
      connection.connect();

      // Create a table to ensure file has content
      connection.exec('CREATE TABLE test (id INTEGER)');

      const stats = connection.getStats();

      expect(stats.path).toBe(testDbPath);
      expect(stats.isConnected).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.tables).toBeGreaterThanOrEqual(1);

      // Cleanup
      connection.close();
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    });
  });

  describe('getDefaultDatabaseConfig', () => {
    it('should use :memory: for test environment', () => {
      // NODE_ENV is set to 'test' by tests/setup.ts
      const config = getDefaultDatabaseConfig();

      expect(config.path).toBe(':memory:');
    });

    it('should use custom DB_PATH when provided in non-test environment', () => {
      // In test env, it always uses :memory: regardless of DB_PATH
      // This is correct behavior defined in tests/setup.ts
      const originalNodeEnv = process.env.NODE_ENV;
      const originalDbPath = process.env.DB_PATH;

      // Temporarily change to non-test environment
      process.env.NODE_ENV = 'development';
      process.env.DB_PATH = '/custom/path/db.db';

      const config = getDefaultDatabaseConfig();

      expect(config.path).toBe('/custom/path/db.db');

      // Restore
      process.env.NODE_ENV = originalNodeEnv;
      if (originalDbPath) {
        process.env.DB_PATH = originalDbPath;
      } else {
        delete process.env.DB_PATH;
      }
    });

    it('should have reasonable default config', () => {
      const config = getDefaultDatabaseConfig();

      expect(config.readonly).toBe(false);
      expect(config.fileMustExist).toBe(false);
      expect(config.timeout).toBe(5000);
    });
  });
});
