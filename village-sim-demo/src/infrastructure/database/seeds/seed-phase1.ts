/**
 * Phase 1 Seed Data Script
 * Populates database with minimal viable data for Phase 1 (v0.2)
 *
 * Minimal Data Sets:
 * - 3 agents: Elin, Bram, Oskar
 * - 5 items: wood, stone, food, water, basic_tool
 * - 5×5 world grid (25 tiles, mostly grass with some water)
 * - Test inventory: 2-3 items per agent
 */

import { DatabaseConnection } from '@infrastructure/database/connection';
import { AgentRepository } from '@infrastructure/database/repositories/AgentRepository';
import { ItemRepository } from '@infrastructure/database/repositories/ItemRepository';
import { InventoryRepository } from '@infrastructure/database/repositories/InventoryRepository';
import { WorldTileRepository } from '@infrastructure/database/repositories/WorldTileRepository';
import type { CreateAgentInput } from '@domain/entities/Agent';
import type { CreateItemInput } from '@domain/entities/Item';
import { getPhase1WorldBounds } from '@domain/entities/WorldTile';

/**
 * Phase 1 Minimal Agents (3 villagers)
 * Using roles from AgentRole type: farmer, baker, healer, etc.
 * Phase 1: Using only 3 attributes (str, end, agi)
 */
const PHASE1_AGENTS: CreateAgentInput[] = [
  {
    name: 'Elin',
    role: 'farmer',
    attributes: {
      str: 10,
      end: 12,
      agi: 14,
    },
    position: { x: 2, y: 2 }, // Center of 5×5 grid
  },
  {
    name: 'Bram',
    role: 'carpenter',
    attributes: {
      str: 14,
      end: 13,
      agi: 9,
    },
    position: { x: 1, y: 2 },
  },
  {
    name: 'Oskar',
    role: 'blacksmith',
    attributes: {
      str: 11,
      end: 10,
      agi: 12,
    },
    position: { x: 3, y: 2 },
  },
];

/**
 * Phase 1 Minimal Items (5 essential items)
 * Using ItemType: material, tool, food, water, consumable
 */
const PHASE1_ITEMS: CreateItemInput[] = [
  {
    name: 'wood',
    type: 'material',
    stackable: true,
    maxStack: 99,
    weight: 1,
    properties: {
      description: 'Basic building material from trees',
      category: 'raw_material',
    },
  },
  {
    name: 'stone',
    type: 'material',
    stackable: true,
    maxStack: 99,
    weight: 2,
    properties: {
      description: 'Heavy stone for construction',
      category: 'raw_material',
    },
  },
  {
    name: 'food',
    type: 'food',
    stackable: true,
    maxStack: 50,
    weight: 0.5,
    properties: {
      description: 'Basic rations to sustain villagers',
      nutrition: 20,
    },
  },
  {
    name: 'water',
    type: 'water',
    stackable: true,
    maxStack: 20,
    weight: 1,
    properties: {
      description: 'Fresh water for drinking',
      hydration: 30,
    },
  },
  {
    name: 'basic_tool',
    type: 'tool',
    stackable: false,
    maxStack: 1,
    weight: 3,
    properties: {
      description: 'Simple multi-purpose tool',
      durability: 50,
      efficiency: 1.2,
    },
  },
];

/**
 * Generate 5×5 world grid with minimal terrain variety
 */
function generatePhase1World() {
  const bounds = getPhase1WorldBounds();
  const tiles: Array<{
    x: number;
    y: number;
    terrainType: 'grass' | 'water';
    resources: Record<string, number>;
    structures: string[];
    explored: boolean;
  }> = [];

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      // Create some water tiles (corners and edges)
      const isCorner = (x === 0 && y === 0) || (x === 4 && y === 4);
      const isEdgeWater = (x === 0 && y === 4) || (x === 4 && y === 0);
      const terrainType: 'grass' | 'water' = isCorner || isEdgeWater ? 'water' : 'grass';

      // Add some resources to grass tiles
      const resources: Record<string, number> = {};
      if (terrainType === 'grass') {
        // Add wood to some tiles
        if ((x + y) % 3 === 0) {
          resources.wood = Math.floor(Math.random() * 5) + 3; // 3-7 wood
        }
        // Add stone to some tiles
        if ((x + y) % 4 === 1) {
          resources.stone = Math.floor(Math.random() * 3) + 2; // 2-4 stone
        }
      }

      tiles.push({
        x,
        y,
        terrainType,
        resources,
        structures: [],
        explored: x === 2 && y === 2, // Only center tile explored initially
      });
    }
  }

  return tiles;
}

/**
 * Main seed function
 */
