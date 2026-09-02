"use strict";
/**
 * Agent Repository (Infrastructure Layer)
 * Phase 1 (v0.2): Implements Repository pattern for Agent entities
 * Handles all database operations for agents
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRepository = void 0;
const entities_1 = require("@domain/entities");
const crypto_1 = require("crypto");
/**
 * Agent Repository
 * Provides CRUD operations for Agent entities
 */
class AgentRepository {
    constructor(connection) {
        this.connection = connection;
    }
    /**
     * Create a new agent
     */
    create(input) {
        const db = this.connection.getConnection();
        const now = Date.now();
        // Generate unique ID
        const id = (0, crypto_1.randomUUID)();
        // Calculate initial stats from attributes
        const stats = (0, entities_1.createInitialStats)(input.attributes);
        // Default position if not provided
        const position = input.position || { x: 0, y: 0 };
        // Prepare data for database
        const agent = {
            id,
            name: input.name,
            role: input.role,
            level: 1,
            xp: 0,
            attributes: input.attributes,
            stats,
            position,
            createdAt: now,
            updatedAt: now,
        };
        // Insert into database
        const stmt = db.prepare(`
      INSERT INTO agents (
        id, name, role, level, xp, attributes, stats, x, y, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(agent.id, agent.name, agent.role, agent.level, agent.xp, JSON.stringify(agent.attributes), JSON.stringify(agent.stats), agent.position.x, agent.position.y, agent.createdAt, agent.updatedAt);
        return agent;
    }
    /**
     * Find agent by ID
     */
    findById(id) {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      SELECT * FROM agents WHERE id = ?
    `);
        const row = stmt.get(id);
        return row ? this.mapRowToAgent(row) : null;
    }
    /**
     * Find all agents
     */
    findAll() {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      SELECT * FROM agents ORDER BY created_at ASC
    `);
        const rows = stmt.all();
        return rows.map(row => this.mapRowToAgent(row));
    }
    /**
     * Find agents by role
     */
    findByRole(role) {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      SELECT * FROM agents WHERE role = ? ORDER BY created_at ASC
    `);
        const rows = stmt.all(role);
        return rows.map(row => this.mapRowToAgent(row));
    }
    /**
     * Find agents at specific position
     */
    findByPosition(x, y) {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      SELECT * FROM agents WHERE x = ? AND y = ? ORDER BY created_at ASC
    `);
        const rows = stmt.all(x, y);
        return rows.map(row => this.mapRowToAgent(row));
    }
    /**
     * Update an agent
     */
    update(id, input) {
        const db = this.connection.getConnection();
        // First, check if agent exists
        const existing = this.findById(id);
        if (!existing) {
            return null;
        }
        // Merge updates with existing data
        const updated = {
            ...existing,
            ...input,
            id, // Ensure ID doesn't change
            updatedAt: Date.now(),
        };
        // Handle position update (separate x, y fields)
        const x = input.position?.x ?? existing.position.x;
        const y = input.position?.y ?? existing.position.y;
        updated.position = { x, y };
        // Update in database
        const stmt = db.prepare(`
      UPDATE agents
      SET name = ?, role = ?, level = ?, xp = ?, attributes = ?, stats = ?, x = ?, y = ?, updated_at = ?
      WHERE id = ?
    `);
        stmt.run(updated.name, updated.role, updated.level, updated.xp, JSON.stringify(updated.attributes), JSON.stringify(updated.stats), updated.position.x, updated.position.y, updated.updatedAt, id);
        return updated;
    }
    /**
     * Delete an agent
     */
    delete(id) {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      DELETE FROM agents WHERE id = ?
    `);
        const result = stmt.run(id);
        return result.changes > 0;
    }
    /**
     * Count total agents
     */
    count() {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM agents
    `);
        const result = stmt.get();
        return result.count;
    }
    /**
     * Map database row to Agent entity
     */
    mapRowToAgent(row) {
        return {
            id: row.id,
            name: row.name,
            role: row.role,
            level: row.level,
            xp: row.xp,
            attributes: JSON.parse(row.attributes),
            stats: JSON.parse(row.stats),
            position: {
                x: row.x,
                y: row.y,
            },
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
exports.AgentRepository = AgentRepository;
//# sourceMappingURL=AgentRepository.js.map