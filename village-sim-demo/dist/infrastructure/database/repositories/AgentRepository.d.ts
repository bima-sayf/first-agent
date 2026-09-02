/**
 * Agent Repository (Infrastructure Layer)
 * Phase 1 (v0.2): Implements Repository pattern for Agent entities
 * Handles all database operations for agents
 */
import { DatabaseConnection } from '@infrastructure/database/connection';
import { Agent, CreateAgentInput, UpdateAgentInput, AgentRole } from '@domain/entities';
/**
 * Agent Repository
 * Provides CRUD operations for Agent entities
 */
export declare class AgentRepository {
    private connection;
    constructor(connection: DatabaseConnection);
    /**
     * Create a new agent
     */
    create(input: CreateAgentInput): Agent;
    /**
     * Find agent by ID
     */
    findById(id: string): Agent | null;
    /**
     * Find all agents
     */
    findAll(): Agent[];
    /**
     * Find agents by role
     */
    findByRole(role: AgentRole): Agent[];
    /**
     * Find agents at specific position
     */
    findByPosition(x: number, y: number): Agent[];
    /**
     * Update an agent
     */
    update(id: string, input: UpdateAgentInput): Agent | null;
    /**
     * Delete an agent
     */
    delete(id: string): boolean;
    /**
     * Count total agents
     */
    count(): number;
    /**
     * Map database row to Agent entity
     */
    private mapRowToAgent;
}
//# sourceMappingURL=AgentRepository.d.ts.map