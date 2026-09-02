# Village Simulation RPG - Project Context

**Version**: 0.1.0 → 1.4.0 (Target)  
**Genre**: AI-Driven Progressive Civilization Builder + RPG + Survival  
**Tech Stack**: Node.js, Express, Socket.IO, Phaser 3, Ollama (LLM), SQLite/PostgreSQL

---

## 🎯 Project Vision

Transform a minimal village simulation into a **complete civilization builder** where 9 autonomous AI-driven villagers:
- **Start from scratch** on empty wilderness and build everything
- Use **real-world physics crafting** (clay + oven → bricks, multi-step dependencies)
- Develop skills, level up, and specialize in professions
- Have RPG attributes (STR, INT, CHA) affecting their capabilities
- Manage survival resources (energy, hunger, HP, inventory)
- **Progressively build** their world (tent → house → village → city)
- Interact with a **living environment** (animals, trees, NPCs, events - rule-based, not LLM)
- Form relationships, collaborate, and resolve conflicts
- Face dangers (dungeons, predators, winter survival)
- All observable through **comprehensive inspection UI** (see everything)

**Core Philosophy**: From wilderness to civilization through emergent AI decisions, realistic crafting, and dynamic environment responses - all fully persistent in database.

---

## 📊 Current State (v0.1.0)

### What Exists

**Architecture**
- 3-tier system: Server (Node.js) + Client (Phaser 3) + AI (Ollama LLM)
- Real-time communication via Socket.IO
- Tick-based simulation (3000ms intervals)
- LLM-driven decisions with rule-based fallback

**Villagers (9 agents)**
- Basic roles: Farmer, Baker, Healer, Blacksmith, Merchant, Fisher, Innkeeper, Carpenter, Teacher
- Simple attributes: name, role, emoji, color, personality
- Basic state: position (x, y), status (idle/moving/working/talking/resting), mood
- Memory system: Last 40 memories per agent
- Movement: Pathfinding to locations/other villagers

**World**
- 8×9 grid (72px tiles)
- 19 locations: 9 work sites, 2 social areas, 8 homes
- Location types: work, social, home
- Static map with colored tiles

**Actions**
- Move: Navigate to locations
- Work: Perform role-specific work
- Talk: Interact with nearby villagers
- Rest: Return home and recover

**Rendering**
- Villagers: Colored circles with emoji + name labels
- Locations: Colored rectangles with text labels
- Side panel: Villager list, status, thoughts, activity log

### What's Missing (for RPG Evolution)

**Game Systems**
- ❌ No attributes (strength, intelligence, charisma, etc.)
- ❌ No skills/levels/experience
- ❌ No resource management (food, materials, gold, energy)
- ❌ No inventory system
- ❌ No combat mechanics
- ❌ No dungeon/adventure system
- ❌ No relationship/affinity system
- ❌ No collaborative goals/quests
- ❌ No day/night cycle with meaningful effects
- ❌ No weather or seasons
- ❌ No building/crafting progression

**Visual & UX**
- ❌ Placeholder graphics (circles + emoji)
- ❌ No proper 2D sprites or animations
- ❌ No tilesets or terrain variety
- ❌ Limited UI (no inventory, stats, quests display)

**AI & Complexity**
- ❌ Decisions don't consider resources or stats
- ❌ No strategic thinking (survival, optimization)
- ❌ No party formation or teamwork mechanics
- ❌ No emergent storytelling beyond simple memories

---

## 🏗️ Target Architecture (v1.0.0)

### Core Systems

#### 1. **Character System**
```javascript
{
  // Identity
  id: "elin",
  name: "Elin",
  role: "farmer",
  level: 5,
  experience: 1200,
  
  // RPG Attributes
  attributes: {
    strength: 12,      // Physical power, carry capacity
    endurance: 14,     // HP, stamina recovery
    agility: 8,        // Speed, dodge chance
    intelligence: 10,  // Crafting speed, learning rate
    wisdom: 11,        // Decision quality, magic power
    charisma: 9        // Trade prices, relationship gains
  },
  
  // Derived Stats
  stats: {
    hp: 70,           // Current / max HP
    maxHp: 100,
    energy: 50,       // Current / max energy
    maxEnergy: 100,
    hunger: 30        // 0-100, affects performance
  },
  
  // Skills (profession-specific)
  skills: {
    farming: 5,       // Affects crop yield
    combat: 2,        // Affects dungeon survival
    cooking: 1        // Affects food quality
  },
  
  // Inventory & Resources
  inventory: [
    { item: "wheat", quantity: 15 },
    { item: "iron_sword", durability: 80 }
  ],
  gold: 120,
  
  // State
  status: "working",
  currentLocation: "Farm",
  mood: "content"
}
```

