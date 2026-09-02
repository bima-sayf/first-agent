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
    str: number;
    end: number;
    agi: number;
}
/**
 * Agent Stats (Phase 1: Basic stats)
 * Phase 3 will add: hunger
 */
export interface AgentStats {
    hp: number;
    maxHp: number;
    energy: number;
    maxEnergy: number;
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
export type AgentRole = 'farmer' | 'baker' | 'healer' | 'blacksmith' | 'merchant' | 'fisher' | 'innkeeper' | 'carpenter' | 'teacher';
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
export declare function calculateMaxHp(endurance: number): number;
/**
 * Calculate max Energy
 * Formula: maxEnergy = 100 (constant for Phase 1)
 */
export declare function calculateMaxEnergy(): number;
/**
 * Create initial stats from attributes
 */
export declare function createInitialStats(attributes: AgentAttributes): AgentStats;
//# sourceMappingURL=Agent.d.ts.map