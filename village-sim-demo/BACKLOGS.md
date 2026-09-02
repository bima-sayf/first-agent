# Village Simulation RPG - Development Backlog

**Project**: Village Simulation → Complete Civilization Builder RPG  
**Current Version**: 0.1.0  
**Target Version**: 1.0.0  
**Strategy**: Step-by-step phased development with progressive world building

---

## 🎯 Development Phases Overview

| Phase | Version | Focus | Complexity | Est. Duration |
|-------|---------|-------|------------|---------------|
| **Phase 1** | v0.2 | Database & Core Data Models | High | 2-3 weeks |
| **Phase 2** | v0.3 | Attributes & Stats System | Low | 1-2 weeks |
| **Phase 3** | v0.4 | Resource Management & Crafting Foundation | High | 3-4 weeks |
| **Phase 4** | v0.5 | Skills & Leveling System | Medium | 2-3 weeks |
| **Phase 5** | v0.6 | Progressive Map Building System | High | 4-5 weeks |
| **Phase 6** | v0.7 | Real-World Physics Crafting | High | 3-4 weeks |
| **Phase 7** | v0.8 | Environment Systems (Non-LLM) | High | 3-4 weeks |
| **Phase 8** | v0.9 | Visual Upgrade (Sprites & Tilesets) | Medium | 2-3 weeks |
| **Phase 9** | v1.0 | Advanced Observation UI | High | 3-4 weeks |
| **Phase 10** | v1.1 | Relationships & Collaboration | High | 3-4 weeks |
| **Phase 11** | v1.2 | Combat & Dungeons | High | 3-4 weeks |
| **Phase 12** | v1.3 | Time, Weather & Seasons | High | 3-4 weeks |
| **Phase 13** | v1.4 | Polish, Balance & Emergent Gameplay | High | 2-4 weeks |

**Total Estimated**: 35-50 weeks (8-12 months)

**Core New Systems**:
- 🏗️ **Progressive World Building**: Start on empty land, build everything from scratch
- ⚙️ **Real-World Physics Crafting**: Clay + oven → bricks, multi-step dependencies
- 🦌 **Living Environment**: Animals, trees, NPCs, events (rule-based, not LLM)
- 💾 **Database Everything**: SQLite/PostgreSQL for full persistence
- 👁️ **Advanced Observation UI**: Inspect everything (inventory, skills, relationships, map progress)
- 🎨 **Progressive Visuals**: World evolves from wilderness to city

---

## 📋 Phase 1: Database & Core Data Models (v0.2)

**Goal**: Establish robust database foundation for persistent, queryable world state

### Tasks

- [ ] **UX-001**: Choose and setup database system
  - Evaluate: SQLite (simple, file-based) vs PostgreSQL (robust, scalable)
  - **Decision**: Start with SQLite for ease, design for PostgreSQL migration
  - Install database dependencies (better-sqlite3 or pg)
  - Create database connection module with pooling
  - Setup error handling and logging

- [ ] **UX-002**: Design comprehensive database schema
  - **agents** table:
    - id (PK), name, role, level, xp, gold
    - attributes JSON: {str, end, agi, int, wis, cha}
    - stats JSON: {hp, maxHp, energy, maxEnergy, hunger}
    - position: x, y, currentLocation
    - mood, status, actionTicksLeft
    - created_at, updated_at
  - **items** table:
    - id (PK), name, type (material/tool/food/equipment)
    - properties JSON: {weight, durability, damage, defense, satiation}
    - stackable (boolean), max_stack (int)
    - crafting_info JSON: {requires_tools, requires_location}
  - **inventory** table:
    - id (PK), agent_id (FK), item_id (FK)
    - quantity, durability (for non-stackables)
    - slot, equipped (boolean)
  - **resources** table:
    - id (PK), name, quantity
    - location_type (village_storage/world)
    - location_id (nullable, for world resources)
  - **skills** table:
    - id (PK), agent_id (FK), skill_name
    - level, xp, last_used
  - **world_tiles** table:
    - x (PK), y (PK), terrain_type
    - has_structure (boolean), structure_id (FK nullable)
    - resources JSON: {trees, clay_deposit, stone_deposit}
    - discovered (boolean), last_updated
  - **structures** table:
    - id (PK), name, type (house/workshop/farm/etc)
    - x, y, width, height
    - build_progress (0-100), level (upgrade level)
    - hp, max_hp, owner_id (FK nullable)
    - storage_capacity, current_storage JSON
    - built_at, last_damaged
  - **relationships** table:
    - id (PK), agent1_id (FK), agent2_id (FK)
    - affinity (0-100), interaction_count
    - relationship_type (stranger/friend/rival)
    - last_interaction, notes JSON
  - **environment_entities** table:
    - id (PK), type (animal/tree/npc)
    - subtype (deer/wolf/oak/merchant)
    - x, y, state JSON: {hp, age, inventory}
    - behavior (passive/aggressive/neutral)
    - spawn_time, despawn_time (nullable)
  - **crafting_recipes** table:
    - id (PK), output_item_id (FK), output_quantity
    - inputs JSON: [{item_id, quantity}]
    - requirements JSON: {tools, location, skill_level, heat_source}
    - duration_ticks, failure_chance_base
  - **blueprints** table:
    - id (PK), structure_type, x, y
    - planned_by (agent_id FK), status (planned/in_progress/complete/cancelled)
    - materials_required JSON, materials_delivered JSON
    - estimated_ticks, workers JSON: [agent_ids]
  - **events_log** table:
    - id (PK), timestamp, event_type
    - actor_id (FK nullable), target_id (nullable)
    - details JSON, visible_to_ui (boolean)
  - **world_state** table:
    - id (PK), current_tick, time_of_day
    - season, weather, village_name
    - founded_at, population_count
    - total_resources JSON, achievements JSON

- [ ] **UX-003**: Create database migration system
  - Build migration framework (up/down migrations)
  - Version tracking in db (schema_version table)
  - Initial migration: create all tables
  - Seed migration: populate items and crafting_recipes
  - Document migration workflow

- [ ] **UX-004**: Implement ORM / Data Access Layer
  - Create base Model class with CRUD methods
  - Implement models: Agent, Item, Inventory, WorldTile, Structure, etc.
  - Add query builders for complex joins
  - Add validation layer (schema validation, foreign keys)
  - Transaction support for multi-table operations
  - Write comprehensive unit tests

- [ ] **UX-005**: Implement state serialization/deserialization
  - Save current in-memory simulation state to database
  - Load complete state from database on startup
  - Handle partial state (missing tables, corrupted data)
  - Verify state integrity after load
  - Create state snapshot system (save points)

- [ ] **UX-006**: Seed database with initial data
  - Populate items table: all materials, tools, food, equipment
  - Populate crafting_recipes table: all recipes with dependencies
  - Create default terrain types
  - Add initial 9 villagers to agents table
  - Set starting world_state (tick 0, spring, sunny)

- [ ] **UX-007**: Add database indexes and optimization
  - Index: agents(id), agents(x, y)
  - Index: world_tiles(x, y), structures(x, y)
  - Index: inventory(agent_id, item_id)
  - Index: relationships(agent1_id, agent2_id)
  - Index: events_log(timestamp), events_log(actor_id)
  - Setup connection pooling (if PostgreSQL)
  - Query performance benchmarks

- [ ] **UX-008**: Test persistence thoroughly
  - Save state after 50 ticks → restart → verify exact restoration
  - Test with partial builds, ongoing crafting, mid-movement
  - Test corruption handling (missing rows, invalid JSON)
  - Performance test: save/load with 1000+ entities
  - Document any known limitations

**Deliverable**: Robust database system with full schema, persistence, and data access layer

---

## 📋 Phase 2: Attributes & Stats System (v0.3)

**Goal**: Give villagers RPG-like attributes that affect their capabilities

### Tasks

- [ ] **UX-009**: Define attribute system
  - Design 6 core attributes: STR, END, AGI, INT, WIS, CHA (1-20 scale)
  - **STR (Strength)**: Carry capacity, melee damage, building speed
  - **END (Endurance)**: Max HP, energy recovery, hunger resistance
  - **AGI (Agility)**: Movement speed, dodge chance, crafting speed
  - **INT (Intelligence)**: Learning rate, crafting quality, complex recipes
  - **WIS (Wisdom)**: Decision quality, magic (future), resource efficiency
  - **CHA (Charisma)**: Trade prices, relationship gains, NPC interactions
  - Document attribute formulas and effects

- [ ] **UX-010**: Generate role-based attributes
  - Farmer: High END (14), STR (12), low CHA (8)
  - Blacksmith: High STR (15), END (13), low AGI (8)
  - Healer: High WIS (14), INT (12), low STR (8)
  - Merchant: High CHA (15), INT (12), low END (9)
  - Create attribute generation algorithm (base + role bonus + random ±2)
  - Add to database on agent creation

- [ ] **UX-011**: Implement derived stats
  - **HP**: END × 10 (e.g., END 14 → 140 HP)
  - **Max Energy**: (END + STR) × 5
  - **Carry Capacity**: STR × 10 kg
  - **Movement Speed**: AGI × 0.1 tiles/tick
  - **Learning Multiplier**: INT × 0.1 (affects XP gain)
  - Recalculate on attribute changes (level ups)

- [ ] **UX-012**: Add attributes to Agent class
  - Extend Agent constructor with attributes
  - Store in database (attributes JSON column)
  - Create getters for derived stats
  - Update on level up (attribute point allocation)

- [ ] **UX-013**: Display attributes in UI
  - Character panel showing all 6 attributes
  - HP/Energy/Hunger bars with current/max values
  - Carry capacity indicator (X/Y kg)
  - Tooltip on hover explaining attribute effects
  - Color coding: low stats (red), high stats (green)

- [ ] **UX-014**: Integrate attributes into decision-making
  - LLM prompt includes: current HP, energy, hunger, carry capacity
  - Rules: Low energy → prioritize rest, high hunger → seek food
  - Rules: Low HP → avoid danger, high STR → volunteer for combat
  - Update fallback logic to respect stats
  - Test attribute-aware behaviors

- [ ] **UX-015**: Test attribute system
  - Verify attributes affect outcomes (high STR = faster building)
  - Check stat bars update correctly
  - Test low resource scenarios (starvation, exhaustion)
  - Balance attribute effects (no attribute too dominant)

**Deliverable**: Working attribute system affecting villager capabilities and decisions

---

## 📋 Phase 3: Resource Management & Crafting Foundation (v0.4)

**Goal**: Implement comprehensive resource system with gathering, inventory, and basic crafting

### Tasks

