# Village Simulation RPG

An AI-driven autonomous village life simulation evolving into a complete RPG ecosystem where 9 villagers live, work, fight, and collaborate — all driven by LLM decision-making (via Ollama) with rule-based fallback.

**Current Version**: 0.1.0 (Minimal Demo)  
**Target Version**: 1.0.0 (Complete RPG)  
**Status**: Planning complete, ready for phased development

## 🎯 Vision

Transform a simple village simulation into a **complete civilization builder** where villagers:
- 🏗️ **Build from Scratch**: Start on empty wilderness, progressively build tent → house → village → city
- ⚙️ **Real-World Physics Crafting**: Clay + oven → bricks, multi-step dependencies (50+ recipes)
- 🦌 **Living Environment**: Animals (deer, wolves), trees, NPCs, events (rule-based, not LLM)
- 💾 **Database Everything**: Full persistence in SQLite/PostgreSQL (15+ tables)
- 👁️ **Advanced Observation**: Inspect every villager's inventory, skills, relationships, map progress
- ⚔️ **RPG Attributes & Skills**: STR, INT, CHA, leveling, profession specialization
- 🎒 **Resource Management**: Energy, hunger, HP, inventory with weight limits, gold economy
- 🏰 **Dungeon Exploration**: Form parties, combat monsters, earn legendary loot
- 💭 **AI-Driven Decisions**: Each villager autonomously decides via LLM (with fallback)
- 🤝 **Relationships**: Form friendships/rivalries, collaborate, resolve conflicts
- 🌅 **Dynamic World**: Day/night cycles, weather, seasons, survival challenges
- 🎨 **Proper 2D Graphics**: Sprites, tilesets, animations (Phase 8)

**Current State**: Villagers are colored circles with emoji, locations are colored tiles. It's a **minimal scaffold** ready for transformation into a complete civilization builder.

See **[PROJECT-CONTEXT.md](PROJECT-CONTEXT.md)** for full vision and architecture.  
See **[BACKLOGS.md](BACKLOGS.md)** for detailed 9-phase development roadmap.

## Quick start (fallback mode, no LLM, works immediately)

```bash
docker compose up --build
```

Then open **http://localhost:3000**. Villagers will start moving around
and taking rule-based actions immediately (see `server/decisionEngine.js`
→ `fallbackDecision`) while the `ollama` container boots up in the
background.

## Enabling real LLM-driven decisions

The `ollama` service starts automatically but has no model pulled yet.
Once you pull one, the sim will start using it automatically on the very
next decision — no restart needed, since `decisionEngine.js` tries the
LLM first and only falls back on failure.

```bash
docker exec -it village-sim-demo-ollama-1 ollama pull llama3.1
```

(Container name may differ slightly — check with `docker ps`. Swap
`llama3.1` for a smaller model like `qwen2.5:7b` or `mistral-nemo` if
you're on limited hardware; just set `OLLAMA_MODEL` in
`docker-compose.yml` to match.)

To force fallback-only mode (e.g. to test without any LLM calls), set
`USE_LLM=false` in `docker-compose.yml` under `app.environment` and
rebuild.

## Project structure

```
server/
  index.js           Express + Socket.IO server, the simulation tick loop
  agent.js            Agent class: movement, action timing, memory
  villagers.js         The 9 villager definitions (personality, role, etc.)
  world.js              Map locations and grid config
  decisionEngine.js      Calls Ollama, parses its JSON reply, falls back
                           to rule-based logic on any failure/timeout
public/
  index.html          Page layout
  game.js              Phaser 3 scene (map + sprites) + Socket.IO client
  style.css            Styling for the side panel (villager list + log)
```

## How a "tick" works

1. Every `TICK_MS` (default 3000ms), the server advances in-progress
   movement/actions for all agents.
2. Any agent that's now free gets a fresh decision: `decisionEngine.decide()`
   builds a prompt from that agent's personality + recent memory + nearby
   villagers, calls Ollama, and parses a `{action, target, thought}` JSON
   reply — or falls back to a weighted random choice if the LLM is
   unreachable, slow, or returns something unparseable.
3. The decision is applied: the agent starts moving toward a location (or
   toward another villager, for `talk`), and once it arrives, performs the
   action for a few ticks, logging `thought` into its memory and the
   village-wide log.
4. The full state is broadcast to all connected browsers over Socket.IO.

## 📚 Documentation

- **[PROJECT-CONTEXT.md](PROJECT-CONTEXT.md)** - Complete vision, architecture, and design philosophy
- **[BACKLOGS.md](BACKLOGS.md)** - Detailed 13-phase development roadmap (142 tasks, ~8-12 months)
- **[INDEX.md](INDEX.md)** - Documentation navigation and quick links

## 🗺️ Development Roadmap

The evolution from v0.1 → v1.4 is structured in **13 phases** with **142 tasks**:

| Phase | Version | Focus | Duration |
|-------|---------|-------|----------|
| **Phase 1** | v0.2 | **Database & Core Data Models** | 2-3 weeks |
| **Phase 2** | v0.3 | Attributes & Stats (STR, INT, HP, Energy) | 1-2 weeks |
| **Phase 3** | v0.4 | Resource Management & Crafting | 3-4 weeks |
| **Phase 4** | v0.5 | Skills & Leveling (XP, Skill Trees) | 2-3 weeks |
| **Phase 5** | v0.6 | **Progressive Map Building System** ⭐ | 4-5 weeks |
| **Phase 6** | v0.7 | **Real-World Physics Crafting** ⭐ | 3-4 weeks |
| **Phase 7** | v0.8 | **Environment Systems (Non-LLM)** ⭐ | 3-4 weeks |
| **Phase 8** | v0.9 | Visual Upgrade (2D Sprites, Tilesets) | 2-3 weeks |
| **Phase 9** | v1.0 | **Advanced Observation UI** ⭐ | 3-4 weeks |
| **Phase 10** | v1.1 | Relationships & Collaboration | 3-4 weeks |
| **Phase 11** | v1.2 | Combat & Dungeons | 3-4 weeks |
| **Phase 12** | v1.3 | Time, Weather & Seasons | 3-4 weeks |
| **Phase 13** | v1.4 | Polish, Balance & Emergent Gameplay | 2-4 weeks |

**Total**: ~8-12 months of step-by-step development

⭐ = New major systems (progressive world building, physics crafting, living environment, observation)

Each phase delivers a **playable, testable increment**. See [BACKLOGS.md](BACKLOGS.md) for all 142 tasks.
