/**
 * Item Repository (Infrastructure Layer)
 * Phase 1 (v0.2): Implements Repository pattern for Item entities
 */
import { DatabaseConnection } from '@infrastructure/database/connection';
import { Item, CreateItemInput, UpdateItemInput, ItemType } from '@domain/entities';
/**
 * Item Repository
 * Provides CRUD operations for Item entities
 */
export declare class ItemRepository {
    private connection;
    constructor(connection: DatabaseConnection);
    /**
     * Create a new item
     */
    create(input: CreateItemInput): Item;
    /**
     * Find item by ID
     */
    findById(id: string): Item | null;
    /**
     * Find item by name (unique constraint)
     */
    findByName(name: string): Item | null;
    /**
     * Find all items
     */
    findAll(): Item[];
    /**
     * Find items by type
     */
    findByType(type: ItemType): Item[];
    /**
     * Update an item
     */
    update(id: string, input: UpdateItemInput): Item | null;
    /**
     * Delete an item
     */
    delete(id: string): boolean;
    /**
     * Count total items
     */
    count(): number;
    /**
     * Map database row to Item entity
     */
    private mapRowToItem;
}
//# sourceMappingURL=ItemRepository.d.ts.map