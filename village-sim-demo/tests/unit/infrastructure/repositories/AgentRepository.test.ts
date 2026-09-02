/**
 * AgentRepository Tests
 * Phase 1 (v0.2) - TDD approach: Write tests first
 */

import { AgentRepository } from '@infrastructure/database/repositories/AgentRepository';
import { DatabaseConnection } from '@infrastructure/database/connection';
import { CreateAgentInput, UpdateAgentInput } from '@domain/entities';

describe('AgentRepository', () => {
  let repository: AgentRepository;
  let connection: DatabaseConnection;

  beforeEach(() => {
    // Reset any existing instance
    DatabaseConnection.resetInstance();

    // Setup in-memory database for each test
    connection = DatabaseConnection.getInstance({ path: ':memory:' });
    connection.connect();

    // Run migrations on the connected database
    const db = connection.getConnection();

    // Read and execute migration SQL files directly
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

    // Create repository instance
    repository = new AgentRepository(connection);
  });

  afterEach(() => {
    DatabaseConnection.resetInstance();
  });

  describe('create', () => {
    it('should create a new agent with minimal data', () => {
      const input: CreateAgentInput = {
        name: 'Elin',
        role: 'farmer',
        attributes: { str: 12, end: 14, agi: 10 },
      };

      const agent = repository.create(input);

      expect(agent.id).toBeDefined();
      expect(agent.name).toBe('Elin');
      expect(agent.role).toBe('farmer');
      expect(agent.level).toBe(1);
      expect(agent.xp).toBe(0);
      expect(agent.attributes).toEqual({ str: 12, end: 14, agi: 10 });
      expect(agent.stats.maxHp).toBe(140); // END * 10
      expect(agent.stats.hp).toBe(140); // Starts at max
      expect(agent.stats.maxEnergy).toBe(100);
      expect(agent.stats.energy).toBe(100);
      expect(agent.position).toEqual({ x: 0, y: 0 }); // Default position
      expect(agent.createdAt).toBeGreaterThan(0);
      expect(agent.updatedAt).toBeGreaterThan(0);
    });

    it('should create agent with custom position', () => {
      const input: CreateAgentInput = {
        name: 'Bram',
        role: 'baker',
        attributes: { str: 10, end: 12, agi: 11 },
        position: { x: 2, y: 3 },
      };

      const agent = repository.create(input);

      expect(agent.position).toEqual({ x: 2, y: 3 });
    });

    it('should generate unique IDs for multiple agents', () => {
      const input1: CreateAgentInput = {
        name: 'Elin',
        role: 'farmer',
        attributes: { str: 12, end: 14, agi: 10 },
      };

      const input2: CreateAgentInput = {
        name: 'Bram',
        role: 'baker',
        attributes: { str: 10, end: 12, agi: 11 },
      };

      const agent1 = repository.create(input1);
      const agent2 = repository.create(input2);

      expect(agent1.id).not.toBe(agent2.id);
    });
  });

  describe('findById', () => {
    it('should find an agent by ID', () => {
      const input: CreateAgentInput = {
        name: 'Elin',
        role: 'farmer',
        attributes: { str: 12, end: 14, agi: 10 },
      };

      const created = repository.create(input);
      const found = repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Elin');
      expect(found?.role).toBe('farmer');
    });

    it('should return null if agent not found', () => {
      const found = repository.findById('non-existent-id');

      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return empty array when no agents exist', () => {
      const agents = repository.findAll();

      expect(agents).toEqual([]);
    });

    it('should return all agents', () => {
      const input1: CreateAgentInput = {
        name: 'Elin',
        role: 'farmer',
        attributes: { str: 12, end: 14, agi: 10 },
      };

      const input2: CreateAgentInput = {
        name: 'Bram',
        role: 'baker',
        attributes: { str: 10, end: 12, agi: 11 },
      };

      const input3: CreateAgentInput = {
        name: 'Mira',
        role: 'healer',
        attributes: { str: 8, end: 11, agi: 12 },
      };

      repository.create(input1);
      repository.create(input2);
      repository.create(input3);

      const agents = repository.findAll();

      expect(agents).toHaveLength(3);
      expect(agents.map(a => a.name)).toEqual(['Elin', 'Bram', 'Mira']);
    });
  });

  describe('findByRole', () => {
    beforeEach(() => {
      repository.create({
        name: 'Elin',
        role: 'farmer',
        attributes: { str: 12, end: 14, agi: 10 },
      });

      repository.create({
        name: 'Bram',
        role: 'baker',
        attributes: { str: 10, end: 12, agi: 11 },
      });

      repository.create({
        name: 'Mira',
        role: 'healer',
        attributes: { str: 8, end: 11, agi: 12 },
      });
    });

    it('should find agents by role', () => {
      const farmers = repository.findByRole('farmer');

      expect(farmers).toHaveLength(1);
      expect(farmers[0]!.name).toBe('Elin');
      expect(farmers[0]!.role).toBe('farmer');
    });

    it('should return empty array if no agents have the role', () => {
      const blacksmiths = repository.findByRole('blacksmith');

      expect(blacksmiths).toEqual([]);
    });
  });

  describe('findByPosition', () => {
    beforeEach(() => {
      repository.create({
        name: 'Elin',
        role: 'farmer',
        attributes: { str: 12, end: 14, agi: 10 },
        position: { x: 0, y: 0 },
      });

      repository.create({
        name: 'Bram',
        role: 'baker',
        attributes: { str: 10, end: 12, agi: 11 },
        position: { x: 2, y: 3 },
      });

      repository.create({
        name: 'Mira',
        role: 'healer',
        attributes: { str: 8, end: 11, agi: 12 },
        position: { x: 2, y: 3 }, // Same position as Bram
      });
    });

    it('should find agents at specific position', () => {
      const agentsAt2_3 = repository.findByPosition(2, 3);

      expect(agentsAt2_3).toHaveLength(2);
      expect(agentsAt2_3.map(a => a.name).sort()).toEqual(['Bram', 'Mira']);
    });

    it('should return empty array if no agents at position', () => {
      const agentsAt5_5 = repository.findByPosition(5, 5);

      expect(agentsAt5_5).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update agent name', () => {
      const created = repository.create({
        name: 'Elin',
        role: 'farmer',
        attributes: { str: 12, end: 14, agi: 10 },
      });

      const update: UpdateAgentInput = {
        name: 'Elin the Farmer',
      };

      const updated = repository.update(created.id, update);

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Elin the Farmer');
      expect(updated?.role).toBe('farmer'); // Unchanged
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
    });

    it('should update agent position', () => {
      const created = repository.create({
        name: 'Elin',
        role: 'farmer',
        attributes: { str: 12, end: 14, agi: 10 },
      });

      const update: UpdateAgentInput = {
        position: { x: 5, y: 7 },
      };

      const updated = repository.update(created.id, update);

      expect(updated?.position).toEqual({ x: 5, y: 7 });
    });

    it('should update agent level and XP', () => {
      const created = repository.create({
        name: 'Elin',
        role: 'farmer',
        attributes: { str: 12, end: 14, agi: 10 },
      });

      const update: UpdateAgentInput = {
        level: 2,
        xp: 150,
      };

      const updated = repository.update(created.id, update);

      expect(updated?.level).toBe(2);
      expect(updated?.xp).toBe(150);
    });

    it('should update agent stats', () => {
      const created = repository.create({
        name: 'Elin',
        role: 'farmer',
        attributes: { str: 12, end: 14, agi: 10 },
      });

      const update: UpdateAgentInput = {
        stats: {
          hp: 100, // Damaged
          maxHp: 140,
          energy: 50, // Tired
          maxEnergy: 100,
        },
      };

      const updated = repository.update(created.id, update);

      expect(updated?.stats.hp).toBe(100);
      expect(updated?.stats.energy).toBe(50);
    });

    it('should return null if agent not found', () => {
      const update: UpdateAgentInput = {
        name: 'Ghost',
      };

      const updated = repository.update('non-existent-id', update);

      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete an agent by ID', () => {
      const created = repository.create({
        name: 'Elin',
        role: 'farmer',
        attributes: { str: 12, end: 14, agi: 10 },
      });

      const deleted = repository.delete(created.id);

      expect(deleted).toBe(true);

      // Verify agent is gone
      const found = repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false if agent not found', () => {
      const deleted = repository.delete('non-existent-id');

      expect(deleted).toBe(false);
    });
  });

  describe('count', () => {
    it('should return 0 when no agents exist', () => {
      const count = repository.count();

      expect(count).toBe(0);
    });

    it('should return correct count of agents', () => {
      repository.create({
        name: 'Elin',
        role: 'farmer',
        attributes: { str: 12, end: 14, agi: 10 },
      });

      repository.create({
        name: 'Bram',
        role: 'baker',
        attributes: { str: 10, end: 12, agi: 11 },
      });

      repository.create({
        name: 'Mira',
        role: 'healer',
        attributes: { str: 8, end: 11, agi: 12 },
      });

      const count = repository.count();

      expect(count).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle agents with minimum attributes', () => {
      const input: CreateAgentInput = {
        name: 'Weak',
        role: 'farmer',
        attributes: { str: 1, end: 1, agi: 1 },
      };

      const agent = repository.create(input);

      expect(agent.attributes).toEqual({ str: 1, end: 1, agi: 1 });
      expect(agent.stats.maxHp).toBe(10); // 1 * 10
    });

    it('should handle agents with high attributes', () => {
      const input: CreateAgentInput = {
        name: 'Strong',
        role: 'blacksmith',
        attributes: { str: 20, end: 18, agi: 15 },
      };

      const agent = repository.create(input);

      expect(agent.attributes).toEqual({ str: 20, end: 18, agi: 15 });
      expect(agent.stats.maxHp).toBe(180); // 18 * 10
    });

    it('should handle special characters in names', () => {
      const input: CreateAgentInput = {
        name: "O'Brien the Baker",
        role: 'baker',
        attributes: { str: 10, end: 12, agi: 11 },
      };

      const agent = repository.create(input);

      expect(agent.name).toBe("O'Brien the Baker");

      const found = repository.findById(agent.id);
      expect(found?.name).toBe("O'Brien the Baker");
    });
  });
});
