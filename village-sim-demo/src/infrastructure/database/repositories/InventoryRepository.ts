/**
 * Inventory Repository (Infrastructure Layer)
 * Phase 1 (v0.2): Implements Repository pattern for Inventory entities
 */

import { DatabaseConnection } from '@infrastructure/database/connection';
import {
  Inventory,
  CreateInventoryInput,
  UpdateInventoryInput,
  InventoryWithItem,
} from '@domain/entities';
import { randomUUID } from 'crypto';

/**
 * Inventory Repository
 * Manages agent inventory (items carried by agents)
 */
export class InventoryRepository {
  private connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  /**
   * Add an item to agent's inventory
   */
  addItem(input: CreateInventoryInput): Inventory {
    const db = this.connection.getConnection();
    const now = Date.now();

    // Generate unique ID
    const id = randomUUID();

    // Apply defaults
    const quantity = input.quantity ?? 1;
    const durability = input.durability ?? null;

    const inventory: Inventory = {
      id,
      agentId: input.agentId,
      itemId: input.itemId,
      quantity,
      durability,
      createdAt: now,
      updatedAt: now,
    };

    // Insert into database
    const stmt = db.prepare(`
      INSERT INTO inventory (
        id, agent_id, item_id, quantity, durability, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      inventory.id,
      inventory.agentId,
      inventory.itemId,
      inventory.quantity,
      inventory.durability,
      inventory.createdAt,
      inventory.updatedAt
    );

    return inventory;
  }

  /**
   * Find all items in agent's inventory
   */
  findByAgentId(agentId: string): Inventory[] {
    const db = this.connection.getConnection();

    const stmt = db.prepare(`
      SELECT * FROM inventory WHERE agent_id = ? ORDER BY created_at ASC
    `);

    const rows = stmt.all(agentId) as any[];

    return rows.map(row => this.mapRowToInventory(row));
  }

  /**
   * Find all items in agent's inventory with item details (JOIN)
   */
  findByAgentIdWithDetails(agentId: string): InventoryWithItem[] {
    const db = this.connection.getConnection();

    const stmt = db.prepare(`
      SELECT 
        inventory.*,
        items.name as item_name,
        items.type as item_type,
        items.weight as item_weight
      FROM inventory
      INNER JOIN items ON inventory.item_id = items.id
      WHERE inventory.agent_id = ?
      ORDER BY inventory.created_at ASC
    `);

    const rows = stmt.all(agentId) as any[];

    return rows.map(row => this.mapRowToInventoryWithItem(row));
  }

  /**
   * Find specific item in agent's inventory
   */
  findByAgentAndItem(agentId: string, itemId: string): Inventory | null {
    const db = this.connection.getConnection();

    const stmt = db.prepare(`
      SELECT * FROM inventory WHERE agent_id = ? AND item_id = ?
    `);

    const row = stmt.get(agentId, itemId) as any;

    return row ? this.mapRowToInventory(row) : null;
  }

  /**
   * Update inventory entry
   */
  update(id: string, input: UpdateInventoryInput): Inventory | null {
    const db = this.connection.getConnection();

    // First, check if inventory entry exists
    const stmt = db.prepare(`
      SELECT * FROM inventory WHERE id = ?
    `);
    const existing = stmt.get(id) as any;

    if (!existing) {
      return null;
    }

    // Merge updates with existing data
    const updated: Inventory = {
      ...this.mapRowToInventory(existing),
      ...input,
      id, // Ensure ID doesn't change
      updatedAt: Date.now(),
    };

    // Update in database
    const updateStmt = db.prepare(`
      UPDATE inventory
      SET quantity = ?, durability = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(updated.quantity, updated.durability, updated.updatedAt, id);

    return updated;
  }

  /**
   * Remove item from inventory
   */
  removeItem(id: string): boolean {
    const db = this.connection.getConnection();

    const stmt = db.prepare(`
      DELETE FROM inventory WHERE id = ?
    `);

    const result = stmt.run(id);

    return result.changes > 0;
  }

  /**
   * Get total weight of all items in agent's inventory
   */
  getTotalWeight(agentId: string): number {
    const db = this.connection.getConnection();

    const stmt = db.prepare(`
      SELECT SUM(inventory.quantity * items.weight) as total_weight
      FROM inventory
      INNER JOIN items ON inventory.item_id = items.id
      WHERE inventory.agent_id = ?
    `);

    const result = stmt.get(agentId) as { total_weight: number | null };

    return result.total_weight ?? 0;
  }

  /**
   * Get count of unique items in agent's inventory
   */
  getItemCount(agentId: string): number {
    const db = this.connection.getConnection();

    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM inventory WHERE agent_id = ?
    `);

    const result = stmt.get(agentId) as { count: number };

    return result.count;
  }

  /**
   * Map database row to Inventory entity
   */
  private mapRowToInventory(row: any): Inventory {
    return {
      id: row.id,
      agentId: row.agent_id,
      itemId: row.item_id,
      quantity: row.quantity,
      durability: row.durability,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row with JOIN to InventoryWithItem entity
   */
  private mapRowToInventoryWithItem(row: any): InventoryWithItem {
    return {
      id: row.id,
      agentId: row.agent_id,
      itemId: row.item_id,
      quantity: row.quantity,
      durability: row.durability,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      itemName: row.item_name,
      itemType: row.item_type,
      itemWeight: row.item_weight,
    };
  }
}