- [ ] **UX-016**: Design comprehensive item system
  - **Raw Materials**: clay, wood, stone, iron_ore, sand, water, fiber, coal
  - **Processed Materials**: brick, plank, iron_ingot, glass, rope, fabric, charcoal
  - **Tools**: stone_axe, iron_axe, pickaxe, hammer, saw, shovel (with durability)
  - **Food**: wheat, vegetables, meat, cooked_meat, bread, berries, fish
  - **Equipment**: sword, armor, shield, bow, arrows
  - **Building Materials**: foundation_stone, wall_brick, roof_thatch, door, window
  - **Special**: seeds, wool, leather, hide, bones, herbs
  - Define properties: weight, stackable, max_stack, value, description
  - Populate items table in database

- [ ] **UX-017**: Design crafting recipe system
  - Multi-step recipes: iron_ore → (furnace) → iron_ingot → (forge + hammer) → sword
  - Tool requirements: wood → (axe) → 4 planks
  - Location requirements: brick requires kiln/oven
  - Time-based: simple (3 ticks), medium (10 ticks), complex (30 ticks)
  - Skill requirements: advanced recipes need minimum skill level
  - Failure chance: (100 - skill_level)% chance to waste materials
  - Quality system: high skill → bonus output or better quality
  - Populate crafting_recipes table with 50+ recipes

- [ ] **UX-018**: Implement gathering system
  - **Trees**: Yield wood (3-5 per tree)
    - With axe: 3 ticks, without: 8 ticks
    - Depletes tree (removed from world_tiles)
    - Trees respawn after 100 ticks
  - **Clay Deposits**: Near water tiles, yield clay (10-15)
    - With shovel: 2 ticks, without: 5 ticks
    - Deposits deplete, respawn slowly
  - **Stone Quarrying**: From stone tiles or mountains
    - Requires pickaxe, 5 ticks per 3-5 stone
  - **Mining**: Iron ore from specific tiles
    - Requires pickaxe, 10 ticks per 2-3 ore
    - Dangerous (cave-ins at low skill)
  - **Water Collection**: From lake/river/well
    - Requires bucket/container
    - Instant collection
  - **Foraging**: Berries, herbs from forest tiles
    - No tools, 2 ticks, small yields
  - Update world_tiles resources on gathering
  - Display gathering progress in UI

- [ ] **UX-019**: Implement energy system
  - Energy decreases with actions:
    - Gathering: -10 to -15 (heavy labor)
    - Crafting: -8 per recipe
    - Building: -15 to -20 (very heavy)
    - Walking: -1 per tile
    - Fighting: -20 to -30
  - Energy regenerates:
    - Resting: +20 per tick
    - Sleeping (night): +30 per tick
    - Eating high-energy food: +bonus
  - Low energy effects:
    - < 30%: -50% work speed, can't fight
    - < 10%: can only walk slowly to rest
  - Agents refuse high-energy actions when depleted

- [ ] **UX-020**: Implement hunger system
  - Hunger increases: +5 per tick (faster for high END)
  - Hunger effects:
    - 0-30: Normal
    - 31-60: Slightly slower (-10% speed)
    - 61-80: Significantly slower (-30% speed)
    - 81-100: Starving (-50% speed, -1 HP per 10 ticks)
  - Eating reduces hunger:
    - Raw food: -20 to -30 hunger
    - Cooked food: -40 to -50 hunger
    - Prepared meals: -60 to -80 hunger
  - Food has satiation values in items table

- [ ] **UX-021**: Implement personal inventory system
  - Create Inventory class:
    - `add(item, quantity)` - add to inventory or ground if full
    - `remove(item, quantity)` - remove and return success
    - `has(item, quantity)` - check availability
    - `transfer(targetAgent, item, quantity)` - agent-to-agent
    - `getWeight()` - calculate total weight
  - Each agent has inventory (slots + weight limit)
  - Slot limit: 10 base + upgrades (bags)
  - Weight limit: STR × 10 kg
  - Overencumbered: > weight limit → can't move fast
  - Store in inventory table (agent_id, item_id, quantity, slot)

- [ ] **UX-022**: Implement village storage system
  - Requires built structure: Storage Shed
  - Village-wide shared storage pool
  - Capacity: 100 slots base, upgradeable
  - Any villager can deposit/withdraw
  - Track contributions (who deposited what)
  - Storage structure has storage_capacity and current_storage fields
  - Display village storage in UI (sortable, searchable)

- [ ] **UX-023**: Implement basic crafting
  - Crafting action: select recipe, verify materials, verify requirements
  - Validation:
    - Materials in inventory? ✓
    - Required tool in inventory? ✓
    - At required location? ✓
    - Sufficient energy? ✓
    - Minimum skill level? ✓
  - Crafting process:
    - Deduct materials immediately
    - Agent enters "crafting" status for duration_ticks
    - On completion: roll for success (based on skill)
    - Success: add output to inventory
    - Failure: materials wasted, small XP gain anyway
  - Display crafting progress bar

- [ ] **UX-024**: Implement gold economy
  - Each agent starts with role-based gold (10-50)
  - Gold stored in inventory (special item, 0 weight)
  - Future uses: NPC trades, market purchases, tavern services
  - Display gold in character panel

- [ ] **UX-025**: Resource-aware AI decisions
  - LLM prompt context:
    - Current inventory (item list with quantities)
    - Carry capacity status (X/Y kg)
    - Energy (X/Y), Hunger (X/100), HP (X/Y)
    - Village storage summary
    - Available crafting recipes at current location
  - Decision rules:
    - Energy < 30% → rest
    - Hunger > 60 → seek food (eat or gather)
    - Inventory full → go to storage to deposit
    - Village needs X → gather/craft X
    - Has materials for useful recipe → craft
  - Fallback: prioritize survival (energy, hunger) > work

- [ ] **UX-026**: Test resource ecosystem
  - Run 200+ tick simulation
  - Monitor: gathering rates, crafting success, inventory management
  - Check: Do villagers survive? Do they gather efficiently?
  - Balance: Adjust energy costs, hunger rates, crafting times
  - Edge cases: Full inventory handling, resource depletion

**Deliverable**: Complete resource management with gathering, inventory, crafting, energy, and hunger

---
## 📋 Phase 4: Skills & Leveling System (v0.5)

**Goal**: Villagers gain experience, level up, and improve skills through practice

### Tasks

- [ ] **UX-027**: Design skill system
  - **Profession Skills**: farming, mining, woodcutting, crafting, building, cooking
  - **Combat Skills**: melee, ranged, defense, tactics
  - **Social Skills**: trading, leadership, teaching
  - **Survival Skills**: foraging, hunting, fishing, herbalism
  - Skill levels: 1-10 (1=novice, 5=journeyman, 10=master)
  - Each skill has XP track (0-100 per level, increases each level)
  - Document skill effects on outcomes

- [ ] **UX-028**: Implement XP and leveling
  - Agents gain XP from actions:
    - Gathering wood: +5 woodcutting XP, +2 general XP
    - Crafting item: +10 crafting XP, +5 general XP
    - Building structure: +15 building XP, +8 general XP
    - Combat victory: +20 combat XP, +10 general XP
  - General XP → character level (affects attributes)
  - Skill XP → skill level (affects skill outcomes)
  - Leveling curve: Level N requires N × 100 XP
  - Level up: +2 attribute points (player allocates, or AI decides)
  - Skill level up: Automatic, affects multipliers
  - Store in skills table (agent_id, skill_name, level, xp)

- [ ] **UX-029**: Skill effects on outcomes
  - **Woodcutting**: Level × 0.1 speed bonus, Level × 0.2 yield bonus
  - **Farming**: Level × 0.15 crop yield, Level × 0.1 growth speed
  - **Crafting**: Level × 5% quality bonus, -Level × 2% failure chance
  - **Building**: Level × 0.1 speed bonus, Level × 5% material efficiency
  - **Combat**: Level × 2 damage bonus, Level × 1% dodge chance
  - **Trading**: Level × 2% better prices (buy cheaper, sell higher)
  - Calculate bonuses in action resolution

- [ ] **UX-030**: Add skill progression UI
  - Character panel: List all skills with level and XP bar
  - Progress indicators: Show XP gained per action
  - Level up notifications: "🎉 Farming reached level 5!"
  - Skill descriptions: Hover tooltip explains effects
  - Compare villagers: Who's best at what?

- [ ] **UX-031**: Implement skill training
  - School structure allows focused skill training
  - Training action: Practice specific skill
    - Costs: Time (10 ticks), energy (-10)
    - Rewards: +20 skill XP (no general XP)
    - Faster learning than working
  - Mentorship: High-skill villager trains low-skill one
    - Both gain XP, trainee gains +50% bonus
    - Builds relationship

- [ ] **UX-032**: Skill specialization
  - After level 5, skills branch:
    - Farming → Crop Specialist / Animal Husbandry
    - Crafting → Weaponsmith / Toolmaker / Artisan
    - Combat → Berserker / Defender / Archer
  - Specializations offer unique bonuses
  - Stored as skill variant in database

- [ ] **UX-033**: Skill-aware AI decisions
  - LLM prompt includes: skills with levels, current XP progress
  - Agents prefer tasks matching their skills
  - Low-skill agents seek training or avoid hard tasks
  - High-skill agents mentor others
  - Fallback: Agents work on highest skill

- [ ] **UX-034**: Test skill progression
  - Run 500+ tick simulation
  - Verify XP gains and level ups occur
  - Check skill effects are visible (high woodcutting = more wood)
  - Monitor specialization emergence
  - Balance XP rates (not too fast, not too slow)

**Deliverable**: Working skill system with meaningful progression and specialization

---

## 📋 Phase 5: Progressive Map Building System (v0.6)

**Goal**: Villagers start on empty land and build civilization from scratch

### Tasks

- [ ] **UX-035**: Design starting scenario
  - Villagers spawn on empty grassland (no structures exist)
  - Starting resources: Each villager has basic tools, some food
  - Village storage: None (must build first!)
  - Goal: Survive and build a thriving village
  - Document progression arc (tent → house → village → city)

- [ ] **UX-036**: Implement terrain system
  - Terrain types:
    - **Grass**: Default, easy to build on, some trees
    - **Forest**: Dense trees, more wood, harder to clear
    - **Water**: Lakes/rivers, can't build without bridge
    - **Stone/Mountain**: Lots of stone, requires clearing
    - **Sand**: Near water, source of sand, poor building
    - **Dirt**: Cleared land, ideal for farming
  - Store in world_tiles(terrain_type)
  - Render different colors/textures per type
  - Starting map: 60% grass, 20% forest, 10% water, 10% stone

- [ ] **UX-037**: Design structure building mechanics
  - Build stages: Planning → Foundation → Walls → Roof → Complete
  - Each stage requires:
    - Specific materials (foundation: stone, walls: brick, roof: thatch)
    - Time (ticks to complete)
    - Worker presence (agents must actively build)
  - Multiple workers speed up: time / num_workers
  - Store progress in structures(build_progress 0-100)
  - Incomplete structures: No function, can be damaged/demolished

