-- Migration 002: Create items table
-- Phase 1 (v0.2): Minimal data - Start with 5 items

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL, -- 'material', 'tool', 'food', etc.
  stackable INTEGER NOT NULL DEFAULT 1, -- Boolean: 1 = stackable, 0 = not stackable
  max_stack INTEGER NOT NULL DEFAULT 99,
  weight REAL NOT NULL DEFAULT 1.0, -- Weight in kg
  
  -- Item properties (JSON for flexibility)
  -- Different items have different properties (durability, nutrition, etc.)
  properties TEXT NOT NULL DEFAULT '{}',
  
  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Index for type-based queries
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
