/**
 * Shared TypeScript types and interfaces
 * Used across all layers
 */
export type UUID = string;
export type Timestamp = number;
export type Result<T, E = Error> = {
    success: true;
    data: T;
} | {
    success: false;
    error: E;
};
export interface Entity {
    id: UUID;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
//# sourceMappingURL=index.d.ts.map