- [ ] **UX-038**: Implement blueprint system
  - Blueprint action: Agent plans structure at location
  - Creates entry in blueprints table (status: planned)
  - Shows ghost structure on map (transparent)
  - Lists required materials and estimated time
  - Other agents can see blueprint and contribute
  - Cancel blueprint: Refund delivered materials

- [ ] **UX-039**: Implement building action
  - Build action: Agent works on blueprint/structure
  - Requirements check:
    - Materials at site? (delivered to blueprint)
    - Has necessary tools? (hammer for walls, saw for roof)
    - Sufficient energy?
  - Progress: +build_speed per tick (based on STR, building skill)
  - Completion: Structure becomes functional, blueprint removed
  - Collaborative building: Multiple agents work simultaneously

- [ ] **UX-040**: Implement basic shelters
  - **Tent**: Emergency shelter
    - Materials: 10 wood, 5 fabric
    - Time: 10 ticks solo
    - Provides: Sleep spot, small storage (5 slots)
    - Purpose: First night survival
  - **Lean-to**: Simple structure
    - Materials: 15 wood
    - Time: 15 ticks
    - Provides: Weather protection, basic rest
  - **Campfire**: Essential early structure
    - Materials: 10 wood, 5 stone
    - Time: 5 ticks
    - Provides: Cooking (raw → cooked), warmth, social spot

- [ ] **UX-041**: Implement residential buildings
  - **Small House**: Personal dwelling
    - Materials: 50 wood, 30 brick, 10 stone
    - Time: 50 ticks solo (20 ticks with 3 workers)
    - Provides: Sleep (+30 energy/tick), storage (20 slots), ownership
    - Size: 2×2 tiles
  - **Large House**: Family dwelling
    - Materials: 100 wood, 60 brick, 20 stone, 5 glass
    - Time: 100 ticks
    - Provides: Sleep for 2-3, storage (40 slots), comfort bonus
    - Size: 3×3 tiles
  - **Apartment Building**: Multi-family
    - Materials: 200 wood, 150 brick, 50 stone, 20 glass
    - Time: 200 ticks
    - Provides: 4-6 living spaces
    - Size: 4×4 tiles

- [ ] **UX-042**: Implement work structures
  - **Workshop**: General crafting
    - Materials: 80 wood, 40 stone, 20 iron
    - Time: 80 ticks
    - Provides: Crafting station for tools, furniture
    - Unlocks: Advanced tool recipes
  - **Kiln/Oven**: Fire-based crafting
    - Materials: 60 brick, 30 clay, 20 stone
    - Time: 60 ticks
    - Provides: Brick making, pottery, advanced cooking
    - Unlocks: Brick production, ceramics
  - **Forge**: Metalworking
    - Materials: 100 brick, 50 stone, 30 iron_ingot, 20 coal
    - Time: 120 ticks
    - Provides: Metal tool/weapon crafting, repairs
    - Unlocks: Iron tools, weapons, armor
  - **Farm Plot**: Agriculture
    - Materials: 20 wood (fence), tilled soil
    - Time: 20 ticks
    - Provides: Crop growing (wheat, vegetables)
    - Size: 3×3 tiles, expandable
  - **Lumber Mill**: Wood processing
    - Materials: 100 wood, 50 stone, 20 iron (saw blade)
    - Time: 100 ticks
    - Provides: Efficient plank production (+50% yield)
  - **Mine Entrance**: Underground access
    - Materials: 80 stone, 40 wood (supports)
    - Time: 80 ticks
    - Provides: Access to ore veins, stone quarry

- [ ] **UX-043**: Implement infrastructure
  - **Storage Shed**: Village storage
    - Materials: 60 wood, 30 stone
    - Time: 50 ticks
    - Provides: 100 storage slots (upgradeable)
    - Essential: First communal structure
  - **Well**: Water source
    - Materials: 40 stone, 20 wood
    - Time: 40 ticks
    - Provides: Water gathering (infinite)
  - **Path/Road**: Movement enhancement
    - Materials: 5 stone per tile
    - Time: 2 ticks per tile
    - Effect: +50% movement speed on paths
  - **Fence/Wall**: Perimeter defense
    - Materials: 10 wood or 8 stone per tile
    - Time: 5 ticks per tile
    - Effect: Blocks animal entry, +security
  - **Gate**: Wall entrance
    - Materials: 30 wood, 10 iron
    - Time: 20 ticks
    - Effect: Can be locked, controlled access
  - **Bridge**: Cross water
    - Materials: 40 wood, 20 stone per tile
    - Time: 15 ticks per tile
    - Effect: Build over water tiles
  - **Watchtower**: Security
    - Materials: 100 stone, 50 wood
    - Time: 100 ticks
    - Provides: Early warning of threats, +morale

- [ ] **UX-044**: Implement social structures
  - **Tavern**: Community hub
    - Materials: 150 wood, 100 brick, 30 glass
    - Time: 150 ticks
    - Provides: Food service (-gold for meals), social interactions, quest board
  - **Market Stall**: Trading
    - Materials: 40 wood, 20 fabric
    - Time: 30 ticks
    - Provides: Trade interface between villagers
  - **School**: Education
    - Materials: 120 wood, 80 brick, 40 stone
    - Time: 120 ticks
    - Provides: Skill training (+bonus XP), literacy
  - **Library**: Knowledge
    - Materials: 200 wood, 120 brick, 60 glass
    - Time: 200 ticks
    - Provides: Research, lore storage, advanced learning
  - **Town Hall**: Governance
    - Materials: 300 wood, 200 brick, 100 stone, 40 glass
    - Time: 300 ticks
    - Provides: Village meetings, quest coordination, leadership

- [ ] **UX-045**: Building progression in AI
  - LLM context:
    - Current structures list
    - Active blueprints
    - Village needs (shelter count, food production, storage)
  - Decision logic:
    - No shelter → prioritize tent/campfire
    - No storage → build storage shed
    - Hungry → build farm plot
    - Need processing → build kiln/forge
    - Established → build social structures
  - Agents suggest buildings based on needs
  - Agents deliver materials to blueprints
  - Agents collaborate on construction

- [ ] **UX-046**: Map expansion (optional)
  - Starting grid: 8×9 tiles
  - Expand when village reaches edge: +5 tiles per direction
  - New tiles = unexplored (fog of war)
  - Exploration action: Venture into unknown
  - Revealed tiles show terrain and resources

- [ ] **UX-047**: Test progressive building
  - Fresh start: Empty land, 9 villagers
  - Observe: First tent and campfire built
  - Monitor: Progression to houses → work buildings → infrastructure
  - Verify: Material flow (gather → craft → build)
  - Check: Village functional after 200+ ticks
  - Balance: Building costs, times, material availability

**Deliverable**: Complete progressive world-building system where civilization emerges from wilderness

---
## 📋 Phase 6: Real-World Physics Crafting (v0.7)

**Goal**: Implement realistic, multi-step crafting with real-world dependencies

### Tasks

- [ ] **UX-048**: Document comprehensive crafting chains
  - **Clay → Brick Chain**:
    1. Gather clay from deposits (shovel recommended)
    2. Shape clay (hands, 1 tick per 4 clay)
    3. Fire in kiln/oven (5 clay + heat → 4 brick, 10 ticks)
  - **Wood → Furniture Chain**:
    1. Chop tree → wood (axe, 3-5 wood)
    2. Wood → planks (saw, 1 wood → 4 planks, 3 ticks)
    3. Planks + nails → furniture (workshop, varies)
  - **Iron Ore → Sword Chain**:
    1. Mine iron ore (pickaxe, 10 ticks → 2-3 ore)
    2. Smelt ore (forge + coal, 2 ore + 1 coal → 1 ingot, 15 ticks)
    3. Forge ingot (forge + hammer, 3 ingot → 1 sword, 25 ticks)
  - **Wheat → Bread Chain**:
    1. Plant wheat seeds (farm plot, 2 ticks)
    2. Wait for growth (20-30 ticks, depends on season)
    3. Harvest wheat (2 ticks, 3-5 wheat)
    4. Grind wheat → flour (grinding stone, 5 wheat → 3 flour, 5 ticks)
    5. Bake flour (oven, 3 flour + water → 2 bread, 10 ticks)
  - Update crafting_recipes table with all chains

- [ ] **UX-049**: Implement heat source system
  - Heat sources: Campfire, kiln, forge, oven
  - Heat levels: low (campfire), medium (kiln), high (forge)
  - Recipes require appropriate heat:
    - Cooking meat: low heat (campfire)
    - Baking bread: medium heat (oven)
    - Smelting iron: high heat (forge)
  - Heat source must be built and functional
  - Fuel system: Campfire/kiln need wood/coal to stay lit

- [ ] **UX-050**: Implement tool dependency
  - Tools required for efficiency:
    - **No tool**: Can do basic tasks (slow, low yield)
    - **Basic tool**: Normal speed and yield
    - **Advanced tool**: +speed, +yield, +quality
  - Tool degradation: Durability decreases with use
  - Broken tools: Must repair (forge + materials) or replace
  - Quality tiers: Stone < Iron < Steel (affects durability, speed)

- [ ] **UX-051**: Implement multi-step crafting
  - Recipe chains stored in database with step dependencies
  - Example: Sword requires ingots, ingots require ore + smelting
  - Agents can queue crafting: "Craft sword" → auto-gathers ore → smelts → forges
  - Or manual: Agent decides each step
  - Display crafting chain in UI (tree view)

- [ ] **UX-052**: Implement quality system
  - Crafting success: Base success rate + skill bonus
  - Outcomes:
    - **Critical Success**: (skill > 8) Bonus output or superior quality
    - **Success**: Normal output
    - **Partial Failure**: (skill < 5) Reduced output, materials partially wasted
    - **Critical Failure**: (skill < 3, rare) All materials wasted, possible injury
  - Quality affects item properties:
    - Superior sword: +20% damage, +50% durability
    - Poor brick: -20% HP when used in building

- [ ] **UX-053**: Implement advanced recipes
  - **Concrete**: 2 stone + 1 sand + 1 water → 3 concrete
    - Requires: Mixing station, INT > 10
    - Use: Advanced buildings (higher HP)
  - **Steel**: 2 iron_ingot + 1 coal + high heat → 1 steel
    - Requires: Advanced forge, metalworking skill 7+
    - Use: Superior tools and weapons
  - **Glass**: 3 sand + high heat → 2 glass
    - Requires: Kiln, glassmaking skill 5+
    - Use: Windows, bottles, decorative items
  - **Leather**: Animal hide + tanning rack + time → leather
    - Requires: Tanning skill 3+
    - Use: Armor, bags, bookbinding
  - **Paper**: 5 wood → pulp → 3 paper
    - Requires: Water, pressing, drying (20 ticks total)
    - Use: Books, scrolls, maps
  - **Enchanted items** (future): Base item + magic + catalyst
    - Requires: WIS > 12, magic skill
    - Use: Bonuses to attributes or effects

