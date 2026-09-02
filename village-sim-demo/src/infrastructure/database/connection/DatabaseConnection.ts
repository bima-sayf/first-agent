/**
 * Database Connection Module
 * Implements Singleton pattern for database connection management
 * Phase 1 (v0.2)
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export interface DatabaseConfig {
  path: string;
  readonly?: boolean;
  fileMustExist?: boolean;
  timeout?: number;
  verbose?: boolean;
}

/**
 * Singleton Database Connection Manager
 * Ensures only one database connection exists throughout the application
 */
export class DatabaseConnection {
  private static instance: DatabaseConnection | null = null;
  private db: Database.Database | null = null;
  private config: DatabaseConfig;

  /**
   * Private constructor (Singleton pattern)
   */
  private constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Get or create the singleton instance
   */
  public static getInstance(config?: DatabaseConfig): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      if (!config) {
        throw new Error('DatabaseConnection: config required for first initialization');
      }
      DatabaseConnection.instance = new DatabaseConnection(config);
    }
    return DatabaseConnection.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    if (DatabaseConnection.instance) {
      DatabaseConnection.instance.close();
      DatabaseConnection.instance = null;
    }
  }

  /**
   * Connect to the database
   */
  public connect(): Database.Database {
    if (this.db) {
      return this.db; // Already connected
    }

    try {
      // Ensure directory exists (unless using :memory:)
      if (this.config.path !== ':memory:') {
        const dir = path.dirname(this.config.path);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      // Create database connection
      this.db = new Database(this.config.path, {
        readonly: this.config.readonly || false,
        fileMustExist: this.config.fileMustExist || false,
        timeout: this.config.timeout || 5000,
        verbose: this.config.verbose ? console.log : undefined,
      });

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');

      // Enable WAL mode for better concurrency (only for file-based databases)
      if (this.config.path !== ':memory:') {
        this.db.pragma('journal_mode = WAL');
      }

      console.log(`✅ Database connected: ${this.config.path}`);
      return this.db;
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      throw new Error(`Database connection failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get the active database connection
   * Throws error if not connected
   */
  public getConnection(): Database.Database {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Check if database is connected
   */
  public isConnected(): boolean {
    return this.db !== null && this.db.open;
  }

  /**
   * Close the database connection
   */
  public close(): void {
    if (this.db) {
      try {
        this.db.close();
        console.log('🔒 Database connection closed');
      } catch (error) {
        console.error('⚠️  Error closing database:', error);
      } finally {
        this.db = null;
      }
    }
  }

  /**
   * Execute a transaction
   * Automatically rolls back on error
   */
  public transaction<T>(fn: (db: Database.Database) => T): T {
    const db = this.getConnection();
    const transaction = db.transaction(fn);
    return transaction(db);
  }

  /**
   * Execute a raw SQL query (use with caution)
   */
  public exec(sql: string): void {
    const db = this.getConnection();
    db.exec(sql);
  }

  /**
   * Get database statistics
   */
  public getStats(): {
    path: string;
    isConnected: boolean;
    size?: number;
    tables?: number;
  } {
    const stats: any = {
      path: this.config.path,
      isConnected: this.isConnected(),
    };

    if (this.isConnected() && this.config.path !== ':memory:') {
      try {
        const stat = fs.statSync(this.config.path);
        stats.size = stat.size;

        // Count tables
        const db = this.getConnection();
        const result = db
          .prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
          .get() as { count: number };
        stats.tables = result.count;
      } catch (error) {
        // Ignore errors
      }
    }

    return stats;
  }

  /**
   * Health check
   */
  public healthCheck(): { healthy: boolean; message: string } {
    try {
      if (!this.isConnected()) {
        return { healthy: false, message: 'Database not connected' };
      }

      // Try a simple query
      const db = this.getConnection();
      db.prepare('SELECT 1').get();

      return { healthy: true, message: 'Database is healthy' };
    } catch (error) {
      return {
        healthy: false,
        message: `Database health check failed: ${(error as Error).message}`,
      };
    }
  }
}

/**
 * Helper function to get default database configuration
 */
export function getDefaultDatabaseConfig(): DatabaseConfig {
  const dbPath = process.env.DB_PATH || './data/village-sim.db';
  const nodeEnv = process.env.NODE_ENV || 'development';

  return {
    path: nodeEnv === 'test' ? ':memory:' : dbPath,
    readonly: false,
    fileMustExist: false,
    timeout: 5000,
    verbose: nodeEnv === 'development' && process.env.DB_VERBOSE === 'true',
  };
}

/**
 * Initialize database connection with default config
 */
export function initDatabase(config?: DatabaseConfig): DatabaseConnection {
  const dbConfig = config || getDefaultDatabaseConfig();
  const connection = DatabaseConnection.getInstance(dbConfig);
  connection.connect();
  return connection;
}
