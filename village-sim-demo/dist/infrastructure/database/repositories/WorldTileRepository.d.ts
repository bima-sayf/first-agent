/**
 * WorldTile Repository (Infrastructure Layer)
 * Phase 1 (v0.2): Implements Repository pattern for WorldTile entities
 * Manages the 5×5 game world grid
 */
import { DatabaseConnection } from '@infrastructure/database/connection';
import { WorldTile, CreateWorldTileInput, UpdateWorldTileInput, TerrainType } from '@domain/entities';
/**
 * WorldTile Repository
 * Manages world map tiles
 */
export declare class WorldTileRepository {
    private connection;
    constructor(connection: DatabaseConnection);
    /**
     * Create a new world tile
     */
    create(input: CreateWorldTileInput): WorldTile;
    /**
     * Find tile by coordinates
     */
    findByCoordinates(x: number, y: number): WorldTile | null;
    /**
     * Find tile by ID
     */
    findById(id: string): WorldTile | null;
    /**
     * Find all tiles
     */
    findAll(): WorldTile[];
    /**
     * Find tiles by terrain type
     */
    findByTerrainType(terrainType: TerrainType): WorldTile[];
    /**
     * Find tiles in a rectangular area
     */
    findInArea(minX: number, maxX: number, minY: number, maxY: number): WorldTile[];
    /**
     * Find all explored tiles
     */
    findExplored(): WorldTile[];
    /**
     * Update a tile
     */
    update(id: string, input: UpdateWorldTileInput): WorldTile | null;
    /**
     * Delete a tile
     */
    delete(id: string): boolean;
    /**
     * Count total tiles
     */
    count(): number;
    /**
     * Map database row to WorldTile entity
     */
    private mapRowToTile;
}
//# sourceMappingURL=WorldTileRepository.d.ts.map