/**
 * WorldTile Repository (Infrastructure Layer)
 * Phase 1 (v0.2): Implements Repository pattern for WorldTile entities
 * Manages the 5×5 game world grid
 */

import { DatabaseConnection } from '@infrastructure/database/connection';
import {
  WorldTile,
  CreateWorldTileInput,
  UpdateWorldTileInput,
  TerrainType,
} from '@domain/entities';
import { randomUUID } from 'crypto';

/**
 * WorldTile Repository
 * Manages world map tiles
 */
export class WorldTileRepository {
  private connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  /**
   * Create a new world tile
   */
  create(input: CreateWorldTileInput): WorldTile {
    const db = this.connection.getConnection();
    const now = Date.now();

    // Generate unique ID
    const id = randomUUID();

    // Apply defaults
    const terrainType = input.terrainType ?? 'grass';
    const resources = input.resources ?? {};
    const structures = input.structures ?? [];
    const explored = input.explored ?? false;

    const tile: WorldTile = {
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

    stmt.run(
      tile.id,
      tile.x,
      tile.y,
      tile.terrainType,
      JSON.stringify(tile.resources),
      JSON.stringify(tile.structures),
      tile.explored ? 1 : 0,
      tile.createdAt,
      tile.updatedAt
    );

    return tile;
  }

  /**
   * Find tile by coordinates
   */
  findByCoordinates(x: number, y: number): WorldTile | null {
    const db = this.connection.getConnection();

    const stmt = db.prepare(`
      SELECT * FROM world_tiles WHERE x = ? AND y = ?
    `);

    const row = stmt.get(x, y) as any;

    return row ? this.mapRowToTile(row) : null;
  }

  /**
   * Find tile by ID
   */
  findById(id: string): WorldTile | null {
    const db = this.connection.getConnection();

    const stmt = db.prepare(`
      SELECT * FROM world_tiles WHERE id = ?
    `);

    const row = stmt.get(id) as any;

    return row ? this.mapRowToTile(row) : null;
  }

  /**
   * Find all tiles
   */
  findAll(): WorldTile[] {
    const db = this.connection.getConnection();

    const stmt = db.prepare(`
      SELECT * FROM world_tiles ORDER BY y ASC, x ASC
    `);

    const rows = stmt.all() as any[];

    return rows.map(row => this.mapRowToTile(row));
  }

  /**
   * Find tiles by terrain type
   */
  findByTerrainType(terrainType: TerrainType): WorldTile[] {
    const db = this.connection.getConnection();

    const stmt = db.prepare(`
      SELECT * FROM world_tiles WHERE terrain_type = ? ORDER BY y ASC, x ASC
    `);

    const rows = stmt.all(terrainType) as any[];

    return rows.map(row => this.mapRowToTile(row));
  }

  /**
   * Find tiles in a rectangular area
   */
  findInArea(minX: number, maxX: number, minY: number, maxY: number): WorldTile[] {
    const db = this.connection.getConnection();

    const stmt = db.prepare(`
      SELECT * FROM world_tiles 
      WHERE x >= ? AND x <= ? AND y >= ? AND y <= ?
      ORDER BY y ASC, x ASC
    `);

    const rows = stmt.all(minX, maxX, minY, maxY) as any[];

    return rows.map(row => this.mapRowToTile(row));
  }

  /**
   * Find all explored tiles
   */
  findExplored(): WorldTile[] {
    const db = this.connection.getConnection();

    const stmt = db.prepare(`
      SELECT * FROM world_tiles WHERE explored = 1 ORDER BY y ASC, x ASC
    `);

    const rows = stmt.all() as any[];

    return rows.map(row => this.mapRowToTile(row));
  }

  /**
   * Update a tile
   */
  update(id: string, input: UpdateWorldTileInput): WorldTile | null {
    const db = this.connection.getConnection();

    // First, check if tile exists
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    // Merge updates with existing data
    const updated: WorldTile = {
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

    stmt.run(
      updated.terrainType,
      JSON.stringify(updated.resources),
      JSON.stringify(updated.structures),
      updated.explored ? 1 : 0,
      updated.updatedAt,
      id
    );

    return updated;
  }

  /**
   * Delete a tile
   */
  delete(id: string): boolean {
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
  count(): number {
    const db = this.connection.getConnection();

    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM world_tiles
    `);

    const result = stmt.get() as { count: number };

    return result.count;
  }

  /**
   * Map database row to WorldTile entity
   */
  private mapRowToTile(row: any): WorldTile {
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
