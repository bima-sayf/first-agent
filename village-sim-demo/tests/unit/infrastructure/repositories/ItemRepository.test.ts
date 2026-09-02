/**
 * ItemRepository Tests
 * Phase 1 (v0.2) - TDD approach: Write tests first
 */

import { ItemRepository } from '@infrastructure/database/repositories/ItemRepository';
import { DatabaseConnection } from '@infrastructure/database/connection';
import { CreateItemInput, UpdateItemInput } from '@domain/entities';

describe('ItemRepository', () => {
  let repository: ItemRepository;
  let connection: DatabaseConnection;

  beforeEach(() => {
    // Reset any existing instance
    DatabaseConnection.resetInstance();

    // Setup in-memory database for each test
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

    repository = new ItemRepository(connection);
  });

  afterEach(() => {
    DatabaseConnection.resetInstance();
  });

  describe('create', () => {
    it('should create a stackable material item with defaults', () => {
      const input: CreateItemInput = {
        name: 'Wood',
        type: 'material',
      };

      const item = repository.create(input);

      expect(item.id).toBeDefined();
      expect(item.name).toBe('Wood');
      expect(item.type).toBe('material');
      expect(item.stackable).toBe(true); // Default
      expect(item.maxStack).toBe(99); // Default
      expect(item.weight).toBe(1); // Default
      expect(item.properties).toEqual({});
      expect(item.createdAt).toBeGreaterThan(0);
      expect(item.updatedAt).toBeGreaterThan(0);
    });

    it('should create a tool with durability property', () => {
      const input: CreateItemInput = {
        name: 'Stone Axe',
        type: 'tool',
        stackable: false,
        maxStack: 1,
        weight: 2.5,
        properties: {
          durability: 20,
          description: 'A basic stone axe',
        },
      };

      const item = repository.create(input);

      expect(item.name).toBe('Stone Axe');
      expect(item.type).toBe('tool');
      expect(item.stackable).toBe(false);
      expect(item.maxStack).toBe(1);
      expect(item.weight).toBe(2.5);
      expect(item.properties.durability).toBe(20);
      expect(item.properties.description).toBe('A basic stone axe');
    });

    it('should create a food item with nutrition', () => {
      const input: CreateItemInput = {
        name: 'Berries',
        type: 'food',
        weight: 0.1,
        properties: {
          nutrition: 10,
          description: 'Fresh berries',
        },
      };

      const item = repository.create(input);

      expect(item.name).toBe('Berries');
      expect(item.type).toBe('food');
      expect(item.properties.nutrition).toBe(10);
    });

    it('should enforce unique item names', () => {
      const input: CreateItemInput = {
        name: 'Wood',
        type: 'material',
      };

      repository.create(input);

      // Try to create another item with the same name
      expect(() => {
        repository.create(input);
      }).toThrow();
    });
  });

  describe('findById', () => {
    it('should find an item by ID', () => {
      const created = repository.create({
        name: 'Stone',
        type: 'material',
      });

      const found = repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Stone');
    });

    it('should return null if item not found', () => {
      const found = repository.findById('non-existent-id');

      expect(found).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find an item by name', () => {
      repository.create({
        name: 'Wood',
        type: 'material',
      });

      const found = repository.findByName('Wood');

      expect(found).toBeDefined();
      expect(found?.name).toBe('Wood');
    });

    it('should return null if item name not found', () => {
      const found = repository.findByName('Diamond');

      expect(found).toBeNull();
    });

    it('should be case-sensitive', () => {
      repository.create({
        name: 'Wood',
        type: 'material',
      });

      const found = repository.findByName('wood'); // lowercase

      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return empty array when no items exist', () => {
      const items = repository.findAll();

      expect(items).toEqual([]);
    });

    it('should return all items', () => {
      repository.create({ name: 'Wood', type: 'material' });
      repository.create({ name: 'Stone', type: 'material' });
      repository.create({ name: 'Food', type: 'food' });

      const items = repository.findAll();

      expect(items).toHaveLength(3);
      expect(items.map(i => i.name).sort()).toEqual(['Food', 'Stone', 'Wood']);
    });
  });

  describe('findByType', () => {
    beforeEach(() => {
      repository.create({ name: 'Wood', type: 'material' });
      repository.create({ name: 'Stone', type: 'material' });
      repository.create({ name: 'Stone Axe', type: 'tool', stackable: false });
      repository.create({ name: 'Berries', type: 'food' });
    });

    it('should find items by type', () => {
      const materials = repository.findByType('material');

      expect(materials).toHaveLength(2);
      expect(materials.map(i => i.name).sort()).toEqual(['Stone', 'Wood']);
    });

    it('should return empty array if no items of type exist', () => {
      const water = repository.findByType('water');

      expect(water).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update item properties', () => {
      const created = repository.create({
        name: 'Stone Axe',
        type: 'tool',
        properties: { durability: 20 },
      });

      const update: UpdateItemInput = {
        properties: { durability: 15, upgraded: true },
      };

      const updated = repository.update(created.id, update);

      expect(updated?.properties.durability).toBe(15);
      expect(updated?.properties.upgraded).toBe(true);
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
    });

    it('should update item weight', () => {
      const created = repository.create({
        name: 'Wood',
        type: 'material',
      });

      const update: UpdateItemInput = {
        weight: 1.5,
      };

      const updated = repository.update(created.id, update);

      expect(updated?.weight).toBe(1.5);
    });

    it('should return null if item not found', () => {
      const updated = repository.update('non-existent-id', { weight: 5 });

      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete an item by ID', () => {
      const created = repository.create({
        name: 'Wood',
        type: 'material',
      });

      const deleted = repository.delete(created.id);

      expect(deleted).toBe(true);

      const found = repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false if item not found', () => {
      const deleted = repository.delete('non-existent-id');

      expect(deleted).toBe(false);
    });
  });

  describe('count', () => {
    it('should return 0 when no items exist', () => {
      const count = repository.count();

      expect(count).toBe(0);
    });

    it('should return correct count of items', () => {
      repository.create({ name: 'Wood', type: 'material' });
      repository.create({ name: 'Stone', type: 'material' });
      repository.create({ name: 'Food', type: 'food' });

      const count = repository.count();

      expect(count).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle items with zero weight', () => {
      const item = repository.create({
        name: 'Feather',
        type: 'material',
        weight: 0,
      });

      expect(item.weight).toBe(0);
    });

    it('should handle items with very high stack limit', () => {
      const item = repository.create({
        name: 'Sand',
        type: 'material',
        maxStack: 999,
      });

      expect(item.maxStack).toBe(999);
    });

    it('should handle complex properties object', () => {
      const item = repository.create({
        name: 'Magic Sword',
        type: 'tool',
        properties: {
          durability: 100,
          damage: 50,
          enchantments: ['fire', 'sharpness'],
          rarity: 'legendary',
        },
      });

      expect(item.properties.enchantments).toEqual(['fire', 'sharpness']);
      expect(item.properties.rarity).toBe('legendary');
    });
  });
});
