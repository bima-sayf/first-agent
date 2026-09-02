-- Migration 004: Create world_tiles table
-- Phase 1 (v0.2): Start with 5×5 grid

CREATE TABLE IF NOT EXISTS world_tiles (
  id TEXT PRIMARY KEY,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  terrain_type TEXT NOT NULL DEFAULT 'grass', -- 'grass', 'water', 'forest', etc.
  
  -- Resources available on this tile (JSON)
  -- Example: {"wood": 10, "stone": 5}
  resources TEXT NOT NULL DEFAULT '{}',
  
  -- Structures built on this tile (JSON array of structure IDs)
  -- Phase 5 will use this
  structures TEXT NOT NULL DEFAULT '[]',
  
  -- Tile state (explored, revealed, etc.)
  explored INTEGER NOT NULL DEFAULT 0, -- Boolean: 0 = unexplored, 1 = explored
  
  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  -- Ensure unique coordinates
  UNIQUE(x, y)
);

-- Index for spatial queries (most important for world tiles)
CREATE INDEX IF NOT EXISTS idx_world_tiles_position ON world_tiles(x, y);

-- Index for terrain type queries
CREATE INDEX IF NOT EXISTS idx_world_tiles_terrain ON world_tiles(terrain_type);
