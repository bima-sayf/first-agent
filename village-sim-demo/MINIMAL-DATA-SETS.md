# Minimal Viable Data Sets per Phase

**Purpose**: Define small, working subsets of data for each phase to enable iterative testing  
**Principle**: Start small, validate, then expand  
**Last Updated**: 2026-09-02

---

## 🎯 Core Philosophy

Each phase should work with **minimal data** that:
- ✅ Demonstrates the feature completely
- ✅ Is easy to test and validate
- ✅ Can be expanded without breaking existing code
- ✅ Allows next phase to build on it

**Rule**: Never implement full data set in first pass. Start with 3-5 examples, prove it works, then expand.

---

## 📋 Phase-by-Phase Minimal Data Sets

### Phase 1: Database & Core Data Models (v0.2)

**Initial Schema** (Minimal):
```sql
-- Agents: Just 3 test villagers to start
agents (id, name, role, level, xp, attributes_json, stats_json, x, y)
  - Initial: 3 agents (Elin, Bram, Oskar)
  - Add 6 more in Phase 2

-- Items: Only 5 essential items
items (id, name, type, stackable, max_stack, weight)
  - wood, stone, food, water, basic_tool
  - Expand to 20+ items in Phase 3

-- Inventory: Basic structure
inventory (id, agent_id, item_id, quantity)
  - Test with 2-3 items per agent
  
-- World tiles: Small 5×5 grid
world_tiles (x, y, terrain_type, resources_json)
  - Start: 5×5 = 25 tiles (grass only)
  - Expand to 8×9 in Phase 5
```

**Validation**:
- ✅ Can save/load 3 agents
- ✅ Can query items
- ✅ Inventory CRUD works
- ✅ World state persists

---

### Phase 2: Attributes & Stats (v0.3)

**Minimal Attributes**:
```javascript
// Start with just 3 attributes (not 6!)
attributes: {
  str: 12,    // Strength
  end: 14,    // Endurance
  agi: 10     // Agility
}
// Add INT, WIS, CHA in later iteration

// Minimal stats
stats: {
  hp: 100,
  maxHp: 140,  // Calculated from END
  energy: 80,
  maxEnergy: 100
}
// Add hunger in Phase 3
```

**Initial Data**:
- 3 villagers with 3 attributes each
- 2 derived stats (HP, Energy)
- Simple formulas (maxHP = END × 10)

**Validation**:
- ✅ Attributes stored in DB
- ✅ Derived stats calculate correctly
- ✅ UI displays 3 attributes + 2 stats

---

### Phase 3: Resource Management & Crafting (v0.4)

**Minimal Items** (Start with 10, not 50+):
```javascript
// Raw materials (3)
- wood
- stone  
- clay

// Tools (2)
- stone_axe (durability: 20)
- stone_pickaxe (durability: 15)

// Food (3)
- berries
- raw_meat
- cooked_meat

// Processed (2)
- plank (wood → plank)
- brick (clay → brick, requires fire)
```

**Minimal Recipes** (5 recipes to start):
```javascript
1. wood → 4 planks (requires axe, 3 ticks)
2. 2 wood + 1 stone → stone_axe (5 ticks)
3. 5 clay → 4 brick (requires fire, 10 ticks)
4. raw_meat → cooked_meat (requires fire, 2 ticks)
5. 4 planks → simple_furniture (workshop, 15 ticks)
```

**Validation**:
- ✅ Can gather 3 resources
- ✅ Can craft 5 different recipes
- ✅ Tools degrade with use
- ✅ Food reduces hunger

**Expand Later**: Add 40+ more items/recipes in Phase 6

---

### Phase 4: Skills & Leveling (v0.5)

**Minimal Skills** (Start with 3, not 12):
```javascript
skills: {
  woodcutting: 1,  // Affects wood gathering
  crafting: 1,     // Affects item crafting
  building: 1      // Affects structure building
}
// Add combat, farming, fishing, etc. in Phase 10-11
```

**XP System** (Simple):
- General XP: Levels up character (adds attribute points)
- Skill XP: Levels up specific skill (improves outcomes)
- Level cap: 5 for initial testing (not 10)

