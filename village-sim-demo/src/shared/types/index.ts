/**
 * Shared TypeScript types and interfaces
 * Used across all layers
 */

// Common types
export type UUID = string;
export type Timestamp = number;

// Result type for operations that can fail
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

// Basic entity interface
export interface Entity {
  id: UUID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
