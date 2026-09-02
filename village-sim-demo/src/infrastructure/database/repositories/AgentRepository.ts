/**
 * Agent Repository (Infrastructure Layer)
 * Phase 1 (v0.2): Implements Repository pattern for Agent entities
 * Handles all database operations for agents
 */

import { DatabaseConnection } from '@infrastructure/database/connection';
import {
  Agent,
  CreateAgentInput,
  UpdateAgentInput,
  AgentRole,
  createInitialStats,
} from '@domain/entities';
import { randomUUID } from 'crypto';

/**
 * Agent Repository
 * Provides CRUD operations for Agent entities
 */
export class AgentRepository {
  private connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  /**
   * Create a new agent
   */
  create(input: CreateAgentInput): Agent {
    const db = this.connection.getConnection();
    const now = Date.now();

    // Generate unique ID
    const id = randomUUID();

    // Calculate initial stats from attributes
    const stats = createInitialStats(input.attributes);

    // Default position if not provided
    const position = input.position || { x: 0, y: 0 };

    // Prepare data for database
    const agent: Agent = {
      id,
      name: input.name,
      role: input.role,
      level: 1,
      xp: 0,
      attributes: input.attributes,
      stats,
      position,
      createdAt: now,
      updatedAt: now,
    };

    // Insert into database
    const stmt = db.prepare(`
      INSERT INTO agents (
        id, name, role, level, xp, attributes, stats, x, y, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      agent.id,
      agent.name,
      agent.role,
      agent.level,
      agent.xp,
      JSON.stringify(agent.attributes),
      JSON.stringify(agent.stats),
      agent.position.x,
      agent.position.y,
      agent.createdAt,
      agent.updatedAt
    );

    return agent;
  }

  /**
   * Find agent by ID
   */
  findById(id: string): Agent | null {
    const db = this.connection.getConnection();

    const stmt = db.prepare(`
      SELECT * FROM agents WHERE id = ?
    `);

    const row = stmt.get(id) as any;

    return row ? this.mapRowToAgent(row) : null;
  }

  /**
   * Find all agents
   */
  findAll(): Agent[] {
    const db = this.connection.getConnection();

    const stmt = db.prepare(`
      SELECT * FROM agents ORDER BY created_at ASC
    `);

    const rows = stmt.all() as any[];

    return rows.map(row => this.mapRowToAgent(row));
  }

  /**
   * Find agents by role
   */
  findByRole(role: AgentRole): Agent[] {
    const db = this.connection.getConnection();

    const stmt = db.prepare(`
      SELECT * FROM agents WHERE role = ? ORDER BY created_at ASC
    `);

    const rows = stmt.all(role) as any[];

    return rows.map(row => this.mapRowToAgent(row));
  }

  /**
   * Find agents at specific position
   */
  findByPosition(x: number, y: number): Agent[] {
    const db = this.connection.getConnection();

    const stmt = db.prepare(`
      SELECT * FROM agents WHERE x = ? AND y = ? ORDER BY created_at ASC
    `);

    const rows = stmt.all(x, y) as any[];

    return rows.map(row => this.mapRowToAgent(row));
  }

  /**
   * Update an agent
   */
  update(id: string, input: UpdateAgentInput): Agent | null {
    const db = this.connection.getConnection();

    // First, check if agent exists
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    // Merge updates with existing data
    const updated: Agent = {
      ...existing,
      ...input,
      id, // Ensure ID doesn't change
      updatedAt: Date.now(),
    };

    // Handle position update (separate x, y fields)
    const x = input.position?.x ?? existing.position.x;
    const y = input.position?.y ?? existing.position.y;
    updated.position = { x, y };

    // Update in database
    const stmt = db.prepare(`
      UPDATE agents
      SET name = ?, role = ?, level = ?, xp = ?, attributes = ?, stats = ?, x = ?, y = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.name,
      updated.role,
      updated.level,
      updated.xp,
      JSON.stringify(updated.attributes),
      JSON.stringify(updated.stats),
      updated.position.x,
      updated.position.y,
      updated.updatedAt,
      id
    );

    return updated;
  }

  /**
   * Delete an agent
   */
  delete(id: string): boolean {
    const db = this.connection.getConnection();

    const stmt = db.prepare(`
      DELETE FROM agents WHERE id = ?
    `);

    const result = stmt.run(id);

    return result.changes > 0;
  }

  /**
   * Count total agents
   */
  count(): number {
    const db = this.connection.getConnection();

    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM agents
    `);

    const result = stmt.get() as { count: number };

    return result.count;
  }

  /**
   * Map database row to Agent entity
   */
  private mapRowToAgent(row: any): Agent {
    return {
      id: row.id,
      name: row.name,
      role: row.role,
      level: row.level,
      xp: row.xp,
      attributes: JSON.parse(row.attributes),
      stats: JSON.parse(row.stats),
      position: {
        x: row.x,
        y: row.y,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