**Validation**:
- ✅ XP gained from actions
- ✅ Level up works (1 → 2 → 3)
- ✅ Skills improve outcomes (level 3 woodcutting = +30% speed)
- ✅ UI shows XP bars

---

### Phase 5: Progressive Map Building (v0.6)

**Minimal Structures** (Start with 4, not 20+):
```javascript
// Essential early buildings only
1. Tent (10 wood, 5 ticks)
   - Provides: Rest spot
   
2. Campfire (5 wood + 3 stone, 3 ticks)
   - Provides: Cooking, heat
   
3. Storage Shed (20 wood + 10 stone, 30 ticks)
   - Provides: Village storage (50 slots)
   
4. Workshop (40 wood + 20 stone, 50 ticks)
   - Provides: Crafting station
```

**Terrain Types** (Start with 2):
- Grass (default, easy to build on)
- Water (can't build without bridge)

**Validation**:
- ✅ Can place blueprint
- ✅ Can build structure with materials
- ✅ Structure provides function when complete
- ✅ Multiple villagers can collaborate

**Add Later**: Houses, forge, farm, tavern, etc. (16 more structures)

---

### Phase 6: Real-World Physics Crafting (v0.7)

**Minimal Crafting Chains** (2-3 chains):

**Chain 1: Wood → Furniture**
```
1. Chop tree → wood (axe optional)
2. Wood → planks (saw optional, faster)
3. Planks + nails → furniture (workshop)
```

**Chain 2: Clay → Bricks**
```
1. Dig clay (shovel optional)
2. Shape clay → clay_brick (hands, 1 tick)
3. Fire clay_brick → brick (oven/kiln, heat required, 10 ticks)
```

**Chain 3: Ore → Tool** (Phase 11, skip for now)

**Heat Sources** (Start with 1):
- Campfire (low heat, cooking only)
- Add kiln, forge in later iteration

**Validation**:
- ✅ Multi-step crafting works
- ✅ Tool dependency validated
- ✅ Heat source requirement enforced
- ✅ Quality system (skill affects output)

---

### Phase 7: Environment Systems (v0.8)

**Minimal Animals** (3 types):
```javascript
// Passive (2)
- deer: HP 30, flee distance 3, yields meat + hide
- rabbit: HP 10, flee distance 4, yields small_meat

// Aggressive (1)
- wolf: HP 50, ATK 15, pack behavior (2-3)
```

**Trees** (1 type):
- Oak: Growth stages (sapling → young → mature)
- Harvestable when mature (3-5 wood)

**NPCs** (1 type):
- Traveling Merchant (arrives every 50 ticks, sells 5 items)

**Events** (2 types):
- Animal migration (deer herd appears)
- Predator attack (wolves attack village)

**Validation**:
- ✅ Animals spawn and behave
- ✅ Passive animals flee, aggressive attack
- ✅ Trees grow and are harvestable
- ✅ Merchant arrives, trades
- ✅ Events trigger appropriately

**Add Later**: Bears, boars, sheep, chickens, more NPCs, more events

---

### Phase 8: Visual Upgrade (v0.9)

**Minimal Sprites** (Start with basics):
- 3 villager sprites (reuse for similar roles)
- 3 structure sprites (tent, campfire, shed)
- 2 terrain tiles (grass, water)
- 2 animal sprites (deer, wolf)
- 1 tree sprite (mature oak)

**Animations** (Minimal):
- Walking (4 directions)
- Idle (1 frame)
- Working (1 simple animation)

**Validation**:
- ✅ Sprites render instead of circles
- ✅ Movement animation works
- ✅ Terrain tiles display correctly

**Add Later**: 6 more villager variants, 17+ structure sprites, full tilesets

---

### Phase 9: Advanced Observation UI (v1.0)

**Minimal Inspectors** (3 essential):
1. **Villager Inspector**: 3 tabs (Attributes, Inventory, Stats)
2. **Structure Inspector**: 2 tabs (Info, Storage)
3. **Resource Dashboard**: 1 panel (Total counts)

**Daily Summary** (Basic):
- Overview: Text summary only
- Villagers: Simple grid (no detail view yet)
- Map: Before/After images (no comparison tools)

**Validation**:
- ✅ Click villager → see inspector
- ✅ Click structure → see info
- ✅ Daily summary appears at day end
- ✅ Can resume simulation

**Add Later**: Relationship graph, statistics, historical browser enhancements

---

### Phase 10: Relationships (v1.1)

**Minimal Relationship Tracking**:
- Track affinity between 3 villagers (not all 9×9 = 81 pairs)
- 2 relationship types: Friend (>60), Neutral (40-60)
- 3 interaction types: Talk, Work Together, Trade

**Validation**:
- ✅ Affinity changes with interactions
- ✅ Friends work together more efficiently
- ✅ UI shows relationship status

**Add Later**: Rivals, enemies, complex social dynamics, mediation

---

### Phase 11: Combat & Dungeons (v1.2)

**Minimal Combat**:
- 2 monster types: Goblin (easy), Orc (medium)
- 2 party sizes: Solo (test), 2 villagers (basic party)
- 1 dungeon: 3 rooms, 2 monsters, 1 treasure

**Combat Stats** (Simple):
- ATK = STR + weapon_damage
- DEF = END + armor_defense
- HP from existing stats

**Validation**:
- ✅ Form party (2 villagers)
- ✅ Enter dungeon
- ✅ Fight 2 monsters
- ✅ Win/lose outcomes work
- ✅ Loot distribution

**Add Later**: 8+ monster types, complex dungeons, special abilities, boss fights

---

### Phase 12: Time, Weather & Seasons (v1.3)

**Minimal Time System**:
- 24-hour day (simplified: 12 ticks = 1 hour)
- 2 day phases: Day (work), Night (sleep)
- 1 season: Spring (normal, no penalties)

**Weather** (2 types):
- Sunny (normal)
- Rainy (-20% outdoor work)

**Validation**:
- ✅ Day/night cycle works
- ✅ Villagers sleep at night
- ✅ Weather affects actions
- ✅ Time displays correctly

**Add Later**: 4 seasons, more weather types, temperature, lighting

---

### Phase 13: Polish & Balance (v1.4)

**Minimal Testing**:
- Run 10-day simulation (not 100+)
- Test with 5 villagers (not all 9)
- Balance 10 recipes (not all 50+)

**Validation**:
- ✅ 10 days complete without crashes
- ✅ Villagers survive and progress
- ✅ Performance acceptable (60 FPS)
- ✅ Major bugs fixed

---

### Phase 14: Story & Daily Summary (v1.5)

**Minimal Story**:
- Opening text (2 paragraphs)
- 3 villager backstories (not all 9)
- 5 narrative templates (for variety)

**Daily Summary** (Essential):
- 3 tabs: Overview, Villagers, Map
- Basic narrative (template-based)
- Simple villager cards (no details yet)

**Validation**:
- ✅ Story shows on first load
- ✅ Day 1 summary appears
- ✅ Can access Day 1 summary later
- ✅ Narrative makes sense

---

## 📊 Expansion Strategy

### How to Expand Each Phase

**Pattern**:
1. **Implement minimal** (3-5 examples)
2. **Test thoroughly** (unit + integration)
3. **Validate UX** (does it work? is it fun?)
4. **Expand gradually** (add 5 more, test again)
5. **Repeat** until target reached

**Example: Items (Phase 3)**

```
Iteration 1: 10 items → Test → ✅ Works
Iteration 2: +10 items (20 total) → Test → ✅ Works
Iteration 3: +15 items (35 total) → Test → ✅ Works
Iteration 4: +15 items (50 total) → Test → ✅ Done
```

---

## ✅ Validation Checklist per Phase

Before moving to next phase:

- [ ] Minimal data set defined and documented
- [ ] Tests written for minimal cases
- [ ] Feature works with minimal data
- [ ] UI displays minimal data correctly
- [ ] Performance acceptable with minimal data
- [ ] Can easily add more data without code changes
- [ ] Database schema supports expansion
- [ ] No hardcoded limits (use constants/config)

---

## 🎯 Key Numbers Summary

| Phase | Feature | Start With | Expand To | Final |
|-------|---------|-----------|-----------|-------|
| 1 | Agents | 3 | +6 | 9 |
| 1 | World Grid | 5×5 | 8×9 | 8×9 |
| 2 | Attributes | 3 | +3 | 6 |
| 3 | Items | 10 | +40 | 50+ |
| 3 | Recipes | 5 | +45 | 50+ |
| 4 | Skills | 3 | +9 | 12 |
| 5 | Structures | 4 | +16 | 20 |
| 6 | Crafting Chains | 2 | +8 | 10+ |
| 7 | Animals | 3 | +7 | 10 |
| 7 | NPCs | 1 | +3 | 4+ |
| 8 | Sprites | 12 | +50 | 60+ |
| 11 | Monsters | 2 | +8 | 10+ |
| 12 | Weather | 2 | +4 | 6 |
| 14 | Story Templates | 5 | +15 | 20+ |

---

## 🔧 Implementation Tips

### 1. Use Configuration Files

```javascript
// config/items.config.js
export const ITEMS_CONFIG = {
  phase3_minimal: ['wood', 'stone', 'clay', ...],
  phase3_expanded: ['wood', 'stone', 'clay', 'iron_ore', ...],
  phase6_complete: [/* all 50+ items */]
};

// Switch between configs easily
const activeItems = ITEMS_CONFIG.phase3_minimal;
```

### 2. Feature Flags

```javascript
// config/features.config.js
export const FEATURES = {
  enableAllItems: false,        // Phase 3: false, Phase 6: true
  enableAllSkills: false,       // Phase 4: false, Phase 10: true
  enableAdvancedCombat: false,  // Phase 11: false, Phase 12: true
};
```

### 3. Seed Data Management

```javascript
// database/seeds/
- 01-minimal-agents.seed.ts      // 3 agents
- 02-expanded-agents.seed.ts     // +6 agents
- 03-minimal-items.seed.ts       // 10 items
- 04-expanded-items.seed.ts      // +40 items

// Run based on phase
npm run seed:phase3-minimal
npm run seed:phase6-complete
```

### 4. Database Design for Expansion

```sql
-- Good: Supports any number of items
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  name TEXT,
  properties JSON  -- Flexible, can add new properties
);

-- Bad: Hardcoded columns, hard to expand
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  name TEXT,
  is_food BOOLEAN,
  is_tool BOOLEAN,
  is_weapon BOOLEAN
  -- Adding new item type = schema change!
);
```

---

## 📝 Phase Checklist Template

Use this when starting each phase:

```markdown
## Phase X Checklist

### Planning
- [ ] Minimal data set defined (3-5 examples)
- [ ] Data schema supports expansion
- [ ] Configuration approach decided

### Implementation
- [ ] Tests written for minimal cases
- [ ] Feature implemented with minimal data
- [ ] Manual testing with minimal data ✅

### Validation
- [ ] Unit tests pass (80%+ coverage)
- [ ] Integration tests pass
- [ ] UI works with minimal data
- [ ] Performance acceptable

### Expansion (Optional in same phase)
- [ ] Added more data (next iteration)
- [ ] Tests updated
- [ ] Retested with expanded data

### Ready for Next Phase
- [ ] Documentation updated
- [ ] BACKLOGS.md task checked off
- [ ] Git committed with proper message
- [ ] Team reviewed (if applicable)
```

---

## 🎯 Success Criteria

**Good Minimal Data Set**:
- ✅ Demonstrates feature completely
- ✅ Simple enough to test quickly
- ✅ Complex enough to catch edge cases
- ✅ Expandable without refactoring

**Bad Minimal Data Set**:
- ❌ Too simple (doesn't test edge cases)
- ❌ Too complex (takes long to implement)
- ❌ Hardcoded (can't expand easily)
- ❌ Single example (doesn't test variety)

---

**Golden Rule**: If you can't fully test a feature with 3-5 examples, your feature is too complex. Break it down further.

---

**Status**: ✅ Ready for iterative, test-driven development  
**Principle**: Start small, validate, expand  
**Result**: Each phase delivers working, testable feature with room to grow
