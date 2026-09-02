/**
 * InventoryRepository Tests
 * Phase 1 (v0.2) - TDD approach: Write tests first
 */

import { InventoryRepository } from '@infrastructure/database/repositories/InventoryRepository';
import { ItemRepository } from '@infrastructure/database/repositories/ItemRepository';
import { AgentRepository } from '@infrastructure/database/repositories/AgentRepository';
import { DatabaseConnection } from '@infrastructure/database/connection';
import { CreateInventoryInput, UpdateInventoryInput } from '@domain/entities';

describe('InventoryRepository', () => {
  let repository: InventoryRepository;
  let itemRepo: ItemRepository;
  let agentRepo: AgentRepository;
  let connection: DatabaseConnection;
  let testAgentId: string;
  let testItemId: string;

  beforeEach(() => {
    // Reset and setup database
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

    repository = new InventoryRepository(connection);
    itemRepo = new ItemRepository(connection);
    agentRepo = new AgentRepository(connection);

    // Create test agent and item
    const agent = agentRepo.create({
      name: 'Elin',
      role: 'farmer',
      attributes: { str: 12, end: 14, agi: 10 },
    });
    testAgentId = agent.id;

    const item = itemRepo.create({
      name: 'Wood',
      type: 'material',
    });
    testItemId = item.id;
  });

  afterEach(() => {
    DatabaseConnection.resetInstance();
  });

  describe('addItem', () => {
    it('should add an item to agent inventory', () => {
      const input: CreateInventoryInput = {
        agentId: testAgentId,
        itemId: testItemId,
        quantity: 10,
      };

      const inventory = repository.addItem(input);

      expect(inventory.id).toBeDefined();
      expect(inventory.agentId).toBe(testAgentId);
      expect(inventory.itemId).toBe(testItemId);
      expect(inventory.quantity).toBe(10);
      expect(inventory.durability).toBeNull();
      expect(inventory.createdAt).toBeGreaterThan(0);
    });

    it('should add item with default quantity of 1', () => {
      const input: CreateInventoryInput = {
        agentId: testAgentId,
        itemId: testItemId,
      };

      const inventory = repository.addItem(input);

      expect(inventory.quantity).toBe(1);
    });

    it('should add tool with durability', () => {
      const axe = itemRepo.create({
        name: 'Stone Axe',
        type: 'tool',
        stackable: false,
        properties: { durability: 20 },
      });

      const input: CreateInventoryInput = {
        agentId: testAgentId,
        itemId: axe.id,
        quantity: 1,
        durability: 20,
      };

      const inventory = repository.addItem(input);

      expect(inventory.durability).toBe(20);
    });
  });

  describe('findByAgentId', () => {
    it('should return empty array when agent has no items', () => {
      const items = repository.findByAgentId(testAgentId);

      expect(items).toEqual([]);
    });

    it('should find all items in agent inventory', () => {
      const stone = itemRepo.create({ name: 'Stone', type: 'material' });
      const food = itemRepo.create({ name: 'Berries', type: 'food' });

      repository.addItem({ agentId: testAgentId, itemId: testItemId, quantity: 10 });
      repository.addItem({ agentId: testAgentId, itemId: stone.id, quantity: 5 });
      repository.addItem({ agentId: testAgentId, itemId: food.id, quantity: 3 });

      const items = repository.findByAgentId(testAgentId);

      expect(items).toHaveLength(3);
    });

    it('should not return other agents items', () => {
      const otherAgent = agentRepo.create({
        name: 'Bram',
        role: 'baker',
        attributes: { str: 10, end: 12, agi: 11 },
      });

      repository.addItem({ agentId: testAgentId, itemId: testItemId, quantity: 10 });
      repository.addItem({ agentId: otherAgent.id, itemId: testItemId, quantity: 5 });

      const items = repository.findByAgentId(testAgentId);

      expect(items).toHaveLength(1);
      expect(items[0]!.quantity).toBe(10);
    });
  });

  describe('findByAgentIdWithDetails', () => {
    it('should return inventory with item details', () => {
      repository.addItem({ agentId: testAgentId, itemId: testItemId, quantity: 10 });

      const items = repository.findByAgentIdWithDetails(testAgentId);

      expect(items).toHaveLength(1);
      expect(items[0]!.itemName).toBe('Wood');
      expect(items[0]!.itemType).toBe('material');
      expect(items[0]!.quantity).toBe(10);
    });

    it('should return multiple items with details', () => {
      const stone = itemRepo.create({ name: 'Stone', type: 'material', weight: 2 });
      const food = itemRepo.create({ name: 'Berries', type: 'food', weight: 0.1 });

      repository.addItem({ agentId: testAgentId, itemId: testItemId, quantity: 10 });
      repository.addItem({ agentId: testAgentId, itemId: stone.id, quantity: 5 });
      repository.addItem({ agentId: testAgentId, itemId: food.id, quantity: 3 });

      const items = repository.findByAgentIdWithDetails(testAgentId);

      expect(items).toHaveLength(3);
      expect(items.map(i => i.itemName).sort()).toEqual(['Berries', 'Stone', 'Wood']);
      expect(items.find(i => i.itemName === 'Stone')?.itemWeight).toBe(2);
    });
  });

  describe('findByAgentAndItem', () => {
    it('should find specific item in agent inventory', () => {
      repository.addItem({ agentId: testAgentId, itemId: testItemId, quantity: 10 });

      const inventory = repository.findByAgentAndItem(testAgentId, testItemId);

      expect(inventory).toBeDefined();
      expect(inventory?.quantity).toBe(10);
    });

    it('should return null if agent does not have the item', () => {
      const stone = itemRepo.create({ name: 'Stone', type: 'material' });

      const inventory = repository.findByAgentAndItem(testAgentId, stone.id);

      expect(inventory).toBeNull();
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const created = repository.addItem({
        agentId: testAgentId,
        itemId: testItemId,
        quantity: 10,
      });

      const update: UpdateInventoryInput = {
        quantity: 15,
      };

      const updated = repository.update(created.id, update);

      expect(updated?.quantity).toBe(15);
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
    });

    it('should update tool durability', () => {
      const axe = itemRepo.create({
        name: 'Stone Axe',
        type: 'tool',
        stackable: false,
      });

      const created = repository.addItem({
        agentId: testAgentId,
        itemId: axe.id,
        quantity: 1,
        durability: 20,
      });

      const update: UpdateInventoryInput = {
        durability: 15, // Used 5 times
      };

      const updated = repository.update(created.id, update);

      expect(updated?.durability).toBe(15);
    });
  });

  describe('removeItem', () => {
    it('should remove item from inventory', () => {
      const created = repository.addItem({
        agentId: testAgentId,
        itemId: testItemId,
        quantity: 10,
      });

      const removed = repository.removeItem(created.id);

      expect(removed).toBe(true);

      const found = repository.findByAgentAndItem(testAgentId, testItemId);
      expect(found).toBeNull();
    });

    it('should return false if inventory entry not found', () => {
      const removed = repository.removeItem('non-existent-id');

      expect(removed).toBe(false);
    });
  });

  describe('getTotalWeight', () => {
    it('should return 0 for empty inventory', () => {
      const weight = repository.getTotalWeight(testAgentId);

      expect(weight).toBe(0);
    });

    it('should calculate total weight of all items', () => {
      const stone = itemRepo.create({ name: 'Stone', type: 'material', weight: 2 });
      const food = itemRepo.create({ name: 'Berries', type: 'food', weight: 0.1 });

      // Wood: 10 * 1kg = 10kg
      repository.addItem({ agentId: testAgentId, itemId: testItemId, quantity: 10 });
      // Stone: 5 * 2kg = 10kg
      repository.addItem({ agentId: testAgentId, itemId: stone.id, quantity: 5 });
      // Berries: 3 * 0.1kg = 0.3kg
      repository.addItem({ agentId: testAgentId, itemId: food.id, quantity: 3 });

      const weight = repository.getTotalWeight(testAgentId);

      expect(weight).toBe(20.3); // 10 + 10 + 0.3
    });
  });

  describe('getItemCount', () => {
    it('should return 0 for empty inventory', () => {
      const count = repository.getItemCount(testAgentId);

      expect(count).toBe(0);
    });

    it('should count unique inventory entries', () => {
      const stone = itemRepo.create({ name: 'Stone', type: 'material' });
      const food = itemRepo.create({ name: 'Berries', type: 'food' });

      repository.addItem({ agentId: testAgentId, itemId: testItemId, quantity: 10 });
      repository.addItem({ agentId: testAgentId, itemId: stone.id, quantity: 5 });
      repository.addItem({ agentId: testAgentId, itemId: food.id, quantity: 3 });

      const count = repository.getItemCount(testAgentId);

      expect(count).toBe(3); // 3 unique items
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should cascade delete inventory when agent is deleted', () => {
      repository.addItem({ agentId: testAgentId, itemId: testItemId, quantity: 10 });

      // Delete the agent
      agentRepo.delete(testAgentId);

      // Inventory should be automatically deleted
      const items = repository.findByAgentId(testAgentId);
      expect(items).toEqual([]);
    });

    it('should cascade delete inventory when item is deleted', () => {
      repository.addItem({ agentId: testAgentId, itemId: testItemId, quantity: 10 });

      // Delete the item
      itemRepo.delete(testItemId);

      // Inventory should be automatically deleted
      const items = repository.findByAgentId(testAgentId);
      expect(items).toEqual([]);
    });
  });
});
