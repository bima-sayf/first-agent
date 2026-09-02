-- Migration 001: Create agents table
-- Phase 1 (v0.2): Minimal data - Start with 3 agents

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  
  -- Attributes (JSON for flexibility)
  -- Phase 1: {str, end, agi} - Phase 2 will add {int, wis, cha}
  attributes TEXT NOT NULL DEFAULT '{}',
  
  -- Current stats (JSON for flexibility)
  -- Phase 1: {hp, maxHp, energy, maxEnergy} - Phase 3 will add hunger
  stats TEXT NOT NULL DEFAULT '{}',
  
  -- Position on map
  x INTEGER NOT NULL DEFAULT 0,
  y INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Index for efficient position queries
CREATE INDEX IF NOT EXISTS idx_agents_position ON agents(x, y);

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_agents_role ON agents(role);
