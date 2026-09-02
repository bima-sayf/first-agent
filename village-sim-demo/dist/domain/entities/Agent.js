"use strict";
/**
 * Agent Entity (Domain Layer)
 * Phase 1 (v0.2): Represents a villager in the simulation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateMaxHp = calculateMaxHp;
exports.calculateMaxEnergy = calculateMaxEnergy;
exports.createInitialStats = createInitialStats;
/**
 * Calculate max HP from endurance
 * Formula: maxHP = END * 10
 */
function calculateMaxHp(endurance) {
    return endurance * 10;
}
/**
 * Calculate max Energy
 * Formula: maxEnergy = 100 (constant for Phase 1)
 */
function calculateMaxEnergy() {
    return 100;
}
/**
 * Create initial stats from attributes
 */
function createInitialStats(attributes) {
    const maxHp = calculateMaxHp(attributes.end);
    const maxEnergy = calculateMaxEnergy();
    return {
        hp: maxHp, // Start at full HP
        maxHp,
        energy: maxEnergy, // Start at full energy
        maxEnergy,
    };
}
//# sourceMappingURL=Agent.js.map