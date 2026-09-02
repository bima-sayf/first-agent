"use strict";
/**
 * Database Connection Module
 * Implements Singleton pattern for database connection management
 * Phase 1 (v0.2)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseConnection = void 0;
exports.getDefaultDatabaseConfig = getDefaultDatabaseConfig;
exports.initDatabase = initDatabase;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Singleton Database Connection Manager
 * Ensures only one database connection exists throughout the application
 */
class DatabaseConnection {
    /**
     * Private constructor (Singleton pattern)
     */
    constructor(config) {
        this.db = null;
        this.config = config;
    }
    /**
     * Get or create the singleton instance
     */
    static getInstance(config) {
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
    static resetInstance() {
        if (DatabaseConnection.instance) {
            DatabaseConnection.instance.close();
            DatabaseConnection.instance = null;
        }
    }
    /**
     * Connect to the database
     */
    connect() {
        if (this.db) {
            return this.db; // Already connected
        }
        try {
            // Ensure directory exists (unless using :memory:)
            if (this.config.path !== ':memory:') {
                const dir = path_1.default.dirname(this.config.path);
                if (!fs_1.default.existsSync(dir)) {
                    fs_1.default.mkdirSync(dir, { recursive: true });
                }
            }
            // Create database connection
            this.db = new better_sqlite3_1.default(this.config.path, {
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
        }
        catch (error) {
            console.error('❌ Failed to connect to database:', error);
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }
    /**
     * Get the active database connection
     * Throws error if not connected
     */
    getConnection() {
        if (!this.db) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.db;
    }
    /**
     * Check if database is connected
     */
    isConnected() {
        return this.db !== null && this.db.open;
    }
    /**
     * Close the database connection
     */
    close() {
        if (this.db) {
            try {
                this.db.close();
                console.log('🔒 Database connection closed');
            }
            catch (error) {
                console.error('⚠️  Error closing database:', error);
            }
            finally {
                this.db = null;
            }
        }
    }
    /**
     * Execute a transaction
     * Automatically rolls back on error
     */
    transaction(fn) {
        const db = this.getConnection();
        const transaction = db.transaction(fn);
        return transaction(db);
    }
    /**
     * Execute a raw SQL query (use with caution)
     */
    exec(sql) {
        const db = this.getConnection();
        db.exec(sql);
    }
    /**
     * Get database statistics
     */
    getStats() {
        const stats = {
            path: this.config.path,
            isConnected: this.isConnected(),
        };
        if (this.isConnected() && this.config.path !== ':memory:') {
            try {
                const stat = fs_1.default.statSync(this.config.path);
                stats.size = stat.size;
                // Count tables
                const db = this.getConnection();
                const result = db
                    .prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
                    .get();
                stats.tables = result.count;
            }
            catch (error) {
                // Ignore errors
            }
        }
        return stats;
    }
    /**
     * Health check
     */
    healthCheck() {
        try {
            if (!this.isConnected()) {
                return { healthy: false, message: 'Database not connected' };
            }
            // Try a simple query
            const db = this.getConnection();
            db.prepare('SELECT 1').get();
            return { healthy: true, message: 'Database is healthy' };
        }
        catch (error) {
            return {
                healthy: false,
                message: `Database health check failed: ${error.message}`,
            };
        }
    }
}
exports.DatabaseConnection = DatabaseConnection;
DatabaseConnection.instance = null;
/**
 * Helper function to get default database configuration
 */
function getDefaultDatabaseConfig() {
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
function initDatabase(config) {
    const dbConfig = config || getDefaultDatabaseConfig();
    const connection = DatabaseConnection.getInstance(dbConfig);
    connection.connect();
    return connection;
}
//# sourceMappingURL=DatabaseConnection.js.map