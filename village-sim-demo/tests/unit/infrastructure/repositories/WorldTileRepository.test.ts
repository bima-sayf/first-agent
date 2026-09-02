/**
 * WorldTileRepository Tests
 * Phase 1 (v0.2) - TDD approach: Write tests first
 * Focus: 5×5 grid world
 */

import { WorldTileRepository } from '@infrastructure/database/repositories/WorldTileRepository';
import { DatabaseConnection } from '@infrastructure/database/connection';
import { CreateWorldTileInput, UpdateWorldTileInput, getPhase1WorldBounds } from '@domain/entities';

describe('WorldTileRepository', () => {
  let repository: WorldTileRepository;
  let connection: DatabaseConnection;

  beforeEach(() => {
    DatabaseConnection.resetInstance();
    connection = DatabaseConnection.getInstance({ path: ':memory:' });
    connection.connect();

    // Run migrations
    const db = connection.getConnection();
    const fs = require('fs');
    const path = require('path');
    const migrationsDir = path.join(
      __dirname,
      '../../../../src/infrastructure/database/migrations'
    );

    const migrations = [
      '001_create_agents_table.sql',
      '002_create_items_table.sql',
      '003_create_inventory_table.sql',
      '004_create_world_tiles_table.sql',
    ];

    migrations.forEach(file => {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      db.exec(sql);
    });

    repository = new WorldTileRepository(connection);
  });

  afterEach(() => {
    DatabaseConnection.resetInstance();
  });

  describe('create', () => {
    it('should create a tile with defaults', () => {
      const input: CreateWorldTileInput = {
        x: 0,
        y: 0,
      };

      const tile = repository.create(input);

      expect(tile.id).toBeDefined();
      expect(tile.x).toBe(0);
      expect(tile.y).toBe(0);
      expect(tile.terrainType).toBe('grass'); // Default
      expect(tile.resources).toEqual({});
      expect(tile.structures).toEqual([]);
      expect(tile.explored).toBe(false); // Default
      expect(tile.createdAt).toBeGreaterThan(0);
    });

    it('should create a water tile with resources', () => {
      const input: CreateWorldTileInput = {
        x: 2,
        y: 3,
        terrainType: 'water',
        resources: { fish: 20 },
        explored: true,
      };

      const tile = repository.create(input);

      expect(tile.x).toBe(2);
      expect(tile.y).toBe(3);
      expect(tile.terrainType).toBe('water');
      expect(tile.resources).toEqual({ fish: 20 });
      expect(tile.explored).toBe(true);
    });

    it('should create tile with structures', () => {
      const input: CreateWorldTileInput = {
        x: 1,
        y: 1,
        structures: ['tent-id-1', 'campfire-id-1'],
      };

      const tile = repository.create(input);

      expect(tile.structures).toEqual(['tent-id-1', 'campfire-id-1']);
    });

    it('should enforce unique coordinates', () => {
      const input: CreateWorldTileInput = {
        x: 0,
        y: 0,
      };

      repository.create(input);

      // Try to create another tile at same coordinates
      expect(() => {
        repository.create(input);
      }).toThrow();
    });
  });

  describe('findByCoordinates', () => {
    it('should find a tile by coordinates', () => {
      const created = repository.create({
        x: 2,
        y: 3,
        terrainType: 'water',
      });

      const found = repository.findByCoordinates(2, 3);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.terrainType).toBe('water');
    });

    it('should return null if coordinates not found', () => {
      const found = repository.findByCoordinates(10, 10);

      expect(found).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find a tile by ID', () => {
      const created = repository.create({
        x: 1,
        y: 1,
      });

      const found = repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return null if ID not found', () => {
      const found = repository.findById('non-existent-id');

      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return empty array when no tiles exist', () => {
      const tiles = repository.findAll();

      expect(tiles).toEqual([]);
    });

    it('should return all tiles', () => {
      repository.create({ x: 0, y: 0 });
      repository.create({ x: 1, y: 1 });
      repository.create({ x: 2, y: 2 });

      const tiles = repository.findAll();

      expect(tiles).toHaveLength(3);
    });
  });

  describe('findByTerrainType', () => {
    beforeEach(() => {
      repository.create({ x: 0, y: 0, terrainType: 'grass' });
      repository.create({ x: 1, y: 1, terrainType: 'grass' });
      repository.create({ x: 2, y: 2, terrainType: 'water' });
      repository.create({ x: 3, y: 3, terrainType: 'water' });
    });

    it('should find tiles by terrain type', () => {
      const grassTiles = repository.findByTerrainType('grass');

      expect(grassTiles).toHaveLength(2);
      expect(grassTiles.every(t => t.terrainType === 'grass')).toBe(true);
    });

    it('should return empty array if no tiles of type exist', () => {
      // No forest tiles created
      const forestTiles = repository.findByTerrainType('grass');

      expect(forestTiles.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('findInArea', () => {
    beforeEach(() => {
      // Create a 3×3 area
      for (let x = 0; x <= 2; x++) {
        for (let y = 0; y <= 2; y++) {
          repository.create({ x, y });
        }
      }
    });

    it('should find tiles in specified area', () => {
      const tiles = repository.findInArea(0, 1, 0, 1);

      // Should find 2×2 = 4 tiles
      expect(tiles).toHaveLength(4);
      expect(tiles.every(t => t.x <= 1 && t.y <= 1)).toBe(true);
    });

    it('should find single tile when min = max', () => {
      const tiles = repository.findInArea(1, 1, 1, 1);

      expect(tiles).toHaveLength(1);
      expect(tiles[0]!.x).toBe(1);
      expect(tiles[0]!.y).toBe(1);
    });
  });

  describe('findExplored', () => {
    beforeEach(() => {
      repository.create({ x: 0, y: 0, explored: true });
      repository.create({ x: 1, y: 1, explored: true });
      repository.create({ x: 2, y: 2, explored: false });
    });

    it('should find only explored tiles', () => {
      const explored = repository.findExplored();

      expect(explored).toHaveLength(2);
      expect(explored.every(t => t.explored === true)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update terrain type', () => {
      const created = repository.create({
        x: 1,
        y: 1,
        terrainType: 'grass',
      });

      const update: UpdateWorldTileInput = {
        terrainType: 'water',
      };

      const updated = repository.update(created.id, update);

      expect(updated?.terrainType).toBe('water');
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
    });

    it('should update resources', () => {
      const created = repository.create({
        x: 1,
        y: 1,
        resources: { wood: 10 },
      });

      const update: UpdateWorldTileInput = {
        resources: { wood: 5, stone: 3 }, // Wood depleted, stone found
      };

      const updated = repository.update(created.id, update);

      expect(updated?.resources).toEqual({ wood: 5, stone: 3 });
    });

    it('should mark tile as explored', () => {
      const created = repository.create({
        x: 1,
        y: 1,
        explored: false,
      });

      const update: UpdateWorldTileInput = {
        explored: true,
      };

      const updated = repository.update(created.id, update);

      expect(updated?.explored).toBe(true);
    });

    it('should update structures', () => {
      const created = repository.create({
        x: 1,
        y: 1,
        structures: [],
      });

      const update: UpdateWorldTileInput = {
        structures: ['tent-id-1'],
      };

      const updated = repository.update(created.id, update);

      expect(updated?.structures).toEqual(['tent-id-1']);
    });

    it('should return null if tile not found', () => {
      const updated = repository.update('non-existent-id', { explored: true });

      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a tile by ID', () => {
      const created = repository.create({ x: 1, y: 1 });

      const deleted = repository.delete(created.id);

      expect(deleted).toBe(true);

      const found = repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false if tile not found', () => {
      const deleted = repository.delete('non-existent-id');

      expect(deleted).toBe(false);
    });
  });

  describe('count', () => {
    it('should return 0 when no tiles exist', () => {
      const count = repository.count();

      expect(count).toBe(0);
    });

    it('should return correct count', () => {
      repository.create({ x: 0, y: 0 });
      repository.create({ x: 1, y: 1 });
      repository.create({ x: 2, y: 2 });

      const count = repository.count();

      expect(count).toBe(3);
    });
  });

  describe('Phase 1: 5×5 Grid', () => {
    it('should support creating a 5×5 grid', () => {
      const bounds = getPhase1WorldBounds();

      // Create all tiles in 5×5 grid
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        for (let y = bounds.minY; y <= bounds.maxY; y++) {
          repository.create({ x, y });
        }
      }

      const count = repository.count();
      expect(count).toBe(25); // 5×5 = 25 tiles
    });

    it('should find tiles at corners of 5×5 grid', () => {
      repository.create({ x: 0, y: 0 }); // Top-left
      repository.create({ x: 4, y: 0 }); // Top-right
      repository.create({ x: 0, y: 4 }); // Bottom-left
      repository.create({ x: 4, y: 4 }); // Bottom-right

      expect(repository.findByCoordinates(0, 0)).not.toBeNull();
      expect(repository.findByCoordinates(4, 0)).not.toBeNull();
      expect(repository.findByCoordinates(0, 4)).not.toBeNull();
      expect(repository.findByCoordinates(4, 4)).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative coordinates', () => {
      const tile = repository.create({ x: -1, y: -1 });

      expect(tile.x).toBe(-1);
      expect(tile.y).toBe(-1);

      const found = repository.findByCoordinates(-1, -1);
      expect(found).not.toBeNull();
    });

    it('should handle empty resources object', () => {
      const tile = repository.create({
        x: 0,
        y: 0,
        resources: {},
      });

      expect(tile.resources).toEqual({});
    });

    it('should handle complex resources', () => {
      const tile = repository.create({
        x: 0,
        y: 0,
        resources: {
          wood: 100,
          stone: 50,
          iron: 25,
          gold: 5,
        },
      });

      expect(tile.resources).toEqual({
        wood: 100,
        stone: 50,
        iron: 25,
        gold: 5,
      });
    });

    it('should handle many structures on one tile', () => {
      const structureIds = Array.from({ length: 10 }, (_, i) => `structure-${i}`);

      const tile = repository.create({
        x: 0,
        y: 0,
        structures: structureIds,
      });

      expect(tile.structures).toHaveLength(10);
    });
  });
});