#### 2. **Resource System**
- **Personal Resources**: Energy, hunger, HP
- **Village Resources**: Food storage, materials, gold treasury
- **Production**: Locations generate resources when worked
- **Consumption**: Activities consume energy/food
- **Economy**: Trade between villagers, buy/sell at market

#### 3. **Dungeon & Combat System**
- **Dungeon Entrance**: New location type
- **Party System**: Villagers form 2-4 person parties
- **Turn-based Combat**: Simple but strategic
- **Loot System**: Equipment, materials, gold
- **Risk/Reward**: Death = respawn with penalty, success = XP + loot

#### 4. **Location Enhancement**
```javascript
{
  name: "Farm",
  type: "work",
  purpose: "Produces food resources",
  
  // Production
  produces: ["wheat", "vegetables"],
  productionRate: 5, // per work cycle
  
  // Requirements
  requiresSkill: "farming",
  skillBonusMultiplier: 1.2,
  
  // State
  resourceLevel: 80, // 0-100, depletes over time
  upgradeLevel: 1,   // Affects production
  
  // Visuals
  sprite: "farm_tileset",
  variants: ["spring", "summer", "autumn", "winter"]
}
```

#### 5. **Relationship System**
```javascript
{
  villager1: "elin",
  villager2: "bram",
  affinity: 65,        // 0-100
  interactionCount: 23,
  lastInteraction: "shared meal at tavern",
  relationshipType: "friend" // stranger/acquaintance/friend/close_friend/rival
}
```

---

## 🎨 Visual Upgrade Path

### Phase 1: Enhanced Sprites
- Replace circles with 32×32 or 48×48 sprite sheets
- 4-direction walking animations
- Action-specific animations (working, fighting, resting)
- Emotion indicators (!, ?, hearts, zzz)

### Phase 2: Proper Tileset
- Terrain tiles: grass, dirt, stone, water
- Building tiles: houses, shops, dungeons
- Decorative elements: trees, fences, signs
- Layered rendering: ground → buildings → characters

### Phase 3: UI Overhaul
- Character info panels (stats, inventory, skills)
- Resource bars (HP, energy, hunger)
- Quest/goal tracker
- Village resources dashboard
- Combat interface (when in dungeon)

---

## 🔄 Simulation Loop Evolution

### Current Loop (Simple)
```
1. Tick (3s intervals)
2. Update agent movement/actions
3. Free agents get LLM decision
4. Apply decision → move/work/talk/rest
5. Broadcast state to clients
```

### Target Loop (Complex)
```
1. Tick (variable based on time scale)
2. Update time of day / weather / season
3. Decay resources (hunger, energy, village food)
4. Update agent states (HP regen, hunger increase)
5. Process location production
6. For each free agent:
   a. Gather context (stats, inventory, nearby agents, village state)
   b. LLM decision (considers resources, danger, relationships)
   c. Validate decision (can afford? has energy? skill level OK?)
   d. Apply decision → complex state changes
   e. Update XP, skills, relationships
7. Process dungeon parties (if any)
8. Check village-level goals/threats
9. Broadcast rich state to clients
```

---

## 🛠️ Technical Considerations

### Performance
- Current: 9 agents, simple state → LLM calls manageable
- Target: 9 agents, complex state → optimize LLM prompts
- Strategy: Cache decisions, batch reasoning, use smaller models for simple decisions

### Data Persistence
- Current: In-memory only, resets on restart
- Target: Save/load system
- Solution: JSON serialization, optional SQLite/PostgreSQL

### Scalability
- Current: Single server, localhost only
- Target: Multi-client support (observers)
- Future: Multiplayer (players control villagers?)

### LLM Integration
- Current: Simple prompt, JSON response
- Target: Richer context, strategic reasoning
- Challenge: Token limits, response parsing reliability
- Solution: Structured prompts, validation layers, fallback logic

---

## 📚 Code Structure

### Current
```
server/
  index.js           # Main server + tick loop
  agent.js           # Agent class
  villagers.js       # Static definitions
  world.js           # Map data
  decisionEngine.js  # LLM integration
public/
  game.js            # Phaser scene
  index.html         # UI
  style.css          # Styling
```