- [ ] **UX-054**: Implement batch crafting
  - Batch mode: Craft multiple items at once
  - Example: "Craft 10 bricks" (if materials available)
  - Time: Duration × quantity (with efficiency bonus at scale)
  - Efficiency: Crafting 10 bricks takes 80 ticks (not 100)
  - Interrupt handling: Can cancel mid-batch, keep completed items

- [ ] **UX-055**: Implement recipe discovery
  - Recipes start "locked" or "unknown"
  - Discovery methods:
    - Experimentation: Try combining items (chance of discovery)
    - Skill level: High skill unlocks advanced recipes
    - Books/scrolls: Find recipe in library or from NPC
    - Teaching: High-skill villager teaches recipe to others
  - Discovered recipes stored per agent (knowledge table)
  - Shared recipes: One discovers, can teach others

- [ ] **UX-056**: Crafting validation and feedback
  - Pre-craft validation:
    - Materials available? ✓/✗
    - Tool present? ✓/✗
    - At correct location? ✓/✗
    - Heat source active? ✓/✗
    - Sufficient energy? ✓/✗
    - Skill level adequate? ✓/✗
  - Clear error messages: "Need hammer to forge sword"
  - Success notifications: "Crafted Iron Sword (Superior Quality)!"
  - Failure notifications: "Crafting failed, materials wasted. Gained 5 XP."

- [ ] **UX-057**: Crafting UI enhancements
  - Recipe browser:
    - Filter by: Type, skill level, location, discovered
    - Sort by: Time, complexity, usefulness
    - Show: Materials, tools, time, skill requirement
  - Crafting queue: List of pending crafts
  - Progress indicators: Current craft progress bar
  - Highlight: Recipes you can craft now (green)
  - Lock icon: Recipes not yet discovered

- [ ] **UX-058**: Physics-aware AI decisions
  - LLM context:
    - Available recipes at location
    - Materials in inventory
    - Tool availability and durability
    - Heat source status (if needed)
  - Strategic crafting:
    - Need sword → check materials → gather if missing → craft
    - Tool breaking soon → craft replacement
    - Batch craft common items (bricks for building project)
  - Specialization: High-skill agents focus on their specialty
  - Resource efficiency: Minimize waste, optimize material use

- [ ] **UX-059**: Test crafting ecosystem
  - Test full chains: Ore → ingot → sword (verify each step)
  - Test failures: Low-skill crafting, missing tools
  - Test quality: High-skill vs low-skill outputs
  - Test batch crafting: Multiple items, interruptions
  - Balance: Crafting times, material costs, failure rates
  - Performance: 20+ villagers crafting simultaneously

**Deliverable**: Realistic physics-based crafting with dependencies, quality, and complexity

---

## 📋 Phase 7: Environment Systems (Non-LLM) (v0.8)

**Goal**: Living, responsive environment with animals, trees, NPCs, events (rule-based)

### Tasks

- [ ] **UX-060**: Design environment entity system
  - Entity categories: Animals (passive/aggressive), Plants (trees/crops), NPCs
  - Entities have: ID, type, subtype, position, state, behavior_rules
  - Spawn/despawn rules: Timed, triggered, seasonal
  - Interaction rules: Attack, flee, trade, grow
  - Store in environment_entities table
  - Update in simulation tick (separate from LLM agents)

- [ ] **UX-061**: Implement tree/plant lifecycle
  - **Trees**:
    - Growth stages: Sapling (10 ticks) → Young (30 ticks) → Mature (permanent)
    - Mature trees: Harvestable (3-5 wood), regrows after chopping (100 ticks)
    - Fruit trees: Produce fruit when mature (5 fruit per 20 ticks)
    - Visual: Different sprites per growth stage
  - **Crops** (on farm plots):
    - Growth stages: Planted → Sprouting (5 ticks) → Growing (10 ticks) → Harvestable (5 ticks) → Withered (if not harvested)
    - Harvest yield: Depends on farming skill, weather, season
    - Replanting: Must plant seeds again
  - **Wild plants**:
    - Berry bushes: Spawn in forest, harvestable (berries), respawn
    - Herbs: Spawn randomly, harvestable (healing items)
  - Growth affected by: Season, weather, proximity to water

- [ ] **UX-062**: Implement passive animals
  - **Deer**:
    - Spawn: Forest tiles, 1-2 per 50 ticks
    - Behavior: Wander randomly, graze near grass
    - Flee: If villager approaches within 2 tiles
    - Huntable: Bow/spear required, yields 3-5 meat + hide
    - State: {hp: 30, speed: 1.5, flee_distance: 3}
  - **Rabbits**:
    - Spawn: Grass tiles, common (high spawn rate)
    - Behavior: Fast movement, flee easily
    - Huntable: Yields 1-2 small_meat
    - State: {hp: 10, speed: 2.0, flee_distance: 4}
  - **Sheep**:
    - Spawn: Near grass, can be domesticated
    - Behavior: Graze, stay near flock
    - Shearable: Yields wool (for fabric), regrows
    - Breeding: If fed and penned
    - State: {hp: 40, wool_growth: 0-100, domestic: boolean}
  - **Chickens**:
    - Spawn: Near village structures
    - Behavior: Peck ground, produce eggs (1 per 10 ticks)
    - Domestic: Can build coop, chickens stay nearby
    - State: {hp: 15, egg_timer: 0-10}
  - **Fish** (in water tiles):
    - "Spawn": Always present in water
    - Fishing: Cast line (requires rod), wait (5-10 ticks), catch chance based on skill
    - Yields: 1-2 fish

- [ ] **UX-063**: Implement aggressive animals
  - **Wolves**:
    - Spawn: Night time, forest edges, 2-3 pack
    - Behavior: Hunt weak villagers (HP < 50%) or isolated ones
    - Attack: Initiate combat if within 2 tiles of target
    - Combat stats: ATK 15, DEF 5, HP 50
    - Loot: Wolf pelt (valuable), small_meat
    - Pack behavior: Fight together, +bonus if outnumber target
  - **Bears**:
    - Spawn: Rare, deep forest/mountains, solitary
    - Behavior: Territorial, attack if villager enters territory (3-tile radius)
    - Combat stats: ATK 30, DEF 10, HP 150 (very dangerous)
    - Loot: Bear pelt (rare, valuable), 5-8 meat
  - **Boars**:
    - Spawn: Forest, aggressive if provoked
    - Behavior: Neutral until attacked or food nearby
    - Combat stats: ATK 20, DEF 7, HP 80
    - Loot: 3-5 meat, leather
  - **Giant Rats** (near village, nuisance):
    - Spawn: If village storage has food and no walls
    - Behavior: Steal food, flee if confronted
    - Combat stats: ATK 5, DEF 2, HP 20 (weak but annoying)
    - Loot: Nothing (pest control)

- [ ] **UX-064**: Implement NPC visitors
  - **Traveling Merchant**:
    - Arrival: Every 30-50 ticks, announced
    - Spawn: Map edge (portal/wormhole effect)
    - Duration: Stays 10 ticks
    - Inventory: Rare items (exotic seeds, tools, materials)
    - Trade: Buy/sell with gold, prices based on CHA
    - Dialogue: Simple greetings, trade comments
  - **Wandering Bard**:
    - Arrival: Random, every 40-60 ticks
    - Purpose: Shares news (tips), requests songs
    - Reward: Small gold, +morale boost to village
    - Dialogue: Stories, village lore
  - **Refugee**:
    - Arrival: Rare event, triggered by village size
    - Purpose: Seeks shelter, can join as 10th villager
    - Requirements: Available housing, village vote (or auto if space)
    - Brings: Random skills, starting resources
  - **Quest Giver** (future):
    - Arrival: After Town Hall built
    - Purpose: Offers quests (fetch, build, defend)
    - Rewards: Gold, rare items, reputation

- [ ] **UX-065**: Implement market wormhole system
  - **Market Portal** structure:
    - Build cost: 500 gold + 100 wood + 50 stone + 10 magic_crystal
    - Unlocks: Connection to external market
    - Function: Buy bulk resources, sell surplus
  - **Market Interface**:
    - Buy: Common resources (wood, stone, food) at premium prices
    - Sell: Surplus items for gold (70% of value)
    - Prices fluctuate: +/-20% based on village demand (algorithm)
    - Refresh: Market inventory updates every 20 ticks
  - **Purpose**: Safety net (if village struggling) and gold sink (if thriving)

- [ ] **UX-066**: Implement environmental events
  - **Animal Migration**:
    - Event: Large herd of deer (10-15) appears
    - Duration: 15 ticks
    - Opportunity: Mass hunting or domestication
    - Trigger: Random, spring/summer more likely
  - **Predator Attack**:
    - Event: Wolf pack (5-7) attacks village
    - Villagers must defend or hide indoors
    - Can damage structures if not repelled (break fences)
    - Trigger: Random, winter more likely, more common if village has livestock
  - **Berry Season**:
    - Event: Berry bushes spawn in abundance
    - Duration: 20 ticks (easy gathering)
    - Yield: 2x normal berries
    - Trigger: Summer, every 50-80 ticks
  - **Trader Caravan**:
    - Event: 3-4 merchants arrive together
    - Better prices (-10% buy, +10% sell)
    - Larger inventory, rare items
    - Trigger: Rare, if village reputation > 50
  - **Mysterious Stranger**:
    - Event: NPC with special quest or item
    - Can be good (gifts) or bad (thief)
    - Trigger: Random, adds unpredictability

- [ ] **UX-067**: Environment interaction rules
  - **Animal AI** (simple state machines, NOT LLM):
    - Passive: Wander → Graze → Flee if threatened
    - Aggressive: Patrol → Detect prey → Chase → Attack → Return
    - Pack behavior: Follow alpha, coordinate attacks
  - **Combat initiation**:
    - Animal checks: Villager HP, distance, is armed?, is alone?
    - Wolves: Attack if villager HP < 50% AND alone
    - Bears: Attack if villager enters territory
    - Boars: Attack if provoked (hit first) OR food nearby
  - **Flee triggers**:
    - Passive animals flee if: Outnumbered, injured, or predator nearby
    - Aggressive animals flee if: HP < 30%, outnumbered 3:1
  - **Environmental effects**:
    - Rain: Animals seek shelter, gathering slower
    - Night: Passive animals sleep/hide, predators more active
    - Winter: Fewer animals, slower growth
    - Trees: Can fall and damage structures if improperly cut

