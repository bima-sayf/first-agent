/**
 * WorldTile Entity (Domain Layer)
 * Phase 1 (v0.2): Represents a tile in the world map
 */
import { Entity, UUID, Timestamp } from '@shared/types';
/**
 * Terrain Type
 * Phase 1: Starting with 2 types (grass, water)
 * Phase 5+: Will add forest, mountain, desert, etc.
 */
export type TerrainType = 'grass' | 'water';
/**
 * Resources on a tile (flexible JSON structure)
 * Example: { "wood": 10, "stone": 5 }
 */
export interface TileResources {
    [resourceName: string]: number;
}
/**
 * Structure IDs on this tile (array of structure IDs)
 * Phase 5 will use this
 */
export type StructureIds = string[];
/**
 * WorldTile Entity
 * Represents a single tile on the game map
 */
export interface WorldTile extends Entity {
    id: UUID;
    x: number;
    y: number;
    terrainType: TerrainType;
    resources: TileResources;
    structures: StructureIds;
    explored: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
/**
 * Create WorldTile Input
 */
export interface CreateWorldTileInput {
    x: number;
    y: number;
    terrainType?: TerrainType;
    resources?: TileResources;
    structures?: StructureIds;
    explored?: boolean;
}
/**
 * Update WorldTile Input
 */
export interface UpdateWorldTileInput {
    terrainType?: TerrainType;
    resources?: TileResources;
    structures?: StructureIds;
    explored?: boolean;
}
/**
 * World Bounds
 * Phase 1: 5×5 grid (0-4, 0-4)
 * Phase 5: 8×9 grid
 */
export interface WorldBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}
/**
 * Get Phase 1 world bounds (5×5 grid)
 */
export declare function getPhase1WorldBounds(): WorldBounds;
/**
 * Check if coordinates are within bounds
 */
export declare function isWithinBounds(x: number, y: number, bounds: WorldBounds): boolean;
//# sourceMappingURL=WorldTile.d.ts.map