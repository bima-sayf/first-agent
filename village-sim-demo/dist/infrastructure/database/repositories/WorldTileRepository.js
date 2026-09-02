"use strict";
/**
 * WorldTile Repository (Infrastructure Layer)
 * Phase 1 (v0.2): Implements Repository pattern for WorldTile entities
 * Manages the 5×5 game world grid
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldTileRepository = void 0;
const crypto_1 = require("crypto");
/**
 * WorldTile Repository
 * Manages world map tiles
 */
class WorldTileRepository {
    constructor(connection) {
        this.connection = connection;
    }
    /**
     * Create a new world tile
     */
    create(input) {
        const db = this.connection.getConnection();
        const now = Date.now();
        // Generate unique ID
        const id = (0, crypto_1.randomUUID)();
        // Apply defaults
        const terrainType = input.terrainType ?? 'grass';
        const resources = input.resources ?? {};
        const structures = input.structures ?? [];
        const explored = input.explored ?? false;
        const tile = {
            id,
            x: input.x,
            y: input.y,
            terrainType,
            resources,
            structures,
            explored,
            createdAt: now,
            updatedAt: now,
        };
        // Insert into database
        const stmt = db.prepare(`
      INSERT INTO world_tiles (
        id, x, y, terrain_type, resources, structures, explored, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(tile.id, tile.x, tile.y, tile.terrainType, JSON.stringify(tile.resources), JSON.stringify(tile.structures), tile.explored ? 1 : 0, tile.createdAt, tile.updatedAt);
        return tile;
    }
    /**
     * Find tile by coordinates
     */
    findByCoordinates(x, y) {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      SELECT * FROM world_tiles WHERE x = ? AND y = ?
    `);
        const row = stmt.get(x, y);
        return row ? this.mapRowToTile(row) : null;
    }
    /**
     * Find tile by ID
     */
    findById(id) {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      SELECT * FROM world_tiles WHERE id = ?
    `);
        const row = stmt.get(id);
        return row ? this.mapRowToTile(row) : null;
    }
    /**
     * Find all tiles
     */
    findAll() {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      SELECT * FROM world_tiles ORDER BY y ASC, x ASC
    `);
        const rows = stmt.all();
        return rows.map(row => this.mapRowToTile(row));
    }
    /**
     * Find tiles by terrain type
     */
    findByTerrainType(terrainType) {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      SELECT * FROM world_tiles WHERE terrain_type = ? ORDER BY y ASC, x ASC
    `);
        const rows = stmt.all(terrainType);
        return rows.map(row => this.mapRowToTile(row));
    }
    /**
     * Find tiles in a rectangular area
     */
    findInArea(minX, maxX, minY, maxY) {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      SELECT * FROM world_tiles 
      WHERE x >= ? AND x <= ? AND y >= ? AND y <= ?
      ORDER BY y ASC, x ASC
    `);
        const rows = stmt.all(minX, maxX, minY, maxY);
        return rows.map(row => this.mapRowToTile(row));
    }
    /**
     * Find all explored tiles
     */
    findExplored() {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      SELECT * FROM world_tiles WHERE explored = 1 ORDER BY y ASC, x ASC
    `);
        const rows = stmt.all();
        return rows.map(row => this.mapRowToTile(row));
    }
    /**
     * Update a tile
     */
    update(id, input) {
        const db = this.connection.getConnection();
        // First, check if tile exists
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
      UPDATE world_tiles
      SET terrain_type = ?, resources = ?, structures = ?, explored = ?, updated_at = ?
      WHERE id = ?
    `);
        stmt.run(updated.terrainType, JSON.stringify(updated.resources), JSON.stringify(updated.structures), updated.explored ? 1 : 0, updated.updatedAt, id);
        return updated;
    }
    /**
     * Delete a tile
     */
    delete(id) {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      DELETE FROM world_tiles WHERE id = ?
    `);
        const result = stmt.run(id);
        return result.changes > 0;
    }
    /**
     * Count total tiles
     */
    count() {
        const db = this.connection.getConnection();
        const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM world_tiles
    `);
        const result = stmt.get();
        return result.count;
    }
    /**
     * Map database row to WorldTile entity
     */
    mapRowToTile(row) {
        return {
            id: row.id,
            x: row.x,
            y: row.y,
            terrainType: row.terrain_type,
            resources: JSON.parse(row.resources),
            structures: JSON.parse(row.structures),
            explored: row.explored === 1,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
exports.WorldTileRepository = WorldTileRepository;
//# sourceMappingURL=WorldTileRepository.js.map