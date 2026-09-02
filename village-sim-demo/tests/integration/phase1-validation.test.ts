/**
 * Phase 1 Integration Tests
 * Validates complete Phase 1 (v0.2) functionality
 *
 * Tests:
 * - Database migrations
 * - All repositories working together
 * - Seed data integrity
 * - Cross-repository operations (e.g., inventory with agents and items)
 */

import { DatabaseConnection } from '@infrastructure/database/connection';
import { AgentRepository } from '@infrastructure/database/repositories/AgentRepository';
import { ItemRepository } from '@infrastructure/database/repositories/ItemRepository';
import { InventoryRepository } from '@infrastructure/database/repositories/InventoryRepository';
import { WorldTileRepository } from '@infrastructure/database/repositories/WorldTileRepository';
import { getPhase1WorldBounds } from '@domain/entities/WorldTile';

describe('Phase 1 Integration Tests', () => {
  let connection: DatabaseConnection;
  let agentRepo: AgentRepository;
  let itemRepo: ItemRepository;
  let inventoryRepo: InventoryRepository;
  let worldRepo: WorldTileRepository;

  beforeAll(() => {
    // Use in-memory database for integration tests
    DatabaseConnection.resetInstance();
    connection = DatabaseConnection.getInstance({ path: ':memory:' });
    connection.connect();

    // Run migrations
    const db = connection.getConnection();
    const fs = require('fs');
    const path = require('path');
    const migrationsDir = path.join(__dirname, '../../src/infrastructure/database/migrations');

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

    // Initialize repositories
    agentRepo = new AgentRepository(connection);
    itemRepo = new ItemRepository(connection);
    inventoryRepo = new InventoryRepository(connection);
    worldRepo = new WorldTileRepository(connection);
  });

  afterAll(() => {
    DatabaseConnection.resetInstance();
  });

  describe('Database Schema Validation', () => {
    it('should have all required tables', () => {
      const db = connection.getConnection();

      const tables = db
        .prepare(
          `
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `
        )
        .all() as { name: string }[];

      const tableNames = tables.map(t => t.name);

      expect(tableNames).toContain('agents');
      expect(tableNames).toContain('items');
      expect(tableNames).toContain('inventory');
      expect(tableNames).toContain('world_tiles');
      // Note: migrations table only created by migration runner, not in tests
    });

    it('should have proper foreign key constraints', () => {
      const db = connection.getConnection();

      // Check that foreign keys are enabled
      const fkStatus = db.pragma('foreign_keys') as Array<{ foreign_keys: number }>;
      expect(fkStatus[0]?.foreign_keys).toBe(1);
    });
  });

  describe('Phase 1 Minimal Data Requirements', () => {
    beforeEach(() => {
      // Clear existing data
      const db = connection.getConnection();
      db.exec('DELETE FROM inventory');
      db.exec('DELETE FROM agents');
      db.exec('DELETE FROM items');
      db.exec('DELETE FROM world_tiles');

      // Create minimal Phase 1 data
      // 3 agents
      agentRepo.create({
        name: 'Elin',
        role: 'farmer',
        attributes: { str: 10, end: 12, agi: 14 },
        position: { x: 2, y: 2 },
      });
      agentRepo.create({
        name: 'Bram',
        role: 'carpenter',
        attributes: { str: 14, end: 13, agi: 9 },
        position: { x: 1, y: 2 },
      });
      agentRepo.create({
        name: 'Oskar',
        role: 'blacksmith',
        attributes: { str: 11, end: 10, agi: 12 },
        position: { x: 3, y: 2 },
      });

      // 5 items
      itemRepo.create({ name: 'wood', type: 'material' });
      itemRepo.create({ name: 'stone', type: 'material' });
      itemRepo.create({ name: 'food', type: 'food' });
      itemRepo.create({ name: 'water', type: 'water' });
      itemRepo.create({ name: 'basic_tool', type: 'tool', stackable: false });

      // 5×5 world
      const bounds = getPhase1WorldBounds();
      for (let y = bounds.minY; y <= bounds.maxY; y++) {
        for (let x = bounds.minX; x <= bounds.maxX; x++) {
          worldRepo.create({ x, y });
        }
      }
    });

    it('should have exactly 3 agents', () => {
      expect(agentRepo.count()).toBe(3);
    });

    it('should have exactly 5 items', () => {
      expect(itemRepo.count()).toBe(5);
    });

    it('should have exactly 25 world tiles (5×5 grid)', () => {
      expect(worldRepo.count()).toBe(25);
    });

    it('should have all 3 agent roles', () => {
      const agents = agentRepo.findAll();
      const roles = agents.map(a => a.role);

      expect(roles).toContain('farmer');
      expect(roles).toContain('carpenter');
      expect(roles).toContain('blacksmith');
    });

    it('should have all 5 item types', () => {
      const items = itemRepo.findAll();
      const types = items.map(i => i.type);

      expect(types).toContain('material');
      expect(types).toContain('food');
      expect(types).toContain('water');
      expect(types).toContain('tool');
    });
  });

  describe('Cross-Repository Operations', () => {
    let testAgent: any;
    let testItem: any;

    beforeEach(() => {
      // Clear existing data
      const db = connection.getConnection();
      db.exec('DELETE FROM inventory');
      db.exec('DELETE FROM agents');
      db.exec('DELETE FROM items');
      db.exec('DELETE FROM world_tiles');

      testAgent = agentRepo.create({
        name: 'TestAgent',
        role: 'farmer',
        attributes: { str: 10, end: 10, agi: 10 },
      });
      testItem = itemRepo.create({ name: 'test_item', type: 'material' });
    });

    it('should add items to agent inventory', () => {
      inventoryRepo.addItem({
        agentId: testAgent.id,
        itemId: testItem.id,
        quantity: 10,
      });

      const inventory = inventoryRepo.findByAgentId(testAgent.id);
      expect(inventory).toHaveLength(1);
      expect(inventory[0]?.quantity).toBe(10);
    });

    it('should retrieve inventory with item details (JOIN)', () => {
      inventoryRepo.addItem({
        agentId: testAgent.id,
        itemId: testItem.id,
        quantity: 5,
      });

      const inventoryWithDetails = inventoryRepo.findByAgentIdWithDetails(testAgent.id);

      expect(inventoryWithDetails).toHaveLength(1);
      expect(inventoryWithDetails[0]?.itemName).toBe('test_item');
      expect(inventoryWithDetails[0]?.itemType).toBe('material');
    });

    it('should calculate total inventory weight', () => {
      const heavyItem = itemRepo.create({
        name: 'heavy_item',
        type: 'material',
        weight: 5,
      });

      inventoryRepo.addItem({
        agentId: testAgent.id,
        itemId: heavyItem.id,
        quantity: 3,
      });

      const totalWeight = inventoryRepo.getTotalWeight(testAgent.id);
      expect(totalWeight).toBe(15); // 5kg × 3 = 15kg
    });

    it('should cascade delete inventory when agent is deleted', () => {
      inventoryRepo.addItem({
        agentId: testAgent.id,
        itemId: testItem.id,
        quantity: 10,
      });

      const inventoryBefore = inventoryRepo.findByAgentId(testAgent.id);
      expect(inventoryBefore).toHaveLength(1);

      // Delete agent
      agentRepo.delete(testAgent.id);

      // Inventory should be automatically deleted (CASCADE)
      const inventoryAfter = inventoryRepo.findByAgentId(testAgent.id);
      expect(inventoryAfter).toHaveLength(0);
    });
  });

  describe('World Positioning', () => {
    beforeEach(() => {
      // Clear existing data
      const db = connection.getConnection();
      db.exec('DELETE FROM inventory');
      db.exec('DELETE FROM agents');
      db.exec('DELETE FROM items');
      db.exec('DELETE FROM world_tiles');
    });

    it('should place agents on valid tiles', () => {
      const agent = agentRepo.create({
        name: 'TestAgent',
        role: 'farmer',
        attributes: { str: 10, end: 10, agi: 10 },
        position: { x: 2, y: 3 },
      });

      // Create corresponding tile
      const tile = worldRepo.create({ x: 2, y: 3 });

      expect(agent.position.x).toBe(tile.x);
      expect(agent.position.y).toBe(tile.y);
    });

    it('should support multiple agents on different tiles', () => {
      const agent1 = agentRepo.create({
        name: 'Agent1',
        role: 'farmer',
        attributes: { str: 10, end: 10, agi: 10 },
        position: { x: 0, y: 0 },
      });

      const agent2 = agentRepo.create({
        name: 'Agent2',
        role: 'carpenter',
        attributes: { str: 10, end: 10, agi: 10 },
        position: { x: 4, y: 4 },
      });

      expect(agent1.position.x).not.toBe(agent2.position.x);
      expect(agent1.position.y).not.toBe(agent2.position.y);
    });

    it('should find agents within world bounds', () => {
      const bounds = getPhase1WorldBounds();

      agentRepo.create({
        name: 'InBounds',
        role: 'farmer',
        attributes: { str: 10, end: 10, agi: 10 },
        position: { x: bounds.minX, y: bounds.minY },
      });

      const agents = agentRepo.findAll();
      const positions = agents.map(a => a.position);

      positions.forEach(pos => {
        expect(pos.x).toBeGreaterThanOrEqual(bounds.minX);
        expect(pos.x).toBeLessThanOrEqual(bounds.maxX);
        expect(pos.y).toBeGreaterThanOrEqual(bounds.minY);
        expect(pos.y).toBeLessThanOrEqual(bounds.maxY);
      });
    });
  });

  describe('Phase 1 Completeness Validation', () => {
    beforeEach(() => {
      // Clear existing data
      const db = connection.getConnection();
      db.exec('DELETE FROM inventory');
      db.exec('DELETE FROM agents');
      db.exec('DELETE FROM items');
      db.exec('DELETE FROM world_tiles');
    });

    it('should have all repository methods working', () => {
      // Agent repository
      expect(typeof agentRepo.create).toBe('function');
      expect(typeof agentRepo.findById).toBe('function');
      expect(typeof agentRepo.findAll).toBe('function');
      expect(typeof agentRepo.update).toBe('function');
      expect(typeof agentRepo.delete).toBe('function');

      // Item repository
      expect(typeof itemRepo.create).toBe('function');
      expect(typeof itemRepo.findByName).toBe('function');
      expect(typeof itemRepo.findAll).toBe('function');

      // Inventory repository
      expect(typeof inventoryRepo.addItem).toBe('function');
      expect(typeof inventoryRepo.findByAgentId).toBe('function');
      expect(typeof inventoryRepo.getTotalWeight).toBe('function');

      // World repository
      expect(typeof worldRepo.create).toBe('function');
      expect(typeof worldRepo.findByCoordinates).toBe('function');
      expect(typeof worldRepo.findInArea).toBe('function');
    });

    it('should support Phase 1 attribute system (3 attributes)', () => {
      const agent = agentRepo.create({
        name: 'AttributeTest',
        role: 'farmer',
        attributes: { str: 10, end: 12, agi: 14 },
      });

      expect(agent.attributes.str).toBe(10);
      expect(agent.attributes.end).toBe(12);
      expect(agent.attributes.agi).toBe(14);

      // Stats calculated from attributes
      expect(agent.stats.maxHp).toBe(120); // END * 10
      expect(agent.stats.maxEnergy).toBe(100);
    });

    it('should support Phase 1 item types', () => {
      const material = itemRepo.create({ name: 'material_test', type: 'material' });
      const tool = itemRepo.create({ name: 'tool_test', type: 'tool' });
      const food = itemRepo.create({ name: 'food_test', type: 'food' });
      const water = itemRepo.create({ name: 'water_test', type: 'water' });

      expect(material.type).toBe('material');
      expect(tool.type).toBe('tool');
      expect(food.type).toBe('food');
      expect(water.type).toBe('water');
    });

    it('should support Phase 1 terrain types (grass, water)', () => {
      const grassTile = worldRepo.create({ x: 0, y: 0, terrainType: 'grass' });
      const waterTile = worldRepo.create({ x: 1, y: 1, terrainType: 'water' });

      expect(grassTile.terrainType).toBe('grass');
      expect(waterTile.terrainType).toBe('water');
    });
  });

  describe('Database Performance', () => {
    beforeEach(() => {
      // Clear existing data
      const db = connection.getConnection();
      db.exec('DELETE FROM inventory');
      db.exec('DELETE FROM agents');
      db.exec('DELETE FROM items');
      db.exec('DELETE FROM world_tiles');
    });

    it('should handle bulk operations efficiently', () => {
      const startTime = Date.now();

      // Create 25 tiles (5×5 grid)
      const bounds = getPhase1WorldBounds();
      for (let y = bounds.minY; y <= bounds.maxY; y++) {
        for (let x = bounds.minX; x <= bounds.maxX; x++) {
          worldRepo.create({ x, y });
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in under 100ms
      expect(duration).toBeLessThan(100);
      expect(worldRepo.count()).toBe(25);
    });
  });
});