export async function seedPhase1Data(dbPath: string = './data/village-sim.db'): Promise<void> {
  console.log('🌱 Starting Phase 1 data seeding...\n');

  // Initialize database connection
  DatabaseConnection.resetInstance();
  const connection = DatabaseConnection.getInstance({ path: dbPath });
  connection.connect();

  // Initialize repositories
  const agentRepo = new AgentRepository(connection);
  const itemRepo = new ItemRepository(connection);
  const inventoryRepo = new InventoryRepository(connection);
  const worldRepo = new WorldTileRepository(connection);

  try {
    // Check if data already exists
    const existingAgents = agentRepo.count();
    if (existingAgents > 0) {
      console.log('⚠️  Database already contains data.');
      console.log('   To re-seed, delete the database file and run migrations first.\n');
      return;
    }

    // 1. Seed Agents
    console.log('👥 Seeding agents...');
    const createdAgents = PHASE1_AGENTS.map(agentData => {
      const agent = agentRepo.create(agentData);
      console.log(
        `   ✓ Created agent: ${agent.name} (${agent.role}) at (${agent.position.x}, ${agent.position.y})`
      );
      return agent;
    });
    console.log(`   Total agents: ${createdAgents.length}\n`);

    // 2. Seed Items
    console.log('📦 Seeding items...');
    const createdItems = PHASE1_ITEMS.map(itemData => {
      const item = itemRepo.create(itemData);
      console.log(`   ✓ Created item: ${item.name} (${item.type})`);
      return item;
    });
    console.log(`   Total items: ${createdItems.length}\n`);

    // 3. Seed Initial Inventory (2-3 items per agent)
    console.log('🎒 Seeding inventory...');

    // Elin: gatherer - starts with food and water
    inventoryRepo.addItem({
      agentId: createdAgents[0]!.id,
      itemId: createdItems.find(i => i.name === 'food')!.id,
      quantity: 5,
    });
    inventoryRepo.addItem({
      agentId: createdAgents[0]!.id,
      itemId: createdItems.find(i => i.name === 'water')!.id,
      quantity: 3,
    });
    console.log(`   ✓ Elin: 5 food, 3 water`);

    // Bram: builder - starts with wood and stone
    inventoryRepo.addItem({
      agentId: createdAgents[1]!.id,
      itemId: createdItems.find(i => i.name === 'wood')!.id,
      quantity: 10,
    });
    inventoryRepo.addItem({
      agentId: createdAgents[1]!.id,
      itemId: createdItems.find(i => i.name === 'stone')!.id,
      quantity: 8,
    });
    console.log(`   ✓ Bram: 10 wood, 8 stone`);

    // Oskar: crafter - starts with basic_tool, wood, stone
    inventoryRepo.addItem({
      agentId: createdAgents[2]!.id,
      itemId: createdItems.find(i => i.name === 'basic_tool')!.id,
      quantity: 1,
      durability: 50,
    });
    inventoryRepo.addItem({
      agentId: createdAgents[2]!.id,
      itemId: createdItems.find(i => i.name === 'wood')!.id,
      quantity: 5,
    });
    inventoryRepo.addItem({
      agentId: createdAgents[2]!.id,
      itemId: createdItems.find(i => i.name === 'stone')!.id,
      quantity: 3,
    });
    console.log(`   ✓ Oskar: 1 basic_tool, 5 wood, 3 stone\n`);

    // 4. Seed World Tiles (5×5 grid)
    console.log('🗺️  Seeding world tiles (5×5 grid)...');
    const worldTiles = generatePhase1World();
    worldTiles.forEach(tileData => {
      worldRepo.create(tileData);
    });
    const totalTiles = worldRepo.count();
    const grassTiles = worldRepo.findByTerrainType('grass').length;
    const waterTiles = worldRepo.findByTerrainType('water').length;
    console.log(`   ✓ Created ${totalTiles} tiles (${grassTiles} grass, ${waterTiles} water)`);
    console.log(`   ✓ Resources distributed across tiles\n`);

    // 5. Summary
    console.log('✅ Phase 1 seed data completed!\n');
    console.log('📊 Summary:');
    console.log(`   - Agents: ${agentRepo.count()}`);
    console.log(`   - Items: ${itemRepo.count()}`);
    console.log(`   - World tiles: ${worldRepo.count()}`);
    console.log(`   - Explored tiles: ${worldRepo.findExplored().length}\n`);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    // Close connection
    connection.close();
  }
}

/**
 * Run seed script if called directly
 */
if (require.main === module) {
  const dbPath = process.env.DB_PATH || './data/village-sim.db';

  seedPhase1Data(dbPath)
    .then(() => {
      console.log('🎉 Seeding complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}
