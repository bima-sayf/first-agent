"use strict";
/**
 * Item Repository (Infrastructure Layer)
 * Phase 1 (v0.2): Implements Repository pattern for Item entities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemRepository = void 0;
const crypto_1 = require("crypto");
/**
 * Item Repository
 * Provides CRUD operations for Item entities
 */
class ItemRepository {
    constructor(connection) {
        this.connection = connection;
    }
    /**
     * Create a new item
     */
    create(input) {
        const db = this.connection.getConnection();
        const now = Date.now();
        // Generate unique ID
        const id = (0, crypto_1.randomUUID)();
        // Apply defaults
        const stackable = input.stackable ?? true;
        const maxStack = input.maxStack ?? 99;
        const weight = input.weight ?? 1;
        const properties = input.properties ?? {};
        const item = {
            id,
            name: input.name,
            type: input.type,
            stackable,
            maxStack,
            weight,
            properties,
            createdAt: now,
            updatedAt: now,
        };
        // Insert into database
        const stmt = db.prepare(`
      INSERT INTO items (
        id, name, type, stackable, max_stack, weight, properties, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(item.id, item.name, item.type, item.stackable ? 1 : 0, item.maxStack, item.weight, JSON.stringify(item.properties), item.createdAt, item.updatedAt);
        return item;
    }
    /**
     * Find item by ID
     */
    findById(id) {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      SELECT * FROM items WHERE id = ?
    `);
        const row = stmt.get(id);
        return row ? this.mapRowToItem(row) : null;
    }
    /**
     * Find item by name (unique constraint)
     */
    findByName(name) {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      SELECT * FROM items WHERE name = ?
    `);
        const row = stmt.get(name);
        return row ? this.mapRowToItem(row) : null;
    }
    /**
     * Find all items
     */
    findAll() {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      SELECT * FROM items ORDER BY name ASC
    `);
        const rows = stmt.all();
        return rows.map(row => this.mapRowToItem(row));
    }
    /**
     * Find items by type
     */
    findByType(type) {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      SELECT * FROM items WHERE type = ? ORDER BY name ASC
    `);
        const rows = stmt.all(type);
        return rows.map(row => this.mapRowToItem(row));
    }
    /**
     * Update an item
     */
    update(id, input) {
        const db = this.connection.getConnection();
        // First, check if item exists
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
        // Update in database
        const stmt = db.prepare(`
      UPDATE items
      SET name = ?, type = ?, stackable = ?, max_stack = ?, weight = ?, properties = ?, updated_at = ?
      WHERE id = ?
    `);
        stmt.run(updated.name, updated.type, updated.stackable ? 1 : 0, updated.maxStack, updated.weight, JSON.stringify(updated.properties), updated.updatedAt, id);
        return updated;
    }
    /**
     * Delete an item
     */
    delete(id) {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      DELETE FROM items WHERE id = ?
    `);
        const result = stmt.run(id);
        return result.changes > 0;
    }
    /**
     * Count total items
     */
    count() {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM items
    `);
        const result = stmt.get();
        return result.count;
    }
    /**
     * Map database row to Item entity
     */
    mapRowToItem(row) {
        return {
            id: row.id,
            name: row.name,
            type: row.type,
            stackable: row.stackable === 1,
            maxStack: row.max_stack,
            weight: row.weight,
            properties: JSON.parse(row.properties),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
exports.ItemRepository = ItemRepository;
//# sourceMappingURL=ItemRepository.js.map