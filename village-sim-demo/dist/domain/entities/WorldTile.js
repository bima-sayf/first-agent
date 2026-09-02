"use strict";
/**
 * WorldTile Entity (Domain Layer)
 * Phase 1 (v0.2): Represents a tile in the world map
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPhase1WorldBounds = getPhase1WorldBounds;
exports.isWithinBounds = isWithinBounds;
/**
 * Get Phase 1 world bounds (5×5 grid)
 */
function getPhase1WorldBounds() {
    return {
        minX: 0,
        maxX: 4,
        minY: 0,
        maxY: 4,
    };
}
/**
 * Check if coordinates are within bounds
 */
function isWithinBounds(x, y, bounds) {
    return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}
//# sourceMappingURL=WorldTile.js.map