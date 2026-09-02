/**
 * Inventory Repository (Infrastructure Layer)
 * Phase 1 (v0.2): Implements Repository pattern for Inventory entities
 */
import { DatabaseConnection } from '@infrastructure/database/connection';
import { Inventory, CreateInventoryInput, UpdateInventoryInput, InventoryWithItem } from '@domain/entities';
/**
 * Inventory Repository
 * Manages agent inventory (items carried by agents)
 */
export declare class InventoryRepository {
    private connection;
    constructor(connection: DatabaseConnection);
    /**
     * Add an item to agent's inventory
     */
    addItem(input: CreateInventoryInput): Inventory;
    /**
     * Find all items in agent's inventory
     */
    findByAgentId(agentId: string): Inventory[];
    /**
     * Find all items in agent's inventory with item details (JOIN)
     */
    findByAgentIdWithDetails(agentId: string): InventoryWithItem[];
    /**
     * Find specific item in agent's inventory
     */
    findByAgentAndItem(agentId: string, itemId: string): Inventory | null;
    /**
     * Update inventory entry
     */
    update(id: string, input: UpdateInventoryInput): Inventory | null;
    /**
     * Remove item from inventory
     */
    removeItem(id: string): boolean;
    /**
     * Get total weight of all items in agent's inventory
     */
    getTotalWeight(agentId: string): number;
    /**
     * Get count of unique items in agent's inventory
     */
    getItemCount(agentId: string): number;
    /**
     * Map database row to Inventory entity
     */
    private mapRowToInventory;
    /**
     * Map database row with JOIN to InventoryWithItem entity
     */
    private mapRowToInventoryWithItem;
}
//# sourceMappingURL=InventoryRepository.d.ts.map