### Target (Enhanced)
```
server/
  index.js           # Main server
  
  core/
    simulation.js    # Tick loop orchestration
    time.js          # Day/night, seasons
    
  entities/
    Agent.js         # Enhanced agent class
    Party.js         # Dungeon party management
    
  systems/
    AttributeSystem.js
    SkillSystem.js
    InventorySystem.js
    ResourceSystem.js
    CombatSystem.js
    RelationshipSystem.js
    
  world/
    World.js         # Map + locations
    Location.js      # Enhanced location class
    Dungeon.js       # Procedural dungeons
    
  ai/
    DecisionEngine.js     # LLM orchestration
    PromptBuilder.js      # Context-aware prompts
    ActionValidator.js    # Validate decisions
    
  data/
    villagers.json   # Villager definitions
    items.json       # Item database
    skills.json      # Skill definitions
    
  utils/
    persistence.js   # Save/load
    logger.js        # Activity logging

public/
  game/
    scenes/
      VillageScene.js      # Main map view
      DungeonScene.js      # Dungeon view
      UIScene.js           # Overlay UI
    sprites/
      characters/          # Character sprites
      tiles/               # Tileset assets
      items/               # Item icons
    ui/
      CharacterPanel.js
      InventoryPanel.js
      VillageStatus.js
      QuestLog.js
  index.html
  style.css
```

---

## 🎮 Gameplay Vision

### Typical Day in the Village

**Morning (6 AM - 12 PM)**
- Villagers wake up hungry (-10 energy, +20 hunger)
- Some go to work (farmers → farm, baker → bakery)
- Others eat breakfast at tavern (costs gold, restores hunger)
- Production happens: wheat grows, bread baked, fish caught

**Afternoon (12 PM - 6 PM)**
- Continued work or skill training
- Social interactions (building relationships)
- Some villagers form a party for dungeon run
- Party ventures into dungeon, faces monsters

**Evening (6 PM - 12 AM)**
- Work ends, villagers gather at tavern
- Share stories, trade items, eat dinner
- Healer tends to wounded from dungeon
- Carpenter works on village upgrade project

**Night (12 AM - 6 AM)**
- Most villagers sleep (energy +30/hour)
- Guard rotation (if threat level high)
- Nocturnal activities (fisher at lake, secrets)

### Emergent Scenarios

**Resource Crisis**
- Village food storage runs low
- LLM decides: Do villagers ration? Send more to farm? Organize dungeon run for supplies?
- Relationships strain under pressure

**Dungeon Expedition**
- Combat-capable villagers (high strength/agility) form party
- Healer provides support
- Others wait anxiously, maintaining village
- Party returns: Success (loot, XP) or failure (injuries, mourning)

**Village Project**
- Teacher Ivy proposes building a library
- Requires: 100 wood, 50 stone, 500 gold
- Villagers coordinate: carpenter gathers wood, miner enters dungeon for stone, merchant raises funds
- Completion unlocks new skills/buffs

**Relationship Drama**
- Bram (baker) and Sana (merchant) develop rivalry over trade dispute
- Affects collaboration, party formation
- Other villagers mediate or take sides
- LLM navigates social dynamics

---

## 🔐 Key Design Principles

1. **Emergent Gameplay**: Systems interact to create stories, not scripted events
2. **AI Agency**: Villagers make meaningful choices based on personality + context
3. **Progressive Complexity**: Start simple, layer systems gradually
4. **Visual Clarity**: Better graphics enhance immersion without obscuring information
5. **Strategic Depth**: Resource management + skill development + social dynamics = engaging
6. **Step-by-Step Development**: Each phase delivers playable, testable increments

---

## 📈 Success Metrics

**Short-term (v0.3)**
- Villagers have visible attributes and levels
- Basic resource system working (food, energy, gold)
- Improved 2D sprites replacing circles

**Mid-term (v0.6)**
- Combat system functional in dungeons
- Party formation and coordination
- Skill progression visible and impactful
- Relationship system affecting decisions

**Long-term (v1.0)**
- Complete RPG ecosystem running autonomously
- Emergent stories and strategies
- Visually polished with proper sprites/tilesets
- Save/load system preserving world state
- Observers can watch village evolve over hours/days

---

## 🚀 Development Philosophy

**Incremental Enhancement**
- Each phase adds ONE major system
- Test thoroughly before moving to next
- Maintain LLM fallback for stability

**Visible Progress**
- Every change should be observable in the simulation
- Prioritize changes that impact gameplay immediately
- Visual upgrades parallel system complexity

**AI-First Design**
- New systems must integrate with LLM decision-making
- Prompts evolve to include new context
- Fallback rules scale with complexity

---

**Status**: Planning Complete → Ready for Phased Implementation  
**Next Step**: Review BACKLOGS.md for detailed roadmap
