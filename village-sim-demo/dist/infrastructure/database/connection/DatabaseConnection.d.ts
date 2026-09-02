/**
 * Database Connection Module
 * Implements Singleton pattern for database connection management
 * Phase 1 (v0.2)
 */
import Database from 'better-sqlite3';
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
export declare class DatabaseConnection {
    private static instance;
    private db;
    private config;
    /**
     * Private constructor (Singleton pattern)
     */
    private constructor();
    /**
     * Get or create the singleton instance
     */
    static getInstance(config?: DatabaseConfig): DatabaseConnection;
    /**
     * Reset the singleton instance (useful for testing)
     */
    static resetInstance(): void;
    /**
     * Connect to the database
     */
    connect(): Database.Database;
    /**
     * Get the active database connection
     * Throws error if not connected
     */
    getConnection(): Database.Database;
    /**
     * Check if database is connected
     */
    isConnected(): boolean;
    /**
     * Close the database connection
     */
    close(): void;
    /**
     * Execute a transaction
     * Automatically rolls back on error
     */
    transaction<T>(fn: (db: Database.Database) => T): T;
    /**
     * Execute a raw SQL query (use with caution)
     */
    exec(sql: string): void;
    /**
     * Get database statistics
     */
    getStats(): {
        path: string;
        isConnected: boolean;
        size?: number;
        tables?: number;
    };
    /**
     * Health check
     */
    healthCheck(): {
        healthy: boolean;
        message: string;
    };
}
/**
 * Helper function to get default database configuration
 */
export declare function getDefaultDatabaseConfig(): DatabaseConfig;
/**
 * Initialize database connection with default config
 */
export declare function initDatabase(config?: DatabaseConfig): DatabaseConnection;
//# sourceMappingURL=DatabaseConnection.d.ts.map