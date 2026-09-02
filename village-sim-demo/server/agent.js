const { locationByName } = require("./world");

const MOVE_STEP = 0.5; // grid cells per tick
const ACTION_DURATION_TICKS = { work: 3, talk: 2, rest: 3 };

class Agent {
  constructor(def) {
    Object.assign(this, def);
    this.x = def.x;
    this.y = def.y;
    this.currentLocation = def.home;
    this.status = "idle"; // idle | moving | working | talking | resting
    this.actionTicksLeft = 0;
    this.pendingAction = null; // {action, target, thought}
    this.mood = "content";
    this.memory = [`${this.name} wakes up in the village of nine, ready for a new day.`];
  }

  summaryForClient() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      emoji: this.emoji,
      color: this.color,
      x: this.x,
      y: this.y,
      status: this.status,
      currentLocation: this.currentLocation,
      mood: this.mood,
      lastThought: this.memory[this.memory.length - 1]
    };
  }

  addMemory(text) {
    this.memory.push(text);
    if (this.memory.length > 40) this.memory.shift();
  }

  distanceTo(other) {
    return Math.hypot(this.x - other.x, this.y - other.y);
  }

  // Advance one simulation tick. `others` is the full agent list (for talk targets).
  tick(others) {
    if (this.status === "moving") {
      this._stepToward(this._targetCoords);
      return;
    }
    if (this.actionTicksLeft > 0) {
      this.actionTicksLeft -= 1;
      if (this.actionTicksLeft === 0) {
        this.status = "idle";
      }
      return;
    }
    // idle with no plan yet -> nothing to do this tick, the server will
    // call decide() separately and hand back a plan via applyDecision().
  }

  applyDecision(decision, others) {
    this.mood = decision.action === "talk" ? "sociable" : this.mood;
    const targetAgent = others.find(
      (o) => o.id !== this.id && o.name.toLowerCase() === String(decision.target).toLowerCase()
    );

    if (decision.action === "talk" && targetAgent) {
      this._targetCoords = { x: targetAgent.x, y: targetAgent.y };
      this.status = "moving";
      this.pendingAction = { ...decision, resolvedDuration: ACTION_DURATION_TICKS.talk };
      return;
    }

    const loc = locationByName(decision.target);
    if (loc) {
      this._targetCoords = { x: loc.x, y: loc.y };
      this.status = "moving";
      this.pendingAction = {
        ...decision,
        resolvedDuration: ACTION_DURATION_TICKS[decision.action] || 2,
        locationName: loc.name
      };
      return;
    }

    // Unrecognized target — just log the thought and stay put.
    this.addMemory(decision.thought);
    this.status = "idle";
  }

  _stepToward(target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= MOVE_STEP) {
      this.x = target.x;
      this.y = target.y;
      this._arrive();
      return;
    }
    this.x += (dx / dist) * MOVE_STEP;
    this.y += (dy / dist) * MOVE_STEP;
  }

  _arrive() {
    const { action, thought, locationName, resolvedDuration } = this.pendingAction || {};
    this.currentLocation = locationName || this.currentLocation;
    this.status = action === "move" ? "idle" : action || "idle";
    this.actionTicksLeft = action === "move" ? 0 : resolvedDuration || 0;
    if (thought) this.addMemory(thought);
    this.pendingAction = null;
  }

  isFree() {
    return this.status === "idle" && this.actionTicksLeft === 0 && !this.pendingAction;
  }
}

module.exports = { Agent };
