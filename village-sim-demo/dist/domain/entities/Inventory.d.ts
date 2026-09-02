/**
 * Inventory Entity (Domain Layer)
 * Phase 1 (v0.2): Represents items carried by agents
 */
import { Entity, UUID, Timestamp } from '@shared/types';
/**
 * Inventory Entry
 * Links an agent to items they carry
 */
export interface Inventory extends Entity {
    id: UUID;
    agentId: UUID;
    itemId: UUID;
    quantity: number;
    durability: number | null;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
/**
 * Create Inventory Input
 */
export interface CreateInventoryInput {
    agentId: UUID;
    itemId: UUID;
    quantity?: number;
    durability?: number | null;
}
/**
 * Update Inventory Input
 */
export interface UpdateInventoryInput {
    quantity?: number;
    durability?: number | null;
}
/**
 * Inventory with Item Details (for queries)
 * Joins inventory with item information
 */
export interface InventoryWithItem extends Inventory {
    itemName: string;
    itemType: string;
    itemWeight: number;
}
//# sourceMappingURL=Inventory.d.ts.map