- [ ] **UX-068**: Environment-aware AI decisions
  - LLM context includes:
    - Nearby animals (type, distance, threat level)
    - Environmental events active
    - NPC visitors present
  - Decision rules:
    - Wolves nearby + low HP → flee to safety
    - Deer nearby + hunting skill → hunt
    - Merchant arrived → trade if have gold/surplus
    - Predator attack event → defend village or hide
    - Berry season → gather berries (easy food)
  - Fallback priorities:
    - Avoid aggressive animals when weak
    - Hunt passive animals when hungry
    - Interact with NPCs when beneficial

- [ ] **UX-069**: Test living environment
  - Run 500+ tick simulation
  - Observe: Animal spawns, behaviors, interactions
  - Verify: Hunting mechanics, animal attacks, defenses
  - Check: NPC arrivals, trading functionality
  - Monitor: Event triggers, frequencies
  - Balance: Spawn rates, animal difficulty, event rewards
  - Ensure: Environment enhances gameplay without overwhelming

**Deliverable**: Living, responsive environment that enriches gameplay with non-LLM entities and events

---
## 📋 Phase 8: Visual Upgrade - Sprites & Tilesets (v0.9)

**Goal**: Replace placeholder graphics with proper 2D sprites, tilesets, and animations

### Tasks

- [ ] **UX-070**: Source or create character sprites
  - Find: 32×32 or 48×48 sprite sheets (CC0/MIT/open source)
  - Sources: OpenGameArt, itch.io, Kenney assets
  - Requirements: 9 unique villagers, 4-direction movement
  - Animations: Walking (4 frames), idle, working, fighting, resting
  - License: Verify CC0 or proper attribution
  - Alternative: Commission simple pixel art or create with tools (Piskel, Aseprite)

- [ ] **UX-071**: Integrate character sprites into Phaser
  - Load sprite sheets in `preload()`
  - Replace circle rendering with sprite rendering
  - Setup animation manager:
    - walk_up, walk_down, walk_left, walk_right
    - idle_up, idle_down, idle_left, idle_right
    - work, fight, rest animations
  - Direction tracking: Update sprite based on movement direction
  - Smooth transitions between animations

- [ ] **UX-072**: Add character status indicators
  - Icons above sprites:
    - ❤️ HP bar (red, scales with current/max HP)
    - ⚡ Energy bar (yellow, below HP)
    - 🍖 Hunger indicator (shows if > 50)
    - 💬 Speech bubble (during talk action)
    - ⚔️ Combat icon (during fight)
    - 😴 Sleep zzz (during rest)
    - 🔨 Tool icon (during work)
  - Status effects: Injured (red pulse), exhausted (gray), happy (sparkles)
  - Emotion indicators: !, ?, 💡, 😊, 😟

- [ ] **UX-073**: Source or create terrain tileset
  - Tileset requirements:
    - Grass (variants), dirt, sand, stone, water, forest floor
    - Terrain transitions (grass→dirt edge tiles)
    - Decorations: Flowers, rocks, stumps, bushes
  - Size: 32×32 or 48×48 per tile
  - Sources: OpenGameArt, Kenney, or create
  - License verification

- [ ] **UX-074**: Source or create structure sprites
  - Buildings: Tent, house, workshop, forge, tavern, etc.
  - Multi-tile structures: Large buildings span multiple tiles
  - Build stages: Foundation, partial walls, complete (3-4 variants per building)
  - Infrastructure: Paths, fences, walls, gates, bridges
  - Decoration: Signs, furniture (visible through windows)
  - Size: Proportional to tile size

- [ ] **UX-075**: Source or create environment sprites
  - Trees: Sapling, young, mature (oak, pine variants)
  - Animals: Deer, rabbit, sheep, wolf, bear, boar (animated)
  - Plants: Crops (growth stages), berry bushes, herbs
  - Effects: Particles (dust, sparkles, fire, smoke)
  - NPCs: Merchant, bard, refugee (distinctive clothing)

- [ ] **UX-076**: Implement tilemap rendering in Phaser
  - Replace colored rectangles with Phaser tilemap
  - Layers:
    - Ground layer: Terrain tiles
    - Decoration layer: Rocks, bushes, stumps
    - Structure layer: Buildings
    - Overlay layer: Effects, highlights
  - Use Phaser's tilemap system for efficiency
  - Support dynamic tile changes (building, clearing land)

- [ ] **UX-077**: Implement sprite animations
  - Character animations: Walking smoothly between tiles
  - Building animations: Construction progress (scaffolding, materials appearing)
  - Environment animations: Trees swaying, water rippling, grass movement
  - Particle effects:
    - Crafting: Sparks (forge), smoke (oven), dust (building)
    - Actions: Wood chips (chopping), sparkles (success), sweat (hard work)
    - Combat: Hit effects, blood particles (optional), weapon trails
  - Performance: Optimize particle count, reuse effects

- [ ] **UX-078**: Enhance UI with visual styling
  - Panels: Semi-transparent, modern design
  - Fonts: Pixel fonts or clear sans-serif
  - Color scheme: Earthy tones (brown, green, tan)
  - Icons: Item icons (32×32), skill icons, action icons
  - Tooltips: Styled with borders, shadows
  - Responsive: Adjusts to screen size
  - Dark mode option (toggle)

- [ ] **UX-079**: Implement camera controls
  - Pan: Click-drag to move camera
  - Zoom: Mouse wheel or pinch to zoom in/out
  - Follow mode: Camera follows selected villager
  - Snap to: Click villager to center camera
  - Minimap: Small overview map in corner

- [ ] **UX-080**: Polish visual transitions
  - Smooth movement: Tween between tiles (not instant teleport)
  - Fade effects: Buildings appear gradually when built
  - Highlight effects: Selected villager glows
  - Day/night lighting: Tint changes (bright day, dark blue night)
  - Weather effects: Rain particles, snow, fog

- [ ] **UX-081**: Test visual performance
  - Performance: 60 FPS with 9+ villagers, 20+ animals
  - Load time: Optimize sprite sheet sizes
  - Memory: Monitor for leaks with long sessions
  - Scaling: Test on different screen sizes
  - Compatibility: Test in different browsers

**Deliverable**: Visually upgraded simulation with sprites, tilesets, animations, and polished UI

---

## 📋 Phase 9: Advanced Observation UI (v1.0)

**Goal**: Comprehensive inspection system for observing all simulation aspects

### Tasks

- [ ] **UX-082**: Design observation system architecture
  - Multi-panel layout: Main view + inspectors
  - Inspector types: Villager, Structure, Resource, Map, Relationships
  - Drill-down: Click entity → open detailed panel
  - Live updates: Panels refresh with simulation state
  - Minimize/maximize: Panels can be collapsed

- [ ] **UX-083**: Implement villager inspector
  - Header: Portrait, name, role, level
  - **Attributes tab**:
    - Display all 6 attributes with values
    - Show derived stats (HP, energy, carry capacity)
    - Attribute effects explained (hover tooltips)
  - **Stats tab**:
    - Current HP, energy, hunger (bars + numbers)
    - Status effects active (buffs, debuffs)
    - Mood indicator with emoji
  - **Skills tab**:
    - List all skills with levels and XP bars
    - Progress to next level
    - Skill effects and specializations
  - **Inventory tab**:
    - Grid view of inventory (icon + quantity)
    - Equipped items highlighted
    - Weight: X/Y kg, slots: X/Y
    - Item details on hover (stats, durability)
    - Drag-drop to equip/unequip
  - **Relationships tab**:
    - List of all other villagers with affinity scores
    - Relationship type (friend, rival, etc.)
    - Recent interactions log
    - Visual: Hearts for friends, lightning for rivals
  - **Memory/History tab**:
    - Last 20 thoughts/actions
    - Filterable by type (work, social, combat)
    - Timeline view
  - **Current Action**:
    - What are they doing right now?
    - Progress bar if ongoing action
    - Destination if moving

- [ ] **UX-084**: Implement structure inspector
  - Header: Structure name, type, owner
  - **Info tab**:
    - Build progress (if incomplete)
    - HP: X/Y, level, age (ticks since built)
    - Size: Width × height
  - **Function tab**:
    - Purpose: What does this structure do?
    - Active effects: Bonuses provided
    - Requirements: What's needed to use it?
  - **Storage tab** (if applicable):
    - Grid view of stored items
    - Capacity: X/Y slots
    - Who deposited what (contribution log)
  - **Workers tab** (if work structure):
    - Who's currently working here?
    - Production: Items produced (log)
    - Efficiency: Based on worker skills
  - **Upgrade tab** (if upgradeable):
    - Current level, next level benefits
    - Materials needed for upgrade
    - Estimated upgrade time

- [ ] **UX-085**: Implement resource dashboard
  - **Village Resources Panel**:
    - Total count per resource type
    - Storage capacity used: X/Y slots
    - Recent changes: +/- indicators
    - Critical resources highlighted (low stock)
    - Pie chart: Resource distribution
  - **Production Panel**:
    - Production rates: Wood/tick, food/tick
    - Consumption rates: Food consumed/tick
    - Net change: +/- per tick
    - Projections: Will run out in X ticks
  - **Needs Panel**:
    - What village needs most (ranked)
    - Suggested actions: "Build farm", "Gather wood"
  - **Trade Panel** (if market exists):
    - Available trades
    - Price history (graph)
    - Profit/loss tracking

- [ ] **UX-086**: Implement map progress overlay
  - **Terrain View**:
    - Show terrain types with color coding
    - Resource deposits highlighted
    - Unexplored areas (fog of war)
  - **Structures View**:
    - All structures marked on map
    - Color by type (residential, work, infrastructure)
    - Incomplete structures shown as blueprints
  - **Activity Heatmap**:
    - Show where villagers spend time (heat colors)
    - Identify busy vs unused areas
  - **Danger Zones**:
    - Mark areas with aggressive animals
    - Mark recently attacked tiles
  - **Filters**: Toggle layers on/off

