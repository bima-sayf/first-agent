/**
 * Agent Entity (Domain Layer)
 * Phase 1 (v0.2): Represents a villager in the simulation
 */

import { Entity, UUID, Timestamp } from '@shared/types';

/**
 * Agent Attributes (Phase 1: 3 attributes)
 * Phase 2 will add: int, wis, cha
 */
export interface AgentAttributes {
  str: number; // Strength (affects carrying capacity, melee damage)
  end: number; // Endurance (affects max HP, stamina)
  agi: number; // Agility (affects movement speed, dodge chance)
}

/**
 * Agent Stats (Phase 1: Basic stats)
 * Phase 3 will add: hunger
 */
export interface AgentStats {
  hp: number; // Current health points
  maxHp: number; // Maximum health points (derived from END)
  energy: number; // Current energy
  maxEnergy: number; // Maximum energy
}

/**
 * Agent Position
 */
export interface AgentPosition {
  x: number;
  y: number;
}

/**
 * Agent Role (职业/角色)
 * Phase 1: Starting with the 9 exiles from the story
 */
export type AgentRole =
  | 'farmer'
  | 'baker'
  | 'healer'
  | 'blacksmith'
  | 'merchant'
  | 'fisher'
  | 'innkeeper'
  | 'carpenter'
  | 'teacher';

/**
 * Agent Entity
 * Represents a villager/character in the simulation
 */
export interface Agent extends Entity {
  id: UUID;
  name: string;
  role: AgentRole;
  level: number;
  xp: number;
  attributes: AgentAttributes;
  stats: AgentStats;
  position: AgentPosition;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Create Agent Input (for creating new agents)
 */
export interface CreateAgentInput {
  name: string;
  role: AgentRole;
  attributes: AgentAttributes;
  position?: AgentPosition;
}

/**
 * Update Agent Input (for updating existing agents)
 */
export interface UpdateAgentInput {
  name?: string;
  role?: AgentRole;
  level?: number;
  xp?: number;
  attributes?: AgentAttributes;
  stats?: AgentStats;
  position?: AgentPosition;
}

/**
 * Calculate max HP from endurance
 * Formula: maxHP = END * 10
 */
export function calculateMaxHp(endurance: number): number {
  return endurance * 10;
}

/**
 * Calculate max Energy
 * Formula: maxEnergy = 100 (constant for Phase 1)
 */
export function calculateMaxEnergy(): number {
  return 100;
}

/**
 * Create initial stats from attributes
 */
export function createInitialStats(attributes: AgentAttributes): AgentStats {
  const maxHp = calculateMaxHp(attributes.end);
  const maxEnergy = calculateMaxEnergy();

  return {
    hp: maxHp, // Start at full HP
    maxHp,
    energy: maxEnergy, // Start at full energy
    maxEnergy,
  };
}
