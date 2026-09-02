/**
 * Item Entity (Domain Layer)
 * Phase 1 (v0.2): Represents items that can be collected, crafted, and used
 */

import { Entity, UUID, Timestamp } from '@shared/types';

/**
 * Item Type
 * Phase 1: Starting with 5 minimal types
 */
export type ItemType = 'material' | 'tool' | 'food' | 'water' | 'consumable';

/**
 * Item Properties (flexible JSON structure)
 * Different item types have different properties
 */
export interface ItemProperties {
  durability?: number; // For tools (max uses)
  nutrition?: number; // For food (restores hunger)
  hydration?: number; // For water (restores thirst)
  description?: string;
  [key: string]: any; // Allow additional properties
}

/**
 * Item Entity
 * Defines what items exist in the game
 */
export interface Item extends Entity {
  id: UUID;
  name: string;
  type: ItemType;
  stackable: boolean; // Can multiple items stack in one slot?
  maxStack: number; // Maximum stack size (e.g., 99)
  weight: number; // Weight in kg
  properties: ItemProperties;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Create Item Input
 */
export interface CreateItemInput {
  name: string;
  type: ItemType;
  stackable?: boolean;
  maxStack?: number;
  weight?: number;
  properties?: ItemProperties;
}

/**
 * Update Item Input
 */
export interface UpdateItemInput {
  name?: string;
  type?: ItemType;
  stackable?: boolean;
  maxStack?: number;
  weight?: number;
  properties?: ItemProperties;
}