- [ ] **UX-087**: Implement environment inspector
  - **Animals Panel**:
    - List all animals currently spawned
    - Type, location, HP, behavior state
    - Threat level indicator (passive/aggressive)
    - Click animal → highlight on map
  - **Plants Panel**:
    - Trees: Count, growth stages, locations
    - Crops: Status, ready to harvest count
    - Wild plants: Berry bushes, herbs available
  - **NPCs Panel**:
    - Currently visiting NPCs
    - Time remaining before departure
    - Inventory (what they're selling/buying)
    - Interaction history
  - **Events Panel**:
    - Active events listed
    - Event timers (time remaining)
    - Past events log (last 10)

- [ ] **UX-088**: Implement relationship graph
  - **Visual Relationship Network**:
    - Nodes: Villagers (circles)
    - Edges: Relationships (lines)
    - Edge thickness: Affinity strength
    - Edge color: Green (friend), red (rival), gray (neutral)
  - **Interactive**:
    - Click villager node → highlight connections
    - Hover edge → show affinity score
    - Filter: Show only strong relationships
  - **Relationship Matrix**:
    - Grid showing all pair-wise affinities
    - Color gradient: Red (low) to green (high)
    - Click cell → detailed relationship info

- [ ] **UX-089**: Implement statistics & analytics
  - **Village Stats Panel**:
    - Population: Current count, capacity
    - Age: Ticks since founded
    - Structures built: X residential, Y work, Z infra
    - Total resources gathered (lifetime)
  - **Villager Stats**:
    - Average level, highest level
    - Skill distribution (who does what?)
    - Health: Average HP, hunger
  - **Economy Stats**:
    - Total gold in village
    - Items crafted (lifetime count)
    - Trade volume (if market active)
  - **Combat Stats**:
    - Monsters defeated
    - Villagers lost (if permadeath)
    - Dungeon runs completed
  - **Graphs**:
    - Population over time
    - Resource stockpiles over time
    - XP gain rate over time

- [ ] **UX-090**: Implement query and search
  - **Search Bar**:
    - Search by: Villager name, item name, structure name
    - Auto-complete suggestions
    - Jump to entity on map
  - **Filters**:
    - Villagers: By role, by skill, by status
    - Structures: By type, by completion
    - Resources: By quantity (low, medium, high)
  - **Sort Options**:
    - Sort villagers by level, by skill, by hunger
    - Sort structures by age, by HP
    - Sort resources by quantity

- [ ] **UX-091**: Add comparison tools
  - **Compare Villagers**:
    - Select 2-3 villagers
    - Side-by-side attribute comparison
    - Skill comparison (who's better at what?)
    - Relationship comparison
  - **Compare Structures**:
    - Multiple structures of same type
    - Production efficiency comparison
    - Worker skill comparison

- [ ] **UX-092**: Implement notification system
  - **Notification Types**:
    - Info: Structure completed, villager leveled up
    - Warning: Low resources, hungry villager, tool broken
    - Alert: Animal attack, villager injured, structure damaged
  - **Notification Center**:
    - List recent notifications (last 50)
    - Filter by type
    - Click notification → jump to entity
  - **Settings**:
    - Toggle notification types on/off
    - Sound effects for alerts (optional)

- [ ] **UX-093**: Test observation UI
  - Usability: Can observers find information easily?
  - Performance: UI updates don't lag simulation
  - Accuracy: All displayed data matches simulation state
  - Completeness: No important information hidden
  - Polish: Consistent styling, smooth interactions

**Deliverable**: Comprehensive observation system for inspecting all simulation aspects in detail

---
## 📋 Phase 10: Relationships & Collaboration (v1.1)

**Goal**: Villagers form meaningful relationships and collaborate on goals

### Tasks

- [ ] **UX-094**: Design relationship system
  - Affinity scale: 0-100 (0=enemies, 50=neutral, 100=best friends)
  - Relationship types:
    - 0-20: Enemies/Rivals
    - 21-40: Dislike
    - 41-60: Acquaintances
    - 61-80: Friends
    - 81-100: Close Friends/Partners
  - Affinity changes: Based on interactions, shared experiences
  - Store in relationships table (agent1_id, agent2_id, affinity)

- [ ] **UX-095**: Implement relationship tracking
  - Initial state: All villagers start at 50 (neutral)
  - Interaction tracking:
    - Talk: +2 affinity (more if personality compatible)
    - Work together: +3 affinity
    - Trade: +1 affinity (more with high CHA)
    - Help (healing, sharing): +5 affinity
    - Conflict (resource dispute): -5 affinity
    - Combat together: +10 affinity (shared danger bonds)
  - Personality compatibility:
    - Similar personalities: +bonus affinity gain
    - Opposite personalities: -bonus or neutral
  - Decay: Affinity slowly decays toward 50 if no interaction (1 per 50 ticks)

- [ ] **UX-096**: Implement relationship effects
  - **Collaboration**:
    - Friends work together more efficiently (+10% speed)
    - Friends more likely to help each other
    - Friends share resources willingly
  - **Trade**:
    - Friends offer better prices (-10%)
    - Enemies refuse to trade or charge premium (+20%)
  - **Combat**:
    - Friends defend each other in combat
    - Friends form parties together
    - Enemies may refuse to party
  - **Mood**:
    - Being near friends: +mood bonus
    - Conflict with friends: -mood penalty
  - **Decisions**:
    - LLM considers relationships when deciding actions
    - Prefer interacting with friends
    - Avoid or confront enemies

- [ ] **UX-097**: Implement collaborative actions
  - **Joint Work**:
    - 2+ villagers work on same task
    - Speed bonus: +20% per additional worker (max 3)
    - Affinity boost: +3 per successful collaboration
    - Requirements: Compatible personalities or high affinity
  - **Teaching**:
    - High-skill villager teaches low-skill one
    - Mentor gains: +teaching skill XP, +affinity with student
    - Student gains: +skill XP (bonus), +affinity with mentor
    - Duration: 20 ticks per session
  - **Gift Giving**:
    - Villager gives item to another
    - Affinity boost: Based on item value and receiver's needs
    - Can be strategic (appease rival) or friendly
  - **Joint Expeditions**:
    - Form party for dungeon/exploration
    - Shared XP, shared loot
    - Shared danger builds strong bonds

- [ ] **UX-098**: Implement village-level goals/quests
  - **Village Projects**:
    - Examples: "Build Library", "Gather 500 wood", "Defeat Bear"
    - Requirements: Multi-villager effort, resources, time
    - Progress tracking: Contributions per villager
    - Completion: Rewards for all (gold, XP, unlocks)
  - **Quest Board** (at Tavern/Town Hall):
    - Display active village goals
    - Villagers can see and contribute
    - LLM considers village goals in decisions
  - **Emergencies**:
    - "Village Under Attack" → all combat-capable villagers defend
    - "Food Shortage" → prioritize farming and hunting
    - "Winter Preparation" → stockpile resources
  - **Celebrations**:
    - Goal completion triggers celebration (morale boost)
    - Feast at tavern (consume food, +happiness)
    - Strengthens all relationships (+affinity boost)

- [ ] **UX-099**: Implement conflict resolution
  - **Conflicts Arise**:
    - Resource disputes (both want same item)
    - Personality clashes (incompatible)
    - Jealousy (one villager more successful)
    - Accident (one damages other's property)
  - **Resolution Options**:
    - **Mediation**: Third villager mediates (requires high CHA)
    - **Apology**: Offender apologizes (gift + talk)
    - **Avoidance**: Both stay away (affinity frozen)
    - **Escalation**: Affinity continues to drop, may fight
  - **Consequences**:
    - Unresolved conflicts reduce village efficiency
    - Long-term enemies may refuse to cooperate
    - Can lead to villager leaving (future)

- [ ] **UX-100**: Relationship-aware AI decisions
  - LLM context:
    - Relationship list with affinities
    - Recent interactions (positive/negative)
    - Ongoing conflicts
  - Decision logic:
    - High affinity → prioritize joint actions
    - Low affinity → avoid or confront
    - Mediator role: High CHA villagers resolve conflicts
    - Strategic relationships: Build alliances for goals
  - Fallback: Simple rules (work with friends, avoid enemies)

- [ ] **UX-101**: Display relationships in UI
  - Relationship graph (already in Phase 9)
  - Relationship details: History of interactions
  - Conflict indicators: Show active disputes
  - Suggestion system: "Bram and Sana should work together (high affinity)"

- [ ] **UX-102**: Test relationship dynamics
  - Run 500+ tick simulation
  - Observe: Do friendships form naturally?
  - Verify: Collaboration happens between friends
  - Check: Conflicts arise and resolve (or persist)
  - Balance: Affinity gain/loss rates, decay rate
  - Emergent stories: Unexpected alliances or rivalries

**Deliverable**: Dynamic relationship system with meaningful social interactions and collaboration

---

## 📋 Phase 11: Combat & Dungeons (v1.2)

**Goal**: Add combat system with dungeon exploration and monster encounters

### Tasks

- [ ] **UX-103**: Design combat system
  - Turn-based combat (simplified for AI)
  - Combat stats:
    - **Attack (ATK)**: Damage dealt = STR + weapon_damage
    - **Defense (DEF)**: Damage reduced = END + armor_defense
    - **Dodge (DODGE)**: AGI-based chance to avoid attack
    - **HP**: Health, 0 HP = defeated
  - Combat actions: Attack, Defend (2× DEF this turn), Use Item, Flee
  - Combat order: AGI determines turn order (highest first)

- [ ] **UX-104**: Implement combat mechanics
  - **Attack Resolution**:
    - Roll: random(1, 10)
    - Dodge check: If roll < target_AGI/5 → miss
    - Damage: ATK - DEF + roll (min 1)
    - Apply damage: target.HP -= damage
  - **Defend Action**:
    - Double DEF for this turn
    - No attack
  - **Item Use**:
    - Heal potion: +50 HP
    - Energy boost: +30 energy
    - Buff potion: +ATK for 3 turns
  - **Flee**:
    - Success chance: AGI vs enemy_AGI
    - Success: Combat ends, party escapes (no loot)
    - Failure: Enemy gets free attack

- [ ] **UX-105**: Implement party system
  - Party size: 2-4 villagers
  - Party formation:
    - Manual: Villagers agree to party
    - Automatic: LLM decides who joins
  - Party composition matters:
    - Tank (high END), Damage (high STR), Support (healer)
    - Balanced party = better survival
  - Party leader: Highest CHA makes strategic decisions
  - Store party state: party_id, members, current_dungeon

- [ ] **UX-106**: Design dungeon system
  - **Dungeon Structure**:
    - Multiple floors (3-5 floors per dungeon)
    - Each floor: Multiple rooms (4-6 rooms)
    - Room types: Empty, Monster, Treasure, Boss (final floor)
  - **Difficulty Tiers**:
    - Easy: Weak monsters, low loot
    - Medium: Balanced
    - Hard: Strong monsters, rare loot
    - Epic: Boss dungeons, legendary loot
  - **Dungeon Entrance**: Structure on map
    - Must be built (or discovered)
    - Party enters together

- [ ] **UX-107**: Implement monsters
  - **Monster Types**:
    - **Goblin**: ATK 10, DEF 3, HP 30, AGI 5 (common)
    - **Skeleton**: ATK 15, DEF 5, HP 40, AGI 3 (undead)
    - **Orc**: ATK 20, DEF 8, HP 60, AGI 4 (tough)
    - **Giant Spider**: ATK 18, DEF 4, HP 50, AGI 8 (fast, poison)
    - **Troll**: ATK 25, DEF 12, HP 100, AGI 2 (tank)
    - **Dragon** (boss): ATK 40, DEF 20, HP 300, AGI 6 (legendary)
  - **Monster Abilities**:
    - Poison: -HP over time
    - Stun: Skip turn
    - Heal: Restore HP mid-combat
  - **Loot Tables**:
    - Gold: 10-50 per monster
    - Items: Weapons, armor, potions, materials
    - Rare drops: Unique items (5-10% chance)

- [ ] **UX-108**: Implement dungeon exploration
  - Party enters dungeon: All members leave village simultaneously
  - Proceed room by room:
    1. Enter room → trigger event (monster/treasure/empty)
    2. If monster → combat
    3. If treasure → loot (distribute among party)
    4. Move to next room or return to village
  - Duration: Each room takes 5-10 ticks (real-time)
  - Danger: Party HP, resource depletion
  - Retreat option: Can exit dungeon early (keep loot so far)

- [ ] **UX-109**: Implement combat AI
  - **For Villagers** (LLM-driven or rules):
    - LLM prompt: Combat state, party HP, enemy HP
    - LLM chooses: Attack, Defend, Use Item, Flee
    - Fallback rules:
      - Tank: Defend if HP < 50%
      - Damage: Always attack
      - Healer: Use heal item if ally HP < 30%
      - Flee if all party HP < 30%
  - **For Monsters** (rule-based):
    - Simple AI: Attack lowest HP target
    - Boss AI: Use abilities strategically

- [ ] **UX-110**: Implement loot distribution
  - After combat: Distribute loot among party
  - Distribution methods:
    - Equal: Split gold evenly, items randomly assigned
    - Need: Items go to who benefits most (weapon to fighter)
    - Leader decides: Party leader allocates
  - Loot affects affinity:
    - Fair distribution: +affinity
    - Unfair (one hoards): -affinity, conflict

- [ ] **UX-111**: Implement victory/defeat outcomes
  - **Victory**:
    - XP gain: +50 per monster defeated
    - Loot: Gold, items added to inventory
    - Return to village: Party members rejoin village
    - Relationship boost: +10 affinity (shared victory)
  - **Defeat** (party HP all 0):
    - Respawn: Villagers respawn at village after 20 ticks
    - Penalties:
      - Lose 50% of carried gold
      - Lose random equipped items
      - -10 HP until healed (injury state)
      - -morale (fear debuff for 30 ticks)

- [ ] **UX-112**: Dungeon-aware AI decisions
  - LLM context:
    - Available dungeons, difficulty
    - Party composition options
    - Villager combat readiness (HP, equipment, skills)
  - Decision logic:
    - Form party when: High combat skills, good equipment, village stable
    - Choose dungeon: Based on party strength
    - Retreat: If party HP critical, smart to retreat
  - Fallback: Don't enter dungeon until well-prepared

- [ ] **UX-113**: Combat/Dungeon UI
  - Combat screen: Show party, enemies, HP bars, turn order
  - Action selection: Buttons for actions (if player-controlled)
  - Combat log: "Bram attacks Goblin for 15 damage!"
  - Loot screen: Show items acquired, distribution
  - Dungeon map: Show current floor, rooms visited
  - Party status: HP, buffs, debuffs during exploration

- [ ] **UX-114**: Test combat balance
  - Run multiple dungeon runs (50+)
  - Check: Victory rate (should be ~70% for appropriate difficulty)
  - Balance: Monster stats, loot rewards, XP gains
  - Verify: Defeat penalties not too harsh
  - Edge cases: Party wipe, solo entry (disallow?), flee success rate

**Deliverable**: Complete combat and dungeon system with parties, monsters, and loot

---

## 📋 Phase 12: Time, Weather & Seasons (v1.3)

**Goal**: Add temporal dynamics with day/night cycles, weather, and seasons

### Tasks

- [ ] **UX-115**: Implement day/night cycle
  - Time scale: 1 in-game hour = 1 real-world minute (24 min/day)
  - Hours: 0-23 (0 = midnight, 12 = noon, 23 = late night)
  - Day phases:
    - **Dawn** (5-7): Villagers wake up
    - **Morning** (7-12): Peak productivity
    - **Afternoon** (12-17): Continued work
    - **Evening** (17-20): Social time, tavern
    - **Night** (20-5): Sleep, nocturnal activities
  - Store in world_state table (time_of_day, current_tick)

- [ ] **UX-116**: Implement sleep mechanics
  - Sleep requirement: Villagers need 6-8 hours sleep per day
  - Sleep actions:
    - Go to bed (at house or tent): Enter sleep state
    - Energy regeneration: +50 per hour (faster than daytime rest)
    - Sleep quality: Better in house (owned) > tent > ground
  - Sleep deprivation:
    - No sleep for 24+ hours: -50% work speed, -morale
    - No sleep for 48+ hours: Collapse (forced sleep wherever they are)
  - Night shift: Some villagers can work at night (guards, bakers)

- [ ] **UX-117**: Implement lighting system
  - **Daytime** (7-19): Full visibility, bright colors
  - **Night** (19-7): Reduced visibility, blue tint
  - **Light sources**:
    - Campfire: 3-tile radius light
    - Torch: Villager carries, 2-tile radius
    - Lantern: Portable, better light
    - Building lights: Houses lit from inside if occupied
  - Visual: Darken areas without light sources
  - Gameplay: Can't work efficiently in dark without light

- [ ] **UX-118**: Implement weather system
  - Weather states: Sunny, Cloudy, Rainy, Stormy, Snowy, Foggy
  - Weather duration: 20-50 ticks per weather type
  - Weather transitions: Gradual (sunny → cloudy → rainy)
  - Weather effects:
    - **Rainy**: -20% outdoor work speed, crops grow faster, +water availability
    - **Stormy**: -50% outdoor work, dangerous (lightning chance), animals hide
    - **Snowy**: -30% movement speed, -outdoor work, crops don't grow, +cold damage
    - **Foggy**: -visibility, easy to get lost, animals harder to spot
    - **Sunny**: Normal, +morale slightly
    - **Cloudy**: Normal, neutral
  - Store in world_state (current_weather)

- [ ] **UX-119**: Implement seasonal system
  - Four seasons: Spring, Summer, Autumn, Winter (each 200 ticks)
  - Season effects:
    - **Spring**: Crops grow 1.5× faster, animals breed, +foraging
    - **Summer**: Hot, +water consumption, best harvest time, +energy drain
    - **Autumn**: Normal, harvest season, animals migrate, prepare for winter
    - **Winter**: Cold, crops don't grow, -animal spawns, survival challenge, +heating need
  - Season visuals: Change tileset colors/sprites
    - Spring: Green, flowers
    - Summer: Bright green, sunny
    - Autumn: Orange, brown leaves
    - Winter: White snow, bare trees
  - Store in world_state (current_season, season_start_tick)

- [ ] **UX-120**: Implement temperature and weather clothing
  - Temperature: Hot (summer), Mild (spring/autumn), Cold (winter)
  - Clothing items: Basic clothes, warm cloak, fur coat
  - Cold effects (winter, without warm clothing):
    - -energy regeneration
    - -movement speed
    - Damage over time if exposed too long (frostbite)
  - Heat effects (summer, with heavy clothing):
    - +energy consumption
    - +water consumption
  - Villagers equip appropriate clothing based on season

- [ ] **UX-121**: Seasonal food challenges
  - **Winter Scarcity**:
    - No farming (crops dormant)
    - Fewer animals to hunt
    - Must rely on stored food or fishing
  - **Starvation Risk**:
    - If village unprepared (low food stocks)
    - Villagers prioritize survival
    - May need to trade, hunt aggressively, or use market portal
  - **Spring Abundance**:
    - Rapid crop growth, replenish stocks
    - Animal return, easy hunting
    - Recovery phase

- [ ] **UX-122**: Time-aware AI decisions
  - LLM context:
    - Current time of day, weather, season
    - Villager's sleep status, temperature exposure
  - Decision logic:
    - Night → go to bed (unless night shift)
    - Rainy → work indoors (crafting), avoid outdoor work
    - Winter → prioritize food gathering, wear warm clothes
    - Summer → take breaks, drink water
    - Stormy → seek shelter, don't venture out
  - Fallback: Basic time rules (sleep at night, work during day)

- [ ] **UX-123**: Visual weather and time effects
  - **Day/Night Lighting**:
    - Daytime: Bright, warm colors
    - Dusk/Dawn: Orange, pink tint
    - Night: Dark blue, stars, moon
    - Smooth transitions (gradual color shift)
  - **Weather Particles**:
    - Rain: Falling rain particles, puddles
    - Snow: Falling snowflakes, ground accumulation
    - Storm: Lightning flashes, heavy rain, wind effect (trees sway)
    - Fog: Overlay fog layer, reduces visibility
  - **Seasonal Tileset Changes**:
    - Swap grass/tree colors per season
    - Snow overlay in winter
    - Flowers in spring

- [ ] **UX-124**: Time/Season UI
  - Clock display: Show current time (e.g., "10:34 AM, Day 15")
  - Season indicator: Icon and name (e.g., "☀️ Summer")
  - Weather indicator: Icon (☀️🌧️❄️☁️) and forecast
  - Calendar: Show days passed, season progress
  - Alerts: "Winter approaches in 20 ticks" warnings

- [ ] **UX-125**: Test temporal systems
  - Run full year simulation (800 ticks)
  - Observe: Day/night transitions, villagers sleep/wake
  - Verify: Weather effects, seasonal changes
  - Check: Winter survival challenge, spring recovery
  - Balance: Day length, weather frequency, seasonal difficulty

**Deliverable**: Dynamic world with day/night cycles, weather, seasons, and survival challenges

---

## 📋 Phase 13: Polish, Balance & Emergent Gameplay (v1.4)

**Goal**: Final polish, balance tuning, bug fixes, and ensure emergent gameplay shines

### Tasks

- [ ] **UX-126**: Comprehensive balance pass
  - **Resource rates**:
    - Gathering yields: Balanced for survival without grind
    - Crafting costs: Reasonable for progression
    - Energy/hunger rates: Challenging but not frustrating
  - **Combat difficulty**:
    - Monster stats: Appropriate for level/equipment
    - Loot rewards: Worth the risk
    - Defeat penalties: Discouraging but not game-ending
  - **Skill progression**:
    - XP rates: Visible progress, not too fast
    - Level curve: Linear or exponential (balanced)
    - Skill effects: Meaningful but not overpowered
  - **Relationship dynamics**:
    - Affinity gain/loss: Balanced, friendships form naturally
    - Conflict frequency: Occasional, not constant
  - **Building costs**:
    - Early structures: Achievable quickly (tent, campfire)
    - Advanced structures: Long-term goals (library, town hall)
  - **Time progression**:
    - Day/night cycle: Long enough to accomplish tasks
    - Seasons: Time to prepare for winter

- [ ] **UX-127**: LLM prompt optimization
  - **Context refinement**:
    - Include only relevant information
    - Summarize history (not entire log)
    - Prioritize recent events over old
  - **Token reduction**:
    - Shorter prompts = faster responses
    - Use abbreviations, compact formats
    - Remove redundant information
  - **Decision quality**:
    - Test: Do villagers make sensible choices?
    - Adjust: Prompt wording for better behavior
    - Examples: Include few-shot examples for complex decisions
  - **Model selection**:
    - Test different models (llama3.1, mistral, qwen)
    - Find best balance: Speed vs quality

- [ ] **UX-128**: Fallback logic enhancement
  - **When fallback triggers**:
    - LLM unavailable (Ollama down)
    - LLM timeout (>6s response)
    - LLM returns invalid JSON
  - **Fallback quality**:
    - Simple but sensible rules
    - Prioritize survival (hunger, energy, HP)
    - Secondary: Work toward village goals
  - **Seamless transition**:
    - Simulation never stalls
    - Log fallback usage for debugging
    - Notify user if extended fallback mode

- [ ] **UX-129**: Performance optimization
  - **Rendering**:
    - Sprite batching: Group similar sprites
    - Culling: Don't render off-screen entities
    - Particle limits: Max particles to prevent lag
  - **Simulation**:
    - Optimize tick loop: Profile hot paths
    - Database queries: Use indexes, batch updates
    - Memory management: Prevent leaks, clean up old data
  - **Target performance**:
    - 60 FPS with 9+ villagers, 30+ entities
    - <100ms per tick (3s tick interval = plenty of headroom)
    - <5s initial load time

- [ ] **UX-130**: Advanced AI behaviors
  - **Strategic thinking**:
    - Long-term planning: Save gold for upgrade
    - Resource optimization: Craft only when needed
    - Risk assessment: Don't enter dungeon when weak
  - **Social dynamics**:
    - Mediate conflicts: High CHA villagers intervene
    - Form alliances: Build relationships for goals
    - Emotional responses: React to events (celebrate, mourn)
  - **Emergency response**:
    - Village under attack: Organize defense
    - Food shortage: All prioritize gathering
    - Villager dying: Healer drops everything to help

- [ ] **UX-131**: Random events system
  - **Positive Events**:
    - **Traveling Entertainer**: Morale boost, +happiness for 20 ticks
    - **Abundant Harvest**: 2× crop yield this harvest
    - **Rare Material Find**: Discover rare ore/gem while mining
    - **Mysterious Benefactor**: Random gift of gold/items
  - **Negative Events**:
    - **Disease Outbreak**: Villagers lose HP over time until healed
    - **Theft**: NPC thief steals from village storage
    - **Fire**: Structure catches fire, must extinguish or rebuild
    - **Earthquake**: Damages multiple structures
  - **Neutral Events**:
    - **Prophecy**: Hints about future event
    - **Rumor**: Information about rare dungeon or NPC
  - Event frequency: 1 event per 30-50 ticks (not overwhelming)
  - Event log: All events recorded in events_log table

- [ ] **UX-132**: Achievement system
  - **Achievements**:
    - "First Shelter": Build first structure
    - "Master Crafter": Craft 100 items
    - "Dungeon Delver": Complete first dungeon
    - "Peaceful Village": All villagers friends (affinity > 70)
    - "Survivalist": Survive winter with no deaths
    - "Metropolis": Build 20+ structures
    - "Legendary Smith": Craft legendary weapon
  - Store in world_state (achievements JSON array)
  - Display in UI: Achievement panel with progress

- [ ] **UX-133**: Sound effects (optional)
  - **Environment**: Birds chirping, wind, rain, night crickets
  - **Actions**: Chopping wood, hammering, crafting sounds
  - **Events**: Bell for NPC arrival, alarm for attack, cheer for level up
  - **Music**: Ambient background music (day/night themes)
  - **Settings**: Volume controls, mute option

- [ ] **UX-134**: Accessibility improvements
  - **Visual**: High contrast mode, colorblind-friendly palettes
  - **Text**: Font size options, dyslexia-friendly font
  - **Controls**: Keyboard shortcuts, screen reader support (basic)
  - **Notifications**: Visual + text (not just color/sound)

- [ ] **UX-135**: Documentation updates
  - **README**:
    - Complete feature list
    - Installation, setup, quick start
    - Controls, UI guide
    - FAQ, troubleshooting
  - **PROJECT-CONTEXT**:
    - Final architecture documentation
    - All systems explained
    - Design decisions recorded
  - **Developer Docs**:
    - Code structure, module overview
    - Adding new items, recipes, structures
    - Extending AI prompts
    - Database schema reference

- [ ] **UX-136**: Tutorial and onboarding
  - **First-time experience**:
    - Welcome message explaining simulation
    - Tooltips on first interaction
    - Guided tour: "This is the village, these are your villagers..."
  - **In-game help**:
    - Help button: Opens context-sensitive help
    - Tooltip on hover: Explain UI elements
    - Glossary: Explain terms (affinity, XP, durability)

- [ ] **UX-137**: Extended playtesting
  - Run multiple full simulations (1000+ ticks each)
  - Observe emergent behaviors:
    - Do interesting stories emerge?
    - Do villagers collaborate meaningfully?
    - Is winter survival challenging but achievable?
    - Do relationships create drama and alliances?
  - Identify edge cases and bugs
  - Gather feedback: If possible, have others observe

- [ ] **UX-138**: Bug fixes and stability
  - Fix crashes, soft locks, save corruption
  - Handle edge cases gracefully (empty inventory, no structures)
  - Improve error messages (user-friendly)
  - Test save/load repeatedly (no state loss)
  - Test long sessions (memory leaks, performance degradation)

- [ ] **UX-139**: Final polish
  - **UI**: Smooth animations, consistent styling
  - **Feedback**: All actions have clear feedback (visual/audio)
  - **Pacing**: Simulation speed feels right (not too fast/slow)
  - **Aesthetics**: Cohesive art style, polished sprites
  - **Story**: Emergent narratives are visible and engaging

- [ ] **UX-140**: Release preparation
  - Version bump to 1.4
  - Final code cleanup: Remove debug logs, commented code
  - Update all documentation (README, PROJECT-CONTEXT, INDEX)
  - Create demo video or screenshots
  - Write release notes: Feature highlights, known limitations
  - Optional: Deploy to web (Netlify, Vercel) for easy access

**Deliverable**: Polished v1.4 release with emergent civilization-building gameplay from scratch

---

## 🎯 Stretch Goals (Post-v1.4)

Future enhancements beyond core vision:

- [ ] **Multiple villages**: Separate villages that trade/compete
- [ ] **Player intervention mode**: Players can give quests or gifts
- [ ] **Procedural dungeons**: Unique layouts each run
- [ ] **More villagers**: Scale to 20-30 agents
- [ ] **Families and breeding**: Villagers have children, lineages
- [ ] **Permadeath mode**: Dead villagers gone forever (hardcore)
- [ ] **Different biomes**: Forest, desert, mountain village types
- [ ] **Magic system**: Some villagers learn spells
- [ ] **Pet/companion system**: Tame and train animals
- [ ] **Diplomacy**: Inter-village alliances, wars
- [ ] **Epic boss raids**: Legendary creatures requiring full village
- [ ] **Technology tree**: Unlock advanced techs (bronze age → iron age → industrial)
- [ ] **Natural disasters**: Earthquakes, floods, droughts
- [ ] **Religion/beliefs**: Villagers worship, build temples
- [ ] **Elections**: Vote for village leader, policies
- [ ] **Crime and justice**: Theft, trials, punishments

---

## 📊 Priority Matrix

| Priority | Focus | Phases |
|----------|-------|--------|
| **Critical** | Database, resources, building, crafting, environment | 1, 3, 5, 6, 7 |
| **High** | Attributes, skills, observation UI, relationships, time | 2, 4, 9, 10, 12 |
| **Medium** | Visual upgrade, combat, polish | 8, 11, 13 |
| **Low** | Stretch goals | Post-v1.4 |

---

## 🚦 Current Status

**Phase**: Planning Complete  
**Next Action**: Begin Phase 1 (UX-001: Choose and setup database system)  
**Version**: 0.1.0 → 0.2.0 (Database & Core Data Models)

---

## 📝 Development Notes

- Each phase should be **complete and playable** before moving to next
- Maintain LLM fallback throughout for stability
- Visual upgrades (Phase 8) can be done **in parallel** with system work
- Test balance frequently to avoid compound issues
- **Document as you go** to preserve knowledge
- Keep git commits atomic with task IDs (e.g., "UX-042: Implement forge crafting")
- Database-first approach: All state must be serializable
- Progressive world building is CORE: Everything built from scratch

---

## 🎮 Vision Summary

**The Complete Journey**:

**Day 1** (Ticks 0-50):
- 9 villagers spawn on empty grassland
- Frantic resource gathering (wood, clay, stone)
- Build campfire for cooking, tents for shelter
- First night: Huddle near campfire, sleep in tents
- Hunt rabbits, gather berries for food

**Week 1** (Ticks 50-200):
- Small houses built, personal storage
- Workshop constructed, tools crafted
- Farm plot planted, crops growing
- Storage shed for village resources
- Kiln built, brick production starts
- Relationships forming (friendships, work partnerships)

**Month 1** (Ticks 200-500):
- Forge operational, iron tools crafted
- First combat-ready villagers with equipment
- Dungeon discovered, initial exploration
- Tavern built, social hub established
- Walls erected for defense against wolves
- Winter preparation: Food stockpiling

**Winter** (Ticks 400-600):
- Survival challenge: Limited food sources
- Indoor crafting intensifies
- Villagers huddle in houses at night
- Wolves attack more frequently
- Strong relationships crucial for collaboration
- First major test of village resilience

**Year 1 Complete** (Ticks 800+):
- Thriving village with 15+ structures
- Specialized villagers (master smith, farmer, etc.)
- Multiple successful dungeon runs, legendary items
- Complex relationship web (friends, rivals, alliances)
- Town Hall built, village goals coordinated
- Prepared for Year 2 expansion

**Emergent Gameplay**: Every village is unique. Some focus on combat and dungeon loot, others on peaceful farming and trade. Personalities clash and bond. Winters threaten collapse or forge unity. All from autonomous AI decisions and rule-based environment responding to a living world built from nothing.

---

**Last Updated**: 2026-09-02  
**Status**: Complete backlog ready for implementation  
**Total Tasks**: 140+ across 13 phases

