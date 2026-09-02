-- Migration 003: Create inventory table
-- Phase 1 (v0.2): Links agents to items they carry

CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  
  -- For non-stackable items with durability
  durability REAL, -- NULL if item doesn't have durability
  
  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  -- Foreign keys
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  
  -- Ensure unique agent-item combinations for stackable items
  UNIQUE(agent_id, item_id, durability)
);

-- Index for efficient agent inventory queries
CREATE INDEX IF NOT EXISTS idx_inventory_agent ON inventory(agent_id);

-- Index for item lookup
CREATE INDEX IF NOT EXISTS idx_inventory_item ON inventory(item_id);
